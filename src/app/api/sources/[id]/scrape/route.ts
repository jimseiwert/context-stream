/**
 * Source Re-scraping API
 * POST /api/sources/[id]/scrape - Trigger manual re-scraping
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { addScrapeJob } from "@/lib/jobs/queue";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RescrapeSchema = z.object({
  fullReindex: z.boolean().optional().default(false),
});

/**
 * POST /api/sources/[id]/scrape
 * Trigger a manual re-scraping of a source
 */
export async function POST(
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
    const data = RescrapeSchema.parse(body);

    // Find source and check ownership
    const source = await prisma.source.findUnique({
      where: { id },
      select: {
        id: true,
        scope: true,
        status: true,
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

    // Global sources can't be re-scraped by regular users
    if (source.scope === "GLOBAL") {
      return NextResponse.json(
        { error: "Cannot re-scrape global sources" },
        { status: 403 }
      );
    }

    // Check workspace ownership
    if (source.workspaceSources.length === 0) {
      return NextResponse.json(
        { error: "You do not have permission to re-scrape this source" },
        { status: 403 }
      );
    }

    // Check if there's already a job running for this source
    const runningJob = await prisma.job.findFirst({
      where: {
        sourceId: id,
        status: { in: ["PENDING", "RUNNING"] },
      },
    });

    if (runningJob) {
      return NextResponse.json(
        { error: "A scraping job is already running for this source" },
        { status: 409 }
      );
    }

    // If full reindex, delete existing pages
    if (data.fullReindex) {
      await prisma.page.deleteMany({
        where: { sourceId: id },
      });
    }

    // Update source status to PENDING
    await prisma.source.update({
      where: { id },
      data: {
        status: "PENDING",
        errorMessage: null,
      },
    });

    // Create a new job
    const job = await prisma.job.create({
      data: {
        sourceId: id,
        type: "SCRAPE",
        status: "PENDING",
        progress: {
          pagesScraped: 0,
          total: 0,
        },
      },
    });

    // Queue the scraping job
    await addScrapeJob(id);

    return NextResponse.json(
      {
        jobId: job.id,
        message: data.fullReindex
          ? "Full re-index started"
          : "Re-scraping started",
        estimatedTime: "5-10 minutes",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`[API] POST /api/sources/${params.id}/scrape error:`, error);

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
