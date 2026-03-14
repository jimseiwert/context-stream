// Document Chunks API
// GET  /api/documents/[id]/chunks?type=page|document — list all chunks (no embedding vectors)
// PATCH /api/documents/[id]/chunks/[chunkId] is handled in a sibling route

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pages, documents, chunks } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/utils/errors";
import { eq } from "drizzle-orm";
import { generateEmbeddings } from "@/lib/embeddings/service";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/documents/[id]/chunks?type=page|document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["page", "document"].includes(type)) {
      throw new ValidationError("type query parameter must be 'page' or 'document'");
    }

    const condition = type === "page"
      ? eq(chunks.pageId, id)
      : eq(chunks.documentId, id);

    // Verify parent exists
    if (type === "page") {
      const parent = await db.query.pages.findFirst({
        where: eq(pages.id, id),
        columns: { id: true },
      });
      if (!parent) throw new NotFoundError("Page");
    } else {
      const parent = await db.query.documents.findFirst({
        where: eq(documents.id, id),
        columns: { id: true },
      });
      if (!parent) throw new NotFoundError("Document");
    }

    // Fetch chunks — exclude embedding vector from response
    const chunkRows = await db.query.chunks.findMany({
      where: condition,
      columns: {
        id: true,
        chunkIndex: true,
        content: true,
        metadata: true,
        createdAt: true,
        // embedding intentionally excluded
      },
      orderBy: (c, { asc }) => [asc(c.chunkIndex)],
    });

    // Add token count estimate and embedding preview
    const result = chunkRows.map((chunk) => ({
      ...chunk,
      tokenCountEstimate: Math.ceil(chunk.content.length / 4),
    }));

    return NextResponse.json({ chunks: result });
  } catch (error) {
    return handleApiError(error);
  }
}
