# ContextStream Next.js Full-Stack Architecture

## Executive Summary

This document outlines a comprehensive Next.js 14+ full-stack architecture for ContextStream (KnowBase), replacing the originally planned Python FastAPI + Next.js frontend split with a unified TypeScript solution.

**Key Decision: Why Next.js Full-Stack?**
- **Unified Language**: TypeScript throughout (frontend + backend + database types)
- **Modern DX**: Server Components, Server Actions, hot-reload, type-safe APIs
- **Simplified Deployment**: Single build, Docker-friendly, Vercel-ready
- **Performance**: Server-side rendering, edge-ready, optimized bundling
- **Ecosystem**: Rich Node.js ecosystem for web scraping, embeddings, and background jobs

**Trade-offs Accepted:**
- Node.js ecosystem for ML/embeddings (vs Python's mature ML libraries)
- Mitigation: Use `@xenova/transformers` (WebAssembly) for local embeddings
- CPU-intensive tasks handled via worker threads and Bull queue

**Related Documentation:**
- 📘 **[Global Source Architecture](./GLOBAL_SOURCE_ARCHITECTURE.md)** - Shared sources with role-based access control (storage deduplication, admin features)
- 📘 **[Product Requirements](./product-manager-output.md)** - User personas, feature specs, success metrics
- 📘 **[Design System](./design/)** - UX/UI specifications, components, user flows

---

## 1. Core Architecture

### 1.1 Technology Stack

#### Core Framework
- **Next.js 14+** with App Router
- **TypeScript 5.3+** (strict mode enabled)
- **React 18+** with Server Components
- **Node.js 20+** LTS

#### Database & Storage
- **PostgreSQL 15+** (primary data store)
- **pgvector extension** (vector similarity search)
- **Prisma ORM 5+** (type-safe database client)
- **Redis 7+** (optional: caching, rate limiting, session storage)

#### Backend Services
- **Next.js API Routes** (REST endpoints)
- **Server Actions** (form submissions, mutations)
- **Bull Queue** (background job processing)
- **Worker Threads** (CPU-intensive tasks)

#### Scraping & Processing
- **Playwright** (headless browser for JS-heavy sites)
- **Cheerio** (fast HTML parsing)
- **Readability** (content extraction)
- **@mozilla/readability** (article extraction)

#### Embeddings & Search
- **@xenova/transformers** (local embeddings via WebGPU/WASM)
- **OpenAI SDK** (cloud embeddings alternative)
- **PostgreSQL Full-Text Search** (ts_vector)
- **pgvector** (cosine similarity)

#### Authentication & Security
- **NextAuth.js v5 (Auth.js)** (session management)
- **API Keys** (MCP authentication)
- **JWT** (web sessions)
- **bcrypt** (password hashing)
- **Zod** (runtime validation)

#### Frontend & UI
- **Tailwind CSS 3+** (utility-first styling)
- **shadcn/ui** (component library)
- **TanStack Query v5** (client-side state management)
- **Lucide Icons** (icon system)
- **Recharts** (analytics charts)

#### DevOps & Infrastructure
- **Docker** (containerization)
- **Docker Compose** (local development)
- **GitHub Actions** (CI/CD)
- **Vercel** (optional deployment)
- **Winston** (logging)
- **Prometheus + Grafana** (monitoring)

---

### 1.2 Directory Structure

```
context-stream/
├── .next/                          # Next.js build output (gitignored)
├── .env.local                      # Environment variables (gitignored)
├── .env.example                    # Example env template
│
├── prisma/                         # Database
│   ├── schema.prisma              # Prisma schema
│   ├── migrations/                # Database migrations
│   └── seed.ts                    # Seed data
│
├── public/                         # Static assets
│   ├── favicon.ico
│   └── images/
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Landing page
│   │   ├── globals.css           # Global styles
│   │   │
│   │   ├── (auth)/               # Auth route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   │   ├── layout.tsx        # Dashboard layout
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   ├── sources/          # Source management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── search/           # Search interface
│   │   │   │   └── page.tsx
│   │   │   ├── workspaces/       # Workspace management
│   │   │   │   └── page.tsx
│   │   │   └── settings/         # User settings
│   │   │       └── page.tsx
│   │   │
│   │   └── api/                  # API Routes (Backend)
│   │       ├── auth/             # NextAuth endpoints
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       ├── sources/          # Source CRUD
│   │       │   ├── route.ts      # GET, POST
│   │       │   └── [id]/
│   │       │       └── route.ts  # GET, PATCH, DELETE
│   │       ├── search/           # Search endpoints
│   │       │   └── route.ts
│   │       ├── jobs/             # Job status
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       ├── mcp/              # MCP server endpoints
│   │       │   ├── query/
│   │       │   │   └── route.ts
│   │       │   └── stream/
│   │       │       └── route.ts
│   │       └── health/           # Health check
│   │           └── route.ts
│   │
│   ├── lib/                      # Backend business logic
│   │   ├── db/                   # Database
│   │   │   ├── prisma.ts         # Prisma client singleton
│   │   │   └── queries/          # Reusable queries
│   │   │       ├── sources.ts
│   │   │       ├── pages.ts
│   │   │       └── chunks.ts
│   │   │
│   │   ├── scraper/              # Web scraping
│   │   │   ├── orchestrator.ts   # Main scraper coordinator
│   │   │   ├── playwright-scraper.ts
│   │   │   ├── content-extractor.ts
│   │   │   ├── url-discovery.ts
│   │   │   └── robots-parser.ts
│   │   │
│   │   ├── embeddings/           # Embedding generation
│   │   │   ├── provider.ts       # Abstract provider interface
│   │   │   ├── openai.ts         # OpenAI embeddings
│   │   │   ├── local.ts          # @xenova/transformers
│   │   │   └── chunker.ts        # Content chunking
│   │   │
│   │   ├── search/               # Search engine
│   │   │   ├── hybrid-search.ts  # BM25 + vector ranking
│   │   │   ├── vector-search.ts
│   │   │   ├── fulltext-search.ts
│   │   │   └── ranking.ts
│   │   │
│   │   ├── mcp/                  # MCP server
│   │   │   ├── server.ts         # MCP protocol implementation
│   │   │   ├── handlers.ts       # Request handlers
│   │   │   └── streaming.ts      # SSE streaming
│   │   │
│   │   ├── jobs/                 # Background jobs
│   │   │   ├── queue.ts          # Bull queue setup
│   │   │   ├── processors/       # Job processors
│   │   │   │   ├── scrape-job.ts
│   │   │   │   ├── embed-job.ts
│   │   │   │   └── update-job.ts
│   │   │   └── scheduler.ts      # Cron jobs
│   │   │
│   │   ├── auth/                 # Authentication
│   │   │   ├── config.ts         # NextAuth config
│   │   │   ├── api-key.ts        # API key validation
│   │   │   └── middleware.ts     # Auth middleware
│   │   │
│   │   └── utils/                # Utilities
│   │       ├── logger.ts         # Winston logger
│   │       ├── errors.ts         # Error classes
│   │       ├── validation.ts     # Zod schemas
│   │       └── rate-limit.ts     # Rate limiting
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── sources/              # Source-related components
│   │   │   ├── source-card.tsx
│   │   │   ├── source-form.tsx
│   │   │   └── source-list.tsx
│   │   ├── search/               # Search components
│   │   │   ├── search-bar.tsx
│   │   │   ├── search-results.tsx
│   │   │   └── search-filters.tsx
│   │   └── layout/               # Layout components
│   │       ├── header.tsx
│   │       ├── sidebar.tsx
│   │       └── footer.tsx
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-sources.ts
│   │   ├── use-search.ts
│   │   └── use-jobs.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── api.ts                # API types
│   │   ├── models.ts             # Domain models
│   │   └── mcp.ts                # MCP types
│   │
│   └── config/                   # App configuration
│       ├── site.ts               # Site metadata
│       └── constants.ts          # Constants
│
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                      # Utility scripts
│   ├── setup-db.sh
│   └── seed-data.ts
│
├── docker/                       # Docker configs
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── .github/                      # GitHub configs
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── .eslintrc.json
├── .prettierrc
└── README.md
```

---

## 2. Data Architecture

> **Note:** This section shows the **baseline schema**. For the enhanced version with global sources, role-based access control, and storage deduplication, see **[Global Source Architecture](./GLOBAL_SOURCE_ARCHITECTURE.md)**.

### 2.1 Prisma Schema (Baseline)

> ⚠️ **Important:** This is the initial schema. The production implementation should use the **Global Source Architecture** which adds:
> - `SourceScope` enum (GLOBAL, WORKSPACE)
> - `UserRole` enum (SUPER_ADMIN, ADMIN, USER)
> - `WorkspaceSource` join table (many-to-many)
> - `SourceUsageStats` for analytics
> - Storage deduplication (99% savings on popular sources)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

// Workspaces for multi-tenancy
model Workspace {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  ownerId   String?
  owner     User?    @relation(fields: [ownerId], references: [id])
  sources   Source[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
}

// Users (NextAuth compatible)
model User {
  id            String    @id @default(uuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  workspaces    Workspace[]
  apiKeys       ApiKey[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// NextAuth Account model
model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

// NextAuth Session model
model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// API Keys for MCP authentication
model ApiKey {
  id          String   @id @default(uuid())
  name        String
  key         String   @unique // hashed
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())

  @@index([userId])
}

// Documentation sources
model Source {
  id              String        @id @default(uuid())
  url             String
  domain          String
  type            SourceType
  workspaceId     String
  workspace       Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  config          Json?         // Scraping config, auth, etc.
  status          SourceStatus  @default(PENDING)
  lastScrapedAt   DateTime?
  lastUpdatedAt   DateTime?
  errorMessage    String?
  pages           Page[]
  jobs            Job[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([workspaceId, url])
  @@index([workspaceId])
  @@index([status])
}

enum SourceType {
  WEBSITE
  GITHUB
  CONFLUENCE
  CUSTOM
}

enum SourceStatus {
  PENDING
  INDEXING
  ACTIVE
  ERROR
  PAUSED
}

// Scraped pages
model Page {
  id           String   @id @default(uuid())
  sourceId     String
  source       Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  url          String
  title        String?
  contentText  String   // Plain text for FTS
  contentHtml  String?  // Original HTML
  metadata     Json?    // Headings, code blocks, etc.
  checksum     String   // For change detection
  chunks       Chunk[]
  indexedAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([sourceId, url])
  @@index([sourceId])
  // Full-text search index (PostgreSQL FTS)
  @@map("pages")
}

// Content chunks with embeddings
model Chunk {
  id         String                      @id @default(uuid())
  pageId     String
  page       Page                        @relation(fields: [pageId], references: [id], onDelete: Cascade)
  chunkIndex Int
  content    String
  embedding  Unsupported("vector(1536)")? // pgvector
  metadata   Json?
  createdAt  DateTime                    @default(now())

  @@unique([pageId, chunkIndex])
  @@index([pageId])
  @@map("chunks")
}

// Background jobs
model Job {
  id           String    @id @default(uuid())
  sourceId     String
  source       Source    @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  type         JobType
  status       JobStatus @default(PENDING)
  progress     Json?     // {pagesScraped, total, errors, etc.}
  result       Json?
  errorMessage String?
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime  @default(now())

  @@index([sourceId])
  @@index([status])
}

enum JobType {
  SCRAPE
  EMBED
  UPDATE
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

// Query logs for analytics
model QueryLog {
  id           String   @id @default(uuid())
  query        String
  resultsCount Int?
  topPageIds   String[]
  latencyMs    Int?
  workspaceId  String?
  userId       String?
  queriedAt    DateTime @default(now())

  @@index([workspaceId])
  @@index([queriedAt])
}
```

### 2.2 Database Indexes & Extensions

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Full-text search index on pages.contentText
CREATE INDEX pages_fts_idx ON pages USING GIN (to_tsvector('english', "contentText"));

-- Vector similarity index (IVFFlat for faster ANN search)
CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Composite indexes for common queries
CREATE INDEX sources_workspace_status_idx ON sources (workspace_id, status);
CREATE INDEX jobs_source_status_idx ON jobs (source_id, status);
CREATE INDEX pages_source_indexed_idx ON pages (source_id, indexed_at DESC);
```

---

## 3. API Design

### 3.1 REST API Routes

#### Sources API

```typescript
// GET /api/sources - List all sources
// Query params: ?workspaceId=xxx&status=ACTIVE&limit=20&offset=0
Response: {
  sources: Source[]
  total: number
  limit: number
  offset: number
}

// POST /api/sources - Create new source
Body: {
  url: string
  type: SourceType
  workspaceId: string
  config?: Record<string, any>
}
Response: {
  source: Source
  jobId: string
}

// GET /api/sources/[id] - Get source details
Response: {
  source: Source
  stats: {
    totalPages: number
    lastScraped: string
    storageSize: number
  }
}

// PATCH /api/sources/[id] - Update source
Body: Partial<Source>
Response: { source: Source }

// DELETE /api/sources/[id] - Delete source
Response: { success: boolean }

// POST /api/sources/[id]/scrape - Trigger scrape
Response: { jobId: string }
```

#### Search API

```typescript
// POST /api/search
Body: {
  query: string
  workspaceId: string
  limit?: number
  offset?: number
  filters?: {
    sourceIds?: string[]
    dateRange?: { from: string; to: string }
  }
}
Response: {
  results: {
    id: string
    pageId: string
    title: string
    snippet: string
    url: string
    score: number
    source: { name: string; domain: string }
  }[]
  total: number
  latencyMs: number
}
```

#### Jobs API

```typescript
// GET /api/jobs?sourceId=xxx&status=RUNNING
Response: {
  jobs: Job[]
  total: number
}

// GET /api/jobs/[id]
Response: {
  job: Job
  logs?: string[]
}

// POST /api/jobs/[id]/cancel
Response: { success: boolean }
```

#### MCP API

```typescript
// POST /api/mcp/query
Headers: { Authorization: "Bearer <api-key>" }
Body: {
  query: string
  workspaceId: string
  context?: Record<string, any>
}
Response: {
  results: Array<{
    content: string
    metadata: Record<string, any>
    source: string
  }>
  tokensUsed: number
}

// GET /api/mcp/stream (Server-Sent Events)
Headers: { Authorization: "Bearer <api-key>" }
Query: ?query=xxx&workspaceId=yyy
Streams: SSE events with partial results
```

### 3.2 Server Actions

```typescript
// src/app/actions/sources.ts
'use server'

export async function createSource(data: CreateSourceInput) {
  // Validate with Zod
  const validated = CreateSourceSchema.parse(data)

  // Create source in DB
  const source = await prisma.source.create({ data: validated })

  // Enqueue scrape job
  await scrapeQueue.add('scrape', { sourceId: source.id })

  revalidatePath('/dashboard/sources')
  return { success: true, source }
}

export async function updateSource(id: string, data: UpdateSourceInput) {
  // Implementation
}

export async function deleteSource(id: string) {
  // Implementation
}
```

---

## 4. Core Features Implementation

### 4.1 Web Scraping Pipeline

```typescript
// src/lib/scraper/orchestrator.ts

import { chromium } from 'playwright'
import { Queue } from 'bull'
import { prisma } from '@/lib/db/prisma'

export class ScraperOrchestrator {
  private queue: Queue
  private browser: Browser

  async scrapeSource(sourceId: string) {
    const source = await prisma.source.findUnique({ where: { id: sourceId } })

    // 1. URL Discovery
    const urls = await this.discoverUrls(source.url, source.domain)

    // 2. Create scrape jobs
    const jobs = urls.map(url => ({
      sourceId,
      url,
      priority: this.calculatePriority(url)
    }))

    // 3. Process with concurrency control
    await this.processUrlsBatch(jobs, { concurrency: 5 })

    // 4. Update source status
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: 'ACTIVE', lastScrapedAt: new Date() }
    })
  }

  private async discoverUrls(startUrl: string, domain: string): Promise<string[]> {
    // BFS to discover all pages in domain
    const visited = new Set<string>()
    const queue = [startUrl]

    while (queue.length > 0) {
      const url = queue.shift()!
      if (visited.has(url)) continue

      visited.add(url)

      // Respect robots.txt
      if (!(await this.isAllowed(url))) continue

      // Fetch and parse links
      const links = await this.extractLinks(url, domain)
      queue.push(...links.filter(l => !visited.has(l)))
    }

    return Array.from(visited)
  }

  private async scrapePage(url: string): Promise<PageContent> {
    const page = await this.browser.newPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle' })

      // Extract content using Readability
      const content = await page.evaluate(() => {
        const article = new Readability(document).parse()
        return {
          title: article?.title,
          content: article?.content,
          textContent: article?.textContent,
          excerpt: article?.excerpt
        }
      })

      return {
        url,
        title: content.title,
        html: content.content,
        text: content.textContent,
        metadata: { excerpt: content.excerpt }
      }
    } finally {
      await page.close()
    }
  }
}
```

### 4.2 Embedding Generation

```typescript
// src/lib/embeddings/local.ts (using @xenova/transformers)

import { pipeline } from '@xenova/transformers'

export class LocalEmbeddingProvider {
  private model: any

  async initialize() {
    this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await this.model(texts, { pooling: 'mean', normalize: true })
    return embeddings.tolist()
  }

  async chunkAndEmbed(text: string): Promise<Array<{ content: string; embedding: number[] }>> {
    const chunks = this.chunkText(text, { maxTokens: 512, overlap: 50 })
    const embeddings = await this.generateEmbeddings(chunks.map(c => c.content))

    return chunks.map((chunk, i) => ({
      content: chunk.content,
      embedding: embeddings[i]
    }))
  }

  private chunkText(text: string, options: { maxTokens: number; overlap: number }) {
    // Semantic chunking by paragraphs/headings
    // Fall back to sliding window if needed
    const chunks: Array<{ content: string; startIndex: number }> = []

    // Implementation: split by paragraphs, respecting maxTokens

    return chunks
  }
}

// src/lib/embeddings/openai.ts

import OpenAI from 'openai'

export class OpenAIEmbeddingProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts
    })

    return response.data.map(d => d.embedding)
  }
}
```

### 4.3 Hybrid Search

```typescript
// src/lib/search/hybrid-search.ts

import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

export class HybridSearch {
  async search(query: string, options: SearchOptions) {
    const { workspaceId, limit = 10, offset = 0 } = options

    // 1. Full-text search (BM25)
    const ftsResults = await this.fullTextSearch(query, workspaceId)

    // 2. Vector similarity search
    const vectorResults = await this.vectorSearch(query, workspaceId)

    // 3. Combine and rank (RRF - Reciprocal Rank Fusion)
    const combined = this.reciprocalRankFusion(ftsResults, vectorResults)

    // 4. Paginate
    return combined.slice(offset, offset + limit)
  }

  private async fullTextSearch(query: string, workspaceId: string) {
    return prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT
        p.id,
        ts_rank(to_tsvector('english', p."contentText"), plainto_tsquery('english', ${query})) as rank
      FROM pages p
      INNER JOIN sources s ON p."sourceId" = s.id
      WHERE s."workspaceId" = ${workspaceId}
        AND to_tsvector('english', p."contentText") @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 100
    `
  }

  private async vectorSearch(query: string, workspaceId: string) {
    // Generate query embedding
    const embedding = await this.embeddingProvider.generateEmbeddings([query])
    const queryVector = embedding[0]

    // Cosine similarity search
    return prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
      SELECT
        c."pageId" as id,
        1 - (c.embedding <=> ${queryVector}::vector) as similarity
      FROM chunks c
      INNER JOIN pages p ON c."pageId" = p.id
      INNER JOIN sources s ON p."sourceId" = s.id
      WHERE s."workspaceId" = ${workspaceId}
      ORDER BY c.embedding <=> ${queryVector}::vector
      LIMIT 100
    `
  }

  private reciprocalRankFusion(
    ftsResults: Array<{ id: string; rank: number }>,
    vectorResults: Array<{ id: string; similarity: number }>
  ) {
    const k = 60 // RRF constant
    const scores = new Map<string, number>()

    // Add FTS scores
    ftsResults.forEach((result, index) => {
      const score = 1 / (k + index + 1)
      scores.set(result.id, (scores.get(result.id) || 0) + score)
    })

    // Add vector scores
    vectorResults.forEach((result, index) => {
      const score = 1 / (k + index + 1)
      scores.set(result.id, (scores.get(result.id) || 0) + score)
    })

    // Sort by combined score
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({ id, score }))
  }
}
```

### 4.4 Background Jobs (Bull Queue)

```typescript
// src/lib/jobs/queue.ts

import Queue from 'bull'
import Redis from 'ioredis'

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
}

export const scrapeQueue = new Queue('scrape', { redis: redisConfig })
export const embedQueue = new Queue('embed', { redis: redisConfig })

// src/lib/jobs/processors/scrape-job.ts

import { Job } from 'bull'
import { ScraperOrchestrator } from '@/lib/scraper/orchestrator'

scrapeQueue.process('scrape', async (job: Job) => {
  const { sourceId } = job.data

  const orchestrator = new ScraperOrchestrator()

  // Progress reporting
  job.progress(0)

  await orchestrator.scrapeSource(sourceId, {
    onProgress: (progress) => {
      job.progress(progress.percentage)

      // Update job record in DB
      prisma.job.update({
        where: { id: job.id },
        data: {
          progress: {
            pagesScraped: progress.pagesScraped,
            total: progress.total,
            errors: progress.errors
          }
        }
      })
    }
  })

  return { success: true }
})
```

### 4.5 MCP Server Implementation

```typescript
// src/lib/mcp/server.ts

import { MCPServer } from '@anthropic-ai/mcp-server' // Hypothetical SDK
import { HybridSearch } from '@/lib/search/hybrid-search'

export class ContextStreamMCP {
  private server: MCPServer
  private search: HybridSearch

  constructor() {
    this.search = new HybridSearch()
    this.server = new MCPServer({
      name: 'ContextStream',
      version: '1.0.0',
      capabilities: ['search', 'stream']
    })

    this.registerHandlers()
  }

  private registerHandlers() {
    // Query handler
    this.server.on('query', async (request) => {
      const { query, workspaceId } = request.params

      // Validate API key from request headers
      const apiKey = request.headers.authorization?.replace('Bearer ', '')
      await this.validateApiKey(apiKey)

      // Perform search
      const results = await this.search.search(query, { workspaceId, limit: 10 })

      // Format for MCP response
      return {
        results: results.map(r => ({
          content: r.content,
          metadata: {
            source: r.source.url,
            title: r.title,
            relevance: r.score
          }
        }))
      }
    })

    // Streaming handler (SSE)
    this.server.on('stream', async (request, response) => {
      const { query, workspaceId } = request.params

      // Set up SSE
      response.setHeader('Content-Type', 'text/event-stream')
      response.setHeader('Cache-Control', 'no-cache')
      response.setHeader('Connection', 'keep-alive')

      // Stream results as they're found
      for await (const result of this.search.searchStream(query, { workspaceId })) {
        response.write(`data: ${JSON.stringify(result)}\n\n`)
      }

      response.end()
    })
  }

  async start(port: number) {
    await this.server.listen(port)
    console.log(`MCP Server running on port ${port}`)
  }
}

// Start MCP server (separate process or same Next.js server)
// Option 1: Run as separate process
// node src/lib/mcp/start-server.js

// Option 2: Integrate with Next.js (custom server)
// See next.config.js customServer option
```

---

## 5. Frontend Architecture

### 5.1 Server Components vs Client Components

**Server Components (Default):**
- Dashboard layouts
- Source lists
- Search results (initial load)
- Settings pages

**Client Components (use 'use client'):**
- Forms with interactivity
- Real-time job progress
- Search input with autocomplete
- Data tables with sorting/filtering

### 5.2 Data Fetching Strategy

```typescript
// src/app/(dashboard)/sources/page.tsx (Server Component)

import { prisma } from '@/lib/db/prisma'
import { SourceCard } from '@/components/sources/source-card'

export default async function SourcesPage() {
  // Fetch data in Server Component (runs on server)
  const sources = await prisma.source.findMany({
    where: { workspaceId: 'current-workspace' },
    include: { _count: { select: { pages: true } } },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <h1>Documentation Sources</h1>
      <div className="grid gap-4">
        {sources.map(source => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
    </div>
  )
}

// src/components/sources/source-card.tsx (Client Component)

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function SourceCard({ source }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleScrape = async () => {
    setIsLoading(true)
    await fetch(`/api/sources/${source.id}/scrape`, { method: 'POST' })
    setIsLoading(false)
  }

  return (
    <div className="border rounded-lg p-4">
      <h3>{source.domain}</h3>
      <p>{source.status}</p>
      <Button onClick={handleScrape} disabled={isLoading}>
        Scrape Now
      </Button>
    </div>
  )
}
```

### 5.3 Client-Side State Management (TanStack Query)

```typescript
// src/hooks/use-sources.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useSources(workspaceId: string) {
  return useQuery({
    queryKey: ['sources', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/sources?workspaceId=${workspaceId}`)
      return res.json()
    }
  })
}

export function useCreateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSourceInput) => {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return res.json()
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    }
  })
}

