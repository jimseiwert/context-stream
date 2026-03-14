// Text Chunker
// Token-based chunking with overlap using a ~4 chars/token approximation

export interface ChunkOptions {
  chunkSize?: number; // in tokens (default: 512)
  overlap?: number;   // in tokens (default: 64)
}

const CHARS_PER_TOKEN = 4;
const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_OVERLAP = 64;

/**
 * Estimates token count for a string using ~4 chars per token approximation.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Splits text into overlapping chunks based on estimated token count.
 * Attempts to split at sentence or word boundaries where possible.
 *
 * @param text - The input text to chunk
 * @param options - Chunking configuration
 * @returns Array of text chunks
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunkSizeChars = chunkSize * CHARS_PER_TOKEN;
  const overlapChars = overlap * CHARS_PER_TOKEN;
  const stepChars = chunkSizeChars - overlapChars;

  if (stepChars <= 0) {
    throw new Error("Overlap must be smaller than chunkSize");
  }

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // If text fits in a single chunk, return it as-is
  if (normalized.length <= chunkSizeChars) {
    return [normalized.trim()].filter((c) => c.length > 0);
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = start + chunkSizeChars;

    if (end >= normalized.length) {
      // Last chunk: take the rest
      const chunk = normalized.slice(start).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      break;
    }

    // Try to break at a sentence boundary (. ! ?) within last 20% of the chunk
    const searchStart = Math.max(start, end - Math.floor(chunkSizeChars * 0.2));
    const sentenceMatch = findLastSentenceBoundary(normalized, searchStart, end);

    if (sentenceMatch !== -1) {
      end = sentenceMatch + 1;
    } else {
      // Fall back to word boundary
      const wordMatch = findLastWordBoundary(normalized, searchStart, end);
      if (wordMatch !== -1) {
        end = wordMatch + 1;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlapChars;
    if (start < 0) start = 0;
  }

  return chunks;
}

function findLastSentenceBoundary(text: string, from: number, to: number): number {
  for (let i = to; i >= from; i--) {
    const char = text[i];
    if (char === "." || char === "!" || char === "?") {
      // Make sure there's a space or newline after
      const next = text[i + 1];
      if (next === " " || next === "\n" || next === undefined) {
        return i;
      }
    }
  }
  return -1;
}

function findLastWordBoundary(text: string, from: number, to: number): number {
  for (let i = to; i >= from; i--) {
    if (text[i] === " " || text[i] === "\n") {
      return i;
    }
  }
  return -1;
}
