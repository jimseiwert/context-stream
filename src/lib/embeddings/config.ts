import { db } from '@/lib/db'
import { vectorStoreConfigs, sharedCredentials } from '@/lib/db/schema'
import { decryptApiKey } from '@/lib/utils/encryption'
import { eq } from 'drizzle-orm'

/**
 * Decrypted embedding configuration, sourced from the active vectorStoreConfig.
 *
 * connectionConfig holds provider-specific fields after decryption:
 *
 *   openai       → { apiKey: string }
 *   azure_openai → { apiKey: string, endpoint: string, deploymentName: string }
 *   vertex_ai    → { projectId: string, location: string,
 *                    accessToken?: string, serviceAccountJson?: object }
 *
 * When an embeddingCredentialId is referenced its credentialData is decrypted
 * and merged into connectionConfig — so callers always read from one place.
 */
export interface EmbeddingConfig {
  id: string
  /** Plain-text provider identifier, e.g. 'openai', 'azure_openai', 'vertex_ai' */
  provider: string
  name: string
  connectionConfig: Record<string, unknown>
  embeddingCredentialId: string | null
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

  // Shared credential fields take precedence over any inline values in connectionConfig.
  return { ...baseConfig, ...credData }
}

function rowToEmbeddingConfig(
  row: typeof vectorStoreConfigs.$inferSelect
): Omit<EmbeddingConfig, 'connectionConfig'> & { _encryptedConfig: string } {
  return {
    id: row.id,
    provider: row.embeddingProvider,
    name: row.name,
    _encryptedConfig: row.embeddingConfig,
    embeddingCredentialId: row.embeddingCredentialId ?? null,
    useBatchForNew: row.useBatchForNew,
    useBatchForRescrape: row.useBatchForRescrape,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function buildEmbeddingConfig(
  row: typeof vectorStoreConfigs.$inferSelect
): Promise<EmbeddingConfig> {
  const partial = rowToEmbeddingConfig(row)
  let connectionConfig = decryptJson(
    partial._encryptedConfig,
    `embedding provider ${partial.provider} (vector store ${partial.id})`
  )
  connectionConfig = await mergeSharedCredential(
    connectionConfig,
    partial.embeddingCredentialId
  )
  const { _encryptedConfig: _, ...rest } = partial
  return { ...rest, connectionConfig }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the active embedding provider configuration (with decrypted credentials).
 * If specificId is provided, loads that vector store config directly.
 * Otherwise falls back to the globally active one.
 * Throws if neither is configured.
 */
export async function getActiveEmbeddingConfig(specificId?: string | null): Promise<EmbeddingConfig> {
  const config = specificId
    ? await db.query.vectorStoreConfigs.findFirst({
        where: eq(vectorStoreConfigs.id, specificId),
      })
    : await db.query.vectorStoreConfigs.findFirst({
        where: eq(vectorStoreConfigs.isActive, true),
      })

  if (!config) {
    throw new Error(
      'No active vector store configured. ' +
        'Super admin must configure a vector store at /admin/system-settings'
    )
  }

  return buildEmbeddingConfig(config)
}

/**
 * Get all vector store configurations (embedding fields only, config NOT decrypted).
 * For listing purposes — secrets are excluded.
 */
export async function getAllEmbeddingConfigs() {
  return db.query.vectorStoreConfigs.findMany({
    columns: {
      id: true,
      name: true,
      embeddingProvider: true,
      embeddingCredentialId: true,
      useBatchForNew: true,
      useBatchForRescrape: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: (t, { desc }) => [desc(t.isActive), desc(t.createdAt)],
  })
}

/**
 * Get a specific vector store configuration's embedding config by ID
 * (with decrypted credentials).
 */
export async function getEmbeddingConfigById(
  id: string
): Promise<EmbeddingConfig | null> {
  const config = await db.query.vectorStoreConfigs.findFirst({
    where: eq(vectorStoreConfigs.id, id),
  })

  if (!config) return null

  return buildEmbeddingConfig(config)
}

/**
 * Validate encryption key is set on startup.
 */
export function validateEncryptionKey(): void {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
        'Generate one using: npm run generate-encryption-key'
    )
  }
}
