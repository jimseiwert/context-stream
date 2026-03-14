# ContextStream — Complete Feature Inventory

> Reference document for rebuilding the authenticated app from scratch.
> Covers every API route, UI page, background job, and configuration option currently implemented.

---

## 1. API Routes

### Authentication (`/api/auth/`)
- **[...all]** — Better-Auth catch-all handler
  - Email/password registration & login
  - GitHub OAuth (optional — requires `GITHUB_CLIENT_ID`/`SECRET`)
  - Logout, password reset, email verification
- **GET /api/auth/capabilities** — Returns which auth methods are enabled

### Search
- **POST /api/search** — Hybrid search across indexed docs
  - Query parsing with framework/library detection
  - BM25 full-text + pgvector similarity search
  - Reciprocal Rank Fusion result merging
  - LLM-based reranking
  - Session-based deduplication (avoids re-showing same results)
  - Result caching
  - Pagination
  - Rate limiting (SaaS only)
  - Quota enforcement with 402 response
  - Usage event tracking

### Sources
- **GET /api/sources** — List workspace sources (paginated)
- **POST /api/sources** — Create source; checks quotas, deduplicates global URLs, queues scrape job
- **GET /api/sources/[id]** — Source details + job history
- **PUT /api/sources/[id]** — Update name / rescrape schedule
- **DELETE /api/sources/[id]** — Delete source + all pages/chunks
- **POST /api/sources/[id]/scrape** — Trigger manual rescrape
- **GET /api/sources/[id]/jobs** — Job history for source
- **POST /api/sources/[id]/documents** — Upload documents (multipart)
  - Formats: PDF, DOCX, CSV, XLSX, TXT, MD, HTML, RTF, ODT
  - 50 MB file size limit
  - Queues document pipeline job
- **GET /api/sources/[id]/documents** — List uploaded documents
- **DELETE /api/sources/[id]/documents/[documentId]** — Delete document + chunks
- **GET /api/sources/global** — List all global sources

### Workspaces
- **GET /api/workspaces** — List user workspaces
- **POST /api/workspaces** — Create workspace (quota checked)
- **GET /api/workspaces/[id]** — Workspace details
- **PUT /api/workspaces/[id]** — Update workspace name/slug
- **GET /api/workspaces/[id]/sources** — Sources linked to workspace

### User Profile
- **GET /api/profile** — Current user profile
- **PUT /api/profile** — Update name / avatar
- **POST /api/profile/password** — Change password

### API Keys
- **GET /api/api-keys** — List API keys (masked)
- **POST /api/api-keys** — Create key (SHA256 hashed, optional expiry)
- **DELETE /api/api-keys/[id]** — Revoke key
- Keys track `lastUsedAt` on every authenticated MCP request

### Subscriptions & Billing (SaaS only)
- **GET /api/subscription** — Current plan + status
- **POST /api/subscription** — Create Stripe Checkout session
- **DELETE /api/subscription** — Cancel subscription
- **GET /api/subscription/portal** — Stripe customer portal redirect
- **POST /api/webhooks/stripe** — Stripe webhook handler
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

### Usage & Stats
- **GET /api/usage** — Usage counts vs. plan quotas
- **GET /api/dashboard/stats** — Aggregated dashboard metrics

### Jobs
- **GET /api/jobs/[id]** — Job status, progress %, stage, error message

### Health
- **GET /api/health** — System health check (DB + Redis connectivity)

### Admin
- **GET /api/admin/sources** — All sources across all workspaces (paginated)
- **GET /api/admin/sources/[id]** — Source detail (any source)
- **POST /api/admin/sources/[id]/scrape** — Force rescrape (admin)
- **POST /api/admin/sources/[id]/promote** — Promote workspace → global scope
- **GET /api/admin/users** — All users with stats (SUPER_ADMIN)
- **PUT /api/admin/users/[id]** — Change user role (SUPER_ADMIN)
- **GET /api/admin/embedding-config** — List embedding provider configs
- **POST /api/admin/embedding-config** — Create provider config
- **PUT /api/admin/embedding-config/[id]** — Update config
- **POST /api/admin/embedding-config/[id]/activate** — Set active provider
- **POST /api/admin/embedding-config/test** — Test provider connectivity
- **POST /api/admin/image-processing-config** — Configure OCR/Vision
- **GET /api/admin/stats** — System-wide statistics
- **GET /api/admin/statistics** — Detailed analytics

