import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";

// The tab-switch counter fires on EVERY visibilitychange during a test (tab
// hidden, minimise, app switch). Done against Neon that's a read + a write per
// event, per student — easily thousands of incidental DB ops across a live
// batch. Instead we INCR a Redis counter during the exam and flush the final
// value into TestAttempt.tab_switches once, folded into the submit write.
//
// The key is scoped to (studentId, attemptId) with the studentId taken from the
// verified session, so a student can only ever inflate their OWN counter — a
// bump aimed at another student's attempt lands on a key that student never
// reads back (submit reads under its own session's studentId).

const TTL = 60 * 60 * 6; // 6h — covers any test window
const key = (studentId: string, attemptId: string) =>
  `coaching:tabswitch:${studentId}:${attemptId}:v1`;

/** Bump the counter. Returns false if Redis is unavailable (caller falls back). */
export async function incrTabSwitch(studentId: string, attemptId: string): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    const k = key(studentId, attemptId);
    const n = await redis.incr(k);
    // Set the TTL once, on the first switch, so later bumps don't keep
    // sliding the expiry (and cost an extra command each time).
    if (n === 1) await redis.expire(k, TTL);
    return true;
  } catch {
    return false;
  }
}

/**
 * Final count for flushing into the DB at submit. Returns null when Redis is
 * unavailable (the route then kept the count in the DB itself, so submit must
 * NOT clobber it).
 */
export async function readTabSwitches(
  studentId: string,
  attemptId: string
): Promise<number | null> {
  if (!isRedisConfigured()) return null;
  try {
    const n = await redis.get<number | string>(key(studentId, attemptId));
    if (n == null) return 0;
    const v = typeof n === "number" ? n : Number(n);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return null;
  }
}

/** Drop the counter once it's been persisted. Best-effort. */
export async function clearTabSwitches(studentId: string, attemptId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.del(key(studentId, attemptId));
  } catch {
    /* best-effort */
  }
}
