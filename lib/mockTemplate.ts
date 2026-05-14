import { redis, isRedisConfigured } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

/**
 * Mock test templates are immutable once created — same questions, same
 * sections, served identically to every taker. They are also the single
 * heaviest read on the DB during a concurrent test (1000 users × same
 * MockTestTemplate.findUnique on test start).
 *
 * This module caches them in Redis with no TTL. Cache is read-through; the
 * first miss after creation hits the DB, subsequent reads are O(1) Redis.
 *
 * If a template is ever mutated (rare; usually only via seed scripts),
 * call invalidateMockTemplate(id) to drop the cache.
 */

const k = {
  byId: (id: string) => `mock:template:${id}`,
  seededId: (exam: string, branch: string | null, mockNumber: number) =>
    `mock:seeded-id:${exam}:${branch ?? "_"}:${mockNumber}`,
};

// What we cache. Matches MockTestTemplate columns we ever read.
export interface CachedTemplate {
  id: string;
  exam_type: string;
  branch: string | null;
  mode: string;
  mock_number: number;
  title: string;
  subjects: string[];
  topics: string[];
  total_questions: number;
  max_score: number;
  duration_secs: number;
  sections: unknown;
  questions: unknown[];
  created_at: string; // ISO
}

function toCached(t: any): CachedTemplate {
  return {
    id: t.id,
    exam_type: t.exam_type,
    branch: t.branch,
    mode: t.mode,
    mock_number: t.mock_number,
    title: t.title,
    subjects: t.subjects ?? [],
    topics: t.topics ?? [],
    total_questions: t.total_questions,
    max_score: t.max_score,
    duration_secs: t.duration_secs,
    sections: t.sections,
    questions: (t.questions ?? []) as unknown[],
    created_at:
      t.created_at instanceof Date ? t.created_at.toISOString() : t.created_at,
  };
}

/** Read-through cache by ID. Hits DB only on cold miss. */
export async function getCachedTemplateById(
  id: string
): Promise<CachedTemplate | null> {
  if (isRedisConfigured()) {
    try {
      const cached = await redis.get<CachedTemplate | string>(k.byId(id));
      if (cached) {
        return typeof cached === "string"
          ? (JSON.parse(cached) as CachedTemplate)
          : cached;
      }
    } catch (e) {
      console.warn("[mockTemplate] redis get failed; falling back to DB", e);
    }
  }

  const t = await prisma.mockTestTemplate.findUnique({ where: { id } });
  if (!t) return null;
  const cached = toCached(t);

  if (isRedisConfigured()) {
    // Fire-and-forget — failure here just means next call also hits the DB.
    redis
      .set(k.byId(id), JSON.stringify(cached))
      .catch((e) => console.warn("[mockTemplate] redis set failed", e));
  }
  return cached;
}

/** Cache after a fresh DB write/create. Saves a round-trip on first read. */
export async function cacheTemplate(t: any): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.set(k.byId(t.id), JSON.stringify(toCached(t)));
  } catch (e) {
    console.warn("[mockTemplate] cacheTemplate failed", e);
  }
}

/**
 * Look up the canonical seeded mock for an exam/branch/mockNumber.
 * The criteria→id mapping is cached so 1000 users hitting "Mock #3 GATE CS"
 * only do one DB lookup ever.
 */
export async function getCachedSeededTemplateId(
  examType: string,
  branch: string | null,
  mockNumber: number
): Promise<string | null> {
  const key = k.seededId(examType, branch, mockNumber);
  if (isRedisConfigured()) {
    try {
      const cached = await redis.get<string>(key);
      if (cached) return cached;
    } catch (e) {
      console.warn("[mockTemplate] seededId cache miss", e);
    }
  }

  const t = await prisma.mockTestTemplate.findFirst({
    where: {
      exam_type: examType,
      branch: branch ?? null,
      mode: "seeded",
      mock_number: mockNumber,
    },
    select: { id: true },
  });
  if (!t) return null;

  if (isRedisConfigured()) {
    redis
      .set(key, t.id)
      .catch((e) => console.warn("[mockTemplate] seededId cache set failed", e));
  }
  return t.id;
}

export async function invalidateMockTemplate(id: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.del(k.byId(id));
  } catch (e) {
    console.warn("[mockTemplate] invalidate failed", e);
  }
}
