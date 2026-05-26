import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Memoise by normalised (q, exam, branch). Two users typing "graph" within
// the revalidate window share a single DB hit even across different edge
// POPs, where the CDN-level s-maxage couldn't dedupe.
const searchTopics = unstable_cache(
  (q: string, exam: string | null, branch: string | null) =>
    prisma.pattern.findMany({
      where: {
        topic_name: { contains: q, mode: "insensitive" },
        ...(exam ? { exam_type: exam } : {}),
        ...(branch ? { branch } : {}),
      },
      select: { id: true, topic_name: true, subject: true, exam_type: true, branch: true },
      take: 5,
    }),
  ["search-topics"],
  { revalidate: 300, tags: ["patterns"] },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const exam = searchParams.get("exam");
  const branch = searchParams.get("branch");

  if (q.length < 2) {
    return NextResponse.json({ subjects: [], topics: [] });
  }

  const topicResults = await searchTopics(q, exam, branch);

  return NextResponse.json(
    { subjects: [], topics: topicResults },
    { headers: { "Cache-Control": "public, s-maxage=60, max-age=0" } }
  );
}