// Usage in component
'use client'

export function SourceList() {
  const { data, isLoading } = useSources('workspace-id')
  const createSource = useCreateSource()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {data.sources.map(source => (
        <SourceCard key={source.id} source={source} />
      ))}
    </div>
  )
}
```

---

## 6. Performance Optimizations

### 6.1 Caching Strategy

```typescript
// Next.js Route Caching (App Router)

// src/app/api/sources/route.ts
export const revalidate = 60 // Revalidate every 60 seconds

// Manual revalidation after mutations
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  // Create source
  const source = await createSource(data)

  // Revalidate sources page
  revalidatePath('/dashboard/sources')

  return Response.json({ source })
}

// React Cache (deduplication within a request)
import { cache } from 'react'

export const getSource = cache(async (id: string) => {
  return prisma.source.findUnique({ where: { id } })
})

// Redis caching for expensive queries
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function searchWithCache(query: string) {
  const cacheKey = `search:${query}`

  // Check cache
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Compute
  const results = await search.search(query)

  // Store in cache (5 minutes)
  await redis.setex(cacheKey, 300, JSON.stringify(results))

  return results
}
```

### 6.2 Database Query Optimization

```typescript
// Use Prisma's query optimization features

// 1. Select only needed fields
const sources = await prisma.source.findMany({
  select: {
    id: true,
    domain: true,
    status: true,
    lastScrapedAt: true,
    _count: { select: { pages: true } }
  }
})