### MCP Server
- **POST /mcp** — Model Context Protocol endpoint
  - Tool: `contextstream_search` (query, workspace, session_id, limit)
  - Prompts: search-first guidance
  - Auth: Bearer API key
  - Workspace scoping: personal / global / all / specific slug
  - Session-based deduplication
  - Token-aware result truncation
  - Markdown-formatted output with relevance scores and latency

---

## 2. Authenticated Pages

### Dashboard
- `/dashboard` — Stats overview, recent sources, activity feed

### Search
- `/search` — Full-text search UI with filters and result display

### Sources
- `/sources` — Source list with status badges and quick actions
- `/sources/new` — Multi-step create wizard (type → URL → config)
- `/sources/[id]` — Detail view: indexing progress, documents, job log, settings

### Workspaces
- `/workspaces` — Workspace list and management

### Settings
- `/settings` — Settings hub / navigation
- `/settings/profile` — Edit display name and avatar
- `/settings/security` — Change password
- `/settings/api-keys` — Create, list, and revoke API keys
- `/settings/integrations` — MCP setup guides for Claude Desktop, Cursor, Windsurf, Zed
- `/settings/billing` — Plan info, upgrade flow, Stripe portal (SaaS only)
- `/settings/notifications` — Alert preferences

### Admin
- `/admin` — Admin dashboard
- `/admin/sources` — All-sources management table with promote/rescrape actions
- `/admin/users` — User table with role management
- `/admin/stats` — Analytics
- `/admin/system-settings` — Embedding provider config + image processing config

---

## 3. Public Pages

- `/` — Landing page: hero, features, how-it-works, MCP tool list, CTA
- `/pricing` — Plan comparison table + FAQ (SaaS only)
- `/docs` — Documentation and setup guides
- `/privacy` — Privacy policy
- `/terms` — Terms of service

---

## 4. Authentication

- **Email/Password** — Default method; first user becomes SUPER_ADMIN
- **GitHub OAuth** — Optional; enabled via env vars
- **Password Reset** — Email-based token flow
- **Email Verification** — Optional enforcement
- **API Key Auth** — Used for MCP server access; SHA256 hashed, optional expiry, `lastUsedAt` tracking
- **Roles**: USER, ADMIN, SUPER_ADMIN
- **On signup**: auto-create personal workspace + FREE subscription

---

## 5. Source / Connector Types

### WEBSITE
- URL-based web scraping
- Sitemap parsing
- `llms.txt` parsing for AI-friendly docs
- Robots.txt respect (configurable)
- Configurable max pages and crawl depth
- Include/exclude URL patterns
- Bot protection detection
- Custom user agent

### GITHUB
- Repository fetching via GitHub API
- README parsing
- `/docs` directory traversal
- Code file indexing
- Branch selection
- Path-based filtering

### DOCUMENT (file upload)
- Formats: PDF, DOCX, CSV, XLSX, TXT, MD, HTML, RTF, ODT
- Batch upload
- 50 MB limit per file
- OCR and Vision processing options

---

## 6. Document Pipeline

```
Source Created
    → Scrape / Upload Job queued
    → Content Fetched (scraper / extractor)
    → Text Extracted (format-specific)
    → Images Extracted (optional)
    → Image Processing (OCR / Vision / Skip)
    → Semantic Chunking
    → Embeddings Generated (batch)
    → Pages + Chunks saved to DB
    → BM25 index updated
    → Source status → ACTIVE
```

### Extraction by Format
| Format | Library |
|--------|---------|
| PDF | External microservice (`services/pdf-parser/`) |
| DOCX | mammoth |
| CSV/XLSX | xlsx |
| HTML | cheerio |
| TXT/MD | raw parsing |
| RTF/ODT | supported |

### Image Processing Options
| Method | Provider |
|--------|---------|
| OCR | Tesseract.js (local) |
| OpenAI Vision | gpt-4-vision |
| Azure Vision | Azure Computer Vision API |
| Skip | No processing |

