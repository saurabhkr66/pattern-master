import type { GenerativeModel, Part } from "@google/generative-ai";
import { redis, isRedisConfigured } from "@/lib/redis";

// Shared pacing + retry for the Gemini batch jobs
// (scripts/backfill-pyq-difficulty.ts, scripts/build-subpatterns.ts and the
// admin "Sort with AI" button). Tuned for the FREE tier, where the limits are
// per API key — so every caller must share ONE budget:
//
//   • Per minute: prod runs PM2 in cluster mode (one Next worker per vCPU) and
//     the CLI scripts run as separate processes, so an in-process limiter would
//     let each of them spend the full RPM. When Redis is configured, the next
//     free slot lives there and is claimed atomically; otherwise (local dev,
//     single process) it falls back to process memory.
//   • Per day: counted per Pacific date (when Google resets the free quota), so
//     the admin page can show what's left and refuse a job that won't fit.
//     Only calls made through generateJson() are counted — other AI features
//     on the same key aren't, so treat it as a floor. Google's own 429 is still
//     the real limit (see isDailyQuotaExceeded).
//
// Override with env: AI_RPM / GEMINI_RPM (default 12) and GEMINI_RPD (default
// 1500). Raise both when the key moves to a paid tier.

// Free-tier gemini-3.5-flash-lite caps at 15 requests/minute. Default to 12 to
// leave headroom (network jitter, other AI calls sharing the same key).
export const RPM = parseInt(process.env.AI_RPM || process.env.GEMINI_RPM || "12", 10);
export const RPD = parseInt(process.env.GEMINI_RPD || "1500", 10);
const MIN_INTERVAL_MS = Math.ceil(60_000 / RPM);

const SLOT_KEY = "gemini:next-slot";
// Atomically: slot = max(now, stored); store slot + interval; return slot.
const CLAIM_SLOT = `
local now = tonumber(ARGV[1])
local slot = math.max(now, tonumber(redis.call('GET', KEYS[1]) or '0'))
redis.call('SET', KEYS[1], slot + tonumber(ARGV[2]), 'PX', 120000)
return slot
`;

let localNextSlot = 0;

function claimLocalSlot(now: number): number {
  const slot = Math.max(now, localNextSlot);
  localNextSlot = slot + MIN_INTERVAL_MS;
  return slot;
}

/** Waits for this caller's turn under the shared per-minute budget. */
export async function waitForRateLimitSlot(): Promise<void> {
  const now = Date.now();
  let slot: number;
  if (isRedisConfigured()) {
    try {
      slot = Number(await redis.eval(CLAIM_SLOT, [SLOT_KEY], [now, MIN_INTERVAL_MS]));
    } catch {
      // Redis hiccup: pace locally rather than fail the job.
      slot = claimLocalSlot(now);
    }
  } else {
    slot = claimLocalSlot(now);
  }
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
}

// ─── Daily budget ────────────────────────────────────────────────────────────

const PACIFIC = "America/Los_Angeles";

function pacificDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PACIFIC }).format(d); // YYYY-MM-DD
}

function msUntilPacificMidnight(d = new Date()): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PACIFIC,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const elapsed = ((Number(parts.hour) % 24) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000;
  return 24 * 3600_000 - elapsed;
}

const dayKey = () => `gemini:rpd:${pacificDate()}`;
const localDaily = new Map<string, number>();

async function countRequest(): Promise<void> {
  const key = dayKey();
  if (isRedisConfigured()) {
    try {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, 2 * 86400);
      return;
    } catch {
      // fall through to the local count
    }
  }
  localDaily.set(key, (localDaily.get(key) ?? 0) + 1);
}

export type DailyUsage = { used: number; limit: number; rpm: number; resetsInMs: number };

export async function getDailyUsage(): Promise<DailyUsage> {
  const key = dayKey();
  let used = localDaily.get(key) ?? 0;
  if (isRedisConfigured()) {
    try {
      used = Number((await redis.get<number>(key)) ?? 0);
    } catch {
      // keep the local count
    }
  }
  return { used, limit: RPD, rpm: RPM, resetsInMs: msUntilPacificMidnight() };
}

// ─── Errors ──────────────────────────────────────────────────────────────────

// The free tier's per-DAY cap (resets midnight Pacific) also surfaces as a 429,
// but backing off and retrying is pointless — it won't recover for hours.
// Detected separately so the caller can abort the whole run instead of burning
// through every remaining row marking it "failed".
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

const isRateLimited = (msg: string) => /\b429\b|RESOURCE_EXHAUSTED|rate.?limit|too many requests/i.test(msg);

// Gemini's 429 body carries the wait it wants: `"retryDelay":"37s"` or
// "Please retry in 37.5s". Honour it instead of guessing.
function retryDelayMs(msg: string): number | null {
  const m = msg.match(/retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/i) ?? msg.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : null;
}

// question_text can carry an inline base64 image data URI (legacy rows) — strip
// it before sending to Gemini (pure noise/wasted tokens, the real image already
// goes in separately via q.images) and before it ever hits a console log.
export const stripBase64Text = (text: string) =>
  (text || "").replace(/data:image\/[^;]+;base64,[^"'\s)]{100,}/g, "[image]");

// Free-tier per-minute 429s are routine when other AI calls share the key, so
// allow a few more attempts than the error rate alone would suggest.
const MAX_RETRIES = 6;

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
    await countRequest();
    try {
      const res = await model.generateContent(parts);
      return parse(JSON.parse(res.response.text()) as unknown);
    } catch (err) {
      // Daily quota won't recover within this process's lifetime — fail fast.
      if (isDailyQuotaExceeded(err)) throw err;
      if (!isRetryable(err) || attempt >= MAX_RETRIES) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      // Per-minute limit: wait what Gemini asks (or a minute-scale backoff);
      // other transient errors: short exponential backoff.
      const base = isRateLimited(msg)
        ? retryDelayMs(msg) ?? Math.min(60_000, 10_000 * 2 ** attempt)
        : Math.min(30_000, 1000 * 2 ** attempt);
      const backoff = base + Math.random() * 1000;
      // Say so explicitly — otherwise a stalled retry loop is indistinguishable
      // from real progress in the console.
      console.warn(
        `  ↻ retry ${attempt + 1}/${MAX_RETRIES} for ${label} in ${(backoff / 1000).toFixed(1)}s — ${msg.slice(0, 120)}`,
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
