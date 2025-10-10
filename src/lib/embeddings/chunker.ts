// Text Chunker
// Splits text into chunks for embedding generation

export interface ChunkConfig {
  maxTokens: number
  overlap: number
}

export interface Chunk {
  content: string
  startIndex: number
  metadata?: Record<string, any>
}

/**
 * Chunk text into smaller pieces
 * Uses a simple token approximation (1 token ≈ 4 characters)
 */
export function chunkText(text: string, config: ChunkConfig): Chunk[] {
  const { maxTokens, overlap } = config
  const maxChars = maxTokens * 4 // Approximate characters per token
  const overlapChars = overlap * 4

  const chunks: Chunk[] = []

  // If text is short enough, return as single chunk
  if (text.length <= maxChars) {
    return [{ content: text, startIndex: 0 }]
  }

  // Split into paragraphs first
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)

  let currentChunk = ''
  let currentStart = 0

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i]

    // If adding this paragraph would exceed max length
    if (currentChunk.length + paragraph.length > maxChars) {
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          startIndex: currentStart,
        })
      }

      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlapChars)
      currentChunk = overlapText + paragraph
      currentStart = text.indexOf(paragraph, currentStart)
    } else {
      // Add paragraph to current chunk
      if (currentChunk) {
        currentChunk += '\n\n' + paragraph
      } else {
        currentChunk = paragraph
        currentStart = text.indexOf(paragraph)
      }
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      startIndex: currentStart,
    })
  }

  // If no chunks were created, fall back to sliding window
  if (chunks.length === 0) {
    return slidingWindowChunk(text, maxChars, overlapChars)
  }

  return chunks
}

/**
 * Fallback chunking using sliding window
 */
function slidingWindowChunk(
  text: string,
  maxChars: number,
  overlapChars: number
): Chunk[] {
  const chunks: Chunk[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    const content = text.slice(start, end)

    chunks.push({
      content,
      startIndex: start,
    })

    // Move start position with overlap
    start = end - overlapChars
    if (start <= 0) start = end
  }

  return chunks
}

/**
 * Estimate token count for text
 * Uses rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
