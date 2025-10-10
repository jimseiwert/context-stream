# ContextStream Backend Specification

**Version:** 1.0
**Last Updated:** 2025-01-09
**Target Stack:** Next.js 14+ (App Router), Prisma ORM, PostgreSQL 15+, Redis 7+
**Architecture:** Next.js full-stack with API routes and Server Actions

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [API Layer](#api-layer)
4. [Business Logic Services](#business-logic-services)
5. [Background Jobs](#background-jobs)
6. [Authentication & Security](#authentication--security)
7. [Search Implementation](#search-implementation)
8. [MCP Server Integration](#mcp-server-integration)
9. [Performance & Caching](#performance--caching)
10. [Error Handling](#error-handling)
11. [Deployment](#deployment)

---

## Overview

ContextStream's backend is built as a Next.js 14+ full-stack application, leveraging:
- **API Routes** for REST endpoints
- **Server Actions** for form mutations and server-side operations
- **Prisma ORM** for type-safe database access
- **Bull Queue** for background job processing
- **PostgreSQL + pgvector** for hybrid search (BM25 + vector similarity)

### Key Design Decisions

1. **Unified Language**: TypeScript throughout (frontend + backend + database types)
2. **Next.js App Router**: Server Components, Server Actions, streaming
3. **Global Source Architecture**: Production data model with RBAC and storage deduplication
4. **Prisma for Database**: Type-safe queries, migrations, excellent DX
5. **Bull Queue**: Reliable background job processing with Redis

---

## Database Architecture

### Production Schema (Global Source Architecture)

**CRITICAL**: This schema implements the **Global Source Architecture** from `GLOBAL_SOURCE_ARCHITECTURE.md`, which provides:
- Global sources accessible to all workspaces (99% storage savings)
- Role-based access control (SUPER_ADMIN, ADMIN, USER)
- WorkspaceSource join table for many-to-many relationships
- SourceUsageStats for analytics and promotion decisions

### Complete Prisma Schema

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

// ========================================
// User Management & Authentication
// ========================================

enum UserRole {
  SUPER_ADMIN  // Can manage global sources, system settings, user roles
  ADMIN        // Can manage global sources, promote sources
  USER         // Can manage workspace sources only
}

model User {
  id            String    @id @default(uuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Hashed password for email auth
  role          UserRole  @default(USER)

  // Relationships
  accounts      Account[]
  sessions      Session[]
  workspaces    Workspace[]
  apiKeys       ApiKey[]

  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([role])
}

// NextAuth Account model
model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
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

// NextAuth Verification Token
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// API Keys for MCP authentication
model ApiKey {
  id          String   @id @default(uuid())
  name        String   // e.g., "Claude Desktop", "VS Code Extension"
  key         String   @unique // SHA-256 hashed key
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([key])
}

// ========================================
// Workspaces & Multi-Tenancy
// ========================================

model Workspace {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  ownerId   String?
  owner     User?    @relation(fields: [ownerId], references: [id])

  // Relationships
  sources   WorkspaceSource[]  // Many-to-many with sources

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([slug])
}

// ========================================
// Sources & Documentation
// ========================================

enum SourceType {
  WEBSITE      // Documentation websites
  GITHUB       // GitHub repositories
  CONFLUENCE   // Confluence spaces
  CUSTOM       // Custom integrations
}

enum SourceStatus {
  PENDING      // Initial state, queued for indexing
  INDEXING     // Currently being scraped
  ACTIVE       // Successfully indexed and active
  ERROR        // Last indexing failed
  PAUSED       // Manually paused
}

enum SourceScope {
  GLOBAL       // Accessible to all workspaces (admin-managed)
  WORKSPACE    // Private to specific workspaces
}

// Core Source table - stores actual scraped content ONCE
model Source {
  id              String        @id @default(uuid())
  url             String        @unique  // GLOBAL uniqueness constraint
  domain          String
  type            SourceType
  scope           SourceScope   @default(WORKSPACE)

  // Source metadata
  config          Json?         // Scraping config, auth, etc.
  status          SourceStatus  @default(PENDING)
  lastScrapedAt   DateTime?
  lastUpdatedAt   DateTime?
  errorMessage    String?       @db.Text

  // Scraped content (stored once, referenced many times)
  pages           Page[]
  jobs            Job[]

  // Relationships
  workspaceSources WorkspaceSource[]  // Many-to-many with workspaces
  usageStats      SourceUsageStats?

  // Audit trail
  createdById     String?
  promotedToGlobalAt DateTime?
  promotedById    String?

  // Timestamps
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([scope])
  @@index([domain])
  @@index([status])
  @@index([url])
}

// Join table: Links workspaces to sources (many-to-many)
model WorkspaceSource {
  id          String    @id @default(uuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  sourceId    String
  source      Source    @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  // Workspace-specific overrides
  customConfig Json?     // Override global scraping config
  addedAt     DateTime  @default(now())
  addedBy     String?   // User who added this to workspace

  @@unique([workspaceId, sourceId])
  @@index([workspaceId])
  @@index([sourceId])
}

// Pages are shared across all workspaces using this source
model Page {
  id           String   @id @default(uuid())
  sourceId     String
  source       Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  url          String
  title        String?
  contentText  String   @db.Text // Plain text for FTS
  contentHtml  String?  @db.Text // Original HTML
  metadata     Json?    // Headings, code blocks, etc.
  checksum     String   // SHA-256 for change detection

  // Relationships
  chunks       Chunk[]

  // Timestamps
  indexedAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([sourceId, url])
  @@index([sourceId])
  @@index([checksum])
  @@map("pages")
}

// Content chunks with embeddings (also shared)
model Chunk {
  id         String                      @id @default(uuid())
  pageId     String
  page       Page                        @relation(fields: [pageId], references: [id], onDelete: Cascade)
  chunkIndex Int
  content    String                      @db.Text
  embedding  Unsupported("vector(1536)")?  // pgvector for OpenAI embeddings
  metadata   Json?                       // Chunk-specific metadata
  createdAt  DateTime                    @default(now())

  @@unique([pageId, chunkIndex])
  @@index([pageId])
  @@map("chunks")
}

// ========================================
// Background Jobs
// ========================================

enum JobType {
  SCRAPE   // Initial scraping of source
  EMBED    // Generate embeddings for pages
  UPDATE   // Update existing source
}

enum JobStatus {
  PENDING      // Queued, waiting to start
  RUNNING      // Currently processing
  COMPLETED    // Successfully finished
  FAILED       // Failed with error
  CANCELLED    // Manually cancelled
}

model Job {
  id           String    @id @default(uuid())
  sourceId     String
  source       Source    @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  type         JobType
  status       JobStatus @default(PENDING)
  progress     Json?     // {pagesScraped, total, errors, currentPage, etc.}
  result       Json?     // Final results summary
  errorMessage String?   @db.Text
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime  @default(now())

  @@index([sourceId])
  @@index([status])
  @@index([type])
  @@index([createdAt])
}

// ========================================
// Search & Analytics
// ========================================

// Query logs track workspace-specific usage
model QueryLog {
  id           String   @id @default(uuid())
  query        String   @db.Text
  resultsCount Int?
  topPageIds   String[]
  sourceIds    String[] // Which sources were queried
  latencyMs    Int?
  workspaceId  String?
  userId       String?
  queriedAt    DateTime @default(now())

  @@index([workspaceId])
  @@index([queriedAt])
  @@index([userId])
}

// Source usage analytics (for promotion decisions)
model SourceUsageStats {
  id              String   @id @default(uuid())
  sourceId        String   @unique
  source          Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  workspaceCount  Int      @default(0)  // How many workspaces use this
  queryCount      Int      @default(0)  // Total queries across all workspaces
  lastQueriedAt   DateTime?
  calculatedAt    DateTime @default(now())

  @@index([workspaceCount])
  @@index([queryCount])
  @@index([sourceId])
}

// Audit log for administrative actions
model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // 'PROMOTE_SOURCE', 'DEMOTE_SOURCE', 'DELETE_SOURCE', etc.
  entityType String  // 'SOURCE', 'USER', 'WORKSPACE'
  entityId  String
  before    Json?    // State before action
  after     Json?    // State after action
  reason    String?  @db.Text
  ipAddress String?
  userAgent String?
  timestamp DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([timestamp])
}
```

### Database Indexes

```sql
-- Full-text search index on pages.contentText
CREATE INDEX pages_fts_idx ON pages USING GIN (to_tsvector('english', "contentText"));

-- Vector similarity index (IVFFlat for faster ANN search)
CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Composite indexes for common queries
CREATE INDEX sources_scope_status_idx ON "Source" (scope, status);
CREATE INDEX jobs_source_status_idx ON "Job" ("sourceId", status);
CREATE INDEX pages_source_indexed_idx ON pages ("sourceId", "indexedAt" DESC);
CREATE INDEX workspace_sources_workspace_idx ON "WorkspaceSource" ("workspaceId");
```

### Migration Strategy

1. **Initial Migration**: Create all tables with pgvector extension
2. **Seed Data**: Create default super admin user and personal workspace
3. **Backfill**: If migrating from baseline schema, run migration to convert to global source architecture
4. **Index Creation**: Create FTS and vector indexes after data load

**Migration Command:**
```bash
npx prisma migrate dev --name init_global_source_architecture
npx prisma generate
```

---

## API Layer

### API Routes Structure

```
src/app/api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts          # NextAuth endpoints
├── sources/
│   ├── route.ts              # GET, POST /api/sources
│   ├── [id]/
│   │   ├── route.ts          # GET, PATCH, DELETE /api/sources/:id
│   │   ├── scrape/
│   │   │   └── route.ts      # POST /api/sources/:id/scrape
│   │   └── stats/
│   │       └── route.ts      # GET /api/sources/:id/stats
├── search/
│   └── route.ts              # POST /api/search
├── jobs/
│   ├── route.ts              # GET /api/jobs
│   └── [id]/
│       ├── route.ts          # GET /api/jobs/:id
│       └── cancel/
│           └── route.ts      # POST /api/jobs/:id/cancel
├── workspaces/
│   ├── route.ts              # GET, POST /api/workspaces
│   └── [id]/
│       ├── route.ts          # GET, PATCH, DELETE /api/workspaces/:id
│       └── sources/
│           └── route.ts      # GET /api/workspaces/:id/sources
├── admin/
│   ├── sources/
│   │   ├── route.ts          # GET /api/admin/sources
│   │   └── [id]/
│   │       ├── promote/
│   │       │   └── route.ts  # POST /api/admin/sources/:id/promote
│   │       ├── demote/
│   │       │   └── route.ts  # POST /api/admin/sources/:id/demote
│   │       └── route.ts      # GET /api/admin/sources/:id
│   ├── users/
│   │   └── route.ts          # GET, POST /api/admin/users
│   └── stats/
│       └── route.ts          # GET /api/admin/stats
├── mcp/
│   ├── query/
│   │   └── route.ts          # POST /api/mcp/query
│   └── stream/
│       └── route.ts          # GET /api/mcp/stream (SSE)
├── api-keys/
│   ├── route.ts              # GET, POST /api/api-keys
│   └── [id]/
│       └── route.ts          # DELETE /api/api-keys/:id
└── health/
    └── route.ts              # GET /api/health
```

### API Route Implementation Pattern

**Example: GET /api/sources**

```typescript
// src/app/api/sources/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { getWorkspaceSources } from '@/lib/db/queries/sources'
import { ApiError, handleApiError } from '@/lib/utils/errors'
import { z } from 'zod'

const QuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'INDEXING', 'ACTIVE', 'ERROR', 'PAUSED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await requireAuth(request)

    // Validation
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const { workspaceId, status, limit, offset } = QuerySchema.parse(searchParams)

    // Business logic
    const { sources, total } = await getWorkspaceSources({
      userId: session.user.id,
      workspaceId,
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      sources,
      total,
      limit,
      offset,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

**Example: POST /api/sources (with Global Source Check)**

```typescript
// src/app/api/sources/route.ts

import { scrapeQueue } from '@/lib/jobs/queue'

const CreateSourceSchema = z.object({
  url: z.string().url(),
  type: z.enum(['WEBSITE', 'GITHUB', 'CONFLUENCE', 'CUSTOM']),
  workspaceId: z.string().uuid(),
  config: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const data = CreateSourceSchema.parse(body)

    // Check if source already exists (global or workspace)
    const existingSource = await prisma.source.findUnique({
      where: { url: data.url },
      include: { workspaceSources: true },
    })

    if (existingSource) {
      // If global source, just link to workspace
      if (existingSource.scope === 'GLOBAL') {
        await prisma.workspaceSource.create({
          data: {
            sourceId: existingSource.id,
            workspaceId: data.workspaceId,
            addedBy: session.user.id,
          },
        })

        return NextResponse.json({
          message: 'Global source added to workspace',
          source: existingSource,
          isGlobal: true,
        })
      }

      // If workspace source, return error with promotion suggestion
      return NextResponse.json(
        {
          error: 'This source is already indexed in another workspace',
          suggestion: 'Contact an admin to promote it to global',
          sourceId: existingSource.id,
          workspaceCount: existingSource.workspaceSources.length,
        },
        { status: 409 }
      )
    }

    // Create new source
    const source = await prisma.source.create({
      data: {
        url: data.url,
        domain: new URL(data.url).hostname,
        type: data.type,
        scope: 'WORKSPACE',
        config: data.config,
        status: 'PENDING',
        createdById: session.user.id,
      },
    })

    // Link to workspace
    await prisma.workspaceSource.create({
      data: {
        sourceId: source.id,
        workspaceId: data.workspaceId,
        addedBy: session.user.id,
      },
    })

    // Initialize usage stats
    await prisma.sourceUsageStats.create({
      data: {
        sourceId: source.id,
        workspaceCount: 1,
      },
    })

    // Enqueue scrape job
    const job = await scrapeQueue.add('scrape', { sourceId: source.id })

    // Create job record
    await prisma.job.create({
      data: {
        id: job.id,
        sourceId: source.id,
        type: 'SCRAPE',
        status: 'PENDING',
      },
    })

    return NextResponse.json(
      {
        source,
        jobId: job.id,
        estimatedTime: '5-10 minutes',
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## Business Logic Services

### Service Layer Architecture

```
src/lib/
├── db/
│   ├── prisma.ts             # Singleton Prisma client
│   └── queries/
│       ├── sources.ts        # Source CRUD operations
│       ├── pages.ts          # Page queries
│       ├── chunks.ts         # Chunk queries
│       ├── workspaces.ts     # Workspace operations
│       └── users.ts          # User operations
├── scraper/
│   ├── orchestrator.ts       # Main scraper coordinator
│   ├── playwright-scraper.ts # Headless browser scraping
│   ├── content-extractor.ts  # Content parsing
│   ├── url-discovery.ts      # Link discovery (BFS)
│   └── robots-parser.ts      # robots.txt compliance
├── embeddings/
│   ├── provider.ts           # Abstract provider interface
│   ├── openai.ts             # OpenAI embeddings
│   ├── local.ts              # @xenova/transformers
│   └── chunker.ts            # Content chunking
├── search/
│   ├── hybrid-search.ts      # BM25 + vector ranking
│   ├── vector-search.ts      # pgvector similarity
│   ├── fulltext-search.ts    # PostgreSQL FTS
│   └── ranking.ts            # Reciprocal Rank Fusion
├── mcp/
│   ├── server.ts             # MCP protocol implementation
│   ├── handlers.ts           # Request handlers
│   └── streaming.ts          # SSE streaming
└── jobs/
    ├── queue.ts              # Bull queue setup
    ├── processors/
    │   ├── scrape-job.ts     # Scraping processor
    │   ├── embed-job.ts      # Embedding processor
    │   └── update-job.ts     # Update processor
    └── scheduler.ts          # Cron jobs for auto-updates
```

### Key Service Implementations

#### Source Management Service

```typescript
// src/lib/db/queries/sources.ts

import { prisma } from '../prisma'
import { Prisma } from '@prisma/client'

export async function getWorkspaceSources(params: {
  userId: string
  workspaceId?: string
  status?: string
  limit: number
  offset: number
}) {
  const { userId, workspaceId, status, limit, offset } = params

  // Get user's workspaces
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    select: { id: true },
  })

  const workspaceIds = workspaceId
    ? [workspaceId]
    : workspaces.map(w => w.id)

  // Get sources available to these workspaces (global + workspace-specific)
  const where: Prisma.SourceWhereInput = {
    OR: [
      { scope: 'GLOBAL', status: status || undefined },
      {
        workspaceSources: {
          some: { workspaceId: { in: workspaceIds } },
        },
        status: status || undefined,
      },
    ],
  }

  const [sources, total] = await prisma.$transaction([
    prisma.source.findMany({
      where,
      include: {
        _count: { select: { pages: true } },
        workspaceSources: {
          where: { workspaceId: { in: workspaceIds } },
          select: { addedAt: true },
        },
        usageStats: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.source.count({ where }),
  ])

  return { sources, total }
}

export async function promoteSourceToGlobal(params: {
  sourceId: string
  adminId: string
  reason?: string
}) {
  const { sourceId, adminId, reason } = params

  const source = await prisma.$transaction(async (tx) => {
    // Update source scope
    const updated = await tx.source.update({
      where: { id: sourceId },
      data: {
        scope: 'GLOBAL',
        promotedToGlobalAt: new Date(),
        promotedById: adminId,
      },
      include: {
        workspaceSources: true,
        pages: { select: { id: true } },
      },
    })

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'PROMOTE_SOURCE',
        entityType: 'SOURCE',
        entityId: sourceId,
        before: { scope: 'WORKSPACE' },
        after: { scope: 'GLOBAL' },
        reason,
      },
    })

    return updated
  })

  return source
}
```

---

## Background Jobs

### Bull Queue Configuration

```typescript
// src/lib/jobs/queue.ts

import Queue from 'bull'
import Redis from 'ioredis'

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
}

export const scrapeQueue = new Queue('scrape', { redis: redisConfig })
export const embedQueue = new Queue('embed', { redis: redisConfig })
export const updateQueue = new Queue('update', { redis: redisConfig })

// Queue events
scrapeQueue.on('completed', async (job) => {
  console.log(`Scrape job ${job.id} completed`)
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
})

scrapeQueue.on('failed', async (job, err) => {
  console.error(`Scrape job ${job.id} failed:`, err)
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: 'FAILED',
      errorMessage: err.message,
      completedAt: new Date(),
    },
  })
})
```

### Scrape Job Processor

```typescript
// src/lib/jobs/processors/scrape-job.ts

import { Job } from 'bull'
import { ScraperOrchestrator } from '@/lib/scraper/orchestrator'
import { EmbeddingProvider } from '@/lib/embeddings/provider'
import { prisma } from '@/lib/db/prisma'

export async function processScrapeJob(job: Job) {
  const { sourceId } = job.data

  // Get source details
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  })

  if (!source) {
    throw new Error(`Source ${sourceId} not found`)
  }

  // Initialize orchestrator
  const orchestrator = new ScraperOrchestrator()
  const embeddingProvider = new EmbeddingProvider()

  // Update job status
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'RUNNING', startedAt: new Date() },
  })

  // Update source status
  await prisma.source.update({
    where: { id: sourceId },
    data: { status: 'INDEXING' },
  })

  let totalPages = 0
  let scrapedPages = 0

  try {
    // Discover URLs
    job.progress(5)
    const urls = await orchestrator.discoverUrls(source.url, source.domain)
    totalPages = urls.length

    // Scrape pages
    for (const url of urls) {
      const pageContent = await orchestrator.scrapePage(url)

      // Store page
      const page = await prisma.page.create({
        data: {
          sourceId,
          url: pageContent.url,
          title: pageContent.title,
          contentText: pageContent.text,
          contentHtml: pageContent.html,
          metadata: pageContent.metadata,
          checksum: pageContent.checksum,
        },
      })

      // Generate embeddings
      const chunks = await embeddingProvider.chunkAndEmbed(pageContent.text)

      // Store chunks
      await prisma.chunk.createMany({
        data: chunks.map((chunk, index) => ({
          pageId: page.id,
          chunkIndex: index,
          content: chunk.content,
          embedding: chunk.embedding,
        })),
      })

      scrapedPages++
      job.progress(Math.floor((scrapedPages / totalPages) * 100))

      // Update job progress
      await prisma.job.update({
        where: { id: job.id },
        data: {
          progress: {
            pagesScraped: scrapedPages,
            total: totalPages,
          },
        },
      })
    }

    // Mark source as active
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: 'ACTIVE',
        lastScrapedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
    })

    return {
      success: true,
      pagesScraped: scrapedPages,
      totalPages,
    }
  } catch (error) {
    // Mark source as error
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: 'ERROR',
        errorMessage: error.message,
      },
    })

    throw error
  }
}

