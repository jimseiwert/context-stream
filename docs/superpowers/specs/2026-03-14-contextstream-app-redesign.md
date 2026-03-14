# ContextStream App Redesign — Design Spec

**Date:** 2026-03-14
**Status:** Approved for implementation
**Scope:** Full authenticated app redesign — UI shell, all features

---

## 1. Overview

ContextStream is a document ingestion and semantic search platform offered as:
- **Open Source** — core features, self-hosted, no license required
- **SaaS** — hosted, Stripe billing, usage quotas, per-seat team pricing
- **Enterprise Edition (EE)** — self-hosted with license key, SSO/SAML, advanced integrations

The authenticated app is being rebuilt from scratch to a modern, high-tech standard that matches the quality of the public-facing marketing site.

---

## 2. Design Direction

### Visual Language: Glass & Glow + Terminal Precision + Refined Clean

**Color System:**
- Background: `#07090f` (near-black)
- Surface: `rgba(10,12,18,0.85)` with `backdrop-filter: blur(12px)`
- Cards: `rgba(255,255,255,0.04)` with `1px solid rgba(255,255,255,0.08)` border and top-edge highlight `::before`
- Ambient glows: green `rgba(16,185,129,0.07)`, blue `rgba(59,130,246,0.06)`, cyan `rgba(6,182,212,0.03)` — fixed radial gradients
- Text: `#e2e8f0` primary, `#94a3b8` secondary, `#4a5568` muted
- Accent green: `#10b981`, accent blue: `#3b82f6`, accent amber: `#f59e0b`, accent red: `#ef4444`, accent cyan: `#06b6d4`

**Typography:**
- UI: system-ui / Inter — `13px` base, tight tracking
- Stat values / job metadata: `SF Mono`, `JetBrains Mono`, `Fira Code` — monospace gradient text
- Section labels: `10px`, `letter-spacing: 0.08em`, uppercase, `opacity: 0.5`

**Component Patterns:**
- Frosted glass cards with green top-edge `::before` highlight
- Collapsible sidebar — 220px expanded, 52px icon-only collapsed
- Color-coded nav badges (green = active, amber = warning, red = error, blue = info)
- Monospace stat values with gradient text (`#10b981` → `#3b82f6`)
- Sparkline SVGs in stat cards, full-width area/bar charts on analytics pages
- Real-time live badge with pulse animation ("N jobs running")
- Toast notifications — floating bottom-right, auto-dismiss
- Command palette (⌘K) for global navigation

---

## 3. App Shell Architecture

### Sidebar Navigation

Sections and routes:

**Overview**
- Dashboard (`/dashboard`) — system health, stat cards, activity feed

**Data Sources**
- Sources (`/sources`) — all sources list, CRUD
- Collections (`/collections`) — named groupings of sources [SaaS]
- Documents (`/documents`) — file browser across all sources

**Indexing**
- Jobs (`/jobs`) — job queue, real-time progress, history, logs
- Pipeline Config (`/settings/pipeline`) — chunking, embedding, schedule

**Search**
- Search (`/search`) — search UI with filters, query playground
- MCP Server (`/mcp`) — connection info, API keys, test tools

**Admin** (ADMIN/SUPER role only)
- Users (`/admin/users`)
- System (`/admin/system`) — health, config, vector store, embedding provider
- Usage (`/admin/usage`) — analytics

**Settings**
- Workspace Settings (`/settings`)
- Billing (`/settings/billing`) [SaaS]

### Topbar

- Workspace switcher (left)
- Breadcrumb navigation (center)
- Live jobs badge + notification bell + user menu (right)

### Layout Behavior

- Sidebar collapsed state persisted in `localStorage`
- Mobile: sidebar slides in as overlay
- Main content area: `overflow-y: auto`, padded `24px`

---

## 4. Core Feature Modules

### 4.1 Dashboard

Stat cards (with sparklines):
- Total Documents indexed
- Total Chunks
- Search queries (7d)
- Active sources

Widgets:
- Activity timeline (recent jobs, ingestion events)
- Running jobs feed (real-time, monospace metadata)
- System health summary (DB, vector store, embedding provider status)
- 7-day area chart: documents indexed / search queries / API calls

### 4.2 Sources & Collections

**Source Types:**
- Website crawler (URL + depth + selectors)
- GitHub repository (OAuth or PAT token)
- Document upload (PDF, DOCX, TXT, MD, CSV) — via PDF parser microservice
- RSS / API feeds [SaaS]
- Confluence [EE]
- Notion [EE]

