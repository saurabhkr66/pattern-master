import { NextResponse } from "next/server";
import { getLeaderboard, getMockStats } from "@/lib/leaderboard";

// Public route — no auth check. Dashboard is shareable.
// All reads come from Redis; the DB is only touched on first-ever cold hydration.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing mock id" }, { status: 400 });
    }

    const [leaderboard, stats] = await Promise.all([
      getLeaderboard(id, 100),
      getMockStats(id),
    ]);

    return NextResponse.json(
      { leaderboard, stats },
      {
        headers: {
          // Short shared cache softens any traffic burst before Pusher delivers
          // the next update. Browser always revalidates.
          "Cache-Control": "public, s-maxage=5, max-age=0, stale-while-revalidate=30",
        },
      }
    );
  } catch (err) {
    console.error("[mock leaderboard] fetch failed", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
