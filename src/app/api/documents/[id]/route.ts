// Documents Detail API — GET /api/documents/[id], DELETE /api/documents/[id]
// Retrieves or deletes a single page or document including its chunks

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, pages, documents, chunks } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/utils/errors";
import { eq, and } from "drizzle-orm";
import { getActiveRagEngineConfig, deleteRagFile } from "@/lib/providers/rag-engine/ingest";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/documents/[id]?type=page|document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["page", "document"].includes(type)) {
      throw new ValidationError("type query parameter must be 'page' or 'document'");
    }

    if (type === "page") {
      const row = await db.query.pages.findFirst({
        where: eq(pages.id, id),
        with: {
          source: {
            columns: { id: true, name: true, type: true, url: true },
          },
          chunks: {
            columns: {
              id: true,
              chunkIndex: true,
              content: true,
              metadata: true,
              createdAt: true,
            },
            orderBy: (c, { asc }) => [asc(c.chunkIndex)],
          },
        },
      });

      if (!row) throw new NotFoundError("Page");

      // Strip embeddings — already excluded via columns selection
      return NextResponse.json({ item: row, type: "page" });
    } else {
      const row = await db.query.documents.findFirst({
        where: eq(documents.id, id),
        with: {
          source: {
            columns: { id: true, name: true, type: true, url: true },
          },
          chunks: {
            columns: {
              id: true,
              chunkIndex: true,
              content: true,
              metadata: true,
              createdAt: true,
            },
            orderBy: (c, { asc }) => [asc(c.chunkIndex)],
          },
        },
      });

      if (!row) throw new NotFoundError("Document");

      return NextResponse.json({ item: row, type: "document" });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/documents/[id]?type=page|document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["page", "document"].includes(type)) {
      throw new ValidationError("type query parameter must be 'page' or 'document'");
    }

    if (type === "page") {
      const existing = await db.query.pages.findFirst({
        where: eq(pages.id, id),
        columns: { id: true, ragFileId: true, sourceId: true },
      });
      if (!existing) throw new NotFoundError("Page");

      // Clean up RAG corpus file if one was uploaded
      if (existing.ragFileId) {
        const source = await db.query.sources.findFirst({
          where: eq(sources.id, existing.sourceId),
          columns: { ragEngineConfigId: true },
        });
        const ragConfig = await getActiveRagEngineConfig(source?.ragEngineConfigId ?? null);
        if (ragConfig) await deleteRagFile(ragConfig, existing.ragFileId);
      }

      // Chunks cascade delete via FK
      await db.delete(pages).where(eq(pages.id, id));
    } else {
      const existing = await db.query.documents.findFirst({
        where: eq(documents.id, id),
        columns: { id: true, ragFileId: true, sourceId: true },
      });
      if (!existing) throw new NotFoundError("Document");

      // Clean up RAG corpus file if one was uploaded
      if (existing.ragFileId) {
        const source = await db.query.sources.findFirst({
          where: eq(sources.id, existing.sourceId),
          columns: { ragEngineConfigId: true },
        });
        const ragConfig = await getActiveRagEngineConfig(source?.ragEngineConfigId ?? null);
        if (ragConfig) await deleteRagFile(ragConfig, existing.ragFileId);
      }

      // Chunks cascade delete via FK
      await db.delete(documents).where(eq(documents.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/documents/[id] — update metadata (e.g. tags)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["page", "document"].includes(type)) {
      throw new ValidationError("type query parameter must be 'page' or 'document'");
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (type === "page") {
      const existing = await db.query.pages.findFirst({
        where: eq(pages.id, id),
        columns: { id: true, metadata: true },
      });
      if (!existing) throw new NotFoundError("Page");

      const currentMeta = (existing.metadata as Record<string, unknown>) ?? {};
      const updatedMeta = { ...currentMeta, ...((body.metadata as Record<string, unknown>) ?? {}) };

      const [updated] = await db
        .update(pages)
        .set({ metadata: updatedMeta, updatedAt: new Date() })
        .where(eq(pages.id, id))
        .returning({ id: pages.id, metadata: pages.metadata });

      return NextResponse.json({ item: updated });
    } else {
      const existing = await db.query.documents.findFirst({
        where: eq(documents.id, id),
        columns: { id: true, metadata: true },
      });
      if (!existing) throw new NotFoundError("Document");

      const currentMeta = (existing.metadata as Record<string, unknown>) ?? {};
      const updatedMeta = { ...currentMeta, ...((body.metadata as Record<string, unknown>) ?? {}) };

      const [updated] = await db
        .update(documents)
        .set({ metadata: updatedMeta, updatedAt: new Date() })
        .where(eq(documents.id, id))
        .returning({ id: documents.id, metadata: documents.metadata });

      return NextResponse.json({ item: updated });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
