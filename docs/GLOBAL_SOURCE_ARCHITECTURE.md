# Global Source Architecture
## Shared Sources with Role-Based Access Control

**Document Version:** 1.0
**Last Updated:** 2025-01-09
**Status:** Proposed Architecture

---

## Executive Summary

This document outlines the architecture for implementing **global sources** in ContextStream - a system where documentation sources can be shared across multiple workspaces to improve storage efficiency and reduce redundant scraping.

### Key Features

1. **Global Sources** - Admin-curated sources available to all workspaces
2. **Workspace Sources** - Private sources scoped to individual workspaces
3. **Storage Deduplication** - Same content stored once, referenced many times
4. **Role-Based Access Control** - SUPER_ADMIN, ADMIN, USER roles
5. **Source Promotion** - Migrate popular workspace sources to global
6. **Usage Analytics** - Track workspace adoption and query patterns

### Storage Efficiency Example

**Without sharing:**
- React docs: 10,000 pages × 50KB = 500MB
- Used by 100 workspaces
- **Total storage**: 100 × 500MB = **50GB**

**With sharing:**
- React docs stored once: 500MB
- Referenced by 100 workspaces
- **Total storage**: **500MB** (99% savings!)

---

## Problem Statement

### Current Architecture Issues

1. **Storage Inefficiency**: Popular sources (React, Python, TypeScript docs) duplicated across many workspaces
2. **Redundant Scraping**: Same site scraped multiple times by different users
3. **No Network Effect**: Users don't benefit from others' indexing work
4. **No Central Curation**: Can't provide curated global sources for all users

### Current Data Model

```prisma
model Source {
  id            String   @id
  url           String
  workspaceId   String   // Tied to single workspace
  workspace     Workspace @relation(...)
  pages         Page[]

  @@unique([workspaceId, url]) // Same URL can exist in multiple workspaces
}
```

**Problem**: If 100 users index `https://react.dev`, you get 100 separate Source records with 100 copies of all scraped pages.

---

## Proposed Solution

### New Data Model

```prisma
// Source Scoping: Global vs Workspace
enum SourceScope {
  GLOBAL      // Accessible to all workspaces (admin-managed)
  WORKSPACE   // Private to specific workspace
}

// User Roles
enum UserRole {
  SUPER_ADMIN // Can manage global sources, system settings, user roles
  ADMIN       // Can manage global sources, promote sources
  USER        // Can manage workspace sources only
}

model User {
  id            String      @id @default(uuid())
  name          String?
  email         String?     @unique
  emailVerified DateTime?
  image         String?
  role          UserRole    @default(USER)
  accounts      Account[]
  sessions      Session[]
  workspaces    Workspace[]
  apiKeys       ApiKey[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model Workspace {
  id                String              @id @default(uuid())
  name              String
  slug              String              @unique
  ownerId           String?
  owner             User?               @relation(fields: [ownerId], references: [id])
  sources           WorkspaceSource[]   // Many-to-many with sources
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([ownerId])
}

// Core Source table - stores actual scraped content ONCE
model Source {
  id              String            @id @default(uuid())
  url             String            @unique  // GLOBAL uniqueness constraint
  domain          String
  type            SourceType
  scope           SourceScope       @default(WORKSPACE)

  // Source metadata
  config          Json?
  status          SourceStatus      @default(PENDING)
  lastScrapedAt   DateTime?
  lastUpdatedAt   DateTime?
  errorMessage    String?

  // Scraped content (stored once, referenced many times)
  pages           Page[]
  jobs            Job[]

  // Relationships
  workspaceSources WorkspaceSource[] // Many-to-many with workspaces

  // Audit trail
  createdById     String?           // Who created this source
  promotedToGlobalAt DateTime?      // When it was promoted to global
  promotedById    String?           // Admin who promoted it

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([scope])
  @@index([domain])
  @@index([status])
}

// Join table: Links workspaces to sources
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
  contentText  String
  contentHtml  String?
  metadata     Json?
  checksum     String
  chunks       Chunk[]
  indexedAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([sourceId, url])
  @@index([sourceId])
}

// Chunks are also shared
model Chunk {
  id         String                      @id @default(uuid())
  pageId     String
  page       Page                        @relation(fields: [pageId], references: [id], onDelete: Cascade)
  chunkIndex Int
  content    String
  embedding  Unsupported("vector(1536)")?
  metadata   Json?
  createdAt  DateTime                    @default(now())

  @@unique([pageId, chunkIndex])
  @@index([pageId])
}

// Query logs track workspace-specific usage
model QueryLog {
  id           String   @id @default(uuid())
  query        String
  resultsCount Int?
  topPageIds   String[]
  latencyMs    Int?
  workspaceId  String?  // Which workspace made the query
  sourceIds    String[] // Which sources were queried
  userId       String?
  queriedAt    DateTime @default(now())

  @@index([workspaceId])
  @@index([queriedAt])
}

// NEW: Source usage analytics
model SourceUsageStats {
  id              String   @id @default(uuid())
  sourceId        String
  workspaceCount  Int      @default(0) // How many workspaces use this
  queryCount      Int      @default(0) // Total queries across all workspaces
  lastQueriedAt   DateTime?
  calculatedAt    DateTime @default(now())

  @@unique([sourceId])
  @@index([workspaceCount]) // For finding popular sources to promote
}
```

---

## Architecture Overview

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  User (role: USER) → Workspace Sources                      │
│  Admin (role: ADMIN) → Global Sources                       │
│  Super Admin → System Management                            │
└────────┬────────────────────────────────────┬───────────────┘
         │                                    │
         │ Add Source                         │ Promote Source
         │                                    │
