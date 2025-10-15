/**
 * Quota Warning Component
 * Shows warnings when approaching or exceeding quotas
 */

'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export interface QuotaWarningProps {
  type: 'search' | 'source' | 'workspace' | 'page'
  used: number
  limit: number
  percentage: number
  showUpgrade?: boolean
}

export function QuotaWarning({ type, used, limit, percentage, showUpgrade = true }: QuotaWarningProps) {
  const typeLabels = {
    search: 'searches',
    source: 'sources',
    workspace: 'workspaces',
    page: 'pages indexed',
  }

  const label = typeLabels[type]
  const isExceeded = percentage >= 100
  const isWarning = percentage >= 75

  if (!isWarning) return null

  return (
    <Alert variant={isExceeded ? 'destructive' : 'default'}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isExceeded ? `${label} quota exceeded` : `Approaching ${label} limit`}
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span>
              {used.toLocaleString()} / {limit.toLocaleString()} {label}
            </span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {isExceeded ? (
          <p>
            You've reached your {label} limit. {showUpgrade && 'Upgrade your plan to continue using this feature.'}
          </p>
        ) : (
          <p>
            You're using {percentage}% of your {label} quota. Consider upgrading to avoid interruptions.
          </p>
        )}

        {showUpgrade && (
          <Button asChild size="sm">
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export interface QuotaExceededProps {
  type: 'search' | 'source' | 'workspace' | 'page'
  limit: number
}

export function QuotaExceeded({ type, limit }: QuotaExceededProps) {
  const typeLabels = {
    search: 'searches',
    source: 'sources',
    workspace: 'workspaces',
    page: 'pages',
  }

  const actionLabels = {
    search: 'perform more searches',
    source: 'add more sources',
    workspace: 'create more workspaces',
    page: 'index more pages',
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Quota Limit Reached</AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p>
          You've reached your limit of {limit.toLocaleString()} {typeLabels[type]} per month.
          Upgrade your plan to {actionLabels[type]}.
        </p>

        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/pricing">View Plans</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/billing">Manage Billing</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

export interface UsageStatProps {
  type: 'search' | 'source' | 'workspace' | 'page'
  used: number
  limit: number
  compact?: boolean
}

export function UsageStat({ type, used, limit, compact = false }: UsageStatProps) {
  const typeLabels = {
    search: 'Searches',
    source: 'Sources',
    workspace: 'Workspaces',
    page: 'Pages',
  }

  const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
  const isWarning = percentage >= 75
  const isExceeded = percentage >= 100

  if (compact) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{typeLabels[type]}</span>
        <span className={isExceeded ? 'text-destructive font-medium' : isWarning ? 'text-yellow-600 font-medium' : ''}>
          {used.toLocaleString()} / {limit === -1 ? '∞' : limit.toLocaleString()}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{typeLabels[type]}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()} / {limit === -1 ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      {isWarning && !isExceeded && (
        <p className="text-xs text-yellow-600">
          ⚠️ {percentage}% used - consider upgrading
        </p>
      )}
      {isExceeded && (
        <p className="text-xs text-destructive">
          🚫 Limit reached - upgrade to continue
        </p>
      )}
    </div>
  )
}
