// API Key Authentication
// For MCP and other programmatic access

import { db } from '@/lib/db'
import { apiKeys } from '@/lib/db/schema'
import { createHash, randomBytes } from 'crypto'
import { UnauthorizedError } from '@/lib/utils/errors'
import { eq, desc } from 'drizzle-orm'

// Generate a new API key
export function generateApiKey(): string {
  const random = randomBytes(32).toString('hex')
  return `sk_live_${random}`
}

// Hash API key for storage
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

// Validate API key and return user ID
export async function validateApiKey(key: string): Promise<string> {
  if (!key) {
    throw new UnauthorizedError('API key required')
  }

  // Remove 'Bearer ' prefix if present
  const cleanKey = key.replace(/^Bearer\s+/i, '')

  // Hash the key
  const hashedKey = hashApiKey(cleanKey)

  // Find API key in database
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.key, hashedKey),
    with: { user: true },
  })

  if (!apiKey) {
    throw new UnauthorizedError('Invalid API key')
  }

  // Check if key is expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new UnauthorizedError('API key expired')
  }

  // Update last used timestamp (async, don't await)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .catch((error: any) => {
      console.error('Failed to update API key last used:', error)
    })

  return apiKey.userId
}

// Get API key from request headers
export function getApiKeyFromHeaders(headers: Headers): string | null {
  // Check X-API-Key header
  const xApiKey = headers.get('x-api-key')
  if (xApiKey) return xApiKey

  // Check Authorization header
  const authorization = headers.get('authorization')
  if (authorization?.startsWith('Bearer sk_')) {
    return authorization.replace(/^Bearer\s+/i, '')
  }

  return null
}

// Create API key for user
export async function createApiKey(
  userId: string,
  name: string,
  expiresAt?: Date
): Promise<{ id: string; key: string }> {
  // Generate new key
  const key = generateApiKey()
  const hashedKey = hashApiKey(key)

  // Store in database
  const [apiKey] = await db
    .insert(apiKeys)
    .values({ name, key: hashedKey, userId, expiresAt })
    .returning()

  // Return ID and unhashed key (only time it's shown)
  return {
    id: apiKey.id,
    key, // Return original key, not hash
  }
}

// Revoke API key
export async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  // Verify ownership
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, keyId),
  })

  if (!apiKey || apiKey.userId !== userId) {
    throw new UnauthorizedError('API key not found')
  }

  // Delete key
  await db.delete(apiKeys).where(eq(apiKeys.id, keyId))
}

// List user's API keys
export async function listApiKeys(userId: string) {
  return await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt))
}
