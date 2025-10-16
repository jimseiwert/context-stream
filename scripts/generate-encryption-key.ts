#!/usr/bin/env node

/**
 * Generate a secure encryption key for API key encryption
 *
 * Usage: npm run generate-encryption-key
 *
 * This will generate a 256-bit (32-byte) encryption key encoded as base64.
 * Add the generated key to your .env file as ENCRYPTION_KEY.
 */

import { generateEncryptionKey } from '../src/lib/utils/encryption'

function main() {
  console.log('Generating 256-bit encryption key...\n')

  const key = generateEncryptionKey()

  console.log('✓ Encryption key generated successfully!\n')
  console.log('Add this to your environment variables (.env file):\n')
  console.log(`ENCRYPTION_KEY=${key}\n`)
  console.log('⚠️  IMPORTANT: Keep this key secure and never commit it to version control!')
  console.log('⚠️  If you lose this key, you will not be able to decrypt existing API keys.')
  console.log('⚠️  For production, use your hosting provider\'s encrypted environment variables feature.\n')
}

main()
