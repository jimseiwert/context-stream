// Chunk Management Queries - Drizzle ORM
// Handles all database operations for content chunks and embeddings

import { and, avg, count, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chunks, pages } from "@/lib/db/schema";

export interface CreateChunkParams {
  pageId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata?: unknown;
}

/**
 * Create chunks for a page with embeddings
 */
export async function createChunks(chunksData: CreateChunkParams[]) {
  if (chunksData.length === 0) return { count: 0 };

  // First, delete existing chunks for these pages
  const pageIds = Array.from(new Set(chunksData.map((c: any) => c.pageId)));
  await db.delete(chunks).where(inArray(chunks.pageId, pageIds));

  // Prepare insert data
  const values = chunksData.map((chunk: any) => ({
    pageId: chunk.pageId,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    embedding: chunk.embedding,
    metadata: chunk.metadata,
  }));

  // Insert chunks
  await db.insert(chunks).values(values);

  return { count: chunksData.length };
}

/**
 * Get chunks for a page
 */
export async function getChunksByPage(pageId: string) {
  return await db
    .select({
      id: chunks.id,
      chunkIndex: chunks.chunkIndex,
      content: chunks.content,
      metadata: chunks.metadata,
    })
    .from(chunks)
    .where(eq(chunks.pageId, pageId))
    .orderBy(chunks.chunkIndex);
}

/**
 * Get chunks with embeddings (for vector search)
 */
export async function getChunksWithEmbeddings(pageId: string) {
  return await db
    .select({
      id: chunks.id,
      chunk_index: chunks.chunkIndex,
      content: chunks.content,
      embedding: chunks.embedding,
    })
    .from(chunks)
    .where(eq(chunks.pageId, pageId))
    .orderBy(chunks.chunkIndex);
}

/**
 * Vector similarity search across all chunks
 */
export async function vectorSearch(
  queryEmbedding: number[],
  sourceIds: string[],
  limit = 100
) {
  // Convert embedding to pgvector format string
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Use raw SQL for vector similarity search
  const result = await db.execute<{
    chunk_id: string;
    page_id: string;
    content: string;
    similarity: number;
    chunk_index: number;
  }>(sql`
    SELECT
      c.id as chunk_id,
      c."pageId" as page_id,
      c.content,
      c."chunkIndex" as chunk_index,
      1 - (c.embedding <=> ${embeddingStr}::vector) as similarity
    FROM ${chunks} c
    INNER JOIN ${pages} p ON c."pageId" = p.id
    WHERE p."sourceId"::text = ANY(${sourceIds})
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  return result as any;
}

/**
 * Delete chunks for a page
 */
export async function deleteChunksByPage(pageId: string) {
  return await db.delete(chunks).where(eq(chunks.pageId, pageId));
}

/**
 * Delete chunks for a source (via pages)
 */
export async function deleteChunksBySource(sourceId: string) {
  // Get all page IDs for this source
  const sourcePages = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.sourceId, sourceId));

  const pageIds = sourcePages.map((p: any) => p.id);

  if (pageIds.length === 0) return;

  return await db.delete(chunks).where(inArray(chunks.pageId, pageIds));
}

/**
 * Count chunks for a source
 */
export async function countChunksBySource(sourceId: string) {
  const result = await db
    .select({ count: count() })
    .from(chunks)
    .innerJoin(pages, eq(pages.id, chunks.pageId))
    .where(eq(pages.sourceId, sourceId));

  return result[0]?.count || 0;
}

/**
 * Get chunk statistics for a source
 */
export async function getChunkStats(sourceId: string) {
  const result = await db
    .select({
      total_chunks: count(),
      chunks_with_embeddings: count(chunks.embedding),
      avg_chunk_length: avg(sql`LENGTH(${chunks.content})`),
    })
    .from(chunks)
    .innerJoin(pages, eq(pages.id, chunks.pageId))
    .where(eq(pages.sourceId, sourceId));

  return (
    result[0] || {
      total_chunks: 0,
      chunks_with_embeddings: 0,
      avg_chunk_length: 0,
    }
  );
}

/**
 * Find chunks missing embeddings
 */
export async function findChunksWithoutEmbeddings(
  sourceId: string,
  limit = 100
) {
  return await db
    .select({
      id: chunks.id,
      pageId: chunks.pageId,
      content: chunks.content,
      chunkIndex: chunks.chunkIndex,
    })
    .from(chunks)
    .innerJoin(pages, eq(pages.id, chunks.pageId))
    .where(and(eq(pages.sourceId, sourceId), isNull(chunks.embedding)))
    .limit(limit);
}

/**
 * Update chunk embedding
 */
export async function updateChunkEmbedding(
  chunkId: string,
  embedding: number[]
) {
  await db
    .update(chunks)
    .set({ embedding })
    .where(eq(chunks.id, chunkId));

  return { success: true };
}

/**
 * Batch update embeddings for multiple chunks
 */
export async function batchUpdateEmbeddings(
  updates: Array<{ id: string; embedding: number[] }>
) {
  await db.transaction(async (tx) => {
    for (const update of updates) {
      await tx
        .update(chunks)
        .set({ embedding: update.embedding })
        .where(eq(chunks.id, update.id));
    }
  });

  return { count: updates.length };
}
