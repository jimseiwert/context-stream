/**
 * Bull Queue Setup for Background Job Processing
 *
 * This module configures Redis-backed job queues for asynchronous processing
 * of scraping, embedding, and update tasks.
 */

import { getRedisClient, isBuildTime } from "@/lib/redis/lazy-client";
import Queue from "bull";

// Lazy queue initialization to prevent build-time Redis connections
let scrapeQueue: Queue.Queue | null = null;
let embedQueue: Queue.Queue | null = null;
let updateQueue: Queue.Queue | null = null;

function getRedisConfig() {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error("Redis client not available");
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

function getScrapeQueue(): Queue.Queue {
  if (!scrapeQueue) {
    if (isBuildTime()) {
      throw new Error("Cannot initialize queues during build time");
    }
    scrapeQueue = new Queue("scrape", {
      redis: getRedisConfig(),
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
      redis: getRedisConfig(),
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
      redis: getRedisConfig(),
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

// Job queue event handlers for monitoring (set up when queues are initialized)
function setupQueueEventHandlers() {
  if (isBuildTime()) return;

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
}

// Helper function to add a scrape job
export async function addScrapeJob(
  sourceId: string,
  options?: { priority?: number }
) {
  if (isBuildTime()) {
    throw new Error("Cannot add jobs during build time");
  }

  setupQueueEventHandlers();
  const queue = getScrapeQueue();
  const job = await queue.add(
    { sourceId },
    {
      priority: options?.priority || 1,
      jobId: `scrape-${sourceId}-${Date.now()}`,
    }
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

  await Promise.all([
    scrapeQueue?.close(),
    embedQueue?.close(),
    updateQueue?.close(),
  ]);
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
