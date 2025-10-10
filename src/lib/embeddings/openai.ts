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
    // Split text into chunks
    const chunks = chunkText(text, {
      maxTokens: 512,
      overlap: 50,
    })

    if (chunks.length === 0) return []

    // Generate embeddings for all chunks
    const contents = chunks.map((c) => c.content)
    const embeddings = await this.generateEmbeddings(contents)

    // Combine chunks with embeddings
    return chunks.map((chunk, index) => ({
      content: chunk.content,
      embedding: embeddings[index],
      metadata: chunk.metadata,
    }))
  }
}
