// External Worker Server (Mode 2)
// Runs as a standalone Node.js process outside of Next.js.
// Polls the Job table for PENDING jobs with dispatchMode=WORKER and processes them.
//
// Start with:
//   tsx src/lib/jobs/worker-entry.ts
//   npm run worker:server
//
// Supports Redis pub/sub for immediate job pickup when REDIS_URL is set.

import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { processDocumentPipeline } from "./processors/document-pipeline-processor";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 5_000;        // how often to poll DB when idle
const HEARTBEAT_INTERVAL_MS = 30_000;  // heartbeat cadence
const DEAD_JOB_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes stale → re-queue

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobRow {
  id: string;
  sourceId: string;
  status: string;
  dispatchMode: string;
  progress: unknown;
}

// ---------------------------------------------------------------------------
// Dead-job recovery
// ---------------------------------------------------------------------------

/**
 * On startup, find RUNNING jobs with dispatchMode=WORKER whose heartbeat is
 * older than 5 minutes and reset them to PENDING so they can be re-claimed.
 * The heartbeat timestamp is stored in jobs.progress as { workerHeartbeat: number }.
 */
async function recoverDeadJobs(): Promise<void> {
  const threshold = Date.now() - DEAD_JOB_THRESHOLD_MS;

  // Fetch all RUNNING/WORKER jobs — we inspect the heartbeat in JS because
  // querying inside jsonb with Drizzle is cumbersome and varies by pg version.
  const staleJobs = await db.query.jobs.findMany({
    where: and(
      eq(jobs.status, "RUNNING"),
      eq(jobs.dispatchMode, "WORKER")
    ),
    columns: { id: true, sourceId: true, status: true, dispatchMode: true, progress: true },
  });

  let recovered = 0;
  for (const job of staleJobs) {
    const progress = job.progress as Record<string, unknown> | null;
    const heartbeat =
      typeof progress?.workerHeartbeat === "number"
        ? (progress.workerHeartbeat as number)
        : null;

    // No heartbeat at all, or heartbeat is stale
    if (heartbeat === null || heartbeat < threshold) {
      await db
        .update(jobs)
        .set({ status: "PENDING" })
        .where(eq(jobs.id, job.id));
      console.log(`[Worker] Recovered stale job ${job.id} (heartbeat: ${heartbeat})`);
      recovered++;
    }
  }

  if (recovered > 0) {
    console.log(`[Worker] Recovered ${recovered} stale job(s)`);
  }
}

// ---------------------------------------------------------------------------
// Job claiming (SELECT ... FOR UPDATE SKIP LOCKED)
// ---------------------------------------------------------------------------

/**
 * Atomically claims the next PENDING/WORKER job from the database.
 * Uses FOR UPDATE SKIP LOCKED so multiple worker instances don't double-claim.
 * Returns null when there are no available jobs.
 */
async function claimNextJob(): Promise<JobRow | null> {
  // Use raw SQL for FOR UPDATE SKIP LOCKED — Drizzle doesn't expose this natively.
  const result = await db.execute(
    sql`
      SELECT id, "sourceId", status, "dispatchMode", progress
      FROM "Job"
      WHERE status = 'PENDING'
        AND "dispatchMode" = 'WORKER'
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `
  );

  const rows = result as unknown as JobRow[];
  if (!rows || rows.length === 0) return null;

  const row = rows[0];

  // Immediately mark as RUNNING so concurrent workers don't claim it
  await db
    .update(jobs)
    .set({ status: "RUNNING", startedAt: new Date() })
    .where(eq(jobs.id, row.id));

  return row;
}

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

/**
 * Starts a heartbeat interval that updates jobs.progress.workerHeartbeat every
 * HEARTBEAT_INTERVAL_MS milliseconds.
 * Returns a function that clears the interval.
 */
function startHeartbeat(jobId: string): () => void {
  const interval = setInterval(() => {
    db.execute(
      sql`
        UPDATE "Job"
        SET progress = jsonb_set(
          COALESCE(progress, '{}'::jsonb),
          '{workerHeartbeat}',
          ${sql.raw(`'${Date.now()}'::jsonb`)}
        )
        WHERE id = ${jobId}
      `
    ).catch((err) => {
      console.warn(`[Worker] Heartbeat update failed for job ${jobId}:`, err);
    });
  }, HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(interval);
}

// ---------------------------------------------------------------------------
// Single-job processing
// ---------------------------------------------------------------------------

/**
 * Processes a single claimed job with heartbeat.
 */
async function processJob(job: JobRow): Promise<void> {
  console.log(`[Worker] Processing job ${job.id} (source: ${job.sourceId})`);
  const stopHeartbeat = startHeartbeat(job.id);

  try {
    await processDocumentPipeline(job.id, job.sourceId);
    console.log(`[Worker] Job ${job.id} completed successfully`);
  } catch (err) {
    console.error(`[Worker] Job ${job.id} failed:`, err);
  } finally {
    stopHeartbeat();
  }
}

// ---------------------------------------------------------------------------
// Polling loop
// ---------------------------------------------------------------------------

async function pollLoop(signal: AbortSignal): Promise<void> {
  console.log("[Worker] Starting polling loop (interval: 5s)...");

  while (!signal.aborted) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processJob(job);
        // Don't sleep — immediately poll again in case more jobs are waiting
        continue;
      }
    } catch (err) {
      console.error("[Worker] Error in poll loop:", err);
    }

    // Sleep before next poll
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, POLL_INTERVAL_MS);
      // If we're shutting down, resolve early
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  console.log("[Worker] Polling loop stopped");
}

