/**
 * Search API
 * POST /api/search - Search across indexed documentation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseQuery } from '@/lib/search/query-parser'
import { sessionManager } from '@/lib/search/session'
import { hybridSearch, getFilteredSources } from '@/lib/search/hybrid-search'
import { rerank } from '@/lib/search/reranker'
import { optimizeResults } from '@/lib/search/optimizer'
import { searchCache } from '@/lib/search/cache'
import { checkQuota, QuotaType } from '@/lib/subscriptions/quota-checker'
import { trackUsage } from '@/lib/subscriptions/usage-tracker'
import { checkRateLimit, formatRateLimitHeaders, createRateLimitError } from '@/lib/rate-limit'
import { UsageEventType } from '@prisma/client'
import { IS_SAAS_MODE } from '@/lib/config/features'

export const runtime = 'nodejs'

const SearchSchema = z.object({
  query: z.string().min(2).max(500),
  workspaceId: z.string().optional(),
  sessionId: z.string().optional(),
  filters: z
    .object({
      sourceIds: z.array(z.string()).optional(),
      dateRange: z
        .object({
          start: z.string(),
          end: z.string(),
        })
        .optional(),
    })
    .optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

/**
 * POST /api/search
 * Perform full-text search across indexed documentation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit (SaaS only)
    if (IS_SAAS_MODE) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: { apiRateLimit: true },
      })

      const rateLimit = await checkRateLimit({
        userId: session.user.id,
        limit: subscription?.apiRateLimit || 30,
        window: 60,
      })

      if (!rateLimit.success) {
        return NextResponse.json(
          createRateLimitError(rateLimit),
          {
            status: 429,
            headers: formatRateLimitHeaders(rateLimit),
          }
        )
      }
    }

    // Check search quota (SaaS only)
    if (IS_SAAS_MODE) {
      const quotaCheck = await checkQuota(session.user.id, QuotaType.SEARCH)
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Quota exceeded',
            message: quotaCheck.reason,
            usage: quotaCheck.usage,
            limit: quotaCheck.limit,
            upgradeUrl: '/pricing',
          },
          { status: 402 } // Payment Required
        )
      }
    }

    const body = await request.json()
    const data = SearchSchema.parse(body)

    // Get user's workspace if not specified
    let workspaceId = data.workspaceId
    if (!workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: session.user.id },
        orderBy: { createdAt: 'asc' },
      })
      if (workspace) {
        workspaceId = workspace.id
      }
    }

    // 1. Parse query for framework detection
    const parsed = parseQuery(data.query)

    // 2. Get or create session
    const searchSession = await sessionManager.getOrCreateSession(
      session.user.id,
      workspaceId || '',
      data.sessionId
    )

    // 3. Build where clause for sources accessible to user
    const sourceWhere: any = {}

    if (workspaceId) {
      sourceWhere.OR = [
        { scope: 'GLOBAL', status: 'ACTIVE' },
        {
          AND: [
            { scope: 'WORKSPACE', status: 'ACTIVE' },
            {
              workspaceSources: {
                some: { workspaceId },
              },
            },
          ],
        },
      ]
    } else {
      sourceWhere.scope = 'GLOBAL'
      sourceWhere.status = 'ACTIVE'
    }

    // Apply source filters if provided
    if (data.filters?.sourceIds && data.filters.sourceIds.length > 0) {
      sourceWhere.id = { in: data.filters.sourceIds }
    }

    // Get accessible sources
    const sources = await prisma.source.findMany({
      where: sourceWhere,
      select: { id: true },
    })

    const baseSourceIds = sources.map((s) => s.id)

    if (baseSourceIds.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        latencyMs: Date.now() - startTime,
        sessionId: searchSession.id,
      })
    }

    // 4. Get filtered & boosted sources
    const { ids: sourceIds, boostMap } = await getFilteredSources(
      parsed,
      baseSourceIds
    )

    // 5. Check cache
    const cached = await searchCache.get(data.query, sourceIds, {
      sessionId: searchSession.id,
      offset: data.offset,
    })

    if (cached) {
      console.log('[API] Cache HIT for query:', data.query)
      return NextResponse.json({
        results: cached,
        total: cached.length,
        latencyMs: Date.now() - startTime,
        cached: true,
        sessionId: searchSession.id,
      })
    }

    // 6. Hybrid search
    const excludePageIds = searchSession.shownPageIds || []
    const searchResults = await hybridSearch(
      parsed,
      sourceIds,
      excludePageIds,
      data.limit * 3 // Get more for reranking
    )

    if (searchResults.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        latencyMs: Date.now() - startTime,
        cached: false,
        sessionId: searchSession.id,
      })
    }

    // 7. Apply source boosts
    searchResults.forEach((result) => {
      const boost = boostMap.get(result.source.id) || 1.0
      result.scores.combined *= boost
    })

    // 8. Rerank
    const reranked = await rerank(searchResults, parsed)

    // 9. Optimize and paginate
    const optimized = optimizeResults(reranked, parsed, {
      maxResults: 100, // More results for UI
      maxTokens: 20000, // Higher limit for UI
      includeReasons: false,
    })

    // Apply pagination
    const paginatedResults = optimized.slice(
      data.offset,
      data.offset + data.limit
    )

    // 10. Cache results
    await searchCache.set(data.query, sourceIds, optimized, {
      sessionId: searchSession.id,
      offset: data.offset,
    })

    // 11. Update session
    const shownPageIds = reranked
      .slice(data.offset, data.offset + data.limit)
      .map((r) => r.pageId)
    await sessionManager.addShownPages(searchSession.id, shownPageIds)
    await sessionManager.addQuery(
      searchSession.id,
      data.query,
      paginatedResults.length
    )

    // 12. Log the search
    await prisma.queryLog.create({
      data: {
        query: data.query,
        resultsCount: paginatedResults.length,
        topPageIds: paginatedResults.slice(0, 10).map((r) => r.url),
        sourceIds: [],
        latencyMs: Date.now() - startTime,
        workspaceId: workspaceId,
        userId: session.user.id,
      },
    })

    // 13. Track usage (SaaS only)
    if (IS_SAAS_MODE) {
      await trackUsage({
        userId: session.user.id,
        eventType: UsageEventType.SEARCH,
        count: 1,
        metadata: {
          query: data.query,
          resultsCount: paginatedResults.length,
          workspaceId,
          cached,
        },
      })
    }

    return NextResponse.json({
      results: paginatedResults.map((r) => ({
        id: r.url,
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        source: {
          name: r.source,
          url: r.sourceUrl,
        },
        score: r.relevanceScore,
      })),
      total: optimized.length,
      latencyMs: Date.now() - startTime,
      cached: false,
      sessionId: searchSession.id,
      _meta: {
        frameworks: parsed.frameworks.map((f) => f.name),
        intent: parsed.intent,
      },
    })
  } catch (error: any) {
    console.error('[API] POST /api/search error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
