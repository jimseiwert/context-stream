/**
 * Background Job Worker
 *
 * This worker processes jobs from Bull queues in the background.
 * It should be run as a separate process from the Next.js server.
 *
 * Usage: node -r ts-node/register src/lib/jobs/worker.ts
 * Or: npm run worker (add to package.json scripts)
 */

import { scrapeQueue, embedQueue, updateQueue } from './queue'
import { processScrapeJob } from './processors/scrape-job'
import { startScheduler, stopScheduler } from './scheduler'

// Process scrape jobs
scrapeQueue.process(async (job) => {
  return await processScrapeJob(job)
})

// Process embed jobs (if needed separately)
embedQueue.process(async (job) => {
  // If you want to process embeddings separately from scraping
  // implement the logic here
  console.log(`[Embed Queue] Processing job ${job.id}`)
  return { success: true }
})

// Process update jobs (re-scrape existing sources)
updateQueue.process(async (job) => {
  console.log(`[Update Queue] Processing job ${job.id}`)
  // Re-use scrape job processor for updates
  return await processScrapeJob(job)
})

console.log('Background worker started')
console.log('Processing jobs from queues: scrape, embed, update')

// Start the automatic rescrape scheduler
const schedulerTask = startScheduler()

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  stopScheduler(schedulerTask)
  await Promise.all([
    scrapeQueue.close(),
    embedQueue.close(),
    updateQueue.close(),
  ])
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully')
  stopScheduler(schedulerTask)
  await Promise.all([
    scrapeQueue.close(),
    embedQueue.close(),
    updateQueue.close(),
  ])
  process.exit(0)
})
