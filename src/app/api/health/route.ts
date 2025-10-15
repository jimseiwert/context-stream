/**
 * Health Check API Route
 *
 * GET /api/health - System health check
 */

import { prisma } from "@/lib/db";
import { getQueueHealth } from "@/lib/jobs/queue";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Check if we're in build time
function isBuildTime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE === "phase-production-build"
  );
}

/**
 * GET /api/health
 * Returns system health status
 */
export async function GET() {
  try {
    const startTime = Date.now();

    // During build time, return a minimal health response without database calls
    if (isBuildTime()) {
      return NextResponse.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: "healthy",
            latency: "0ms",
          },
          queues: {
            status: "healthy",
            stats: null,
          },
        },
        stats: {
          sources: 0,
          workspaces: 0,
          users: 0,
          pages: 0,
        },
        responseTime: `${Date.now() - startTime}ms`,
        version: process.env.APP_VERSION || "1.0.0",
        buildTime: true,
      });
    }

    // Check database connectivity
    let dbStatus = "healthy";
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbStatus = "unhealthy";
      console.error("[Health] Database check failed:", error);
    }

    // Check queue health
    let queueStatus = "healthy";
    let queueStats: any = null;
    try {
      queueStats = await getQueueHealth();
    } catch (error) {
      queueStatus = "degraded";
      console.error("[Health] Queue check failed:", error);
    }

    // Get basic stats
    const stats = await prisma.$transaction([
      prisma.source.count(),
      prisma.workspace.count(),
      prisma.user.count(),
      prisma.page.count(),
    ]);

    const overallStatus =
      dbStatus === "healthy" && queueStatus === "healthy"
        ? "healthy"
        : dbStatus === "unhealthy"
        ? "unhealthy"
        : "degraded";

    const responseTime = Date.now() - startTime;

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
      version: process.env.APP_VERSION || "1.0.0",
    });
  } catch (error: any) {
    console.error("[Health] Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
