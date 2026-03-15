// Admin Usage Page — Server Component
// Per-workspace usage analytics with time range filter and CSV export

import { db } from "@/lib/db";
import {
  workspaces,
  users,
  workspaceSources,
  pages,
  documents,
  chunks,
  queryLogs,
  subscriptions,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, count, sql } from "drizzle-orm";
import { BarChart3 } from "lucide-react";
import { UsageRangeSelector } from "@/components/admin/usage-range-selector";
import { ExportCsvButton } from "@/components/admin/export-csv-button";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WorkspaceStat = {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  sourceCount: number;
  pageCount: number;
  documentCount: number;
  chunkCount: number;
  apiCallCount: number;
  subscriptionTier: string;
};

function getRangeStart(range: string): Date {
  const now = new Date();
  switch (range) {
    case "90d":
      now.setDate(now.getDate() - 90);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    default:
      now.setDate(now.getDate() - 7);
      break;
  }
  return now;
}

function CssBarChart({
  stats,
  metric,
  label,
}: {
  stats: WorkspaceStat[];
  metric: keyof WorkspaceStat;
  label: string;
}) {
  const values = stats.map((s) => s[metric] as number);
  const maxVal = Math.max(...values, 1);

  return (
    <div
      className="app-card"
      style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <p className="section-label" style={{ margin: 0, fontSize: "0.7rem" }}>
        {label}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {stats.slice(0, 8).map((s) => {
          const val = s[metric] as number;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div
              key={s.workspaceId}
              style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
            >
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "var(--app-text-secondary)",
                  width: "8rem",
                  flexShrink: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={s.workspaceName}
              >
                {s.workspaceName}
              </p>
              <div
                style={{
                  flex: 1,
                  height: "0.5rem",
                  background: "var(--app-bg-secondary, rgba(255,255,255,0.04))",
                  borderRadius: "9999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: "var(--app-accent-green)",
                    borderRadius: "9999px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--app-text-muted)",
                  width: "3rem",
                  textAlign: "right" as const,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {val.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function UsageContent({ range }: { range: string }) {
  const rangeStart = getRangeStart(range);

  // Fetch all workspaces
  const wsRows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      ownerId: workspaces.ownerId,
    })
    .from(workspaces)
    .orderBy(workspaces.name);

  const stats: WorkspaceStat[] = await Promise.all(
    wsRows.map(async (ws) => {
      // Owner email
      let ownerEmail = "—";
      if (ws.ownerId) {
        const owner = await db.query.users.findFirst({
          where: eq(users.id, ws.ownerId),
          columns: { email: true },
        });
        ownerEmail = owner?.email ?? "—";
      }

      // Sources linked to workspace
      const [srcCount] = await db
        .select({ count: count() })
        .from(workspaceSources)
        .where(eq(workspaceSources.workspaceId, ws.id));
      const sourceCount = Number(srcCount?.count ?? 0);

      // Pages + docs via linked sources
      const linkedSources = await db
        .select({ sourceId: workspaceSources.sourceId })
        .from(workspaceSources)
        .where(eq(workspaceSources.workspaceId, ws.id));

      let pageCount = 0;
      let documentCount = 0;
      let chunkCount = 0;

      for (const { sourceId } of linkedSources) {
        const [pc] = await db
          .select({ count: count() })
          .from(pages)
          .where(eq(pages.sourceId, sourceId));
        pageCount += Number(pc?.count ?? 0);

        const [dc] = await db
          .select({ count: count() })
          .from(documents)
          .where(eq(documents.sourceId, sourceId));
        documentCount += Number(dc?.count ?? 0);

        // Chunk count from pages
        const pgRows = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.sourceId, sourceId));
        for (const pg of pgRows) {
          const [cc] = await db
            .select({ count: count() })
            .from(chunks)
            .where(eq(chunks.pageId, pg.id));
          chunkCount += Number(cc?.count ?? 0);
        }
      }

      // API calls within range
      const [qLogCount] = await db
        .select({ count: count() })
        .from(queryLogs)
        .where(
          sql`${queryLogs.workspaceId} = ${ws.id} AND ${queryLogs.createdAt} >= ${rangeStart}`
        );
      const apiCallCount = Number(qLogCount?.count ?? 0);

      // Subscription tier
      let subscriptionTier = "NONE";
      if (ws.ownerId) {
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, ws.ownerId),
          columns: { planTier: true },
        });
        subscriptionTier = sub?.planTier ?? "NONE";
      }

      return {
        workspaceId: ws.id,
        workspaceName: ws.name,
        ownerEmail,
        sourceCount,
        pageCount,
        documentCount,
        chunkCount,
        apiCallCount,
        subscriptionTier,
      };
    })
  );

  const planColors: Record<string, string> = {
    FREE: "#9ca3af",
    STARTER: "#60a5fa",
    PRO: "#a78bfa",
    TEAM: "#f59e0b",
    ENTERPRISE: "var(--app-accent-green)",
    SELF_HOSTED: "#10b981",
    NONE: "#374151",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Bar charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        <CssBarChart stats={stats} metric="chunkCount" label="Chunks by Workspace" />
        <CssBarChart stats={stats} metric="apiCallCount" label={`API Calls (${range})`} />
      </div>

      {/* Table */}
      <div className="app-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom:
                    "1px solid var(--app-border, rgba(255,255,255,0.06))",
                }}
              >
                {[
                  "Workspace",
                  "Owner",
                  "Sources",
                  "Pages",
                  "Docs",
                  "Chunks",
                  "API Calls",
                  "Plan",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left" as const,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      color: "var(--app-text-muted)",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, idx) => (
                <tr
                  key={s.workspaceId}
                  style={{
                    borderBottom:
                      idx < stats.length - 1
                        ? "1px solid var(--app-border, rgba(255,255,255,0.04))"
                        : "none",
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        color: "var(--app-text-primary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.workspaceName}
                    </p>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--app-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.ownerEmail}
                    </p>
                  </td>
                  {[s.sourceCount, s.pageCount, s.documentCount, s.chunkCount, s.apiCallCount].map(
                    (val, vi) => (
                      <td
                        key={vi}
                        style={{ padding: "0.75rem 1rem" }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--app-text-primary)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {val.toLocaleString()}
                        </span>
                      </td>
                    )
                  )}
                  <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        color: planColors[s.subscriptionTier] ?? "#9ca3af",
                        background: `${planColors[s.subscriptionTier] ?? "#9ca3af"}20`,
                        borderRadius: "9999px",
                        padding: "0.1rem 0.4rem",
                      }}
                    >
                      {s.subscriptionTier}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "var(--app-text-muted)",
                      fontSize: "0.875rem",
                    }}
                  >
                    No workspaces found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const params = await searchParams;
  const range = ["7d", "30d", "90d"].includes(params.range ?? "")
    ? (params.range as string)
    : "7d";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              background: "rgba(16,185,129,0.1)",
              color: "var(--app-accent-green)",
              flexShrink: 0,
            }}
          >
            <BarChart3 size={16} />
          </div>
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "var(--app-text-primary)" }}
            >
              Usage Analytics
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--app-text-secondary)" }}
            >
              Per-workspace metrics
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Suspense>
            <UsageRangeSelector current={range} />
          </Suspense>
          <ExportCsvButton range={range} />
        </div>
      </div>

      <Suspense
        fallback={
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--app-text-muted)",
              fontSize: "0.875rem",
            }}
          >
            Loading usage data...
          </div>
        }
      >
        <UsageContent range={range} />
      </Suspense>
    </div>
  );
}