// 2. Batch queries with dataloader pattern
import DataLoader from 'dataloader'

const pageLoader = new DataLoader(async (pageIds: string[]) => {
  const pages = await prisma.page.findMany({
    where: { id: { in: pageIds } }
  })

  return pageIds.map(id => pages.find(p => p.id === id))
})

// 3. Use raw SQL for complex queries
const results = await prisma.$queryRaw`
  SELECT ... (complex query with CTEs, window functions)
`

// 4. Connection pooling
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

### 6.3 Background Job Processing

```typescript
// Separate worker process for CPU-intensive tasks
// scripts/worker.ts

import { scrapeQueue, embedQueue } from '@/lib/jobs/queue'
import { scrapProcessor } from '@/lib/jobs/processors/scrape-job'
import { embedProcessor } from '@/lib/jobs/processors/embed-job'

// Run processors
scrapeQueue.process('scrape', 5, scrapeProcessor) // 5 concurrent jobs
embedQueue.process('embed', 10, embedProcessor) // 10 concurrent jobs

// Graceful shutdown
process.on('SIGTERM', async () => {
  await scrapeQueue.close()
  await embedQueue.close()
  process.exit(0)
})

// Run worker: node scripts/worker.js
```

---

## 7. Authentication & Security

### 7.1 NextAuth Configuration

