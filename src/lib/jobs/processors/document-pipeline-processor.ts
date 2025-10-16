/**
 * Document Pipeline Processor
 * Handles the complete workflow for document uploads:
 * 1. Validate document
 * 2. Extract text content
 * 3. Process images (OCR)
 * 4. Chunk content
 * 5. Generate embeddings
 * 6. Store in database
 */

import { prisma } from '@/lib/db'
import { extractDocumentText, validateDocument } from '@/lib/documents/extractors'
import {
  processImage,
  getImageProcessingConfig,
  extractImagesFromPDF,
  extractImagesFromDOCX,
} from '@/lib/documents/image-processor'
import { chunkText } from '@/lib/embeddings/chunker'
import { getEmbeddingProvider } from '@/lib/embeddings/provider'
import { getActiveEmbeddingConfig } from '@/lib/embeddings/config'
import { DocumentType } from '@prisma/client'
import { createHash } from 'crypto'

export interface DocumentProcessingOptions {
  sourceId: string
  filename: string
  buffer: Buffer
  uploadedBy?: string
  override?: boolean // default: false - override existing document if exists
  processImages?: boolean // default: true
  generateEmbeddings?: boolean // default: true
  onProgress?: (progress: DocumentProgress) => void
}

export interface DocumentProgress {
  stage: 'validating' | 'extracting' | 'processing_images' | 'chunking' | 'embedding' | 'saving' | 'completed'
  documentId?: string
  chunksCreated?: number
  imagesProcessed?: number
  error?: string
}

export interface DocumentProcessingResult {
  success: boolean
  documentId?: string
  chunksCreated: number
  imagesProcessed: number
  error?: string
}

export class DocumentPipelineProcessor {
  private options: DocumentProcessingOptions
  private documentId?: string

  constructor(options: DocumentProcessingOptions) {
    this.options = options
  }

  /**
   * Main processing method
   */
  async process(): Promise<DocumentProcessingResult> {
    try {
      // 1. Validate document
      this.reportProgress('validating')
      const validation = validateDocument(this.options.buffer, this.options.filename)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // 2. Calculate checksum for deduplication
      const checksum = this.calculateChecksum(this.options.buffer)

      // Check if document already exists
      const existing = await prisma.document.findFirst({
        where: {
          sourceId: this.options.sourceId,
          checksum,
        },
        include: {
          _count: {
            select: {
              chunks: true,
            },
          },
        },
      })

      if (existing) {
        if (!this.options.override) {
          return {
            success: true,
            documentId: existing.id,
            chunksCreated: 0,
            imagesProcessed: 0,
            error: 'Document already exists (duplicate)',
          }
        }

        // Override existing document - delete old document and chunks
        console.log(`[Document Pipeline] Overriding existing document ${existing.id} with ${existing._count.chunks} chunks`)
        await prisma.$transaction([
          // Delete all chunks
          prisma.chunk.deleteMany({
            where: { documentId: existing.id },
          }),
          // Delete the document
          prisma.document.delete({
            where: { id: existing.id },
          }),
        ])
        console.log(`[Document Pipeline] Old document deleted, proceeding with new upload`)
      }

      // 3. Extract text content
      this.reportProgress('extracting')
      const extraction = await extractDocumentText(
        this.options.buffer,
        this.options.filename
      )

      let fullText = extraction.text
      console.log(`[Document Pipeline] Extracted text length: ${fullText.length} characters`)
      console.log(`[Document Pipeline] First 200 chars: ${fullText.substring(0, 200)}`)
      let imagesProcessed = 0

      // 4. Process images if enabled
      if (this.options.processImages !== false && extraction.metadata?.images) {
        this.reportProgress('processing_images')
        const imageTexts = await this.processImages(extraction.metadata.images)
        imagesProcessed = imageTexts.length

        // Append image text to full text
        if (imageTexts.length > 0) {
          fullText += '\n\n=== Images ===\n\n' + imageTexts.join('\n\n')
        }
      }

      // 5. Detect document type
      const { detectDocumentType } = await import('@/lib/documents/extractors')
      const documentType = await detectDocumentType(
        this.options.buffer,
        this.options.filename
      )

      // 6. Create document record
      this.reportProgress('saving')
      const document = await prisma.document.create({
        data: {
          sourceId: this.options.sourceId,
          filename: this.options.filename,
          type: documentType,
          size: this.options.buffer.length,
          contentText: fullText,
          checksum,
          metadata: {
            ...extraction.metadata,
            imagesProcessed,
            uploadedBy: this.options.uploadedBy,
          },
          indexedAt: new Date(),
        },
      })

      this.documentId = document.id

      // 7. Chunk and embed content
      let chunksCreated = 0
      console.log(`[Document Pipeline] Checking chunking conditions:`)
      console.log(`  - generateEmbeddings: ${this.options.generateEmbeddings}`)
      console.log(`  - fullText length: ${fullText.length}`)
      console.log(`  - fullText trimmed length: ${fullText.trim().length}`)
      if (this.options.generateEmbeddings !== false && fullText.trim()) {
        console.log(`[Document Pipeline] Starting chunking and embedding...`)
        this.reportProgress('chunking')
        chunksCreated = await this.chunkAndEmbed(document.id, fullText)
        console.log(`[Document Pipeline] Chunking completed: ${chunksCreated} chunks created`)
      } else {
        console.log(`[Document Pipeline] Skipping chunking (conditions not met)`)
      }

      // 8. Update source page count (use documents as "pages")
      await prisma.source.update({
        where: { id: this.options.sourceId },
        data: {
          pageCount: {
            increment: 1,
          },
        },
      })

      this.reportProgress('completed')

      return {
        success: true,
        documentId: document.id,
        chunksCreated,
        imagesProcessed,
      }
    } catch (error: any) {
      console.error('[Document Pipeline] Error:', error)
      return {
        success: false,
        chunksCreated: 0,
        imagesProcessed: 0,
        error: error.message,
      }
    }
  }

