import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import { withDbRetry } from "@/lib/dbRetry";
import { prisma } from "@/lib/prisma";

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

/**
 * Drop the cached board (call whenever an attempt of the test is graded).
 *
 * Debounced: during a batch submit spike (100 students in 5s) only the FIRST
 * call within a 10s window actually deletes the cache. Subsequent calls during
 * the cooldown are no-ops — the leaderboard is rebuilt once by the first reader
 * AFTER the spike settles, capturing all submissions in one query instead of
 * rebuilding 100 times.
 */
const INVALIDATE_COOLDOWN = 10; // seconds
const cooldownKey = (testId: string) => `coaching:leaderboard:${testId}:invalidating`;

export async function invalidateTestLeaderboard(testId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    // SET NX EX = atomic "set if not exists with expiry". Returns truthy only
    // for the first caller within the cooldown window.
    const acquired = await redis.set(cooldownKey(testId), "1", { nx: true, ex: INVALIDATE_COOLDOWN });
    if (!acquired) return; // another submit already invalidated within the window
    await redis.del(key(testId));
  } catch {
    // Best-effort: TTL on the leaderboard cache bounds staleness.
  }
}
