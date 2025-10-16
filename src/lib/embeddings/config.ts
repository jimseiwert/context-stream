import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/utils/encryption'
import type { EmbeddingProvider } from '@prisma/client'

/**
 * Embedding provider configuration with decrypted API key
 */
export interface EmbeddingConfig {
  id: string
  provider: EmbeddingProvider
  model: string
  dimensions: number
  apiKey: string // Decrypted
  apiEndpoint: string | null
  deploymentName: string | null
  useBatchForNew: boolean
  useBatchForRescrape: boolean
  additionalConfig: Record<string, any> | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Get the active embedding provider configuration
 * Throws an error if no active configuration is found
 */
export async function getActiveEmbeddingConfig(): Promise<EmbeddingConfig> {
  const config = await prisma.embeddingProviderConfig.findFirst({
    where: { isActive: true },
  })

  if (!config) {
    throw new Error(
      'No active embedding provider configured. ' +
        'Super admin must configure an embedding provider at /admin/system-settings'
    )
  }

  // Decrypt the API key
  let decryptedApiKey: string
  try {
    decryptedApiKey = decryptApiKey(config.apiKey)
  } catch (error) {
    throw new Error(
      `Failed to decrypt API key for provider ${config.provider}. ` +
        'The ENCRYPTION_KEY may have changed or the data may be corrupted.'
    )
  }

  return {
    id: config.id,
    provider: config.provider,
    model: config.model,
    dimensions: config.dimensions,
    apiKey: decryptedApiKey,
    apiEndpoint: config.apiEndpoint,
    deploymentName: config.deploymentName,
    useBatchForNew: config.useBatchForNew,
    useBatchForRescrape: config.useBatchForRescrape,
    additionalConfig: config.additionalConfig as Record<string, any> | null,
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  }
}

/**
 * Get all embedding provider configurations
 * API keys are NOT decrypted (for listing purposes)
 */
export async function getAllEmbeddingConfigs() {
  return prisma.embeddingProviderConfig.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  })
}

/**
 * Get a specific embedding provider configuration by ID
 * API key is decrypted
 */
export async function getEmbeddingConfigById(
  id: string
): Promise<EmbeddingConfig | null> {
  const config = await prisma.embeddingProviderConfig.findUnique({
    where: { id },
  })

  if (!config) {
    return null
  }

  let decryptedApiKey: string
  try {
    decryptedApiKey = decryptApiKey(config.apiKey)
  } catch (error) {
    throw new Error(
      `Failed to decrypt API key for provider ${config.provider}. ` +
        'The ENCRYPTION_KEY may have changed or the data may be corrupted.'
    )
  }

  return {
    id: config.id,
    provider: config.provider,
    model: config.model,
    dimensions: config.dimensions,
    apiKey: decryptedApiKey,
    apiEndpoint: config.apiEndpoint,
    deploymentName: config.deploymentName,
    useBatchForNew: config.useBatchForNew,
    useBatchForRescrape: config.useBatchForRescrape,
    additionalConfig: config.additionalConfig as Record<string, any> | null,
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  }
}

/**
 * Validate encryption key is set on startup
 */
export function validateEncryptionKey(): void {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
        'Generate one using: npm run generate-encryption-key'
    )
  }
}
