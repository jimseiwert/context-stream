// Source Detail Page — Server Component
// Shows source info + documents scoped to this source

import { db } from "@/lib/db";
import { sources, pages, documents } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { eq, count, desc, ilike, and, sql } from "drizzle-orm";
import { DocumentsTable } from "@/components/documents/documents-table";
import type { DocumentItem } from "@/components/documents/documents-table";
import { DocumentsFilters } from "@/components/documents/documents-filters";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    page?: string;
    tab?: string;
  }>;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "secondary"> = {
  ACTIVE: "success",
  INDEXING: "info",
  PENDING: "warning",
  ERROR: "error",
  PAUSED: "secondary",
};

export default async function SourceDetailPage({ params, searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id: sourceId } = await params;
  const sp = await searchParams;
  const activeTab = sp.tab ?? "documents";
  const q = sp.q ?? "";
  const typeFilter = sp.type ?? "";
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 50;
  const offset = (pageNum - 1) * limit;

  // Fetch source
  const source = await db.query.sources.findFirst({
    where: eq(sources.id, sourceId),
    columns: {
      id: true,
      name: true,
      url: true,
      domain: true,
      type: true,
      status: true,
      pageCount: true,
      lastScrapedAt: true,
      lastUpdatedAt: true,
      errorMessage: true,
      rescrapeSchedule: true,
      config: true,
      createdAt: true,
    },
  });

  if (!source) notFound();

  // Health stats
  const [pageCountResult] = await db
    .select({ count: count() })
    .from(pages)
    .where(eq(pages.sourceId, sourceId));

  const [docCountResult] = await db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.sourceId, sourceId));

  const [chunkCountResult] = await db.execute(
    sql`SELECT COUNT(*) as count FROM chunks WHERE chunks."pageId" IN (SELECT id FROM pages WHERE pages."sourceId" = ${sourceId}) OR chunks."documentId" IN (SELECT id FROM documents WHERE documents."sourceId" = ${sourceId})`
  );

  const pageCount = Number(pageCountResult?.count ?? 0);
  const docCount = Number(docCountResult?.count ?? 0);
  const chunkCount = Number((chunkCountResult as { count: string | number })?.count ?? 0);

  // Documents for this source
  const items: DocumentItem[] = [];
  let total = 0;

  if (!typeFilter || typeFilter === "page") {
    const pageConditions = [eq(pages.sourceId, sourceId)];
    if (q) pageConditions.push(ilike(pages.title, `%${q}%`));
    const pageWhere = and(...pageConditions);

    const [pc] = await db.select({ count: count() }).from(pages).where(pageWhere);
    total += Number(pc?.count ?? 0);

    const pageRows = await db
      .select({
        id: pages.id,
        title: pages.title,
        url: pages.url,
        sourceId: pages.sourceId,
        indexedAt: pages.indexedAt,
        updatedAt: pages.updatedAt,
        chunkCount: sql<number>`(SELECT COUNT(*) FROM chunks WHERE chunks."pageId" = ${pages.id})`,
      })
      .from(pages)
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
        sourceName: source.name ?? source.url,
        sourceType: source.type,
        chunkCount: Number(row.chunkCount),
        indexedAt: row.indexedAt,
        createdAt: row.updatedAt,
      });
    }
  }

  if (!typeFilter || typeFilter === "document") {
    const docConditions = [eq(documents.sourceId, sourceId)];
    if (q) docConditions.push(ilike(documents.filename, `%${q}%`));
    const docWhere = and(...docConditions);

    const [dc] = await db.select({ count: count() }).from(documents).where(docWhere);
    total += Number(dc?.count ?? 0);

    const docRows = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        type: documents.type,
        size: documents.size,
        metadata: documents.metadata,
        sourceId: documents.sourceId,
        indexedAt: documents.indexedAt,
        uploadedAt: documents.uploadedAt,
        chunkCount: sql<number>`(SELECT COUNT(*) FROM chunks WHERE chunks."documentId" = ${documents.id})`,
      })
      .from(documents)
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
        sourceName: source.name ?? source.url,
        sourceType: source.type,
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--app-text-muted)" }}>
        <a href="/sources" className="hover:underline" style={{ color: "var(--app-text-muted)" }}>
          Sources
        </a>
        <span>/</span>
        <span style={{ color: "var(--app-text-primary)" }}>{source.name ?? source.domain}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold" style={{ color: "var(--app-text-primary)" }}>
              {source.name ?? source.domain}
            </h1>
            <Badge variant={STATUS_VARIANT[source.status] ?? "secondary"} className="text-[10px]">
              {source.status}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {source.type}
            </Badge>
          </div>
          <p className="text-xs mt-1 font-mono" style={{ color: "var(--app-text-muted)" }}>
            {source.url}
          </p>
        </div>
      </div>

      {/* Health stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pages", value: pageCount.toLocaleString() },
          { label: "Documents", value: docCount.toLocaleString() },
          { label: "Chunks", value: chunkCount.toLocaleString() },
          { label: "Last Indexed", value: formatDate(source.lastScrapedAt) },
        ].map((stat) => (
          <div key={stat.label} className="app-card p-4">
            <p className="section-label mb-2">{stat.label}</p>
            <p className="font-semibold" style={{ color: "var(--app-text-primary)" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Error message */}
      {source.errorMessage && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}
        >
          {source.errorMessage}
        </div>
      )}

      {/* Tab switcher */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg w-fit"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--app-card-border)" }}
      >
        {(["documents", "config"] as const).map((t) => (
          <a
            key={t}
            href={`/sources/${sourceId}?tab=${t}`}
            className="px-4 py-1.5 text-sm rounded-md capitalize transition-all"
            style={
              activeTab === t
                ? {
                    background: "rgba(16,185,129,0.12)",
                    color: "var(--app-accent-green, #10b981)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }
                : { color: "var(--app-text-secondary)", textDecoration: "none" }
            }
          >
            {t === "documents" ? `Documents (${total})` : "Config"}
          </a>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <DocumentsFilters
            sources={[]}
            currentSourceId=""
            currentType={typeFilter}
            currentQ={q}
          />
          <DocumentsTable
            items={items}
            total={total}
            page={pageNum}
            limit={limit}
          />
        </div>
      )}

      {activeTab === "config" && (
        <div className="app-card p-6 space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--app-text-primary)" }}>
            Source Configuration
          </h2>
          <div className="space-y-3 text-sm">
            <Row label="Rescrape schedule" value={source.rescrapeSchedule} />
            <Row label="Last updated" value={formatDate(source.lastUpdatedAt)} />
            <Row label="Created" value={formatDate(source.createdAt)} />
            {Boolean(source.config) && (
              <div>
                <p className="text-xs mb-2" style={{ color: "var(--app-text-muted)" }}>
                  Advanced config
                </p>
                <pre
                  className="text-xs p-3 rounded-lg overflow-auto"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    color: "var(--app-text-secondary)",
                    border: "1px solid var(--app-card-border)",
                  }}
                >
                  {JSON.stringify(source.config as Record<string, unknown>, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span style={{ color: "var(--app-text-muted)" }}>{label}</span>
      <span style={{ color: "var(--app-text-secondary)" }}>{value}</span>
    </div>
  );
}
