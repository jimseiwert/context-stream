/**
 * Document Validation
 * Validates document files before processing
 */

/**
 * Validate file size and type before extraction
 */
export function validateDocument(
  buffer: Buffer,
  filename: string,
  maxSizeBytes: number = 50 * 1024 * 1024 // 50MB default
): { valid: boolean; error?: string } {
  // Check file size
  if (buffer.length > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${maxSizeBytes / 1024 / 1024}MB)`,
    }
  }

  // Check file extension
  const ext = filename.split('.').pop()?.toLowerCase()
  const supportedExts = [
    'txt',
    'md',
    'pdf',
    'docx',
    'csv',
    'xlsx',
    'xls',
    'html',
    'htm',
    'rtf',
    'odt',
  ]

  if (!ext || !supportedExts.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported types: ${supportedExts.join(', ')}`,
    }
  }

  return { valid: true }
}