┌────────▼────────────────────────────────────▼───────────────┐
│               SOURCE MANAGEMENT LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  • Check if source exists (global or workspace)             │
│  • Permission validation                                    │
│  • Deduplication logic                                      │
│  • Promotion workflow                                       │
└────────┬────────────────────────────────────┬───────────────┘
         │                                    │
         │ Create/Link                        │ Query
         │                                    │
┌────────▼────────────────────────────────────▼───────────────┐
│                    DATA LAYER                                │
├─────────────────────────────────────────────────────────────┤
│  Global Sources (scope: GLOBAL)                             │
│    ├─ React Docs → Used by 100 workspaces                   │
│    ├─ Python Docs → Used by 80 workspaces                   │
│    └─ TypeScript Docs → Used by 60 workspaces               │
│                                                              │
│  Workspace Sources (scope: WORKSPACE)                       │
│    ├─ Internal Wiki → Used by 1 workspace                   │
│    ├─ Custom Framework → Used by 3 workspaces (candidate!)  │
│    └─ Client Docs → Used by 1 workspace                     │
│                                                              │
│  Shared Storage: Pages, Chunks, Embeddings                  │
└─────────────────────────────────────────────────────────────┘
```

---

## User Workflows

### 1. User Adds a Source (Standard Flow)

```typescript
// User wants to add React docs to their workspace

POST /api/sources
{
  "url": "https://react.dev",
  "type": "WEBSITE",
  "workspaceId": "workspace-123"
}

// API Logic:
1. Check if source exists with url = "https://react.dev"

   a) If exists as GLOBAL:
      - Link existing source to user's workspace via WorkspaceSource
      - No scraping needed (already indexed!)
      - Return immediately

   b) If exists as WORKSPACE (in another workspace):
      - Return error: "Source already indexed. Contact admin to promote to global."

   c) If doesn't exist:
      - Create new Source with scope=WORKSPACE
      - Link to workspace via WorkspaceSource
      - Enqueue scrape job
      - Return job ID

2. User sees:
   - If global: "✓ Global source added to your workspace instantly!"
   - If new: "⏳ Scraping started. This will take ~5 minutes."
   - If duplicate: "❌ Already indexed. Request admin promotion."
```

### 2. Admin Promotes Source to Global

```typescript
// Admin sees React docs used by 15 workspaces (workspace-scoped)
// Decision: Promote to global to save storage

POST /api/admin/sources/source-abc-123/promote

// API Logic:
1. Verify user has ADMIN or SUPER_ADMIN role
2. Update Source:
   - scope = GLOBAL
   - promotedToGlobalAt = now()
   - promotedById = admin.id
3. Keep all existing WorkspaceSource links intact
4. Update SourceUsageStats
5. Notify affected workspaces (optional)

// Result:
- Storage reduced from 15 × 500MB = 7.5GB to 500MB
- Future users get instant access (no scraping)
- All 15 workspaces still have access via their WorkspaceSource records
```

### 3. User Searches Across Sources

```typescript
// User searches in their workspace

POST /api/search
{
  "query": "useState hook",
  "workspaceId": "workspace-123"
}

// API Logic:
1. Find sources available to workspace-123:
   - All sources where scope = GLOBAL
   - All sources linked via WorkspaceSource.workspaceId = workspace-123

2. Search pages belonging to those sources:
   SELECT p.*
   FROM pages p
   INNER JOIN sources s ON p.sourceId = s.id
   WHERE s.id IN (available_source_ids)
     AND to_tsvector('english', p.contentText) @@ plainto_tsquery('english', 'useState hook')

3. Return results with source attribution
4. Log query in QueryLog with sourceIds used
```

---

## Permission System

### Role Definitions

```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER'
}

enum Permission {
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
  VIEW_ALL_WORKSPACES = 'view_all_workspaces'
}

const RolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    Permission.MANAGE_GLOBAL_SOURCES,
    Permission.MANAGE_WORKSPACE_SOURCES,
    Permission.PROMOTE_SOURCES,
    Permission.DEMOTE_SOURCES,
    Permission.VIEW_ADMIN_DASHBOARD,
    Permission.VIEW_USAGE_STATS,
    Permission.MANAGE_USER_ROLES,
    Permission.VIEW_ALL_WORKSPACES
  ],
  ADMIN: [
    Permission.MANAGE_GLOBAL_SOURCES,
    Permission.PROMOTE_SOURCES,
    Permission.VIEW_ADMIN_DASHBOARD,
    Permission.VIEW_USAGE_STATS
  ],
  USER: [
    Permission.MANAGE_WORKSPACE_SOURCES
  ]
}
```

### Permission Checks

```typescript
// Middleware for API routes
export async function requirePermission(
  request: Request,
  permission: Permission
) {
  const session = await requireAuth(request)
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })

  const allowedPermissions = RolePermissions[user.role]

  if (!allowedPermissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`)
  }

  return session
}

// Usage in API routes
export async function POST(request: Request) {
  await requirePermission(request, Permission.PROMOTE_SOURCES)

  // Proceed with promotion logic
}
```

---

## API Endpoints

### User Endpoints

#### POST /api/sources
Add a source to workspace (checks for global sources first)

**Request:**
```json
{
  "url": "https://react.dev",
  "type": "WEBSITE",
  "workspaceId": "workspace-123",
  "config": {
    "maxPages": 1000,
    "respectRobotsTxt": true
  }
}
```

**Response (Global Source):**
```json
{
  "message": "Global source added to workspace",
  "source": {
    "id": "source-abc-123",
    "url": "https://react.dev",
    "scope": "GLOBAL",
    "status": "ACTIVE",
    "pageCount": 8234
  },
  "isGlobal": true
}
```

**Response (New Source):**
```json
{
  "source": {
    "id": "source-xyz-456",
    "url": "https://mydocs.com",
    "scope": "WORKSPACE",
    "status": "PENDING"
  },
  "jobId": "job-789",
  "estimatedTime": "5 minutes"
}
```

**Response (Already Exists):**
```json
{
  "error": "This source is already indexed in another workspace. Contact an admin to promote it to global.",
  "sourceId": "source-def-789",
  "workspaceCount": 3
}
```

#### GET /api/sources?workspaceId=xxx
List sources available to workspace (global + workspace-specific)

**Response:**
```json
{
  "sources": [
    {
      "id": "source-abc-123",
      "url": "https://react.dev",
      "domain": "react.dev",
      "scope": "GLOBAL",
      "status": "ACTIVE",
      "pageCount": 8234,
      "lastScrapedAt": "2025-01-09T10:00:00Z",
      "addedToWorkspaceAt": "2025-01-01T12:00:00Z"
    },
    {
      "id": "source-xyz-456",
      "url": "https://internal-wiki.company.com",
      "domain": "internal-wiki.company.com",
      "scope": "WORKSPACE",
      "status": "ACTIVE",
      "pageCount": 245,
      "lastScrapedAt": "2025-01-08T15:30:00Z",
      "addedToWorkspaceAt": "2024-12-15T09:20:00Z"
    }
  ],
  "summary": {
    "total": 2,
    "global": 1,
    "workspace": 1
  }
}
```

### Admin Endpoints

#### GET /api/admin/sources
List all sources with usage statistics

**Query Parameters:**
- `scope` - Filter by scope (GLOBAL | WORKSPACE | ALL)
- `minWorkspaces` - Minimum workspace count (for finding promotion candidates)
- `sortBy` - Sort by workspaceCount, queryCount, pageCount
- `limit` - Pagination limit
- `offset` - Pagination offset

**Response:**
```json
{
  "sources": [
    {
      "id": "source-abc-123",
      "url": "https://react.dev",
      "domain": "react.dev",
      "scope": "GLOBAL",
      "status": "ACTIVE",
      "pageCount": 8234,
      "workspaceCount": 142,
      "queryCount": 45678,
      "estimatedStorageKB": 411700,
      "lastScrapedAt": "2025-01-09T10:00:00Z",
      "promotedToGlobalAt": "2024-11-15T14:30:00Z",
      "promotedBy": {
        "id": "user-admin-1",
        "name": "Alice Admin",
        "email": "alice@example.com"
      },
      "workspaces": [
        { "id": "ws-1", "name": "Frontend Team", "slug": "frontend" },
        { "id": "ws-2", "name": "Backend Team", "slug": "backend" }
        // ... (showing first 2 of 142)
      ]
    },
    {
      "id": "source-def-456",
      "url": "https://custom-framework.io",
      "domain": "custom-framework.io",
      "scope": "WORKSPACE",
      "status": "ACTIVE",
      "pageCount": 456,
      "workspaceCount": 5,
      "queryCount": 234,
      "estimatedStorageKB": 22800,
      "canPromoteToGlobal": true, // Used by 2+ workspaces
      "lastScrapedAt": "2025-01-08T16:45:00Z",
      "workspaces": [
        { "id": "ws-5", "name": "Project A", "slug": "project-a" },
        { "id": "ws-6", "name": "Project B", "slug": "project-b" },
        { "id": "ws-7", "name": "Project C", "slug": "project-c" },
        { "id": "ws-8", "name": "Project D", "slug": "project-d" },
        { "id": "ws-9", "name": "Project E", "slug": "project-e" }
      ]
    }
  ],
  "summary": {
    "total": 198,
    "global": 42,
    "workspace": 156,
    "promotionCandidates": 8, // Workspace sources used by 2+ workspaces
    "totalStorageGB": 24.5,
    "estimatedSavingsGB": 180.3 // If all candidates were promoted
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 198
  }
}
```

#### POST /api/admin/sources/:id/promote
Promote a workspace source to global

**Request:**
```json
{
  "reason": "Used by 5 workspaces, saves 2.5GB storage",
  "notifyWorkspaces": true
}
```

**Response:**
```json
{
  "source": {
    "id": "source-def-456",
    "url": "https://custom-framework.io",
    "scope": "GLOBAL", // Changed from WORKSPACE
    "promotedToGlobalAt": "2025-01-09T15:45:00Z",
    "promotedById": "user-admin-2"
  },
  "impact": {
    "workspacesAffected": 5,
    "storageFreedKB": 2560000, // 2.5GB
    "existingWorkspaceLinksPreserved": true
  },
  "message": "Source successfully promoted to global. Now available to all workspaces."
}
```

#### POST /api/admin/sources/:id/demote
Demote a global source to workspace (rarely used)

**Request:**
```json
{
  "reason": "Source no longer maintained, limited use",
  "targetWorkspaceId": "workspace-123" // Which workspace should own it
}
```

**Response:**
```json
{
  "source": {
    "id": "source-ghi-789",
    "scope": "WORKSPACE", // Changed from GLOBAL
    "workspaceId": "workspace-123"
  },
  "impact": {
    "workspacesLostAccess": 3, // Other workspaces can no longer access
    "workspacesNotified": true
  },
  "message": "Source demoted to workspace scope."
}
```

#### GET /api/admin/sources/:id
Get detailed source information

**Response:**
```json
{
  "source": {
    "id": "source-abc-123",
    "url": "https://react.dev",
    "domain": "react.dev",
    "scope": "GLOBAL",
    "type": "WEBSITE",
    "status": "ACTIVE",
    "config": {
      "maxPages": 10000,
      "respectRobotsTxt": true,
      "userAgent": "ContextStream/1.0"
    },
    "pageCount": 8234,
    "chunkCount": 45678,
    "estimatedStorageKB": 411700,
    "lastScrapedAt": "2025-01-09T10:00:00Z",
    "lastUpdatedAt": "2025-01-09T10:45:00Z",
    "scrapeDurationMinutes": 45,
    "createdAt": "2024-10-01T08:00:00Z",
    "createdBy": {
      "id": "user-1",
      "name": "Bob Builder",
      "email": "bob@example.com"
    },
    "promotedToGlobalAt": "2024-11-15T14:30:00Z",
    "promotedBy": {
      "id": "user-admin-1",
      "name": "Alice Admin"
    }
  },
  "usage": {
    "workspaceCount": 142,
    "queryCount": 45678,
    "lastQueriedAt": "2025-01-09T15:30:00Z",
    "topQueries": [
      { "query": "useState hook", "count": 1234 },
      { "query": "useEffect dependencies", "count": 987 },
      { "query": "React 19 features", "count": 765 }
    ]
  },
  "workspaces": [
    {
      "id": "ws-1",
      "name": "Frontend Team",
      "slug": "frontend",
      "addedAt": "2024-11-20T10:00:00Z",
      "addedBy": { "name": "Charlie Dev" },
      "queryCount": 456
    }
    // ... (all 142 workspaces)
  ],
  "recentActivity": [
    {
      "type": "QUERY",
      "timestamp": "2025-01-09T15:30:00Z",
      "workspace": { "name": "Frontend Team" },
      "user": { "name": "Charlie Dev" },
      "query": "useState hook"
    },
    {
      "type": "ADDED_TO_WORKSPACE",
      "timestamp": "2025-01-09T14:00:00Z",
      "workspace": { "name": "New Project" },
      "user": { "name": "Dana Designer" }
    }
  ]
}
```

---

## Search Implementation

### Hybrid Search with Source Scoping

```typescript
// src/lib/search/hybrid-search.ts

export class HybridSearch {
  async search(query: string, options: SearchOptions) {
    const { workspaceId, limit = 10, offset = 0 } = options

    // Step 1: Get sources available to this workspace
    const availableSources = await this.getWorkspaceSources(workspaceId)
    const sourceIds = availableSources.map(s => s.id)

    if (sourceIds.length === 0) {
      return { results: [], total: 0, message: 'No sources available' }
    }

    // Step 2: Full-text search (BM25) - only in available sources
    const ftsResults = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT
        p.id,
        p."sourceId",
        ts_rank(to_tsvector('english', p."contentText"), plainto_tsquery('english', ${query})) as rank
      FROM pages p
      WHERE p."sourceId" = ANY(${sourceIds}::uuid[])
        AND to_tsvector('english', p."contentText") @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 100
    `

    // Step 3: Vector search - only in available sources
    const queryEmbedding = await this.embeddingProvider.generateEmbeddings([query])
    const vectorResults = await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
      SELECT
        c."pageId" as id,
        1 - (c.embedding <=> ${queryEmbedding[0]}::vector) as similarity
      FROM chunks c
      INNER JOIN pages p ON c."pageId" = p.id
      WHERE p."sourceId" = ANY(${sourceIds}::uuid[])
      ORDER BY c.embedding <=> ${queryEmbedding[0]}::vector
      LIMIT 100
    `

    // Step 4: Combine and rank (Reciprocal Rank Fusion)
    const combined = this.reciprocalRankFusion(ftsResults, vectorResults)

    // Step 5: Fetch full page details
    const pageIds = combined.slice(offset, offset + limit).map(r => r.id)
    const pages = await prisma.page.findMany({
      where: { id: { in: pageIds } },
      include: {
        source: {
          select: {
            id: true,
            url: true,
            domain: true,
            scope: true
          }
        }
      }
    })

    // Step 6: Log query for analytics
    await this.logQuery({
      query,
      workspaceId,
      sourceIds: [...new Set(pages.map(p => p.source.id))],
      resultsCount: pages.length,
      latencyMs: Date.now() - startTime
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
          isGlobal: p.source.scope === 'GLOBAL'
        },
        score: combined.find(r => r.id === p.id)?.score || 0
      })),
      total: combined.length,
      latencyMs: Date.now() - startTime
    }
  }

  private async getWorkspaceSources(workspaceId: string) {
    // Get both global sources AND workspace-specific sources
    return await prisma.source.findMany({
      where: {
        OR: [
          { scope: 'GLOBAL', status: 'ACTIVE' },
          {
            workspaceSources: {
              some: { workspaceId }
            },
            status: 'ACTIVE'
          }
        ]
      },
      select: { id: true, url: true, domain: true, scope: true }
    })
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
        queriedAt: new Date()
      }
    })

    // Update usage stats
    for (const sourceId of data.sourceIds) {
      await prisma.sourceUsageStats.upsert({
        where: { sourceId },
        create: {
          sourceId,
          queryCount: 1,
          lastQueriedAt: new Date()
        },
        update: {
          queryCount: { increment: 1 },
          lastQueriedAt: new Date()
        }
      })
    }
  }
}
```

---

## Admin UI Components

### Source Management Dashboard

```typescript
// src/app/(dashboard)/admin/sources/page.tsx

export default async function AdminSourcesPage({
  searchParams
}: {
  searchParams: { scope?: string; minWorkspaces?: string }
}) {
  const scope = searchParams.scope || 'ALL'
  const minWorkspaces = parseInt(searchParams.minWorkspaces || '0')

  const response = await fetch(
    `/api/admin/sources?scope=${scope}&minWorkspaces=${minWorkspaces}`
  )
  const { sources, summary } = await response.json()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Source Management</h1>
          <p className="text-muted-foreground">
            Manage global and workspace sources
          </p>
        </div>
        <Button onClick={() => router.push('/admin/sources/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Global Source
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Global Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.global}</div>
            <p className="text-xs text-muted-foreground">
              Available to all workspaces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workspace Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.workspace}</div>
            <p className="text-xs text-muted-foreground">
              Private to workspaces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promotion Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {summary.candidates}
            </div>
            <p className="text-xs text-muted-foreground">
              Used by 2+ workspaces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {summary.estimatedSavingsGB.toFixed(1)} GB
            </div>
            <p className="text-xs text-muted-foreground">
              If candidates promoted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={scope} onValueChange={(v) => router.push(`?scope=${v}`)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="GLOBAL">Global Only</SelectItem>
            <SelectItem value="WORKSPACE">Workspace Only</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={minWorkspaces.toString()}
          onValueChange={(v) => router.push(`?minWorkspaces=${v}`)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Min workspaces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All</SelectItem>
            <SelectItem value="2">2+ workspaces</SelectItem>
            <SelectItem value="5">5+ workspaces</SelectItem>
            <SelectItem value="10">10+ workspaces</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sources Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Workspaces</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">Storage</TableHead>
                <TableHead className="text-right">Last Scraped</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {source.url}
                    </a>
                  </TableCell>
                  <TableCell>{source.domain}</TableCell>
                  <TableCell>
                    <Badge variant={source.scope === 'GLOBAL' ? 'default' : 'secondary'}>
                      {source.scope}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => showWorkspaces(source)}
                    >
                      {source.workspaceCount}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    {source.pageCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(source.estimatedStorageKB / 1024).toFixed(1)} MB
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDistanceToNow(new Date(source.lastScrapedAt), {
                      addSuffix: true
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/sources/${source.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>

                        {source.canPromoteToGlobal && (
                          <DropdownMenuItem
                            onClick={() => promoteToGlobal(source)}
                            className="text-orange-600"
                          >
                            <ArrowUp className="mr-2 h-4 w-4" />
                            Promote to Global
                          </DropdownMenuItem>
                        )}

                        {source.scope === 'GLOBAL' && (
                          <DropdownMenuItem
                            onClick={() => demoteToWorkspace(source)}
                            className="text-orange-600"
                          >
                            <ArrowDown className="mr-2 h-4 w-4" />
                            Demote to Workspace
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => triggerRescrape(source.id)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Re-scrape Now
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => deleteSource(source.id)}
                          className="text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete Source
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Promotion Confirmation Modal

```typescript
// src/components/admin/promotion-modal.tsx

export function PromotionModal({ source, onConfirm, onCancel }) {
  const storageBeforeMB = (source.estimatedStorageKB * source.workspaceCount) / 1024
  const storageAfterMB = source.estimatedStorageKB / 1024
  const savingsMB = storageBeforeMB - storageAfterMB

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Source to Global?</DialogTitle>
          <DialogDescription>
            This will make the source available to all workspaces and deduplicate storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Source URL</Label>
            <div className="font-mono text-sm">{source.url}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Usage</Label>
              <div className="text-2xl font-bold">{source.workspaceCount}</div>
              <div className="text-xs text-muted-foreground">workspaces</div>
            </div>

            <div>
              <Label>Pages</Label>
              <div className="text-2xl font-bold">{source.pageCount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">pages indexed</div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Storage Impact</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Current storage:</span>
                  <span className="font-bold">{storageBeforeMB.toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>After promotion:</span>
                  <span className="font-bold">{storageAfterMB.toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>Savings:</span>
                  <span className="font-bold text-green-600">
                    {savingsMB.toFixed(1)} MB ({((savingsMB / storageBeforeMB) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What happens next</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1 text-sm">
                <li>✓ Source becomes available to all workspaces</li>
                <li>✓ Existing workspace links remain intact</li>
                <li>✓ Storage is deduplicated immediately</li>
                <li>✓ Future scrapes update all workspaces</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-orange-600 hover:bg-orange-700">
            Promote to Global
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Database Migration

### Migration SQL

```sql
-- Migration: Add Source Scoping and Role-Based Access
-- File: prisma/migrations/20250109_add_source_scoping/migration.sql

-- 1. Add new enum types
CREATE TYPE "SourceScope" AS ENUM ('GLOBAL', 'WORKSPACE');
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- 2. Add new columns to User table
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- 3. Add new columns to Source table
ALTER TABLE "Source" ADD COLUMN "scope" "SourceScope" NOT NULL DEFAULT 'WORKSPACE';
ALTER TABLE "Source" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Source" ADD COLUMN "promotedToGlobalAt" TIMESTAMP;
ALTER TABLE "Source" ADD COLUMN "promotedById" TEXT;

-- 4. Make URL unique globally (remove workspace constraint)
-- First, check for duplicates and handle them
WITH duplicates AS (
  SELECT url, MIN(id) as keep_id
  FROM "Source"
  GROUP BY url
  HAVING COUNT(*) > 1
)
-- Mark duplicates as workspace-scoped (they'll be migration candidates)
UPDATE "Source" s
SET scope = 'WORKSPACE'
WHERE EXISTS (
  SELECT 1 FROM duplicates d
  WHERE d.url = s.url AND s.id != d.keep_id
);

-- Now safe to add unique constraint
DROP INDEX IF EXISTS "Source_workspaceId_url_key";
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- 5. Create WorkspaceSource join table
CREATE TABLE "WorkspaceSource" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "workspaceId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "customConfig" JSONB,
  "addedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "addedBy" TEXT,
  CONSTRAINT "WorkspaceSource_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE,
  CONSTRAINT "WorkspaceSource_source_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE,
  CONSTRAINT "WorkspaceSource_workspaceId_sourceId_key" UNIQUE ("workspaceId", "sourceId")
);

-- 6. Create indexes for WorkspaceSource
CREATE INDEX "WorkspaceSource_workspaceId_idx" ON "WorkspaceSource"("workspaceId");
CREATE INDEX "WorkspaceSource_sourceId_idx" ON "WorkspaceSource"("sourceId");

-- 7. Migrate existing data: Create WorkspaceSource links for all existing sources
INSERT INTO "WorkspaceSource" ("id", "workspaceId", "sourceId", "addedAt")
SELECT
  gen_random_uuid()::text,
  "workspaceId",
  "id",
  "createdAt"
FROM "Source"
WHERE "workspaceId" IS NOT NULL;

-- 8. Remove workspaceId foreign key from Source table
ALTER TABLE "Source" DROP CONSTRAINT IF EXISTS "Source_workspaceId_fkey";
ALTER TABLE "Source" DROP COLUMN "workspaceId";

-- 9. Add indexes to Source table
CREATE INDEX "Source_scope_idx" ON "Source"("scope");
CREATE INDEX "Source_domain_idx" ON "Source"("domain");

-- 10. Create SourceUsageStats table
CREATE TABLE "SourceUsageStats" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sourceId" TEXT NOT NULL UNIQUE,
  "workspaceCount" INTEGER NOT NULL DEFAULT 0,
  "queryCount" INTEGER NOT NULL DEFAULT 0,
  "lastQueriedAt" TIMESTAMP,
  "calculatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "SourceUsageStats_source_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE
);

CREATE INDEX "SourceUsageStats_workspaceCount_idx" ON "SourceUsageStats"("workspaceCount");
CREATE INDEX "SourceUsageStats_sourceId_idx" ON "SourceUsageStats"("sourceId");

-- 11. Initialize SourceUsageStats for existing sources
INSERT INTO "SourceUsageStats" ("id", "sourceId", "workspaceCount", "calculatedAt")
SELECT
  gen_random_uuid()::text,
  s."id",
  COUNT(ws."id"),
  NOW()
FROM "Source" s
LEFT JOIN "WorkspaceSource" ws ON ws."sourceId" = s."id"
GROUP BY s."id";

-- 12. Update QueryLog table to track sourceIds
ALTER TABLE "QueryLog" ADD COLUMN "sourceIds" TEXT[] DEFAULT '{}';

-- 13. Add index for QueryLog sourceIds queries
CREATE INDEX "QueryLog_sourceIds_idx" ON "QueryLog" USING GIN("sourceIds");

-- 14. Migration complete
COMMENT ON TABLE "WorkspaceSource" IS 'Join table linking workspaces to sources (many-to-many relationship)';
COMMENT ON TABLE "SourceUsageStats" IS 'Tracks usage statistics for sources to identify promotion candidates';
```

### Migration Verification

```sql
-- Verification queries to run after migration

-- 1. Verify all sources have WorkspaceSource links
SELECT
  (SELECT COUNT(*) FROM "Source") as total_sources,
  (SELECT COUNT(DISTINCT "sourceId") FROM "WorkspaceSource") as sources_with_links,
  (SELECT COUNT(*) FROM "Source") - (SELECT COUNT(DISTINCT "sourceId") FROM "WorkspaceSource") as orphaned_sources;
-- Expected: orphaned_sources = 0

-- 2. Verify URL uniqueness
SELECT url, COUNT(*) as count
FROM "Source"
GROUP BY url
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- 3. Check workspace coverage
SELECT
  w."id",
  w."name",
  COUNT(ws."id") as source_count
FROM "Workspace" w
LEFT JOIN "WorkspaceSource" ws ON ws."workspaceId" = w."id"
GROUP BY w."id", w."name"
ORDER BY source_count DESC;
-- All workspaces should have their sources preserved

-- 4. Verify SourceUsageStats accuracy
SELECT
  s."url",
  s."scope",
  sus."workspaceCount",
  (SELECT COUNT(*) FROM "WorkspaceSource" WHERE "sourceId" = s."id") as actual_count
FROM "Source" s
LEFT JOIN "SourceUsageStats" sus ON sus."sourceId" = s."id"
WHERE sus."workspaceCount" != (SELECT COUNT(*) FROM "WorkspaceSource" WHERE "sourceId" = s."id");
-- Expected: 0 rows (stats match reality)
```

---

## Implementation Checklist

### Phase 1: Database Schema (Week 1)

- [ ] Create migration file with SQL above
- [ ] Run migration on development database
- [ ] Verify all data migrated correctly
- [ ] Update Prisma schema with new models
- [ ] Run `prisma generate` to update client
- [ ] Write migration rollback script (just in case)

### Phase 2: Permission System (Week 1)

- [ ] Create `src/lib/auth/permissions.ts`
- [ ] Define `UserRole` enum and permissions mapping
- [ ] Implement `requirePermission()` middleware
- [ ] Update `requireAuth()` to include user role
- [ ] Add role selection to user registration (default: USER)
- [ ] Create admin promotion endpoint for upgrading users

### Phase 3: API Endpoints (Week 2)

User Endpoints:
- [ ] Update `POST /api/sources` - Check for global sources
- [ ] Update `GET /api/sources` - Return global + workspace sources
- [ ] Update `GET /api/sources/:id` - Show scope information
- [ ] Update `DELETE /api/sources/:id` - Handle workspace unlink vs full delete

Admin Endpoints:
- [ ] Create `GET /api/admin/sources` - List all with stats
- [ ] Create `GET /api/admin/sources/:id` - Detailed view
- [ ] Create `POST /api/admin/sources/:id/promote` - Promote to global
- [ ] Create `POST /api/admin/sources/:id/demote` - Demote to workspace
- [ ] Create `GET /api/admin/stats` - System-wide statistics

### Phase 4: Search Updates (Week 2)

- [ ] Update `HybridSearch.getWorkspaceSources()` - Include global sources
- [ ] Update query logging to track `sourceIds`
- [ ] Create background job to update `SourceUsageStats`
- [ ] Add source attribution to search results

### Phase 5: Admin UI (Week 3)

- [ ] Create `src/app/(dashboard)/admin/sources/page.tsx` - Main dashboard
- [ ] Create `src/app/(dashboard)/admin/sources/[id]/page.tsx` - Detail view
- [ ] Create `PromotionModal` component
- [ ] Create `DemotionModal` component
- [ ] Create `SourceUsageChart` component
- [ ] Create `WorkspacesList` component
- [ ] Add admin navigation menu item (permission-gated)

### Phase 6: User UI Updates (Week 3)

- [ ] Update source list to show global badge
- [ ] Update "Add Source" flow with global source check
- [ ] Show "Source is already global" message when applicable
- [ ] Add "Request Promotion" button for workspace sources
- [ ] Update source card to indicate global vs workspace

### Phase 7: Testing (Week 4)

- [ ] Unit tests for permission system
- [ ] Integration tests for source addition flow
- [ ] Integration tests for promotion/demotion
- [ ] E2E test: User adds global source (instant)
- [ ] E2E test: User adds new source (scraping)
- [ ] E2E test: Admin promotes source
- [ ] Load test: Search across 100 workspaces with 50 global sources
- [ ] Migration test on production-like dataset

### Phase 8: Documentation (Week 4)

- [ ] Update `ARCHITECTURE_NEXTJS.md` with new schema
- [ ] Create admin guide for managing sources
- [ ] Create user guide explaining global vs workspace sources
- [ ] Update API documentation
- [ ] Create migration guide for production deployment

### Phase 9: Deployment (Week 5)

- [ ] Deploy to staging environment
- [ ] Run migration on staging database
- [ ] Verify all functionality works
- [ ] Performance test with production-size dataset
- [ ] Create production deployment plan
- [ ] Deploy to production
- [ ] Monitor logs and metrics for 48 hours

---

## Performance Considerations

### Storage Efficiency

**Before (Current System):**
```
100 workspaces × React docs (500MB) = 50GB
100 workspaces × Python docs (300MB) = 30GB
100 workspaces × TypeScript docs (200MB) = 20GB
Total: 100GB for 3 popular sources
```

**After (Global Sources):**
```
1 × React docs (500MB) = 500MB
1 × Python docs (300MB) = 300MB
1 × TypeScript docs (200MB) = 200MB
Total: 1GB for 3 popular sources

Savings: 99GB (99% reduction!)
```

### Query Performance

**Current:** Search must specify `workspaceId` and filter by workspace
```sql
-- Current query
SELECT * FROM pages p
INNER JOIN sources s ON p.sourceId = s.id
WHERE s.workspaceId = 'workspace-123'
  AND to_tsvector('english', p.contentText) @@ plainto_tsquery('english', 'react hooks')
```

**New:** Search across global + workspace sources
```sql
-- New query (slightly more complex, but indexed well)
SELECT * FROM pages p
WHERE p.sourceId = ANY(ARRAY['source1', 'source2', ..., 'source50']) -- pre-fetched list
  AND to_tsvector('english', p.contentText) @@ plainto_tsquery('english', 'react hooks')
```

**Performance impact:** Negligible (< 5ms difference)
- Source list is cached in memory
- Array lookup on indexed `sourceId` is very fast
- Benefits outweigh minimal overhead

### Database Indexes

Critical indexes for performance:

```sql
-- For workspace source lookup (most common query)
CREATE INDEX "WorkspaceSource_workspaceId_idx" ON "WorkspaceSource"("workspaceId");

-- For finding global sources
CREATE INDEX "Source_scope_idx" ON "Source"("scope");

-- For promotion candidates (admin dashboard)
CREATE INDEX "SourceUsageStats_workspaceCount_idx" ON "SourceUsageStats"("workspaceCount");

-- For search queries
CREATE INDEX "pages_sourceId_idx" ON "pages"("sourceId");
```

---

## Security Considerations

### Permission Enforcement

**Critical:** Always verify permissions before sensitive operations

```typescript
// ❌ BAD: No permission check
export async function POST(request: Request) {
  const { sourceId } = await request.json()
  await promoteSourceToGlobal(sourceId) // Anyone can do this!
}

// ✅ GOOD: Permission check enforced
export async function POST(request: Request) {
  await requirePermission(request, Permission.PROMOTE_SOURCES)
  const { sourceId } = await request.json()
  await promoteSourceToGlobal(sourceId)
}
```

### Data Isolation

- Global sources are **readable** by all workspaces
- Workspace sources are **only readable** by linked workspaces
- Users can **only modify** sources in workspaces they own
- Admins can **promote** but not **access** workspace content

### Audit Trail

Track all administrative actions:

```typescript
model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // 'PROMOTE_SOURCE', 'DEMOTE_SOURCE', 'DELETE_SOURCE'
  entityId  String   // Source ID
  before    Json?    // State before action
  after     Json?    // State after action
  reason    String?  // Admin-provided reason
  timestamp DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([timestamp])
}
```

---

## Rollback Plan

If migration fails or causes issues:

### Immediate Rollback (< 1 hour after deployment)

```sql
-- 1. Restore Source.workspaceId from WorkspaceSource
ALTER TABLE "Source" ADD COLUMN "workspaceId" TEXT;

UPDATE "Source" s
SET "workspaceId" = (
  SELECT ws."workspaceId"
  FROM "WorkspaceSource" ws
  WHERE ws."sourceId" = s."id"
  LIMIT 1
);

-- 2. Drop new tables
DROP TABLE "SourceUsageStats";
DROP TABLE "WorkspaceSource";

-- 3. Restore old constraint
CREATE UNIQUE INDEX "Source_workspaceId_url_key" ON "Source"("workspaceId", "url");

-- 4. Remove new columns
ALTER TABLE "Source" DROP COLUMN "scope";
ALTER TABLE "Source" DROP COLUMN "createdById";
ALTER TABLE "Source" DROP COLUMN "promotedToGlobalAt";
ALTER TABLE "Source" DROP COLUMN "promotedById";

ALTER TABLE "User" DROP COLUMN "role";

-- 5. Drop new enums
DROP TYPE "SourceScope";
DROP TYPE "UserRole";
```

### Staged Rollback (If issues discovered later)

1. **Disable admin features** - Hide admin UI, disable promotion endpoints
2. **Fall back to workspace-only mode** - Treat all sources as workspace-scoped
3. **Investigate issue** - Fix bug without data loss
4. **Re-enable features** - Once fix is verified

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Source Templates**
   - Curated configs for popular documentation sites
   - "Add React Docs" with one click (uses global source)

2. **Smart Promotion Suggestions**
   - Background job analyzes usage patterns
   - Suggests sources for promotion based on: workspace count, query frequency, storage impact

3. **Workspace Source Requests**
   - Users can request admins add specific global sources
   - Admin approval workflow

4. **Source Collections**
   - Group related sources (e.g., "JavaScript Ecosystem", "Python Data Science")
   - One-click add entire collection to workspace

5. **Advanced Analytics**
   - Most queried sources per workspace
   - Underutilized global sources (promote less popular ones)
   - Storage efficiency trends over time

6. **Workspace Quotas**
   - Limit number of workspace-specific sources
   - Unlimited global source access
   - Encourage use of global sources

---

## Appendix: Example Scenarios

### Scenario 1: New User Adds React Docs

**User Action:** Add https://react.dev to workspace

**System Flow:**
1. Check if source exists: ✓ Found (scope: GLOBAL)
2. Check if already linked to workspace: ✗ Not linked
3. Create WorkspaceSource link
4. Return success: "Global source added instantly!"

**Result:** User gets access in < 1 second (no scraping needed)

---

### Scenario 2: Admin Promotes Popular Source

**Situation:** Custom framework docs used by 5 workspaces

**Admin Action:** Promote source to global

**System Flow:**
1. Verify admin permission: ✓
2. Update Source: scope = GLOBAL
3. Keep all 5 WorkspaceSource links intact
4. Update SourceUsageStats
5. Notify workspaces (optional)

**Impact:**
- Storage: 5 × 200MB = 1GB → 200MB (saved 800MB)
- Future users get instant access
- All 5 existing workspaces unaffected

---

### Scenario 3: User Tries to Add Duplicate

**User Action:** Add https://python.org to workspace

**System Flow:**
1. Check if source exists: ✓ Found (scope: WORKSPACE, owned by workspace-456)
2. Return error: "Already indexed by another workspace"
3. Suggest: "Contact admin to promote to global"

**Admin Follow-up:**
- Admin sees source has 1 workspace (not a candidate yet)
- When 2nd workspace requests it, admin promotes
- Both workspaces now share the source

---

## Conclusion

This architecture provides:

✅ **Storage Efficiency** - Deduplicate popular sources (99% savings possible)
✅ **User Experience** - Instant access to global sources (no waiting)
✅ **Admin Control** - Fine-grained permissions and promotion workflow
✅ **Scalability** - Shared content scales to thousands of workspaces
✅ **Flexibility** - Mix of global and workspace-private sources
✅ **Audit Trail** - Track all administrative actions
✅ **Backward Compatible** - Existing workspaces unaffected

**Estimated Development Time:** 4-5 weeks with 2 engineers

**Estimated Storage Savings:** 80-95% for popular documentation sources

**User Impact:** 95% of source additions will be instant (using existing global sources)

---

**Document Status:** Ready for Implementation
**Next Steps:** Begin Phase 1 - Database Schema Updates
