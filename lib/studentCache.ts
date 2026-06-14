import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import { bestEffortInvalidate } from "@/lib/cacheInvalidation";

// getCurrentStudent() runs on EVERY authenticated student request (every page
// load, submit, tab-switch). During a live exam with hundreds of students that
// is thousands of identical Neon reads whose only job is to confirm the session
// token hasn't been rotated and the student is still active. We cache the small
// record in Redis with a short TTL.
//
// IMPORTANT — single-session enforcement: the cache holds session_token, so it
// MUST be invalidated wherever that token or the student's active status
// changes (login rotates the token; PIN reset / deactivate clears or flips it).
// Invalidation is best-effort like the rest of the cache layer: if a Redis del
// is dropped, the worst case is a kicked/old session staying valid for up to
// the TTL. We keep the TTL short to bound that window. Only active students are
// ever cached (the lookup filters active=true), so a cached entry implies the
// student was active at cache time.

export type CachedStudent = {
  id: string;
  coaching_id: string;
  batch_id: string | null;
  name: string;
  phone: string;
  // Enrollment approval — read on every gated request so a pending/rejected
  // student is blocked from tests with no extra DB hit. An owner's approve/reject
  // calls invalidateStudent(), so the change takes effect on the next request.
  status: string;
  session_token: string | null;
};

const TTL = 600; // 10 min — bounds the stale-session window if a del is dropped
// v2: added `status`. A pre-deploy v1 record lacks it; bumping the key forces a
// fresh DB read so a cached student is never mistaken for not-approved.
const key = (studentId: string) => `student:rec:${studentId}:v2`;

export async function getCachedStudent(studentId: string): Promise<CachedStudent | null> {
  if (!isRedisConfigured()) return null;
  try {
    return (await redis.get<CachedStudent>(key(studentId))) ?? null;
  } catch {
    return null;
  }
}

export async function setCachedStudent(student: CachedStudent): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.set(key(student.id), student, { ex: TTL });
  } catch {
    /* best-effort */
  }
}

/** Drop a student's cached record. Call on any token / active-status change. */
export async function invalidateStudent(studentId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  // Security-relevant: a dropped del here keeps a rotated/kicked session valid
  // until the TTL, so this one is worth seeing in the logs.
  await bestEffortInvalidate(`student:${studentId}`, () => redis.del(key(studentId)));
}

// ── Revocation blocklist ─────────────────────────────────────────────────────
// invalidateStudent above only DROPS the cache; if that del is lost (Redis
// blip) a deactivated student keeps authenticating off the stale entry until
// the TTL — e.g. a cheater kicked mid-exam keeps going for up to 10 min. The
// blocklist is the fail-safe: deactivation also WRITES a tombstone that
// getCurrentStudent consults on every cache hit, so a revoked student is denied
// even through a stale record. The TTL just has to outlive the record cache
// (10 min) — after that any pre-deactivation entry is gone and the DB's
// active=true filter is authoritative again, so the tombstone can expire.

const BLOCK_TTL = 900; // 15 min — must exceed the 10-min record TTL above
const blockKey = (studentId: string) => `student:blocked:${studentId}:v1`;

/** Revoke a student's cached sessions (call on deactivate / kick). */
export async function blockStudent(studentId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.set(blockKey(studentId), 1, { ex: BLOCK_TTL });
  } catch (err) {
    // A dropped block-write means a stale session may survive until the cache
    // TTL — worth surfacing, but never throw (must not break the deactivate).
    console.error(`[student-block] failed to block ${studentId}:`, err);
  }
}

/** Lift a revocation (call on reactivation) so the student can authenticate. */
export async function unblockStudent(studentId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.del(blockKey(studentId));
  } catch (err) {
    console.error(`[student-block] failed to unblock ${studentId}:`, err);
  }
}

/**
 * True if the student is currently revoked. Fails OPEN (false) on a Redis error
 * or when unconfigured: in that state the record cache is unavailable too, so
 * getCurrentStudent falls through to the DB, which enforces active=true.
 */
export async function isStudentBlocked(studentId: string): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    return (await redis.get(blockKey(studentId))) != null;
  } catch {
    return false;
  }
}
