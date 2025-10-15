// OpenAI Embedding Provider
// Uses OpenAI API for generating embeddings

import OpenAI from 'openai'
import { EmbeddingProvider, ChunkWithEmbedding } from './provider'
import { chunkText } from './chunker'

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  /**
   * Generate embeddings for an array of texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: 1536, // Match pgvector dimension
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
      // Hard character limit: ~3000 chars = ~750 tokens (conservative estimate)
      // This ensures we stay well under the 8192 token limit even with worst-case tokenization
      const MAX_CHARS = 3000
      let content = chunk.content

      if (content.length > MAX_CHARS) {
        // NOTE: This is expected behavior for large chunks, not an error
        console.log(`[Embeddings] Chunk truncated from ${content.length} to ${MAX_CHARS} chars (within API limits)`)
        content = content.substring(0, MAX_CHARS)
      }

      const embeddings = await this.generateEmbeddings([content])
      allEmbeddings.push(...embeddings)
    }

    // Combine chunks with embeddings
    return chunks.map((chunk, index) => ({
      content: chunk.content,
      embedding: allEmbeddings[index],
      metadata: chunk.metadata,
    }))
  }
}
