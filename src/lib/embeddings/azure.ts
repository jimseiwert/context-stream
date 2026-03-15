// Azure OpenAI Embedding Provider
// Uses Azure OpenAI Service for generating embeddings

import OpenAI from 'openai'
import type { EmbeddingConfig } from './config'
import { EmbeddingProvider, ChunkWithEmbedding } from './provider'
import { chunkText } from './chunker'

export class AzureOpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI
  private model: string
  private dimensions: number

  constructor(config: EmbeddingConfig) {
    const { apiKey, endpoint, deploymentName } = config.connectionConfig as {
      apiKey?: string
      endpoint?: string
      deploymentName?: string
    }

    if (!apiKey) {
      throw new Error('Azure OpenAI requires connectionConfig.apiKey')
    }
    if (!endpoint) {
      throw new Error('Azure OpenAI requires connectionConfig.endpoint')
    }
    if (!deploymentName) {
      throw new Error('Azure OpenAI requires connectionConfig.deploymentName')
    }

    // Format: https://{resourceName}.openai.azure.com/openai/deployments/{deploymentName}
    const baseURL = `${endpoint}/openai/deployments/${deploymentName}`

    this.client = new OpenAI({
      apiKey,
      baseURL,
      defaultQuery: { 'api-version': '2024-06-01' },
      defaultHeaders: { 'api-key': apiKey },
    })

    this.model = config.model
    this.dimensions = config.dimensions
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
      console.error('Failed to generate Azure OpenAI embeddings:', error)
      throw new Error(`Azure OpenAI embedding generation failed: ${error}`)
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
        console.log(`[Azure Embeddings] Chunk truncated from ${chunk.length} to ${MAX_CHARS} chars`)
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
