// Job Detail API
// GET /api/jobs/[id] — job details with source info
// DELETE /api/jobs/[id] — cancel a running job

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, sources } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/utils/errors";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    const [job] = await db
      .select({
        id: jobs.id,
        workspaceId: jobs.workspaceId,
        sourceId: jobs.sourceId,
        type: jobs.type,
        status: jobs.status,
        dispatchMode: jobs.dispatchMode,
        progress: jobs.progress,
        result: jobs.result,
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
      .where(eq(jobs.id, id));

    if (!job) {
      throw new NotFoundError("Job");
    }

    return NextResponse.json({ job });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    const [existing] = await db
      .select({ id: jobs.id, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, id));

    if (!existing) {
      throw new NotFoundError("Job");
    }

    const terminalStatuses = ["COMPLETED", "FAILED", "CANCELLED"] as const;
    if (terminalStatuses.includes(existing.status as typeof terminalStatuses[number])) {
      throw new ValidationError(
        `Cannot cancel a job with status ${existing.status}`
      );
    }

    const [updated] = await db
      .update(jobs)
      .set({ status: "CANCELLED", completedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning({
        id: jobs.id,
        status: jobs.status,
        completedAt: jobs.completedAt,
      });

    return NextResponse.json({ job: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
