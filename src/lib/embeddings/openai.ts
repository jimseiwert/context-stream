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
    const cc = config.connectionConfig as {
      apiKey?: string
      model?: string
      dimensions?: number
    }
    if (!cc.apiKey) {
      throw new Error('OpenAI requires an API key in connectionConfig.apiKey')
    }
    if (!cc.model) {
      throw new Error('OpenAI requires connectionConfig.model')
    }

    this.client = new OpenAI({ apiKey: cc.apiKey })
    this.model = cc.model
    this.dimensions = cc.dimensions ?? 1536
  }

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

  async chunkAndEmbed(text: string): Promise<ChunkWithEmbedding[]> {
    const chunks = chunkText(text, { chunkSize: 400, overlap: 50 })
    if (chunks.length === 0) return []

    const allEmbeddings: number[][] = []

    for (const chunk of chunks) {
      const MAX_CHARS = 3000
      const content = chunk.length > MAX_CHARS ? chunk.substring(0, MAX_CHARS) : chunk
      if (content.length < chunk.length) {
        console.log(`[Embeddings] Chunk truncated from ${chunk.length} to ${MAX_CHARS} chars`)
      }
      const embeddings = await this.generateEmbeddings([content])
      allEmbeddings.push(...embeddings)
    }

    return chunks.map((chunk, index) => ({
      content: chunk,
      embedding: allEmbeddings[index],
    }))
  }
}
