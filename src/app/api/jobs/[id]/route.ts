/**
 * Job Status API Routes
 *
 * GET /api/jobs/[id] - Get job status and progress
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/[id]
 * Get job status, progress, and metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        source: {
          select: {
            id: true,
            url: true,
            domain: true,
            status: true,
            scope: true,
            workspaceSources: {
              select: {
                workspaceId: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify user has access to this job's source
    // For global sources, any authenticated user can access
    // For workspace sources, user must be the owner of the workspace
    if (job.source.scope === "WORKSPACE") {
      const hasAccess = await prisma.workspaceSource.findFirst({
        where: {
          sourceId: job.sourceId,
          workspace: {
            ownerId: session.user.id,
          },
        },
      });

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[API] GET /api/jobs/${id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
