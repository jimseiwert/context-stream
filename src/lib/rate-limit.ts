// Rate Limiting with Redis
// Implements sliding window rate limiting per user

import { IS_SAAS_MODE } from "./config/features";
import { getRedisClient, isBuildTime } from "./redis/lazy-client";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

export interface RateLimitOptions {
  userId: string;
  limit: number; // requests per window
  window: number; // window size in seconds (default: 60 for 1 minute)
}

/**
 * Check rate limit using sliding window algorithm
 */
export async function checkRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  // Skip rate limiting in self-hosted mode or during build
  if (!IS_SAAS_MODE || isBuildTime()) {
    return {
      success: true,
      limit: -1,
      remaining: -1,
      reset: 0,
    };
  }

  const redis = getRedisClient();
  if (!redis) {
    // Fail open if Redis is not available
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit,
      reset: Math.ceil((Date.now() + options.window * 1000) / 1000),
    };
  }

  const { userId, limit, window = 60 } = options;

  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  try {
    // Ensure connection is established
    if (redis.status === "wait") {
      await redis.connect();
    }

    // Using Redis sorted set with timestamps as scores
    const pipeline = redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry
    pipeline.expire(key, window * 2);

    const results = await pipeline.exec();

    // Pipeline exec returns [error, result] tuples
    const currentCount = (results?.[1]?.[1] as number) || 0;

    // Check if limit exceeded
    const success = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount - 1);
    const reset = Math.ceil((now + window * 1000) / 1000);

    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if rate limit check fails
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Math.ceil((now + window * 1000) / 1000),
    };
  }
}

/**
 * Get current rate limit status without consuming a token
 */
export async function getRateLimitStatus(
  userId: string,
  window = 60
): Promise<{ count: number; oldestRequest: number }> {
  if (!IS_SAAS_MODE || isBuildTime()) {
    return { count: 0, oldestRequest: 0 };
  }

  const redis = getRedisClient();
  if (!redis) {
    return { count: 0, oldestRequest: 0 };
  }

  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  try {
    // Ensure connection is established
    if (redis.status === "wait") {
      await redis.connect();
    }

    // Clean up old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Get count
    const count = await redis.zcard(key);

    // Get oldest request in window with score
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    const oldestRequest = oldest.length >= 2 ? parseFloat(oldest[1]) : 0;

    return { count, oldestRequest };
  } catch (error) {
    console.error("Failed to get rate limit status:", error);
    return { count: 0, oldestRequest: 0 };
  }
}

/**
 * Reset rate limit for a user (admin function)
 */
export async function resetRateLimit(userId: string): Promise<void> {
  if (!IS_SAAS_MODE || isBuildTime()) return;

  const redis = getRedisClient();
  if (!redis) return;

  const key = `ratelimit:${userId}`;
  try {
    // Ensure connection is established
    if (redis.status === "wait") {
      await redis.connect();
    }

    await redis.del(key);
  } catch (error) {
    console.error("Failed to reset rate limit:", error);
  }
}

/**
 * Format rate limit headers for HTTP responses
 */
export function formatRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

/**
 * Create rate limit error response
 */
export function createRateLimitError(result: RateLimitResult) {
  const resetDate = new Date(result.reset * 1000);
  return {
    error: "Rate limit exceeded",
    message: `Too many requests. Please try again after ${resetDate.toISOString()}`,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    resetDate: resetDate.toISOString(),
  };
}
