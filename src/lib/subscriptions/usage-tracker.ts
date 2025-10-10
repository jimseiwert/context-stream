// Usage Tracking System
// Tracks user actions and updates subscription usage counters

import { prisma } from '@/lib/db'
import { UsageEventType } from '@prisma/client'
import { IS_SAAS_MODE } from '@/lib/config/features'

export interface TrackUsageParams {
  userId: string
  eventType: UsageEventType
  count?: number
  metadata?: Record<string, any>
}

/**
 * Track a usage event and update subscription counters
 */
export async function trackUsage(params: TrackUsageParams): Promise<void> {
  // Skip tracking in self-hosted mode
  if (!IS_SAAS_MODE) {
    return
  }

  const { userId, eventType, count = 1, metadata } = params

  try {
    // Record usage event for analytics
    await prisma.usageEvent.create({
      data: {
        userId,
        eventType,
        count,
        metadata: metadata || {},
        timestamp: new Date(),
      },
    })

    // Update subscription usage counters
    await updateSubscriptionUsage(userId, eventType, count)
  } catch (error) {
    // Log error but don't throw - tracking failures shouldn't break functionality
    console.error('Failed to track usage:', error)
  }
}

/**
 * Update subscription usage counters based on event type
 */
async function updateSubscriptionUsage(
  userId: string,
  eventType: UsageEventType,
  count: number
): Promise<void> {
  const updateData: Record<string, any> = {}

  switch (eventType) {
    case UsageEventType.SEARCH:
      updateData.searchesUsed = { increment: count }
      break
    case UsageEventType.SOURCE_ADDED:
      updateData.sourcesUsed = { increment: count }
      break
    case UsageEventType.PAGE_INDEXED:
      updateData.pagesIndexed = { increment: count }
      break
    case UsageEventType.WORKSPACE_CREATED:
      updateData.workspacesUsed = { increment: count }
      break
    case UsageEventType.API_REQUEST:
      // API requests don't increment a specific counter
      // They're tracked in usage events only
      return
  }

  if (Object.keys(updateData).length === 0) {
    return
  }

  await prisma.subscription.update({
    where: { userId },
    data: updateData,
  })
}

/**
 * Reset usage counters (called monthly)
 */
export async function resetUsageCounters(userId: string): Promise<void> {
  if (!IS_SAAS_MODE) return

  await prisma.subscription.update({
    where: { userId },
    data: {
      searchesUsed: 0,
      resetAt: getNextResetDate(),
    },
  })
}

/**
 * Calculate next reset date (first day of next month)
 */
export function getNextResetDate(): Date {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsage(userId: string) {
  if (!IS_SAAS_MODE) {
    return {
      searchesUsed: 0,
      sourcesUsed: 0,
      workspacesUsed: 0,
      pagesIndexed: 0,
      searchesPerMonth: -1,
      maxSources: -1,
      maxWorkspaces: -1,
      maxPagesIndexed: -1,
      resetAt: null,
    }
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      searchesUsed: true,
      sourcesUsed: true,
      workspacesUsed: true,
      pagesIndexed: true,
      searchesPerMonth: true,
      maxSources: true,
      maxWorkspaces: true,
      maxPagesIndexed: true,
      resetAt: true,
    },
  })

  if (!subscription) {
    throw new Error('Subscription not found')
  }

  return subscription
}

/**
 * Get usage events for analytics
 */
export async function getUserUsageEvents(
  userId: string,
  options: {
    eventType?: UsageEventType
    startDate?: Date
    endDate?: Date
    limit?: number
  } = {}
) {
  if (!IS_SAAS_MODE) return []

  const { eventType, startDate, endDate, limit = 100 } = options

  const where: any = { userId }

  if (eventType) {
    where.eventType = eventType
  }

  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp.gte = startDate
    if (endDate) where.timestamp.lte = endDate
  }

  return await prisma.usageEvent.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
}

/**
 * Get usage summary by event type
 */
export async function getUsageSummary(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  if (!IS_SAAS_MODE) return {}

  const where: any = { userId }

  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp.gte = startDate
    if (endDate) where.timestamp.lte = endDate
  }

  const events = await prisma.usageEvent.groupBy({
    by: ['eventType'],
    where,
    _sum: {
      count: true,
    },
  })

  return events.reduce((acc, event) => {
    acc[event.eventType] = event._sum.count || 0
    return acc
  }, {} as Record<string, number>)
}

/**
 * Check if usage should be reset (monthly reset)
 */
export async function checkAndResetUsageIfNeeded(userId: string): Promise<boolean> {
  if (!IS_SAAS_MODE) return false

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { resetAt: true },
  })

  if (!subscription) return false

  const now = new Date()
  if (now >= subscription.resetAt) {
    await resetUsageCounters(userId)
    return true
  }

  return false
}
