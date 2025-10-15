/**
 * Lazy Redis Client Initialization
 *
 * This module provides lazy initialization of Redis clients to prevent
 * connection attempts during the Next.js build process.
 *
 * SINGLE SOURCE OF TRUTH for all Redis connections in the application.
 */

import Redis from "ioredis";

// Singleton Redis clients for shared use across the application
let sharedClient: Redis | null = null;
let sharedSubscriber: Redis | null = null;

/**
 * Parse and validate REDIS_URL environment variable
 */
function parseRedisUrl(): {
  host: string;
  port: number;
  password?: string;
  db: number;
  tls?: any;
} {
  const redisUrl = process.env.REDIS_URL || "";

  // Validate Redis URL
  if (!redisUrl) {
    throw new Error(
      "[Redis] REDIS_URL environment variable is not set. Please configure Redis connection."
    );
  }

  // Validate URL format
  let url: URL;
  try {
    url = new URL(redisUrl);
  } catch (error) {
    throw new Error(
      `[Redis] Invalid REDIS_URL format: "${redisUrl}". Expected format: redis://username:password@host:port`
    );
  }

  // Validate required components
  if (!url.hostname) {
    throw new Error(
      `[Redis] REDIS_URL is missing hostname. Current value: "${redisUrl}". Expected format: redis://username:password@host:port`
    );
  }

  const config: any = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1)) : 0,
  };

  // Check for IP family (IPv4 vs IPv6)
  const familyParam = url.searchParams.get("family");
  if (familyParam !== null) {
    config.family = parseInt(familyParam);
  }

  // Check for TLS/SSL
  const secureParam = url.searchParams.get("secure");
  if (secureParam === "true") {
    config.tls = {};
  }

  return config;
}

/**
 * Create a Redis client with standard configuration
 */
function createRedisClient(name: string, lazyConnect = false): Redis {
  const config = parseRedisUrl();

  const client = new Redis({
    ...config,
    connectTimeout: 10000,
    lazyConnect,
    maxRetriesPerRequest: null, // Required for Bull
    enableReadyCheck: false, // Required for Bull
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on("error", (err) => {
    console.error(`[Redis ${name}] Connection error:`, err.message);
  });

  client.on("connect", () => {
    console.log(`[Redis ${name}] Connected to ${config.host}:${config.port}`);
  });

  return client;
}

/**
 * Get the shared Redis client (singleton)
 * Used by Bull queues and general Redis operations
 */
export function getRedisClient(): Redis {
  if (isBuildTime()) {
    throw new Error("Cannot initialize Redis during build time");
  }

  if (!sharedClient) {
    sharedClient = createRedisClient("Shared Client", true);
  }

  return sharedClient;
}

/**
 * Get the shared Redis subscriber client (singleton)
 * Used by Bull queues for pub/sub operations
 */
export function getRedisSubscriber(): Redis {
  if (isBuildTime()) {
    throw new Error("Cannot initialize Redis during build time");
  }

  if (!sharedSubscriber) {
    sharedSubscriber = createRedisClient("Shared Subscriber", false);
  }

  return sharedSubscriber;
}

/**
 * Create a new blocking client for Bull
 * Bull requires a separate blocking client for BRPOPLPUSH operations
 */
export function createRedisBlockingClient(name: string): Redis {
  if (isBuildTime()) {
    throw new Error("Cannot initialize Redis during build time");
  }

  return createRedisClient(name, false);
}

/**
 * Close all Redis connections gracefully
 */
export async function closeRedisConnections(): Promise<void> {
  if (isBuildTime()) return;

  console.log("[Redis] Closing all connections...");

  const closePromises: Promise<any>[] = [];

  if (sharedClient) {
    console.log("[Redis] Closing shared client");
    closePromises.push(
      sharedClient
        .quit()
        .then(() => undefined)
        .catch((err) => {
          console.error("[Redis] Error closing shared client:", err);
        })
    );
    sharedClient = null;
  }

  if (sharedSubscriber) {
    console.log("[Redis] Closing shared subscriber");
    closePromises.push(
      sharedSubscriber
        .quit()
        .then(() => undefined)
        .catch((err) => {
          console.error("[Redis] Error closing shared subscriber:", err);
        })
    );
    sharedSubscriber = null;
  }

  await Promise.all(closePromises);
  console.log("[Redis] ✓ All connections closed");
}

/**
 * Helper to check if we're in a build environment
 */
export function isBuildTime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE === "phase-production-build"
  );
}