### Chunking
- Semantic/token-aware splitting
- Configurable chunk size + overlap

### Job Management
- Redis-backed Bull queues
- Queues: `scrape`, `embed`, `update`, `document`
- Retry: 3 attempts, exponential backoff
- Job progress tracking with stage labels
- Automatic old-job cleanup

### Rescrape Scheduling
- Options: NEVER, DAILY, WEEKLY, MONTHLY
- Cron-based scheduler calculates next run time

---

## 7. Search

### Hybrid Search
- **BM25** — PostgreSQL full-text search
- **Vector similarity** — pgvector cosine similarity
- **Reciprocal Rank Fusion** — merges ranked lists from both

### Query Features
- Framework / library detection (React, Vue, Next.js, etc.)
- Intent and keyword extraction
- Query expansion
- Source filtering (by ID, domain)
- Workspace scoping
- Source score boosting
- Date range filtering

### Result Features
- LLM-based reranking
- Session tracking — avoids showing same result twice per session
- Query result caching
- Token-aware result truncation for MCP
- Relevance score 0–100 with breakdown
- Snippet generation

---

## 8. MCP Server

- Protocol: Model Context Protocol (Streamable HTTP)
- Endpoint: `POST /mcp`
- Auth: Bearer API key

### Tools
| Tool | Parameters | Description |
|------|-----------|-------------|
| `contextstream_search` | query, workspace, session_id, limit | Hybrid doc search |

### Workspace Parameter
- `personal` — user's workspace sources only
- `global` — shared global sources only
- `all` — personal + global
- `<slug>` — specific workspace by slug

### Output
- Markdown-formatted results
- Full text snippet per result
- Source title, URL, relevance score
- Session ID returned for deduplication chaining
- Cache hit indicator
- Query latency

---

## 9. Subscriptions & Billing

### Plans
| Plan | Price | Searches/mo | Sources | Workspaces | Pages | Rate |
|------|-------|------------|---------|------------|-------|------|
| FREE | $0 | 50 | 3 | 1 | 500 | 30 req/min |
| STARTER | $9 | 1,000 | 20 | 3 | 5,000 | 60 req/min |
| PRO | $19 | 10,000 | 100 | 10 | 50,000 | 120 req/min |
| TEAM | $49 | 50,000 | unlimited | unlimited | 250,000 | 300 req/min |
| ENTERPRISE | custom | unlimited | unlimited | unlimited | unlimited | 1,000 req/min |
| SELF_HOSTED | free | unlimited | unlimited | unlimited | unlimited | none |

### Usage Tracking Events
- `SEARCH` — search performed
- `SOURCE_ADDED` — new source created
- `PAGE_INDEXED` — page processed
- `API_REQUEST` — MCP API call
- `WORKSPACE_CREATED` — new workspace

### Quota System
- Monthly reset on 1st
- 80% threshold warning
- Hard limit → 402 Payment Required
- Per-event quota checking

### Stripe Integration
- Checkout sessions for plan upgrades
- Recurring subscriptions
- Customer portal for self-service
- Webhook-driven status sync

---

## 10. Admin Features

- **User management**: List all users, view role/workspace/key counts, promote to ADMIN/SUPER_ADMIN
- **Source management**: All sources across all workspaces, force rescrape, promote workspace → global
- **Embedding config**: CRUD for provider configs, activate provider, test connectivity, mask keys in UI
- **Image processing config**: Set method (OCR/Vision), configure per-provider settings
- **System stats**: Users, sources, workspaces, pages, usage events, query analytics

---

## 11. Feature Flags (`src/lib/features.ts`)

Controlled by `IS_SAAS_MODE` env var:

| Flag | SaaS | Self-Hosted |
|------|------|------------|
| usageTracking | ✅ | ❌ |
| quotaEnforcement | ✅ | ❌ |
| billingUI | ✅ | ❌ |
| rateLimiting | ✅ | ❌ |
| stripeIntegration | ✅ | ❌ |
| usageDashboard | ✅ | ❌ |
| upgradePrompts | ✅ | ❌ |
| adminAnalytics | ✅ | ✅ |
| apiKeys | ✅ | ✅ |
| mcpServer | ✅ | ✅ |
| multiWorkspace | ✅ | ✅ |
| advancedSearch | ✅ | ✅ |

