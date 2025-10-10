"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Database,
  FileText,
  HardDrive,
  Search,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  PauseCircle
} from "lucide-react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"
import { formatDistanceToNow } from "date-fns"

interface DashboardStats {
  sources: number
  pages: number
  storageKB: number
  queries: number
}

interface RecentSource {
  id: string
  name: string
  url: string
  status: string
  pageCount: number
  lastUpdated: string | null
  scope: string
}

interface RecentActivity {
  id: string
  type: string
  description: string
  result: string
  timestamp: string
}

function StatsCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function SourceCard({ source }: { source: RecentSource }) {
  const statusConfig: Record<string, { icon: any; color: string }> = {
    ACTIVE: { icon: CheckCircle, color: "text-green-500" },
    INDEXING: { icon: RefreshCw, color: "text-blue-500" },
    PENDING: { icon: Clock, color: "text-yellow-500" },
    PAUSED: { icon: PauseCircle, color: "text-orange-500" },
    ERROR: { icon: AlertCircle, color: "text-red-500" },
  }

  const config = statusConfig[source.status] || statusConfig.ACTIVE
  const StatusIcon = config.icon

  return (
    <Link href={`/sources/${source.id}`}>
      <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-1">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{source.name}</CardTitle>
              <CardDescription>{source.url}</CardDescription>
            </div>
            {source.scope === "GLOBAL" && (
              <Badge variant="default">Global</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
              <Badge variant="outline" className="capitalize">
                {source.status.toLowerCase()}
              </Badge>
            </div>
            <div className="text-muted-foreground">
              {source.pageCount} pages · {source.lastUpdated ? formatDistanceToNow(new Date(source.lastUpdated), { addSuffix: true }) : "Never"}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const typeIcons: Record<string, any> = {
    search: Search,
    update: RefreshCw,
    add: Plus,
  }
  const Icon = typeIcons[activity.type] || Search

  return (
    <div className="flex items-start space-x-3 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm">
          {activity.description}
          {activity.result && (
            <span className="ml-2 text-muted-foreground">→ {activity.result}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground flex items-center">
          <Clock className="mr-1 h-3 w-3" />
          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await apiClient.get<{
        stats: DashboardStats
        recentSources: RecentSource[]
        recentActivity: RecentActivity[]
      }>("/api/dashboard/stats")
      return response
    },
  })

  const stats = data?.stats
  const recentSources = data?.recentSources || []
  const recentActivity = data?.recentActivity || []

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your indexed documentation
          </p>
        </div>
        <Button asChild>
          <Link href="/sources/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Sources" value={stats.sources} icon={Database} />
          <StatsCard title="Total Pages" value={stats.pages.toLocaleString()} icon={FileText} />
          <StatsCard title="Storage Used" value={`${Math.round(stats.storageKB / 1024)} MB`} icon={HardDrive} />
          <StatsCard title="Recent Queries" value={stats.queries} icon={Search} />
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Sources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Sources</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sources">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))
            ) : recentSources.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sources yet</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Get started by adding your first documentation source
                  </p>
                  <Button asChild>
                    <Link href="/sources/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Source
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              recentSources.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 mb-4" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                  <p className="text-muted-foreground text-center">
                    Activity will appear here as you use the platform
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="px-6">
                      <ActivityItem activity={activity} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button asChild variant="outline">
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Search Docs
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sources">
            <Database className="mr-2 h-4 w-4" />
            View All Sources
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings/api-keys">
            Key Management
          </Link>
        </Button>
      </div>
    </div>
  )
}