**Source fields:** name, type, URL/config, logo/favicon, status, last indexed, schedule, scope (workspace | global)

**Collections:** named groups of sources, used to scope MCP search queries

**Source detail view:**
- Documents tab — file browser with search, tags, bulk actions
- Jobs tab — ingestion history, re-index button
- Config tab — source-specific settings
- Stats tab — chunk count, freshness score, quality score

### 4.3 Document Library

- Unified file browser across all sources
- Columns: name, source, type, size, indexed date, chunk count
- Inline preview: PDF viewer, Markdown renderer
- Tags and custom metadata
- Bulk: delete, re-index, move to collection
- Chunk viewer: see exactly how a document was chunked

### 4.4 Job System

**Three dispatch modes** (configured at system level, per-workspace, or per-job):

**Mode 1 — In-Process Queue (Safe/Slow)**
- Bull/BullMQ queue running in the Next.js Node.js process
- Concurrency: 1 (configurable to max 3)
- Good for: single-server deployments, low volume
- Real-time updates via PostgreSQL LISTEN/NOTIFY or Server-Sent Events

**Mode 2 — External Worker (Railway / Docker)**
- Worker process runs separately (same Docker image, different entrypoint)
- Communicates via shared DB job table + Redis pub/sub
- Good for: Railway deployments, Docker Compose setups
- Supports horizontal scaling (multiple workers)

**Mode 3 — Kubernetes Pod-per-Job**
- Each scrape job → Kubernetes Job → dedicated pod
- Inspired by Sympozium CRD pattern
- Job controller watches DB table, creates K8s Jobs via API
- NATS JetStream for event bus (or Upstash serverless)
- Log streaming via pod log aggregation → DB → SSE
- Good for: high-volume, enterprise deployments

**Job UI:**
- Queue view: running, queued, done, failed columns
- Real-time progress bar + log stream (SSE)
- Retry / cancel actions
- History with filtering by source, status, date range
- Per-job audit log

### 4.5 Search & MCP

**Search Engine:**
- Hybrid BM25 + vector search (weighted, configurable)
- Reranking via cross-encoder model
- Filters: source, collection, date range, document type
- Result cards: title, excerpt, source badge, freshness score
- Pagination + relevance scores shown

**Search Playground:**
- Test queries with real results
- Show chunk-level matches
- Tune BM25/vector weights interactively
- Export results

**MCP Server (Streamable HTTP):**
- Tools: `search`, `list_sources`, `get_document`, `list_collections`
- Resources: source listing
- Auth: API key (Bearer token)
- Connection info page with copy-paste config for Claude Desktop / Cursor
- Usage stats per API key

### 4.6 Embedding & Vector Store Configuration

**Embedding Providers (pluggable):**
- OpenAI (`text-embedding-3-small`, `text-embedding-3-large`)
- Azure OpenAI
- Google Vertex AI
- Cohere
- Voyage AI
- Ollama (local)
- LiteLLM proxy (unified interface)

**Vector Stores (pluggable):**
- pgvector (default, built-in)
- Qdrant
- Pinecone
- Weaviate
- Google Vertex AI Matching Engine
- Azure AI Search

**Configuration UI:** provider selector → credential fields → test connection button → save. Stored encrypted in DB.

### 4.7 Auth & Identity

**Providers (pluggable via Better Auth):**
- Email/password (always available)
- GitHub OAuth
- Google OAuth
- Azure Entra ID (OIDC) [EE]
- Okta [EE]
- SAML 2.0 [EE]

**Roles:** USER, ADMIN, SUPER
**API Keys:** per-user, scoped to workspace, used for MCP access
**Sessions:** JWT + server-side session store

### 4.8 Workspaces & Teams

- Multiple workspaces per user account
- Workspace members + role assignments
- Invite by email
- Org-level admin [SaaS]
- Shared global sources (SUPER admin creates, all workspaces read)

### 4.9 Admin Panel

**Users tab:** list, search, role change, disable, impersonate [SUPER only]
**System tab:**
- Health dashboard (DB, vector store, embedding provider, job queue status)
- Embedding config CRUD (add/edit/delete providers)
- Vector store config
- Feature flag overrides (per workspace or global)

**Usage tab:**
- Per-workspace usage metrics
- API call volume, documents indexed, storage used
- Export CSV

### 4.10 Billing & Plans [SaaS]

