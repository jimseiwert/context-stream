/**
 * Background Job Worker
 *
 * This worker processes jobs from Bull queues in the background.
 * It should be run as a separate process from the Next.js server.
 *
 * Usage: node -r ts-node/register src/lib/jobs/worker.ts
 * Or: npm run worker (add to package.json scripts)
 */

import { prisma } from "@/lib/db";
import { getRedisClient } from "@/lib/redis/lazy-client";
import {
  startBatchPollingWorker,
  stopBatchPollingWorker,
} from "./batch-polling-worker";
import { processScrapeJob } from "./processors/scrape-job";
import { addScrapeJob, embedQueue, scrapeQueue, updateQueue } from "./queue";
import { startScheduler, stopScheduler } from "./scheduler";
import { validateEncryptionKey, getActiveEmbeddingConfig } from "@/lib/embeddings/config";

// Check environment variables
function checkEnvironment() {
  console.log("\n========================================");
  console.log("Worker Environment Check");
  console.log("========================================");

  // Check if we're using REDIS_URL or individual fields
  const hasRedisUrl = process.env.REDIS_URL;

  const requiredVars = ["DATABASE_URL", "ENCRYPTION_KEY"];

  // Add Redis requirements based on connection method
  requiredVars.push("REDIS_URL");

  const optionalVars = [
    "NODE_ENV",
    ...(hasRedisUrl ? [] : ["REDIS_PASSWORD"]), // Only optional when using individual fields
  ];

  let missingVars: string[] = [];

  console.log("\n✓ Required Variables:");
  requiredVars.forEach((varName) => {
    // Handle special case for Redis URL check
    if (varName === "REDIS_URL") {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        console.log(`  ✗ REDIS_URL: NOT SET`);
        missingVars.push("REDIS_URL");
      } else {
        const displayValue = redisUrl.substring(0, 30) + "...";
        console.log(`  ✓ REDIS_URL: ${displayValue}`);
      }
      return;
    }

    const value = process.env[varName];
    if (!value) {
      console.log(`  ✗ ${varName}: NOT SET`);
      missingVars.push(varName);
    } else {
      // Mask sensitive values
      const displayValue = [
        "DATABASE_URL",
        "ENCRYPTION_KEY",
        "REDIS_PASSWORD",
      ].includes(varName)
        ? value.substring(0, 20) + "..."
        : value;
      console.log(`  ✓ ${varName}: ${displayValue}`);
    }
  });

  console.log("\n✓ Optional Variables:");
  optionalVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      const displayValue = varName === "REDIS_PASSWORD" ? "***" : value;
      console.log(`  ✓ ${varName}: ${displayValue}`);
    } else {
      console.log(`  - ${varName}: Not set (optional)`);
    }
  });

  if (missingVars.length > 0) {
    console.log("\n⚠️  WARNING: Missing required environment variables:");
    missingVars.forEach((varName) => console.log(`  - ${varName}`));
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  console.log("\n✓ All required environment variables are set");
  console.log("========================================\n");
}

// Check Redis connection
async function checkRedisConnection() {
  console.log("Checking Redis connection...");

  try {
    const redis = getRedisClient();

    if (!redis) {
      throw new Error("Redis client is null - initialization failed");
    }

    console.log(`  Redis client created: ${redis.status}`);

    // Try to ping Redis
    await redis.connect();
    const pong = await redis.ping();

    console.log(`  ✓ Redis connection successful: ${pong}`);
    console.log(`  Redis status: ${redis.status}`);

    return true;
  } catch (error: any) {
    console.error("  ✗ Redis connection failed:", error.message);
    throw error;
  }
}

