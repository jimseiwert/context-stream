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

export interface ScrapeJobData {
  sourceId: string
}

export interface ScrapeJobResult {
  success: boolean
  pagesProcessed: number
  chunksCreated: number
  error?: string
}

export async function processScrapeJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
  const { sourceId } = job.data

  console.log(`[Scrape Job ${job.id}] Starting scrape for source ${sourceId}`)

  // Fetch source details
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  })

  if (!source) {
    throw new Error(`Source ${sourceId} not found`)
  }

  // Update source and job status to INDEXING
  await Promise.all([
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
    let result: { completed: number; failed: number }

    // Choose pipeline based on source type
    if (source.type === 'GITHUB') {
      // Use GitHub-specific pipeline
      console.log(`[Scrape Job ${job.id}] Using GitHub pipeline for ${source.url}`)

      const githubPipeline = new GitHubPipelineProcessor({
        repoUrl: source.url,
        sourceId,
        githubToken: process.env.GITHUB_TOKEN,
        maxFiles: (source.config as any)?.maxPages || 1000,
        fetchConcurrency: 5,
        embeddingConcurrency: 2,
        saveConcurrency: 3,
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
      // Use website pipeline (default for WEBSITE, CONFLUENCE, CUSTOM)
      console.log(`[Scrape Job ${job.id}] Using website pipeline for ${source.url}`)

      const pipeline = new PipelineProcessor({
        startUrl: source.url,
        domain: source.domain,
        sourceId,
        maxPages: (source.config as any)?.maxPages || 1000,
        maxDepth: (source.config as any)?.maxDepth || 10,
        respectRobotsTxt: (source.config as any)?.respectRobotsTxt !== false,
        fetchConcurrency: 5,
        extractConcurrency: 3,
        embeddingConcurrency: 2,
        saveConcurrency: 3,
        onProgress: (progress: PipelineProgress) => {
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
                extracting: progress.extracting,
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

      result = await pipeline.process()
      await pipeline.cleanup()
    }

    console.log(`[Scrape Job ${job.id}] Pipeline completed: ${result.completed} pages, ${result.failed} failures`)

    // Update source status to ACTIVE
    await Promise.all([
      prisma.source.update({
        where: { id: sourceId },
        data: {
          status: 'ACTIVE',
          lastScrapedAt: new Date(),
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
    await Promise.all([
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
