// OpenAI Embedding Provider
// Uses OpenAI API for generating embeddings

import OpenAI from 'openai'
import type { EmbeddingConfig } from './config'
import { EmbeddingProvider, ChunkWithEmbedding } from './provider'
import { chunkText } from './chunker'

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI
  private model: string
  private dimensions: number

  constructor(config: EmbeddingConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    })

    this.model = config.model
    this.dimensions = config.dimensions
  }

  /**
   * Generate embeddings for an array of texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      })

      return response.data.map((item) => item.embedding)
    } catch (error) {
      console.error('Failed to generate embeddings:', error)
      throw new Error(`Embedding generation failed: ${error}`)
    }
  }

  /**
   * Chunk text and generate embeddings for each chunk
   */
  async chunkAndEmbed(text: string): Promise<ChunkWithEmbedding[]> {
    // Split text into chunks with conservative limits
    // Max 400 tokens per chunk to ensure we stay well under API limits
    const chunks = chunkText(text, {
      maxTokens: 400,
      overlap: 50,
    })

    if (chunks.length === 0) return []

    // Process one chunk at a time to avoid token limit errors
    // OpenAI embedding API has 8192 token limit per request
    // By processing individually, we guarantee we never exceed the limit
    const allEmbeddings: number[][] = []

    for (const chunk of chunks) {
      // Validate chunk size - chunker should ensure chunks never exceed this limit
      // If we hit this error, it indicates a bug in the chunker
      const MAX_CHARS = 3000 // ~750 tokens (conservative estimate)

      if (chunk.content.length > MAX_CHARS) {
        throw new Error(
          `Chunk size (${chunk.content.length} chars) exceeds maximum (${MAX_CHARS} chars). ` +
          `This indicates a bug in the chunker. Please report this issue.`
        )
      }

      const embeddings = await this.generateEmbeddings([chunk.content])
      allEmbeddings.push(...embeddings)
    }

    // Combine chunks with embeddings
    return chunks.map((chunk, index) => ({
      content: chunk.content,
      embedding: allEmbeddings[index],
      metadata: chunk.metadata,
    }))
  }

  /**
   * Cleanup resources and close connections
   */
  async cleanup(): Promise<void> {
    // OpenAI SDK doesn't expose a close() method, but we can help GC by clearing reference
    // This allows the underlying HTTP agent to be garbage collected
    ;(this.client as any) = null
  }
}
