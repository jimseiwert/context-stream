/**
 * Dashboard Stats API
 * GET /api/dashboard/stats - Get dashboard statistics
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's personal workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        ownerId: session.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!workspace) {
      return NextResponse.json(
        {
          stats: {
            sources: 0,
            pages: 0,
            storageKB: 0,
            queries: 0,
          },
          recentSources: [],
          recentActivity: [],
        },
        { status: 200 }
      );
    }

    // Get workspace sources (both GLOBAL and WORKSPACE-specific)
    const sources = await prisma.source.findMany({
      where: {
        OR: [
          { scope: "GLOBAL" },
          {
            AND: [
              { scope: "WORKSPACE" },
              {
                workspaceSources: {
                  some: {
                    workspaceId: workspace.id,
                  },
                },
              },
            ],
          },
        ],
      },
      include: {
        _count: {
          select: {
            pages: true,
          },
        },
        workspaceSources: {
          where: {
            workspaceId: workspace.id,
          },
        },
      },
      orderBy: {
        lastScrapedAt: "desc",
      },
      take: 5, // Get 5 most recent for dashboard
    });

    // Calculate stats
    const totalSources = sources.length;
    const totalPages = sources.reduce(
      (sum, source) => sum + source._count.pages,
      0
    );

    // Estimate storage: ~5KB per page (rough estimate)
    const estimatedStorageKB = totalPages * 5;

    // Get recent query count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentQueries = await prisma.queryLog.count({
      where: {
        workspaceId: workspace.id,
        queriedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Format recent sources for dashboard
    const recentSources = sources.map((source) => ({
      id: source.id,
      name: source.domain,
      url: source.url,
      status: source.status,
      pageCount: source._count.pages,
      lastUpdated: source.lastScrapedAt?.toISOString() || null,
      scope: source.scope,
    }));

    // Get recent activity (last 10 jobs)
    const recentJobs = await prisma.job.findMany({
      where: {
        source: {
          OR: [
            { scope: "GLOBAL" },
            {
              AND: [
                { scope: "WORKSPACE" },
                {
                  workspaceSources: {
                    some: {
                      workspaceId: workspace.id,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      include: {
        source: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    const recentActivity = recentJobs.map((job) => {
      let description = "";
      let type = "update";

      switch (job.type) {
        case "SCRAPE":
          description = `Indexed ${job.source.domain}`;
          type = "add";
          break;
        case "UPDATE":
          description = `Updated ${job.source.domain}`;
          type = "update";
          break;
        case "EMBED":
          description = `Generated embeddings for ${job.source.domain}`;
          type = "update";
          break;
      }

      return {
        id: job.id,
        type,
        description,
        result:
          job.status === "COMPLETED" ? "Success" : job.status.toLowerCase(),
        timestamp:
          job.completedAt?.toISOString() || job.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      stats: {
        sources: totalSources,
        pages: totalPages,
        storageKB: estimatedStorageKB,
        queries: recentQueries,
      },
      recentSources,
      recentActivity,
    });
  } catch (error: any) {
    console.error("[API] GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
