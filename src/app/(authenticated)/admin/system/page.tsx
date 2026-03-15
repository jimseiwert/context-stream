// Admin System Page — Server Component
// Health, Embedding Config, Vector Store, Feature Flags, Enterprise (License + SSO)

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
import { eq, and, gte, count, sql } from "drizzle-orm";
import {
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Zap,
  Settings,
  Cpu,
  ShieldCheck,
  Key,
} from "lucide-react";
import { SystemTabs } from "@/components/admin/system-tabs";
import { TestEmbeddingButton } from "@/components/admin/test-embedding-button";
import { EmbeddingConfigPanel } from "@/components/admin/embedding-config-panel";
import { VectorStorePanel } from "@/components/admin/vector-store-panel";
import { validateLicense, isLicenseValid, hasLicenseFeature } from "@/lib/license";

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

// ---------------------------------------------------------------------------
// Enterprise UI helpers
// ---------------------------------------------------------------------------

function FeatureBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        fontSize: "0.65rem",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
        borderRadius: "9999px",
        padding: "0.2rem 0.6rem",
        background: active ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.10)",
        color: active ? "var(--app-accent-green)" : "#9ca3af",
        border: `1px solid ${active ? "rgba(16,185,129,0.25)" : "rgba(107,114,128,0.15)"}`,
      }}
    >
      {label}
    </span>
  );
}

interface SsoEnvVarRowProps {
  label: string;
  envVar: string;
  isSet: boolean;
}

