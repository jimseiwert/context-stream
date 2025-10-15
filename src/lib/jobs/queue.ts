/**
 * Bull Queue Setup for Background Job Processing
 *
 * This module configures Redis-backed job queues for asynchronous processing
 * of scraping, embedding, and update tasks.
 *
 * Uses centralized Redis client from lazy-client.ts for singleton connection management.
 */

import {
  isBuildTime,
  getRedisClient,
  getRedisSubscriber,
  createRedisBlockingClient,
} from "@/lib/redis/lazy-client";
import Queue from "bull";

// Lazy queue initialization to prevent build-time Redis connections
let scrapeQueue: Queue.Queue | null = null;
let embedQueue: Queue.Queue | null = null;
let updateQueue: Queue.Queue | null = null;

function getScrapeQueue(): Queue.Queue {
  if (!scrapeQueue) {
    if (isBuildTime()) {
      throw new Error("Cannot initialize queues during build time");
    }

    scrapeQueue = new Queue("scrape", {
      createClient: (type) => {
        switch (type) {
          case "client":
            console.log("[Scrape Queue] Using shared client");
            return getRedisClient();
          case "subscriber":
            console.log("[Scrape Queue] Using shared subscriber");
            return getRedisSubscriber();
          case "bclient":
            console.log("[Scrape Queue] Creating blocking client");
            return createRedisBlockingClient("Scrape Blocking");
          default:
            console.log("[Scrape Queue] Creating default client");
            return createRedisBlockingClient("Scrape Default");
        }
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs for debugging
      },
    });
  }
  return scrapeQueue;
}

