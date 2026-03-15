// Admin System Page — Server Component
// Health, Embedding Config, Vector Store, Feature Flags

import { db } from "@/lib/db";
import {
  embeddingProviderConfigs,
  vectorStoreConfigs,
  jobs,
  chunks,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, gte, count, sql } from "drizzle-orm";
import {
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Zap,
  Settings,
} from "lucide-react";
import { SystemTabs } from "@/components/admin/system-tabs";
import { TestEmbeddingButton } from "@/components/admin/test-embedding-button";
import { EmbeddingConfigPanel } from "@/components/admin/embedding-config-panel";
import { VectorStorePanel } from "@/components/admin/vector-store-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Measure DB health by running SELECT 1 and measuring latency
async function getDatabaseHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function HealthCard({
  title,
  icon,
  status,
  value,
  sub,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  status: "ok" | "error" | "warn" | "unknown";
  value: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  const statusColor = {
    ok: "var(--app-accent-green)",
    error: "#ef4444",
    warn: "#f59e0b",
    unknown: "#9ca3af",
  }[status];

  const statusIcon = {
    ok: <CheckCircle2 size={14} style={{ color: statusColor }} />,
    error: <XCircle size={14} style={{ color: statusColor }} />,
    warn: <AlertTriangle size={14} style={{ color: statusColor }} />,
    unknown: (
      <span
        style={{
          display: "inline-block",
          width: "0.5rem",
          height: "0.5rem",
          borderRadius: "50%",
          background: statusColor,
        }}
      />
    ),
  }[status];

  return (
    <div
      className="app-card"
      style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "var(--app-text-muted)" }}>{icon}</span>
          <p
            className="section-label"
            style={{ margin: 0, fontSize: "0.7rem" }}
          >
            {title}
          </p>
        </div>
        {statusIcon}
      </div>

      <div>
        <p
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: statusColor,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--app-text-muted)",
              marginTop: "0.25rem",
            }}
          >
            {sub}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}

function FeatureFlag({
  name,
  envVar,
  enabled,
}: {
  name: string;
  envVar: string;
  enabled: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 1rem",
        borderRadius: "0.5rem",
        border: "1px solid var(--app-border, rgba(255,255,255,0.06))",
      }}
    >
      <div>
        <p
          style={{
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "var(--app-text-primary)",
          }}
        >
          {name}
        </p>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--app-text-muted)",
            fontFamily: "monospace",
            marginTop: "0.1rem",
          }}
        >
          {envVar}
        </p>
      </div>
      <span
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          borderRadius: "9999px",
          padding: "0.15rem 0.5rem",
          background: enabled ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.12)",
          color: enabled ? "var(--app-accent-green)" : "#9ca3af",
        }}
      >
        {enabled ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}

