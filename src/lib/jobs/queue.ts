// In-Process Job Queue
// Creates a DB job record and dispatches processing via the central dispatcher.

import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import type { JobType } from "@/lib/db/schema";
import { dispatchJob, type DispatchMode } from "./dispatcher";

/**
 * Creates a job record in the database and dispatches processing via the
 * configured dispatch mode (INPROCESS / WORKER / KUBERNETES).
 * Returns the job ID immediately (fire and forget for INPROCESS mode).
 *
 * @param sourceId - The source to process
 * @param workspaceId - Optional workspace context
 * @param type - Job type (default: SCRAPE)
 * @param dispatchMode - Optional override for dispatch mode
 * @returns The created job ID
 */
export async function enqueueJob(
  sourceId: string,
  workspaceId?: string,
  type: JobType = "SCRAPE",
  dispatchMode?: DispatchMode
): Promise<string> {
  // Resolve effective dispatch mode before inserting so the row is accurate
  const mode: DispatchMode =
    dispatchMode ??
    ((process.env.DISPATCH_MODE?.toUpperCase() === "WORKER"
      ? "WORKER"
      : process.env.DISPATCH_MODE?.toUpperCase() === "KUBERNETES"
        ? "KUBERNETES"
        : "INPROCESS") as DispatchMode);

  // Create job record
  const [job] = await db
    .insert(jobs)
    .values({
      sourceId,
      workspaceId: workspaceId ?? null,
      type,
      status: "PENDING",
      dispatchMode: mode,
    })
    .returning({ id: jobs.id });

  const jobId = job.id;

  // Route to the correct execution backend
  await dispatchJob(jobId, sourceId, mode);

  return jobId;
}
