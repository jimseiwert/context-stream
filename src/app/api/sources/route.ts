/**
 * Sources API Routes
 *
 * GET  /api/sources - List sources (filtered by workspace and scope)
 * POST /api/sources - Create new source
 */

import { getApiSession } from "@/lib/auth/api";
import { IS_SAAS_MODE } from "@/lib/config/features";
import { prisma } from "@/lib/db";
import { addScrapeJob } from "@/lib/jobs/queue";
import { checkQuota, QuotaType } from "@/lib/subscriptions/quota-checker";
import { trackUsage } from "@/lib/subscriptions/usage-tracker";
import { UsageEventType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

// Validation schemas
const CreateSourceSchema = z.object({
  url: z.string().url("Invalid URL format"),
  workspaceId: z.string().uuid("Invalid workspace ID").optional(),
  type: z.enum(["WEBSITE", "GITHUB"]),
  scope: z.enum(["GLOBAL", "WORKSPACE"]).optional(), // Only admins can set to GLOBAL
  rescrapeSchedule: z.enum(["NEVER", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
  config: z
    .object({
      maxPages: z.number().min(1).max(10000).optional(),
      maxDepth: z.number().min(1).max(10).optional(),
      includePatterns: z.array(z.string()).optional(),
      excludePatterns: z.array(z.string()).optional(),
      respectRobotsTxt: z.boolean().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

/**
 * GET /api/sources
 * List sources filtered by workspace and optional scope
 *
 * NOTE: This endpoint only returns WORKSPACE-scoped sources for the UI list.
 * Global sources are NOT shown in the sources list, but are still searchable via /api/search
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    let workspaceId = searchParams.get("workspaceId");
    const scope = searchParams.get("scope"); // 'GLOBAL' | 'WORKSPACE' | undefined
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    // If no workspaceId provided, use user's personal workspace
    if (!workspaceId) {
      const userWorkspace = await prisma.workspace.findFirst({
        where: {
          ownerId: session.user.id,
        },
        orderBy: {
          createdAt: "asc", // Get the first workspace (personal workspace)
        },
      });

      if (userWorkspace) {
        workspaceId = userWorkspace.id;
      }
    }

    // Build query
    const where: any = {};

    if (scope) {
      where.scope = scope;
    }

    if (status) {
      where.status = status;
    }

    // If workspace ID is available, filter by workspace sources
    if (workspaceId) {
      // Verify user has access to this workspace (owner check)
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          ownerId: session.user.id,
        },
      });

      if (!workspace) {
        return NextResponse.json(
          { error: "Workspace not found or access denied" },
          { status: 404 }
        );
      }

      // Get sources for this workspace (only workspace sources added by user, not global)
      // Global sources are excluded from the UI list but are still searchable
      const sources = await prisma.source.findMany({
        where: {
          ...where,
          scope: "WORKSPACE", // Exclude global sources from UI list
          workspaceSources: {
            some: {
              workspaceId,
            },
          },
        },
        include: {
          _count: {
            select: {
              pages: true,
              workspaceSources: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await prisma.source.count({ where });

      // Format sources to match frontend expectations
      const formattedSources = sources.map((source) => ({
        ...source,
        pageCount: source._count.pages,
        workspaceCount: source._count.workspaceSources,
        config: source.config || undefined,
      }));

      return NextResponse.json({
        sources: formattedSources,
        summary: {
          total,
          global: sources.filter((s) => s.scope === "GLOBAL").length,
          workspace: sources.filter((s) => s.scope === "WORKSPACE").length,
        },
      });
    }

    // If no workspace ID, return only GLOBAL sources (for admin or public access)
    if (!workspaceId) {
      where.scope = "GLOBAL";
    }

    const sources = await prisma.source.findMany({
      where,
      include: {
        _count: {
          select: {
            pages: true,
            workspaceSources: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.source.count({ where });

    // Format sources to match frontend expectations
    const formattedSources = sources.map((source) => ({
      ...source,
      pageCount: source._count.pages,
      config: source.config || undefined,
    }));

    return NextResponse.json({
      sources: formattedSources,
      summary: {
        total,
        global: sources.filter((s) => s.scope === "GLOBAL").length,
        workspace: sources.filter((s) => s.scope === "WORKSPACE").length,
      },
    });
  } catch (error: any) {
    console.error("[API] GET /api/sources error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sources
 * Create a new source
 *
 * IMPORTANT: Implements Global Source Architecture logic:
 * 1. Check if URL exists as GLOBAL -> instant add (no scraping)
 * 2. Check if URL exists as WORKSPACE -> return error suggesting admin promotion
 * 3. If new -> create WORKSPACE source and queue scraping job
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const data = CreateSourceSchema.parse(body);

    // NOTE: Quota check is deferred until after we check if URL exists as global source
    // Global sources are free and don't count against quota, so we shouldn't block users
    // from adding them even if they're at their workspace source limit

    // Check if user is trying to create a GLOBAL source
    let targetScope: "GLOBAL" | "WORKSPACE" = "WORKSPACE";
    if (data.scope === "GLOBAL") {
      // Verify user is ADMIN or SUPER_ADMIN
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
        targetScope = "GLOBAL";
      } else {
        return NextResponse.json(
          { error: "Only admins can create global sources" },
          { status: 403 }
        );
      }
    }

    // Get workspace ID - use provided or user's personal workspace (not needed for GLOBAL sources)
    let workspaceId = data.workspaceId;

    // Skip workspace validation for GLOBAL sources
    if (targetScope === "WORKSPACE") {
      if (!workspaceId) {
        const userWorkspace = await prisma.workspace.findFirst({
          where: {
            ownerId: session.user.id,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        if (!userWorkspace) {
          return NextResponse.json(
            { error: "No workspace found. Please create a workspace first." },
            { status: 404 }
          );
        }

        workspaceId = userWorkspace.id;
      }

      // Verify user has access to workspace (owner check)
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          ownerId: session.user.id,
        },
      });

      if (!workspace) {
        return NextResponse.json(
          { error: "Workspace not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Normalize URL (remove trailing slash, etc.)
    const normalizedUrl = data.url.replace(/\/$/, "");

    // 1. Check if URL exists as GLOBAL source
    const existingGlobalSource = await prisma.source.findFirst({
      where: {
        url: normalizedUrl,
        scope: "GLOBAL",
      },
    });

    if (existingGlobalSource) {
      // For GLOBAL sources, we don't need to check workspace links
      if (targetScope === "WORKSPACE" && workspaceId) {
        // Check if already linked to this workspace
        const existingLink = await prisma.workspaceSource.findUnique({
          where: {
            workspaceId_sourceId: {
              workspaceId: workspaceId,
              sourceId: existingGlobalSource.id,
            },
          },
        });

        if (existingLink) {
          return NextResponse.json(
            { error: "This global source is already added to your workspace" },
            { status: 409 }
          );
        }

        // Link global source to workspace (instant add, no scraping needed)
        await prisma.workspaceSource.create({
          data: {
            workspaceId: workspaceId,
            sourceId: existingGlobalSource.id,
          },
        });
      }

      return NextResponse.json(
        {
          source: existingGlobalSource,
          isGlobal: true,
          message:
            "Global source added to workspace instantly (no scraping needed)",
        },
        { status: 201 }
      );
    }

    // 2. Check if URL exists as WORKSPACE source (belonging to another workspace)
    const existingWorkspaceSource = await prisma.source.findFirst({
      where: {
        url: normalizedUrl,
        scope: "WORKSPACE",
      },
      include: {
        workspaceSources: {
          include: {
            workspace: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (existingWorkspaceSource) {
      const workspaceCount = existingWorkspaceSource.workspaceSources.length;

      return NextResponse.json(
        {
          error: "This source already exists in another workspace",
          suggestion: `This source is used by ${workspaceCount} workspace(s). Consider asking an admin to promote it to a global source for better efficiency.`,
          existingSourceId: existingWorkspaceSource.id,
        },
        { status: 409 }
      );
    }

    // 3. Now check source quota (SaaS only) - we've confirmed this is a NEW source
    // Only check quota for WORKSPACE sources (global sources don't count against quota)
    if (IS_SAAS_MODE && targetScope === "WORKSPACE") {
      const quotaCheck = await checkQuota(session.user.id, QuotaType.SOURCE);
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          {
            error: "Source quota exceeded",
            message: quotaCheck.reason,
            usage: quotaCheck.usage,
            limit: quotaCheck.limit,
            upgradeUrl: "/pricing",
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // 4. Create new source with specified scope
    const domain = new URL(normalizedUrl).hostname;

    const newSource = await prisma.source.create({
      data: {
        url: normalizedUrl,
        domain,
        scope: targetScope,
        type: data.type,
        status: "PENDING",
        config: data.config,
        rescrapeSchedule: data.rescrapeSchedule || "NEVER",
        createdById: session.user.id,
        // Only create workspace link for WORKSPACE sources
        ...(targetScope === "WORKSPACE" && workspaceId
          ? {
              workspaceSources: {
                create: {
                  workspaceId,
                  addedBy: session.user.id,
                },
              },
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            pages: true,
            workspaceSources: true,
          },
        },
      },
    });

    // Check for existing jobs (shouldn't happen for new source, but safety check)
    const existingJob = await prisma.job.findFirst({
      where: {
        sourceId: newSource.id,
        status: { in: ["PENDING", "RUNNING"] },
      },
    });

    let job;
    if (existingJob) {
      console.warn(`[API] Job already exists for new source ${newSource.id}, using existing job`);
      job = existingJob;
    } else {
      // Create a job record with proper pipeline progress structure
      job = await prisma.job.create({
        data: {
          sourceId: newSource.id,
          type: "SCRAPE",
          status: "PENDING",
          progress: {
            queued: 0,
            fetching: 0,
            extracting: 0,
            embedding: 0,
            saving: 0,
            completed: 0,
            failed: 0,
            total: 0,
          },
        },
      });

      // Queue scraping job
      await addScrapeJob(newSource.id);
    }

    // Track usage (SaaS only) - only count WORKSPACE sources against quota
    // Global sources are free and available to all users
    if (IS_SAAS_MODE && targetScope === "WORKSPACE") {
      await trackUsage({
        userId: session.user.id,
        eventType: UsageEventType.SOURCE_ADDED,
        count: 1,
        metadata: {
          sourceId: newSource.id,
          url: normalizedUrl,
          type: data.type,
          scope: targetScope,
          workspaceId,
        },
      });
    }

    return NextResponse.json(
      {
        source: newSource,
        job,
        message:
          targetScope === "GLOBAL"
            ? "Global source created and scraping job queued - will be available to all users once indexed"
            : "Source created and scraping job queued",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API] POST /api/sources error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
