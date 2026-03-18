import type { ZodSchema } from 'zod'

export type FieldType = 'text' | 'password' | 'url' | 'textarea' | 'select' | 'file-json'

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  required: boolean
  placeholder?: string
  description?: string
  options?: { value: string; label: string }[]
}

export interface ProviderDescriptor<TConfig = unknown> {
  id: string
  displayName: string
  description: string
  docsUrl?: string
  fields: FieldDefinition[]
  schema: ZodSchema<TConfig>
  testConnection?: (config: TConfig) => Promise<void>
}

export type EmbeddingProviderDescriptor<TConfig = unknown> = ProviderDescriptor<TConfig>
export type VectorStoreProviderDescriptor<TConfig = unknown> = ProviderDescriptor<TConfig>
export type RagEngineProviderDescriptor<TConfig = unknown> = ProviderDescriptor<TConfig>
