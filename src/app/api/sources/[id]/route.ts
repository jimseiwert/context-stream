// Sources API Routes - GET, PATCH, DELETE /api/sources/[id]

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, pages, documents, chunks } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/utils/errors";
import { eq, count } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/sources/[id] — source details with page count and recent jobs
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const source = await db.query.sources.findFirst({
      where: eq(sources.id, id),
    });

    if (!source) {
      throw new NotFoundError("Source");
    }

    // Count associated pages
    const [pageCountResult] = await db
      .select({ count: count() })
      .from(pages)
      .where(eq(pages.sourceId, id));

    // Count associated documents
    const [docCountResult] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.sourceId, id));

    return NextResponse.json({
      source: {
        ...source,
        pageCount: Number(pageCountResult?.count ?? 0),
        documentCount: Number(docCountResult?.count ?? 0),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/sources/[id] — update source config, name, or schedule
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = session.user.id;

    const source = await db.query.sources.findFirst({
      where: eq(sources.id, id),
      columns: { id: true, createdById: true },
    });

    if (!source) {
      throw new NotFoundError("Source");
    }

    // Only the creator or an admin can update
    if (source.createdById !== userId && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("You do not have permission to update this source");
    }

    const body = (await request.json()) as Record<string, unknown>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.name === "string") updates.name = body.name.trim();
    if (body.config && typeof body.config === "object") updates.config = body.config;
    if (typeof body.rescrapeSchedule === "string") {
      const valid = ["NEVER", "DAILY", "WEEKLY", "MONTHLY"];
      if (!valid.includes(body.rescrapeSchedule.toUpperCase())) {
        throw new ValidationError("rescrapeSchedule must be NEVER, DAILY, WEEKLY, or MONTHLY");
      }
      updates.rescrapeSchedule = body.rescrapeSchedule.toUpperCase();
    }
    if (typeof body.status === "string") {
      const valid = ["PENDING", "INDEXING", "ACTIVE", "ERROR", "PAUSED"];
      if (!valid.includes(body.status.toUpperCase())) {
        throw new ValidationError("Invalid status value");
      }
      updates.status = body.status.toUpperCase();
    }

    const [updated] = await db
      .update(sources)
      .set(updates as Parameters<typeof db.update>[0] extends unknown ? never : typeof updates)
      .where(eq(sources.id, id))
      .returning();

    return NextResponse.json({ source: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/sources/[id] — delete source and cascade pages/chunks/documents
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = session.user.id;

    const source = await db.query.sources.findFirst({
      where: eq(sources.id, id),
      columns: { id: true, createdById: true },
    });

    if (!source) {
      throw new NotFoundError("Source");
    }

    // Only the creator or an admin can delete
    if (source.createdById !== userId && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("You do not have permission to delete this source");
    }

    // Cascade: chunks referencing pages of this source
    // (Schema has onDelete cascade, but we do it manually for clarity)
    const sourcePagesResult = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.sourceId, id));

    for (const page of sourcePagesResult) {
      await db.delete(chunks).where(eq(chunks.pageId, page.id));
    }

    const sourceDocsResult = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.sourceId, id));

    for (const doc of sourceDocsResult) {
      await db.delete(chunks).where(eq(chunks.documentId, doc.id));
    }

    // Delete pages, documents, then the source itself
    await db.delete(pages).where(eq(pages.sourceId, id));
    await db.delete(documents).where(eq(documents.sourceId, id));
    await db.delete(sources).where(eq(sources.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
