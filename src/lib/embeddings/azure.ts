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
    if (!config.apiEndpoint) {
      throw new Error('Azure OpenAI requires an API endpoint')
    }

    if (!config.deploymentName) {
      throw new Error('Azure OpenAI requires a deployment name')
    }

    // Azure OpenAI uses a different base URL structure
    // Format: https://{resourceName}.openai.azure.com/openai/deployments/{deploymentName}
    const baseURL = `${config.apiEndpoint}/openai/deployments/${config.deploymentName}`

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL,
      defaultQuery: { 'api-version': '2024-06-01' },
      defaultHeaders: { 'api-key': config.apiKey },
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
        model: this.model, // Azure uses model name from deployment
        input: texts,
        dimensions: this.dimensions,
      })

      return response.data.map((item) => item.embedding)
    } catch (error) {
      console.error('Failed to generate Azure OpenAI embeddings:', error)
      throw new Error(`Azure OpenAI embedding generation failed: ${error}`)
    }
  }

  /**
   * Chunk text and generate embeddings for each chunk
   */
  async chunkAndEmbed(text: string): Promise<ChunkWithEmbedding[]> {
    // Split text into chunks with conservative limits
    const chunks = chunkText(text, {
      maxTokens: 400,
      overlap: 50,
    })

    if (chunks.length === 0) return []

    // Process one chunk at a time to avoid token limit errors
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
}