// Check embedding provider configuration
async function checkEmbeddingConfig() {
  console.log("\n========================================");
  console.log("Embedding Provider Configuration Check");
  console.log("========================================\n");

  try {
    // Validate encryption key format
    console.log("Validating encryption key...");
    try {
      validateEncryptionKey();
      console.log("  ✓ Encryption key is valid");
    } catch (error: any) {
      console.error("  ✗ Encryption key validation failed:", error.message);
      throw new Error(
        "Invalid ENCRYPTION_KEY. Generate a new one with: npm run generate-encryption-key"
      );
    }

    // Check for active embedding provider config
    console.log("\nChecking for active embedding provider...");
    try {
      const config = await getActiveEmbeddingConfig();
      console.log("  ✓ Active embedding provider found:");
      console.log(`    Provider: ${config.provider}`);
      console.log(`    Model: ${config.model}`);
      console.log(`    Dimensions: ${config.dimensions}`);
      console.log(`    Batch for new scrapes: ${config.useBatchForNew ? 'enabled' : 'disabled'}`);
      console.log(`    Batch for rescrapes: ${config.useBatchForRescrape ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error("  ✗ No active embedding provider configured");
      throw new Error(
        "No active embedding provider found. " +
        "Super admin must configure an embedding provider at /admin/system-settings"
      );
    }

    console.log("\n✓ Embedding configuration is valid");
    console.log("========================================\n");
  } catch (error: any) {
    console.error("\n✗ Embedding configuration check failed:", error.message);
    throw error;
  }
}

// Initialize queues and set up processors
async function initializeWorker() {
  console.log("\n========================================");
  console.log("Initializing Worker Queues");
  console.log("========================================\n");

  try {
    // Process scrape jobs
    // MEMORY FIX: Limit to 1 concurrent job to prevent OOM on Railway's 1GB plan
    console.log("Setting up scrape queue processor...");
    const concurrentJobs = parseInt(
      process.env.WORKER_CONCURRENT_JOBS || "1",
      10
    );
    console.log(`  Concurrent jobs limit: ${concurrentJobs}`);

    scrapeQueue().process(concurrentJobs, async (job) => {
      console.log(`\n[Scrape Queue] 🔄 Processing job ${job.id}`);
      console.log(`[Scrape Queue]    Source ID: ${job.data.sourceId}`);
      console.log(`[Scrape Queue]    Attempt: ${job.attemptsMade + 1}`);

      try {
        const result = await processScrapeJob(job);
        console.log(`[Scrape Queue] ✓ Job ${job.id} completed successfully`);
        return result;
      } catch (error: any) {
        console.error(`[Scrape Queue] ✗ Job ${job.id} failed:`, error.message);
        throw error;
      }
    });
    console.log("  ✓ Scrape queue processor ready");

    // Process embed jobs (if needed separately)
    console.log("Setting up embed queue processor...");
    embedQueue().process(async (job) => {
      console.log(`\n[Embed Queue] 🔄 Processing job ${job.id}`);
      console.log(`[Embed Queue]    Page ID: ${job.data.pageId}`);

      // If you want to process embeddings separately from scraping
      // implement the logic here
      return { success: true };
    });
    console.log("  ✓ Embed queue processor ready");

    // Process update jobs (re-scrape existing sources)
    console.log("Setting up update queue processor...");
    updateQueue().process(async (job) => {
      console.log(`\n[Update Queue] 🔄 Processing job ${job.id}`);
      console.log(`[Update Queue]    Source ID: ${job.data.sourceId}`);

      try {
        const result = await processScrapeJob(job);
        console.log(`[Update Queue] ✓ Job ${job.id} completed successfully`);
        return result;
      } catch (error: any) {
        console.error(`[Update Queue] ✗ Job ${job.id} failed:`, error.message);
        throw error;
      }
    });
    console.log("  ✓ Update queue processor ready");

    console.log("\n✓ All queue processors initialized");
    console.log("========================================\n");

    // Clear queue history if requested
    if (process.env.CLEAR_QUEUE_HISTORY_ON_STARTUP === "true") {
      await clearQueueHistory();
    }

    // Check for waiting jobs in Redis
    await checkQueueStatus();

    // Scan database for pending sources and add them to the queue
    await processPendingSources();
  } catch (error: any) {
    console.error("\n✗ Failed to initialize worker:", error.message);
    throw error;
  }
}

// Clear queue history (completed and failed jobs)
async function clearQueueHistory() {
  console.log("\n========================================");
  console.log("Clearing Queue History");
  console.log("========================================\n");

  try {
    // Get initial counts
    const [scrapeCounts, embedCounts, updateCounts] = await Promise.all([
      scrapeQueue().getJobCounts(),
      embedQueue().getJobCounts(),
      updateQueue().getJobCounts(),
    ]);

    const totalCompleted =
      scrapeCounts.completed + embedCounts.completed + updateCounts.completed;
    const totalFailed =
      scrapeCounts.failed + embedCounts.failed + updateCounts.failed;

    console.log(
      `Found ${totalCompleted} completed jobs and ${totalFailed} failed jobs to clear`
    );

    if (totalCompleted === 0 && totalFailed === 0) {
      console.log("✓ No history to clear");
      return;
    }

    // Clear completed jobs
    await Promise.all([
      scrapeQueue().clean(0, "completed"),
      embedQueue().clean(0, "completed"),
      updateQueue().clean(0, "completed"),
    ]);

    // Clear failed jobs
    await Promise.all([
      scrapeQueue().clean(0, "failed"),
      embedQueue().clean(0, "failed"),
      updateQueue().clean(0, "failed"),
    ]);

    console.log("✓ Queue history cleared successfully");
    console.log("========================================\n");
  } catch (error: any) {
    console.error("Failed to clear queue history:", error.message);
  }
}

// Check status of all queues
async function checkQueueStatus() {
  console.log("\n========================================");
  console.log("Queue Status Check");
  console.log("========================================\n");

  try {
    const scrapeJobCounts = await scrapeQueue().getJobCounts();
    const embedJobCounts = await embedQueue().getJobCounts();
    const updateJobCounts = await updateQueue().getJobCounts();

    console.log("Scrape Queue:");
    console.log(`  Waiting:   ${scrapeJobCounts.waiting}`);
    console.log(`  Active:    ${scrapeJobCounts.active}`);
    console.log(`  Completed: ${scrapeJobCounts.completed}`);
    console.log(`  Failed:    ${scrapeJobCounts.failed}`);
    console.log(`  Delayed:   ${scrapeJobCounts.delayed}`);

    console.log("\nEmbed Queue:");
    console.log(`  Waiting:   ${embedJobCounts.waiting}`);
    console.log(`  Active:    ${embedJobCounts.active}`);
    console.log(`  Completed: ${embedJobCounts.completed}`);
    console.log(`  Failed:    ${embedJobCounts.failed}`);
    console.log(`  Delayed:   ${embedJobCounts.delayed}`);

    console.log("\nUpdate Queue:");
    console.log(`  Waiting:   ${updateJobCounts.waiting}`);
    console.log(`  Active:    ${updateJobCounts.active}`);
    console.log(`  Completed: ${updateJobCounts.completed}`);
    console.log(`  Failed:    ${updateJobCounts.failed}`);
    console.log(`  Delayed:   ${updateJobCounts.delayed}`);

    const totalWaiting =
      scrapeJobCounts.waiting +
      embedJobCounts.waiting +
      updateJobCounts.waiting;
    if (totalWaiting > 0) {
      console.log(`\n⏳ ${totalWaiting} job(s) waiting to be processed`);
    } else {
      console.log("\n✓ No jobs waiting - worker is idle");
    }

    console.log("========================================\n");
  } catch (error: any) {
    console.error("Failed to get queue status:", error.message);
  }
}

// Scan database for pending sources and add them to the queue
async function processPendingSources() {
  console.log("\n========================================");
  console.log("Scanning for Pending Sources");
  console.log("========================================\n");

  try {
    // Find all sources with PENDING status
    const pendingSources = await prisma.source.findMany({
      where: {
        status: "PENDING",
      },
      select: {
        id: true,
        url: true,
        name: true,
        createdAt: true,
      },
    });

    if (pendingSources.length === 0) {
      console.log("✓ No pending sources found in database");
      console.log("========================================\n");
      return;
    }

    console.log(
      `Found ${pendingSources.length} pending source(s) in database:\n`
    );

    // Add each pending source to the queue (but skip if already has an active job)
    for (const source of pendingSources) {
      console.log(`  Checking: ${source.name || source.url}`);
      console.log(`    Source ID: ${source.id}`);
      console.log(`    Created: ${source.createdAt.toISOString()}`);

      // Check if there's already an active job for this source
      const existingJob = await prisma.job.findFirst({
        where: {
          sourceId: source.id,
          status: { in: ["PENDING", "RUNNING"] },
        },
      });

      if (existingJob) {
        console.log(
          `    ⊘ Skipping - already has active job (${existingJob.status})\n`
        );
        continue;
      }

      try {
        await addScrapeJob(source.id, { priority: 2 }); // Higher priority for pending sources
        console.log(`    ✓ Successfully queued\n`);
      } catch (error: any) {
        console.error(`    ✗ Failed to queue: ${error.message}\n`);
      }
    }

    console.log(`✓ Processed ${pendingSources.length} pending source(s)`);
    console.log("========================================\n");
  } catch (error: any) {
    console.error("✗ Failed to scan for pending sources:", error.message);
    console.error(error.stack);
  }
}

// Periodic queue status check (every 30 seconds)
function startQueueMonitoring() {
  // Check queue status every 30 seconds
  setInterval(async () => {
    await checkQueueStatus();
  }, 30000);

  // Check for pending sources every 5 minutes
  setInterval(async () => {
    await processPendingSources();
  }, 300000); // 5 minutes
}

// Main startup sequence
async function startWorker() {
  try {
    console.log("\n🚀 Starting ContextStream Worker...\n");

    // Step 1: Check environment variables
    checkEnvironment();

    // Step 2: Check Redis connection
    await checkRedisConnection();

    // Step 3: Check embedding provider configuration
    await checkEmbeddingConfig();

    // Step 4: Initialize worker and queues
    await initializeWorker();

    // Step 5: Start periodic queue monitoring
    startQueueMonitoring();

    // Step 6: Start the automatic rescrape scheduler
    const schedulerTask = startScheduler();

    // Step 7: Start the batch embedding polling worker
    const batchPollingTask = startBatchPollingWorker();

    console.log("\n✅ Worker is running and ready to process jobs!");
    console.log("📊 Queue status will be checked every 30 seconds");
    console.log("🔍 Pending sources will be scanned every 5 minutes");
    console.log("🔄 Batch embeddings will be checked every hour\n");

    return { schedulerTask, batchPollingTask };
  } catch (error: any) {
    console.error("\n❌ Failed to start worker:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Initialize the worker
let tasks: {
  schedulerTask: ReturnType<typeof startScheduler>;
  batchPollingTask: ReturnType<typeof startBatchPollingWorker>;
};

startWorker()
  .then((result) => {
    tasks = result;
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  if (tasks) {
    stopScheduler(tasks.schedulerTask);
    stopBatchPollingWorker(tasks.batchPollingTask);
  }
  try {
    await Promise.all([
      scrapeQueue().close(),
      embedQueue().close(),
      updateQueue().close(),
    ]);
    console.log("✓ Queues closed");
  } catch (error) {
    console.error("Error closing queues:", error);
  }

  // Disconnect Prisma to clean up prepared statements and connections
  try {
    await prisma.$disconnect();
    console.log("✓ Database disconnected");
  } catch (error) {
    console.error("Error disconnecting database:", error);
  }

  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  if (tasks) {
    stopScheduler(tasks.schedulerTask);
    stopBatchPollingWorker(tasks.batchPollingTask);
  }
  try {
    await Promise.all([
      scrapeQueue().close(),
      embedQueue().close(),
      updateQueue().close(),
    ]);
    console.log("✓ Queues closed");
  } catch (error) {
    console.error("Error closing queues:", error);
  }

  // Disconnect Prisma to clean up prepared statements and connections
  try {
    await prisma.$disconnect();
    console.log("✓ Database disconnected");
  } catch (error) {
    console.error("Error disconnecting database:", error);
  }

  process.exit(0);
});
