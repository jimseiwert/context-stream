"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  Database,
  Globe,
  TrendingUp,
  Activity,
  Clock,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface AdminStats {
  totalUsers: number
  totalSources: number
  globalSources: number
  workspaceSources: number
  totalPages: number
  totalQueries: number
  activeUsers: number
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    user: {
      name: string
      email: string
    }
  }>
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await apiClient.get<AdminStats>("/api/admin/stats")
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

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      description: `${stats?.activeUsers || 0} active in last 30 days`,
      color: "text-blue-600",
    },
    {
      title: "Total Sources",
      value: stats?.totalSources || 0,
      icon: Database,
      description: `${stats?.globalSources || 0} global, ${stats?.workspaceSources || 0} workspace`,
      color: "text-green-600",
    },
    {
      title: "Indexed Pages",
      value: (stats?.totalPages || 0).toLocaleString(),
      icon: Globe,
      description: "Across all sources",
      color: "text-purple-600",
    },
    {
      title: "Total Queries",
      value: (stats?.totalQueries || 0).toLocaleString(),
      icon: TrendingUp,
      description: "All time",
      color: "text-orange-600",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          System overview and administrative controls
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>
            Latest administrative and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{activity.type}</Badge>
                      <p className="text-sm font-medium">{activity.description}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                      <span>·</span>
                      <span>{activity.user.name}</span>
                      <span>({activity.user.email})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Global Sources</span>
              <Badge variant="default">{stats?.globalSources || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Workspace Sources</span>
              <Badge variant="secondary">{stats?.workspaceSources || 0}</Badge>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Total</span>
              <Badge>{stats?.totalSources || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Users</span>
              <Badge variant="default">{stats?.totalUsers || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Users (30d)</span>
              <Badge variant="secondary">{stats?.activeUsers || 0}</Badge>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Activity Rate</span>
              <Badge>
                {stats?.totalUsers
                  ? Math.round(((stats.activeUsers || 0) / stats.totalUsers) * 100)
                  : 0}
                %
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