function getEmbedQueue(): Queue.Queue {
  if (!embedQueue) {
    if (isBuildTime()) {
      throw new Error("Cannot initialize queues during build time");
    }

    embedQueue = new Queue("embed", {
      createClient: (type) => {
        switch (type) {
          case "client":
            console.log("[Embed Queue] Using shared client");
            return getRedisClient();
          case "subscriber":
            console.log("[Embed Queue] Using shared subscriber");
            return getRedisSubscriber();
          case "bclient":
            console.log("[Embed Queue] Creating blocking client");
            return createRedisBlockingClient("Embed Blocking");
          default:
            console.log("[Embed Queue] Creating default client");
            return createRedisBlockingClient("Embed Default");
        }
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return embedQueue;
}

function getUpdateQueue(): Queue.Queue {
  if (!updateQueue) {
    if (isBuildTime()) {
      throw new Error("Cannot initialize queues during build time");
    }

    updateQueue = new Queue("update", {
      createClient: (type) => {
        switch (type) {
          case "client":
            console.log("[Update Queue] Using shared client");
            return getRedisClient();
          case "subscriber":
            console.log("[Update Queue] Using shared subscriber");
            return getRedisSubscriber();
          case "bclient":
            console.log("[Update Queue] Creating blocking client");
            return createRedisBlockingClient("Update Blocking");
          default:
            console.log("[Update Queue] Creating default client");
            return createRedisBlockingClient("Update Default");
        }
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    });
  }
  return updateQueue;
}

// Export getters instead of direct queue instances
export {
  getEmbedQueue as embedQueue,
  getScrapeQueue as scrapeQueue,
  getUpdateQueue as updateQueue,
};

// Track if event handlers have been set up
let eventHandlersInitialized = false;

// Job queue event handlers for monitoring (set up when queues are initialized)
function setupQueueEventHandlers() {
  if (isBuildTime() || eventHandlersInitialized) return;

  const scrape = getScrapeQueue();
  const embed = getEmbedQueue();
  const update = getUpdateQueue();

  scrape.on("error", (error) => {
    console.error("[Scrape Queue] Error:", error);
  });

  scrape.on("failed", (job, error) => {
    console.error(`[Scrape Queue] Job ${job.id} failed:`, error.message);
  });

  scrape.on("completed", (job) => {
    console.log(`[Scrape Queue] Job ${job.id} completed`);
  });

  embed.on("error", (error) => {
    console.error("[Embed Queue] Error:", error);
  });

  embed.on("failed", (job, error) => {
    console.error(`[Embed Queue] Job ${job.id} failed:`, error.message);
  });

  embed.on("completed", (job) => {
    console.log(`[Embed Queue] Job ${job.id} completed`);
  });

  update.on("error", (error) => {
    console.error("[Update Queue] Error:", error);
  });

  update.on("failed", (job, error) => {
    console.error(`[Update Queue] Job ${job.id} failed:`, error.message);
  });

  update.on("completed", (job) => {
    console.log(`[Update Queue] Job ${job.id} completed`);
  });

  eventHandlersInitialized = true;
  console.log("[Queue] Event handlers initialized");
}

// Helper function to add a scrape job
export async function addScrapeJob(
  sourceId: string,
  options?: { priority?: number; isInitialScrape?: boolean }
) {
  if (isBuildTime()) {
    throw new Error("Cannot add jobs during build time");
  }

  const isInitialScrape = options?.isInitialScrape ?? true; // Default to true for backward compatibility
  console.log(`[Queue] Adding scrape job for source: ${sourceId}`);
  console.log(
    `[Queue]    Type: ${isInitialScrape ? "Initial scrape" : "Re-scrape"}`
  );

  setupQueueEventHandlers();
  const queue = getScrapeQueue();
  const job = await queue.add(
    { sourceId, isInitialScrape },
    {
      priority: options?.priority || 1,
      jobId: `scrape-${sourceId}-${Date.now()}`,
    }
  );

  console.log(`[Queue] ✓ Scrape job added: ${job.id}`);
  console.log(`[Queue]    Source ID: ${sourceId}`);
  console.log(`[Queue]    Priority: ${options?.priority || 1}`);
  console.log(
    `[Queue]    Embedding strategy: ${
      isInitialScrape ? "Real-time" : "Batch (50% cost savings)"
    }`
  );

  // Check queue status
  const jobCounts = await queue.getJobCounts();
  console.log(
    `[Queue]    Queue status: ${jobCounts.waiting} waiting, ${jobCounts.active} active`
  );

  return job.id;
}

// Helper function to add an embed job
export async function addEmbedJob(pageId: string, content: string) {
  if (isBuildTime()) {
    throw new Error("Cannot add jobs during build time");
  }

  setupQueueEventHandlers();
  const queue = getEmbedQueue();
  const job = await queue.add({
    pageId,
    content,
  });
  return job.id;
}

// Helper function to add an update job (re-scrape existing source)
export async function addUpdateJob(sourceId: string) {
  if (isBuildTime()) {
    throw new Error("Cannot add jobs during build time");
  }

  setupQueueEventHandlers();
  const queue = getUpdateQueue();
  const job = await queue.add({
    sourceId,
  });
  return job.id;
}

// Graceful shutdown
export async function shutdownQueues() {
  if (isBuildTime()) return;

  console.log("[Queue] Shutting down queues...");

  // Close all Bull queues
  await Promise.all([
    scrapeQueue?.close(),
    embedQueue?.close(),
    updateQueue?.close(),
  ]);

  // Import and call centralized Redis connection closer
  const { closeRedisConnections } = await import("@/lib/redis/lazy-client");
  await closeRedisConnections();

  console.log("[Queue] ✓ All queues and connections closed");
}

// Queue health check
export async function getQueueHealth() {
  if (isBuildTime()) {
    return {
      scrape: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      embed: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      update: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    };
  }

  setupQueueEventHandlers();
  const [scrapeHealth, embedHealth, updateHealth] = await Promise.all([
    getScrapeQueue().getJobCounts(),
    getEmbedQueue().getJobCounts(),
    getUpdateQueue().getJobCounts(),
  ]);

  return {
    scrape: scrapeHealth,
    embed: embedHealth,
    update: updateHealth,
  };
}
