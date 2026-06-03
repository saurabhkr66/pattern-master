import "server-only";

// Cache invalidation is best-effort like the rest of the cache layer — a Redis
// blip must NEVER break the admin edit / login / deactivate that triggered it.
// But invalidation failures differ from read-path cache misses in one important
// way: a missed read self-heals (the next read just falls through to the DB),
// whereas a DROPPED invalidation leaves STALE data served until the key's TTL —
// a stale session staying valid, a deactivated coaching still showing active, an
// edited test serving old questions for up to an hour. That's a correctness (and
// for sessions, security) issue, so we surface it in logs instead of swallowing
// it silently, giving monitoring something to alert on.

/**
 * Run a cache-invalidation `del` without ever throwing. On failure, logs a
 * labelled line so the dropped invalidation is observable.
 *
 * @param label what failed to invalidate, specific enough to act on
 *   (e.g. `student:<id>`, `test:<id>`, `coaching-slug:<slug>`).
 */
export async function bestEffortInvalidate(
  label: string,
  run: () => Promise<unknown>
): Promise<void> {
  try {
    await run();
  } catch (err) {
    console.error(
      `[cache] invalidation failed for ${label} — stale data may be served until TTL:`,
      err
    );
  }
}
