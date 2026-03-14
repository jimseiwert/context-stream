// Documents Page — Server Component
// Lists all pages and documents across sources with URL-based filtering

import { db } from "@/lib/db";
import { sources, pages, documents } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, or, desc, count, ilike, and, sql } from "drizzle-orm";
import { DocumentsTable } from "@/components/documents/documents-table";
import type { DocumentItem } from "@/components/documents/documents-table";
import { DocumentsFilters } from "@/components/documents/documents-filters";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    sourceId?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = params.q ?? "";
  const sourceId = params.sourceId ?? "";
  const typeFilter = params.type ?? "";
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 50;
  const offset = (pageNum - 1) * limit;

  // Fetch sources for filter dropdown
  const sourceList = await db.query.sources.findMany({
    columns: { id: true, name: true, url: true, type: true },
    orderBy: [desc(sources.createdAt)],
  });

  const items: DocumentItem[] = [];
  let total = 0;

  // Fetch pages (unless type=document)
  if (!typeFilter || typeFilter === "page") {
    const pageConditions = [];
    if (sourceId) pageConditions.push(eq(pages.sourceId, sourceId));
    if (q) pageConditions.push(ilike(pages.title, `%${q}%`));
    const pageWhere = pageConditions.length > 0 ? and(...pageConditions) : undefined;

    const [pageCountResult] = await db
      .select({ count: count() })
      .from(pages)
      .where(pageWhere);
    total += Number(pageCountResult?.count ?? 0);

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
      .limit(typeFilter === "page" ? limit : Math.floor(limit / 2))
      .offset(typeFilter === "page" ? offset : Math.floor(offset / 2));

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
    const docConditions = [];
    if (sourceId) docConditions.push(eq(documents.sourceId, sourceId));
    if (q) docConditions.push(ilike(documents.filename, `%${q}%`));
    const docWhere = docConditions.length > 0 ? and(...docConditions) : undefined;

    const [docCountResult] = await db
      .select({ count: count() })
      .from(documents)
      .where(docWhere);
    total += Number(docCountResult?.count ?? 0);

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
      .limit(typeFilter === "document" ? limit : Math.floor(limit / 2))
      .offset(typeFilter === "document" ? offset : Math.floor(offset / 2));

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-text-primary)" }}>
          Documents
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--app-text-secondary)" }}>
          Browse, preview, and manage all indexed pages and documents.
        </p>
      </div>

      {/* Filters */}
      <DocumentsFilters
        sources={sourceList.map((s) => ({
          id: s.id,
          name: s.name ?? s.url,
          type: s.type,
        }))}
        currentSourceId={sourceId}
        currentType={typeFilter}
        currentQ={q}
      />

      {/* Table */}
      <DocumentsTable
        items={items}
        total={total}
        page={pageNum}
        limit={limit}
      />
    </div>
  );
}
