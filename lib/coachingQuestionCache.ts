import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/dbRetry";
import { resolveQuestions, type NormalizedQuestion, type QuestionRef } from "@/lib/resolveQuestions";
import { buildStudentQuestionRefs, type RuntimeTest } from "@/lib/coachingTestRuntime";
import { bestEffortInvalidate } from "@/lib/cacheInvalidation";

// The resolved question set is IDENTICAL for every student of a test, but the
// resolver does up to 3 multi-row DB reads. So we resolve the full set ONCE and
// cache it in Redis; each student's paper (pool + shuffle) is then derived from
// the cached base in memory — no per-student DB read for questions.
//
// Bump VERSION (or call invalidate) if the cached shape changes or the test is
// edited. Cache holds answers/solutions — server-side only, never sent raw.

// v2: config now also carries duration_secs + end_at (for the server-side
// submit deadline). Bump drops any v1-shaped entry so the new fields are present.
const VERSION = "v2";
const TTL_SECONDS = 60 * 60; // 1h; also busted explicitly on test edit
const key = (testId: string) => `coaching:test:${testId}:resolved:${VERSION}`;
const configKey = (testId: string) => `coaching:test:${testId}:config:${VERSION}`;
// Full static test row the student test page renders from. Same lifecycle as the
// resolved/config caches (changes only on edit), but carries every field the
// page reads — so the open path never reads the (identical, immutable-in-window)
// test row from Neon per student. The per-student attempt is read separately.
const fullKey = (testId: string) => `coaching:test:${testId}:full:${VERSION}`;
// Permanent marker (no TTL): set once a test's window has closed AND no attempt
// is left in_progress. finalizeOverdueAttempts (lib/coachingFinalize) checks it
// first so repeat views of a finished test's results/leaderboard/result pages
// skip its two DB reads. Cleared on test edit (end_at may be extended).
const finalizedKey = (testId: string) => `coaching:test:${testId}:finalized:v1`;

/** True once a test is fully finalized (window closed, nothing in progress). */
export async function isTestFinalized(testId: string): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    return (await redis.get(finalizedKey(testId))) != null;
  } catch {
    return false; // Redis hiccup — fall back to the normal (DB) finalize path.
  }
}

/** Mark a test fully finalized so finalize-on-view can short-circuit. */
export async function markTestFinalized(testId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.set(finalizedKey(testId), 1);
  } catch {
    /* best-effort */
  }
}

/**
 * Full resolved question set for a test (original order, WITH answers). Served
 * from Redis when warm; on miss, resolves from DB (with retry) and caches.
 * Falls back to a direct DB resolve if Redis isn't configured.
 */
export async function getResolvedTestQuestions(
  test: { id: string; questions: unknown },
  coachingId: string
): Promise<NormalizedQuestion[]> {
  const allRefs: QuestionRef[] = Array.isArray(test.questions)
    ? (test.questions as QuestionRef[])
    : [];
  if (allRefs.length === 0) return [];

  if (isRedisConfigured()) {
    try {
      const cached = await redis.get<NormalizedQuestion[]>(key(test.id));
      if (cached && Array.isArray(cached)) return cached;
    } catch {
      // Redis hiccup — fall through to DB.
    }
  }

  const resolved = await withDbRetry(() => resolveQuestions(allRefs, coachingId));

  if (isRedisConfigured()) {
    try {
      await redis.set(key(test.id), resolved, { ex: TTL_SECONDS });
    } catch {
      // Non-fatal: caching is best-effort.
    }
  }
  return resolved;
}

/**
 * The static runtime config a test needs for assembly/grading (refs + shuffle +
 * pool). It changes only when the test is edited — same lifecycle as the
 * resolved question set — so we cache it too. The submit endpoint reads this
 * instead of joining the test row into every attempt query, which removes a DB
 * read from the hot submit path during a batch's auto-submit spike.
 */
export async function getCachedTestConfig(
  testId: string,
  coachingId: string
): Promise<RuntimeTest | null> {
  if (isRedisConfigured()) {
    try {
      const cached = await redis.get<RuntimeTest>(configKey(testId));
      if (cached) return cached;
    } catch {
      // Redis hiccup — fall through to DB.
    }
  }

  const test = await withDbRetry(() =>
    prisma.coachingTest.findFirst({
      where: { id: testId, coaching_id: coachingId },
      select: {
        id: true,
        questions: true,
        shuffle: true,
        pool_size: true,
        duration_secs: true,
        end_at: true,
      },
    })
  );
  if (!test) return null;

  if (isRedisConfigured()) {
    try {
      await redis.set(configKey(testId), test, { ex: TTL_SECONDS });
    } catch {
      // Non-fatal: caching is best-effort.
    }
  }
  return test;
}

