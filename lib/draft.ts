import { redis, isRedisConfigured } from "@/lib/redis";

/**
 * Draft state (in-progress test answers + UI state) lives in Redis during the
 * test, not Postgres. With test takers auto-saving every 20 minutes, this
 * eliminates the sustained DB write load that crushed the old implementation.
 *
 * Authorization-by-key-construction:
 *   Key = `draft:state:{userId}:{draftId}`
 *
 * The userId is baked into the key, derived from the authenticated session on
 * every request. A malicious user with a valid Clerk session who tries to
 * corrupt someone else's draft writes to `draft:state:{attackerId}:{victimDraftId}`,
 * which is never read by anyone — the victim's resume endpoint constructs
 * `draft:state:{victimId}:{victimDraftId}`. Harmless garbage that auto-expires.
 *
 * This pattern removes the GET-meta-then-SET-state round-trip, cutting per-save
 * cost from 2 Upstash commands to 1.
 */

const stateKey = (userId: string, draftId: string): string =>
  `draft:state:${userId}:${draftId}`;

// Conservative TTL: longest mock test (3h) + 2h buffer. Drafts past this point
// are effectively dead anyway — the DB row's expires_at is the real lifecycle.
const DRAFT_TTL_SECONDS = 5 * 60 * 60;

/**
 * `expires_at` on TestSessionDraft is `actual_deadline + this buffer`. The
 * buffer is purely a DB-cleanup grace period so the row isn't deleted at the
 * exact instant the user's timer hits zero — submission needs a few moments
 * to finalize. It is NOT user-facing time. Anywhere we compute the user's
 * remaining time from expires_at we must subtract this back out, otherwise
 * resuming a 3h test shows a 4h timer.
 */
export const DEADLINE_CLEANUP_BUFFER_MS = 60 * 60 * 1000; // 1 hour

/** Initialize empty state when a draft is created. One SET. */
export async function initDraft(
  userId: string,
  draftId: string,
  state: unknown
): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.set(stateKey(userId, draftId), JSON.stringify(state ?? {}), {
      ex: DRAFT_TTL_SECONDS,
    });
  } catch (e) {
    console.warn("[draft] initDraft failed", e);
  }
}

/** Hot path. Single Redis SET. No reads, no auth lookup. */
export async function saveDraftState(
  userId: string,
  draftId: string,
  state: unknown
): Promise<{ ok: boolean }> {
  if (!isRedisConfigured()) return { ok: false };
  try {
    await redis.set(stateKey(userId, draftId), JSON.stringify(state ?? {}), {
      ex: DRAFT_TTL_SECONDS,
    });
    return { ok: true };
  } catch (e) {
    console.warn("[draft] saveDraftState failed", e);
    return { ok: false };
  }
}

/** Read state. Returns null on miss — caller falls back to DB.state. */
export async function readDraftState(
  userId: string,
  draftId: string
): Promise<unknown | null> {
  if (!isRedisConfigured()) return null;
  try {
    const raw = await redis.get<unknown>(stateKey(userId, draftId));
    if (raw == null) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    console.warn("[draft] readDraftState failed", e);
    return null;
  }
}

/** Clean up on submit (TTL also handles natural expiry). */
export async function clearDraft(
  userId: string,
  draftId: string
): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.del(stateKey(userId, draftId));
  } catch (e) {
    console.warn("[draft] clearDraft failed", e);
  }
}
