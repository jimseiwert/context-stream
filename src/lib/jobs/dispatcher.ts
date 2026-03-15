// Job Dispatcher
// Central routing function that dispatches jobs to INPROCESS, WORKER, or KUBERNETES modes
// based on the DISPATCH_MODE environment variable or explicit argument.

import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { processDocumentPipeline } from "./processors/document-pipeline-processor";

export type DispatchMode = "INPROCESS" | "WORKER" | "KUBERNETES";

/**
 * Resolves the effective dispatch mode.
 * Priority: explicit argument > DISPATCH_MODE env var > "INPROCESS" default.
 */
function resolveDispatchMode(override?: string): DispatchMode {
  const raw = (override ?? process.env.DISPATCH_MODE ?? "INPROCESS").toUpperCase();
  if (raw === "WORKER" || raw === "KUBERNETES") return raw;
  return "INPROCESS";
}

/**
 * Publishes a job ID to the Redis pub/sub channel `jobs:pending`.
 * Falls back silently if Redis is not configured or the publish fails.
 */
async function publishToRedis(jobId: string): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  try {
    // Dynamic import so the worker process doesn't hard-require ioredis at startup
    // when Redis may not be available.
    const { default: Redis } = await import("ioredis");
    const client = new Redis(redisUrl, { lazyConnect: true, enableReadyCheck: false });
    await client.connect();
    await client.publish("jobs:pending", jobId);
    await client.quit();
    console.log(`[Dispatcher] Published job ${jobId} to Redis jobs:pending`);
  } catch (err) {
    // Non-fatal — worker will pick it up via polling fallback
    console.warn(`[Dispatcher] Redis publish failed for job ${jobId}:`, err);
  }
}

/**
 * Updates a job's dispatchMode column in the DB so the external worker
 * knows to claim it.
 */
async function markJobForWorker(jobId: string): Promise<void> {
  await db
    .update(jobs)
    .set({ dispatchMode: "WORKER" })
    .where(eq(jobs.id, jobId));
}

/**
 * Central dispatch function — routes a job to the correct execution mode.
 *
 * @param jobId - The ID of the already-created job record
 * @param sourceId - The source the job operates on
 * @param dispatchMode - Optional override; falls back to DISPATCH_MODE env var then INPROCESS
 */
export async function dispatchJob(
  jobId: string,
  sourceId: string,
  dispatchMode?: DispatchMode
): Promise<void> {
  const mode = resolveDispatchMode(dispatchMode);

  console.log(`[Dispatcher] Dispatching job ${jobId} via mode=${mode}`);

  switch (mode) {
    case "INPROCESS": {
      // Fire-and-forget in the current Node.js process
      setImmediate(() => {
        processDocumentPipeline(jobId, sourceId).catch((err) => {
          console.error(
            `[Dispatcher] Unhandled error in INPROCESS pipeline for job ${jobId}:`,
            err
          );
        });
      });
      break;
    }

    case "WORKER": {
      // Ensure the DB row has dispatchMode=WORKER so the external worker picks it up
      await markJobForWorker(jobId);
      // Optionally notify via Redis pub/sub for immediate pickup
      await publishToRedis(jobId);
      break;
    }

    case "KUBERNETES": {
      // Lazy import to avoid pulling k8s code into the web process when not needed
      const { createKubernetesJob } = await import("./kubernetes");
      await createKubernetesJob(jobId);
      break;
    }
  }
}
