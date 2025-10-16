/**
 * Job Status API
 * GET /api/sources/[id]/jobs - Get current job status with progress
 * DELETE /api/sources/[id]/jobs - Cancel running job
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { scrapeQueue } from "@/lib/jobs/queue";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sources/[id]/jobs
 * Get current running job status for a source
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

    // Get the current running job first, then pending, then most recent completed/failed
    // Priority: RUNNING > PENDING > COMPLETED/FAILED (most recent)
    const runningJob = await prisma.job.findFirst({
      where: {
        sourceId: id,
        status: "RUNNING",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        result: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    if (runningJob) {
      const progress = runningJob.progress as any;
      const result = runningJob.result as any;
      return NextResponse.json({
        job: {
          id: runningJob.id,
          type: runningJob.type,
          status: runningJob.status,
          startedAt: runningJob.startedAt,
          completedAt: runningJob.completedAt,
          createdAt: runningJob.createdAt,
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
          result: result || null,
        },
      });
    }

    // If no running job, get pending or most recent completed/failed job
    const job = await prisma.job.findFirst({
      where: {
        sourceId: id,
        status: { in: ["PENDING", "COMPLETED", "FAILED"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        result: true,
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
    const result = job.result as any;

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
        result: result || null,
      },
    });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[API] GET /api/sources/${id}/jobs error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sources/[id]/jobs
 * Cancel a running or pending job for a source
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Find the current running or pending job
    const job = await prisma.job.findFirst({
      where: {
        sourceId: id,
        status: { in: ["PENDING", "RUNNING"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!job) {
      return NextResponse.json(
        { error: "No active job found to cancel" },
        { status: 404 }
      );
    }

    // Update job status to FAILED (cancelled)
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: "Job cancelled by user",
      },
    });

    // Update source status back to ACTIVE
    await prisma.source.update({
      where: { id },
      data: {
        status: "ACTIVE",
      },
    });

    // Try to remove the job from the Bull queue
    try {
      const queue = scrapeQueue();
      const bullJob = await queue.getJob(`scrape-${id}-${job.createdAt.getTime()}`);
      if (bullJob) {
        await bullJob.remove();
        console.log(`[API] Removed job from Bull queue: ${bullJob.id}`);
      }
    } catch (queueError) {
      console.error("[API] Error removing job from queue:", queueError);
      // Continue anyway - the job is marked as failed in the database
    }

    console.log(`[API] Job ${job.id} cancelled by user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[API] DELETE /api/sources/${id}/jobs error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
