import { redis, isRedisConfigured } from "@/lib/redis";

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * A fast, Edge-compatible sliding window rate limiter using Upstash Redis.
 *
 * @param key Unique identifier for the rate limit bucket (e.g. "user_id:api_route")
 * @param limit Maximum number of requests allowed within the window
 * @param windowSeconds Window size in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const clearBefore = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  if (!isRedisConfigured()) {
    // If Redis is not configured, pass through (or fail secure in production)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: now + windowMs,
    };
  }

  try {
    const pipeline = redis.pipeline();
    // Remove timestamps older than the sliding window
    pipeline.zremrangebyscore(redisKey, 0, clearBefore);
    // Add the current request timestamp
    const memberId = `${now}-${Math.random().toString(36).substring(2, 8)}`;
    pipeline.zadd(redisKey, { score: now, member: memberId });
    // Count the number of requests in the window
    pipeline.zcard(redisKey);
    // Set a TTL on the set to clean up idle keys
    pipeline.expire(redisKey, windowSeconds);

    const results = await pipeline.exec();
    const count = (results[2] as number) ?? 0;
    const success = count <= limit;

    return {
      success,
      limit,
      remaining: Math.max(0, limit - count),
      reset: now + windowMs,
    };
  } catch (error) {
    console.error("[RateLimiter] Redis command failed:", error);
    // Fail-open: allow the request if Redis is down/failing
    return {
      success: true,
      limit,
      remaining: 1,
      reset: now + windowMs,
    };
  }
}
