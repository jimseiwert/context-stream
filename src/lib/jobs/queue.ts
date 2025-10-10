/**
 * Bull Queue Setup for Background Job Processing
 *
 * This module configures Redis-backed job queues for asynchronous processing
 * of scraping, embedding, and update tasks.
 */

import Queue from 'bull'
import Redis from 'ioredis'

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

// Create Bull queues for different job types
export const scrapeQueue = new Queue('scrape', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  },
})

export const embedQueue = new Queue('embed', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const updateQueue = new Queue('update', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
})

// Job queue event handlers for monitoring
scrapeQueue.on('error', (error) => {
  console.error('[Scrape Queue] Error:', error)
})

scrapeQueue.on('failed', (job, error) => {
  console.error(`[Scrape Queue] Job ${job.id} failed:`, error.message)
})

scrapeQueue.on('completed', (job) => {
  console.log(`[Scrape Queue] Job ${job.id} completed`)
})

embedQueue.on('error', (error) => {
  console.error('[Embed Queue] Error:', error)
})

embedQueue.on('failed', (job, error) => {
  console.error(`[Embed Queue] Job ${job.id} failed:`, error.message)
})

embedQueue.on('completed', (job) => {
  console.log(`[Embed Queue] Job ${job.id} completed`)
})

updateQueue.on('error', (error) => {
  console.error('[Update Queue] Error:', error)
})

updateQueue.on('failed', (job, error) => {
  console.error(`[Update Queue] Job ${job.id} failed:`, error.message)
})

updateQueue.on('completed', (job) => {
  console.log(`[Update Queue] Job ${job.id} completed`)
})

// Helper function to add a scrape job
export async function addScrapeJob(sourceId: string, options?: { priority?: number }) {
  const job = await scrapeQueue.add(
    { sourceId },
    {
      priority: options?.priority || 1,
      jobId: `scrape-${sourceId}-${Date.now()}`,
    }
  )
  return job.id
}

// Helper function to add an embed job
export async function addEmbedJob(pageId: string, content: string) {
  const job = await embedQueue.add({
    pageId,
    content,
  })
  return job.id
}

// Helper function to add an update job (re-scrape existing source)
export async function addUpdateJob(sourceId: string) {
  const job = await updateQueue.add({
    sourceId,
  })
  return job.id
}

// Graceful shutdown
export async function shutdownQueues() {
  await Promise.all([
    scrapeQueue.close(),
    embedQueue.close(),
    updateQueue.close(),
  ])
}

// Queue health check
export async function getQueueHealth() {
  const [scrapeHealth, embedHealth, updateHealth] = await Promise.all([
    scrapeQueue.getJobCounts(),
    embedQueue.getJobCounts(),
    updateQueue.getJobCounts(),
  ])

  return {
    scrape: scrapeHealth,
    embed: embedHealth,
    update: updateHealth,
  }
}
