/**
 * Reranking Algorithm
 * Multi-signal reranking to improve search result quality beyond basic similarity
 */

import { ParsedQuery } from './query-parser'
import { prisma } from '@/lib/db'

export interface RerankableResult {
  pageId: string
  title: string
  url: string
  content: string
  source: {
    id: string
    name: string
    domain: string
    tags?: string[]
  }
  scores: {
    combined: number
    [key: string]: number
  }
}

export interface RerankedResult extends RerankableResult {
  scores: {
    combined: number
    reranked: number
    text?: number
    vector?: number
  }
  signals: RerankingSignals
}

export interface RerankingSignals {
  frameworkMatch: number
  proximityMatch: number
  titleMatch: number
  codeQuality: number
  recency: number
  userFeedback: number
}

const SIGNAL_WEIGHTS = {
  frameworkMatch: 1.5,
  proximityMatch: 1.3,
  titleMatch: 1.2,
  codeQuality: 1.1,
  recency: 1.1,
  userFeedback: 1.2,
}

/**
 * Rerank search results using multiple quality signals
 */
export async function rerank(
  results: RerankableResult[],
  parsed: ParsedQuery
): Promise<RerankedResult[]> {
  if (results.length === 0) {
    return []
  }

  // Calculate signals for all results
  const reranked = await Promise.all(
    results.map(async (result) => {
      const signals = await calculateSignals(result, parsed)
      const multiplier = calculateMultiplier(signals)

      return {
        ...result,
        scores: {
          ...result.scores,
          reranked: result.scores.combined * multiplier,
        },
        signals,
      }
    })
  )

  // Sort by reranked score
  reranked.sort((a, b) => b.scores.reranked - a.scores.reranked)

  return reranked
}

/**
 * Calculate all reranking signals for a result
 */
async function calculateSignals(
  result: RerankableResult,
  parsed: ParsedQuery
): Promise<RerankingSignals> {
  const contentLower = result.content.toLowerCase()
  const titleLower = result.title.toLowerCase()

  // 1. Framework match signal
  const frameworkMatch = calculateFrameworkMatch(result, parsed)

  // 2. Proximity match signal
  const proximityMatch = calculateProximityMatch(contentLower, parsed)

  // 3. Title match signal
  const titleMatch = calculateTitleMatch(titleLower, parsed)

  // 4. Code quality signal
  const codeQuality = calculateCodeQuality(result.content, contentLower)

  // 5. Recency signal
  const recency = await calculateRecency(result.pageId)

  // 6. User feedback signal
  const userFeedback = await calculateUserFeedback(result.pageId)

  return {
    frameworkMatch,
    proximityMatch,
    titleMatch,
    codeQuality,
    recency,
    userFeedback,
  }
}

/**
 * Check if result matches detected frameworks
 */
function calculateFrameworkMatch(
  result: RerankableResult,
  parsed: ParsedQuery
): number {
  if (parsed.frameworks.length === 0) {
    return 1.0 // No framework specified, no boost
  }

  // Check if source domain matches any framework domain
  const domainMatch = parsed.frameworks.some((fw) =>
    fw.domains.some((domain) => result.source.domain.includes(domain))
  )

  if (domainMatch) {
    return SIGNAL_WEIGHTS.frameworkMatch
  }

  // Check if source tags match framework
  const frameworkTags = parsed.frameworks.map((f) => `framework:${f.name}`)
  const tagMatch =
    result.source.tags &&
    result.source.tags.some((tag) => frameworkTags.includes(tag))

  if (tagMatch) {
    return SIGNAL_WEIGHTS.frameworkMatch
  }

  return 1.0
}

/**
 * Check if search terms appear close to each other (proximity)
 */
function calculateProximityMatch(
  contentLower: string,
  parsed: ParsedQuery
): number {
  if (parsed.requiredTerms.length < 2) {
    return 1.0 // Need at least 2 terms for proximity
  }

  // Check if any pair of terms appears within 100 characters
  for (let i = 0; i < parsed.requiredTerms.length - 1; i++) {
    for (let j = i + 1; j < parsed.requiredTerms.length; j++) {
      const term1 = parsed.requiredTerms[i]
      const term2 = parsed.requiredTerms[j]

      const regex = new RegExp(
        `${term1}.{0,100}${term2}|${term2}.{0,100}${term1}`,
        'i'
      )

      if (regex.test(contentLower)) {
        return SIGNAL_WEIGHTS.proximityMatch
      }
    }
  }

  return 1.0
}