// Register processor
scrapeQueue.process('scrape', 5, processScrapeJob) // 5 concurrent jobs
```

---

## Authentication & Security

### Permission System

```typescript
// src/lib/auth/permissions.ts

import { UserRole } from '@prisma/client'

export enum Permission {
  // Source management
  MANAGE_GLOBAL_SOURCES = 'manage_global_sources',
  MANAGE_WORKSPACE_SOURCES = 'manage_workspace_sources',
  PROMOTE_SOURCES = 'promote_sources',
  DEMOTE_SOURCES = 'demote_sources',

  // Admin features
  VIEW_ADMIN_DASHBOARD = 'view_admin_dashboard',
  VIEW_USAGE_STATS = 'view_usage_stats',

  // User management
  MANAGE_USER_ROLES = 'manage_user_roles',
  VIEW_ALL_WORKSPACES = 'view_all_workspaces',
}

export const RolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    Permission.MANAGE_GLOBAL_SOURCES,
    Permission.MANAGE_WORKSPACE_SOURCES,
    Permission.PROMOTE_SOURCES,
    Permission.DEMOTE_SOURCES,
    Permission.VIEW_ADMIN_DASHBOARD,
    Permission.VIEW_USAGE_STATS,
    Permission.MANAGE_USER_ROLES,
    Permission.VIEW_ALL_WORKSPACES,
  ],
  ADMIN: [
    Permission.MANAGE_GLOBAL_SOURCES,
    Permission.PROMOTE_SOURCES,
    Permission.VIEW_ADMIN_DASHBOARD,
    Permission.VIEW_USAGE_STATS,
  ],
  USER: [
    Permission.MANAGE_WORKSPACE_SOURCES,
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return RolePermissions[role].includes(permission)
}
```

### Authentication Middleware

```typescript
// src/lib/auth/middleware.ts