---

## 12. Database Schema (Drizzle ORM + PostgreSQL + pgvector)

### Tables
| Table | Purpose |
|-------|---------|
| users | User accounts (id, email, name, role, emailVerified) |
| sessions | Auth sessions (Better-Auth managed) |
| accounts | OAuth linked accounts |
| workspaces | User workspaces (id, slug, name, ownerId) |
| workspace_sources | Many-to-many workspace ↔ source |
| sources | Documentation sources (type, status, scope, config) |
| pages | Indexed pages/documents (url, title, content, metadata) |
| chunks | Text chunks with vector embeddings |
| documents | Uploaded file records |
| jobs | Async job records (type, status, progress, error) |
| subscriptions | User subscription (planTier, stripeIds, status, limits) |
| usage_events | Per-event usage log (type, userId, timestamp) |
| api_keys | API keys (hash, lastUsedAt, expiresAt) |
| embedding_configs | Provider configs (provider, model, apiKey, isActive) |
| image_processing_configs | Image processing settings |
| query_logs | Search query history |

### Key Enums
- **UserRole**: USER, ADMIN, SUPER_ADMIN
- **SourceType**: WEBSITE, GITHUB, DOCUMENT
- **SourceStatus**: PENDING, INDEXING, ACTIVE, ERROR, PAUSED
- **SourceScope**: GLOBAL, WORKSPACE
- **JobType**: SCRAPE, EMBED, UPDATE, DOCUMENT_UPLOAD
- **JobStatus**: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
- **PlanTier**: FREE, STARTER, PRO, TEAM, ENTERPRISE, SELF_HOSTED
- **DocumentType**: TXT, PDF, DOCX, MD, CSV, XLSX, HTML, RTF, ODT
- **EmbeddingProvider**: OPENAI, AZURE_OPENAI, VERTEX_AI
- **ImageProcessingMethod**: OCR, OPENAI_VISION, AZURE_VISION, SKIP
- **RescrapeSchedule**: NEVER, DAILY, WEEKLY, MONTHLY

---

## 13. Embedding Providers

| Provider | Models | Notes |
|---------|--------|-------|
| OpenAI | text-embedding-3-large (3072d), text-embedding-3-small (1536d), ada-002 | Batch support |
| Azure OpenAI | Custom deployment | Configurable endpoint + deployment name |
| Google Vertex AI | text-embedding-004 | Service account auth |

All providers: configurable batch processing, exponential backoff retry, DB-backed config storage.

---

## 14. Key Dependencies

| Library | Purpose |
|---------|---------|
| Next.js 15 | Framework |
| React 19 | UI |
| Drizzle ORM | Database access |
| PostgreSQL + pgvector | Storage + vector search |
| Bull + Redis | Job queues |
| Better-Auth | Authentication |
| Stripe | Payments |
| OpenAI SDK | Embeddings + vision |
| Cheerio | HTML parsing |
| Mammoth | DOCX extraction |
| XLSX | Spreadsheet parsing |
| Tesseract.js | OCR |
| TanStack Query | Data fetching |
| React Hook Form + Zod | Forms + validation |
| Tailwind CSS v4 | Styling |
| shadcn/ui + Radix UI | Components |
| Winston | Logging |

---

## 15. Infrastructure

### Docker Images
- `Dockerfile.app` — Next.js application server
- `Dockerfile.worker` — Background job worker
- `Dockerfile.pdf-parser` — PDF extraction microservice

### Environment Modes
- **SaaS** (`IS_SAAS_MODE=true`) — billing, quotas, rate limiting, usage tracking all active
- **Self-Hosted** (`IS_SAAS_MODE=false`) — unlimited, no billing UI

### Required External Services
- PostgreSQL (with pgvector extension)
- Redis (job queues + caching)
- At least one embedding provider (OpenAI / Azure / Vertex)
- Stripe (SaaS mode only)
- SMTP (password reset emails)
