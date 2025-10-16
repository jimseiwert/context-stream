import crypto from 'crypto'

/**
 * Encryption utilities for API keys and sensitive data
 * Uses AES-256-GCM with authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * Get the encryption key from environment variable
 * Required format: 32-byte base64 string
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate one using: npm run generate-encryption-key'
    )
  }

  try {
    const keyBuffer = Buffer.from(key, 'base64')

    if (keyBuffer.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (256 bits)')
    }

    return keyBuffer
  } catch (error) {
    throw new Error(
      'Invalid ENCRYPTION_KEY format. Must be a valid base64 string. ' +
      'Generate a new one using: npm run generate-encryption-key'
    )
  }
}

/**
 * Encrypt a plaintext string (e.g., API key)
 * Returns format: {iv}:{authTag}:{encryptedData}
 */
export function encryptApiKey(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string')
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Combine iv, authTag, and encrypted data
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt an encrypted string
 * Expects format: {iv}:{authTag}:{encryptedData}
 */
export function decryptApiKey(encrypted: string): string {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty string')
  }

  const parts = encrypted.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const key = getEncryptionKey()
  const iv = Buffer.from(parts[0], 'base64')
  const authTag = Buffer.from(parts[1], 'base64')
  const encryptedData = parts[2]

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Generate a new encryption key
 * Returns a 32-byte (256-bit) key encoded as base64
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64')
}

/**
 * Mask an API key for display purposes
 * Shows first 4 and last 4 characters, masks the rest
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '••••••••'
  }

  const first4 = apiKey.substring(0, 4)
  const last4 = apiKey.substring(apiKey.length - 4)
  const maskedMiddle = '•'.repeat(Math.min(apiKey.length - 8, 32))

  return `${first4}${maskedMiddle}${last4}`
}
