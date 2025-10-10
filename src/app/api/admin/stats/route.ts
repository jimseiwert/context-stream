/**
 * Admin Stats API
 * GET /api/admin/stats - Get admin dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * GET /api/admin/stats
 * Get statistics for admin dashboard
 * Requires ADMIN or SUPER_ADMIN role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get statistics
    const [
      totalUsers,
      totalSources,
      totalPages,
      totalQueries,
      activeUsers,
      globalSources,
      workspaceSources,
      recentActivity,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Total sources
      prisma.source.count(),

      // Total indexed pages
      prisma.page.count(),

      // Total queries
      prisma.queryLog.count(),

      // Active users in last 30 days
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Global sources
      prisma.source.count({
        where: { scope: 'GLOBAL' },
      }),

      // Workspace sources
      prisma.source.count({
        where: { scope: 'WORKSPACE' },
      }),

      // Recent activity (last 50 events)
      prisma.queryLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ])

    // Format recent activity
    const formattedActivity = await Promise.all(
      recentActivity.map(async (log) => {
        // Get user separately in case relationship doesn't exist yet
        let user = null
        if (log.userId) {
          user = await prisma.user.findUnique({
            where: { id: log.userId },
            select: { name: true, email: true },
          }).catch(() => null)
        }

        return {
          id: log.id,
          type: 'SEARCH_QUERY',
          description: `Searched for "${log.query}" - ${log.resultsCount} results`,
          timestamp: log.createdAt.toISOString(),
          user: {
            name: user?.name || 'Unknown User',
            email: user?.email || 'unknown@example.com',
          },
        }
      })
    )

    return NextResponse.json({
      totalUsers,
      totalSources,
      globalSources,
      workspaceSources,
      totalPages,
      totalQueries,
      activeUsers,
      recentActivity: formattedActivity,
    })
  } catch (error: any) {
    console.error('[API] GET /api/admin/stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
