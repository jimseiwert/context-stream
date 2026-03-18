import type { RagEngineProviderDescriptor } from '../types'
import { vertexAIRagEngineProvider } from './vertex-ai-rag'

export const ragEngineProviders: Record<string, RagEngineProviderDescriptor<unknown>> = {
  vertex_ai_rag_engine: vertexAIRagEngineProvider as RagEngineProviderDescriptor<unknown>,
}
