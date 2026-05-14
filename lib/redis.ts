import { Redis } from "@upstash/redis";

declare global {
  var __upstashRedis: Redis | undefined;
}

export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function makeClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  return new Redis({ url, token });
}

// Lazy proxy: never throws at import time. Throws only if someone tries to use
// it while Redis is unconfigured — and leaderboard.ts guards every call with
// isRedisConfigured() first, so that should never happen in practice.
function getClient(): Redis {
  if (globalThis.__upstashRedis) return globalThis.__upstashRedis;
  if (!isRedisConfigured()) {
    throw new Error(
      "Upstash Redis is not configured (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)"
    );
  }
  const client = makeClient();
  if (process.env.NODE_ENV !== "production")
    globalThis.__upstashRedis = client;
  return client;
}

export const redis: Redis = new Proxy({} as Redis, {
  get(_t, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
