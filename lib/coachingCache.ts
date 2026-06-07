import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import { withDbRetry } from "@/lib/dbRetry";
import { prisma } from "@/lib/prisma";
import { bestEffortInvalidate } from "@/lib/cacheInvalidation";

// Coaching-by-slug is read on EVERY /c/[slug]/* request (profile, join, login,
// dashboard, test, result) but changes rarely. Cache the small record in Redis
// to drop one DB read per student page load. Busted on coaching edit; 10-min TTL.

export type CachedCoaching = {
  id: string;
  name: string;
  city: string | null;
  exam_types: string[];
  active: boolean;
  price_per_test: number;
  join_code: string;
};

const TTL = 600;
const key = (slug: string) => `coaching:slug:${slug}:v1`;

export async function getCachedCoachingBySlug(slug: string): Promise<CachedCoaching | null> {
  if (isRedisConfigured()) {
    try {
      const c = await redis.get<CachedCoaching>(key(slug));
      if (c) return c;
    } catch {
      /* fall through to DB */
    }
  }

  const c = await withDbRetry(() =>
    prisma.coaching.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        city: true,
        exam_types: true,
        active: true,
        price_per_test: true,
        join_code: true,
      },
    })
  );

  // Only cache hits (never negative-cache a missing slug).
  if (c && isRedisConfigured()) {
    try {
      await redis.set(key(slug), c, { ex: TTL });
    } catch {
      /* best-effort */
    }
  }
  return c;
}

export async function invalidateCoachingSlug(slug: string): Promise<void> {
  if (!isRedisConfigured()) return;
  await bestEffortInvalidate(`coaching-slug:${slug}`, () => redis.del(key(slug)));
}

// ── Active-tests list (student dashboard) ───────────────────────────────────
// The "available tests" list is IDENTICAL for every student of a coaching and
// changes only when an admin creates/edits/activates a test. On exam day a
// whole batch reloads the dashboard repeatedly, so we cache the small shaped
// list per coaching. Busted on test create/edit; 5-min TTL as a backstop.
//
// start_at/end_at are stored as ISO strings (they round-trip through JSON); the
// dashboard reconstructs Dates before computing window state.

export type CachedActiveTest = {
  id: string;
  title: string;
  duration_secs: number;
  start_at: string | null;
  end_at: string | null;
  pool_size: number | null;
  question_count: number;
};

const ACTIVE_TESTS_TTL = 300;
const activeTestsKey = (coachingId: string) => `coaching:${coachingId}:activeTests:v1`;

export async function getCachedActiveTests(coachingId: string): Promise<CachedActiveTest[]> {
  if (isRedisConfigured()) {
    try {
      const c = await redis.get<CachedActiveTest[]>(activeTestsKey(coachingId));
      if (c) return c;
    } catch {
      /* fall through to DB */
    }
  }

  const tests = await withDbRetry(() =>
    prisma.coachingTest.findMany({
      where: { coaching_id: coachingId, status: "active" },
      select: {
        id: true,
        title: true,
        duration_secs: true,
        start_at: true,
        end_at: true,
        pool_size: true,
        questions: true,
      },
      orderBy: { created_at: "desc" },
    })
  );

  const shaped: CachedActiveTest[] = tests.map((t) => ({
    id: t.id,
    title: t.title,
    duration_secs: t.duration_secs,
    start_at: t.start_at ? t.start_at.toISOString() : null,
    end_at: t.end_at ? t.end_at.toISOString() : null,
    pool_size: t.pool_size,
    question_count: Array.isArray(t.questions) ? (t.questions as unknown[]).length : 0,
  }));

  if (isRedisConfigured()) {
    try {
      await redis.set(activeTestsKey(coachingId), shaped, { ex: ACTIVE_TESTS_TTL });
    } catch {
      /* best-effort */
    }
  }
  return shaped;
}

/** Drop the cached active-tests list (call on test create / edit / status change). */
export async function invalidateActiveTests(coachingId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  await bestEffortInvalidate(`active-tests:${coachingId}`, () =>
    redis.del(activeTestsKey(coachingId))
  );
}

// ── Coaching name by id (admin shell) ───────────────────────────────────────
// The admin layout renders the coaching's name in the sidebar/header on EVERY
// /coaching-admin/* navigation, but the name effectively never changes. Cache
// it by id to drop one DB read per admin page load. Long TTL; busted via
// invalidateCoachingName if the name ever becomes editable.

const NAME_TTL = 3600;
const nameKey = (coachingId: string) => `coaching:${coachingId}:name:v1`;

export async function getCachedCoachingName(coachingId: string): Promise<string | null> {
  if (isRedisConfigured()) {
    try {
      const c = await redis.get<string>(nameKey(coachingId));
      if (c) return c;
    } catch {
      /* fall through to DB */
    }
  }

  const c = await withDbRetry(() =>
    prisma.coaching.findUnique({
      where: { id: coachingId },
      select: { name: true },
    })
  );

  if (c?.name && isRedisConfigured()) {
    try {
      await redis.set(nameKey(coachingId), c.name, { ex: NAME_TTL });
    } catch {
      /* best-effort */
    }
  }
  return c?.name ?? null;
}

/** Drop the cached coaching name (call if the name becomes editable). */
export async function invalidateCoachingName(coachingId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  await bestEffortInvalidate(`coaching-name:${coachingId}`, () =>
    redis.del(nameKey(coachingId))
  );
}
