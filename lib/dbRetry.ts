import "server-only";

// Neon's HTTP adapter occasionally throws transient connection errors —
// "fetch failed" / "Error connecting to database" — especially on the first hit
// after the branch scales to zero, or under burst load. These are not real
// failures; a short retry almost always succeeds. Wrap critical reads/writes so
// a cold-start blip doesn't surface as a 500 to a student mid-test.

const TRANSIENT =
  /fetch failed|Error connecting to database|ECONNRESET|ETIMEDOUT|terminating connection|Couldn't reach database|connection closed|socket hang up/i;

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, delayMs = 1200 }: { retries?: number; delayMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = TRANSIENT.test(msg);
      if (!isTransient || attempt === retries) throw err;
      // Equal jitter: half the backoff fixed, half random. When a Neon
      // cold-start fails a whole batch's submits at once, fixed delays would
      // make them all retry on the same tick and re-stampede the waking DB.
      // Spreading the retries lets it recover. Range: [base/2, base).
      const base = delayMs * (attempt + 1);
      const wait = base / 2 + Math.random() * (base / 2);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
