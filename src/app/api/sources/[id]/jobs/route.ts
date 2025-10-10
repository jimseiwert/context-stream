/**
 * Job Status API
 * GET /api/sources/[id]/jobs - Get current job status with progress
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sources/[id]/jobs
 * Get current running job status for a source
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

    // Find source and check access
    const source = await prisma.source.findUnique({
      where: { id },
      select: {
        id: true,
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

    // Check access: user must own the workspace or source must be global
    if (source.scope !== "GLOBAL" && source.workspaceSources.length === 0) {
      return NextResponse.json(
        { error: "You do not have permission to access this source" },
        { status: 403 }
      );
    }

    // Get the current running, pending, or most recent completed job
    const job = await prisma.job.findFirst({
      where: {
        sourceId: id,
        status: { in: ["PENDING", "RUNNING", "COMPLETED", "FAILED"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    if (!job) {
      return NextResponse.json({ job: null });
    }

    // Format progress data
    const progress = job.progress as any;

    return NextResponse.json({
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        progress: {
          queued: progress?.queued || 0,
          fetching: progress?.fetching || 0,
          extracting: progress?.extracting || 0,
          embedding: progress?.embedding || 0,
          saving: progress?.saving || 0,
          completed: progress?.completed || 0,
          failed: progress?.failed || 0,
          total: progress?.total || 0,
        },
      },
    });
  } catch (error: any) {
    console.error(`[API] GET /api/sources/${params.id}/jobs error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
