/**
 * Usage API
 * GET /api/usage - Get current usage and quotas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'
import { getUserUsage, getUserUsageEvents, getUsageSummary } from '@/lib/subscriptions/usage-tracker'
import { getAllQuotaStatuses, getQuotaWarnings } from '@/lib/subscriptions/quota-checker'
import { IS_SAAS_MODE } from '@/lib/config/features'
import { getPlan } from '@/lib/subscriptions/plans'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!IS_SAAS_MODE) {
      // Return unlimited usage for self-hosted
      return NextResponse.json({
        isSelfHosted: true,
        usage: {
          searchesUsed: 0,
          sourcesUsed: 0,
          workspacesUsed: 0,
          pagesIndexed: 0,
        },
        quotas: {
          searchesPerMonth: -1,
          maxSources: -1,
          maxWorkspaces: -1,
          maxPagesIndexed: -1,
        },
        unlimited: true,
      })
    }

    // Get or create subscription for user
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    // If no subscription exists (for existing users before this feature), create one
    if (!subscription) {
      const { PlanTier } = await import('@prisma/client')
      const { PLANS } = await import('@/lib/subscriptions/plans')
      const freePlan = PLANS[PlanTier.FREE]
      const now = new Date()
      const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          planTier: PlanTier.FREE,
          status: 'ACTIVE',
          searchesPerMonth: freePlan.features.searchesPerMonth,
          maxSources: freePlan.features.maxSources,
          maxWorkspaces: freePlan.features.maxWorkspaces,
          maxPagesIndexed: freePlan.features.maxPagesIndexed,
          apiRateLimit: freePlan.features.apiRateLimit,
          searchesUsed: 0,
          sourcesUsed: 0,
          workspacesUsed: 0,
          pagesIndexed: 0,
          resetAt,
        },
      })
      console.log(`Created missing FREE subscription for existing user ${session.user.id}`)
    }

    // Get current usage
    const usage = await getUserUsage(session.user.id)

    // Get quota statuses
    const quotaStatuses = await getAllQuotaStatuses(session.user.id)

    // Get warnings
    const warnings = await getQuotaWarnings(session.user.id)

    // Get usage summary for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const summary = await getUsageSummary(session.user.id, thirtyDaysAgo, new Date())

    // Get plan details (subscription already fetched/created above)
    const plan = subscription ? getPlan(subscription.planTier) : null

    return NextResponse.json({
      usage: {
        searchesUsed: usage.searchesUsed,
        sourcesUsed: usage.sourcesUsed,
        workspacesUsed: usage.workspacesUsed,
        pagesIndexed: usage.pagesIndexed,
      },
      quotas: {
        searchesPerMonth: usage.searchesPerMonth,
        maxSources: usage.maxSources,
        maxWorkspaces: usage.maxWorkspaces,
        maxPagesIndexed: usage.maxPagesIndexed,
      },
      resetAt: usage.resetAt,
      quotaStatuses,
      warnings,
      summary,
      plan: plan ? {
        tier: plan.tier,
        name: plan.name,
        price: plan.price,
      } : null,
    })
  } catch (error: any) {
    console.error('GET /api/usage error:', error)
    return NextResponse.json(
      { error: 'Failed to get usage', details: error.message },
      { status: 500 }
    )
  }
}
