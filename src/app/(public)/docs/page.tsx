/**
 * Documentation Page — Self-Hosting Installation Guide
 */

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicWrapper } from "@/components/layout/public-wrapper";
import {
  Container,
  Database,
  GitBranch,
  Layers,
  Server,
  Settings,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";

/* ── Reusable code block ─────────────────────────────────────── */
function CodeBlock({
  filename,
  children,
}: {
  filename?: string;
  children: string;
}) {
  return (
    <div className="pub-code-panel" style={{ marginBottom: 20 }}>
      <div className="pub-code-hdr">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "0.75rem", color: "#5a6a85" }}>
          {filename ?? "terminal"}
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "16px 20px",
          color: "#8899bb",
          overflowX: "auto",
          fontSize: "0.82rem",
          lineHeight: 1.75,
        }}
      >
        {children}
      </pre>
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────── */
function SectionHeading({
  id,
  icon,
  label,
  title,
  subtitle,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div className="pub-feat-icon" style={{ marginBottom: 0, flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div className="pub-s-label" style={{ marginBottom: 4 }}>
            {label}
          </div>
          <h2
            id={id}
            className="pub-h-display"
            style={{ fontSize: "1.35rem", color: "#dce4f0", margin: 0 }}
          >
            {title}
          </h2>
        </div>
      </div>
      {subtitle && (
        <p style={{ color: "#8899bb", fontSize: "0.9rem", lineHeight: 1.65, marginLeft: 54 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ── Sidebar nav items ───────────────────────────────────────── */
const NAV_ITEMS = [
  { href: "#quick-start", label: "Quick Start" },
  { href: "#environment", label: "Environment Variables" },
  { href: "#kubernetes", label: "Kubernetes / Helm" },
  { href: "#database", label: "Database Setup" },
  { href: "#embeddings", label: "Embedding Providers" },
  { href: "#worker-modes", label: "Worker Modes" },
  { href: "#mcp-server", label: "MCP Server" },
  { href: "#upgrading", label: "Upgrading" },
];

/* ── Main component ──────────────────────────────────────────── */
export default function DocsPage() {
  return (
    <PublicWrapper>
      <PublicHeader />

      <main id="main-content" style={{ flex: 1 }}>
        {/* Page header */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            padding: "64px 24px 40px",
          }}
        >
          <div style={{ maxWidth: 1160, margin: "0 auto" }}>
            <div className="pub-s-label" style={{ marginBottom: 10 }}>
              Self-Hosting
            </div>
            <h1
              className="pub-h-display"
              style={{
                fontSize: "clamp(1.7rem, 4vw, 2.6rem)",
                color: "#dce4f0",
                marginBottom: 14,
              }}
            >
              Installation Guide
            </h1>
            <p
              style={{
                fontSize: "1.0625rem",
                color: "#7a8eaa",
                maxWidth: 560,
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              Everything you need to run ContextStream on your own
              infrastructure — from a single Docker Compose command to a
              production Kubernetes cluster.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["MIT Licensed", "Docker + Helm", "PostgreSQL + pgvector"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      padding: "4px 12px",
                      background: "rgba(16,185,129,0.07)",
                      border: "1px solid rgba(16,185,129,0.15)",
                      borderRadius: 99,
                      fontSize: "0.75rem",
                      color: "#10b981",
                      fontWeight: 600,
                    }}
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            padding: "48px 24px 96px",
            display: "grid",
            gridTemplateColumns: "200px 1fr",
            gap: 56,
            alignItems: "start",
          }}
        >
          {/* ── Sticky sidebar ── */}
          <nav
            aria-label="Documentation sections"
            style={{
              position: "sticky",
              top: 24,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#3d4f6a",
                marginBottom: 8,
                paddingLeft: 10,
              }}
            >
              On this page
            </div>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "6px 10px",
                  fontSize: "0.825rem",
                  color: "#5a6a85",
                  textDecoration: "none",
                  borderRadius: 6,
                  borderLeft: "2px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                }}
                className="pub-docs-nav-link"
              >
                {item.label}
              </Link>
            ))}
            <style>{`
              .pub-docs-nav-link:hover {
                color: #10b981 !important;
                border-left-color: #10b981 !important;
                background: rgba(16,185,129,0.05);
              }
              @media (max-width: 767px) {
                .pub-docs-sidebar { display: none !important; }
                .pub-docs-body { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </nav>

          {/* ── Main content ── */}
          <div style={{ minWidth: 0 }}>

            {/* ────────────────────────────────────────────────── */}
            {/* 1. Quick Start                                     */}
            {/* ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 72 }}>
              <SectionHeading
                id="quick-start"
                icon={<Zap size={20} />}
                label="Step 1"
                title="Quick Start — Docker Compose"
                subtitle="The fastest way to get ContextStream running locally or on a single server."
              />

              <div
                style={{
                  background: "rgba(16,185,129,0.04)",
                  border: "1px solid rgba(16,185,129,0.15)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  marginBottom: 24,
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  lineHeight: 1.65,
                }}
              >
                <strong style={{ color: "#10b981" }}>Prerequisites:</strong>{" "}
                Docker 24+, Docker Compose v2, and a PostgreSQL 14+ database
                with the{" "}
                <code
                  style={{
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: "0.8rem",
                  }}
                >
                  pgvector
                </code>{" "}
                extension. You can use{" "}
                <Link
                  href="https://neon.tech"
                  target="_blank"
                  style={{ color: "#10b981" }}
                >
                  Neon
                </Link>{" "}
                or{" "}
                <Link
                  href="https://supabase.com"
                  target="_blank"
                  style={{ color: "#10b981" }}
                >
                  Supabase
                </Link>{" "}
                for a managed option, or the bundled Postgres container in the
                Compose file.
              </div>

              <CodeBlock filename="terminal — 5 steps">{`# 1. Clone the repo
git clone https://github.com/jimseiwert/context-stream
cd context-stream

# 2. Copy and configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, BETTER_AUTH_SECRET, OPENAI_API_KEY

# 3. Start with Docker Compose (migrations run automatically on startup)
docker compose -f docker/docker-compose.yml up -d

# 4. Open http://localhost:3000
# The first user to register automatically becomes SUPER_ADMIN`}</CodeBlock>

              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  lineHeight: 1.65,
                }}
              >
                That&apos;s it. The application, worker, and Postgres container
                all start together. Once migrations are done, visit{" "}
                <code
                  style={{
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: "0.8rem",
                  }}
                >
                  http://localhost:3000
                </code>{" "}
                and register your admin account.
              </p>
            </section>

            <hr className="pub-sep" style={{ marginBottom: 64 }} />

            {/* ────────────────────────────────────────────────── */}
            {/* 2. Environment Variables                          */}
            {/* ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 72 }}>
              <SectionHeading
                id="environment"
                icon={<Settings size={20} />}
                label="Configuration"
                title="Environment Variables"
                subtitle="Copy .env.example to .env and set the values below. Required variables must be present before starting the application."
              />

              {/* Table */}
              <div
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 1fr",
                    gap: "0 16px",
                    padding: "10px 20px",
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#3d4f6a",
                  }}
                >
                  <span>Variable</span>
                  <span>Required</span>
                  <span>Description</span>
                </div>

                {(
                  [
                    [
                      "DATABASE_URL",
                      "required",
                      "PostgreSQL connection string. Must have pgvector extension enabled.",
                    ],
                    [
                      "BETTER_AUTH_SECRET",
                      "required",
                      "Random 32+ character secret. Generate one: openssl rand -base64 32",
                    ],
                    [
                      "OPENAI_API_KEY",
                      "embeddings",
                      "OpenAI API key for text-embedding-3-small (default embedding provider).",
                    ],
                    [
                      "GITHUB_CLIENT_ID",
                      "optional",
                      "GitHub OAuth app client ID for GitHub social login.",
                    ],
                    [
                      "GITHUB_CLIENT_SECRET",
                      "optional",
                      "GitHub OAuth app client secret for GitHub social login.",
                    ],
                    [
                      "GOOGLE_CLIENT_ID",
                      "optional",
                      "Google OAuth client ID for Google social login.",
                    ],
                    [
                      "GOOGLE_CLIENT_SECRET",
                      "optional",
                      "Google OAuth client secret for Google social login.",
                    ],
                    [
                      "NEXT_PUBLIC_APP_URL",
                      "optional",
                      "Public base URL of your deployment (e.g. https://docs.example.com). Used for OAuth callbacks and MCP config.",
                    ],
                    [
                      "PDF_PARSER_URL",
                      "optional",
                      "URL of the PDF parser microservice (e.g. http://pdf-parser:8000). Enables PDF source indexing.",
                    ],
                    [
                      "DISPATCH_MODE",
                      "optional",
                      "Job dispatch mode: INPROCESS (default), WORKER, or KUBERNETES.",
                    ],
                    [
                      "NEXT_PUBLIC_SAAS_MODE",
                      "optional",
                      "Set to true to enable billing and subscription features.",
                    ],
                    [
                      "STRIPE_SECRET_KEY",
                      "saas only",
                      "Stripe secret key. Required when NEXT_PUBLIC_SAAS_MODE=true.",
                    ],
                    [
                      "LICENSE_KEY",
                      "enterprise",
                      "Enterprise license key. Unlocks SSO, Confluence integration, and Notion integration.",
                    ],
                  ] as [string, string, string][]
                ).map(([variable, required, description], i) => {
                  const badgeColor =
                    required === "required"
                      ? "#10b981"
                      : required === "embeddings"
                      ? "#06b6d4"
                      : required === "saas only"
                      ? "#f59e0b"
                      : required === "enterprise"
                      ? "#a78bfa"
                      : "#5a6a85";

                  return (
                    <div
                      key={variable}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 100px 1fr",
                        gap: "0 16px",
                        padding: "14px 20px",
                        borderBottom:
                          i < 12
                            ? "1px solid rgba(255,255,255,0.04)"
                            : undefined,
                        alignItems: "start",
                      }}
                    >
                      <code
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                          color: "#c8d5e8",
                          wordBreak: "break-all",
                        }}
                      >
                        {variable}
                      </code>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: 99,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: badgeColor,
                          background: `${badgeColor}18`,
                          border: `1px solid ${badgeColor}30`,
                          whiteSpace: "nowrap",
                          width: "fit-content",
                        }}
                      >
                        {required}
                      </span>
                      <span
                        style={{
                          fontSize: "0.825rem",
                          color: "#7a8eaa",
                          lineHeight: 1.6,
                        }}
                      >
                        {description}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <hr className="pub-sep" style={{ marginBottom: 64 }} />

            {/* ────────────────────────────────────────────────── */}
            {/* 3. Kubernetes / Helm                              */}
            {/* ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 72 }}>
              <SectionHeading
                id="kubernetes"
                icon={<Layers size={20} />}
                label="Production Deploy"
                title="Kubernetes / Helm"
                subtitle="Use the bundled Helm chart for production Kubernetes deployments with ingress and auto-scaling."
              />

              <CodeBlock filename="terminal — Helm install">{`# Install from the bundled chart (migrations run automatically as a pre-install Job)
helm install contextstream ./helm/contextstream \\
  --set secrets.DATABASE_URL="postgresql://user:pass@host:5432/db" \\
  --set secrets.BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \\
  --set secrets.OPENAI_API_KEY="sk-..." \\
  --set env.NEXT_PUBLIC_APP_URL="https://contextstream.example.com" \\
  --set ingress.enabled=true \\
  --set ingress.hosts[0].host="contextstream.example.com" \\
  --set migrations.strategy=job`}</CodeBlock>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginTop: 8,
                }}
              >
                {[
                  {
                    title: "Horizontal scaling",
                    desc: "Scale the app deployment independently from the worker. The worker uses DISPATCH_MODE=KUBERNETES to spawn job pods on demand.",
                  },
                  {
                    title: "Ingress + TLS",
                    desc: "Set ingress.enabled=true and provide a cert-manager annotation to get automatic HTTPS via Let's Encrypt.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      padding: "16px 18px",
                      background: "rgba(255,255,255,0.018)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#c8d5e8",
                        marginBottom: 6,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.825rem",
                        color: "#6b7fa0",
                        lineHeight: 1.6,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <hr className="pub-sep" style={{ marginBottom: 64 }} />

            {/* ────────────────────────────────────────────────── */}
            {/* 4. Database Setup                                 */}
            {/* ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 72 }}>
              <SectionHeading
                id="database"
                icon={<Database size={20} />}
                label="Data Layer"
                title="Database Setup"
                subtitle="ContextStream requires PostgreSQL 14+ with the pgvector extension for hybrid vector search."
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 28,
                }}
              >
                {[
                  {
                    name: "Neon",
                    desc: "Serverless Postgres with pgvector. Free tier available. Recommended for cloud deployments.",
                    href: "https://neon.tech",
                  },
                  {
                    name: "Supabase",
                    desc: "Managed Postgres with pgvector pre-installed. Includes a generous free tier.",
                    href: "https://supabase.com",
                  },
                  {
                    name: "Self-hosted",
                    desc: "Any Postgres 14+ instance. Run CREATE EXTENSION IF NOT EXISTS vector; before migrating.",
                    href: null,
                  },
                ].map((db) => (
                  <div
                    key={db.name}
                    style={{
                      padding: "16px 18px",
                      background: "rgba(255,255,255,0.018)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: "#c8d5e8",
                        marginBottom: 6,
                      }}
                    >
                      {db.href ? (
                        <Link
                          href={db.href}
                          target="_blank"
                          style={{ color: "#10b981", textDecoration: "none" }}
                        >
                          {db.name} ↗
                        </Link>
                      ) : (
                        db.name
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#6b7fa0",
                        lineHeight: 1.6,
                      }}
                    >
                      {db.desc}
                    </div>
                  </div>
                ))}
              </div>

              <CodeBlock filename="psql — manual extension install (self-hosted)">{`-- Run once on your Postgres instance before migrating
CREATE EXTENSION IF NOT EXISTS vector;`}</CodeBlock>

              <CodeBlock filename="terminal — migrations and seed">{`# Run all pending migrations
npm run db:migrate

# Seed the database (creates admin user + sample source)
npm run db:seed`}</CodeBlock>

              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  lineHeight: 1.65,
                  marginTop: 4,
                }}
              >
                The migration runner automatically installs the{" "}
                <code
                  style={{
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: "0.8rem",
                  }}
                >
                  vector
                </code>{" "}
                extension if it is not present. If your database user lacks
                superuser privileges, install the extension manually first using
                the command above.
              </p>
            </section>

            <hr className="pub-sep" style={{ marginBottom: 64 }} />

            {/* ────────────────────────────────────────────────── */}
            {/* 5. Embedding Providers                            */}
            {/* ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 72 }}>
              <SectionHeading
                id="embeddings"
                icon={<Sparkles size={20} />}
                label="AI Configuration"
                title="Embedding Providers"
                subtitle="ContextStream supports three embedding backends. The first admin configures the provider via Admin → System → Embedding Config."
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 28,
                }}
              >
                {[
                  {
                    name: "OpenAI",
                    badge: "default",
                    desc: "Set OPENAI_API_KEY. Uses text-embedding-3-small. Best choice for most deployments.",
                    badgeColor: "#10b981",
                  },
                  {
                    name: "Azure OpenAI",
                    badge: "supported",
                    desc: "Configure endpoint, key, and deployment name in Admin → System → Embedding Config.",
                    badgeColor: "#06b6d4",
                  },
                  {
                    name: "Vertex AI",
                    badge: "supported",
                    desc: "Configure project ID and region in Admin → System → Embedding Config.",
                    badgeColor: "#06b6d4",
                  },
                ].map((p) => (
                  <div
                    key={p.name}
                    style={{
                      padding: "18px",
                      background: "rgba(255,255,255,0.018)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: "#c8d5e8",
                        }}
                      >
                        {p.name}
                      </span>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 99,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: p.badgeColor,
                          background: `${p.badgeColor}18`,
                          border: `1px solid ${p.badgeColor}30`,
                        }}
                      >
                        {p.badge}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#6b7fa0",
                        lineHeight: 1.6,
                      }}
                    >
                      {p.desc}
                    </div>
                  </div>
                ))}
              </div>

              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  lineHeight: 1.65,
                }}
              >
                The default provider is OpenAI. To switch providers, log in as
                a super admin and navigate to{" "}
                <strong style={{ color: "#c8d5e8" }}>
                  Admin → System → Embedding Config
                </strong>
                . All three providers generate 1536-dimensional embeddings that
                are stored in the{" "}
                <code
                  style={{
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: "0.8rem",
                  }}
                >
                  pgvector
                </code>{" "}
                column alongside BM25 keyword indexes for hybrid search.
              </p>
            </section>

            <hr className="pub-sep" style={{ marginBottom: 64 }} />

            {/* ────────────────────────────────────────────────── */}
            {/* 6. Worker Modes                                   */}
            {/* ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 72 }}>
              <SectionHeading
                id="worker-modes"
                icon={<Server size={20} />}
                label="Job Processing"
                title="Worker Dispatch Modes"
                subtitle="Choose how scraping and embedding jobs are dispatched. Set via the DISPATCH_MODE environment variable."
              />

              {/* Table */}
              <div
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 24,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 200px 1fr",
                    gap: "0 16px",
                    padding: "10px 20px",
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#3d4f6a",
                  }}
                >
                  <span>Mode</span>
                  <span>Config value</span>
                  <span>Use case</span>
                </div>

                {(
                  [
                    [
                      "INPROCESS",
                      "DISPATCH_MODE=INPROCESS",
                      "default",
                      "Jobs run inside the Next.js process. Best for single-server installs and local development.",
                    ],
                    [
                      "External Worker",
                      "DISPATCH_MODE=WORKER",
                      null,
                      "A separate worker container picks up jobs from the queue. Better isolation and resource control.",
                    ],
                    [
                      "Kubernetes",
                      "DISPATCH_MODE=KUBERNETES",
                      "enterprise",
                      "Each job spawns a short-lived Kubernetes pod. Enables auto-scaling and zero idle worker cost.",
                    ],
                  ] as [string, string, string | null, string][]
                ).map(([mode, config, badge, desc], i) => (
                  <div
                    key={mode}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "160px 200px 1fr",
                      gap: "0 16px",
                      padding: "14px 20px",
                      borderBottom:
                        i < 2
                          ? "1px solid rgba(255,255,255,0.04)"
                          : undefined,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "#c8d5e8",
                        }}
                      >
                        {mode}
                      </span>
                      {badge && (
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 99,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: badge === "default" ? "#10b981" : "#a78bfa",
                            background:
                              badge === "default" ? "#10b98118" : "#a78bfa18",
                            border:
                              badge === "default"
                                ? "1px solid #10b98130"
                                : "1px solid #a78bfa30",
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    <code
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        color: "#8899bb",
                        wordBreak: "break-all",
                      }}
                    >
                      {config}
                    </code>
                    <span
                      style={{
                        fontSize: "0.825rem",
                        color: "#7a8eaa",
                        lineHeight: 1.6,
                      }}
                    >
                      {desc}
                    </span>
                  </div>
                ))}
              </div>

              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  marginBottom: 16,
                  lineHeight: 1.65,
                }}
              >
                To run an external worker alongside the app container:
              </p>
              <CodeBlock filename="terminal — external worker profile">{`docker compose -f docker/docker-compose.yml --profile worker up -d`}</CodeBlock>
            </section>

            <hr className="pub-sep" style={{ marginBottom: 64 }} />

            {/* ────────────────────────────────────────────────── */}
            {/* 7. MCP Server                                     */}
            {/* ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 72 }}>
              <SectionHeading
                id="mcp-server"
                icon={<Terminal size={20} />}
                label="AI Tool Integration"
                title="MCP Server Setup"
                subtitle="The MCP server runs at /api/mcp on your deployment. Connect it to Claude Desktop, Cursor, Zed, or any MCP-compatible tool."
              />

              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  marginBottom: 16,
                  lineHeight: 1.65,
                }}
              >
                Generate your API key in the app under{" "}
                <strong style={{ color: "#c8d5e8" }}>
                  Settings → API Keys
                </strong>
                , then add the config block below to your AI tool. Replace{" "}
                <code
                  style={{
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: "0.8rem",
                  }}
                >
                  your-domain.com
                </code>{" "}
                and{" "}
                <code
                  style={{
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: "0.8rem",
                  }}
                >
                  YOUR_API_KEY
                </code>
                .
              </p>

              <CodeBlock filename="claude_desktop_config.json">{`{
  "mcpServers": {
    "contextstream": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-http-client"],
      "env": {
        "MCP_SERVER_URL": "https://your-domain.com/api/mcp",
        "MCP_AUTH_HEADER": "Authorization: Bearer YOUR_API_KEY"
      }
    }
  }
}`}</CodeBlock>

              <div
                style={{
                  background: "rgba(6,182,212,0.04)",
                  border: "1px solid rgba(6,182,212,0.15)",
                  borderRadius: 10,
                  padding: "14px 18px",
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  lineHeight: 1.65,
                }}
              >
                <strong style={{ color: "#06b6d4" }}>Tip:</strong> After
                logging in, visit{" "}
                <code
                  style={{
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: "0.8rem",
                  }}
                >
                  /mcp
                </code>{" "}
                in the app for pre-generated config snippets tailored to Claude
                Desktop, Cursor, Zed, and Windsurf.
              </div>
            </section>

            <hr className="pub-sep" style={{ marginBottom: 64 }} />

            {/* ────────────────────────────────────────────────── */}
            {/* 8. Upgrading                                      */}
            {/* ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 72 }}>
              <SectionHeading
                id="upgrading"
                icon={<GitBranch size={20} />}
                label="Maintenance"
                title="Upgrading"
                subtitle="Always run database migrations after pulling a new image or chart version."
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.825rem",
                      fontWeight: 600,
                      color: "#c8d5e8",
                      marginBottom: 12,
                      paddingLeft: 2,
                    }}
                  >
                    Docker Compose
                  </div>
                  <CodeBlock filename="terminal">{`# Pull latest images
docker compose -f docker/docker-compose.yml pull

# Restart containers (migrations run automatically on startup)
docker compose -f docker/docker-compose.yml up -d`}</CodeBlock>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.825rem",
                      fontWeight: 600,
                      color: "#c8d5e8",
                      marginBottom: 12,
                      paddingLeft: 2,
                    }}
                  >
                    Helm / Kubernetes
                  </div>
                  <CodeBlock filename="terminal">{`# Upgrade the Helm release (migrations run automatically as a pre-upgrade Job)
helm upgrade contextstream ./helm/contextstream --reuse-values`}</CodeBlock>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(245,158,11,0.04)",
                  border: "1px solid rgba(245,158,11,0.15)",
                  borderRadius: 10,
                  padding: "14px 18px",
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  lineHeight: 1.65,
                  marginTop: 8,
                }}
              >
                <strong style={{ color: "#f59e0b" }}>Before upgrading:</strong>{" "}
                Review the{" "}
                <Link
                  href="https://github.com/jimseiwert/context-stream/releases"
                  target="_blank"
                  style={{ color: "#f59e0b" }}
                >
                  release notes
                </Link>{" "}
                for breaking changes. Back up your database before running
                migrations in production.
              </div>
            </section>

            {/* ── Help card ── */}
            <div
              className="pub-card"
              style={{ border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <div className="pub-feat-icon">
                <Container size={20} />
              </div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#dce4f0",
                  marginBottom: 6,
                }}
              >
                Need help?
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  marginBottom: 24,
                  lineHeight: 1.65,
                }}
              >
                Open a GitHub issue for bug reports, feature requests, or
                questions about self-hosting. Community support is available on
                the repository discussions tab.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link
                  href="https://github.com/jimseiwert/context-stream/issues"
                  target="_blank"
                  className="pub-ghost-btn"
                  style={{ padding: "8px 18px", fontSize: "0.875rem" }}
                >
                  Open an Issue
                </Link>
                <Link
                  href="https://github.com/jimseiwert/context-stream"
                  target="_blank"
                  className="pub-ghost-btn"
                  style={{ padding: "8px 18px", fontSize: "0.875rem" }}
                >
                  View on GitHub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </PublicWrapper>
  );
}