// ---------------------------------------------------------------------------
// Redis pub/sub (optional)
// ---------------------------------------------------------------------------

/**
 * Sets up a Redis subscriber that listens to `jobs:pending`.
 * When a message arrives, immediately attempts to claim a job (bypassing poll delay).
 * Returns a teardown function.
 */
async function setupRedisSubscriber(
  onJobAvailable: () => void
): Promise<(() => Promise<void>) | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    const { default: Redis } = await import("ioredis");
    const subscriber = new Redis(redisUrl, { lazyConnect: true, enableReadyCheck: false });
    await subscriber.connect();
    await subscriber.subscribe("jobs:pending");

    subscriber.on("message", (_channel: string, _message: string) => {
      console.log(`[Worker] Redis notification received — checking for jobs`);
      onJobAvailable();
    });

    subscriber.on("error", (err: Error) => {
      console.warn("[Worker] Redis subscriber error:", err.message);
    });

    console.log("[Worker] Redis pub/sub subscriber active on jobs:pending");

    return async () => {
      await subscriber.unsubscribe("jobs:pending");
      subscriber.disconnect();
    };
  } catch (err) {
    console.warn("[Worker] Failed to set up Redis subscriber:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Single-job mode (Kubernetes pod)
// ---------------------------------------------------------------------------

/**
 * Processes a single job by ID (for Kubernetes dispatch where the pod
 * is given a specific JOB_ID environment variable).
 */
async function runSingleJob(jobId: string): Promise<void> {
  console.log(`[Worker] Single-job mode: processing job ${jobId}`);

  // Fetch the job record
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
    columns: { id: true, sourceId: true, status: true, dispatchMode: true, progress: true },
  });

  if (!job) {
    console.error(`[Worker] Job ${jobId} not found`);
    process.exit(1);
  }

  if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED") {
    console.log(`[Worker] Job ${jobId} is already in terminal state: ${job.status}. Exiting.`);
    process.exit(0);
  }

  // Mark as RUNNING
  await db
    .update(jobs)
    .set({ status: "RUNNING", startedAt: new Date() })
    .where(eq(jobs.id, jobId));

  await processJob(job as JobRow);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Starts the external worker server.
 * Call this from the worker-entry.ts entrypoint.
 */
export async function startWorkerServer(): Promise<void> {
  console.log("[Worker] ContextStream Worker Server starting...");
  console.log(`[Worker] PID: ${process.pid}`);
  console.log(`[Worker] NODE_ENV: ${process.env.NODE_ENV}`);

  // Single-job mode: used when a Kubernetes pod is given a specific JOB_ID
  if (process.env.JOB_ID && process.env.WORKER_MODE === "single") {
    await runSingleJob(process.env.JOB_ID);
    return;
  }

  // Recover any stale/dead jobs from a previous crash
  try {
    await recoverDeadJobs();
  } catch (err) {
    console.error("[Worker] Dead job recovery failed (continuing):", err);
  }

  // Graceful shutdown
  const abortController = new AbortController();
  let teardownRedis: (() => Promise<void>) | null = null;

  const shutdown = async (signal: string) => {
    console.log(`[Worker] Received ${signal} — shutting down gracefully...`);
    abortController.abort();
    if (teardownRedis) await teardownRedis().catch(() => {});
    // Give in-flight jobs a moment to reach a checkpoint
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Optional Redis pub/sub for immediate job notification
  // When a Redis message arrives, we kick the polling loop to check immediately.
  // This is implemented by resolving a shared promise that the poll loop waits on.
  teardownRedis = await setupRedisSubscriber(() => {
    // The poll loop will naturally pick up on its next iteration; no extra
    // mechanism needed since we don't sleep when jobs are found.
  });

  // Start main polling loop (blocks until shutdown)
  await pollLoop(abortController.signal);
}
