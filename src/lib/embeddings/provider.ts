// Embedding Provider Interface
// Abstract interface for embedding generation

import { getActiveEmbeddingConfig } from './config'
import { OpenAIEmbeddingProvider } from './openai'
import { AzureOpenAIEmbeddingProvider } from './azure'
import { VertexAIEmbeddingProvider } from './vertex'

export interface EmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<number[][]>
  chunkAndEmbed(text: string): Promise<ChunkWithEmbedding[]>
  cleanup(): Promise<void>
}

export interface ChunkWithEmbedding {
  content: string
  embedding: number[]
  metadata?: Record<string, any>
}

/**
 * Get configured embedding provider
 * Loads the active provider from database configuration
 */
export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  const config = await getActiveEmbeddingConfig()

  switch (config.provider) {
    case 'OPENAI':
      return new OpenAIEmbeddingProvider(config)

    case 'AZURE_OPENAI':
      return new AzureOpenAIEmbeddingProvider(config)

    case 'VERTEX_AI':
      return new VertexAIEmbeddingProvider(config)

    default:
      throw new Error(`Unsupported embedding provider: ${config.provider}`)
  }
}

/**
 * Generate embedding for a single text
 * This is a convenience wrapper around generateEmbeddings for single text inputs
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = await getEmbeddingProvider()
  const embeddings = await provider.generateEmbeddings([text])
  return embeddings[0]
}
