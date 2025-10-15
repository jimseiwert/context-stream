/**
 * Batch Embedding Polling Worker
 *
 * This worker runs periodically to check for completed batch embedding jobs
 * from OpenAI and updates the database with the generated embeddings.
 *
 * Runs every hour to check for completed batches.
 */

import { prisma } from "@/lib/db";
import cron from "node-cron";
import {
  checkBatchStatus,
  processBatchResults,
} from "@/lib/embeddings/batch";

/**
 * Process pending and in-progress batch jobs
 */
async function processPendingBatchJobs() {
  console.log("[Batch Polling] Checking for pending batch embedding jobs...");

  try {
    // Find all batch jobs that are not yet completed
    const pendingBatches = await prisma.batchEmbeddingJob.findMany({
      where: {
        status: {
          in: ["validating", "in_progress", "finalizing"],
        },
      },
      select: {
        id: true,
        openaiBatchId: true,
        sourceId: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(
      `[Batch Polling] Found ${pendingBatches.length} pending batch jobs`
    );

    // Check status of each batch
    for (const batch of pendingBatches) {
      try {
        console.log(
          `[Batch Polling] Checking status of batch ${batch.openaiBatchId}...`
        );

        const status = await checkBatchStatus(batch.openaiBatchId);

        // Update database with new status
        await prisma.batchEmbeddingJob.update({
          where: { id: batch.id },
          data: {
            status: status.status,
          },
        });

        console.log(
          `[Batch Polling] Batch ${batch.openaiBatchId} status: ${status.status}`
        );

        // If completed, process the results
        if (status.status === "completed") {
          console.log(
            `[Batch Polling] Processing results for completed batch ${batch.openaiBatchId}`
          );

          try {
            const result = await processBatchResults(batch.openaiBatchId);

            console.log(
              `[Batch Polling] Successfully processed batch ${batch.openaiBatchId}:`
            );
            console.log(
              `[Batch Polling]   Success: ${result.successCount}, Errors: ${result.errorCount}`
            );

            // Update source to indicate embeddings are complete
            await prisma.source.update({
              where: { id: batch.sourceId },
              data: {
                lastUpdatedAt: new Date(),
              },
            });
          } catch (error: any) {
            console.error(
              `[Batch Polling] Error processing batch results for ${batch.openaiBatchId}:`,
              error.message
            );

            // Update batch job with error
            await prisma.batchEmbeddingJob.update({
              where: { id: batch.id },
              data: {
                status: "failed",
                completedAt: new Date(),
              },
            });
          }
        } else if (
          status.status === "failed" ||
          status.status === "expired" ||
          status.status === "cancelled"
        ) {
          console.error(
            `[Batch Polling] Batch ${batch.openaiBatchId} ${status.status}`
          );

          // Update batch job status
          await prisma.batchEmbeddingJob.update({
            where: { id: batch.id },
            data: {
              status: status.status,
              completedAt: new Date(),
            },
          });
        }
      } catch (error: any) {
        console.error(
          `[Batch Polling] Error checking batch ${batch.openaiBatchId}:`,
          error.message
        );
        // Continue with other batches even if one fails
      }
    }

    console.log("[Batch Polling] Batch polling completed");
  } catch (error) {
    console.error("[Batch Polling] Error in processPendingBatchJobs:", error);
  }
}

/**
 * Start the batch polling worker
 * Runs every hour at minute 15
 */
export function startBatchPollingWorker() {
  console.log("[Batch Polling] Starting batch embedding polling worker");
  console.log("[Batch Polling] Will check for completed batches every hour");

  // Run every hour at minute 15
  // Pattern: "15 * * * *" = At minute 15 of every hour
  const task = cron.schedule("15 * * * *", processPendingBatchJobs, {
    timezone: "UTC",
  });

  // Also run once immediately on startup (after a short delay)
  setTimeout(() => {
    console.log("[Batch Polling] Running initial check...");
    processPendingBatchJobs();
  }, 15000); // Wait 15 seconds after startup

  return task;
}

/**
 * Stop the batch polling worker
 */
export function stopBatchPollingWorker(
  task: ReturnType<typeof cron.schedule>
) {
  console.log("[Batch Polling] Stopping batch embedding polling worker");
  task.stop();
}
