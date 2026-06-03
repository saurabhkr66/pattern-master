import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";

// Student login is phone + a 4–6 digit PIN — a small enough secret that an
// unthrottled attacker can brute-force it. We cap failed attempts per
// (coaching, phone) in Redis: after MAX_ATTEMPTS wrong PINs the phone is locked
// for WINDOW seconds, then the counter auto-expires and resets.
//
// Scope choice — we key by phone, NOT by IP. A coaching class is typically all
// on one classroom/hostel Wi-Fi, so an IP-based cap would let one bad actor (or
// a shared NAT) lock out everyone. Phone scoping confines a targeted-lockout
// abuse to a single student, and the WINDOW auto-expiry bounds even that to a
// few minutes.
//
// Like the rest of the cache layer this is best-effort: if Redis is down we
// fail OPEN (allow the login) rather than lock everyone out of an exam. The
// scrypt verify in studentAuth is still the real gate; this only throttles the
// guess rate.

const MAX_ATTEMPTS = 5; // wrong PINs allowed before lockout
const WINDOW = 60 * 15; // 15 min — lockout duration and counter TTL
const key = (coachingId: string, phone: string) =>
  `student:pinrl:${coachingId}:${phone}:v1`;

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the lockout lifts (only meaningful when !allowed). */
  retryAfter: number;
};

/**
 * Read-only check — does NOT consume an attempt. Returns allowed=false once the
 * phone has hit MAX_ATTEMPTS within the window. Fails open if Redis is down.
 */
export async function checkLoginRateLimit(
  coachingId: string,
  phone: string
): Promise<RateLimitResult> {
  if (!isRedisConfigured()) return { allowed: true, retryAfter: 0 };
  try {
    const k = key(coachingId, phone);
    const n = await redis.get<number | string>(k);
    if (n != null && Number(n) >= MAX_ATTEMPTS) {
      const ttl = await redis.ttl(k);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : WINDOW };
    }
    return { allowed: true, retryAfter: 0 };
  } catch {
    return { allowed: true, retryAfter: 0 };
  }
}

/**
 * Record one failed PIN attempt. Sets the lockout window on the first failure
 * so the window is anchored to it (later bumps don't slide the expiry, matching
 * the tab-switch counter). Best-effort.
 */
export async function recordFailedLogin(
  coachingId: string,
  phone: string
): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const k = key(coachingId, phone);
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, WINDOW);
  } catch {
    /* best-effort */
  }
}

/** Clear the counter after a successful login. Best-effort. */
export async function clearLoginRateLimit(
  coachingId: string,
  phone: string
): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.del(key(coachingId, phone));
  } catch {
    /* best-effort */
  }
}