```typescript
// src/lib/auth/config.ts

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db/prisma'
import { compare } from 'bcrypt'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error'
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) return null

        const isValid = await compare(credentials.password, user.password)
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    }
  }
}
```

### 7.2 API Route Protection

```typescript
// src/lib/auth/middleware.ts

import { getServerSession } from 'next-auth'
import { authOptions } from './config'

export async function requireAuth(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new UnauthorizedError('Authentication required')
  }

  return session
}

// Usage in API routes
// src/app/api/sources/route.ts

import { requireAuth } from '@/lib/auth/middleware'

export async function GET(request: Request) {
  const session = await requireAuth(request)

  // User is authenticated, proceed
  const sources = await prisma.source.findMany({
    where: { workspace: { ownerId: session.user.id } }
  })

  return Response.json({ sources })
}
```

### 7.3 API Key Authentication (MCP)

```typescript
// src/lib/auth/api-key.ts

import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'

export async function validateApiKey(key: string): Promise<string> {
  if (!key) throw new UnauthorizedError('API key required')

  // Hash the key (keys stored hashed in DB)
  const hashedKey = createHash('sha256').update(key).digest('hex')

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: { user: true }
  })

  if (!apiKey) throw new UnauthorizedError('Invalid API key')

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new UnauthorizedError('API key expired')
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  })

  return apiKey.userId
}

// Usage in MCP endpoints
// src/app/api/mcp/query/route.ts

import { validateApiKey } from '@/lib/auth/api-key'

export async function POST(request: Request) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
  const userId = await validateApiKey(apiKey)

  // Proceed with authenticated request
}
```

