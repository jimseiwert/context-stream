/**
 * Admin Statistics API
 * GET /api/admin/statistics - Get detailed system statistics
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/statistics
 * Get detailed statistics for admin analytics
 * Requires ADMIN or SUPER_ADMIN role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Define time ranges
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get overview statistics
    const [totalUsers, totalSources, totalPages, totalQueries, totalStorage] =
      await Promise.all([
        prisma.user.count(),
        prisma.source.count(),
        prisma.page.count(),
        prisma.queryLog.count(),
        // Approximate storage - just count for now since contentLength field doesn't exist
        Promise.resolve({ _sum: { contentLength: 0 } }),
      ]);

    // Get query statistics (with error handling if table doesn't exist)
    const [queries24h, queries7d, queries30d, topQueries] = await Promise.all([
      prisma.queryLog
        .count({ where: { createdAt: { gte: last24h } } })
        .catch(() => 0),
      prisma.queryLog
        .count({ where: { createdAt: { gte: last7d } } })
        .catch(() => 0),
      prisma.queryLog
        .count({ where: { createdAt: { gte: last30d } } })
        .catch(() => 0),
      // Get top queries with counts
      prisma.queryLog
        .groupBy({
          by: ["query"],
          _count: {
            query: true,
          },
          _max: {
            createdAt: true,
          },
          orderBy: {
            _count: {
              query: "desc",
            },
          },
          take: 10,
        })
        .catch(() => []),
    ]);

    // Get source statistics
    const [sourcesByScope, sourcesByStatus, topSources] = await Promise.all([
      // Sources by scope (GLOBAL vs WORKSPACE)
      prisma.source.groupBy({
        by: ["scope"],
        _count: {
          scope: true,
        },
      }),
      // Sources by status
      prisma.source.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
      // Top sources by page count for now (queryLogs relation not in schema)
      prisma.source.findMany({
        select: {
          id: true,
          name: true,
          domain: true,
          pageCount: true,
        },
        orderBy: {
          pageCount: "desc",
        },
        take: 10,
      }),
    ]);

    // Get user activity statistics
    const [
      activeUsers24h,
      activeUsers7d,
      activeUsers30d,
      newUsers7d,
      newUsers30d,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          updatedAt: { gte: last24h },
        },
      }),
      prisma.user.count({
        where: {
          updatedAt: { gte: last7d },
        },
      }),
      prisma.user.count({
        where: {
          updatedAt: { gte: last30d },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: last7d },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: last30d },
        },
      }),
    ]);

    // Get performance metrics
    const [avgQueryLatency, successfulQueries, failedJobs] = await Promise.all([
      prisma.queryLog
        .aggregate({
          _avg: {
            latencyMs: true,
          },
          where: {
            createdAt: { gte: last30d },
          },
        })
        .catch(() => ({ _avg: { latencyMs: 0 } })),
      prisma.queryLog
        .count({
          where: {
            resultsCount: { gt: 0 },
            createdAt: { gte: last30d },
          },
        })
        .catch(() => 0),
      prisma.job.count({
        where: {
          status: "FAILED",
          createdAt: { gte: last30d },
        },
      }),
    ]);

    // Calculate percentages for source distribution
    const totalSourcesCount = totalSources || 1; // Avoid division by zero
    const sourcesByType = sourcesByScope.map((item) => ({
      type: item.scope,
      count: item._count.scope,
      percentage: (item._count.scope / totalSourcesCount) * 100,
    }));

    const sourcesByStatusFormatted = sourcesByStatus.map((item) => ({
      status: item.status,
      count: item._count.status,
      percentage: (item._count.status / totalSourcesCount) * 100,
    }));

    // Format top sources
    const topSourcesFormatted = topSources.map((source) => ({
      id: source.id,
      name: source.name || source.domain,
      domain: source.domain,
      queryCount: 0, // TODO: Calculate from query logs
      pageCount: source.pageCount,
    }));

    // Format top queries
    const topQueriesFormatted = topQueries.map((item) => ({
      query: item.query,
      count: item._count.query,
      lastQueriedAt:
        item._max.createdAt?.toISOString() || new Date().toISOString(),
    }));

    // Calculate success rate
    const totalQueriesLast30d = queries30d || 1; // Avoid division by zero
    const successRate = successfulQueries / totalQueriesLast30d;

    // Calculate average indexing time from job duration
    const completedJobs = await prisma.job.findMany({
      where: {
        status: "COMPLETED",
        type: "SCRAPE",
        createdAt: { gte: last30d },
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    const avgIndexingTime =
      completedJobs.length > 0
        ? Math.round(
            completedJobs.reduce((sum, job) => {
              const duration =
                job.completedAt!.getTime() - job.startedAt!.getTime();
              return sum + duration;
            }, 0) /
              completedJobs.length /
              1000
          )
        : 0;

    return NextResponse.json({
      overview: {
        totalUsers,
        totalSources,
        totalPages,
        totalQueries,
        totalStorage: totalStorage._sum.contentLength || 0,
      },
      queries: {
        last24h: queries24h,
        last7d: queries7d,
        last30d: queries30d,
        topQueries: topQueriesFormatted,
      },
      sources: {
        byType: sourcesByType,
        byStatus: sourcesByStatusFormatted,
        topSources: topSourcesFormatted,
      },
      users: {
        activeUsers24h,
        activeUsers7d,
        activeUsers30d,
        newUsers7d,
        newUsers30d,
      },
      performance: {
        avgQueryLatency: Math.round(avgQueryLatency._avg.latencyMs || 0),
        avgIndexingTime,
        failedJobs,
        successRate,
      },
    });
  } catch (error: any) {
    console.error("[API] GET /api/admin/statistics error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
