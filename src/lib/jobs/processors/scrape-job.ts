/**
 * Scrape Job Processor
 *
 * Handles background scraping jobs:
 * 1. Scrape pages from source URL
 * 2. Extract and clean content
 * 3. Generate embeddings
 * 4. Store in database
 */

import { Job } from 'bull'
import { prisma } from '@/lib/db'
import { PipelineProcessor, PipelineProgress } from './pipeline-processor'
import { GitHubPipelineProcessor, GitHubPipelineProgress } from './github-pipeline-processor'
import { SourceType } from '@prisma/client'
import { createBatchEmbeddingJob } from '@/lib/embeddings/batch'

export interface ScrapeJobData {
  sourceId: string
  isInitialScrape?: boolean  // True for initial scrapes, false for re-scrapes
}

export interface ScrapeJobResult {
  success: boolean
  pagesProcessed: number
  chunksCreated: number
  error?: string
}

export async function processScrapeJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
  const { sourceId, isInitialScrape = true } = job.data

  console.log(`[Scrape Job ${job.id}] Starting scrape for source ${sourceId}`)
  console.log(`[Scrape Job ${job.id}] Type: ${isInitialScrape ? 'Initial scrape' : 'Re-scrape'}`)
  console.log(`[Scrape Job ${job.id}] Embedding strategy: ${isInitialScrape ? 'Real-time' : 'Batch (50% cost savings)'}`)

  // MEMORY FIX: Use environment variables for concurrency with conservative defaults
  const fetchConcurrency = parseInt(process.env.WORKER_FETCH_CONCURRENCY || '3', 10);
  const extractConcurrency = parseInt(process.env.WORKER_EXTRACT_CONCURRENCY || '2', 10);
  const embeddingConcurrency = parseInt(process.env.WORKER_EMBED_CONCURRENCY || '1', 10);
  const saveConcurrency = parseInt(process.env.WORKER_SAVE_CONCURRENCY || '2', 10);

  console.log(`[Scrape Job ${job.id}] Concurrency: fetch=${fetchConcurrency}, extract=${extractConcurrency}, embed=${embeddingConcurrency}, save=${saveConcurrency}`)

  // Fetch source details
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  })

  if (!source) {
    throw new Error(`Source ${sourceId} not found`)
  }

  // Update source and job status to INDEXING
  // Use a transaction to ensure both updates succeed or fail together
  await prisma.$transaction([
    prisma.source.update({
      where: { id: sourceId },
      data: { status: 'INDEXING' },
    }),
    prisma.job.updateMany({
      where: { sourceId, status: 'PENDING' },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    }),
  ])

  try {
    // Create cancellation check function
    const checkCancellation = async () => {
      const job = await prisma.job.findFirst({
        where: {
          sourceId,
          status: { in: ['RUNNING', 'PENDING'] }
        },
        select: { status: true, errorMessage: true }
      });

      // If job doesn't exist or has been marked as FAILED (cancelled), stop processing
      const cancelled = !job || job.status === 'FAILED';
      if (cancelled) {
        console.log(`[Scrape Job ${sourceId}] Job cancellation detected`);
      }
      return cancelled;
    };

    let result: { completed: number; failed: number }

    // Choose pipeline based on source type
    if (source.type === 'GITHUB') {
      // Use GitHub-specific pipeline
      console.log(`[Scrape Job ${job.id}] Using GitHub pipeline for ${source.url}`)

      // MEMORY FIX: Allow environment override for max files (Railway 1GB limit)
      const maxFiles = parseInt(process.env.MAX_PAGES_PER_SOURCE || '0', 10) || (source.config as any)?.maxPages || 1000;
      console.log(`[Scrape Job ${job.id}] Max files limit: ${maxFiles}`);

      const githubPipeline = new GitHubPipelineProcessor({
        repoUrl: source.url,
        sourceId,
        githubToken: process.env.GITHUB_TOKEN,
        isInitialScrape, // Pass through embedding strategy flag
        maxFiles,
        fetchConcurrency,
        embeddingConcurrency,
        saveConcurrency,
        checkCancellation, // Pass cancellation check function
        onProgress: (progress: GitHubPipelineProgress) => {
          // Update Bull queue progress
          const totalProgress = Math.floor(((progress.completed + progress.failed) / progress.total) * 100)
          job.progress(totalProgress)

          // Update database progress with pipeline stats
          prisma.job.updateMany({
            where: { sourceId, status: 'RUNNING' },
            data: {
              progress: {
                queued: progress.queued,
                fetching: progress.fetching,
                embedding: progress.embedding,
                saving: progress.saving,
                completed: progress.completed,
                failed: progress.failed,
                total: progress.total,
              },
            },
          }).catch(console.error)
        },
      })

      result = await githubPipeline.process()
      await githubPipeline.cleanup()

    } else {
      // Use website pipeline for WEBSITE sources
      console.log(`[Scrape Job ${job.id}] Using website pipeline for ${source.url}`)

      // MEMORY FIX: Allow environment override for max pages (Railway 1GB limit)
      const maxPages = parseInt(process.env.MAX_PAGES_PER_SOURCE || '0', 10) || (source.config as any)?.maxPages || 1000;
      console.log(`[Scrape Job ${job.id}] Max pages limit: ${maxPages}`);

      const pipeline = new PipelineProcessor({
        startUrl: source.url,
        domain: source.domain,
        sourceId,
        maxPages,
        maxDepth: (source.config as any)?.maxDepth || 10,
        respectRobotsTxt: (source.config as any)?.respectRobotsTxt !== false,
        isInitialScrape, // Pass through embedding strategy flag
        fetchConcurrency,
        extractConcurrency,
        embeddingConcurrency,
        saveConcurrency,
        checkCancellation, // Pass cancellation check function
        onProgress: (progress: PipelineProgress) => {
          // Update Bull queue progress
          const totalProgress = Math.floor(((progress.completed + progress.failed) / progress.total) * 100)
          job.progress(totalProgress)

          // Build progress update object
          const progressData: any = {
            queued: progress.queued,
            fetching: progress.fetching,
            extracting: progress.extracting,
            embedding: progress.embedding,
            saving: progress.saving,
            completed: progress.completed,
            failed: progress.failed,
            total: progress.total,
          }

          // Include metadata updates if present
          if (progress.name || progress.logo) {
            progressData.metadata = {}
            if (progress.name) progressData.metadata.name = progress.name
            if (progress.logo) progressData.metadata.logo = progress.logo
          }

          // Update database progress with pipeline stats
          prisma.job.updateMany({
            where: { sourceId, status: 'RUNNING' },
            data: { progress: progressData },
          }).catch(console.error)
        },
      })

      result = await pipeline.process()
      await pipeline.cleanup()
    }

    console.log(`[Scrape Job ${job.id}] Pipeline completed: ${result.completed} pages, ${result.failed} failures`)

    // For re-scrapes, submit a batch embedding job to OpenAI
    if (!isInitialScrape && result.completed > 0) {
      console.log(`[Scrape Job ${job.id}] Submitting batch embedding job for re-scrape`)
      try {
        const batchId = await createBatchEmbeddingJob(sourceId)
        console.log(`[Scrape Job ${job.id}] Batch job submitted: ${batchId}`)
        console.log(`[Scrape Job ${job.id}] Batch will be processed within 24 hours (50% cost savings)`)
      } catch (error: any) {
        console.error(`[Scrape Job ${job.id}] Failed to submit batch job:`, error.message)
        // Don't fail the entire job if batch submission fails - we can retry later
      }
    }

    // Update source status to ACTIVE and job status to COMPLETED
    // Use a transaction to ensure both updates succeed or fail together
    await prisma.$transaction([
      prisma.source.update({
        where: { id: sourceId },
        data: {
          status: 'ACTIVE',
          lastScrapedAt: new Date(),
          pageCount: result.completed,
        },
      }),
      prisma.job.updateMany({
        where: { sourceId, status: 'RUNNING' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: {
            pagesProcessed: result.completed,
            failures: result.failed,
          },
        },
      }),
    ])

    console.log(`[Scrape Job ${job.id}] Completed successfully: ${result.completed} pages, ${result.failed} failures`)

    return {
      success: true,
      pagesProcessed: result.completed,
      chunksCreated: 0, // Not tracking chunks separately anymore
    }

  } catch (error: any) {
    console.error(`[Scrape Job ${job.id}] Fatal error:`, error)

    // Update source and job status to ERROR
    // Use a transaction to ensure both updates succeed or fail together
    await prisma.$transaction([
      prisma.source.update({
        where: { id: sourceId },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
        },
      }),
      prisma.job.updateMany({
        where: { sourceId, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      }),
    ])

    return {
      success: false,
      pagesProcessed: 0,
      chunksCreated: 0,
      error: error.message,
    }
  }
}
