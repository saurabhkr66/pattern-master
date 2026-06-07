import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import { withDbRetry } from "@/lib/dbRetry";
import { prisma } from "@/lib/prisma";
import { bestEffortInvalidate } from "@/lib/cacheInvalidation";

// Per-test leaderboard for the coaching area. Scoped to a single test: every
// submitted attempt ranked by score (then by speed). A whole batch reloads this
// after a test, so we cache the small shaped list per test in Redis and bust it
// the moment any attempt of the test is graded (see lib/coachingFinalize). No
// sorted sets / Pusher — this is a cached snapshot, not a live board.

export type LeaderboardEntry = {
  rank: number; // 1-based, positional
  studentId: string;
  name: string;
  score: number;
  maxScore: number;
  timeTakenSecs: number | null;
  submittedAt: string; // ISO (round-trips through Redis JSON)
};

const TTL = 300;
const key = (testId: string) => `coaching:leaderboard:${testId}:v1`;

/**
 * Ranking metric (shared so the student board and the admin results page rank
 * IDENTICALLY): higher score wins; ties broken by faster time; a null time ranks
 * last among its score; submitted-earlier as the final stable tiebreak. Compares
 * scores directly rather than the consumer mock's `score*1e6 - time` composite,
 * which loses precision on large times.
 */
export function compareLeaderboard(
  a: { score: number; timeTakenSecs: number | null; submittedAt: number },
  b: { score: number; timeTakenSecs: number | null; submittedAt: number }
): number {
  if (b.score !== a.score) return b.score - a.score;
  const ta = a.timeTakenSecs ?? Infinity;
  const tb = b.timeTakenSecs ?? Infinity;
  if (ta !== tb) return ta - tb;
  return a.submittedAt - b.submittedAt;
}

export async function getTestLeaderboard(
  testId: string,
  coachingId: string
): Promise<LeaderboardEntry[]> {
  if (isRedisConfigured()) {
    try {
      const c = await redis.get<LeaderboardEntry[]>(key(testId));
      if (c) return c;
    } catch {
      /* fall through to DB */
    }
  }

  const attempts = await withDbRetry(() =>
    prisma.testAttempt.findMany({
      where: { test_id: testId, coaching_id: coachingId, status: "submitted" },
      select: {
        student_id: true,
        score: true,
        max_score: true,
        time_taken_secs: true,
        submitted_at: true,
        student: { select: { name: true } },
      },
    })
  );

  const ranked = attempts
    .map((a) => ({
      studentId: a.student_id,
      name: a.student.name,
      score: a.score ?? 0,
      maxScore: a.max_score ?? 0,
      timeTakenSecs: a.time_taken_secs,
      submittedAtMs: a.submitted_at ? new Date(a.submitted_at).getTime() : 0,
    }))
    .sort((x, y) =>
      compareLeaderboard(
        { score: x.score, timeTakenSecs: x.timeTakenSecs, submittedAt: x.submittedAtMs },
        { score: y.score, timeTakenSecs: y.timeTakenSecs, submittedAt: y.submittedAtMs }
      )
    );

  const shaped: LeaderboardEntry[] = ranked.map((r, i) => ({
    rank: i + 1,
    studentId: r.studentId,
    name: r.name,
    score: r.score,
    maxScore: r.maxScore,
    timeTakenSecs: r.timeTakenSecs,
    submittedAt: new Date(r.submittedAtMs).toISOString(),
  }));

  if (isRedisConfigured()) {
    try {
      await redis.set(key(testId), shaped, { ex: TTL });
    } catch {
      /* best-effort */
    }
  }
  return shaped;
}

/** Drop the cached board (call whenever an attempt of the test is graded). */
export async function invalidateTestLeaderboard(testId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  await bestEffortInvalidate(`coaching-leaderboard:${testId}`, () => redis.del(key(testId)));
}
