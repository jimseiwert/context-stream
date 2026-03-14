// Jobs List API
// GET /api/jobs — list jobs with optional filters

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, sources } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { eq, desc, and } from "drizzle-orm";
import type { JobStatus } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") as JobStatus | null;
    const sourceId = searchParams.get("sourceId");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;

    // Build where conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(jobs.status, status));
    }
    if (sourceId) {
      conditions.push(eq(jobs.sourceId, sourceId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const jobList = await db
      .select({
        id: jobs.id,
        workspaceId: jobs.workspaceId,
        sourceId: jobs.sourceId,
        type: jobs.type,
        status: jobs.status,
        dispatchMode: jobs.dispatchMode,
        progress: jobs.progress,
        logs: jobs.logs,
        errorMessage: jobs.errorMessage,
        startedAt: jobs.startedAt,
        completedAt: jobs.completedAt,
        createdAt: jobs.createdAt,
        sourceName: sources.name,
        sourceType: sources.type,
        sourceUrl: sources.url,
      })
      .from(jobs)
      .leftJoin(sources, eq(jobs.sourceId, sources.id))
      .where(whereClause)
      .orderBy(desc(jobs.createdAt))
      .limit(limit);

    return NextResponse.json({ jobs: jobList });
  } catch (error) {
    return handleApiError(error);
  }
}
