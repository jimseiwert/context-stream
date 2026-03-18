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
 * Check `config.provider === 'vertex_ai_rag_engine'` before calling this when generation is optional.
 */
export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  const config = await getActiveEmbeddingConfig()

  switch (config.provider) {
    case 'openai':
      return new OpenAIEmbeddingProvider(config)

    case 'azure_openai':
      return new AzureOpenAIEmbeddingProvider(config)

    case 'vertex_ai':
      return new VertexAIEmbeddingProvider(config)

    case 'vertex_ai_rag_engine':
      throw new Error(
        'Vertex AI RAG Engine handles embeddings internally. ' +
          'Do not call getEmbeddingProvider() for a RAG engine config.'
      )

    default:
      throw new Error(`Unsupported embedding provider: ${config.provider}`)
  }
}
