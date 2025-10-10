// Chunk Management Queries
// Handles all database operations for content chunks and embeddings

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export interface CreateChunkParams {
  pageId: string
  chunkIndex: number
  content: string
  embedding: number[]
  metadata?: Prisma.JsonValue
}

/**
 * Create chunks for a page with embeddings
 */
export async function createChunks(chunks: CreateChunkParams[]) {
  // First, delete existing chunks for these pages (if any)
  const pageIds = [...new Set(chunks.map((c) => c.pageId))]
  await prisma.chunk.deleteMany({
    where: {
      pageId: { in: pageIds },
    },
  })

  // Create new chunks
  // Note: Prisma doesn't support vector type directly in createMany
  // We need to use raw SQL for bulk insert with embeddings
  if (chunks.length === 0) return { count: 0 }

  // Build SQL for bulk insert
  const values = chunks.map((chunk, idx) => {
    const id = `gen_random_uuid()` // Use built-in PostgreSQL function (PG 13+)
    const pageId = `'${chunk.pageId}'::uuid`
    const chunkIndex = chunk.chunkIndex
    const content = `'${chunk.content.replace(/'/g, "''")}'`
    const embedding = `'[${chunk.embedding.join(',')}]'::vector`
    const metadata = chunk.metadata
      ? `'${JSON.stringify(chunk.metadata).replace(/'/g, "''")}'::jsonb`
      : 'NULL'

    return `(${id}, ${pageId}, ${chunkIndex}, ${content}, ${embedding}, ${metadata}, NOW())`
  }).join(',\n  ')

  const sql = `
    INSERT INTO chunks (id, "pageId", "chunkIndex", content, embedding, metadata, "createdAt")
    VALUES ${values}
  `

  await prisma.$executeRawUnsafe(sql)

  return { count: chunks.length }
}

/**
 * Get chunks for a page
 */
export async function getChunksByPage(pageId: string) {
  return prisma.chunk.findMany({
    where: { pageId },
    orderBy: { chunkIndex: 'asc' },
    select: {
      id: true,
      chunkIndex: true,
      content: true,
      metadata: true,
      // Note: embedding is excluded by default (large field)
    },
  })
}

/**
 * Get chunks with embeddings (for vector search)
 */
export async function getChunksWithEmbeddings(pageId: string) {
  // Use raw query to get embeddings
  return prisma.$queryRaw<
    Array<{
      id: string
      chunk_index: number
      content: string
      embedding: number[]
    }>
  >`
    SELECT
      id,
      "chunkIndex" as chunk_index,
      content,
      embedding::text as embedding
    FROM chunks
    WHERE "pageId" = ${pageId}::uuid
    ORDER BY "chunkIndex" ASC
  `
}

/**
 * Vector similarity search across all chunks
 */
export async function vectorSearch(
  queryEmbedding: number[],
  sourceIds: string[],
  limit = 100
) {
  // Convert embedding to pgvector format
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  return prisma.$queryRaw<
    Array<{
      chunk_id: string
      page_id: string
      content: string
      similarity: number
      chunk_index: number
    }>
  >`
    SELECT
      c.id as chunk_id,
      c."pageId" as page_id,
      c.content,
      c."chunkIndex" as chunk_index,
      1 - (c.embedding <=> ${embeddingStr}::vector) as similarity
    FROM chunks c
    INNER JOIN pages p ON c."pageId" = p.id
    WHERE p."sourceId"::text = ANY(${sourceIds})
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `
}

/**
 * Delete chunks for a page
 */
export async function deleteChunksByPage(pageId: string) {
  return prisma.chunk.deleteMany({
    where: { pageId },
  })
}

/**
 * Delete chunks for a source (via pages)
 */
export async function deleteChunksBySource(sourceId: string) {
  return prisma.chunk.deleteMany({
    where: {
      page: {
        sourceId,
      },
    },
  })
}

/**
 * Count chunks for a source
 */
export async function countChunksBySource(sourceId: string) {
  return prisma.chunk.count({
    where: {
      page: {
        sourceId,
      },
    },
  })
}

/**
 * Get chunk statistics for a source
 */
export async function getChunkStats(sourceId: string) {
  const stats = await prisma.$queryRaw<
    Array<{
      total_chunks: number
      chunks_with_embeddings: number
      avg_chunk_length: number
    }>
  >`
    SELECT
      COUNT(*) as total_chunks,
      COUNT(c.embedding) as chunks_with_embeddings,
      AVG(LENGTH(c.content)) as avg_chunk_length
    FROM chunks c
    INNER JOIN pages p ON c."pageId" = p.id
    WHERE p."sourceId"::text = ${sourceId}
  `

  return stats[0] || {
    total_chunks: 0,
    chunks_with_embeddings: 0,
    avg_chunk_length: 0,
  }
}

/**
 * Find chunks missing embeddings
 */
export async function findChunksWithoutEmbeddings(
  sourceId: string,
  limit = 100
) {
  return prisma.chunk.findMany({
    where: {
      page: {
        sourceId,
      },
      embedding: null,
    },
    select: {
      id: true,
      pageId: true,
      content: true,
      chunkIndex: true,
    },
    take: limit,
  })
}

/**
 * Update chunk embedding
 */
export async function updateChunkEmbedding(
  chunkId: string,
  embedding: number[]
) {
  const embeddingStr = `[${embedding.join(',')}]`

  await prisma.$executeRawUnsafe(`
    UPDATE chunks
    SET embedding = '${embeddingStr}'::vector
    WHERE id = '${chunkId}'::uuid
  `)

  return { success: true }
}

/**
 * Batch update embeddings for multiple chunks
 */
export async function batchUpdateEmbeddings(
  updates: Array<{ id: string; embedding: number[] }>
) {
  // Use transaction for batch updates
  const queries = updates.map((update) => {
    const embeddingStr = `[${update.embedding.join(',')}]`
    return prisma.$executeRawUnsafe(`
      UPDATE chunks
      SET embedding = '${embeddingStr}'::vector
      WHERE id = '${update.id}'::uuid
    `)
  })

  await prisma.$transaction(queries)

  return { count: updates.length }
}