import { getServerSession } from 'next-auth'
import { authOptions } from './config'
import { prisma } from '@/lib/db/prisma'

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export async function requireAuth(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    throw new UnauthorizedError('Authentication required')
  }

  return session
}

export async function requirePermission(
  request: Request,
  permission: Permission
) {
  const session = await requireAuth(request)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || !hasPermission(user.role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`)
  }

  return session
}
```

### API Key Authentication (MCP)

```typescript
// src/lib/auth/api-key.ts

import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'

export async function validateApiKey(key: string): Promise<string> {
  if (!key) {
    throw new UnauthorizedError('API key required')
  }

  // Hash the key
  const hashedKey = createHash('sha256').update(key).digest('hex')

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: { user: true },
  })

  if (!apiKey) {
    throw new UnauthorizedError('Invalid API key')
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new UnauthorizedError('API key expired')
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return apiKey.userId
}
```

---

## Search Implementation

### Hybrid Search (BM25 + Vector)

```typescript
// src/lib/search/hybrid-search.ts

import { prisma } from '@/lib/db/prisma'
import { EmbeddingProvider } from '@/lib/embeddings/provider'

export interface SearchOptions {
  workspaceId: string
  limit?: number
  offset?: number
  sourceIds?: string[]
}

export class HybridSearch {
  private embeddingProvider: EmbeddingProvider

  constructor() {
    this.embeddingProvider = new EmbeddingProvider()
  }

  async search(query: string, options: SearchOptions) {
    const { workspaceId, limit = 10, offset = 0, sourceIds } = options
    const startTime = Date.now()

    // Get sources available to workspace
    const availableSources = await this.getWorkspaceSources(workspaceId, sourceIds)
    const availableSourceIds = availableSources.map(s => s.id)

    if (availableSourceIds.length === 0) {
      return {
        results: [],
        total: 0,
        latencyMs: Date.now() - startTime,
      }
    }

    // Full-text search (BM25)
    const ftsResults = await this.fullTextSearch(query, availableSourceIds)

    // Vector similarity search
    const vectorResults = await this.vectorSearch(query, availableSourceIds)

    // Combine using Reciprocal Rank Fusion
    const combined = this.reciprocalRankFusion(ftsResults, vectorResults)

    // Fetch page details
    const pageIds = combined.slice(offset, offset + limit).map(r => r.id)
    const pages = await prisma.page.findMany({
      where: { id: { in: pageIds } },
      include: {
        source: {
          select: {
            id: true,
            url: true,
            domain: true,
            scope: true,
          },
        },
      },
    })

    // Log query
    await this.logQuery({
      query,
      workspaceId,
      sourceIds: [...new Set(pages.map(p => p.source.id))],
      resultsCount: pages.length,
      latencyMs: Date.now() - startTime,
    })

    return {
      results: pages.map(p => ({
        id: p.id,
        title: p.title,
        url: p.url,
        snippet: this.extractSnippet(p.contentText, query),
        source: {
          name: p.source.domain,
          url: p.source.url,
          scope: p.source.scope,
          isGlobal: p.source.scope === 'GLOBAL',
        },
        score: combined.find(r => r.id === p.id)?.score || 0,
      })),
      total: combined.length,
      latencyMs: Date.now() - startTime,
    }
  }

  private async getWorkspaceSources(workspaceId: string, sourceIds?: string[]) {
    return await prisma.source.findMany({
      where: {
        OR: [
          { scope: 'GLOBAL', status: 'ACTIVE' },
          {
            workspaceSources: {
              some: { workspaceId },
            },
            status: 'ACTIVE',
          },
        ],
        ...(sourceIds ? { id: { in: sourceIds } } : {}),
      },
      select: { id: true },
    })
  }

  private async fullTextSearch(query: string, sourceIds: string[]) {
    return prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT
        p.id,
        ts_rank(to_tsvector('english', p."contentText"), plainto_tsquery('english', ${query})) as rank
      FROM pages p
      WHERE p."sourceId" = ANY(${sourceIds}::uuid[])
        AND to_tsvector('english', p."contentText") @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 100
    `
  }

  private async vectorSearch(query: string, sourceIds: string[]) {
    const embedding = await this.embeddingProvider.generateEmbeddings([query])
    const queryVector = embedding[0]

    return prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
      SELECT
        c."pageId" as id,
        1 - (c.embedding <=> ${queryVector}::vector) as similarity
      FROM chunks c
      INNER JOIN pages p ON c."pageId" = p.id
      WHERE p."sourceId" = ANY(${sourceIds}::uuid[])
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

    ftsResults.forEach((result, index) => {
      const score = 1 / (k + index + 1)
      scores.set(result.id, (scores.get(result.id) || 0) + score)
    })

    vectorResults.forEach((result, index) => {
      const score = 1 / (k + index + 1)
      scores.set(result.id, (scores.get(result.id) || 0) + score)
    })

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({ id, score }))
  }

  private extractSnippet(text: string, query: string, length: number = 200): string {
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)

    if (index === -1) {
      return text.slice(0, length) + '...'
    }

    const start = Math.max(0, index - 50)
    const end = Math.min(text.length, index + query.length + 150)

    return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '')
  }

  private async logQuery(data: {
    query: string
    workspaceId: string
    sourceIds: string[]
    resultsCount: number
    latencyMs: number
  }) {
    await prisma.queryLog.create({
      data: {
        query: data.query,
        workspaceId: data.workspaceId,
        sourceIds: data.sourceIds,
        resultsCount: data.resultsCount,
        latencyMs: data.latencyMs,
        queriedAt: new Date(),
      },
    })

    // Update source usage stats
    for (const sourceId of data.sourceIds) {
      await prisma.sourceUsageStats.upsert({
        where: { sourceId },
        create: {
          sourceId,
          queryCount: 1,
          lastQueriedAt: new Date(),
        },
        update: {
          queryCount: { increment: 1 },
          lastQueriedAt: new Date(),
        },
      })
    }
  }
}
```

---

## MCP Server Integration

### MCP Server Implementation

```typescript
// src/lib/mcp/server.ts

