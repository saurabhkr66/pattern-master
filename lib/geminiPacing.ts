import type { GenerativeModel, Part } from "@google/generative-ai";

// Shared pacing + retry for the offline Gemini batch scripts
// (scripts/backfill-pyq-difficulty.ts, scripts/build-subpatterns.ts).
// One module-level limiter, so every caller in the same process shares a
// single request budget.

// Free-tier gemini-3.5-flash-lite caps at 15 requests/minute. Default to 12 to
// leave headroom (network jitter, other admin AI calls sharing the same key).
// This gates every call GLOBALLY (across all CONCURRENCY workers) so raising
// CONCURRENCY in a script increases how many calls are in flight waiting on a
// slow response, NOT how fast new requests are allowed to start.
const RPM = parseInt(process.env.AI_RPM || process.env.GEMINI_RPM || "12", 10);
const MIN_INTERVAL_MS = Math.ceil(60_000 / RPM);
let nextSlotAt = 0;

export async function waitForRateLimitSlot(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlotAt);
  nextSlotAt = slot + MIN_INTERVAL_MS;
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
}

// The free tier also caps at 1,500 requests/DAY (resets midnight Pacific). That
// exhaustion looks like a 429 too, but backing off 30s and retrying is pointless
// — it won't recover for hours. Detected separately so the caller can abort the
// whole run instead of burning through every remaining row marking it "failed".
export function isDailyQuotaExceeded(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /perday|daily|requests? per day/i.test(msg);
}

// Transient Gemini errors (429/503/overloaded) are retried with backoff; anything
// else (auth, bad JSON, empty result) throws straight through to the caller.
export function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b|\b503\b|RESOURCE_EXHAUSTED|overloaded|rate.?limit|too many requests|unavailable/i.test(msg);
}

// question_text can carry an inline base64 image data URI (legacy rows) — strip
// it before sending to Gemini (pure noise/wasted tokens, the real image already
// goes in separately via q.images) and before it ever hits a console log.
export const stripBase64Text = (text: string) =>
  (text || "").replace(/data:image\/[^;]+;base64,[^"'\s)]{100,}/g, "[image]");

const MAX_RETRIES = 4;

/**
 * One paced Gemini call that must return JSON. `parse` validates the decoded
 * JSON and throws if it's unusable (empty/malformed) — that error is NOT
 * retried, same as any other non-transient failure. `label` only feeds the
 * retry log line.
 */
export async function generateJson<T>(
  model: GenerativeModel,
  parts: Part[],
  parse: (json: unknown) => T,
  label: string,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await waitForRateLimitSlot();
    try {
      const res = await model.generateContent(parts);
      return parse(JSON.parse(res.response.text()) as unknown);
    } catch (err) {
      // Daily quota won't recover within this process's lifetime — fail fast.
      if (isDailyQuotaExceeded(err)) throw err;
      if (!isRetryable(err) || attempt >= MAX_RETRIES) throw err;
      const backoff = Math.min(30_000, 1000 * 2 ** attempt) + Math.random() * 500;
      // Say so explicitly — otherwise a stalled retry loop is indistinguishable
      // from real progress in the console.
      console.warn(
        `  ↻ retry ${attempt + 1}/${MAX_RETRIES} for ${label} in ${(backoff / 1000).toFixed(1)}s — ${err instanceof Error ? err.message.slice(0, 120) : err}`,
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
