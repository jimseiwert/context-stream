# ContextStream Implementation Checklist

**Version:** 1.0
**Last Updated:** 2025-01-09
**Project Timeline:** 8-10 weeks (2 backend engineers + 2 frontend engineers)
**Architecture:** Global Source Architecture with RBAC

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Phase 1: Foundation Setup (Week 1-2)](#phase-1-foundation-setup-week-1-2)
3. [Phase 2: Core Backend (Week 2-4)](#phase-2-core-backend-week-2-4)
4. [Phase 3: Frontend Foundation (Week 3-5)](#phase-3-frontend-foundation-week-3-5)
5. [Phase 4: Search & MCP (Week 5-6)](#phase-4-search--mcp-week-5-6)
6. [Phase 5: Admin Features (Week 6-7)](#phase-5-admin-features-week-6-7)
7. [Phase 6: Testing & Polish (Week 7-8)](#phase-6-testing--polish-week-7-8)
8. [Phase 7: Deployment (Week 9-10)](#phase-7-deployment-week-9-10)
9. [Dependencies & Blockers](#dependencies--blockers)
10. [Success Criteria](#success-criteria)

---

## Project Overview

### Team Structure

**Backend Team (2 engineers):**
- Backend Engineer 1: Database, API routes, authentication
- Backend Engineer 2: Scraper, embeddings, background jobs

**Frontend Team (2 engineers):**
- Frontend Engineer 1: Layout, navigation, dashboard, sources
- Frontend Engineer 2: Search, admin UI, settings

### Tech Stack

**Backend:**
- Next.js 14+ (App Router)
- Prisma ORM + PostgreSQL 15+
- Bull Queue + Redis
- pgvector for embeddings
- Playwright for scraping

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS 3+
- shadcn/ui components
- TanStack Query

---

## Phase 1: Foundation Setup (Week 1-2)

### Week 1: Infrastructure & Database

#### Backend Tasks

- [ ] **Database Schema (Priority: CRITICAL)**
  - [ ] Create Prisma schema from `backend-spec.md`
  - [ ] Set up PostgreSQL database (local + staging)
  - [ ] Install pgvector extension
  - [ ] Create initial migration: `prisma migrate dev --name init_global_source_architecture`
  - [ ] Generate Prisma client: `prisma generate`
  - [ ] Verify schema with `prisma db push`
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Blocker:** None

- [ ] **Database Indexes (Priority: HIGH)**
  - [ ] Create full-text search index: `CREATE INDEX pages_fts_idx ON pages USING GIN (to_tsvector('english', "contentText"))`
  - [ ] Create vector similarity index: `CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
  - [ ] Create composite indexes for common queries
  - **Estimate:** 1 day
  - **Owner:** Backend Engineer 1
  - **Dependency:** Database schema

- [ ] **Seed Data (Priority: MEDIUM)**
  - [ ] Create seed script: `prisma/seed.ts`
  - [ ] Create default super admin user
  - [ ] Create default "Personal" workspace
  - [ ] Run seed: `npx prisma db seed`
  - **Estimate:** 0.5 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** Database schema

- [ ] **Redis Setup (Priority: HIGH)**
  - [ ] Set up Redis (local + staging)
  - [ ] Configure Bull Queue connection
  - [ ] Test Redis connectivity
  - **Estimate:** 0.5 days
  - **Owner:** Backend Engineer 2
  - **Blocker:** None

- [ ] **Authentication Setup (Priority: CRITICAL)**
  - [ ] Install NextAuth.js
  - [ ] Configure NextAuth with email/password provider
  - [ ] Add GitHub OAuth provider
  - [ ] Add Google OAuth provider (optional)
  - [ ] Set up session management
  - [ ] Create `/api/auth/[...nextauth]/route.ts`
  - [ ] Test authentication flow
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** Database schema

#### Frontend Tasks

- [ ] **Project Setup (Priority: CRITICAL)**
  - [ ] Initialize Next.js 14+ project (if not done)
  - [ ] Configure Tailwind CSS 3+
  - [ ] Install shadcn/ui CLI: `npx shadcn-ui@latest init`
  - [ ] Configure TypeScript strict mode
  - [ ] Set up ESLint and Prettier
  - **Estimate:** 1 day
  - **Owner:** Frontend Engineer 1
  - **Blocker:** None

- [ ] **Design System Implementation (Priority: HIGH)**
  - [ ] Configure Tailwind theme from `design-system.md`
  - [ ] Add Inter and JetBrains Mono fonts
  - [ ] Install core shadcn/ui components: Button, Card, Input, Dialog, Badge
  - [ ] Create theme provider with dark mode support
  - [ ] Test dark/light mode toggle
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 1
  - **Blocker:** None

- [ ] **Layout Components (Priority: HIGH)**
  - [ ] Create root layout: `app/layout.tsx`
  - [ ] Create dashboard layout: `app/(dashboard)/layout.tsx`
  - [ ] Create header component with navigation
  - [ ] Create sidebar component
  - [ ] Create mobile navigation
  - [ ] Test responsive breakpoints
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 1
  - **Blocker:** None

- [ ] **State Management Setup (Priority: HIGH)**
  - [ ] Install TanStack Query: `@tanstack/react-query`
  - [ ] Create QueryProvider: `src/components/providers/query-provider.tsx`
  - [ ] Configure query client with default options
  - [ ] Add React Query DevTools
  - **Estimate:** 0.5 days
  - **Owner:** Frontend Engineer 2
  - **Blocker:** None

### Week 2: Core API Foundation

#### Backend Tasks

- [ ] **API Route Structure (Priority: HIGH)**
  - [ ] Create API route folders according to `backend-spec.md`
  - [ ] Set up error handling middleware: `src/lib/utils/errors.ts`
  - [ ] Create API client helpers
  - [ ] Add request validation with Zod
  - [ ] Test basic API structure
  - **Estimate:** 1 day
  - **Owner:** Backend Engineer 1
  - **Dependency:** Authentication

- [ ] **Permission System (Priority: CRITICAL)**
  - [ ] Create permission definitions: `src/lib/auth/permissions.ts`
  - [ ] Implement role-permission mapping
  - [ ] Create `requireAuth()` middleware
  - [ ] Create `requirePermission()` middleware
  - [ ] Test permission checks
  - **Estimate:** 1 day
  - **Owner:** Backend Engineer 1
  - **Dependency:** Authentication

- [ ] **User Management API (Priority: HIGH)**
  - [ ] `GET /api/users/me` - Get current user
  - [ ] `PATCH /api/users/me` - Update user profile
  - [ ] Test with authenticated requests
  - **Estimate:** 1 day
  - **Owner:** Backend Engineer 1
  - **Dependency:** Permission system

- [ ] **Workspace API (Priority: HIGH)**
  - [ ] `GET /api/workspaces` - List workspaces
  - [ ] `POST /api/workspaces` - Create workspace
  - [ ] `GET /api/workspaces/:id` - Get workspace details
  - [ ] Test workspace CRUD operations
  - **Estimate:** 1 day
  - **Owner:** Backend Engineer 1
  - **Dependency:** User management API

#### Frontend Tasks

- [ ] **Authentication Pages (Priority: CRITICAL)**
  - [ ] Create login page: `app/(auth)/login/page.tsx`
  - [ ] Create register page: `app/(auth)/register/page.tsx`
  - [ ] Create auth forms with validation
  - [ ] Add OAuth buttons (GitHub, Google)
  - [ ] Test authentication flow end-to-end
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Backend authentication

- [ ] **Protected Routes (Priority: HIGH)**
  - [ ] Create auth middleware for protected routes
  - [ ] Add session check to dashboard layout
  - [ ] Redirect unauthenticated users to login
  - [ ] Test protected route access
  - **Estimate:** 1 day
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Authentication pages

- [ ] **API Client Library (Priority: HIGH)**
  - [ ] Create API client: `src/lib/api-client.ts`
  - [ ] Add authentication headers
  - [ ] Add error handling
  - [ ] Create typed request/response helpers
  - **Estimate:** 1 day
  - **Owner:** Frontend Engineer 2
  - **Dependency:** None

---

## Phase 2: Core Backend (Week 2-4)

### Week 2-3: Source Management Backend

#### Backend Tasks

- [ ] **Source CRUD API (Priority: CRITICAL)**
  - [ ] `POST /api/sources` - Create source with global check (see `api-contracts.md`)
  - [ ] `GET /api/sources` - List sources (global + workspace)
  - [ ] `GET /api/sources/:id` - Get source details
  - [ ] `PATCH /api/sources/:id` - Update source settings
  - [ ] `DELETE /api/sources/:id` - Delete/unlink source
  - [ ] Test all source endpoints
  - **Estimate:** 3 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** Workspace API

- [ ] **Source Query Helpers (Priority: HIGH)**
  - [ ] Implement `getWorkspaceSources()` from `backend-spec.md`
  - [ ] Implement `getSourceById()` with permission check
  - [ ] Implement `promoteSourceToGlobal()`
  - [ ] Implement `demoteSourceToWorkspace()`
  - [ ] Test query performance
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** Source CRUD API

- [ ] **Scraper Foundation (Priority: CRITICAL)**
  - [ ] Install Playwright: `npm install playwright`
  - [ ] Create `ScraperOrchestrator`: `src/lib/scraper/orchestrator.ts`
  - [ ] Implement URL discovery (BFS crawling)
  - [ ] Implement content extraction
  - [ ] Add robots.txt compliance
  - [ ] Test scraper on sample sites
  - **Estimate:** 4 days
  - **Owner:** Backend Engineer 2
  - **Dependency:** None

- [ ] **Bull Queue Setup (Priority: CRITICAL)**
  - [ ] Configure Bull queues: `src/lib/jobs/queue.ts`
  - [ ] Create scrape queue
  - [ ] Create embed queue
  - [ ] Create update queue
  - [ ] Add queue event listeners
  - [ ] Test job enqueueing
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 2
  - **Dependency:** Redis setup

### Week 3-4: Background Jobs & Embeddings

#### Backend Tasks

- [ ] **Scrape Job Processor (Priority: CRITICAL)**
  - [ ] Implement `processScrapeJob()` from `backend-spec.md`
  - [ ] Integrate with ScraperOrchestrator
  - [ ] Store pages in database
  - [ ] Update job progress in real-time
  - [ ] Handle errors gracefully
  - [ ] Test with real documentation sites
  - **Estimate:** 3 days
  - **Owner:** Backend Engineer 2
  - **Dependency:** Scraper foundation, Bull queue

- [ ] **Embedding Generation (Priority: CRITICAL)**
  - [ ] Install OpenAI SDK: `npm install openai`
  - [ ] Create `EmbeddingProvider`: `src/lib/embeddings/provider.ts`
  - [ ] Implement OpenAI embeddings (text-embedding-3-small)
  - [ ] Implement content chunking (512 tokens)
  - [ ] Test embedding generation
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 2
  - **Dependency:** None

- [ ] **Embed Job Processor (Priority: HIGH)**
  - [ ] Implement `processEmbedJob()`
  - [ ] Generate embeddings for all chunks
  - [ ] Store embeddings in database (pgvector)
  - [ ] Handle rate limiting for OpenAI API
  - [ ] Test with scraped pages
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 2
  - **Dependency:** Scrape job, embedding generation

- [ ] **Job Management API (Priority: MEDIUM)**
  - [ ] `GET /api/jobs` - List jobs
  - [ ] `GET /api/jobs/:id` - Get job status
  - [ ] `POST /api/jobs/:id/cancel` - Cancel job
  - [ ] `GET /api/jobs/:id/stream` - SSE for real-time progress
  - [ ] Test job management
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** Bull queue

---

## Phase 3: Frontend Foundation (Week 3-5)

### Week 3-4: Dashboard & Source Management UI

#### Frontend Tasks

- [ ] **Dashboard Page (Priority: HIGH)**
  - [ ] Create dashboard page: `app/(dashboard)/page.tsx`
  - [ ] Create stats cards component
  - [ ] Create recent sources widget
  - [ ] Create activity feed component
  - [ ] Fetch dashboard data with TanStack Query
  - [ ] Test dashboard rendering
  - **Estimate:** 3 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Dashboard API (can mock initially)

- [ ] **Source List Page (Priority: HIGH)**
  - [ ] Create sources page: `app/(dashboard)/sources/page.tsx`
  - [ ] Create source card component
  - [ ] Create source list component with filters
  - [ ] Add status badges
  - [ ] Add action dropdown menus
  - [ ] Fetch sources with TanStack Query
  - [ ] Test source list interactions
  - **Estimate:** 3 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Source API

- [ ] **Add Source Flow (Priority: CRITICAL)**
  - [ ] Create add source page: `app/(dashboard)/sources/new/page.tsx`
  - [ ] Create source form component with validation
  - [ ] Add URL validation and preview
  - [ ] Handle global source detection
  - [ ] Show indexing progress
  - [ ] Test entire flow end-to-end
  - **Estimate:** 3 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Source API, Job API

- [ ] **Source Detail Page (Priority: MEDIUM)**
  - [ ] Create source detail page: `app/(dashboard)/sources/[id]/page.tsx`
  - [ ] Show source metadata and stats
  - [ ] List indexed pages
  - [ ] Add update/delete actions
  - [ ] Test source detail view
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Source API

- [ ] **Custom Hooks (Priority: HIGH)**
  - [ ] `useSources()` - Query sources
  - [ ] `useSource(id)` - Query single source
  - [ ] `useCreateSource()` - Create mutation
  - [ ] `useUpdateSource(id)` - Update mutation
  - [ ] `useDeleteSource(id)` - Delete mutation
  - [ ] `useJobStatus(jobId)` - Real-time job polling
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 2
  - **Dependency:** API client

### Week 4-5: Real-time Updates & Job Progress

#### Frontend Tasks

- [ ] **Indexing Progress Component (Priority: HIGH)**
  - [ ] Create progress component with live updates
  - [ ] Show page count and percentage
  - [ ] Display current page being scraped
  - [ ] Show errors (if any)
  - [ ] Test real-time updates
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Job API

- [ ] **Job Status Hook (Priority: HIGH)**
  - [ ] Implement polling with TanStack Query
  - [ ] Auto-stop polling when job completes
  - [ ] Handle job errors
  - [ ] Test with long-running jobs
  - **Estimate:** 1 day
  - **Owner:** Frontend Engineer 2
  - **Dependency:** Job API

- [ ] **Toast Notifications (Priority: MEDIUM)**
  - [ ] Install Sonner: `npm install sonner`
  - [ ] Add toast provider
  - [ ] Show success/error toasts
  - [ ] Test toast notifications
  - **Estimate:** 1 day
  - **Owner:** Frontend Engineer 2
  - **Dependency:** None

---

## Phase 4: Search & MCP (Week 5-6)

### Week 5: Search Implementation

#### Backend Tasks

- [ ] **Hybrid Search Implementation (Priority: CRITICAL)**
  - [ ] Implement `HybridSearch` class from `backend-spec.md`
  - [ ] Implement full-text search (BM25)
  - [ ] Implement vector similarity search
  - [ ] Implement Reciprocal Rank Fusion
  - [ ] Test search accuracy
  - **Estimate:** 4 days
  - **Owner:** Backend Engineer 2
  - **Dependency:** Embeddings in database

- [ ] **Search API (Priority: CRITICAL)**
  - [ ] `POST /api/search` - Hybrid search
  - [ ] `GET /api/search/suggestions` - Autocomplete
  - [ ] Add source filtering
  - [ ] Add pagination
  - [ ] Log queries for analytics
  - [ ] Test search performance (<2s p95)
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** Hybrid search

- [ ] **Query Logging (Priority: MEDIUM)**
  - [ ] Create QueryLog records
  - [ ] Update SourceUsageStats
  - [ ] Track search latency
  - [ ] Test analytics tracking
  - **Estimate:** 1 day
  - **Owner:** Backend Engineer 1
  - **Dependency:** Search API

#### Frontend Tasks

- [ ] **Search Page (Priority: CRITICAL)**
  - [ ] Create search page: `app/(dashboard)/search/page.tsx`
  - [ ] Create search bar with autocomplete
  - [ ] Create search filters sidebar
  - [ ] Create search results component
  - [ ] Show loading states
  - [ ] Test search interactions
  - **Estimate:** 4 days
  - **Owner:** Frontend Engineer 2
  - **Dependency:** Search API

- [ ] **Search Result Card (Priority: HIGH)**
  - [ ] Create result card component
  - [ ] Show title, URL, snippet
  - [ ] Highlight query terms
  - [ ] Show source badge (global vs workspace)
  - [ ] Add relevance score (optional)
  - [ ] Test result rendering
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 2
  - **Dependency:** Search API

- [ ] **Search Hooks (Priority: HIGH)**
  - [ ] `useSearch(workspaceId)` - Search with debouncing
  - [ ] `useSearchSuggestions()` - Autocomplete
  - [ ] Handle filter updates
  - [ ] Test search performance
  - **Estimate:** 1 day
  - **Owner:** Frontend Engineer 2
  - **Dependency:** Search API

### Week 6: MCP Server Integration

#### Backend Tasks

- [ ] **MCP Server Implementation (Priority: HIGH)**
  - [ ] Create `ContextStreamMCP` class: `src/lib/mcp/server.ts`
  - [ ] Implement query handler
  - [ ] Format results for AI consumption
  - [ ] Add token counting
  - [ ] Test MCP responses
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 2
  - **Dependency:** Search API

- [ ] **MCP API Endpoints (Priority: HIGH)**
  - [ ] `POST /api/mcp/query` - MCP search
  - [ ] `GET /api/mcp/stream` - SSE streaming
  - [ ] Add API key authentication
  - [ ] Rate limit MCP requests (1000/hour)
  - [ ] Test MCP integration
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** MCP server, API key auth

- [ ] **API Key Management API (Priority: MEDIUM)**
  - [ ] `GET /api/api-keys` - List API keys
  - [ ] `POST /api/api-keys` - Create API key
  - [ ] `DELETE /api/api-keys/:id` - Revoke API key
  - [ ] Hash keys with SHA-256
  - [ ] Test API key CRUD
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** None

#### Frontend Tasks

- [ ] **API Key Management UI (Priority: MEDIUM)**
  - [ ] Create API keys page: `app/(dashboard)/settings/api-keys/page.tsx`
  - [ ] List existing API keys
  - [ ] Create new API key modal
  - [ ] Show key once (copy to clipboard)
  - [ ] Revoke API keys
  - [ ] Test API key management
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 2
  - **Dependency:** API key API

---

## Phase 5: Admin Features (Week 6-7)

### Week 6-7: Admin Dashboard & Source Promotion

#### Backend Tasks

- [ ] **Admin Source List API (Priority: HIGH)**
  - [ ] `GET /api/admin/sources` - List all sources with stats
  - [ ] Add filtering (scope, minWorkspaces)
  - [ ] Add sorting (workspaceCount, queryCount)
  - [ ] Calculate storage savings
  - [ ] Identify promotion candidates
  - [ ] Test admin queries
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** Permission system

- [ ] **Source Promotion API (Priority: HIGH)**
  - [ ] `POST /api/admin/sources/:id/promote` - Promote to global
  - [ ] `POST /api/admin/sources/:id/demote` - Demote to workspace
  - [ ] Create audit logs
  - [ ] Update WorkspaceSource links
  - [ ] Test promotion/demotion
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1
  - **Dependency:** Admin source list

- [ ] **Admin Stats API (Priority: MEDIUM)**
  - [ ] `GET /api/admin/stats` - System-wide statistics
  - [ ] Calculate user/workspace/source counts
  - [ ] Calculate storage usage
  - [ ] Calculate query metrics
  - [ ] Test stats calculation
  - **Estimate:** 1 day
  - **Owner:** Backend Engineer 1
  - **Dependency:** None

#### Frontend Tasks

- [ ] **Admin Layout (Priority: HIGH)**
  - [ ] Create admin layout: `app/(dashboard)/admin/layout.tsx`
  - [ ] Add permission gate (ADMIN or SUPER_ADMIN)
  - [ ] Create admin navigation
  - [ ] Test admin access control
  - **Estimate:** 1 day
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Permission system

- [ ] **Admin Sources Page (Priority: HIGH)**
  - [ ] Create admin sources page: `app/(dashboard)/admin/sources/page.tsx`
  - [ ] Create admin source table
  - [ ] Add filters (scope, minWorkspaces)
  - [ ] Show usage stats per source
  - [ ] Add promotion/demotion actions
  - [ ] Test admin source management
  - **Estimate:** 3 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Admin source API

- [ ] **Promotion Modal (Priority: MEDIUM)**
  - [ ] Create promotion modal component
  - [ ] Show source details
  - [ ] Calculate storage impact
  - [ ] Confirm promotion
  - [ ] Show success message
  - [ ] Test promotion flow
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Promotion API

- [ ] **Admin Dashboard (Priority: MEDIUM)**
  - [ ] Create admin dashboard: `app/(dashboard)/admin/page.tsx`
  - [ ] Show system-wide stats
  - [ ] Show promotion candidates
  - [ ] Show recent admin actions
  - [ ] Test admin dashboard
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 1
  - **Dependency:** Admin stats API

---

## Phase 6: Testing & Polish (Week 7-8)

### Week 7: Testing

#### Backend Tasks

- [ ] **Unit Tests (Priority: HIGH)**
  - [ ] Test permission system
  - [ ] Test source query helpers
  - [ ] Test search ranking (RRF)
  - [ ] Test embedding generation
  - [ ] Test job processors
  - **Estimate:** 3 days
  - **Owner:** Backend Engineer 1 & 2

- [ ] **Integration Tests (Priority: HIGH)**
  - [ ] Test source creation flow (global check)
  - [ ] Test scraping + embedding pipeline
  - [ ] Test search end-to-end
  - [ ] Test promotion/demotion
  - [ ] Test MCP integration
  - **Estimate:** 3 days
  - **Owner:** Backend Engineer 1 & 2

- [ ] **API Tests (Priority: MEDIUM)**
  - [ ] Test all API endpoints
  - [ ] Test authentication
  - [ ] Test permission checks
  - [ ] Test rate limiting
  - [ ] Test error responses
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1

#### Frontend Tasks

- [ ] **Component Tests (Priority: MEDIUM)**
  - [ ] Test source form validation
  - [ ] Test search interactions
  - [ ] Test admin modals
  - [ ] Test real-time updates
  - **Estimate:** 2 days
  - **Owner:** Frontend Engineer 2

- [ ] **E2E Tests (Priority: HIGH)**
  - [ ] Test user signup and login
  - [ ] Test adding a source (global and new)
  - [ ] Test search flow
  - [ ] Test admin promotion
  - [ ] Test MCP query (manual)
  - **Estimate:** 3 days
  - **Owner:** Frontend Engineer 1 & 2

### Week 8: Polish & Bug Fixes

#### All Team Tasks

- [ ] **Bug Fixes (Priority: CRITICAL)**
  - [ ] Fix critical bugs from testing
  - [ ] Fix UI issues
  - [ ] Fix performance issues
  - [ ] Fix accessibility issues
  - **Estimate:** 3 days
  - **Owner:** All

- [ ] **Performance Optimization (Priority: HIGH)**
  - [ ] Optimize search queries
  - [ ] Add database indexes if missing
  - [ ] Optimize frontend bundle size
  - [ ] Add caching where appropriate
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 2, Frontend Engineer 2

- [ ] **Documentation (Priority: MEDIUM)**
  - [ ] Update README.md
  - [ ] Create user guide
  - [ ] Create admin guide
  - [ ] Create MCP integration guide
  - [ ] Document API endpoints
  - **Estimate:** 2 days
  - **Owner:** All

- [ ] **Accessibility Audit (Priority: MEDIUM)**
  - [ ] Test keyboard navigation
  - [ ] Test screen reader support
  - [ ] Check color contrast
  - [ ] Add ARIA labels where missing
  - **Estimate:** 1 day
  - **Owner:** Frontend Engineer 1

---

## Phase 7: Deployment (Week 9-10)

### Week 9: Staging Deployment

#### DevOps Tasks

- [ ] **Staging Environment (Priority: CRITICAL)**
  - [ ] Set up PostgreSQL (managed service)
  - [ ] Set up Redis (managed service)
  - [ ] Configure environment variables
  - [ ] Deploy Next.js app to Vercel/Railway
  - [ ] Set up worker process for Bull Queue
  - [ ] Test staging deployment
  - **Estimate:** 3 days
  - **Owner:** Backend Engineer 1

- [ ] **Database Migration (Priority: CRITICAL)**
  - [ ] Run migrations on staging database
  - [ ] Verify schema
  - [ ] Seed initial data
  - [ ] Test database connectivity
  - **Estimate:** 1 day
  - **Owner:** Backend Engineer 1

- [ ] **Monitoring Setup (Priority: HIGH)**
  - [ ] Set up error tracking (Sentry)
  - [ ] Set up performance monitoring
  - [ ] Set up log aggregation
  - [ ] Create alerts for critical errors
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 2

### Week 10: Production Deployment

#### DevOps Tasks

- [ ] **Production Environment (Priority: CRITICAL)**
  - [ ] Set up production database (with backups)
  - [ ] Set up production Redis (with persistence)
  - [ ] Deploy Next.js app to production
  - [ ] Deploy worker processes
  - [ ] Configure CDN
  - [ ] Test production deployment
  - **Estimate:** 3 days
  - **Owner:** Backend Engineer 1

- [ ] **Security Hardening (Priority: CRITICAL)**
  - [ ] Enable HTTPS
  - [ ] Configure CORS
  - [ ] Add rate limiting
  - [ ] Enable security headers
  - [ ] Test security configurations
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 1

- [ ] **Load Testing (Priority: HIGH)**
  - [ ] Test search performance under load
  - [ ] Test concurrent scraping jobs
  - [ ] Test MCP endpoint load
  - [ ] Identify bottlenecks
  - **Estimate:** 2 days
  - **Owner:** Backend Engineer 2

- [ ] **Launch Preparation (Priority: MEDIUM)**
  - [ ] Create launch checklist
  - [ ] Prepare rollback plan
  - [ ] Set up status page
  - [ ] Prepare support documentation
  - **Estimate:** 1 day
  - **Owner:** All

---

## Dependencies & Blockers

### Critical Dependencies

1. **Database Schema → All Backend Development**
   - Blocker: Must complete Prisma schema before API routes
   - Mitigation: Complete in Week 1, Day 1-2

2. **Authentication → Protected Routes**
   - Blocker: Must complete auth before dashboard UI
   - Mitigation: Complete in Week 1, Day 3-4

3. **Source API → Frontend Source Management**
   - Blocker: Frontend needs API contracts finalized
   - Mitigation: Use mock data initially, swap to real API

4. **Embeddings → Search**
   - Blocker: Search requires embeddings in database
   - Mitigation: Use sample embedded data for testing

5. **Search API → MCP Integration**
   - Blocker: MCP depends on search functionality
   - Mitigation: Implement MCP after search is working

### External Dependencies

1. **OpenAI API** (for embeddings)
   - Risk: Rate limiting, API changes
   - Mitigation: Implement retry logic, fallback to local embeddings

2. **Playwright** (for scraping)
   - Risk: Sites blocking scrapers
   - Mitigation: Respect robots.txt, add user-agent, implement delays

3. **PostgreSQL + pgvector**
   - Risk: Version compatibility
   - Mitigation: Use Docker for consistent environment

---

## Success Criteria

### Phase 1: Foundation (Week 1-2)

✅ Database schema migrated successfully
✅ Authentication working (email + OAuth)
✅ Protected routes redirect unauthenticated users
✅ Dashboard layout renders correctly
✅ Design system implemented with dark mode

### Phase 2: Core Backend (Week 2-4)

✅ Source CRUD API working with global source detection
✅ Scraper successfully indexes sample documentation sites
✅ Background jobs process reliably
✅ Embeddings generated for scraped pages
✅ Job progress tracked in real-time

### Phase 3: Frontend Foundation (Week 3-5)

✅ Dashboard displays user statistics
✅ Source list shows global and workspace sources
✅ Add source flow works end-to-end
✅ Real-time job progress displayed
✅ Forms validate user input

### Phase 4: Search & MCP (Week 5-6)

✅ Hybrid search returns relevant results (<2s p95)
✅ Search filters work correctly
✅ MCP endpoint returns AI-formatted results
✅ API key management working
✅ Search logs tracked for analytics

### Phase 5: Admin Features (Week 6-7)

✅ Admin dashboard shows system stats
✅ Source promotion/demotion working
✅ Audit logs created for admin actions
✅ Permission system enforces role-based access
✅ Usage stats calculated correctly

### Phase 6: Testing & Polish (Week 7-8)

✅ All critical bugs fixed
✅ Unit test coverage >70%
✅ E2E tests passing
✅ Performance targets met (search <2s, page load <1s)
✅ WCAG AA accessibility compliance

### Phase 7: Deployment (Week 9-10)

✅ Staging environment stable
✅ Production deployment successful
✅ Monitoring and alerts configured
✅ Load testing completed
✅ Documentation published

---

## Risk Mitigation

### High-Risk Items

1. **Search Performance**
   - Risk: Slow search queries (>2s)
   - Mitigation: Optimize indexes, implement caching, use connection pooling

2. **Scraping Reliability**
   - Risk: Sites block or change structure
   - Mitigation: Retry logic, error handling, respect robots.txt

3. **Database Migration**
   - Risk: Data loss during migration
   - Mitigation: Backup before migration, test on staging first

4. **OpenAI Rate Limits**
   - Risk: Embedding generation throttled
   - Mitigation: Implement queue with rate limiting, batch requests

---

## Project Milestones

| Milestone | Target Date | Description |
|-----------|-------------|-------------|
| **M1: Foundation Complete** | End of Week 2 | Database, auth, layouts complete |
| **M2: Backend MVP** | End of Week 4 | Source CRUD, scraping, embeddings working |
| **M3: Frontend MVP** | End of Week 5 | Dashboard, sources, real-time updates complete |
| **M4: Search Complete** | End of Week 6 | Hybrid search and MCP working |
| **M5: Admin Features** | End of Week 7 | Admin dashboard and promotion complete |
| **M6: Testing Complete** | End of Week 8 | All tests passing, bugs fixed |
| **M7: Staging Deployed** | End of Week 9 | Staging environment stable |
| **M8: Production Launch** | End of Week 10 | Production deployed and monitored |

---

## Summary

This implementation checklist provides:

✅ **Week-by-week breakdown** of all tasks
✅ **Task estimates** and ownership
✅ **Dependencies** clearly marked
✅ **Success criteria** for each phase
✅ **Risk mitigation** strategies
✅ **Project milestones** with target dates

**Total Estimated Timeline:** 8-10 weeks
**Team Size:** 2 backend + 2 frontend engineers
**Architecture:** Global Source Architecture with RBAC

**Critical Path:**
1. Database schema (Week 1)
2. Authentication (Week 1)
3. Source API (Week 2-3)
4. Scraping + Embeddings (Week 3-4)
5. Search (Week 5)
6. MCP (Week 6)
7. Admin features (Week 6-7)
8. Testing (Week 7-8)
9. Deployment (Week 9-10)

The team can work in parallel on backend and frontend after Week 2, significantly reducing overall timeline.
