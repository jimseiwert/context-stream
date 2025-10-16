// Google Vertex AI Embedding Provider
// Uses Vertex AI for generating embeddings

import type { EmbeddingConfig } from './config'
import { EmbeddingProvider, ChunkWithEmbedding } from './provider'
import { chunkText } from './chunker'

export class VertexAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string
  private projectId: string
  private location: string
  private model: string
  private dimensions: number

  constructor(config: EmbeddingConfig) {
    this.apiKey = config.apiKey
    this.model = config.model

    // Extract project ID and location from additionalConfig
    if (!config.additionalConfig?.projectId) {
      throw new Error('Vertex AI requires a project ID in additionalConfig')
    }

    if (!config.additionalConfig?.location) {
      throw new Error('Vertex AI requires a location in additionalConfig')
    }

    this.projectId = config.additionalConfig.projectId
    this.location = config.additionalConfig.location
    this.dimensions = config.dimensions
  }

  /**
   * Get the Vertex AI API endpoint
   */
  private getEndpoint(): string {
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}:predict`
  }

  /**
   * Generate embeddings for an array of texts using Vertex AI
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    try {
      // Vertex AI can handle up to 250 inputs per request
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: texts.map((text) => ({
            content: text,
          })),
          parameters: {
            outputDimensionality: this.dimensions,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Vertex AI API error (${response.status}): ${errorText}`
        )
      }

      const data = await response.json()

      // Extract embeddings from predictions
      return data.predictions.map(
        (prediction: { embeddings: { values: number[] } }) =>
          prediction.embeddings.values
      )
    } catch (error) {
      console.error('Failed to generate Vertex AI embeddings:', error)
      throw new Error(`Vertex AI embedding generation failed: ${error}`)
    }
  }

  /**
   * Chunk text and generate embeddings for each chunk
   */
  async chunkAndEmbed(text: string): Promise<ChunkWithEmbedding[]> {
    // Split text into chunks with conservative limits
    // Vertex AI has a 2048 token limit per text
    const chunks = chunkText(text, {
      maxTokens: 400,
      overlap: 50,
    })

    if (chunks.length === 0) return []

    // Process one chunk at a time
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
