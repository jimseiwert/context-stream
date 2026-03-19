// Sources API Routes - GET /api/sources, POST /api/sources
// POST enforces sources quota when NEXT_PUBLIC_SAAS_MODE=true.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, workspaceSources } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import {
  handleApiError,
  ValidationError,
} from "@/lib/utils/errors";
import { eq, or, desc } from "drizzle-orm";
import { enqueueJob } from "@/lib/jobs/queue";
import { checkQuota } from "@/lib/subscriptions/usage-tracker";

const saasMode = process.env.NEXT_PUBLIC_SAAS_MODE === "true";

// GET /api/sources — list sources accessible to the authenticated user
// Returns GLOBAL sources plus workspace-scoped sources linked to the user's workspaces
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Parse optional workspaceId query param
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    let sourceList;

    if (workspaceId) {
      // Get sources linked to the specific workspace + global sources
      const workspaceSrcRows = await db.query.workspaceSources.findMany({
        where: eq(workspaceSources.workspaceId, workspaceId),
        with: {
          source: true,
        },
      });

      const linkedSourceIds = new Set(workspaceSrcRows.map((ws) => ws.sourceId));

      // Also fetch global sources
      const globalSources = await db.query.sources.findMany({
        where: eq(sources.scope, "GLOBAL"),
        orderBy: [desc(sources.createdAt)],
      });

      // Merge: workspace sources + global sources (deduplicated)
      const workspaceOnlySources = workspaceSrcRows.map((ws) => ws.source);
      const globalOnly = globalSources.filter((s) => !linkedSourceIds.has(s.id));

      sourceList = [...workspaceOnlySources, ...globalOnly];
    } else {
      // Return all sources the user created + all global sources
      sourceList = await db.query.sources.findMany({
        where: or(
          eq(sources.scope, "GLOBAL"),
          eq(sources.createdById, userId)
        ),
        orderBy: [desc(sources.createdAt)],
      });
    }

    return NextResponse.json({ sources: sourceList });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/sources — create a new source and optionally trigger initial indexing
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Quota enforcement (SaaS mode only)
    if (saasMode) {
      const quota = await checkQuota(userId, "sources");
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: "quota_exceeded",
            resource: "sources",
            used: quota.used,
            limit: quota.limit,
            upgrade_url: "/settings/billing",
          },
          { status: 402 }
        );
      }
    }

    const body = (await request.json()) as Record<string, unknown>;

    const url = typeof body.url === "string" ? body.url.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : undefined;
    const config = body.config && typeof body.config === "object" ? body.config : {};
    const scope = typeof body.scope === "string" ? body.scope.toUpperCase() : "WORKSPACE";
    const ragEngineConfigId = typeof body.ragEngineConfigId === "string" ? body.ragEngineConfigId : null;
    const vectorStoreConfigId = typeof body.vectorStoreConfigId === "string" ? body.vectorStoreConfigId : null;

    if (!url) {
      throw new ValidationError("url is required");
    }
    if (!["WEBSITE", "GITHUB", "DOCUMENT"].includes(type)) {
      throw new ValidationError("type must be WEBSITE, GITHUB, or DOCUMENT");
    }
    if (!["GLOBAL", "WORKSPACE"].includes(scope)) {
      throw new ValidationError("scope must be GLOBAL or WORKSPACE");
    }

    // Extract domain from URL
    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch {
      throw new ValidationError("url must be a valid URL");
    }

    // Insert source
    const [source] = await db
      .insert(sources)
      .values({
        url,
        domain,
        name: name ?? null,
        type: type as "WEBSITE" | "GITHUB" | "DOCUMENT",
        scope: scope as "GLOBAL" | "WORKSPACE",
        config: config as Record<string, unknown>,
        status: "PENDING",
        createdById: userId,
        ragEngineConfigId: ragEngineConfigId ?? null,
        vectorStoreConfigId: vectorStoreConfigId ?? null,
      })
      .returning();

    // If workspaceId provided, link to workspace
    if (workspaceId) {
      await db.insert(workspaceSources).values({
        workspaceId,
        sourceId: source.id,
        addedBy: userId,
      });
    }

    // Trigger initial indexing job unless DOCUMENT type (documents upload separately)
    let jobId: string | undefined;
    if (type !== "DOCUMENT") {
      jobId = await enqueueJob(source.id, workspaceId, "SCRAPE");
    }

    return NextResponse.json(
      { source, jobId },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
