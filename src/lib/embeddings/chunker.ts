// Text Chunker
// Splits text into chunks for embedding generation

export interface ChunkConfig {
  maxTokens: number
  overlap: number
}

// Hard maximum chunk size in characters (stay well under API limits)
// 2800 chars ≈ 700 tokens, safe for most embedding APIs (usually 8192 token limit)
const HARD_MAX_CHARS = 2800

export interface Chunk {
  content: string
  startIndex: number
  metadata?: Record<string, any>
}

/**
 * Chunk text into smaller pieces
 * Uses a simple token approximation (1 token ≈ 4 characters)
 * Enforces a hard maximum chunk size to prevent truncation
 */
export function chunkText(text: string, config: ChunkConfig): Chunk[] {
  const { maxTokens, overlap } = config
  const maxChars = Math.min(maxTokens * 4, HARD_MAX_CHARS) // Use smaller of config or hard limit
  const overlapChars = Math.min(overlap * 4, Math.floor(maxChars / 4)) // Ensure overlap isn't too large

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

    // If the paragraph itself is too large, split it with sliding window
    if (paragraph.length > maxChars) {
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          startIndex: currentStart,
        })
        currentChunk = ''
      }

      // Split the large paragraph into multiple chunks
      const paragraphStart = text.indexOf(paragraph, currentStart)
      const paragraphChunks = slidingWindowChunk(paragraph, maxChars, overlapChars)

      // Add all chunks from this paragraph
      paragraphChunks.forEach((chunk) => {
        chunks.push({
          content: chunk.content,
          startIndex: paragraphStart + chunk.startIndex,
        })
      })

      // Reset for next paragraph
      currentStart = paragraphStart + paragraph.length
      continue
    }

    // If adding this paragraph would exceed max length
    if (currentChunk.length + paragraph.length + 2 > maxChars) { // +2 for \n\n
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          startIndex: currentStart,
        })
      }

      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlapChars)
      currentChunk = overlapText + (overlapText ? '\n\n' : '') + paragraph
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

    // If we've reached the end, break
    if (end >= text.length) break

    // Move start position with overlap
    const nextStart = end - overlapChars
    // Ensure we always make progress
    start = nextStart > start ? nextStart : end
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
