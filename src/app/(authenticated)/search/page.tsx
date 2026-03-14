// Search Page — Server Component
// URL-based search state: reads ?q= and other params from searchParams.

import { Suspense } from "react";
import { db } from "@/lib/db";
import { sources, workspaceSources, collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { SearchBar } from "@/components/search/search-bar";
import { SearchFilters } from "@/components/search/search-filters";
import {
  SearchResults,
  SearchResultsSkeleton,
} from "@/components/search/search-results";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    workspaceId?: string;
    collectionId?: string;
    sourceIds?: string;
    bm25Weight?: string;
    vectorWeight?: string;
    limit?: string;
    offset?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  // Resolve searchParams (Next.js 15 async searchParams)
  const params = await searchParams;

  const query = params.q ?? "";
  const workspaceId = params.workspaceId;
  const collectionId = params.collectionId;
  const sourceIdsParam = params.sourceIds;
  const bm25Weight = parseFloat(params.bm25Weight ?? "0.3");
  const vectorWeight = parseFloat(params.vectorWeight ?? "0.7");
  const limit = Math.min(parseInt(params.limit ?? "20", 10), 100);
  const offset = parseInt(params.offset ?? "0", 10);

  // Fetch sources for filter sidebar
  // Show workspace sources or all sources the user can see
  const [sourceRows, collectionRows] = await Promise.all([
    workspaceId
      ? db
          .select({ id: sources.id, name: sources.name, domain: sources.domain })
          .from(workspaceSources)
          .innerJoin(sources, eq(sources.id, workspaceSources.sourceId))
          .where(eq(workspaceSources.workspaceId, workspaceId))
      : db
          .select({ id: sources.id, name: sources.name, domain: sources.domain })
          .from(sources)
          .limit(50),
    workspaceId
      ? db
          .select({ id: collections.id, name: collections.name })
          .from(collections)
          .where(eq(collections.workspaceId, workspaceId))
      : Promise.resolve([]),
  ]);

  const sourceOptions = sourceRows.map((s) => ({
    id: s.id,
    name: s.name ?? s.domain,
  }));

  const collectionOptions = collectionRows.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hybrid BM25 + vector search across your indexed knowledge base.
        </p>
      </div>

      {/* Search bar — full width */}
      <SearchBar className="w-full" />

      {/* Body: filters sidebar + results */}
      <div className="flex gap-6">
        {/* Sidebar filters */}
        <div className="w-56 shrink-0">
          <SearchFilters
            sources={sourceOptions}
            collections={collectionOptions}
          />
        </div>

        {/* Results area */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchResults
              query={query}
              workspaceId={workspaceId}
              collectionId={collectionId}
              sourceIds={sourceIdsParam}
              bm25Weight={isNaN(bm25Weight) ? 0.3 : bm25Weight}
              vectorWeight={isNaN(vectorWeight) ? 0.7 : vectorWeight}
              limit={isNaN(limit) ? 20 : limit}
              offset={isNaN(offset) ? 0 : offset}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
