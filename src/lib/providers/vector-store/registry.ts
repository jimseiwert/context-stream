import type { VectorStoreProviderDescriptor } from '../types'
import { pgvectorProvider } from './pgvector'
import { qdrantProvider } from './qdrant'
import { pineconeProvider } from './pinecone'
import { weaviateProvider } from './weaviate'
import { vertexAIVectorSearchProvider } from './vertex-ai-vector-search'

export const vectorStoreProviders: Record<string, VectorStoreProviderDescriptor<unknown>> = {
  pgvector: pgvectorProvider as VectorStoreProviderDescriptor<unknown>,
  qdrant: qdrantProvider as VectorStoreProviderDescriptor<unknown>,
  pinecone: pineconeProvider as VectorStoreProviderDescriptor<unknown>,
  weaviate: weaviateProvider as VectorStoreProviderDescriptor<unknown>,
  vertex_ai_vector_search: vertexAIVectorSearchProvider as VectorStoreProviderDescriptor<unknown>,
}
