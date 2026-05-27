import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getLeaderboard } from "@/lib/leaderboard";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const testId = new URL(req.url).searchParams.get("testId");
    if (!testId) return NextResponse.json({ error: "Missing testId" }, { status: 400 });

    // Redis-backed; only hits the DB on first-ever read for this mock
    // (hydration is lock-guarded inside getLeaderboard).
    const entries = await getLeaderboard(testId, 100);

    const leaderboard = entries.map((e) => ({
      rank: e.rank,
      user: e.name,
      score: e.score,
      maxScore: e.maxScore,
      timeTakenSecs: e.timeTakenSecs,
      date: new Date(e.submittedAt),
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
