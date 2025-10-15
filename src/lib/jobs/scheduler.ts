/**
 * Automatic Rescrape Scheduler
 *
 * This module runs cron jobs to automatically rescrape sources based on their schedule.
 * It checks every hour for sources that need to be rescraped and queues them.
 */

import { prisma } from "@/lib/db";
import cron from "node-cron";
import { addScrapeJob } from "./queue";

/**
 * Calculate the next scrape time based on schedule type
 */
export function calculateNextScrapeAt(
  schedule: "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY",
  from: Date = new Date()
): Date | null {
  if (schedule === "NEVER") return null;

  const next = new Date(from);

  switch (schedule) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
}

/**
 * Process sources that are due for automatic rescraping
 */
async function processScheduledRescrapes() {
  console.log(
    "[Scheduler] Checking for sources due for automatic rescraping..."
  );

  try {
    // Find all sources where:
    // 1. rescrapeSchedule is not NEVER
    // 2. nextScrapeAt is in the past or null
    // 3. status is not PENDING or INDEXING (no active job)
    const dueForRescrape = await prisma.source.findMany({
      where: {
        rescrapeSchedule: {
          not: "NEVER",
        },
        OR: [{ nextScrapeAt: null }, { nextScrapeAt: { lte: new Date() } }],
        status: {
          notIn: ["PENDING", "INDEXING"],
        },
      },
      select: {
        id: true,
        domain: true,
        rescrapeSchedule: true,
        nextScrapeAt: true,
        scope: true,
      },
    });

    console.log(
      `[Scheduler] Found ${dueForRescrape.length} sources due for rescraping`
    );

    // Process each source
    for (const source of dueForRescrape) {
      try {
        console.log(
          `[Scheduler] Queueing automatic rescrape for ${source.domain} (${source.rescrapeSchedule})`
        );

        // Double-check for existing jobs (race condition protection)
        const existingJob = await prisma.job.findFirst({
          where: {
            sourceId: source.id,
            status: { in: ["PENDING", "RUNNING"] },
          },
        });

        if (existingJob) {
          console.log(
            `[Scheduler] Skipping ${source.domain} - job already running (ID: ${existingJob.id})`
          );
          continue;
        }

        // Update source status and schedule
        const now = new Date();
        const nextScrapeAt = calculateNextScrapeAt(
          source.rescrapeSchedule as any,
          now
        );

        await prisma.source.update({
          where: { id: source.id },
          data: {
            status: "PENDING",
            nextScrapeAt,
            lastAutomatedScrapeAt: now,
            errorMessage: null,
          },
        });

        // Create a job record
        await prisma.job.create({
          data: {
            sourceId: source.id,
            type: "SCRAPE",
            status: "PENDING",
            progress: {
              pagesScraped: 0,
              total: 0,
              automated: true, // Mark as automated rescrape
            },
          },
        });

        // Queue the scraping job (automatic re-scrape uses batch embeddings for 50% cost savings)
        await addScrapeJob(source.id, { isInitialScrape: false });

        console.log(
          `[Scheduler] Successfully queued ${source.domain}. Next scrape: ${
            nextScrapeAt?.toISOString() || "N/A"
          }`
        );
      } catch (error) {
        console.error(
          `[Scheduler] Error queueing rescrape for ${source.domain}:`,
          error
        );
        // Continue with other sources even if one fails
      }
    }

    console.log("[Scheduler] Automatic rescrape check completed");
  } catch (error) {
    console.error("[Scheduler] Error in processScheduledRescrapes:", error);
  }
}

/**
 * Start the scheduler
 * Runs every hour at the top of the hour
 */
export function startScheduler() {
  console.log("[Scheduler] Starting automatic rescrape scheduler");
  console.log("[Scheduler] Will check for due sources every hour");

  // Run every hour at minute 0
  // Pattern: "0 * * * *" = At minute 0 of every hour
  const task = cron.schedule("0 * * * *", processScheduledRescrapes, {
    timezone: "UTC",
  });

  // Also run once immediately on startup (after a short delay)
  setTimeout(() => {
    console.log("[Scheduler] Running initial check...");
    processScheduledRescrapes();
  }, 10000); // Wait 10 seconds after startup

  return task;
}

/**
 * Stop the scheduler
 */
export function stopScheduler(task: ReturnType<typeof cron.schedule>) {
  console.log("[Scheduler] Stopping automatic rescrape scheduler");
  task.stop();
}

/**
 * Update a source's rescrape schedule
 */
export async function updateSourceSchedule(
  sourceId: string,
  schedule: "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY"
) {
  const nextScrapeAt =
    schedule === "NEVER" ? null : calculateNextScrapeAt(schedule);

  await prisma.source.update({
    where: { id: sourceId },
    data: {
      rescrapeSchedule: schedule,
      nextScrapeAt,
    },
  });

  console.log(
    `[Scheduler] Updated schedule for source ${sourceId}: ${schedule}${
      nextScrapeAt ? ` (next: ${nextScrapeAt.toISOString()})` : ""
    }`
  );
}
