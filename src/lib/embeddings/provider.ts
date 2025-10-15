// Embedding Provider Interface
// Abstract interface for embedding generation

export interface EmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<number[][]>
  chunkAndEmbed(text: string): Promise<ChunkWithEmbedding[]>
}

export interface ChunkWithEmbedding {
  content: string
  embedding: number[]
  metadata?: Record<string, any>
}

/**
 * Get configured embedding provider
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER || 'openai'

  if (provider === 'openai') {
    const { OpenAIEmbeddingProvider } = require('./openai')
    return new OpenAIEmbeddingProvider()
  }

  // Default to OpenAI
  const { OpenAIEmbeddingProvider } = require('./openai')
  return new OpenAIEmbeddingProvider()
}
