import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import { withDbRetry } from "@/lib/dbRetry";
import { prisma } from "@/lib/prisma";
import { getTestLeaderboard } from "@/lib/coachingLeaderboard";

// Peer-relative stats for a SUBMITTED coaching attempt, shown on the student's
// result/analysis page above the breakdown: where they rank, their percentile,
// the class average vs their own score, and a chronological improvement trend.
//
// Cohort = everyone who SUBMITTED this test (the leaderboard set), so the rank
// here always matches /c/[slug]/leaderboard/[testId] (same source + cache).
//
// A submitted attempt is frozen, so the trend (this student's prior submitted
// attempts) is cached per attempt in Redis like getAttemptResultData. The
// rank/percentile/classAvg are read live from getTestLeaderboard (itself cached,
// busted on grade) so a late submitter still shifts everyone's percentile.

export type TrendPoint = { testTitle: string; pct: number; submittedAt: string };

export type PeerStats = {
  rank: number; // 1-based position in the cohort
  totalStudents: number; // cohort size (submitters of this test)
  percentile: number; // 100 * (#strictly below you / total), 1 decimal
  yourPct: number; // this attempt's score / max, rounded %
  classAvgPct: number; // mean of every submitter's score%, rounded
  trend: TrendPoint[]; // this student's submitted attempts, oldest → newest (last ~6)
};

const TREND_LIMIT = 6;
const TTL_SECONDS = 60 * 60 * 24; // 24h — trend is immutable for a submitted attempt
const trendKey = (attemptId: string) => `coaching:attempt:${attemptId}:trend:v1`;

function pctOf(score: number, max: number): number {
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

/** Fetch (or build) this student's chronological per-test % trend, cached per attempt. */
async function getStudentTrend(
  attemptId: string,
  studentId: string,
  coachingId: string
): Promise<TrendPoint[]> {
  if (isRedisConfigured()) {
    try {
      const cached = await redis.get<TrendPoint[]>(trendKey(attemptId));
      if (cached) return cached;
    } catch {
      /* fall through to DB */
    }
  }

  // Fetch only the most recent TREND_LIMIT (desc + take), then flip back to
  // oldest → newest for the chart — instead of reading the student's entire
  // attempt history just to keep the last few.
  const attempts = await withDbRetry(() =>
    prisma.testAttempt.findMany({
      where: { student_id: studentId, coaching_id: coachingId, status: "submitted" },
      select: { score: true, max_score: true, submitted_at: true, test: { select: { title: true } } },
      orderBy: { submitted_at: "desc" },
      take: TREND_LIMIT,
    })
  );

  const trend: TrendPoint[] = attempts
    .reverse()
    .map((a) => ({
      testTitle: a.test.title,
      pct: pctOf(a.score ?? 0, a.max_score ?? 0),
      submittedAt: a.submitted_at ? new Date(a.submitted_at).toISOString() : "",
    }));

  if (isRedisConfigured()) {
    try {
      await redis.set(trendKey(attemptId), trend, { ex: TTL_SECONDS });
    } catch {
      /* best-effort */
    }
  }
  return trend;
}

/**
 * Build the peer-relative stats for a submitted attempt. Returns null only if
 * the student has no entry in the cohort (e.g. their attempt isn't graded yet),
 * in which case the caller simply skips the banner.
 */
export async function getAttemptPeerStats(opts: {
  attemptId: string;
  testId: string;
  studentId: string;
  coachingId: string;
}): Promise<PeerStats | null> {
  const { attemptId, testId, studentId, coachingId } = opts;

  const [entries, trend] = await Promise.all([
    getTestLeaderboard(testId, coachingId),
    getStudentTrend(attemptId, studentId, coachingId),
  ]);

  const me = entries.find((e) => e.studentId === studentId);
  if (!me) return null;

  const total = entries.length;
  const myPct = pctOf(me.score, me.maxScore);

  // Percentile = share of the cohort that scored strictly below this attempt.
  // Compare on raw score (the ranking metric), not %, since maxScore is shared.
  const below = entries.filter((e) => e.score < me.score).length;
  const percentile = total > 0 ? Math.round((below / total) * 1000) / 10 : 0;

  const classAvgPct =
    total > 0
      ? Math.round(entries.reduce((s, e) => s + pctOf(e.score, e.maxScore), 0) / total)
      : 0;

  return {
    rank: me.rank,
    totalStudents: total,
    percentile,
    yourPct: myPct,
    classAvgPct,
    trend,
  };
}
