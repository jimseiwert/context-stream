/**
 * Usage Hook
 * Fetches and manages user usage/quota information
 */

import { useQuery } from '@tanstack/react-query'

export interface UsageData {
  usage: {
    searchesUsed: number
    sourcesUsed: number
    workspacesUsed: number
    pagesIndexed: number
  }
  quotas: {
    searchesPerMonth: number
    maxSources: number
    maxWorkspaces: number
    maxPagesIndexed: number
  }
  resetAt?: Date
  quotaStatuses?: Record<string, {
    allowed: boolean
    percentage: number
    usage: number
    limit: number
  }>
  warnings?: Array<{
    type: string
    message: string
    percentage: number
  }>
  summary?: {
    totalSearches: number
    totalSourcesAdded: number
    totalPagesIndexed: number
    totalWorkspacesCreated: number
  }
  plan?: {
    tier: string
    name: string
    price: number
  }
  isSelfHosted?: boolean
  unlimited?: boolean
}

async function fetchUsage(): Promise<UsageData> {
  const response = await fetch('/api/usage')

  if (!response.ok) {
    throw new Error('Failed to fetch usage data')
  }

  const data = await response.json()

  // Parse resetAt date if present
  if (data.resetAt) {
    data.resetAt = new Date(data.resetAt)
  }

  return data
}

export function useUsage() {
  return useQuery<UsageData, Error>({
    queryKey: ['usage'],
    queryFn: fetchUsage,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  })
}

/**
 * Calculate usage percentage for a quota
 */
export function calculateUsagePercentage(used: number, limit: number): number {
  if (limit === -1 || limit === 0) return 0 // Unlimited or no limit
  return Math.min(Math.round((used / limit) * 100), 100)
}

/**
 * Get status color based on usage percentage
 */
export function getUsageStatusColor(percentage: number): string {
  if (percentage >= 90) return 'destructive'
  if (percentage >= 75) return 'warning'
  return 'default'
}

/**
 * Format quota display text
 */
export function formatQuotaText(used: number, limit: number): string {
  if (limit === -1) return `${used.toLocaleString()} (Unlimited)`
  return `${used.toLocaleString()} / ${limit.toLocaleString()}`
}
