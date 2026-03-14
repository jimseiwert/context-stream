// Trigger Route - POST /api/sources/[id]/trigger
// Enqueues a new scrape/index job for a source

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/utils/errors";
import { eq } from "drizzle-orm";
import { enqueueJob } from "@/lib/jobs/queue";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/sources/[id]/trigger — trigger a new scrape/index job
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = session.user.id;

    const source = await db.query.sources.findFirst({
      where: eq(sources.id, id),
      columns: { id: true, createdById: true, type: true, status: true },
    });

    if (!source) {
      throw new NotFoundError("Source");
    }

    // Only creator or admin can trigger
    if (
      source.createdById !== userId &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      throw new ForbiddenError("You do not have permission to trigger indexing for this source");
    }

    // Determine job type based on source type
    const jobType = source.type === "DOCUMENT" ? "DOCUMENT_UPLOAD" : "SCRAPE";

    const jobId = await enqueueJob(source.id, undefined, jobType);

    return NextResponse.json({ jobId, message: "Indexing job enqueued" });
  } catch (error) {
    return handleApiError(error);
  }
}
