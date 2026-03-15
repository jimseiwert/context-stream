// Embedding Provider Interface and factory
// Abstract interface for embedding generation

import { getActiveEmbeddingConfig } from './config'
import { OpenAIEmbeddingProvider } from './openai'
import { AzureOpenAIEmbeddingProvider } from './azure'
import { VertexAIEmbeddingProvider } from './vertex'

export interface EmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<number[][]>
  chunkAndEmbed(text: string): Promise<ChunkWithEmbedding[]>
}

export interface ChunkWithEmbedding {
  content: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

/**
 * Get configured embedding provider.
 *
 * Throws if the active config is a RAG engine — callers should check
 * `config.isRagEngine` before calling this when generation is optional.
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

    case 'VERTEX_AI_RAG_ENGINE':
      throw new Error(
        'Vertex AI RAG Engine handles embeddings internally. ' +
          'Do not call getEmbeddingProvider() when isRagEngine is true.'
      )

    default:
      throw new Error(`Unsupported embedding provider: ${config.provider}`)
  }
}
