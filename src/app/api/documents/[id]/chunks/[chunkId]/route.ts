// Chunk Edit API — PATCH /api/documents/[id]/chunks/[chunkId]
// Updates chunk content and triggers re-embedding

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chunks } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/utils/errors";
import { eq } from "drizzle-orm";
import { generateEmbeddings } from "@/lib/embeddings/service";

type RouteParams = { params: Promise<{ id: string; chunkId: string }> };

// PATCH /api/documents/[id]/chunks/[chunkId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { chunkId } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const newContent = typeof body.content === "string" ? body.content.trim() : null;
    if (!newContent) {
      throw new ValidationError("content is required and must be a non-empty string");
    }

    // Verify chunk exists
    const existing = await db.query.chunks.findFirst({
      where: eq(chunks.id, chunkId),
      columns: { id: true },
    });
    if (!existing) throw new NotFoundError("Chunk");

    // Re-embed the new content
    let newEmbedding: number[] | null = null;
    try {
      const embeddings = await generateEmbeddings([newContent]);
      newEmbedding = embeddings[0] ?? null;
    } catch (err) {
      console.warn("[ChunkEdit] Failed to generate embedding:", err);
    }

    // Update chunk
    const [updated] = await db
      .update(chunks)
      .set({
        content: newContent,
        embedding: newEmbedding,
        metadata: { ...((existing as { metadata?: Record<string, unknown> }).metadata ?? {}), editedAt: new Date().toISOString() },
      })
      .where(eq(chunks.id, chunkId))
      .returning({
        id: chunks.id,
        chunkIndex: chunks.chunkIndex,
        content: chunks.content,
        metadata: chunks.metadata,
        createdAt: chunks.createdAt,
      });

    return NextResponse.json({
      chunk: {
        ...updated,
        tokenCountEstimate: Math.ceil(newContent.length / 4),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
