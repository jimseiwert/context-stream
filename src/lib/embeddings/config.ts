import { db } from '@/lib/db'
import { embeddingProviderConfigs, sharedCredentials } from '@/lib/db/schema'
import { decryptApiKey } from '@/lib/utils/encryption'
import type { EmbeddingProvider } from '@/lib/db/schema/enums'
import { eq } from 'drizzle-orm'

/**
 * Decrypted embedding provider configuration.
 *
 * connectionConfig holds provider-specific fields after decryption:
 *
 *   OPENAI              → { apiKey: string }
 *   AZURE_OPENAI        → { apiKey: string, endpoint: string, deploymentName: string }
 *   VERTEX_AI           → { projectId: string, location: string,
 *                           accessToken?: string, serviceAccountJson?: object }
 *   VERTEX_AI_RAG_ENGINE→ { projectId: string, location: string,
 *                           ragCorpusName: string, serviceAccountJson?: object }
 *
 * When a sharedCredential is referenced its credentialData is decrypted and
 * merged into connectionConfig — so callers always read from one place.
 */
export interface EmbeddingConfig {
  id: string
  provider: EmbeddingProvider
  name: string
  model: string
  dimensions: number
  connectionConfig: Record<string, unknown>
  sharedCredentialId: string | null
  isRagEngine: boolean
  useBatchForNew: boolean
  useBatchForRescrape: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decryptJson(encrypted: string, label: string): Record<string, unknown> {
  try {
    return JSON.parse(decryptApiKey(encrypted)) as Record<string, unknown>
  } catch {
    throw new Error(
      `Failed to decrypt ${label}. ` +
        'The ENCRYPTION_KEY may have changed or the data may be corrupted.'
    )
  }
}

async function mergeSharedCredential(
  baseConfig: Record<string, unknown>,
  sharedCredentialId: string | null
): Promise<Record<string, unknown>> {
  if (!sharedCredentialId) return baseConfig

  const cred = await db.query.sharedCredentials.findFirst({
    where: eq(sharedCredentials.id, sharedCredentialId),
  })

  if (!cred) return baseConfig

  const credData = decryptJson(cred.credentialData, `shared credential (${cred.name})`)

  // Shared credential fields (key, json, connectionString, tenantId, etc.) take
  // precedence over any inline values in connectionConfig.
  return { ...baseConfig, ...credData }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the active embedding provider configuration (with decrypted credentials).
 * Throws if no active configuration is found.
 */
export async function getActiveEmbeddingConfig(): Promise<EmbeddingConfig> {
  const config = await db.query.embeddingProviderConfigs.findFirst({
    where: eq(embeddingProviderConfigs.isActive, true),
  })

  if (!config) {
    throw new Error(
      'No active embedding provider configured. ' +
        'Super admin must configure an embedding provider at /admin/system-settings'
    )
  }

  let connectionConfig = decryptJson(config.connectionConfig, `provider ${config.provider}`)
  connectionConfig = await mergeSharedCredential(connectionConfig, config.sharedCredentialId)

  return {
    id: config.id,
    provider: config.provider,
    name: config.name,
    model: config.model,
    dimensions: config.dimensions,
    connectionConfig,
    sharedCredentialId: config.sharedCredentialId,
    isRagEngine: config.isRagEngine,
    useBatchForNew: config.useBatchForNew,
    useBatchForRescrape: config.useBatchForRescrape,
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  }
}

/**
 * Get all embedding provider configurations.
 * connectionConfig is NOT decrypted (for listing purposes).
 */
export async function getAllEmbeddingConfigs() {
  return db.query.embeddingProviderConfigs.findMany({
    orderBy: (t, { desc }) => [desc(t.isActive), desc(t.createdAt)],
  })
}

/**
 * Get a specific embedding provider configuration by ID (with decrypted credentials).
 */
export async function getEmbeddingConfigById(
  id: string
): Promise<EmbeddingConfig | null> {
  const config = await db.query.embeddingProviderConfigs.findFirst({
    where: eq(embeddingProviderConfigs.id, id),
  })

  if (!config) return null

  let connectionConfig = decryptJson(config.connectionConfig, `provider ${config.provider}`)
  connectionConfig = await mergeSharedCredential(connectionConfig, config.sharedCredentialId)

  return {
    id: config.id,
    provider: config.provider,
    name: config.name,
    model: config.model,
    dimensions: config.dimensions,
    connectionConfig,
    sharedCredentialId: config.sharedCredentialId,
    isRagEngine: config.isRagEngine,
    useBatchForNew: config.useBatchForNew,
    useBatchForRescrape: config.useBatchForRescrape,
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
