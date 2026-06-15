import "server-only";
import crypto from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getCachedStudent,
  setCachedStudent,
  invalidateStudent,
  isStudentBlocked,
  type CachedStudent,
} from "@/lib/studentCache";

/**
 * Student sessions are NOT Clerk. Students authenticate with a coaching join
 * code (first time) or just their phone (returning), and we hand them a signed
 * cookie. The token is an HMAC-signed `body.mac` string — zero extra deps, and
 * we only ever verify it server-side (Node runtime route handlers / server
 * components), never in edge middleware, so Node's `crypto` is fine. Middleware
 * only checks the cookie's *presence*; this module checks its *validity*.
 */

const COOKIE = "student_session";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.STUDENT_SESSION_SECRET;
  if (!s) {
    throw new Error(
      "STUDENT_SESSION_SECRET is not set — required to sign student session cookies."
    );
  }
  return s;
}

type StudentSessionPayload = {
  sid: string; // Student.id
  cid: string; // Coaching.id — lets us scope queries without a DB hit
  tok?: string; // single-session token; must match Student.session_token
  exp: number; // epoch seconds
};

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64url");

function hmac(body: string): string {
  return crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
}

function signToken(payload: StudentSessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(body)}`;
}

function verifyToken(token: string): StudentSessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);

  const expected = hmac(body);
  // Constant-time compare; lengths must match for timingSafeEqual.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as StudentSessionPayload;
    if (!payload.sid || !payload.cid || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── PIN (login secret) ──────────────────────────────────────────────────────
// Students log in with phone + PIN so a known phone number alone is useless.
// PINs are scrypt-hashed (salt:hash); plaintext is never stored.
//
// scrypt is deliberately CPU-heavy. The async form runs the hashing on libuv's
// threadpool instead of blocking the event loop, so a burst of logins (a whole
// class signing in at once) on one warm instance doesn't serialize behind each
// other's hashing.
const scryptAsync = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number
) => Promise<Buffer>;

// Gate for SETTING a PIN (join / reset) only — never for login, which just runs
// verifyPin against the stored hash regardless of length. So existing 4–5 digit
// PINs keep working and silently upgrade to 6 the next time the student resets.
// 6 digits (1,000,000 combos) keeps brute-force impractical under the 5-fails/
// 15-min per-account lockout in lib/studentLoginRateLimit (4 digits = only 10k).
/** True if the value is a 6-digit PIN (the minimum for a newly set PIN). */
export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(pin, salt, 32)).toString("hex");
  return `${salt}:${derived}`;
}

export async function verifyPin(
  pin: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;
  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;
  const test = (await scryptAsync(pin, salt, 32)).toString("hex");
  const a = Buffer.from(test);
  const b = Buffer.from(derived);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Sets the signed session cookie for a student, enforcing a single active
 * session ("newest login wins"): we mint a fresh token, store it on the Student
 * row, and embed it in the cookie. Any older cookie now carries a stale token
 * and is rejected by getCurrentStudent on its next request.
 */
export async function createStudentSession(studentId: string, coachingId: string) {
  const tok = crypto.randomBytes(16).toString("hex");
  await prisma.student.update({
    where: { id: studentId },
    data: { session_token: tok },
  });
  // Drop any cached record carrying the OLD token so the previous session is
  // rejected on its next request (single-session: newest login wins).
  await invalidateStudent(studentId);
  const payload: StudentSessionPayload = {
    sid: studentId,
    cid: coachingId,
    tok,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_S,
  };
  const jar = await cookies();
  jar.set(COOKIE, signToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

/** Clears the session cookie (logout). */
export async function clearStudentSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Returns the verified session payload, or null. No DB hit. */
export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Loads the full Student record for the current session, re-checking it still
 * exists, is active, and belongs to the expected coaching. Returns null if the
 * session is invalid or the student no longer qualifies. Pass `coachingId` to
 * assert the session belongs to a specific coaching (e.g. the /c/[slug] tenant).
 */
export async function getCurrentStudent(coachingId?: string) {
  const session = await getStudentSession();
  if (!session) return null;
  if (coachingId && session.cid !== coachingId) return null;

  // Read-through Redis cache — saves a Neon hit on every authenticated request.
  // Only active students are cached (the DB lookup filters active=true), so a
  // cache hit already implies the student was active at cache time.
  let student: CachedStudent | null = await getCachedStudent(session.sid);
  if (student) {
    // The cached record may predate a deactivation whose cache-drop was lost.
    // The blocklist is the fail-safe: a revoked student is denied even through a
    // stale hit. Fails open on a Redis error — but then the cache is unavailable
    // anyway and the next request takes the DB path below (active=true).
    if (await isStudentBlocked(session.sid)) return null;
  } else {
    student = await prisma.student.findFirst({
      where: { id: session.sid, coaching_id: session.cid, active: true },
      select: {
        id: true,
        coaching_id: true,
        batch_id: true,
        name: true,
        phone: true,
        status: true,
        session_token: true,
      },
    });
    if (!student) return null;
    await setCachedStudent(student);
  }

  // Defensive: a cached record must still belong to the session's coaching.
  if (student.coaching_id !== session.cid) return null;

  // Single-session enforcement: cookie token must match the latest stored one.
  // A login elsewhere rotated session_token (and invalidated this cache entry),
  // so this (older) session is dead.
  if (session.tok !== student.session_token) return null;

  const { session_token, ...safe } = student;
  void session_token;
  return safe;
}
