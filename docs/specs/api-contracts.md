# ContextStream API Contracts

**Version:** 1.0
**Last Updated:** 2025-01-09
**Base URL:** `https://api.contextstream.dev` (production) or `http://localhost:3000` (development)
**Authentication:** Bearer token (JWT) or API Key

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Types](#common-types)
4. [Error Responses](#error-responses)
5. [Source Management](#source-management)
6. [Search](#search)
7. [Workspace Management](#workspace-management)
8. [Job Management](#job-management)
9. [Admin Endpoints](#admin-endpoints)
10. [MCP Endpoints](#mcp-endpoints)
11. [User Settings](#user-settings)
12. [Rate Limiting](#rate-limiting)

---

## Overview

All API endpoints return JSON responses. All timestamps are in ISO 8601 format (UTC).

### Request Headers

```
Content-Type: application/json
Authorization: Bearer {jwt_token}  // For web app
X-API-Key: {api_key}              // For MCP clients
```

### Response Format

**Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-09T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [ ... ],
    "requestId": "req_abc123"
  }
}
```

---

## Authentication

### POST /api/auth/login

Email/password authentication.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "Alex Thompson",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2025-01-10T10:30:00Z"
}
```

**Errors:**
- `401`: Invalid credentials
- `429`: Too many login attempts

---

## Common Types

### Source Type

```typescript
type Source = {
  id: string
  url: string
  domain: string
  type: 'WEBSITE' | 'GITHUB' | 'CONFLUENCE' | 'CUSTOM'
  scope: 'GLOBAL' | 'WORKSPACE'
  status: 'PENDING' | 'INDEXING' | 'ACTIVE' | 'ERROR' | 'PAUSED'
  config?: Record<string, any>
  pageCount: number
  lastScrapedAt?: string
  lastUpdatedAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}
```

### Page Type

```typescript
type Page = {
  id: string
  sourceId: string
  url: string
  title?: string
  contentText: string
  metadata?: Record<string, any>
  indexedAt: string
  updatedAt: string
}
```

### Job Type

```typescript
type Job = {
  id: string
  sourceId: string
  type: 'SCRAPE' | 'EMBED' | 'UPDATE'
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress?: {
    pagesScraped: number
    total: number
    currentPage?: string
    errors?: string[]
  }
  result?: Record<string, any>
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}
```

### SearchResult Type

```typescript
type SearchResult = {
  id: string
  title?: string
  url: string
  snippet: string
  source: {
    name: string
    url: string
    scope: 'GLOBAL' | 'WORKSPACE'
    isGlobal: boolean
  }
  score: number
}
```

---

## Error Responses

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "url",
        "message": "Must be a valid URL"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

---

## Source Management

### POST /api/sources

Add a new source to a workspace. Checks for existing global sources first.

**Request:**
```json
{
  "url": "https://react.dev",
  "type": "WEBSITE",
  "workspaceId": "wks_abc123",
  "config": {
    "maxPages": 1000,
    "respectRobotsTxt": true,
    "userAgent": "ContextStream/1.0"
  }
}
```

**Response (201 Created) - New Source:**
```json
{
  "source": {
    "id": "src_xyz456",
    "url": "https://react.dev",
    "domain": "react.dev",
    "type": "WEBSITE",
    "scope": "WORKSPACE",
    "status": "PENDING",
    "config": { ... },
    "createdAt": "2025-01-09T10:30:00Z"
  },
  "jobId": "job_789",
  "estimatedTime": "5-10 minutes"
}
```

**Response (200 OK) - Global Source:**
```json
{
  "message": "Global source added to workspace",
  "source": {
    "id": "src_abc123",
    "url": "https://react.dev",
    "scope": "GLOBAL",
    "status": "ACTIVE",
    "pageCount": 8234
  },
  "isGlobal": true
}
```

**Response (409 Conflict) - Already Exists:**
```json
{
  "error": "This source is already indexed in another workspace",
  "suggestion": "Contact an admin to promote it to global",
  "sourceId": "src_def789",
  "workspaceCount": 3
}
```

**Validation:**
- `url`: Required, valid URL
- `type`: Required, one of WEBSITE, GITHUB, CONFLUENCE, CUSTOM
- `workspaceId`: Required, valid workspace UUID
- `config`: Optional object

---

### GET /api/sources

List sources available to user's workspaces.

**Query Parameters:**
```
?workspaceId=wks_abc123      // Filter by workspace (optional)
&status=ACTIVE               // Filter by status (optional)
&limit=20                    // Results per page (default: 20, max: 100)
&offset=0                    // Pagination offset (default: 0)
```

**Response (200 OK):**
```json
{
  "sources": [
    {
      "id": "src_abc123",
      "url": "https://react.dev",
      "domain": "react.dev",
      "scope": "GLOBAL",
      "status": "ACTIVE",
      "pageCount": 8234,
      "lastScrapedAt": "2025-01-09T10:00:00Z",
      "addedToWorkspaceAt": "2025-01-01T12:00:00Z",
      "usageStats": {
        "workspaceCount": 142,
        "queryCount": 45678
      }
    },
    {
      "id": "src_xyz456",
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
    "total": 8,
    "global": 5,
    "workspace": 3
  },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 8
  }
}
```

---

### GET /api/sources/:id

Get detailed information about a specific source.

**Response (200 OK):**
```json
{
  "source": {
    "id": "src_abc123",
    "url": "https://react.dev",
    "domain": "react.dev",
    "type": "WEBSITE",
    "scope": "GLOBAL",
    "status": "ACTIVE",
    "config": {
      "maxPages": 10000,
      "respectRobotsTxt": true
    },
    "pageCount": 8234,
    "chunkCount": 45678,
    "estimatedStorageKB": 411700,
    "lastScrapedAt": "2025-01-09T10:00:00Z",
    "lastUpdatedAt": "2025-01-09T10:45:00Z",
    "createdAt": "2024-10-01T08:00:00Z",
    "updatedAt": "2025-01-09T10:45:00Z"
  },
  "pages": [
    {
      "id": "pg_001",
      "url": "https://react.dev/learn",
      "title": "Learn React",
      "indexedAt": "2025-01-09T10:15:00Z"
    }
  ],
  "recentActivity": [
    {
      "type": "QUERY",
      "timestamp": "2025-01-09T15:30:00Z",
      "query": "useState hook"
    }
  ]
}
```

**Errors:**
- `404`: Source not found
- `403`: User doesn't have access to this source

---

### PATCH /api/sources/:id

Update source settings.

**Request:**
```json
{
  "config": {
    "maxPages": 5000,
    "updateSchedule": "daily"
  }
}
```

**Response (200 OK):**
```json
{
  "source": {
    "id": "src_abc123",
    "config": { ... },
    "updatedAt": "2025-01-09T16:00:00Z"
  }
}
```

**Permissions:**
- WORKSPACE sources: Only workspace owner
- GLOBAL sources: ADMIN or SUPER_ADMIN

---

### DELETE /api/sources/:id

Delete a source. For workspace sources, this removes the workspace link. For global sources (admin only), this deletes the source entirely.

**Query Parameters:**
```
?workspaceId=wks_abc123  // Required for workspace sources
```

**Response (200 OK):**
```json
{
  "message": "Source removed from workspace",
  "sourceId": "src_abc123"
}
```

**Permissions:**
- WORKSPACE sources: Only workspace owner
- GLOBAL sources: ADMIN or SUPER_ADMIN (requires confirmation)

---

### POST /api/sources/:id/scrape

Trigger a manual re-scrape of a source.

**Request:**
```json
{
  "fullReindex": false  // true = re-scrape all pages, false = only changed pages
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "job_789",
  "estimatedTime": "5-10 minutes",
  "message": "Re-scraping started"
}
```

---

## Search

### POST /api/search

Perform hybrid search (BM25 + vector similarity) across indexed documentation.

**Request:**
```json
{
  "query": "useState hook",
  "workspaceId": "wks_abc123",
  "filters": {
    "sourceIds": ["src_abc123", "src_xyz456"],  // Optional
    "dateRange": {                              // Optional
      "start": "2024-01-01T00:00:00Z",
      "end": "2025-01-09T23:59:59Z"
    }
  },
  "limit": 10,
  "offset": 0
}
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "pg_001",
      "title": "useState Hook - React Docs",
      "url": "https://react.dev/reference/react/useState",
      "snippet": "useState is a React Hook that lets you add a **state variable** to your component. Call useState at the top level...",
      "source": {
        "name": "react.dev",
        "url": "https://react.dev",
        "scope": "GLOBAL",
        "isGlobal": true
      },
      "score": 0.95
    }
  ],
  "total": 142,
  "latencyMs": 234,
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 142
  }
}
```

**Validation:**
- `query`: Required, min 2 characters, max 500 characters
- `workspaceId`: Required, valid workspace UUID
- `limit`: Optional, min 1, max 100, default 10
- `offset`: Optional, min 0, default 0

---

### GET /api/search/suggestions

Get search suggestions for autocomplete.

**Query Parameters:**
```
?query=use&workspaceId=wks_abc123&limit=10
```

**Response (200 OK):**
```json
{
  "suggestions": [
    {
      "text": "useState hook",
      "type": "popular_query",
      "count": 234
    },
    {
      "text": "useEffect dependencies",
      "type": "popular_query",
      "count": 187
    },
    {
      "text": "Using React Hooks",
      "type": "page_title",
      "pageId": "pg_045"
    }
  ]
}
```

---

## Workspace Management

### GET /api/workspaces

List user's workspaces.

**Response (200 OK):**
```json
{
  "workspaces": [
    {
      "id": "wks_abc123",
      "name": "Personal",
      "slug": "personal",
      "sourceCount": 5,
      "isOwner": true,
      "createdAt": "2024-10-01T08:00:00Z"
    },
    {
      "id": "wks_xyz456",
      "name": "Work - Project Alpha",
      "slug": "work-project-alpha",
      "sourceCount": 3,
      "isOwner": true,
      "createdAt": "2024-11-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/workspaces

Create a new workspace.

**Request:**
```json
{
  "name": "My New Workspace",
  "slug": "my-new-workspace"
}
```

**Response (201 Created):**
```json
{
  "workspace": {
    "id": "wks_new123",
    "name": "My New Workspace",
    "slug": "my-new-workspace",
    "ownerId": "usr_abc123",
    "createdAt": "2025-01-09T16:00:00Z"
  }
}
```

**Validation:**
- `name`: Required, 3-50 characters
- `slug`: Required, 3-50 characters, lowercase, alphanumeric + hyphens

---

### GET /api/workspaces/:id/sources

List all sources linked to a workspace.

**Response (200 OK):**
```json
{
  "sources": [
    {
      "id": "src_abc123",
      "url": "https://react.dev",
      "scope": "GLOBAL",
      "addedAt": "2024-11-01T10:00:00Z",
      "addedBy": {
        "id": "usr_abc123",
        "name": "Alex Thompson"
      }
    }
  ],
  "total": 8
}
```

---

## Job Management

### GET /api/jobs

List jobs for user's sources.

**Query Parameters:**
```
?sourceId=src_abc123     // Filter by source (optional)
&status=RUNNING          // Filter by status (optional)
&limit=20
&offset=0
```

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "id": "job_789",
      "sourceId": "src_abc123",
      "type": "SCRAPE",
      "status": "RUNNING",
      "progress": {
        "pagesScraped": 42,
        "total": 240,
        "currentPage": "https://react.dev/learn/state"
      },
      "startedAt": "2025-01-09T15:30:00Z",
      "createdAt": "2025-01-09T15:29:00Z"
    }
  ],
  "total": 15
}
```

---

### GET /api/jobs/:id

Get detailed job status.

**Response (200 OK):**
```json
{
  "job": {
    "id": "job_789",
    "sourceId": "src_abc123",
    "source": {
      "id": "src_abc123",
      "domain": "react.dev"
    },
    "type": "SCRAPE",
    "status": "RUNNING",
    "progress": {
      "pagesScraped": 42,
      "total": 240,
      "currentPage": "https://react.dev/learn/state",
      "errors": [
        {
          "url": "https://react.dev/broken",
          "error": "404 Not Found"
        }
      ]
    },
    "startedAt": "2025-01-09T15:30:00Z",
    "createdAt": "2025-01-09T15:29:00Z"
  }
}
```

---

### POST /api/jobs/:id/cancel

Cancel a running job.

**Response (200 OK):**
```json
{
  "job": {
    "id": "job_789",
    "status": "CANCELLED",
    "completedAt": "2025-01-09T15:45:00Z"
  }
}
```

---

### GET /api/jobs/:id/stream

Server-Sent Events stream for real-time job progress.

**Response (text/event-stream):**
```
data: {"status":"RUNNING","progress":{"pagesScraped":10,"total":240}}

data: {"status":"RUNNING","progress":{"pagesScraped":25,"total":240}}

data: {"status":"COMPLETED","progress":{"pagesScraped":240,"total":240}}
```

---

## Admin Endpoints

### GET /api/admin/sources

List all sources with usage statistics (ADMIN or SUPER_ADMIN only).

**Query Parameters:**
```
?scope=ALL              // GLOBAL | WORKSPACE | ALL (default: ALL)
&minWorkspaces=2        // Minimum workspace count (for finding promotion candidates)
&sortBy=workspaceCount  // workspaceCount | queryCount | pageCount
&limit=50
&offset=0
```

**Response (200 OK):**
```json
{
  "sources": [
    {
      "id": "src_abc123",
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
        "id": "usr_admin_1",
        "name": "Alice Admin"
      },
      "workspaces": [
        { "id": "wks_1", "name": "Frontend Team", "slug": "frontend" }
      ]
    },
    {
      "id": "src_def456",
      "url": "https://custom-framework.io",
      "scope": "WORKSPACE",
      "pageCount": 456,
      "workspaceCount": 5,
      "queryCount": 234,
      "canPromoteToGlobal": true,
      "workspaces": [...]
    }
  ],
  "summary": {
    "total": 198,
    "global": 42,
    "workspace": 156,
    "promotionCandidates": 8,
    "totalStorageGB": 24.5,
    "estimatedSavingsGB": 180.3
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 198
  }
}
```

---

### POST /api/admin/sources/:id/promote

Promote a workspace source to global (ADMIN or SUPER_ADMIN only).

**Request:**
```json
{
  "reason": "Used by 5 workspaces, saves 2.5GB storage",
  "notifyWorkspaces": true
}
```

**Response (200 OK):**
```json
{
  "source": {
    "id": "src_def456",
    "url": "https://custom-framework.io",
    "scope": "GLOBAL",
    "promotedToGlobalAt": "2025-01-09T15:45:00Z",
    "promotedById": "usr_admin_2"
  },
  "impact": {
    "workspacesAffected": 5,
    "storageFreedKB": 2560000,
    "existingWorkspaceLinksPreserved": true
  },
  "message": "Source successfully promoted to global"
}
```

**Validation:**
- Source must be WORKSPACE scope
- Source must be used by at least 1 workspace
- User must have ADMIN or SUPER_ADMIN role

---

### POST /api/admin/sources/:id/demote

Demote a global source to workspace (SUPER_ADMIN only).

**Request:**
```json
{
  "reason": "Source no longer maintained",
  "targetWorkspaceId": "wks_abc123"
}
```

**Response (200 OK):**
```json
{
  "source": {
    "id": "src_ghi789",
    "scope": "WORKSPACE"
  },
  "impact": {
    "workspacesLostAccess": 3,
    "workspacesNotified": true
  },
  "message": "Source demoted to workspace scope"
}
```

---

### GET /api/admin/stats

Get system-wide statistics (ADMIN or SUPER_ADMIN only).

**Response (200 OK):**
```json
{
  "stats": {
    "users": {
      "total": 1247,
      "active": 892,
      "newThisWeek": 45
    },
    "workspaces": {
      "total": 1580,
      "averageSourcesPerWorkspace": 6.3
    },
    "sources": {
      "total": 198,
      "global": 42,
      "workspace": 156,
      "active": 185,
      "indexing": 8,
      "error": 5
    },
    "pages": {
      "total": 1247892,
      "totalStorageGB": 24.5
    },
    "queries": {
      "last24h": 15678,
      "last7d": 98234,
      "averageLatencyMs": 234
    }
  }
}
```

---

## MCP Endpoints

### POST /api/mcp/query

MCP-specific search endpoint (requires API key authentication).

**Headers:**
```
X-API-Key: sk_live_abc123xyz...
```

**Request:**
```json
{
  "query": "useState hook",
  "workspaceId": "wks_abc123",
  "maxResults": 10
}
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "content": "useState is a React Hook that lets you add a state variable to your component...",
      "metadata": {
        "source": "https://react.dev",
        "title": "useState Hook",
        "url": "https://react.dev/reference/react/useState",
        "relevance": 0.95
      }
    }
  ],
  "tokensUsed": 234,
  "sources": ["https://react.dev", "https://react.dev/learn"]
}
```

**Authentication:**
- Requires valid API key in `X-API-Key` header
- API key must not be expired
- Rate limited to 1000 requests/hour per API key

---

## User Settings

### GET /api/users/me

Get current user profile.

**Response (200 OK):**
```json
{
  "user": {
    "id": "usr_abc123",
    "name": "Alex Thompson",
    "email": "alex@example.com",
    "emailVerified": true,
    "image": "https://cdn.example.com/avatars/abc123.png",
    "role": "USER",
    "createdAt": "2024-10-01T08:00:00Z"
  }
}
```

---

### PATCH /api/users/me

Update user profile.

**Request:**
```json
{
  "name": "Alex Thompson",
  "image": "https://cdn.example.com/avatars/new.png"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "usr_abc123",
    "name": "Alex Thompson",
    "image": "https://cdn.example.com/avatars/new.png",
    "updatedAt": "2025-01-09T16:00:00Z"
  }
}
```

---

### GET /api/api-keys

List user's API keys.

**Response (200 OK):**
```json
{
  "apiKeys": [
    {
      "id": "key_abc123",
      "name": "Claude Desktop",
      "key": "sk_live_...xyz123",
      "lastUsedAt": "2025-01-09T14:30:00Z",
      "expiresAt": null,
      "createdAt": "2025-01-04T10:00:00Z"
    }
  ]
}
```

---

### POST /api/api-keys

Create a new API key.

**Request:**
```json
{
  "name": "VS Code Extension",
  "expiresAt": "2026-01-09T00:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "apiKey": {
    "id": "key_new123",
    "name": "VS Code Extension",
    "key": "sk_live_abc123xyz456...",
    "expiresAt": "2026-01-09T00:00:00Z",
    "createdAt": "2025-01-09T16:00:00Z"
  },
  "warning": "Save this key securely. You won't be able to see it again."
}
```

---

### DELETE /api/api-keys/:id

Revoke an API key.

**Response (200 OK):**
```json
{
  "message": "API key revoked successfully",
  "apiKeyId": "key_abc123"
}
```

---

## Rate Limiting

### Rate Limits

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `/api/search` | 100 requests | 1 minute |
| `/api/sources` (POST) | 10 requests | 1 hour |
| `/api/mcp/*` | 1000 requests | 1 hour |
| All other endpoints | 300 requests | 5 minutes |

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1704801600
```

### Rate Limit Exceeded Response

**Response (429 Too Many Requests):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please wait 60 seconds.",
    "retryAfter": 60,
    "limit": 100,
    "window": "1 minute"
  }
}
```

---

## Pagination

All list endpoints support pagination with consistent query parameters:

```
?limit=20    // Results per page (default: 20, max: 100)
&offset=0    // Offset for pagination (default: 0)
```

**Pagination Response:**
```json
{
  "data": [ ... ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 142,
    "hasMore": true
  }
}
```

---

## Webhooks (Future Feature)

*Planned for Phase 2*

### POST /api/webhooks

Register a webhook endpoint to receive events.

**Events:**
- `source.indexed` - Source indexing completed
- `source.updated` - Source re-scraped
- `source.error` - Source indexing failed
- `workspace.source.added` - Source added to workspace

---

## Summary

This API contract specification provides:

✅ **Complete REST API contracts** for all MVP features
✅ **Request/Response schemas** with TypeScript types
✅ **Authentication patterns** (JWT + API keys)
✅ **Error response formats** with standard codes
✅ **Admin endpoints** for source management
✅ **MCP integration** endpoints
✅ **Rate limiting** specifications
✅ **Pagination** patterns

**Implementation Note:** All endpoints should follow these contracts exactly. Frontend and backend teams can work in parallel using these specifications.

**OpenAPI Specification:** A complete OpenAPI 3.0 spec will be generated from these contracts for automated client generation and API documentation.