  /**
   * Process images and extract text using configured method
   */
  private async processImages(images: any[]): Promise<string[]> {
    if (!images || images.length === 0) {
      return []
    }

    const config = await getImageProcessingConfig()
    const results: string[] = []

    for (const [index, image] of images.entries()) {
      try {
        const result = await processImage(image.buffer, config)

        if (result.text && result.text.trim()) {
          results.push(`[Image ${index + 1}]\n${result.text}`)
        }

        this.reportProgress('processing_images', {
          imagesProcessed: index + 1,
        })
      } catch (error: any) {
        console.error(`[Document Pipeline] Image ${index} processing failed:`, error)
        // Continue with other images
      }
    }

    return results
  }

  /**
   * Chunk content and generate embeddings
   */
  private async chunkAndEmbed(documentId: string, text: string): Promise<number> {
    console.log(`[Document Pipeline] chunkAndEmbed called with text length: ${text.length}`)

    // Memory diagnostic
    const memBefore = process.memoryUsage()
    console.log(`[Document Pipeline] Memory before embedding: ${Math.round(memBefore.heapUsed / 1024 / 1024)}MB / ${Math.round(memBefore.heapTotal / 1024 / 1024)}MB`)

    // Get embedding config
    const embeddingConfig = await getActiveEmbeddingConfig()
    console.log(`[Document Pipeline] Embedding config:`, embeddingConfig ? 'Found' : 'Not found')
    if (!embeddingConfig) {
      console.warn('[Document Pipeline] No embedding config found, skipping embeddings')
      return 0
    }

    // Chunk the text
    const chunks = chunkText(text, {
      maxTokens: 700, // Safe for most embedding models
      overlap: 100,
    })

    console.log(`[Document Pipeline] Created ${chunks.length} chunks`)
    if (chunks.length === 0) {
      console.warn(`[Document Pipeline] No chunks created from text of length ${text.length}`)
      return 0
    }

    const memAfterChunking = process.memoryUsage()
    console.log(`[Document Pipeline] Memory after chunking: ${Math.round(memAfterChunking.heapUsed / 1024 / 1024)}MB / ${Math.round(memAfterChunking.heapTotal / 1024 / 1024)}MB`)

    // Get embedding provider once and reuse it
    const provider = await getEmbeddingProvider()
    console.log(`[Document Pipeline] Embedding provider initialized`)

    const memAfterProvider = process.memoryUsage()
    console.log(`[Document Pipeline] Memory after provider init: ${Math.round(memAfterProvider.heapUsed / 1024 / 1024)}MB / ${Math.round(memAfterProvider.heapTotal / 1024 / 1024)}MB`)

    // Generate embeddings and save
    let savedChunks = 0

    for (const [index, chunk] of chunks.entries()) {
      try {
        // Generate embedding using provider
        const embeddings = await provider.generateEmbeddings([chunk.content])
        const embedding = embeddings[0]

        // Save chunk with embedding
        await prisma.$executeRaw`
          INSERT INTO chunks (id, "documentId", "chunkIndex", content, embedding, metadata)
          VALUES (
            gen_random_uuid(),
            ${documentId}::uuid,
            ${index},
            ${chunk.content},
            ${embedding}::vector,
            ${JSON.stringify({ startIndex: chunk.startIndex })}::jsonb
          )
        `

        savedChunks++

        this.reportProgress('embedding', {
          chunksCreated: savedChunks,
        })

        // Log progress every 10 chunks
        if (savedChunks % 10 === 0 || savedChunks === chunks.length) {
          console.log(`[Document Pipeline] Progress: ${savedChunks}/${chunks.length} chunks embedded`)
        }
      } catch (error: any) {
        console.error(`[Document Pipeline] Chunk ${index} embedding failed:`, error)
        // Save chunk without embedding as fallback
        await prisma.chunk.create({
          data: {
            documentId,
            chunkIndex: index,
            content: chunk.content,
            metadata: {
              startIndex: chunk.startIndex,
              embeddingError: error.message,
            },
          },
        })
        savedChunks++
      }
    }

    return savedChunks
  }

  /**
   * Calculate SHA-256 checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Report progress to callback
   */
  private reportProgress(stage: DocumentProgress['stage'], extra: Partial<DocumentProgress> = {}) {
    if (this.options.onProgress) {
      this.options.onProgress({
        stage,
        documentId: this.documentId,
        ...extra,
      })
    }
  }
}

/**
 * Process multiple documents in batch
 */
export async function processBatchDocuments(
  documents: Array<Omit<DocumentProcessingOptions, 'onProgress'>>,
  concurrency: number = 2
): Promise<DocumentProcessingResult[]> {
  const results: DocumentProcessingResult[] = []

  // Process in chunks based on concurrency
  for (let i = 0; i < documents.length; i += concurrency) {
    const chunk = documents.slice(i, i + concurrency)
    const chunkResults = await Promise.all(
      chunk.map(async (doc) => {
        const processor = new DocumentPipelineProcessor(doc)
        return processor.process()
      })
    )
    results.push(...chunkResults)
  }

  return results
}
