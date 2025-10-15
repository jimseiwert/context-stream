/**
 * Upgrade Prompt Hook
 * Manages upgrade dialog state and automatically shows prompts based on quota status
 */

'use client'

import { useState, useEffect } from 'react'
import { useUsage } from './use-usage'
import { PlanTier } from '@prisma/client'

export interface UpgradePromptState {
  isOpen: boolean
  reason?: string
  currentTier?: PlanTier
  suggestedTier?: PlanTier
}

export function useUpgradePrompt() {
  const [state, setState] = useState<UpgradePromptState>({
    isOpen: false,
  })
  const { data: usage } = useUsage()

  // Determine suggested tier based on current tier
  const getSuggestedTier = (currentTier?: string): PlanTier => {
    switch (currentTier) {
      case PlanTier.FREE:
        return PlanTier.STARTER
      case PlanTier.STARTER:
        return PlanTier.PRO
      case PlanTier.PRO:
        return PlanTier.TEAM
      default:
        return PlanTier.STARTER
    }
  }

  // Show upgrade prompt with specific reason
  const showUpgradePrompt = (reason?: string, suggestedTier?: PlanTier) => {
    setState({
      isOpen: true,
      reason,
      currentTier: usage?.plan?.tier as PlanTier,
      suggestedTier: suggestedTier || getSuggestedTier(usage?.plan?.tier),
    })
  }

  // Hide upgrade prompt
  const hideUpgradePrompt = () => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }

  // Check if user should see upgrade prompt based on usage
  const checkShouldPromptUpgrade = (): boolean => {
    if (!usage || usage.isSelfHosted || usage.unlimited) {
      return false
    }

    // Check if any quota is near limit (>= 90%)
    const quotas = [
      {
        used: usage.usage.searchesUsed,
        limit: usage.quotas.searchesPerMonth,
        name: 'searches',
      },
      {
        used: usage.usage.sourcesUsed,
        limit: usage.quotas.maxSources,
        name: 'sources',
      },
      {
        used: usage.usage.workspacesUsed,
        limit: usage.quotas.maxWorkspaces,
        name: 'workspaces',
      },
      {
        used: usage.usage.pagesIndexed,
        limit: usage.quotas.maxPagesIndexed,
        name: 'pages',
      },
    ]

    for (const quota of quotas) {
      if (quota.limit > 0) {
        const percentage = (quota.used / quota.limit) * 100
        if (percentage >= 90) {
          return true
        }
      }
    }

    return false
  }

  // Automatically show prompt when approaching limits (optional)
  useEffect(() => {
    if (usage?.warnings && usage.warnings.length > 0) {
      const highestWarning = usage.warnings.reduce((max, warning) =>
        warning.percentage > max.percentage ? warning : max
      )

      if (highestWarning.percentage >= 90) {
        // Auto-prompt can be enabled here if desired
        // showUpgradePrompt(highestWarning.message)
      }
    }
  }, [usage?.warnings])

  return {
    ...state,
    showUpgradePrompt,
    hideUpgradePrompt,
    checkShouldPromptUpgrade,
  }
}

/**
 * Get user-friendly message for quota exceeded
 */
export function getQuotaExceededMessage(quotaType: 'search' | 'source' | 'workspace' | 'page'): string {
  const messages = {
    search: "You've reached your monthly search limit. Upgrade to continue searching.",
    source: "You've reached your maximum number of sources. Upgrade to add more documentation sources.",
    workspace: "You've reached your maximum number of workspaces. Upgrade to create more workspaces.",
    page: "You've reached your page indexing limit. Upgrade to index more pages.",
  }

  return messages[quotaType]
}

/**
 * Get recommended tier based on quota type that was exceeded
 */
export function getRecommendedTier(
  quotaType: 'search' | 'source' | 'workspace' | 'page',
  currentTier: PlanTier
): PlanTier {
  // If on FREE, always suggest STARTER
  if (currentTier === PlanTier.FREE) {
    return PlanTier.STARTER
  }

  // If on STARTER, suggest PRO for most limits
  if (currentTier === PlanTier.STARTER) {
    return quotaType === 'search' || quotaType === 'page' ? PlanTier.PRO : PlanTier.PRO
  }

  // If on PRO, suggest TEAM
  if (currentTier === PlanTier.PRO) {
    return PlanTier.TEAM
  }

  // Default to next tier up
  return PlanTier.STARTER
}
