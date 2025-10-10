/**
 * Health Check API Route
 *
 * GET /api/health - System health check
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getQueueHealth } from '@/lib/jobs/queue'

export const runtime = 'nodejs'

/**
 * GET /api/health
 * Returns system health status
 */
export async function GET() {
  try {
    const startTime = Date.now()

    // Check database connectivity
    let dbStatus = 'healthy'
    let dbLatency = 0
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbLatency = Date.now() - dbStart
    } catch (error) {
      dbStatus = 'unhealthy'
      console.error('[Health] Database check failed:', error)
    }

    // Check queue health
    let queueStatus = 'healthy'
    let queueStats: any = null
    try {
      queueStats = await getQueueHealth()
    } catch (error) {
      queueStatus = 'degraded'
      console.error('[Health] Queue check failed:', error)
    }

    // Get basic stats
    const stats = await prisma.$transaction([
      prisma.source.count(),
      prisma.workspace.count(),
      prisma.user.count(),
      prisma.page.count(),
    ])

    const overallStatus = dbStatus === 'healthy' && queueStatus === 'healthy'
      ? 'healthy'
      : dbStatus === 'unhealthy'
        ? 'unhealthy'
        : 'degraded'

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          latency: `${dbLatency}ms`,
        },
        queues: {
          status: queueStatus,
          stats: queueStats,
        },
      },
      stats: {
        sources: stats[0],
        workspaces: stats[1],
        users: stats[2],
        pages: stats[3],
      },
      responseTime: `${responseTime}ms`,
      version: process.env.APP_VERSION || '1.0.0',
    })

  } catch (error: any) {
    console.error('[Health] Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
