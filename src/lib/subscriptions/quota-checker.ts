// Quota Checker Utility
// Validates user actions against their subscription limits

import { prisma } from '@/lib/db'
import { IS_SAAS_MODE } from '@/lib/config/features'
import { isFeatureUnlimited } from './plans'

export enum QuotaType {
  SEARCH = 'search',
  SOURCE = 'source',
  WORKSPACE = 'workspace',
  PAGE = 'page',
}

export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
  usage?: number
  limit?: number
  percentage?: number
}

/**
 * Check if user can perform an action based on their quota
 */
export async function checkQuota(
  userId: string,
  quotaType: QuotaType
): Promise<QuotaCheckResult> {
  // Always allow in self-hosted mode
  if (!IS_SAAS_MODE) {
    return { allowed: true }
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (!subscription) {
    return {
      allowed: false,
      reason: 'No active subscription found',
    }
  }

  // Check specific quota type
  switch (quotaType) {
    case QuotaType.SEARCH:
      return checkSearchQuota(subscription)
    case QuotaType.SOURCE:
      return checkSourceQuota(subscription)
    case QuotaType.WORKSPACE:
      return checkWorkspaceQuota(subscription)
    case QuotaType.PAGE:
      return checkPageQuota(subscription)
    default:
      return { allowed: true }
  }
}

/**
 * Check search quota
 */
function checkSearchQuota(subscription: any): QuotaCheckResult {
  const { searchesUsed, searchesPerMonth } = subscription

  if (isFeatureUnlimited(searchesPerMonth)) {
    return { allowed: true }
  }

  const allowed = searchesUsed < searchesPerMonth
  const percentage = (searchesUsed / searchesPerMonth) * 100

  return {
    allowed,
    reason: allowed ? undefined : 'Monthly search quota exceeded',
    usage: searchesUsed,
    limit: searchesPerMonth,
    percentage,
  }
}

/**
 * Check source quota
 */
async function checkSourceQuota(subscription: any): Promise<QuotaCheckResult> {
  const { userId, maxSources } = subscription

  if (isFeatureUnlimited(maxSources)) {
    return { allowed: true }
  }

  // Count actual sources (workspace-specific only)
  const sourceCount = await prisma.source.count({
    where: {
      createdById: userId,
      scope: 'WORKSPACE',
    },
  })

  const allowed = sourceCount < maxSources
  const percentage = (sourceCount / maxSources) * 100

  return {
    allowed,
    reason: allowed ? undefined : 'Maximum sources limit reached',
    usage: sourceCount,
    limit: maxSources,
    percentage,
  }
}

/**
 * Check workspace quota
 */
async function checkWorkspaceQuota(subscription: any): Promise<QuotaCheckResult> {
  const { userId, maxWorkspaces } = subscription

  if (isFeatureUnlimited(maxWorkspaces)) {
    return { allowed: true }
  }

  // Count actual workspaces
  const workspaceCount = await prisma.workspace.count({
    where: {
      ownerId: userId,
    },
  })

  const allowed = workspaceCount < maxWorkspaces
  const percentage = (workspaceCount / maxWorkspaces) * 100

  return {
    allowed,
    reason: allowed ? undefined : 'Maximum workspaces limit reached',
    usage: workspaceCount,
    limit: maxWorkspaces,
    percentage,
  }
}

/**
 * Check page indexing quota
 */
function checkPageQuota(subscription: any): QuotaCheckResult {
  const { pagesIndexed, maxPagesIndexed } = subscription

  if (isFeatureUnlimited(maxPagesIndexed)) {
    return { allowed: true }
  }

  const allowed = pagesIndexed < maxPagesIndexed
  const percentage = (pagesIndexed / maxPagesIndexed) * 100

  return {
    allowed,
    reason: allowed ? undefined : 'Maximum pages indexed limit reached',
    usage: pagesIndexed,
    limit: maxPagesIndexed,
    percentage,
  }
}

/**
 * Get all quota statuses for a user
 */
export async function getAllQuotaStatuses(userId: string) {
  if (!IS_SAAS_MODE) {
    return {
      search: { allowed: true, unlimited: true },
      source: { allowed: true, unlimited: true },
      workspace: { allowed: true, unlimited: true },
      page: { allowed: true, unlimited: true },
    }
  }

  const [search, source, workspace, page] = await Promise.all([
    checkQuota(userId, QuotaType.SEARCH),
    checkQuota(userId, QuotaType.SOURCE),
    checkQuota(userId, QuotaType.WORKSPACE),
    checkQuota(userId, QuotaType.PAGE),
  ])

  return {
    search,
    source,
    workspace,
    page,
  }
}

/**
 * Check if user is approaching any limits (80% threshold)
 */
export async function isApproachingLimits(
  userId: string,
  threshold = 80
): Promise<boolean> {
  if (!IS_SAAS_MODE) return false

  const statuses = await getAllQuotaStatuses(userId)

  return Object.values(statuses).some(
    (status) => status.percentage !== undefined && status.percentage >= threshold
  )
}

/**
 * Get quota warnings for display
 */
export async function getQuotaWarnings(userId: string) {
  if (!IS_SAAS_MODE) return []

  const statuses = await getAllQuotaStatuses(userId)
  const warnings: Array<{
    type: string
    message: string
    percentage: number
    critical: boolean
  }> = []

  Object.entries(statuses).forEach(([type, status]) => {
    if (status.percentage === undefined) return

    if (status.percentage >= 100) {
      warnings.push({
        type,
        message: status.reason || `${type} limit reached`,
        percentage: status.percentage,
        critical: true,
      })
    } else if (status.percentage >= 80) {
      warnings.push({
        type,
        message: `Approaching ${type} limit (${Math.round(status.percentage)}%)`,
        percentage: status.percentage,
        critical: false,
      })
    }
  })

  return warnings
}
