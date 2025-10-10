# ContextStream Frontend Specification

**Version:** 1.0
**Last Updated:** 2025-01-09
**Target Stack:** Next.js 14+ (App Router), React 18+, Tailwind CSS 3+, shadcn/ui
**Architecture:** Server Components + Client Components with TanStack Query

---

## Table of Contents

1. [Overview](#overview)
2. [Application Architecture](#application-architecture)
3. [Routing Structure](#routing-structure)
4. [Component Hierarchy](#component-hierarchy)
5. [State Management](#state-management)
6. [Page Specifications](#page-specifications)
7. [Component Library](#component-library)
8. [Forms & Validation](#forms--validation)
9. [Real-time Updates](#real-time-updates)
10. [Responsive Design](#responsive-design)
11. [Accessibility](#accessibility)
12. [Performance Optimization](#performance-optimization)

---

## Overview

ContextStream's frontend is built with Next.js 14+ App Router, leveraging:
- **Server Components** for initial page loads and SEO
- **Client Components** for interactive features
- **Server Actions** for form submissions
- **TanStack Query** for client-side data fetching and caching
- **shadcn/ui** for consistent, accessible component library
- **Tailwind CSS** for styling with dark mode support

### Design Principles

1. **Developer-First UX**: Keyboard-driven, fast, minimal friction
2. **Dark Mode Native**: Optimized for developers working in dark environments
3. **Performance**: Fast page loads (<1s), instant interactions
4. **Accessibility**: WCAG AA compliant, keyboard navigable
5. **Responsive**: Mobile-friendly (320px+), tablet-optimized (768px+), desktop-first (1024px+)

---

## Application Architecture

### App Router Structure

```
src/app/
├── layout.tsx                   # Root layout
├── page.tsx                     # Landing page
├── globals.css                  # Global styles
│
├── (auth)/                      # Auth route group (no dashboard layout)
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── verify-email/
│       └── page.tsx
│
├── (dashboard)/                 # Protected dashboard routes
│   ├── layout.tsx               # Dashboard layout (header + sidebar)
│   ├── page.tsx                 # Dashboard home
│   │
│   ├── sources/                 # Source management
│   │   ├── page.tsx             # Sources list
│   │   ├── [id]/
│   │   │   ├── page.tsx         # Source detail
│   │   │   └── edit/
│   │   │       └── page.tsx     # Edit source settings
│   │   └── new/
│   │       └── page.tsx         # Add new source
│   │
│   ├── search/                  # Search interface
│   │   ├── page.tsx             # Search page
│   │   └── [pageId]/
│   │       └── page.tsx         # Search result detail
│   │
│   ├── workspaces/              # Workspace management
│   │   ├── page.tsx             # Workspaces list
│   │   └── [id]/
│   │       └── page.tsx         # Workspace detail
│   │
│   ├── settings/                # User settings
│   │   ├── page.tsx             # Profile settings
│   │   ├── api-keys/
│   │   │   └── page.tsx         # API key management
│   │   ├── preferences/
│   │   │   └── page.tsx         # User preferences
│   │   └── workspaces/
│   │       └── page.tsx         # Workspace settings
│   │
│   └── admin/                   # Admin routes (permission-gated)
│       ├── layout.tsx           # Admin layout
│       ├── page.tsx             # Admin dashboard
│       ├── sources/
│       │   ├── page.tsx         # Admin sources management
│       │   └── [id]/
│       │       └── page.tsx     # Admin source detail
│       ├── users/
│       │   └── page.tsx         # User management
│       └── stats/
│           └── page.tsx         # System statistics
│
└── api/                         # API routes (see backend-spec.md)
```

### Component Structure

```
src/components/
├── ui/                          # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── badge.tsx
│   ├── toast.tsx
│   ├── dropdown-menu.tsx
│   ├── select.tsx
│   ├── progress.tsx
│   ├── skeleton.tsx
│   └── ...
│
├── layout/                      # Layout components
│   ├── header.tsx               # Main header
│   ├── sidebar.tsx              # Sidebar navigation
│   ├── footer.tsx               # Footer (optional)
│   ├── theme-provider.tsx       # Dark mode provider
│   └── mobile-nav.tsx           # Mobile navigation
│
├── sources/                     # Source-related components
│   ├── source-card.tsx          # Source list card
│   ├── source-form.tsx          # Add/edit source form
│   ├── source-list.tsx          # Source list container
│   ├── source-detail.tsx        # Source detail view
│   ├── source-stats.tsx         # Source statistics
│   ├── indexing-progress.tsx   # Real-time indexing progress
│   └── source-actions.tsx       # Source action menu
│
├── search/                      # Search components
│   ├── search-bar.tsx           # Global search input
│   ├── search-results.tsx       # Search results list
│   ├── search-result-card.tsx   # Individual result
│   ├── search-filters.tsx       # Filter sidebar
│   ├── search-suggestions.tsx   # Autocomplete suggestions
│   └── search-empty-state.tsx   # No results state
│
├── dashboard/                   # Dashboard components
│   ├── stats-cards.tsx          # Overview statistics
│   ├── recent-sources.tsx       # Recent sources widget
│   ├── activity-feed.tsx        # Recent activity
│   └── quick-actions.tsx        # Quick action buttons
│
├── admin/                       # Admin components
│   ├── admin-source-list.tsx    # Admin source management table
│   ├── promotion-modal.tsx      # Source promotion modal
│   ├── demotion-modal.tsx       # Source demotion modal
│   ├── usage-stats-chart.tsx    # Usage analytics chart
│   └── workspaces-list.tsx      # Workspaces using source
│
├── workspaces/                  # Workspace components
│   ├── workspace-card.tsx
│   ├── workspace-form.tsx
│   └── workspace-switcher.tsx
│
├── settings/                    # Settings components
│   ├── profile-form.tsx
│   ├── api-key-list.tsx
│   ├── api-key-create-modal.tsx
│   └── preferences-form.tsx
│
├── jobs/                        # Job status components
│   ├── job-status-badge.tsx
│   ├── job-progress.tsx
│   └── job-list.tsx
│
└── providers/                   # Context providers
    ├── query-provider.tsx       # TanStack Query provider
    ├── auth-provider.tsx        # Auth context
    └── toast-provider.tsx       # Toast notifications
```

---

## Routing Structure

### Public Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `app/page.tsx` | Landing page |
| `/login` | `app/(auth)/login/page.tsx` | Login page |
| `/register` | `app/(auth)/register/page.tsx` | Registration |

### Protected Routes (Authenticated)

| Path | Component | Description | Role |
|------|-----------|-------------|------|
| `/dashboard` | `app/(dashboard)/page.tsx` | Dashboard home | USER+ |
| `/sources` | `app/(dashboard)/sources/page.tsx` | Sources list | USER+ |
| `/sources/new` | `app/(dashboard)/sources/new/page.tsx` | Add source | USER+ |
| `/sources/[id]` | `app/(dashboard)/sources/[id]/page.tsx` | Source detail | USER+ |
| `/sources/[id]/edit` | `app/(dashboard)/sources/[id]/edit/page.tsx` | Edit source | USER+ |
| `/search` | `app/(dashboard)/search/page.tsx` | Search interface | USER+ |
| `/workspaces` | `app/(dashboard)/workspaces/page.tsx` | Workspaces | USER+ |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Profile settings | USER+ |
| `/settings/api-keys` | `app/(dashboard)/settings/api-keys/page.tsx` | API keys | USER+ |

### Admin Routes (ADMIN or SUPER_ADMIN)

| Path | Component | Description | Role |
|------|-----------|-------------|------|
| `/admin` | `app/(dashboard)/admin/page.tsx` | Admin dashboard | ADMIN+ |
| `/admin/sources` | `app/(dashboard)/admin/sources/page.tsx` | Source management | ADMIN+ |
| `/admin/sources/[id]` | `app/(dashboard)/admin/sources/[id]/page.tsx` | Source detail | ADMIN+ |
| `/admin/users` | `app/(dashboard)/admin/users/page.tsx` | User management | SUPER_ADMIN |
| `/admin/stats` | `app/(dashboard)/admin/stats/page.tsx` | System stats | ADMIN+ |

---

## Component Hierarchy

### Dashboard Page Component Tree

```
DashboardPage (Server Component)
├── DashboardHeader
│   ├── PageTitle
│   └── AddSourceButton
├── StatsCards (Server Component)
│   ├── StatCard (Total Sources)
│   ├── StatCard (Total Pages)
│   ├── StatCard (Storage Used)
│   └── StatCard (Recent Queries)
├── RecentSources (Server Component)
│   ├── SectionHeader
│   └── SourceCard[] (Client Component)
│       ├── SourceInfo
│       ├── SourceStats
│       ├── StatusBadge
│       └── SourceActions
├── ActivityFeed (Server Component)
│   ├── SectionHeader
│   └── ActivityItem[]
│       ├── ActivityIcon
│       ├── ActivityDescription
│       └── ActivityTimestamp
└── QuickActions
    ├── SearchButton
    ├── AddSourceButton
    └── ViewAllSourcesButton
```

### Source List Page Component Tree

```
SourcesPage (Server Component)
├── PageHeader
│   ├── PageTitle
│   ├── SearchInput (Client)
│   └── AddSourceButton
├── FilterBar (Client Component)
│   ├── StatusFilter
│   ├── TypeFilter
│   └── SortSelect
├── SourceList (Client Component)
│   ├── SourceCard[] (Client Component)
│   │   ├── SourceHeader
│   │   │   ├── SourceIcon
│   │   │   ├── SourceName
│   │   │   └── ScopeBadge
│   │   ├── SourceStats
│   │   │   ├── PageCount
│   │   │   ├── StorageSize
│   │   │   └── LastUpdated
│   │   ├── StatusIndicator
│   │   └── SourceActions
│   │       └── DropdownMenu
│   └── Pagination
└── EmptyState (if no sources)
    ├── EmptyIcon
    ├── EmptyMessage
    └── AddSourceCTA
```

### Search Page Component Tree

```
SearchPage (Server Component)
├── SearchBar (Client Component)
│   ├── SearchInput
│   ├── SearchButton
│   └── SearchSuggestions
├── SearchFilters (Client Component)
│   ├── SourceFilter
│   ├── TypeFilter
│   ├── DateRangeFilter
│   └── SortSelect
├── SearchResults (Client Component)
│   ├── ResultsHeader
│   │   ├── ResultCount
│   │   ├── SearchTime
│   │   └── ClearFiltersButton
│   ├── SearchResultCard[]
│   │   ├── ResultTitle
│   │   ├── ResultURL
│   │   ├── ResultSnippet
│   │   ├── SourceBadge
│   │   └── RelevanceScore (optional)
│   └── Pagination
└── EmptyState (if no results)
    ├── NoResultsIcon
    ├── NoResultsMessage
    └── SearchTips
```

---

## State Management

### Server vs Client Components

**Server Components (Default):**
- Page layouts and shells
- Initial data fetching
- Static content
- Dashboard statistics (cached)
- Source lists (initial load)

**Client Components (use 'use client'):**
- Forms with validation
- Real-time progress indicators
- Search input with autocomplete
- Modals and dialogs
- Dropdown menus and tooltips
- Data tables with sorting/filtering

### TanStack Query for Client State

```typescript
// src/hooks/use-sources.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useSources(workspaceId: string) {
  return useQuery({
    queryKey: ['sources', workspaceId],
    queryFn: () => apiClient.get(`/api/sources?workspaceId=${workspaceId}`),
    staleTime: 60000, // Consider fresh for 1 minute
  })
}

export function useSource(sourceId: string) {
  return useQuery({
    queryKey: ['sources', sourceId],
    queryFn: () => apiClient.get(`/api/sources/${sourceId}`),
  })
}

export function useCreateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSourceInput) =>
      apiClient.post('/api/sources', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })
}

export function useUpdateSource(sourceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSourceInput) =>
      apiClient.patch(`/api/sources/${sourceId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['sources', sourceId] })
    },
  })
}

export function useDeleteSource(sourceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.delete(`/api/sources/${sourceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })
}
```

### Search State Hook

```typescript
// src/hooks/use-search.ts

import { useQuery } from '@tanstack/react-query'
import { useState, useCallback, useMemo } from 'react'
import { useDebounce } from './use-debounce'

export function useSearch(workspaceId: string) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    sourceIds: [],
    dateRange: null,
  })

  const debouncedQuery = useDebounce(query, 300)

  const searchResults = useQuery({
    queryKey: ['search', workspaceId, debouncedQuery, filters],
    queryFn: () =>
      apiClient.post('/api/search', {
        query: debouncedQuery,
        workspaceId,
        filters,
      }),
    enabled: debouncedQuery.length >= 2,
  })

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  return {
    query,
    setQuery,
    filters,
    updateFilters,
    results: searchResults.data?.results || [],
    isLoading: searchResults.isLoading,
    error: searchResults.error,
  }
}
```

### Job Status Hook (Real-time)

```typescript
// src/hooks/use-job-status.ts

import { useQuery } from '@tanstack/react-query'

export function useJobStatus(jobId: string) {
  return useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => apiClient.get(`/api/jobs/${jobId}`),
    refetchInterval: (data) => {
      // Poll every 2 seconds while job is running
      if (data?.status === 'RUNNING' || data?.status === 'PENDING') {
        return 2000
      }
      return false // Stop polling when complete
    },
    enabled: !!jobId,
  })
}
```

---

## Page Specifications

### Dashboard Page

**Path:** `/dashboard`
**Type:** Server Component

```typescript
// src/app/(dashboard)/page.tsx

import { Suspense } from 'react'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentSources } from '@/components/dashboard/recent-sources'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { Skeleton } from '@/components/ui/skeleton'

export default async function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your indexed documentation
          </p>
        </div>
        <QuickActions />
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Suspense fallback={<RecentSourcesSkeleton />}>
          <RecentSources />
        </Suspense>

        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeed />
        </Suspense>
      </div>
    </div>
  )
}
```

### Sources List Page

**Path:** `/sources`
**Type:** Server Component with Client interactions

```typescript
// src/app/(dashboard)/sources/page.tsx

import { Suspense } from 'react'
import { SourceList } from '@/components/sources/source-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string }
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation Sources</h1>
          <p className="text-muted-foreground">
            Manage your indexed documentation sources
          </p>
        </div>
        <Link href="/sources/new">
          <Button>
            <Plus className="size-5 mr-2" />
            Add Source
          </Button>
        </Link>
      </div>

      <Suspense fallback={<SourceListSkeleton />}>
        <SourceList filters={searchParams} />
      </Suspense>
    </div>
  )
}
```

### Add Source Page

**Path:** `/sources/new`
**Type:** Client Component (Form)

```typescript
// src/app/(dashboard)/sources/new/page.tsx

'use client'

import { SourceForm } from '@/components/sources/source-form'
import { useRouter } from 'next/navigation'
import { useCreateSource } from '@/hooks/use-sources'
import { toast } from 'sonner'

export default function AddSourcePage() {
  const router = useRouter()
  const createSource = useCreateSource()

  const handleSubmit = async (data: CreateSourceInput) => {
    try {
      const result = await createSource.mutateAsync(data)

      if (result.isGlobal) {
        toast.success('Global source added to workspace instantly!')
        router.push(`/sources/${result.source.id}`)
      } else {
        toast.success('Source created! Indexing started.')
        router.push(`/sources/${result.source.id}?job=${result.jobId}`)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Documentation Source</h1>
        <p className="text-muted-foreground">
          Index a new documentation website or GitHub repository
        </p>
      </div>

      <SourceForm onSubmit={handleSubmit} isLoading={createSource.isLoading} />
    </div>
  )
}
```

### Search Page

**Path:** `/search`
**Type:** Client Component

```typescript
// src/app/(dashboard)/search/page.tsx

'use client'

import { SearchBar } from '@/components/search/search-bar'
import { SearchFilters } from '@/components/search/search-filters'
import { SearchResults } from '@/components/search/search-results'
import { useSearch } from '@/hooks/use-search'
import { useWorkspace } from '@/hooks/use-workspace'

export default function SearchPage() {
  const { currentWorkspace } = useWorkspace()
  const {
    query,
    setQuery,
    filters,
    updateFilters,
    results,
    isLoading,
  } = useSearch(currentWorkspace.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search Documentation</h1>
        <p className="text-muted-foreground">
          Search across all indexed documentation sources
        </p>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search documentation..."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <SearchFilters filters={filters} onUpdateFilters={updateFilters} />
        </aside>

        <main className="lg:col-span-3">
          <SearchResults results={results} isLoading={isLoading} />
        </main>
      </div>
    </div>
  )
}
```

### Admin Sources Page

**Path:** `/admin/sources`
**Type:** Server Component with Client table

```typescript
// src/app/(dashboard)/admin/sources/page.tsx

import { AdminSourceList } from '@/components/admin/admin-source-list'
import { requirePermission } from '@/lib/auth/middleware'
import { Permission } from '@/lib/auth/permissions'

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: { scope?: string; minWorkspaces?: string }
}) {
  await requirePermission(Permission.VIEW_ADMIN_DASHBOARD)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Source Management</h1>
        <p className="text-muted-foreground">
          Manage global and workspace sources
        </p>
      </div>

      <AdminSourceList filters={searchParams} />
    </div>
  )
}
```

---

## Component Library

### Key UI Components (shadcn/ui)

**Button Component**
```typescript
// src/components/ui/button.tsx
// Variants: default, secondary, ghost, destructive, outline
// Sizes: sm, default, lg
```

**Card Component**
```typescript
// src/components/ui/card.tsx
// Sub-components: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
```

**Dialog/Modal Component**
```typescript
// src/components/ui/dialog.tsx
// Accessible modal with keyboard navigation
```

**Badge Component**
```typescript
// src/components/ui/badge.tsx
// Variants: default, success, warning, error, info
```

### Custom Components

**SourceCard Component**

```typescript
// src/components/sources/source-card.tsx

'use client'

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreVertical, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { Source } from '@/types/models'

interface SourceCardProps {
  source: Source & {
    _count: { pages: number }
    workspaceSources: { addedAt: Date }[]
  }
  onUpdate?: () => void
  onDelete?: () => void
}

export function SourceCard({ source, onUpdate, onDelete }: SourceCardProps) {
  const statusColor = {
    ACTIVE: 'success',
    INDEXING: 'info',
    ERROR: 'error',
    PENDING: 'warning',
    PAUSED: 'secondary',
  }

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl">
            <Link
              href={`/sources/${source.id}`}
              className="hover:text-primary transition-colors"
            >
              {source.domain}
            </Link>
          </CardTitle>
          <div className="flex items-center gap-2">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:underline"
            >
              {source.url}
            </a>
            {source.scope === 'GLOBAL' && (
              <Badge variant="default">Global</Badge>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onUpdate}>
              <RefreshCw className="size-4 mr-2" />
              Update Now
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/sources/${source.id}/edit`}>Edit Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive"
            >
              Delete Source
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Pages</div>
            <div className="text-2xl font-semibold">
              {source._count.pages.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Last Updated</div>
            <div className="text-sm">
              {source.lastScrapedAt
                ? new Date(source.lastScrapedAt).toLocaleDateString()
                : 'Never'}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center">
        <Badge variant={statusColor[source.status]}>{source.status}</Badge>
        <span className="text-xs text-muted-foreground">
          Added {new Date(source.workspaceSources[0]?.addedAt).toLocaleDateString()}
        </span>
      </CardFooter>
    </Card>
  )
}
```

**IndexingProgress Component**

```typescript
// src/components/sources/indexing-progress.tsx

'use client'

import { Progress } from '@/components/ui/progress'
import { useJobStatus } from '@/hooks/use-job-status'
import { Loader2 } from 'lucide-react'

interface IndexingProgressProps {
  jobId: string
  sourceId: string
}

export function IndexingProgress({ jobId, sourceId }: IndexingProgressProps) {
  const { data: job, isLoading } = useJobStatus(jobId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  const progress = job?.progress || {}
  const percentage = progress.total
    ? Math.floor((progress.pagesScraped / progress.total) * 100)
    : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Indexing {job?.source?.domain}...</span>
        <span className="text-muted-foreground">
          {progress.pagesScraped || 0} / {progress.total || '~'} pages ({percentage}%)
        </span>
      </div>

      <Progress value={percentage} className="h-2" />

      {progress.currentPage && (
        <div className="text-xs text-muted-foreground">
          Current: {progress.currentPage}
        </div>
      )}
    </div>
  )
}
```

---

## Forms & Validation

### Form Pattern with React Hook Form + Zod

```typescript
// src/components/sources/source-form.tsx

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const sourceSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  type: z.enum(['WEBSITE', 'GITHUB', 'CONFLUENCE', 'CUSTOM']),
  workspaceId: z.string().uuid(),
  config: z.object({
    maxPages: z.number().int().positive().optional(),
    respectRobotsTxt: z.boolean().default(true),
  }).optional(),
})

type SourceFormData = z.infer<typeof sourceSchema>

export function SourceForm({
  onSubmit,
  isLoading,
  defaultValues,
}: {
  onSubmit: (data: SourceFormData) => void
  isLoading: boolean
  defaultValues?: Partial<SourceFormData>
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SourceFormData>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      type: 'WEBSITE',
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="url">Documentation URL *</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://docs.python.org"
          {...register('url')}
          aria-invalid={!!errors.url}
          aria-describedby={errors.url ? 'url-error' : undefined}
        />
        {errors.url && (
          <p id="url-error" className="text-sm text-destructive">
            {errors.url.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Enter the base URL of the documentation site
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Source Type *</Label>
        <Select
          defaultValue="WEBSITE"
          onValueChange={(value) => {
            register('type').onChange({ target: { value } })
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WEBSITE">Website</SelectItem>
            <SelectItem value="GITHUB">GitHub Repository</SelectItem>
            <SelectItem value="CONFLUENCE">Confluence Space</SelectItem>
            <SelectItem value="CUSTOM">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Add Source'}
        </Button>
        <Button type="button" variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  )
}
```

---

## Real-time Updates

### Server-Sent Events for Job Progress

```typescript
// src/hooks/use-job-stream.ts

import { useEffect, useState } from 'react'

export function useJobStream(jobId: string) {
  const [progress, setProgress] = useState<any>(null)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgress(data)

      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        setIsComplete(true)
        eventSource.close()
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [jobId])

  return { progress, isComplete }
}
```

---

## Responsive Design

### Breakpoints (Tailwind)

- **Mobile**: 320px - 639px (default, no prefix)
- **Small**: 640px+ (`sm:`)
- **Medium**: 768px+ (`md:`)
- **Large**: 1024px+ (`lg:`)
- **Extra Large**: 1280px+ (`xl:`)
- **2XL**: 1536px+ (`2xl:`)

### Responsive Patterns

**Grid Layout:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>
```

**Hide on Mobile:**
```tsx
<div className="hidden lg:block">
  {/* Desktop only */}
</div>
```

**Mobile Navigation:**
```tsx
<nav className="lg:hidden">
  {/* Mobile nav */}
</nav>
```

---

## Accessibility

### WCAG AA Compliance

**Keyboard Navigation:**
- All interactive elements accessible via Tab
- Focus visible (3px ring)
- Skip links for main content
- Modal focus trapping

**Screen Reader Support:**
- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- ARIA labels for icon buttons
- `aria-describedby` for error messages
- `aria-live` for dynamic content updates

**Color Contrast:**
- Text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

---

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for heavy components
const AdminDashboard = dynamic(() => import('@/components/admin/dashboard'), {
  loading: () => <Skeleton className="h-64" />,
})
```

### Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/images/hero.png"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For above-the-fold images
/>
```

### Font Optimization

```typescript
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
```

---

## Summary

This frontend specification provides:

✅ **Complete App Router Structure** with route groups
✅ **Component Hierarchy** for all major pages
✅ **State Management** with TanStack Query
✅ **Page Specifications** with code examples
✅ **Form Patterns** with validation
✅ **Real-time Updates** with SSE and polling
✅ **Responsive Design** patterns
✅ **Accessibility** guidelines
✅ **Performance** optimization strategies

**Implementation Estimate:** 4-6 weeks with 2 frontend engineers