import { HybridSearch } from '@/lib/search/hybrid-search'
import { validateApiKey } from '@/lib/auth/api-key'

export class ContextStreamMCP {
  private search: HybridSearch

  constructor() {
    this.search = new HybridSearch()
  }

  async handleQuery(request: {
    query: string
    workspaceId: string
    apiKey: string
  }) {
    // Validate API key
    const userId = await validateApiKey(request.apiKey)

    // Perform search
    const results = await this.search.search(request.query, {
      workspaceId: request.workspaceId,
      limit: 10,
    })

    // Format for MCP response
    return {
      results: results.results.map(r => ({
        content: r.snippet,
        metadata: {
          source: r.source.url,
          title: r.title,
          relevance: r.score,
          url: r.url,
        },
      })),
      tokensUsed: this.estimateTokens(results.results),
    }
  }

  private estimateTokens(results: any[]): number {
    const totalChars = results.reduce((sum, r) => sum + r.snippet.length, 0)
    return Math.ceil(totalChars / 4) // Rough estimate: 1 token ≈ 4 characters
  }
}
```

### MCP API Route

```typescript
// src/app/api/mcp/query/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { ContextStreamMCP } from '@/lib/mcp/server'
import { handleApiError } from '@/lib/utils/errors'

const mcp = new ContextStreamMCP()

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    const body = await request.json()

    const result = await mcp.handleQuery({
      query: body.query,
      workspaceId: body.workspaceId,
      apiKey: apiKey || '',
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## Performance & Caching

### Caching Strategy

**1. Next.js Route Caching**
```typescript
// src/app/api/sources/route.ts
export const revalidate = 60 // Revalidate every 60 seconds
```

**2. React Cache (Request Deduplication)**
```typescript
import { cache } from 'react'

export const getSource = cache(async (id: string) => {
  return prisma.source.findUnique({ where: { id } })
})
```

**3. Redis Caching for Search**
```typescript
// src/lib/search/cache.ts

import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getCachedSearch(query: string, workspaceId: string) {
  const cacheKey = `search:${workspaceId}:${query}`
  const cached = await redis.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  return null
}

export async function setCachedSearch(
  query: string,
  workspaceId: string,
  results: any,
  ttl: number = 300
) {
  const cacheKey = `search:${workspaceId}:${query}`
  await redis.setex(cacheKey, ttl, JSON.stringify(results))
}
```

---

## Error Handling

### Error Classes

```typescript
// src/lib/utils/errors.ts

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export function handleApiError(error: any) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.errors },
      { status: 400 }
    )
  }

  console.error('Unexpected error:', error)

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

---

## Deployment

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/contextstream"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# OpenAI (Embeddings)
OPENAI_API_KEY=""

# Application
NODE_ENV="production"
PORT="3000"
```

### Docker Deployment

See `deployment.md` for complete Docker and Kubernetes configurations.

---

## Summary

This backend specification provides:

✅ **Complete Prisma Schema** with Global Source Architecture
✅ **API Route Structure** for all MVP features
✅ **Service Layer** for business logic separation
✅ **Background Jobs** with Bull Queue
✅ **Authentication** with NextAuth and API keys
✅ **Hybrid Search** (BM25 + vector similarity)
✅ **MCP Integration** for Claude Desktop
✅ **Caching Strategy** for performance
✅ **Error Handling** patterns
✅ **Deployment** configuration

**Next Steps:**
1. Implement Prisma schema and run migrations
2. Create API routes following the patterns shown
3. Implement background job processors
4. Set up Bull Queue worker processes
5. Test search performance with sample data
6. Deploy to staging environment

**Implementation Estimate:** 4-6 weeks with 2 backend engineers
