import { redis, isRedisConfigured } from "@/lib/redis";
import { pusherServer, mockChannel, PUSHER_EVENTS } from "@/lib/pusher-server";
import { prisma } from "@/lib/prisma";

/* ── Key helpers ─────────────────────────────────────────────────────────── */
const k = {
  lb: (id: string) => `lb:${id}`,
  meta: (id: string) => `lb:meta:${id}`,
  dist: (id: string) => `lb:dist:${id}`,
  active: (id: string) => `active:${id}`,
  hydrated: (id: string) => `lb:hydrated:${id}`,
  hydrateLock: (id: string) => `lb:hydrate-lock:${id}`,
};

/* ── Types ───────────────────────────────────────────────────────────────── */
export interface LeaderboardEntry {
  rank: number;
  sessionId: string;
  name: string;
  score: number;
  maxScore: number;
  timeTakenSecs: number | null;
  submittedAt: number;
}

export interface MockStats {
  submitted: number;
  active: number;
  distribution: Record<string, number>;
}

interface MetaPayload {
  name: string;
  score: number;
  maxScore: number;
  time: number | null;
  at: number;
}

/* ── Scoring helpers ─────────────────────────────────────────────────────── */
// Higher score wins; on tie, faster time wins. Encode into one ZSET score so
// ZREVRANGE returns ranked order in a single Redis call.
export function compositeScore(score: number, timeTakenSecs: number | null): number {
  const t = timeTakenSecs ?? 999999;
  return score * 1_000_000 - t;
}

// 11 buckets: 0, 10, 20, ..., 100 (percentages of maxScore).
export function scoreBucket(score: number, maxScore: number): string {
  if (!maxScore || maxScore <= 0) return "0";
  const pct = Math.floor((score / maxScore) * 10) * 10;
  return String(Math.min(100, Math.max(0, pct)));
}

export function anonymizeName(email: string | null | undefined, userId: string): string {
  if (email) return email.split("@")[0].substring(0, 2) + "***";
  return "User_" + userId.slice(-4);
}

