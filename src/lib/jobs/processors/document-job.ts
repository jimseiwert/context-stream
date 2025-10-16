/**
 * Document Upload Job Processor
 * Handles background document upload jobs through Bull queue
 */

import { Job } from 'bull'
import { prisma } from '@/lib/db'
import {
  DocumentPipelineProcessor,
  DocumentProcessingResult,
} from './document-pipeline-processor'

export interface DocumentJobData {
  sourceId: string
  filename: string
  filePath: string // Temporary file path
  uploadedBy?: string
  override?: boolean
}

export interface DocumentJobResult {
  success: boolean
  documentsProcessed: number
  chunksCreated: number
  imagesProcessed: number
  error?: string
}

export async function processDocumentJob(
  job: Job<DocumentJobData>
): Promise<DocumentJobResult> {
  const { sourceId, filename, filePath, uploadedBy, override } = job.data

  console.log(`[Document Job ${job.id}] Starting document processing for ${filename}`)
  if (override) {
    console.log(`[Document Job ${job.id}]    Override existing: true`)
  }

  try {
    // Update source and job status to INDEXING
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

    // Read file from temporary storage
    const fs = await import('fs/promises')
    const buffer = await fs.readFile(filePath)

    // Process document
    const processor = new DocumentPipelineProcessor({
      sourceId,
      filename,
      buffer,
      uploadedBy,
      override,
      onProgress: (progress) => {
        // Update job progress
        const progressPercent = getProgressPercent(progress.stage)
        job.progress(progressPercent)

        // Update database with detailed progress
        prisma.job
          .updateMany({
            where: { sourceId, status: 'RUNNING' },
            data: {
              progress: {
                stage: progress.stage,
                chunksCreated: progress.chunksCreated || 0,
                imagesProcessed: progress.imagesProcessed || 0,
              },
            },
          })
          .catch(console.error)
      },
    })

    const result = await processor.process()

    // Clean up temporary file
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn(`[Document Job ${job.id}] Failed to delete temp file:`, error)
    }

    if (!result.success) {
      throw new Error(result.error || 'Document processing failed')
    }

    // Update source status to ACTIVE and job status to COMPLETED
    await prisma.$transaction([
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
            documentsProcessed: 1,
            chunksCreated: result.chunksCreated,
            imagesProcessed: result.imagesProcessed,
          },
        },
      }),
    ])

    console.log(
      `[Document Job ${job.id}] Completed: ${result.chunksCreated} chunks, ${result.imagesProcessed} images${result.error ? ` (${result.error})` : ''}`
    )

    return {
      success: true,
      documentsProcessed: 1,
      chunksCreated: result.chunksCreated,
      imagesProcessed: result.imagesProcessed,
    }
  } catch (error: any) {
    console.error(`[Document Job ${job.id}] Error:`, error)

    // Update source and job status to ERROR
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
      documentsProcessed: 0,
      chunksCreated: 0,
      imagesProcessed: 0,
      error: error.message,
    }
  }
}

/**
 * Convert progress stage to percentage
 */
function getProgressPercent(
  stage: 'validating' | 'extracting' | 'processing_images' | 'chunking' | 'embedding' | 'saving' | 'completed'
): number {
  const stageMap = {
    validating: 10,
    extracting: 25,
    processing_images: 40,
    chunking: 60,
    embedding: 80,
    saving: 90,
    completed: 100,
  }

  return stageMap[stage] || 0
}