### 7.4 Rate Limiting

```typescript
// src/lib/utils/rate-limit.ts

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = Redis.fromEnv()

// Create rate limiters
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true
})

export const mcpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'), // 50 requests per minute
  analytics: true
})

// Usage in API routes
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success, limit, remaining } = await apiRateLimit.limit(ip)

  if (!success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': remaining.toString() } }
    )
  }

  // Proceed
}
```

---

## 8. Deployment

### 8.1 Docker Configuration

```dockerfile
# docker/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "server.js"]
```

```yaml
# docker/docker-compose.yml

version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/contextstream
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./data:/app/data

  db:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=contextstream
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    command: node scripts/worker.js
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/contextstream
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
  redis_data:
```

### 8.2 Vercel Deployment (Alternative)

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For Docker
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'playwright']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize modules that cause issues
      config.externals.push({
        'playwright': 'commonjs playwright',
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil'
      })
    }
    return config
  }
}

module.exports = nextConfig
```

```json
// vercel.json

{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "env": {
    "DATABASE_URL": "@database_url",
    "REDIS_URL": "@redis_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "OPENAI_API_KEY": "@openai_api_key"
  },
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### 8.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: contextstream_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/contextstream_test

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/contextstream_test

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next
```

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t contextstream:latest -f docker/Dockerfile .

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag contextstream:latest ${{ secrets.DOCKER_USERNAME }}/contextstream:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/contextstream:latest

      - name: Deploy to production
        run: |
          # SSH into production server and pull/restart containers
          # Or deploy to Kubernetes, AWS ECS, etc.
```

---

## 9. Monitoring & Observability

### 9.1 Logging

```typescript
// src/lib/utils/logger.ts

import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'contextstream' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

// Usage
logger.info('Source scraped successfully', { sourceId, pagesScraped: 150 })
logger.error('Scraping failed', { sourceId, error: error.message })
```

### 9.2 Error Tracking (Sentry)

```typescript
// src/lib/utils/sentry.ts

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
})

// Usage in API routes
export async function GET(request: Request) {
  try {
    // ...
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: '/api/sources' },
      extra: { request: request.url }
    })
    throw error
  }
}
```

### 9.3 Metrics (Prometheus)

```typescript
// src/lib/utils/metrics.ts

import { register, Counter, Histogram } from 'prom-client'

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
})

export const scrapePagesCounter = new Counter({
  name: 'scrape_pages_total',
  help: 'Total number of pages scraped',
  labelNames: ['source_id', 'status']
})

// Expose metrics endpoint
// src/app/api/metrics/route.ts

import { register } from 'prom-client'

export async function GET() {
  const metrics = await register.metrics()
  return new Response(metrics, {
    headers: { 'Content-Type': register.contentType }
  })
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests (Vitest)

```typescript
// src/lib/scraper/__tests__/orchestrator.test.ts

import { describe, it, expect, vi } from 'vitest'
import { ScraperOrchestrator } from '../orchestrator'

describe('ScraperOrchestrator', () => {
  it('should discover URLs from a starting page', async () => {
    const orchestrator = new ScraperOrchestrator()
    const urls = await orchestrator.discoverUrls('https://example.com', 'example.com')

    expect(urls).toContain('https://example.com')
    expect(urls.length).toBeGreaterThan(0)
  })

  it('should respect robots.txt', async () => {
    const orchestrator = new ScraperOrchestrator()
    const isAllowed = await orchestrator.isAllowed('https://example.com/admin')

    expect(isAllowed).toBe(false)
  })
})
```

### 10.2 Integration Tests

```typescript
// src/app/api/sources/__tests__/route.test.ts

import { describe, it, expect } from 'vitest'
import { POST } from '../route'

describe('POST /api/sources', () => {
  it('should create a new source', async () => {
    const request = new Request('http://localhost/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        type: 'WEBSITE',
        workspaceId: 'test-workspace'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.source).toBeDefined()
    expect(data.jobId).toBeDefined()
  })
})
```

### 10.3 E2E Tests (Playwright)

```typescript
// tests/e2e/dashboard.spec.ts

import { test, expect } from '@playwright/test'

test('user can create a new source', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // Navigate to sources
  await page.goto('http://localhost:3000/dashboard/sources')

  // Create new source
  await page.click('text=Add Source')
  await page.fill('input[name="url"]', 'https://docs.python.org')
  await page.click('button:has-text("Add")')

  // Verify source appears in list
  await expect(page.locator('text=docs.python.org')).toBeVisible()
})
```

---

## Summary

This Next.js full-stack architecture provides:

1. **Unified TypeScript codebase** - Frontend, backend, and database types all in one language
2. **Modern development experience** - Server Components, Server Actions, hot-reload
3. **Production-ready features** - Authentication, background jobs, caching, monitoring
4. **Scalable architecture** - Horizontal scaling with Redis, worker processes, and database optimization
5. **Feature parity with Python design** - All MVP features implemented with equivalent or better performance
6. **Deployment flexibility** - Docker, Vercel, or self-hosted options

The architecture maintains all the core functionality from the product requirements while leveraging Next.js's strengths for a superior developer experience and simplified deployment.
