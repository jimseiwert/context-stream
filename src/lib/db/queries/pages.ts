// Page Management Queries
// Handles all database operations for Pages and their content

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";

export interface CreatePageParams {
  sourceId: string;
  url: string;
  title: string | null;
  contentText: string;
  contentHtml: string | null;
  metadata?: Prisma.JsonValue;
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
  const existing = await prisma.page.findUnique({
    where: {
      sourceId_url: {
        sourceId: params.sourceId,
        url: params.url,
      },
    },
    select: { id: true, checksum: true },
  });

  // If content hasn't changed, skip update
  if (existing && existing.checksum === checksum) {
    return { page: existing, updated: false };
  }

  const page = await prisma.page.upsert({
    where: {
      sourceId_url: {
        sourceId: params.sourceId,
        url: params.url,
      },
    },
    create: {
      sourceId: params.sourceId,
      url: params.url,
      title: params.title,
      contentText: params.contentText,
      contentHtml: params.contentHtml,
      metadata: params.metadata as Prisma.InputJsonValue,
      checksum,
    },
    update: {
      title: params.title,
      contentText: params.contentText,
      contentHtml: params.contentHtml,
      metadata: params.metadata as Prisma.InputJsonValue,
      checksum,
      updatedAt: new Date(),
    },
  });

  return { page, updated: !!existing };
}

/**
 * Get page by ID with chunks
 */
export async function getPageById(pageId: string) {
  return prisma.page.findUnique({
    where: { id: pageId },
    include: {
      source: {
        select: {
          id: true,
          url: true,
          domain: true,
          scope: true,
        },
      },
      chunks: {
        orderBy: { chunkIndex: "asc" },
        select: {
          id: true,
          chunkIndex: true,
          content: true,
          metadata: true,
        },
      },
    },
  });
}

/**
 * Get pages for a source with pagination
 */
export async function getPagesBySource(
  sourceId: string,
  params: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = params;

  const [pages, total] = await prisma.$transaction([
    prisma.page.findMany({
      where: { sourceId },
      select: {
        id: true,
        url: true,
        title: true,
        indexedAt: true,
        updatedAt: true,
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { indexedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.page.count({
      where: { sourceId },
    }),
  ]);

  return { pages, total };
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
  const pages = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string | null;
      url: string;
      source_id: string;
      rank: number;
    }>
  >`
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
  `;

  return pages;
}

/**
 * Delete pages for a source (typically before re-scraping)
 */
export async function deletePagesBySource(sourceId: string) {
  return prisma.page.deleteMany({
    where: { sourceId },
  });
}

/**
 * Delete a specific page
 */
export async function deletePage(pageId: string) {
  return prisma.page.delete({
    where: { id: pageId },
  });
}

/**
 * Get page statistics for a source
 */
export async function getSourcePageStats(sourceId: string) {
  const stats = await prisma.page.aggregate({
    where: { sourceId },
    _count: true,
    _min: { indexedAt: true },
    _max: { indexedAt: true, updatedAt: true },
  });

  return {
    totalPages: stats._count,
    firstIndexed: stats._min.indexedAt,
    lastIndexed: stats._max.indexedAt,
    lastUpdated: stats._max.updatedAt,
  };
}

/**
 * Batch create pages (for bulk import)
 */
export async function batchCreatePages(pages: CreatePageParams[]) {
  const data = pages.map((page) => ({
    sourceId: page.sourceId,
    url: page.url,
    title: page.title,
    contentText: page.contentText,
    contentHtml: page.contentHtml,
    metadata: page.metadata || Prisma.JsonNull,
    checksum: createHash("sha256").update(page.contentText).digest("hex"),
  }));

  // Use createMany for bulk insert
  // Note: This will skip existing pages (no update)
  return prisma.page.createMany({
    data,
    skipDuplicates: true,
  });
}

/**
 * Find outdated pages (for incremental updates)
 */
export async function findOutdatedPages(sourceId: string, olderThan: Date) {
  return prisma.page.findMany({
    where: {
      sourceId,
      updatedAt: { lt: olderThan },
    },
    select: {
      id: true,
      url: true,
      checksum: true,
    },
  });
}