export default async function AdminSystemPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const currentUserRole =
    (session.user as { role?: string } | undefined)?.role ?? "USER";
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  // Parallel data fetches
  const [dbHealth, chunkCountResult, embeddingConfigs, vsConfigs, jobCounts] =
    await Promise.all([
      getDatabaseHealth(),
      db.select({ count: count() }).from(chunks),
      db.query.embeddingProviderConfigs.findMany({
        columns: {
          id: true,
          provider: true,
          model: true,
          dimensions: true,
          apiEndpoint: true,
          deploymentName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          useBatchForNew: true,
          useBatchForRescrape: true,
          additionalConfig: true,
        },
      }),
      db.query.vectorStoreConfigs.findMany({
        columns: {
          id: true,
          provider: true,
          additionalConfig: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // Job counts — last 24h for COMPLETED/FAILED; all for PENDING/RUNNING
      (async () => {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [pending] = await db
          .select({ count: count() })
          .from(jobs)
          .where(eq(jobs.status, "PENDING"));
        const [running] = await db
          .select({ count: count() })
          .from(jobs)
          .where(eq(jobs.status, "RUNNING"));
        const [completed] = await db
          .select({ count: count() })
          .from(jobs)
          .where(sql`${jobs.status} = 'COMPLETED' AND ${jobs.createdAt} >= ${since24h}`);
        const [failed] = await db
          .select({ count: count() })
          .from(jobs)
          .where(sql`${jobs.status} = 'FAILED' AND ${jobs.createdAt} >= ${since24h}`);
        return {
          pending: Number(pending?.count ?? 0),
          running: Number(running?.count ?? 0),
          completed: Number(completed?.count ?? 0),
          failed: Number(failed?.count ?? 0),
        };
      })(),
    ]);

  const chunkCount = Number(chunkCountResult[0]?.count ?? 0);

  const activeEmbedding =
    embeddingConfigs.find((c) => c.isActive) ?? null;

  // Feature flags
  const featureFlags = [
    {
      name: "RSS Feeds",
      envVar: "FEATURE_RSS_FEEDS",
      enabled: process.env.FEATURE_RSS_FEEDS === "true",
    },
    {
      name: "Confluence",
      envVar: "FEATURE_CONFLUENCE",
      enabled: process.env.FEATURE_CONFLUENCE === "true",
    },
    {
      name: "Notion",
      envVar: "FEATURE_NOTION",
      enabled: process.env.FEATURE_NOTION === "true",
    },
    {
      name: "Kubernetes Dispatch",
      envVar: "FEATURE_K8S_DISPATCH",
      enabled: process.env.FEATURE_K8S_DISPATCH === "true",
    },
    {
      name: "SaaS Mode",
      envVar: "NEXT_PUBLIC_SAAS_MODE",
      enabled:
        process.env.NEXT_PUBLIC_SAAS_MODE === "true" ||
        process.env.IS_SAAS_MODE === "true",
    },
  ];

  // Tab content
  const healthTab = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
      }}
    >
      <HealthCard
        title="Database"
        icon={<Database size={14} />}
        status={dbHealth.ok ? "ok" : "error"}
        value={dbHealth.ok ? "Online" : "Error"}
        sub={`Latency: ${dbHealth.latencyMs}ms${dbHealth.error ? ` — ${dbHealth.error}` : ""}`}
      />

      <HealthCard
        title="Vector Store"
        icon={<Database size={14} />}
        status="ok"
        value={chunkCount.toLocaleString()}
        sub="Total chunks stored"
      />

      <HealthCard
        title="Embedding Provider"
        icon={<Zap size={14} />}
        status={activeEmbedding ? "ok" : "warn"}
        value={activeEmbedding ? activeEmbedding.provider : "None"}
        sub={activeEmbedding ? `${activeEmbedding.model} · ${activeEmbedding.dimensions}d` : "No active config"}
      >
        <TestEmbeddingButton />
      </HealthCard>

      <HealthCard
        title="Job Queue"
        icon={<Server size={14} />}
        status={jobCounts.failed > 0 ? "warn" : "ok"}
        value={`${jobCounts.running} running`}
        sub={`${jobCounts.pending} pending · ${jobCounts.completed} done · ${jobCounts.failed} failed (24h)`}
      />
    </div>
  );

  const embeddingTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p className="section-label" style={{ fontSize: "0.7rem" }}>
        Embedding Provider Configs
      </p>
      <EmbeddingConfigPanel configs={embeddingConfigs} />
    </div>
  );

  const vectorStoreTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p className="section-label" style={{ fontSize: "0.7rem" }}>
        Vector Store Configs
      </p>
      <VectorStorePanel configs={vsConfigs} />
    </div>
  );

  const flagsTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <p className="section-label" style={{ fontSize: "0.7rem" }}>
          Feature Flags
        </p>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--app-text-muted)",
            marginTop: "0.25rem",
          }}
        >
          Feature flags are controlled via environment variables (read-only).
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {featureFlags.map((flag) => (
          <FeatureFlag
            key={flag.envVar}
            name={flag.name}
            envVar={flag.envVar}
            enabled={flag.enabled}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <Settings size={16} />
        </div>
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--app-text-primary)" }}
          >
            System
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--app-text-secondary)" }}
          >
            Health dashboard, embedding providers, vector stores, and feature
            flags
          </p>
        </div>
      </div>

      {/* Tabbed layout */}
      <div className="app-card" style={{ padding: "1.25rem" }}>
        <SystemTabs
          isSuperAdmin={isSuperAdmin}
          children={{
            health: healthTab,
            embedding: embeddingTab,
            vectorstore: vectorStoreTab,
            flags: flagsTab,
          }}
        />
      </div>
    </div>
  );
}
