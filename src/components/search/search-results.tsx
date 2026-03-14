// Search Results Component — Server Component
// Calls hybridSearch() server-side and renders result cards.

import { hybridSearch, type SearchResult } from "@/lib/search/hybrid-search";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface SearchResultsProps {
  query: string;
  workspaceId?: string;
  collectionId?: string;
  sourceIds?: string;
  bm25Weight?: number;
  vectorWeight?: number;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Loading skeleton (exported for use in Suspense fallback)
// ---------------------------------------------------------------------------

export function SearchResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Highlight keywords in excerpt (simple approach: wrap matches in <mark>)
// ---------------------------------------------------------------------------

function HighlightedExcerpt({
  excerpt,
  query,
}: {
  excerpt: string;
  query: string;
}) {
  if (!query.trim()) {
    return <p className="text-sm text-muted-foreground leading-relaxed">{excerpt}</p>;
  }

  // Escape special regex characters in the query words
  const words = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (words.length === 0) {
    return <p className="text-sm text-muted-foreground leading-relaxed">{excerpt}</p>;
  }

  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  const parts = excerpt.split(pattern);

  return (
    <p className="text-sm text-muted-foreground leading-relaxed">
      {parts.map((part, idx) =>
        pattern.test(part) ? (
          <mark
            key={idx}
            className="bg-yellow-200 dark:bg-yellow-800 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      )}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Source type badge colour
// ---------------------------------------------------------------------------

function sourceTypeBadgeVariant(
  type: string
): "default" | "secondary" | "outline" {
  switch (type) {
    case "WEBSITE":
      return "default";
    case "GITHUB":
      return "secondary";
    case "DOCUMENT":
      return "outline";
    default:
      return "outline";
  }
}

// ---------------------------------------------------------------------------
// Result card
// ---------------------------------------------------------------------------

function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 flex-1">
          {result.title}
        </h3>
        <span className="shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
          {result.score.toFixed(3)}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={sourceTypeBadgeVariant(result.sourceType)} className="text-xs">
          {result.sourceName}
        </Badge>
        <span className="text-xs text-muted-foreground">{result.sourceType}</span>
        {result.indexedAt && (
          <span className="text-xs text-muted-foreground">
            Indexed {result.indexedAt.toLocaleDateString()}
          </span>
        )}
      </div>

      <HighlightedExcerpt excerpt={result.excerpt} query={query} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination controls
// ---------------------------------------------------------------------------

function Pagination({
  total,
  limit,
  offset,
  query,
}: {
  total: number;
  limit: number;
  offset: number;
  query: string;
}) {
  const pageCount = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit);

  if (pageCount <= 1) return null;

  const makeHref = (page: number) => {
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("offset", String(page * limit));
    return `?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      {currentPage > 0 && (
        <Link
          href={makeHref(currentPage - 1)}
          className="text-sm px-3 py-1.5 rounded border hover:bg-accent transition-colors"
        >
          Previous
        </Link>
      )}
      <span className="text-sm text-muted-foreground">
        Page {currentPage + 1} of {pageCount}
      </span>
      {currentPage < pageCount - 1 && (
        <Link
          href={makeHref(currentPage + 1)}
          className="text-sm px-3 py-1.5 rounded border hover:bg-accent transition-colors"
        >
          Next
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component (Server Component)
// ---------------------------------------------------------------------------

export async function SearchResults({
  query,
  workspaceId,
  collectionId,
  sourceIds: sourceIdsParam,
  bm25Weight = 0.3,
  vectorWeight = 0.7,
  limit = 20,
  offset = 0,
}: SearchResultsProps) {
  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">
          Enter a search query to get started.
        </p>
      </div>
    );
  }

  const sourceIds = sourceIdsParam
    ? sourceIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const { results, total } = await hybridSearch(query, {
    workspaceId,
    collectionId,
    sourceIds,
    bm25Weight,
    vectorWeight,
    limit,
    offset,
  });

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base font-medium mb-2">No results for &ldquo;{query}&rdquo;</p>
        <p className="text-sm text-muted-foreground mb-4">
          Try different keywords, remove filters, or adjust the BM25 / vector weights.
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>Check for typos in your query</li>
          <li>Try broader or simpler terms</li>
          <li>Ensure the relevant source has been indexed</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {total} result{total !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
      </p>

      {results.map((result) => (
        <ResultCard key={result.chunkId} result={result} query={query} />
      ))}

      <Pagination total={total} limit={limit} offset={offset} query={query} />
    </div>
  );
}
