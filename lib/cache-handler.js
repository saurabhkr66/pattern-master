// Custom Next.js incremental-cache handler (see next.config.ts `cacheHandler`).
//
// THE BUG THIS FIXES
// PM2 runs the app in cluster mode (deploy/ecosystem.config.cjs, instances:
// "max" — one worker per vCPU). `unstable_cache` entries are stored on disk
// (.next/cache, shared between workers) plus a per-process in-memory LRU, but
// tag invalidation lives in a plain in-memory Map — see
// next/dist/server/lib/incremental-cache/tags-manifest.external.js, which
// FileSystemCache.revalidateTag() writes to and FileSystemCache.get() reads
// via areTagsExpired().
//
// That Map is per process. So revalidateTag("patterns", { expire: 0 }) in
// app/api/patterns/[id]/short-notes/route.ts only invalidated the worker that
// happened to serve the POST. The other worker never learned the tag was
// revalidated and kept serving its pre-edit copy. With round-robin between
// workers, the next read was a coin flip — which is exactly the "admin saves
// mastery notes, sometimes it shows, sometimes it reverts, sometimes only a
// hard refresh fixes it" symptom.
//
// THE FIX
// Subclass Next's own FileSystemCache so all storage behavior is unchanged,
// and mirror only tag invalidations through the Upstash Redis instance the app
// already uses. Cached payloads never leave the process; only small
// "tag X was invalidated at time T" records cross the wire.
//
// Invalidations are published to a sorted set keyed by timestamp and each
// worker pulls only events newer than the last one it saw, so the sync cost is
// proportional to recent invalidations rather than to every tag ever used —
// important because per-user tags (dashboard-<userId>, mistakes-<userId>, …)
// would otherwise accumulate without bound.
//
// TRADE-OFF: cross-worker invalidation becomes visible within
// REFRESH_INTERVAL_MS rather than instantly. Same-worker reads are still
// immediate.
//
// This file is loaded via require.resolve() outside Next's build pipeline, so
// it must be plain CommonJS with no path aliases (@/lib/...). It intentionally
// depends on two Next internals; if a future Next upgrade moves them, this
// throws at boot/build time — loud and immediate — rather than silently
// disabling caching and dumping the load on Postgres. Re-check
// node_modules/next/dist/server/lib/incremental-cache/ after any Next bump.

const FileSystemCache = require("next/dist/server/lib/incremental-cache/file-system-cache").default;
const { tagsManifest } = require("next/dist/server/lib/incremental-cache/tags-manifest.external.js");
const { Redis } = require("@upstash/redis");

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisConfigured = !!(REDIS_URL && REDIS_TOKEN);
const redis = redisConfigured ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

if (!redisConfigured) {
  // Without Redis this handler is just FileSystemCache, i.e. the cross-worker
  // staleness bug is back. Say so loudly rather than degrading in silence.
  console.warn(
    "[cache-handler] UPSTASH_REDIS_REST_URL/TOKEN not set — tag invalidations will NOT be shared " +
      "between PM2 workers, so edits may appear stale on whichever worker did not serve the write."
  );
}

// Sorted set of invalidation events: score = epoch ms, member = JSON payload.
const EVENTS_KEY = "nextcache:tag-events";
// How often a worker actually calls Redis to pull new events.
const REFRESH_INTERVAL_MS = 3000;
// How long events are retained. A worker that was down longer than this can
// miss an invalidation for entries still on disk, so keep it comfortably
// longer than any realistic restart/deploy gap.
const EVENT_RETENTION_MS = 24 * 60 * 60 * 1000;
// Overlap re-scanned on every sync, to absorb events that land mid-read.
// Workers share one machine (one clock), so this only needs to cover the
// duration of a Redis round trip.
const CURSOR_OVERLAP_MS = 10 * 1000;

let lastEventScore = 0;
let lastSyncedAt = 0;

function applyRemoteEvent(payload) {
  const { t: tag, e: expired, s: stale } = payload;
  if (!tag) return;

  // Merge forward only: a late-arriving older event must never walk back a
  // newer invalidation this worker already knows about.
  const existing = tagsManifest.get(tag) || {};
  const merged = { ...existing };
  if (typeof expired === "number" && expired > (existing.expired || 0)) {
    merged.expired = expired;
  }
  if (typeof stale === "number" && stale > (existing.stale || 0)) {
    merged.stale = stale;
  }
  tagsManifest.set(tag, merged);
}

async function syncTagsFromRedis() {
  if (!redisConfigured) return;

  const now = Date.now();
  if (now - lastSyncedAt < REFRESH_INTERVAL_MS) return;
  lastSyncedAt = now;

  try {
    // Re-scan a short overlap rather than resuming exactly where we stopped.
    // zrange sees a snapshot, so an event written by the other worker while
    // this read was in flight can carry a score below one we already consumed
    // and would otherwise be skipped forever. Re-applying an event is a no-op
    // (applyRemoteEvent only moves timestamps forward), so the overlap is free
    // insurance against permanently missing an invalidation.
    const from = Math.max(0, lastEventScore - CURSOR_OVERLAP_MS);
    const members = await redis.zrange(EVENTS_KEY, `(${from}`, "+inf", {
      byScore: true,
    });
    if (!members || members.length === 0) return;

    for (const member of members) {
      let payload;
      try {
        payload = typeof member === "string" ? JSON.parse(member) : member;
      } catch {
        continue;
      }
      applyRemoteEvent(payload);
      if (typeof payload.at === "number" && payload.at > lastEventScore) {
        lastEventScore = payload.at;
      }
    }
  } catch (err) {
    // Best-effort: on failure this worker falls back to its own local tag
    // state, i.e. the behavior it had before this handler existed.
    console.error("[cache-handler] tag sync from Redis failed:", err);
  }
}

module.exports = class RedisTagSyncFileSystemCache extends FileSystemCache {
  async get(...args) {
    // There is no refreshTags() hook in this cache subsystem, so the pull
    // happens here. It is throttled, so at most one Redis round trip per
    // REFRESH_INTERVAL_MS per worker regardless of traffic.
    await syncTagsFromRedis();
    return super.get(...args);
  }

  async revalidateTag(tags, durations) {
    // Let Next apply it locally first — this computes the exact
    // { stale, expired } shape that areTagsExpired()/areTagsStale() read.
    await super.revalidateTag(tags, durations);

    const list = typeof tags === "string" ? [tags] : tags;
    if (!redisConfigured || !list || list.length === 0) return;

    try {
      const at = Date.now();
      const events = list.map((tag) => {
        const entry = tagsManifest.get(tag) || {};
        return {
          score: at,
          member: JSON.stringify({
            t: tag,
            e: typeof entry.expired === "number" ? entry.expired : null,
            s: typeof entry.stale === "number" ? entry.stale : null,
            at,
          }),
        };
      });

      // Deliberately does NOT advance the read cursor. Skipping past our own
      // write would also skip a sibling worker's event with a slightly lower
      // score that we haven't pulled yet. Re-reading our own event on the next
      // sync is harmless.
      const pipeline = redis.pipeline();
      pipeline.zadd(EVENTS_KEY, ...events);
      pipeline.zremrangebyscore(EVENTS_KEY, 0, at - EVENT_RETENTION_MS);
      await pipeline.exec();
    } catch (err) {
      console.error(
        "[cache-handler] failed to publish tag invalidation to Redis — other PM2 workers may serve stale data for these tags until their entries expire:",
        list,
        err
      );
    }
  }
};