/**
 * Check if all important terms appear in the title
 */
function calculateTitleMatch(titleLower: string, parsed: ParsedQuery): number {
  if (parsed.requiredTerms.length === 0) {
    return 1.0
  }

  const allTermsInTitle = parsed.requiredTerms.every((term) =>
    titleLower.includes(term)
  )

  if (allTermsInTitle) {
    return SIGNAL_WEIGHTS.titleMatch
  }

  // Partial match: at least half the terms in title
  const matchCount = parsed.requiredTerms.filter((term) =>
    titleLower.includes(term)
  ).length

  if (matchCount >= parsed.requiredTerms.length / 2) {
    return 1.1 // Small boost for partial match
  }

  return 1.0
}

/**
 * Assess content quality based on code presence and formatting
 */
function calculateCodeQuality(content: string, contentLower: string): number {
  let score = 1.0

  // Check for code blocks
  const hasCodeBlocks =
    /```[\s\S]*?```/.test(content) ||
    /<code[\s\S]*?<\/code>/.test(content) ||
    /<pre[\s\S]*?<\/pre>/.test(content)

  if (hasCodeBlocks) {
    score *= 1.05
  }

  // Check for examples/demos
  const hasExamples = /example|sample|demo|tutorial/i.test(contentLower)

  if (hasExamples) {
    score *= 1.03
  }

  // Combine for full boost if both present
  if (hasCodeBlocks && hasExamples) {
    return SIGNAL_WEIGHTS.codeQuality
  }

  return score
}

/**
 * Calculate recency signal based on when page was last indexed
 */
async function calculateRecency(pageId: string): Promise<number> {
  try {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { indexedAt: true },
    })

    if (!page || !page.indexedAt) {
      return 1.0
    }

    // Pages indexed in last 30 days get a boost
    const daysSinceIndexed =
      (Date.now() - page.indexedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceIndexed < 30) {
      return SIGNAL_WEIGHTS.recency
    }

    // Gradual decay for older content
    if (daysSinceIndexed < 90) {
      return 1.05
    }

    return 1.0
  } catch (error) {
    console.error('[Recency] Error:', error)
    return 1.0
  }
}

/**
 * Calculate user feedback signal based on click-through rate
 */
async function calculateUserFeedback(pageId: string): Promise<number> {
  try {
    // Get query logs where this page appeared in results
    const logs = await prisma.queryLog.findMany({
      where: {
        topPageIds: {
          has: pageId,
        },
        queriedAt: {
          // Only look at last 30 days
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        topPageIds: true,
      },
    })

    if (logs.length === 0) {
      return 1.0 // No data, neutral score
    }

    // Calculate position in results (lower is better)
    let totalPosition = 0
    let count = 0

    for (const log of logs) {
      const position = log.topPageIds.indexOf(pageId)
      if (position !== -1) {
        totalPosition += position
        count++
      }
    }

    if (count === 0) {
      return 1.0
    }

    const avgPosition = totalPosition / count

    // Pages that appear in top positions more often get boosted
    if (avgPosition < 3) {
      return SIGNAL_WEIGHTS.userFeedback
    } else if (avgPosition < 5) {
      return 1.1
    }

    return 1.0
  } catch (error) {
    console.error('[UserFeedback] Error:', error)
    return 1.0
  }
}

/**
 * Calculate final multiplier from all signals
 */
function calculateMultiplier(signals: RerankingSignals): number {
  return Object.values(signals).reduce((acc, signal) => acc * signal, 1.0)
}

/**
 * Get a human-readable explanation of why a result was ranked
 */
export function explainRanking(signals: RerankingSignals): string[] {
  const explanations: string[] = []

  if (signals.frameworkMatch > 1.0) {
    explanations.push('Matches framework')
  }

  if (signals.proximityMatch > 1.0) {
    explanations.push('Terms appear together')
  }

  if (signals.titleMatch > 1.0) {
    explanations.push('All terms in title')
  }

  if (signals.codeQuality > 1.0) {
    explanations.push('Contains code examples')
  }

  if (signals.recency > 1.0) {
    explanations.push('Recently indexed')
  }

  if (signals.userFeedback > 1.0) {
    explanations.push('Popular result')
  }

  return explanations
}
