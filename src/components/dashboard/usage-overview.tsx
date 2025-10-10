/**
 * Usage Overview Component
 * Displays user's current usage and quotas
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useUsage, calculateUsagePercentage, formatQuotaText } from '@/hooks/use-usage'
import { Loader2, AlertTriangle, TrendingUp, Zap, Database, Search, FolderTree } from 'lucide-react'
import Link from 'next/link'

export function UsageOverview() {
  const { data: usage, isLoading, error } = useUsage()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load usage data. {error.message === 'No subscription found' ? 'Creating your subscription...' : 'Please try refreshing the page.'}
        </AlertDescription>
      </Alert>
    )
  }

  if (!usage) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Setting up your account... Please refresh the page.
        </AlertDescription>
      </Alert>
    )
  }

  // Self-hosted mode
  if (usage.isSelfHosted || usage.unlimited) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Usage & Quotas
          </CardTitle>
          <CardDescription>Self-hosted deployment - unlimited usage</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              You're running Context Stream in self-hosted mode with unlimited access to all features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const searchPercentage = calculateUsagePercentage(usage.usage.searchesUsed, usage.quotas.searchesPerMonth)
  const sourcesPercentage = calculateUsagePercentage(usage.usage.sourcesUsed, usage.quotas.maxSources)
  const workspacesPercentage = calculateUsagePercentage(usage.usage.workspacesUsed, usage.quotas.maxWorkspaces)
  const pagesPercentage = calculateUsagePercentage(usage.usage.pagesIndexed, usage.quotas.maxPagesIndexed)

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-primary'
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      {usage.plan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  {usage.plan.name} - ${usage.plan.price}/month
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/pricing">Upgrade Plan</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Warnings */}
      {usage.warnings && usage.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              {usage.warnings.map((warning, index) => (
                <div key={index}>
                  <strong>{warning.type}:</strong> {warning.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage & Quotas
          </CardTitle>
          <CardDescription>
            Your current usage for this billing period
            {usage.resetAt && (
              <> • Resets on {new Date(usage.resetAt).toLocaleDateString()}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Searches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Searches</span>
              </div>
              <span className="text-muted-foreground">
                {formatQuotaText(usage.usage.searchesUsed, usage.quotas.searchesPerMonth)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                value={searchPercentage}
                className="flex-1"
              />
              <Badge variant={searchPercentage >= 90 ? 'destructive' : 'default'}>
                {searchPercentage}%
              </Badge>
            </div>
          </div>

          {/* Sources */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Sources</span>
              </div>
              <span className="text-muted-foreground">
                {formatQuotaText(usage.usage.sourcesUsed, usage.quotas.maxSources)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                value={sourcesPercentage}
                className="flex-1"
              />
              <Badge variant={sourcesPercentage >= 90 ? 'destructive' : 'default'}>
                {sourcesPercentage}%
              </Badge>
            </div>
          </div>

          {/* Workspaces */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Workspaces</span>
              </div>
              <span className="text-muted-foreground">
                {formatQuotaText(usage.usage.workspacesUsed, usage.quotas.maxWorkspaces)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                value={workspacesPercentage}
                className="flex-1"
              />
              <Badge variant={workspacesPercentage >= 90 ? 'destructive' : 'default'}>
                {workspacesPercentage}%
              </Badge>
            </div>
          </div>

          {/* Pages Indexed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Pages Indexed</span>
              </div>
              <span className="text-muted-foreground">
                {formatQuotaText(usage.usage.pagesIndexed, usage.quotas.maxPagesIndexed)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                value={pagesPercentage}
                className="flex-1"
              />
              <Badge variant={pagesPercentage >= 90 ? 'destructive' : 'default'}>
                {pagesPercentage}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      {usage.summary && usage.summary.totalSearches !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>30-Day Summary</CardTitle>
            <CardDescription>Your activity over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{(usage.summary.totalSearches || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Searches</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{(usage.summary.totalSourcesAdded || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Sources Added</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{(usage.summary.totalPagesIndexed || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Pages Indexed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{(usage.summary.totalWorkspacesCreated || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Workspaces Created</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
