// In-Process Job Queue
// Creates a DB job record and fires off background processing without blocking the request

import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import type { JobType } from "@/lib/db/schema";
import { processDocumentPipeline } from "./processors/document-pipeline-processor";

/**
 * Creates a job record in the database and starts processing in the background.
 * Returns the job ID immediately (fire and forget).
 *
 * @param sourceId - The source to process
 * @param workspaceId - Optional workspace context
 * @param type - Job type (default: SCRAPE)
 * @returns The created job ID
 */
export async function enqueueJob(
  sourceId: string,
  workspaceId?: string,
  type: JobType = "SCRAPE"
): Promise<string> {
  // Create job record
  const [job] = await db
    .insert(jobs)
    .values({
      sourceId,
      workspaceId: workspaceId ?? null,
      type,
      status: "PENDING",
      dispatchMode: "INPROCESS",
    })
    .returning({ id: jobs.id });

  const jobId = job.id;

  // Fire and forget — process asynchronously without blocking
  setImmediate(() => {
    processDocumentPipeline(jobId, sourceId).catch((err) => {
      console.error(`[Queue] Unhandled error in pipeline for job ${jobId}:`, err);
    });
  });

  return jobId;
}
