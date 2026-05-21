import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

// Counts are identical for every user — `unstable_cache` with no user-keyed
// inputs gives one global server-side cache entry. Hold for 24 h; admin
// add/delete paths must call `revalidateTag("mocks")` to refresh on demand.
const ONE_DAY_SECS = 86_400;

const getCounts = unstable_cache(
  async () => {
    const rows = await prisma.mockTestTemplate.groupBy({
      by: ["exam_type", "branch"],
      where: { mode: "seeded" },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      exam_type: r.exam_type,
      branch: r.branch,
      count: r._count._all,
    }));
  },
  ["mocks-counts"],
  { revalidate: ONE_DAY_SECS, tags: ["mocks"] }
);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const counts = await getCounts();
    return NextResponse.json(
      { counts },
      {
        headers: {
          // s-maxage drives the shared (CDN) cache; max-age=0 forces the
          // browser to revalidate so a hot-reload still hits the edge.
          "Cache-Control": `public, s-maxage=${ONE_DAY_SECS}, max-age=0, stale-while-revalidate=${ONE_DAY_SECS}`,
        },
      }
    );
  } catch (err) {
    console.error("Mocks counts error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