/* ── Hydration (rare; only on first read after Redis flush) ──────────────── */
async function hydrateFromDb(mockId: string): Promise<void> {
  // Try to acquire a 60-second hydration lock. SET NX EX = atomic.
  const acquired = await redis.set(k.hydrateLock(mockId), "1", {
    nx: true,
    ex: 60,
  });
  if (!acquired) {
    // Another process is hydrating. Wait briefly and let caller re-read.
    await new Promise((r) => setTimeout(r, 250));
    return;
  }

  try {
    // Double-check inside the lock — someone may have hydrated while we waited.
    const already = await redis.get(k.hydrated(mockId));
    if (already) return;

    const sessions = await prisma.testSession.findMany({
      where: { mock_test_id: mockId },
      select: {
        id: true,
        user_id: true,
        score: true,
        max_score: true,
        time_taken_secs: true,
        created_at: true,
      },
    });

    if (sessions.length === 0) {
      await redis.set(k.hydrated(mockId), "1");
      return;
    }

    const userIds = [...new Set(sessions.map((s) => s.user_id))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    const pipeline = redis.pipeline();
    const metaUpdates: Record<string, string> = {};
    const distCounts: Record<string, number> = {};

    for (const s of sessions) {
      const name = anonymizeName(emailById.get(s.user_id), s.user_id);
      const payload: MetaPayload = {
        name,
        score: s.score,
        maxScore: s.max_score,
        time: s.time_taken_secs,
        at: s.created_at.getTime(),
      };
      pipeline.zadd(k.lb(mockId), {
        score: compositeScore(s.score, s.time_taken_secs),
        member: s.id,
      });
      metaUpdates[s.id] = JSON.stringify(payload);
      const bucket = scoreBucket(s.score, s.max_score);
      distCounts[bucket] = (distCounts[bucket] ?? 0) + 1;
    }

    if (Object.keys(metaUpdates).length > 0) {
      pipeline.hset(k.meta(mockId), metaUpdates);
    }
    for (const [bucket, count] of Object.entries(distCounts)) {
      pipeline.hincrby(k.dist(mockId), bucket, count);
    }
    pipeline.set(k.hydrated(mockId), "1");
    await pipeline.exec();
  } finally {
    await redis.del(k.hydrateLock(mockId));
  }
}

async function ensureHydrated(mockId: string): Promise<void> {
  const hydrated = await redis.get(k.hydrated(mockId));
  if (!hydrated) await hydrateFromDb(mockId);
}

/* ── Writes (called from submit + session start/end) ─────────────────────── */
export async function recordSubmission(input: {
  mockId: string;
  sessionId: string;
  userId: string;
  email: string | null;
  score: number;
  maxScore: number;
  timeTakenSecs: number | null;
}): Promise<void> {
  if (!isRedisConfigured()) return;

  const { mockId, sessionId, userId, email, score, maxScore, timeTakenSecs } = input;
  const name = anonymizeName(email, userId);
  const now = Date.now();
  const payload: MetaPayload = { name, score, maxScore, time: timeTakenSecs, at: now };

  const pipeline = redis.pipeline();
  pipeline.zadd(k.lb(mockId), {
    score: compositeScore(score, timeTakenSecs),
    member: sessionId,
  });
  pipeline.hset(k.meta(mockId), { [sessionId]: JSON.stringify(payload) });
  pipeline.hincrby(k.dist(mockId), scoreBucket(score, maxScore), 1);
  pipeline.zrem(k.active(mockId), userId);
  await pipeline.exec();

  if (pusherServer) {
    await pusherServer
      .trigger(mockChannel(mockId), PUSHER_EVENTS.SUBMIT, {
        sessionId,
        name,
        score,
        maxScore,
        time: timeTakenSecs,
        at: now,
        bucket: scoreBucket(score, maxScore),
      })
      .catch((e) => console.warn("[pusher] submit trigger failed", e));
  }
}

export async function addActiveParticipant(
  mockId: string,
  userId: string,
  expiresAtMs: number
): Promise<void> {
  if (!isRedisConfigured()) return;
  await redis.zadd(k.active(mockId), { score: expiresAtMs, member: userId });
  if (pusherServer) {
    pusherServer
      .trigger(mockChannel(mockId), PUSHER_EVENTS.ACTIVE, { delta: 1 })
      .catch(() => {});
  }
}

export async function removeActiveParticipant(
  mockId: string,
  userId: string
): Promise<void> {
  if (!isRedisConfigured()) return;
  await redis.zrem(k.active(mockId), userId);
}

/* ── Reads (Redis-only on warm cache; DB hit only on first cold read) ────── */
export async function getLeaderboard(
  mockId: string,
  limit = 100
): Promise<LeaderboardEntry[]> {
  if (!isRedisConfigured()) return [];

  await ensureHydrated(mockId);

  // ZREVRANGE 0 limit-1 — top N by composite score, single Redis call.
  const sessionIds = (await redis.zrange(k.lb(mockId), 0, limit - 1, {
    rev: true,
  })) as string[];

  if (sessionIds.length === 0) return [];

  // HMGET — resolve all names + scores in one Redis call.
  const metas = (await redis.hmget(
    k.meta(mockId),
    ...sessionIds
  )) as Record<string, MetaPayload | string | null> | null;

  return sessionIds.map((sid, idx) => {
    const raw = metas?.[sid];
    const m: MetaPayload =
      typeof raw === "string" ? JSON.parse(raw) : (raw as MetaPayload) ?? {
        name: "—",
        score: 0,
        maxScore: 0,
        time: null,
        at: 0,
      };
    return {
      rank: idx + 1,
      sessionId: sid,
      name: m.name,
      score: m.score,
      maxScore: m.maxScore,
      timeTakenSecs: m.time,
      submittedAt: m.at,
    };
  });
}

export async function getMockStats(mockId: string): Promise<MockStats> {
  if (!isRedisConfigured()) {
    return { submitted: 0, active: 0, distribution: {} };
  }
  await ensureHydrated(mockId);

  // Prune expired active members (score < now), then count remaining.
  const now = Date.now();
  await redis.zremrangebyscore(k.active(mockId), 0, now);

  const [submitted, active, distribution] = await Promise.all([
    redis.zcard(k.lb(mockId)),
    redis.zcard(k.active(mockId)),
    redis.hgetall<Record<string, string>>(k.dist(mockId)),
  ]);

  const dist: Record<string, number> = {};
  if (distribution) {
    for (const [bucket, raw] of Object.entries(distribution)) {
      dist[bucket] = typeof raw === "number" ? raw : parseInt(String(raw), 10) || 0;
    }
  }

  return {
    submitted: submitted ?? 0,
    active: active ?? 0,
    distribution: dist,
  };
}