**Plans:** Free → Starter → Pro → Team
**Implementation:** Stripe Checkout + Customer Portal
**Quotas:** documents, API calls, seats (Team plan)
**Upgrade prompts:** inline at quota limits
**License keys:** for self-hosted EE validation

---

## 5. Pluggable Infrastructure

| Layer | Options |
|---|---|
| Vector Store | pgvector, Qdrant, Pinecone, Weaviate, Vertex AI, Azure AI Search |
| Embedding | OpenAI, Azure OpenAI, Vertex AI, Cohere, Voyage AI, Ollama, LiteLLM |
| Auth | Email/PW, GitHub, Google, Azure Entra, Okta, SAML 2.0 |
| Job Dispatch | In-process (Bull), External worker, Kubernetes pod-per-job |
| Event Bus | PostgreSQL LISTEN/NOTIFY, Redis pub/sub, NATS JetStream, Upstash |
| Document Parsing | PDF parser microservice (Docker), Markdown, plain text built-in |

Provider selection is stored in workspace/system config. Interface contracts (TypeScript interfaces) ensure all providers are interchangeable without changing consumer code.

---

## 6. Database (Drizzle + PostgreSQL)

Core tables:
- `users`, `sessions`, `accounts` (Better Auth)
- `workspaces`, `workspace_members`
- `sources` (type, config, status, scope, workspace_id)
- `collections`, `collection_sources`
- `documents` (source_id, path, content_hash, metadata, indexed_at)
- `chunks` (document_id, content, embedding vector, position)
- `jobs` (source_id, type, status, mode, logs, started_at, completed_at)
- `api_keys` (user_id, workspace_id, key_hash, last_used)
- `embedding_configs` (provider, model, credentials_encrypted, workspace_id)
- `vector_store_configs` (provider, connection_encrypted, workspace_id)
- `usage_events` (workspace_id, event_type, count, recorded_at)
- `subscriptions`, `subscription_items` [SaaS]

---

## 7. Real-Time Architecture

- **SSE endpoint** (`/api/jobs/[id]/stream`) — streams job logs and progress to UI
- **PostgreSQL LISTEN/NOTIFY** — default event bus for job status changes
- **React Query** — polling fallback for environments without SSE support
- **Optimistic updates** — source status changes reflected immediately

---

## 8. Technology Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS custom properties for design tokens
- **Components:** shadcn/ui (customized to match dark glass aesthetic)
- **Database ORM:** Drizzle ORM
- **Auth:** Better Auth
- **Job Queue:** BullMQ (Mode 1), custom worker (Mode 2), K8s controller (Mode 3)
- **Search:** pgvector hybrid search (BM25 via `pg_search` or full-text, vector via pgvector)
- **Charts:** Recharts or custom SVG sparklines
- **PDF Parsing:** Dedicated Docker microservice (`services/pdf-parser`)

---

## 9. Implementation Phases

### Phase 1 — App Shell & Navigation
Sidebar, topbar, layout, dark theme tokens, routing stubs

### Phase 2 — Database Schema
Drizzle schema for all tables, migrations, seed data

### Phase 3 — Auth & Workspaces
Better Auth integration, workspace CRUD, member invites, API keys

### Phase 4 — Sources & Ingestion Pipeline
Source CRUD, website crawler, document upload, chunking, embedding

### Phase 5 — Job System & Real-Time
BullMQ in-process queue (Mode 1), SSE log streaming, job UI

### Phase 6 — Search & MCP Server
Hybrid search, reranker, MCP Streamable HTTP server, search UI

### Phase 7 — Document Library
File browser, chunk viewer, bulk actions, preview

### Phase 8 — Admin Panel
User management, system config, embedding/vector store config

### Phase 9 — Billing & Subscriptions [SaaS]
Stripe integration, plans, quotas, upgrade flows

### Phase 10 — External Worker & K8s Dispatch [Mode 2 + 3]
Railway worker, Kubernetes job controller, NATS event bus

### Phase 11 — Enterprise Features [EE]
SSO/SAML, Azure Entra, Okta, advanced integrations

---

## 10. Success Criteria

- TypeScript strict mode, zero `any` in new code
- All pages load in < 2s (LCP) on hosted deployment
- MCP server passes Claude Desktop integration test
- Search returns results in < 500ms for < 100k chunks
- Job log streaming works end-to-end in Mode 1
- Admin panel usable by non-technical operators
- Open source deployment works with single `docker compose up`
