import type { EmbeddingProviderDescriptor } from '../types'
import { openAIEmbeddingProvider } from './openai'
import { azureOpenAIEmbeddingProvider } from './azure-openai'
import { vertexAIEmbeddingProvider } from './vertex-ai'

export const embeddingProviders: Record<string, EmbeddingProviderDescriptor<unknown>> = {
  openai: openAIEmbeddingProvider as EmbeddingProviderDescriptor<unknown>,
  azure_openai: azureOpenAIEmbeddingProvider as EmbeddingProviderDescriptor<unknown>,
  vertex_ai: vertexAIEmbeddingProvider as EmbeddingProviderDescriptor<unknown>,
}
