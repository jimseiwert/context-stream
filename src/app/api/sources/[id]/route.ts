/**
 * Source Management - Single Source Operations
 * GET    /api/sources/[id] - Get source details
 * PUT    /api/sources/[id] - Update source
 * DELETE /api/sources/[id] - Delete source
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { calculateNextScrapeAt } from "@/lib/jobs/scheduler";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z
    .object({
      maxPages: z.number().min(1).max(10000).optional(),
      respectRobotsTxt: z.boolean().optional(),
    })
    .optional(),
  rescrapeSchedule: z.enum(["NEVER", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
});

/**
 * GET /api/sources/[id]
 * Get detailed information about a specific source
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get source with related data
    const source = await prisma.source.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            pages: true,
          },
        },
        jobs: {
          where: {
            type: "SCRAPE",
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
            errorMessage: true,
            progress: true,
          },
        },
        pages: {
          take: 10,
          orderBy: { indexedAt: "desc" },
          select: {
            id: true,
            url: true,
            title: true,
            indexedAt: true,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Check access: user must own the workspace or source must be global
    if (source.scope !== "GLOBAL") {
      // For workspace sources, check if user has access
      const workspace = await prisma.workspaceSource.findFirst({
        where: {
          sourceId: source.id,
          workspace: {
            ownerId: session.user.id,
          },
        },
      });

      if (!workspace) {
        return NextResponse.json(
          { error: "You do not have permission to access this source" },
          { status: 403 }
        );
      }
    }

    // Format response - map jobs to scrapeJobs for frontend compatibility
    const formattedSource = {
      ...source,
      pageCount: source._count.pages,
      scrapeJobs: source.jobs.map((job) => ({
        id: job.id,
        status: job.status,
        startedAt: job.startedAt || job.createdAt,
        completedAt: job.completedAt,
        pagesScraped: (job.progress as any)?.completed || 0,
        errorMessage: job.errorMessage,
      })),
      pages: source.pages.map((page) => ({
        id: page.id,
        url: page.url,
        title: page.title,
        lastScrapedAt: page.indexedAt, // Map indexedAt to lastScrapedAt for frontend
      })),
      jobs: undefined, // Remove the jobs field
      config: source.config || undefined,
    };

    return NextResponse.json({ source: formattedSource });
  } catch (error: any) {
    console.error(`[API] GET /api/sources/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sources/[id]
 * Update a source's configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const data = UpdateSourceSchema.parse(body);

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    // Find source and check ownership
    const existingSource = await prisma.source.findUnique({
      where: { id },
      select: {
        scope: true,
        workspaceSources: {
          where: {
            workspace: {
              ownerId: session.user.id,
            },
          },
          take: 1,
        },
      },
    });

    if (!existingSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Global sources can only be edited by admins
    if (existingSource.scope === "GLOBAL" && !isAdmin) {
      return NextResponse.json(
        { error: "Cannot edit global sources. Admin access required." },
        { status: 403 }
      );
    }

    // For workspace sources, check workspace ownership
    if (
      existingSource.scope === "WORKSPACE" &&
      existingSource.workspaceSources.length === 0
    ) {
      return NextResponse.json(
        { error: "You do not have permission to edit this source" },
        { status: 403 }
      );
    }

    // Calculate nextScrapeAt if schedule is being updated
    const scheduleData = data.rescrapeSchedule
      ? {
          rescrapeSchedule: data.rescrapeSchedule,
          nextScrapeAt: calculateNextScrapeAt(data.rescrapeSchedule),
        }
      : {};

    // Update source
    const updatedSource = await prisma.source.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.config && { config: data.config }),
        ...scheduleData,
      },
      include: {
        _count: {
          select: {
            pages: true,
          },
        },
      },
    });

    return NextResponse.json({
      source: {
        ...updatedSource,
        pageCount: updatedSource._count.pages,
        config: updatedSource.config || undefined,
      },
    });
  } catch (error: any) {
    console.error(`[API] PUT /api/sources/${params.id} error:`, error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sources/[id]
 * Delete a source and all its pages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Find source and check ownership
    const source = await prisma.source.findUnique({
      where: { id },
      select: {
        scope: true,
        workspaceSources: {
          where: {
            workspace: {
              ownerId: session.user.id,
            },
          },
          take: 1,
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Global sources can't be deleted by regular users
    if (source.scope === "GLOBAL") {
      return NextResponse.json(
        { error: "Cannot delete global sources" },
        { status: 403 }
      );
    }

    // Check workspace ownership
    if (source.workspaceSources.length === 0) {
      return NextResponse.json(
        { error: "You do not have permission to delete this source" },
        { status: 403 }
      );
    }

    // Delete source (cascade will handle pages and scrape jobs)
    await prisma.source.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Source deleted successfully" });
  } catch (error: any) {
    console.error(`[API] DELETE /api/sources/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
