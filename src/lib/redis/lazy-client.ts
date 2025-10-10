/**
 * Lazy Redis Client Initialization
 *
 * This module provides lazy initialization of Redis clients to prevent
 * connection attempts during the Next.js build process.
 */

import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";

// Lazy Redis client for Bull queues and general Redis operations
let ioredisInstance: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (ioredisInstance) return ioredisInstance;

  // Only initialize if we're in a runtime environment (not during build)
  if (typeof window !== "undefined" || process.env.NODE_ENV === "development") {
    try {
      ioredisInstance = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true, // Don't connect until first command
      });

      ioredisInstance.on("error", (err) => {
        console.error("[Redis] Connection error:", err.message);
      });

      return ioredisInstance;
    } catch (error) {
      console.error("[Redis] Failed to initialize:", error);
      return null;
    }
  }

  return null;
}

// Lazy Upstash Redis client for rate limiting
let upstashRedisInstance: UpstashRedis | null = null;

export function getUpstashRedisClient(): UpstashRedis | null {
  if (upstashRedisInstance) return upstashRedisInstance;

  // Only initialize if we're in a runtime environment (not during build)
  if (typeof window !== "undefined" || process.env.NODE_ENV === "development") {
    try {
      upstashRedisInstance = new UpstashRedis({
        url: process.env.KV_REST_API_URL || process.env.REDIS_URL || "",
        token: process.env.KV_REST_API_TOKEN || "",
      });

      return upstashRedisInstance;
    } catch (error) {
      console.error("[Upstash Redis] Failed to initialize:", error);
      return null;
    }
  }

  return null;
}

// Helper to check if we're in a build environment
export function isBuildTime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE === "phase-production-build"
  );
}
