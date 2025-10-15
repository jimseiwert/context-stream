"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Users,
  Database,
  Search,
  Activity,
  Clock,
  Globe,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { format } from "date-fns"

interface SystemStats {
  overview: {
    totalUsers: number
    totalSources: number
    totalPages: number
    totalQueries: number
    totalStorage: number
  }
  queries: {
    last24h: number
    last7d: number
    last30d: number
    topQueries: Array<{
      query: string
      count: number
      lastQueriedAt: string
    }>
  }
  sources: {
    byType: Array<{
      type: string
      count: number
      percentage: number
    }>
    byStatus: Array<{
      status: string
      count: number
      percentage: number
    }>
    topSources: Array<{
      id: string
      name: string
      domain: string
      queryCount: number
      pageCount: number
    }>
  }
  users: {
    activeUsers24h: number
    activeUsers7d: number
    activeUsers30d: number
    newUsers7d: number
    newUsers30d: number
  }
  performance: {
    avgQueryLatency: number
    avgIndexingTime: number
    failedJobs: number
    successRate: number
  }
}

export default function StatisticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-statistics"],
    queryFn: async () => {
      const response = await apiClient.get<SystemStats>("/api/admin/statistics")
      return response
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const overviewCards = [
    {
      title: "Total Queries",
      value: stats?.overview.totalQueries.toLocaleString() || "0",
      icon: Search,
      description: `${stats?.queries.last24h || 0} in last 24h`,
      color: "text-blue-600",
    },
    {
      title: "Active Users",
      value: stats?.users.activeUsers30d || 0,
      icon: Users,
      description: `${stats?.users.activeUsers24h || 0} in last 24h`,
      color: "text-green-600",
    },
    {
      title: "Total Pages",
      value: stats?.overview.totalPages.toLocaleString() || "0",
      icon: Database,
      description: "Indexed across all sources",
      color: "text-purple-600",
    },
    {
      title: "Success Rate",
      value: `${Math.round((stats?.performance.successRate || 0) * 100)}%`,
      icon: TrendingUp,
      description: "Query success rate",
      color: "text-orange-600",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">System Statistics</h1>
        <p className="text-muted-foreground">
          Analytics and insights for the entire platform
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Query Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Query Activity</span>
            </CardTitle>
            <CardDescription>Search query trends over time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Last 24 hours</span>
                <Badge variant="default">{stats?.queries.last24h.toLocaleString() || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Last 7 days</span>
                <Badge variant="secondary">{stats?.queries.last7d.toLocaleString() || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Last 30 days</span>
                <Badge variant="outline">{stats?.queries.last30d.toLocaleString() || 0}</Badge>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Avg. Query Latency</p>
              <div className="text-2xl font-bold">
                {stats?.performance.avgQueryLatency || 0}ms
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>User Activity</span>
            </CardTitle>
            <CardDescription>Active user trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Active (24h)</span>
                <Badge variant="default">{stats?.users.activeUsers24h || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active (7d)</span>
                <Badge variant="secondary">{stats?.users.activeUsers7d || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active (30d)</span>
                <Badge variant="outline">{stats?.users.activeUsers30d || 0}</Badge>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">New Users (30d)</p>
              <div className="text-2xl font-bold">{stats?.users.newUsers30d || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Queries */}
      {stats?.queries.topQueries && stats.queries.topQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Search Queries</CardTitle>
            <CardDescription>Most popular searches across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.queries.topQueries.map((query, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{query.query}</p>
                      <p className="text-xs text-muted-foreground">
                        Last queried {format(new Date(query.lastQueriedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge>{query.count} queries</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sources by Type</CardTitle>
            <CardDescription>Distribution of source types</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.sources.byType && stats.sources.byType.length > 0 ? (
              <div className="space-y-3">
                {stats.sources.byType.map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{item.count}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(item.percentage)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sources by Status</CardTitle>
            <CardDescription>Health status of all sources</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.sources.byStatus && stats.sources.byStatus.length > 0 ? (
              <div className="space-y-3">
                {stats.sources.byStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.status}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{item.count}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(item.percentage)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Sources */}
      {stats?.sources.topSources && stats.sources.topSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Sources by Query Count</CardTitle>
            <CardDescription>Most queried documentation sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.sources.topSources.map((source, index) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{source.name || source.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.pageCount.toLocaleString()} pages indexed
                      </p>
                    </div>
                  </div>
                  <Badge>{source.queryCount.toLocaleString()} queries</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance</CardTitle>
          <CardDescription>Performance metrics and health indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Query Success Rate</p>
              <div className="text-2xl font-bold">
                {Math.round((stats?.performance.successRate || 0) * 100)}%
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg. Query Latency</p>
              <div className="text-2xl font-bold">
                {stats?.performance.avgQueryLatency || 0}ms
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg. Indexing Time</p>
              <div className="text-2xl font-bold">
                {stats?.performance.avgIndexingTime || 0}s
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Failed Jobs</p>
              <div className="text-2xl font-bold">{stats?.performance.failedJobs || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