function SsoEnvVarRow({ label, envVar, isSet }: SsoEnvVarRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.5rem 0.75rem",
        borderRadius: "0.375rem",
        background: "rgba(255,255,255,0.025)",
        gap: "0.75rem",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--app-text-primary)" }}>
          {label}
        </p>
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--app-text-muted)",
            fontFamily: "monospace",
            marginTop: "0.1rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {envVar}
        </p>
      </div>
      <span
        style={{
          flexShrink: 0,
          fontSize: "0.65rem",
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          borderRadius: "9999px",
          padding: "0.15rem 0.5rem",
          background: isSet ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
          color: isSet ? "var(--app-accent-green)" : "#ef4444",
        }}
      >
        {isSet ? "Set" : "Missing"}
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

  // Dispatch mode info
  const dispatchMode = (
    process.env.DISPATCH_MODE?.toUpperCase() ?? "INPROCESS"
  ) as "INPROCESS" | "WORKER" | "KUBERNETES";

  const k8sEnabled = process.env.FEATURE_K8S_DISPATCH === "true";

  // Parallel data fetches
  const [dbHealth, chunkCountResult, embeddingConfigs, vsConfigs, jobCounts, activeWorkerCount] =
    await Promise.all([
      getDatabaseHealth(),
      db.select({ count: count() }).from(chunks),
      db.query.embeddingProviderConfigs.findMany({
        columns: {
          id: true,
          provider: true,
          name: true,
          model: true,
          dimensions: true,
          sharedCredentialId: true,
          isRagEngine: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          useBatchForNew: true,
          useBatchForRescrape: true,
        },
      }),
      db.query.vectorStoreConfigs.findMany({
        columns: {
          id: true,
          provider: true,
          name: true,
          sharedCredentialId: true,
          handlesEmbedding: true,
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
          .where(and(eq(jobs.status, "COMPLETED"), gte(jobs.createdAt, since24h)));
        const [failed] = await db
          .select({ count: count() })
          .from(jobs)
          .where(and(eq(jobs.status, "FAILED"), gte(jobs.createdAt, since24h)));
        return {
          pending: Number(pending?.count ?? 0),
          running: Number(running?.count ?? 0),
          completed: Number(completed?.count ?? 0),
          failed: Number(failed?.count ?? 0),
        };
      })(),
      // Count Mode 2 workers with a recent heartbeat (within last 2 minutes)
      (async () => {
        const heartbeatCutoff = Date.now() - 2 * 60 * 1000;
        // A "live" worker has a RUNNING WORKER job whose heartbeat is fresh.
        // We select all RUNNING/WORKER jobs and check the heartbeat in JS
        // to avoid complex jsonb queries.
        const runningWorkerJobs = await db.query.jobs.findMany({
          where: and(eq(jobs.status, "RUNNING"), eq(jobs.dispatchMode, "WORKER")),
          columns: { id: true, progress: true },
        });
        const liveCount = runningWorkerJobs.filter((j) => {
          const hb =
            (j.progress as Record<string, unknown> | null)?.workerHeartbeat;
          return typeof hb === "number" && hb > heartbeatCutoff;
        }).length;
        return liveCount;
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

  // ---------------------------------------------------------------------------
  // Enterprise: License info
  // ---------------------------------------------------------------------------
  const license = validateLicense();
  const licenseValid = isLicenseValid();
  const ssoFeature = hasLicenseFeature("sso");

  // SSO provider env var presence (display-only — set on the server)
  const azureEnvVars = [
    { label: "Tenant ID", envVar: "AZURE_TENANT_ID", isSet: Boolean(process.env.AZURE_TENANT_ID) },
    { label: "Client ID", envVar: "AZURE_CLIENT_ID", isSet: Boolean(process.env.AZURE_CLIENT_ID) },
    { label: "Client Secret", envVar: "AZURE_CLIENT_SECRET", isSet: Boolean(process.env.AZURE_CLIENT_SECRET) },
  ];

  const oidcEnvVars = [
    { label: "Issuer URL", envVar: "OIDC_ISSUER", isSet: Boolean(process.env.OIDC_ISSUER) },
    { label: "Client ID", envVar: "OIDC_CLIENT_ID", isSet: Boolean(process.env.OIDC_CLIENT_ID) },
    { label: "Client Secret", envVar: "OIDC_CLIENT_SECRET", isSet: Boolean(process.env.OIDC_CLIENT_SECRET) },
  ];

  const azureConfigured = azureEnvVars.every((v) => v.isSet);
  const oidcConfigured = oidcEnvVars.every((v) => v.isSet);

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

      <HealthCard
        title="Dispatch Mode"
        icon={<Cpu size={14} />}
        status={
          dispatchMode === "KUBERNETES" && !k8sEnabled ? "warn" : "ok"
        }
        value={dispatchMode}
        sub={
          dispatchMode === "INPROCESS"
            ? "Jobs run in-process (single server)"
            : dispatchMode === "WORKER"
              ? `External worker · ${activeWorkerCount} active worker${activeWorkerCount === 1 ? "" : "s"}`
              : k8sEnabled
                ? "Kubernetes dispatch enabled"
                : "Kubernetes dispatch (feature flag off)"
        }
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

  // ---------------------------------------------------------------------------
  // Enterprise tab — License status + SSO configuration
  // ---------------------------------------------------------------------------
  const enterpriseTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* License Status Card */}
      <div>
        <p className="section-label" style={{ fontSize: "0.7rem", marginBottom: "0.75rem" }}>
          License
        </p>
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "0.625rem",
            border: `1px solid ${licenseValid ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
            background: licenseValid ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
          }}
        >
          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {licenseValid ? (
              <CheckCircle2 size={16} style={{ color: "var(--app-accent-green)", flexShrink: 0 }} />
            ) : (
              <XCircle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
            )}
            <p
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: licenseValid ? "var(--app-accent-green)" : "#ef4444",
              }}
            >
              {licenseValid
                ? `Valid ${license?.plan === "enterprise" ? "Enterprise" : "Team"} License`
                : process.env.LICENSE_KEY
                  ? "License Expired or Invalid"
                  : "No License Key Configured"}
            </p>
          </div>

          {/* License details */}
          {license && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <div>
                <p style={{ fontSize: "0.68rem", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Plan
                </p>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--app-text-primary)", textTransform: "capitalize" }}>
                  {license.plan}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.68rem", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Seat Count
                </p>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--app-text-primary)" }}>
                  {license.seatCount}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.68rem", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Expires
                </p>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--app-text-primary)" }}>
                  {license.expiresAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Feature badges */}
          {license && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {["sso", "saml", "confluence", "notion"].map((feat) => (
                <FeatureBadge
                  key={feat}
                  label={feat}
                  active={license.features.includes(feat)}
                />
              ))}
            </div>
          )}

          {/* No license guidance */}
          {!licenseValid && (
            <p style={{ fontSize: "0.75rem", color: "var(--app-text-muted)" }}>
              Set the <code style={{ fontFamily: "monospace", fontSize: "0.72rem", background: "rgba(255,255,255,0.06)", padding: "0.1rem 0.3rem", borderRadius: "0.25rem" }}>LICENSE_KEY</code> environment variable to enable enterprise features.
              The value should be a base64-encoded JSON object with keys: <code style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>expiresAt</code>, <code style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>seatCount</code>, <code style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>features</code>, <code style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>plan</code>.
            </p>
          )}
        </div>
      </div>

      {/* SSO Configuration — only shown when license includes 'sso' */}
      {ssoFeature ? (
        <div>
          <p className="section-label" style={{ fontSize: "0.7rem", marginBottom: "0.75rem" }}>
            SSO Providers
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Azure Entra ID */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "0.625rem",
                border: "1px solid var(--app-border, rgba(255,255,255,0.06))",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Key size={14} style={{ color: "var(--app-text-muted)" }} />
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--app-text-primary)" }}>
                    Azure Entra ID (Microsoft)
                  </p>
                </div>
                <FeatureBadge label={azureConfigured ? "Configured" : "Not configured"} active={azureConfigured} />
              </div>

              <p style={{ fontSize: "0.72rem", color: "var(--app-text-muted)" }}>
                OIDC discovery: <code style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                  https://login.microsoftonline.com/&#123;tenantId&#125;/v2.0/.well-known/openid-configuration
                </code>
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {azureEnvVars.map((v) => (
                  <SsoEnvVarRow key={v.envVar} label={v.label} envVar={v.envVar} isSet={v.isSet} />
                ))}
              </div>

              {azureConfigured && (
                <div>
                  <a
                    href="/api/auth/sign-in/social?provider=microsoft&callbackURL=/dashboard"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--app-accent-green)",
                      textDecoration: "none",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid rgba(16,185,129,0.3)",
                      background: "rgba(16,185,129,0.06)",
                    }}
                  >
                    <ShieldCheck size={13} />
                    Test Azure SSO Login
                  </a>
                </div>
              )}
            </div>

            {/* Generic OIDC */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "0.625rem",
                border: "1px solid var(--app-border, rgba(255,255,255,0.06))",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Key size={14} style={{ color: "var(--app-text-muted)" }} />
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--app-text-primary)" }}>
                    Generic OIDC (Okta, Auth0, Ping, etc.)
                  </p>
                </div>
                <FeatureBadge label={oidcConfigured ? "Configured" : "Not configured"} active={oidcConfigured} />
              </div>

              <p style={{ fontSize: "0.72rem", color: "var(--app-text-muted)" }}>
                OIDC discovery: <code style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                  $&#123;OIDC_ISSUER&#125;/.well-known/openid-configuration
                </code>
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {oidcEnvVars.map((v) => (
                  <SsoEnvVarRow key={v.envVar} label={v.label} envVar={v.envVar} isSet={v.isSet} />
                ))}
              </div>

              {oidcConfigured && (
                <div>
                  <a
                    href="/api/auth/sign-in/oauth2?providerId=oidc&callbackURL=/dashboard"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--app-accent-green)",
                      textDecoration: "none",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid rgba(16,185,129,0.3)",
                      background: "rgba(16,185,129,0.06)",
                    }}
                  >
                    <ShieldCheck size={13} />
                    Test OIDC SSO Login
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "1rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--app-border, rgba(255,255,255,0.06))",
            background: "rgba(107,114,128,0.04)",
          }}
        >
          <p style={{ fontSize: "0.78rem", color: "var(--app-text-muted)" }}>
            SSO configuration requires a license with the <FeatureBadge label="sso" active={false} /> feature.
          </p>
        </div>
      )}
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
            Health dashboard, embedding providers, vector stores, feature
            flags, and enterprise configuration
          </p>
        </div>
      </div>

      {/* Tabbed layout */}
      <div className="app-card" style={{ padding: "1.25rem" }}>
        <SystemTabs
          isSuperAdmin={isSuperAdmin}
          showEnterpriseTab={licenseValid}
          children={{
            health: healthTab,
            embedding: embeddingTab,
            vectorstore: vectorStoreTab,
            flags: flagsTab,
            enterprise: enterpriseTab,
          }}
        />
      </div>
    </div>
  );
}
