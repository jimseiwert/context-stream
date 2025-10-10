"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreVertical,
  RefreshCw,
  Settings,
  Trash2,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  Clock,
  Database,
  Globe
} from "lucide-react"
import { useSources, useDeleteSource, useRescrapeSource } from "@/hooks/use-sources"
import { useUsage, calculateUsagePercentage } from "@/hooks/use-usage"
import { useUpgradePrompt, getQuotaExceededMessage } from "@/hooks/use-upgrade-prompt"
import { QuotaWarning } from "@/components/billing/quota-warning"
import { UpgradeDialog } from "@/components/billing/upgrade-dialog"

export default function SourcesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // No workspaceId needed - API will use user's personal workspace
  const { data: sources = [], isLoading } = useSources()
  const deleteSource = useDeleteSource()
  const rescrapeSource = useRescrapeSource()

  // Usage and quota tracking
  const { data: usage } = useUsage()
  const upgradePrompt = useUpgradePrompt()

  // Calculate if user is at or near source limit
  const sourcesUsed = usage?.usage.sourcesUsed || 0
  const sourcesLimit = usage?.quotas.maxSources || -1
  const sourcesPercentage = calculateUsagePercentage(sourcesUsed, sourcesLimit)
  const isAtLimit = sourcesPercentage >= 100 && sourcesLimit > 0
  const isNearLimit = sourcesPercentage >= 90 && sourcesLimit > 0

  const filteredSources = sources.filter((source) => {
    const matchesSearch =
      searchQuery === "" ||
      source.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.url.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || source.status === statusFilter.toUpperCase()

    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4 text-accent-green-500" />
      case "INDEXING":
      case "PENDING":
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />
      case "PAUSED":
        return <PauseCircle className="h-4 w-4 text-accent-amber-500" />
      case "ERROR":
        return <AlertCircle className="h-4 w-4 text-accent-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadgeVariant = (status: string): any => {
    switch (status) {
      case "ACTIVE":
        return "success"
      case "INDEXING":
      case "PENDING":
        return "info"
      case "PAUSED":
        return "warning"
      case "ERROR":
        return "error"
      default:
        return "secondary"
    }
  }

  const handleDelete = async (sourceId: string) => {
    if (confirm("Are you sure you want to remove this source?")) {
      deleteSource.mutate({ sourceId })
    }
  }

  const handleRescrape = (sourceId: string, fullReindex: boolean = false) => {
    rescrapeSource.mutate({ sourceId, fullReindex })
  }

  const handleAddSourceClick = () => {
    if (isAtLimit) {
      upgradePrompt.showUpgradePrompt(getQuotaExceededMessage('source'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation Sources</h1>
          <p className="text-muted-foreground">
            Manage your indexed documentation sources
          </p>
        </div>
        {isAtLimit ? (
          <Button onClick={handleAddSourceClick}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        ) : (
          <Button asChild>
            <Link href="/sources/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Source
            </Link>
          </Button>
        )}
      </div>

      {/* Quota Warning */}
      {isNearLimit && (
        <QuotaWarning
          type="source"
          used={sourcesUsed}
          limit={sourcesLimit}
          percentage={sourcesPercentage}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-md bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="indexing">Indexing</option>
          <option value="paused">Paused</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Sources List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredSources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sources found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first documentation source"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button asChild>
                <Link href="/sources/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Source
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSources.map((source) => (
            <Card key={source.id} className="hover:shadow-md transition-all duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      <Link
                        href={`/sources/${source.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {source.domain}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {source.url}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRescrape(source.id)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Update Now
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRescrape(source.id, true)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Full Re-index
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/sources/${source.id}/edit`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(source.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Source
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pages</span>
                    <span className="text-sm font-semibold">
                      {source.pageCount.toLocaleString()}
                    </span>
                  </div>
                  {source.estimatedStorageKB && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Storage</span>
                      <span className="text-sm">
                        {Math.round(source.estimatedStorageKB / 1024)} MB
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <span className="text-sm">
                      {source.lastScrapedAt
                        ? new Date(source.lastScrapedAt).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(source.status)}
                  <Badge variant={getStatusBadgeVariant(source.status)}>
                    {source.status.toLowerCase()}
                  </Badge>
                </div>
                {source.scope === "GLOBAL" && (
                  <Badge variant="default" className="flex items-center space-x-1">
                    <Globe className="h-3 w-3" />
                    <span>Global</span>
                  </Badge>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={upgradePrompt.isOpen}
        onOpenChange={upgradePrompt.hideUpgradePrompt}
        reason={upgradePrompt.reason}
        currentTier={upgradePrompt.currentTier}
        suggestedTier={upgradePrompt.suggestedTier}
      />
    </div>
  )
}