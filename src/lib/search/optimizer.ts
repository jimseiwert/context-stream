/**
 * Result Optimizer
 * Optimizes search results for token efficiency while maintaining quality
 */

import { RerankedResult } from './reranker'
import { ParsedQuery, QueryIntent } from './query-parser'

export interface OptimizedResult {
  title: string
  url: string
  snippet: string
  source: string
  sourceUrl: string
  sourceId: string
  sourceScope: 'GLOBAL' | 'WORKSPACE'
  relevanceScore: number
  reasons?: string[]
  scoreBreakdown?: {
    textScore: number
    vectorScore: number
    baseScore: number
    rerankedScore: number
    signals: {
      frameworkMatch: number
      proximityMatch: number
      titleMatch: number
      codeQuality: number
      recency: number
      userFeedback: number
    }
    totalMultiplier: number
    normalizedScore: number
  }
}

export interface OptimizationConfig {
  maxTokens?: number
  maxResults?: number
  includeReasons?: boolean
  snippetLength?: 'short' | 'medium' | 'long'
}

const TOKEN_CONFIG = {
  maxTokens: 5000, // Target token budget
  avgCharsPerToken: 4, // Rough estimate
  snippetLengths: {
    short: 150,
    medium: 250,
    long: 400,
  },
}

/**
 * Optimize results for token efficiency
 */
export function optimizeResults(
  results: RerankedResult[],
  parsed: ParsedQuery,
  config: OptimizationConfig = {}
): OptimizedResult[] {
  const {
    maxTokens = TOKEN_CONFIG.maxTokens,
    maxResults = 10,
    includeReasons = false,
    snippetLength = 'medium',
  } = config

  // Determine snippet length based on intent
  const targetLength = getSnippetLength(parsed.intent, snippetLength)

  // Take top N results
  const topResults = results.slice(0, maxResults)

  // Calculate available chars based on token budget
  const maxChars = maxTokens * TOKEN_CONFIG.avgCharsPerToken

  // Calculate chars per result (accounting for metadata)
  const metadataCharsPerResult = 100 // Rough estimate for title, URL, etc.
  const availableCharsForSnippets =
    maxChars - topResults.length * metadataCharsPerResult
  const charsPerSnippet = Math.floor(
    Math.min(targetLength, availableCharsForSnippets / topResults.length)
  )

  // Normalize scores to 0-100 scale based on top score
  const topScore = topResults.length > 0 ? topResults[0].scores.reranked : 1
  const minScore = topResults.length > 0
    ? Math.min(...topResults.map(r => r.scores.reranked))
    : 0

  return topResults.map((result) => {
    // Generate optimized snippet
    const snippet = generateSnippet(
      result.content,
      parsed,
      charsPerSnippet
    )

    // Normalize score to 0-100 scale
    // Top result gets 100%, others scaled proportionally
    let normalizedScore = 0
    if (topScore > 0) {
      const range = topScore - minScore
      if (range > 0) {
        // Normal case: scale based on range
        normalizedScore = Math.round(((result.scores.reranked - minScore) / range) * 100)
      } else {
        // All scores are identical, give everyone 100%
        normalizedScore = 100
      }
    }
    // Clamp to 0-100 range to prevent any edge cases
    normalizedScore = Math.min(100, Math.max(0, normalizedScore))

    // Calculate total multiplier from all signals
    const totalMultiplier = result.signals
      ? Object.values(result.signals).reduce((acc, signal) => acc * signal, 1.0)
      : 1.0

    const optimized: OptimizedResult = {
      title: result.title,
      url: result.url,
      snippet,
      source: result.source.name,
      sourceUrl: `https://${result.source.domain}`,
      sourceId: result.source.id,
      sourceScope: result.source.scope,
      relevanceScore: normalizedScore,
      scoreBreakdown: {
        textScore: result.scores.text || 0,
        vectorScore: result.scores.vector || 0,
        baseScore: result.scores.combined,
        rerankedScore: result.scores.reranked,
        signals: result.signals || {
          frameworkMatch: 1.0,
          proximityMatch: 1.0,
          titleMatch: 1.0,
          codeQuality: 1.0,
          recency: 1.0,
          userFeedback: 1.0,
        },
        totalMultiplier,
        normalizedScore,
      },
    }

    // Optionally include ranking reasons
    if (includeReasons && result.signals) {
      optimized.reasons = getRankingReasons(result.signals)
    }

    return optimized
  })
}

/**
 * Determine appropriate snippet length based on query intent
 */
function getSnippetLength(
  intent: QueryIntent,
  requestedLength: 'short' | 'medium' | 'long'
): number {
  const lengths = TOKEN_CONFIG.snippetLengths

  // Override based on intent
  switch (intent) {
    case QueryIntent.CODE_EXAMPLE:
      return lengths.long // Code examples need more space
    case QueryIntent.CONCEPT:
      return lengths.medium // Concepts need explanations
    case QueryIntent.HOW_TO:
      return lengths.long // Instructions need detail
    case QueryIntent.TROUBLESHOOTING:
      return lengths.medium // Solutions need context
    default:
      return lengths[requestedLength]
  }
}

/**
 * Generate an optimized snippet from content
 */
