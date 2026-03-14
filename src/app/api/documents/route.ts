// Documents API — GET /api/documents
// Lists pages and documents (both indexable content) across sources with filters

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, pages, documents, chunks } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { eq, and, or, desc, count, ilike, sql } from "drizzle-orm";

export interface DocumentItem {
  id: string;
  type: "page" | "document";
  title: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  mimeType?: string;
  size?: number;
  chunkCount: number;
  indexedAt: Date | null;
  createdAt: Date;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");
    const q = searchParams.get("q");
    const typeFilter = searchParams.get("type"); // "page" | "document"
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = (page - 1) * limit;

    const items: DocumentItem[] = [];
    let total = 0;

    // Fetch pages (unless type=document)
    if (!typeFilter || typeFilter === "page") {
      // Build page conditions
      const pageConditions = [];
      if (sourceId) pageConditions.push(eq(pages.sourceId, sourceId));
      if (q) pageConditions.push(ilike(pages.title, `%${q}%`));

      const pageWhere = pageConditions.length > 0 ? and(...pageConditions) : undefined;

      // Count pages
      const [pageCountResult] = await db
        .select({ count: count() })
        .from(pages)
        .where(pageWhere);

      const pageTotal = pageCountResult?.count ?? 0;

      // Fetch pages with source info and chunk counts
      const pageRows = await db
        .select({
          id: pages.id,
          title: pages.title,
          url: pages.url,
          sourceId: pages.sourceId,
          sourceName: sources.name,
          sourceType: sources.type,
          indexedAt: pages.indexedAt,
          updatedAt: pages.updatedAt,
          chunkCount: sql<number>`(
            SELECT COUNT(*) FROM chunks WHERE chunks."pageId" = ${pages.id}
          )`,
        })
        .from(pages)
        .innerJoin(sources, eq(pages.sourceId, sources.id))
        .where(pageWhere)
        .orderBy(desc(pages.indexedAt))
        .limit(limit)
        .offset(offset);

      total += Number(pageTotal);

      for (const row of pageRows) {
        items.push({
          id: row.id,
          type: "page",
          title: row.title ?? row.url,
          sourceId: row.sourceId,
          sourceName: row.sourceName ?? row.sourceId,
          sourceType: row.sourceType,
          chunkCount: Number(row.chunkCount),
          indexedAt: row.indexedAt,
          createdAt: row.updatedAt,
        });
      }
    }

    // Fetch documents (unless type=page)
    if (!typeFilter || typeFilter === "document") {
      // Build document conditions
      const docConditions = [];
      if (sourceId) docConditions.push(eq(documents.sourceId, sourceId));
      if (q) docConditions.push(ilike(documents.filename, `%${q}%`));

      const docWhere = docConditions.length > 0 ? and(...docConditions) : undefined;

      // Count documents
      const [docCountResult] = await db
        .select({ count: count() })
        .from(documents)
        .where(docWhere);

      const docTotal = docCountResult?.count ?? 0;

      // Fetch documents with source info and chunk counts
      const docRows = await db
        .select({
          id: documents.id,
          filename: documents.filename,
          type: documents.type,
          size: documents.size,
          metadata: documents.metadata,
          sourceId: documents.sourceId,
          sourceName: sources.name,
          sourceType: sources.type,
          indexedAt: documents.indexedAt,
          uploadedAt: documents.uploadedAt,
          chunkCount: sql<number>`(
            SELECT COUNT(*) FROM chunks WHERE chunks."documentId" = ${documents.id}
          )`,
        })
        .from(documents)
        .innerJoin(sources, eq(documents.sourceId, sources.id))
        .where(docWhere)
        .orderBy(desc(documents.uploadedAt))
        .limit(limit)
        .offset(offset);

      total += Number(docTotal);

      for (const row of docRows) {
        const meta = row.metadata as Record<string, unknown> | null;
        items.push({
          id: row.id,
          type: "document",
          title: row.filename,
          sourceId: row.sourceId,
          sourceName: row.sourceName ?? row.sourceId,
          sourceType: row.sourceType,
          mimeType: meta?.mimeType as string | undefined,
          size: row.size,
          chunkCount: Number(row.chunkCount),
          indexedAt: row.indexedAt,
          createdAt: row.uploadedAt,
        });
      }
    }

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