/**
 * The full static test row the student test page renders from (status, window,
 * title/description, runtime fields, and the questions JSON). Identical for every
 * student of a test and immutable while the window is open, so it's Redis-cached
 * — this removes the densest per-student uncached Neon read on the open path
 * (8,000 students opening = 1 cold read per test, not per student).
 *
 * Dates round-trip through Redis as ISO strings; we revive them to Date so the
 * page's `testWindowState` / `toLocaleString` / `getTime` calls behave the same
 * whether the value came from cache or the DB.
 */
export type CachedFullTest = {
  id: string;
  status: string;
  title: string;
  description: string | null;
  start_at: Date | null;
  end_at: Date | null;
  duration_secs: number;
  shuffle: boolean;
  pool_size: number | null;
  questions: unknown;
};

const reviveTestDates = (t: CachedFullTest): CachedFullTest => ({
  ...t,
  start_at: t.start_at ? new Date(t.start_at) : null,
  end_at: t.end_at ? new Date(t.end_at) : null,
});

export async function getCachedFullTest(
  testId: string,
  coachingId: string
): Promise<CachedFullTest | null> {
  if (isRedisConfigured()) {
    try {
      const cached = await redis.get<CachedFullTest>(fullKey(testId));
      if (cached) return reviveTestDates(cached);
    } catch {
      // Redis hiccup — fall through to DB.
    }
  }

  const test = await withDbRetry(() =>
    prisma.coachingTest.findFirst({
      where: { id: testId, coaching_id: coachingId },
      select: {
        id: true,
        status: true,
        title: true,
        description: true,
        start_at: true,
        end_at: true,
        duration_secs: true,
        shuffle: true,
        pool_size: true,
        questions: true,
      },
    })
  );
  if (!test) return null;

  if (isRedisConfigured()) {
    try {
      await redis.set(fullKey(testId), test, { ex: TTL_SECONDS });
    } catch {
      // Non-fatal: caching is best-effort.
    }
  }
  return test;
}

/**
 * Warm the config cache from an already-loaded test row (no DB read). The test
 * page calls this on render, so by the time a batch reaches auto-submit the
 * config is already hot and the submit path never touches the DB for it.
 */
export async function primeTestConfig(test: RuntimeTest): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.set(
      configKey(test.id),
      {
        id: test.id,
        questions: test.questions,
        shuffle: test.shuffle,
        pool_size: test.pool_size,
        duration_secs: test.duration_secs,
        end_at: test.end_at,
      },
      { ex: TTL_SECONDS }
    );
  } catch {
    /* best-effort */
  }
}

/** Drop a test's cached question set + config (call when the test changes). */
export async function invalidateTestQuestionCache(testId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  await bestEffortInvalidate(`test:${testId}`, () =>
    // Also drop the finalized marker: an edit may extend end_at (reopen the
    // window), after which new attempts must be finalizable again.
    Promise.all([
      redis.del(key(testId)),
      redis.del(configKey(testId)),
      redis.del(fullKey(testId)),
      redis.del(finalizedKey(testId)),
    ])
  );
}

/**
 * Drop the cached question set of every ACTIVE test that references this
 * question. A CoachingQuestion can be reused across many tests, and the resolved
 * cache holds the correct answers — so editing or deleting one question must bust
 * every live test using it, or students keep being graded on the stale cached
 * answer for up to the TTL. Bounded to active tests (the only ones being taken)
 * and best-effort. The question id is matched against coaching-sourced refs only.
 */
export async function invalidateTestsWithQuestion(
  coachingId: string,
  questionId: string
): Promise<void> {
  if (!isRedisConfigured()) return;
  const tests = await withDbRetry(() =>
    prisma.coachingTest.findMany({
      where: { coaching_id: coachingId, status: "active" },
      select: { id: true, questions: true },
    })
  );
  const affected = tests.filter(
    (t) =>
      Array.isArray(t.questions) &&
      (t.questions as Array<{ id?: string; source?: string }>).some(
        (r) => r?.id === questionId && (r?.source ?? "coaching") === "coaching"
      )
  );
  await Promise.all(affected.map((t) => invalidateTestQuestionCache(t.id)));
}

/**
 * Derive THIS student's paper (pool sample + order shuffle) from the cached base
 * set — entirely in memory, deterministic per (student, test). Returns the
 * student's NormalizedQuestion[] in their seeded order.
 */
export function studentQuestionsFromBase(
  base: NormalizedQuestion[],
  test: RuntimeTest,
  studentId: string
): NormalizedQuestion[] {
  const byKey = new Map(base.map((q) => [`${q.source}:${q.id}`, q]));
  const refs = buildStudentQuestionRefs(test, studentId);
  const out: NormalizedQuestion[] = [];
  for (const r of refs) {
    const q = byKey.get(`${r.source}:${r.id}`);
    if (q) out.push(q);
  }
  return out;
}