function generateSnippet(
  content: string,
  parsed: ParsedQuery,
  maxLength: number
): string {
  // Try to find a section with all required terms
  const bestSection = findBestSection(content, parsed, maxLength)

  if (bestSection) {
    return bestSection
  }

  // Fallback: Try to find code block
  const codeBlock = extractCodeBlock(content, maxLength)
  if (codeBlock) {
    return codeBlock
  }

  // Last resort: Beginning of content
  return truncate(content, maxLength)
}

/**
 * Find the best section of content that contains search terms
 */
function findBestSection(
  content: string,
  parsed: ParsedQuery,
  maxLength: number
): string | null {
  const contentLower = content.toLowerCase()

  // Find positions of all required terms
  const termPositions = new Map<string, number[]>()

  for (const term of parsed.requiredTerms) {
    const positions: number[] = []
    let index = contentLower.indexOf(term)

    while (index !== -1) {
      positions.push(index)
      index = contentLower.indexOf(term, index + 1)
    }

    if (positions.length > 0) {
      termPositions.set(term, positions)
    }
  }

  if (termPositions.size === 0) {
    return null
  }

  // Find a window that contains the most terms
  let bestWindow = { start: 0, end: maxLength, termCount: 0 }

  for (let start = 0; start < content.length - maxLength; start += 50) {
    const end = start + maxLength
    const window = contentLower.slice(start, end)

    let termCount = 0
    for (const term of parsed.requiredTerms) {
      if (window.includes(term)) {
        termCount++
      }
    }

    if (termCount > bestWindow.termCount) {
      bestWindow = { start, end, termCount }
    }

    // If we found a window with all terms, stop searching
    if (termCount === parsed.requiredTerms.length) {
      break
    }
  }

  if (bestWindow.termCount === 0) {
    return null
  }

  // Extract and format the window
  const section = content.slice(bestWindow.start, bestWindow.end)
  const prefix = bestWindow.start > 0 ? '...' : ''
  const suffix = bestWindow.end < content.length ? '...' : ''

  return prefix + section.trim() + suffix
}

/**
 * Extract a code block if present
 */
function extractCodeBlock(content: string, maxLength: number): string | null {
  // Try to find markdown code block
  const markdownMatch = content.match(/```[\s\S]*?```/)
  if (markdownMatch) {
    const block = markdownMatch[0]
    if (block.length <= maxLength) {
      return block
    }
    return truncate(block, maxLength)
  }

  // Try to find HTML code block
  const htmlMatch = content.match(/<code[\s\S]*?<\/code>/)
  if (htmlMatch) {
    const block = htmlMatch[0]
    if (block.length <= maxLength) {
      return block
    }
    return truncate(block, maxLength)
  }

  return null
}

/**
 * Truncate text intelligently at sentence or word boundaries
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  const truncated = text.slice(0, maxLength)

  // Try to cut at sentence boundary
  const lastPeriod = truncated.lastIndexOf('.')
  if (lastPeriod > maxLength * 0.7) {
    return truncated.slice(0, lastPeriod + 1)
  }

  // Try to cut at word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + '...'
}

/**
 * Get human-readable ranking reasons
 */
function getRankingReasons(signals: {
  frameworkMatch: number
  proximityMatch: number
  titleMatch: number
  codeQuality: number
  recency: number
  userFeedback: number
}): string[] {
  const reasons: string[] = []

  if (signals.frameworkMatch > 1.0) {
    reasons.push('framework match')
  }
  if (signals.proximityMatch > 1.0) {
    reasons.push('terms near each other')
  }
  if (signals.titleMatch > 1.0) {
    reasons.push('all terms in title')
  }
  if (signals.codeQuality > 1.0) {
    reasons.push('has code examples')
  }
  if (signals.recency > 1.0) {
    reasons.push('recently updated')
  }
  if (signals.userFeedback > 1.0) {
    reasons.push('popular')
  }

  return reasons
}

/**
 * Estimate token count for a result
 */
export function estimateTokens(result: OptimizedResult): number {
  const text =
    result.title +
    ' ' +
    result.snippet +
    ' ' +
    result.source +
    ' ' +
    result.url

  return Math.ceil(text.length / TOKEN_CONFIG.avgCharsPerToken)
}

/**
 * Calculate total estimated tokens for all results
 */
export function estimateTotalTokens(results: OptimizedResult[]): number {
  return results.reduce((sum, result) => sum + estimateTokens(result), 0)
}

/**
 * Format results for MCP response
 */
export function formatForMCP(
  results: OptimizedResult[],
  query: string,
  sessionId?: string
): string {
  if (results.length === 0) {
    return 'No results found for your query.'
  }

  const lines: string[] = []

  // Add header with query info
  lines.push(`Found ${results.length} result${results.length > 1 ? 's' : ''}:\n`)

  // Format each result
  results.forEach((result, index) => {
    const reasons =
      result.reasons && result.reasons.length > 0
        ? ` (${result.reasons.join(', ')})`
        : ''

    lines.push(
      `${index + 1}. **${result.title}**${reasons}\n` +
        `   Source: ${result.source}\n` +
        `\n` +
        `   ${result.snippet}\n` +
        `\n` +
        `   _Reference: ${result.url}_\n`
    )
  })

  // Add session info if available
  if (sessionId) {
    lines.push(
      `\n💡 These results won't show again this session. Refine your search for more specific results.`
    )
  }

  return lines.join('\n')
}
