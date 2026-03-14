// Page Management Queries - Drizzle ORM
// Handles all database operations for Pages and their content

import { and, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { chunks, pages, sources } from "@/lib/db/schema";

export interface CreatePageParams {
  sourceId: string;
  url: string;
  title: string | null;
  contentText: string;
  contentHtml: string | null;
  metadata?: unknown;
}

/**
 * Create or update a page based on URL uniqueness
 */
export async function upsertPage(params: CreatePageParams) {
  // Generate checksum for content
  const checksum = createHash("sha256")
    .update(params.contentText)
    .digest("hex");

  // Check if page exists
  const existing = await db.query.pages.findFirst({
    where: and(
      eq(pages.sourceId, params.sourceId),
      eq(pages.url, params.url)
    ),
    columns: {
      id: true,
      checksum: true,
    },
  });

  // If content hasn't changed, skip update
  if (existing && existing.checksum === checksum) {
    return { page: existing, updated: false };
  }

  // Upsert the page
  const [page] = await db
    .insert(pages)
    .values({
      sourceId: params.sourceId,
      url: params.url,
      title: params.title,
      contentText: params.contentText,
      contentHtml: params.contentHtml,
      metadata: params.metadata,
      checksum,
    })
    .onConflictDoUpdate({
      target: [pages.sourceId, pages.url],
      set: {
        title: params.title,
        contentText: params.contentText,
        contentHtml: params.contentHtml,
        metadata: params.metadata,
        checksum,
        updatedAt: new Date(),
      },
    })
    .returning();

  return { page, updated: !!existing };
}

/**
 * Get page by ID with chunks
 */
export async function getPageById(pageId: string) {
  const page = await db.query.pages.findFirst({
    where: eq(pages.id, pageId),
    with: {
      source: {
        columns: {
          id: true,
          url: true,
          domain: true,
          scope: true,
        },
      },
      chunks: {
        orderBy: chunks.chunkIndex,
        columns: {
          id: true,
          chunkIndex: true,
          content: true,
          metadata: true,
        },
      },
    },
  });

  return page;
}

/**
 * Get pages for a source with pagination
 */
export async function getPagesBySource(
  sourceId: string,
  params: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = params;

  const pagesQuery = db
    .select({
      id: pages.id,
      url: pages.url,
      title: pages.title,
      indexedAt: pages.indexedAt,
      updatedAt: pages.updatedAt,
      chunkCount: count(chunks.id),
    })
    .from(pages)
    .leftJoin(chunks, eq(chunks.pageId, pages.id))
    .where(eq(pages.sourceId, sourceId))
    .groupBy(pages.id)
    .orderBy(desc(pages.indexedAt))
    .limit(limit)
    .offset(offset);

  const totalQuery = db
    .select({ count: count() })
    .from(pages)
    .where(eq(pages.sourceId, sourceId));

  const [pagesResult, totalResult] = await Promise.all([
    pagesQuery,
    totalQuery,
  ]);

  return {
    pages: pagesResult.map((row: any) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      indexedAt: row.indexedAt,
      updatedAt: row.updatedAt,
      _count: {
        chunks: row.chunkCount,
      },
    })),
    total: totalResult[0]?.count || 0,
  };
}

/**
 * Search pages by text content (basic search, not hybrid)
 */
export async function searchPages(
  query: string,
  sourceIds: string[],
  limit = 20
) {
  // Use PostgreSQL full-text search
  const result = await db.execute<{
    id: string;
    title: string | null;
    url: string;
    source_id: string;
    rank: number;
  }>(sql`
    SELECT
      p.id,
      p.title,
      p.url,
      p."sourceId" as source_id,
      ts_rank(
        to_tsvector('english', p."contentText"),
        plainto_tsquery('english', ${query})
      ) as rank
    FROM pages p
    WHERE p."sourceId"::text = ANY(${sourceIds})
      AND to_tsvector('english', p."contentText") @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  return result as any;
}

/**
 * Delete pages for a source (typically before re-scraping)
 */
export async function deletePagesBySource(sourceId: string) {
  return await db.delete(pages).where(eq(pages.sourceId, sourceId));
}

/**
 * Delete a specific page
 */
export async function deletePage(pageId: string) {
  return await db.delete(pages).where(eq(pages.id, pageId));
}

/**
 * Get page statistics for a source
 */
export async function getSourcePageStats(sourceId: string) {
  const stats = await db
    .select({
      totalPages: count(),
      firstIndexed: sql<Date>`MIN(${pages.indexedAt})`,
      lastIndexed: sql<Date>`MAX(${pages.indexedAt})`,
      lastUpdated: sql<Date>`MAX(${pages.updatedAt})`,
    })
    .from(pages)
    .where(eq(pages.sourceId, sourceId));

  return {
    totalPages: stats[0]?.totalPages || 0,
    firstIndexed: stats[0]?.firstIndexed || null,
    lastIndexed: stats[0]?.lastIndexed || null,
    lastUpdated: stats[0]?.lastUpdated || null,
  };
}

/**
 * Batch create pages (for bulk import)
 */
export async function batchCreatePages(pagesData: CreatePageParams[]) {
  const data = pagesData.map((page: any) => ({
    sourceId: page.sourceId,
    url: page.url,
    title: page.title,
    contentText: page.contentText,
    contentHtml: page.contentHtml,
    metadata: page.metadata,
    checksum: createHash("sha256").update(page.contentText).digest("hex"),
  }));

  // Use insert with onConflictDoNothing for bulk insert
  return await db.insert(pages).values(data).onConflictDoNothing();
}

/**
 * Find outdated pages (for incremental updates)
 */
export async function findOutdatedPages(sourceId: string, olderThan: Date) {
  return await db
    .select({
      id: pages.id,
      url: pages.url,
      checksum: pages.checksum,
    })
    .from(pages)
    .where(and(eq(pages.sourceId, sourceId), lt(pages.updatedAt, olderThan)));
}
