import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

const getLeaderboard = (testId: string) =>
  unstable_cache(
    async () => {
      const sessions = await prisma.testSession.findMany({
        where: { mock_test_id: testId },
        orderBy: [{ score: "desc" }, { time_taken_secs: "asc" }],
        take: 100,
        select: {
          id: true,
          user_id: true,
          score: true,
          max_score: true,
          time_taken_secs: true,
          created_at: true,
        },
      });

      if (sessions.length === 0) return [];

      const userIds = [...new Set(sessions.map((s) => s.user_id))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u.email]));

      return sessions.map((s, idx) => {
        const email = userMap.get(s.user_id);
        const displayName = email
          ? email.split("@")[0].substring(0, 2) + "***"
          : "User_" + s.user_id.slice(-4);

        return {
          rank: idx + 1,
          user: displayName,
          score: s.score,
          maxScore: s.max_score,
          timeTakenSecs: s.time_taken_secs,
          date: s.created_at,
        };
      });
    },
    [`leaderboard-${testId}`],
    { revalidate: 60, tags: ["leaderboard"] }
  );

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const testId = new URL(req.url).searchParams.get("testId");
    if (!testId) return NextResponse.json({ error: "Missing testId" }, { status: 400 });

    const leaderboard = await getLeaderboard(testId)();
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
