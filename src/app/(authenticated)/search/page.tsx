"use client";

export const dynamic = "force-dynamic";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearch } from "@/hooks/use-search";
import {
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [expandedScores, setExpandedScores] = useState<Set<string>>(new Set());

  const {
    results,
    isLoading,
    isError,
    search,
    filters,
    updateFilters,
    clearFilters,
  } = useSearch();

  const toggleScoreBreakdown = (resultId: string) => {
    setExpandedScores((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  // Auto-search when page loads with query param
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      search(initialQuery);
    }
  }, []); // Only run on mount

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      search(query);
    }
  };

  const handleFilterSource = (sourceId: string) => {
    if (filters.sourceIds?.includes(sourceId)) {
      updateFilters({
        sourceIds: filters.sourceIds.filter((id) => id !== sourceId),
      });
    } else {
      updateFilters({
        sourceIds: [...(filters.sourceIds || []), sourceId],
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Search Documentation</h1>
        <p className="text-muted-foreground">
          Search across all your indexed documentation sources
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search-query"
            name="query"
            type="search"
            placeholder="Search documentation... (e.g., 'useState hook', 'API authentication')"
            className="pl-12 pr-4 h-12 text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </form>

      {/* Active Filters */}
      {filters.sourceIds && filters.sourceIds.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
          <div className="flex flex-wrap gap-2">
            {filters.sourceIds.map((id) => (
              <Badge key={id} variant="secondary" className="gap-1">
                Source: {id}
                <button
                  onClick={() => handleFilterSource(id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Search Results */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Results List */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : results.length === 0 && query ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No documentation matches "{query}". Try different keywords or
                  check your spelling.
                </p>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Search tips:</p>
                  <ul className="list-disc list-inside text-left space-y-1">
                    <li>Use specific technical terms</li>
                    <li>Try different variations of your query</li>
                    <li>Check if the source has been indexed</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : results.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Found {results.length} results for "{query}"
              </div>
              {results.map((result) => (
                <Card
                  key={result.id}
                  className="hover:shadow-md transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-xl">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors flex items-center gap-2"
                          >
                            {result.title || "Untitled Page"}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {result.url}
                        </CardDescription>
                      </div>
                      {result.score !== undefined && (
                        <Badge variant="outline" className="ml-2">
                          {Math.round(result.score)}% match
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p
                      className="text-sm text-muted-foreground line-clamp-3"
                      dangerouslySetInnerHTML={{
                        __html: result.snippet,
                      }}
                    />
                    <div className="flex items-center gap-4 mt-4">
                      <button
                        onClick={() => handleFilterSource(result.source.id)}
                        className="inline-flex items-center gap-1 text-xs hover:text-primary transition-colors"
                      >
                        {result.source.scope === "GLOBAL" ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <Database className="h-3 w-3" />
                        )}
                        <span>{result.source.name}</span>
                      </button>
                    </div>

                    {/* Score Breakdown */}
                    {result.scoreBreakdown && (
                      <div className="mt-4">
                        <button
                          onClick={() => toggleScoreBreakdown(result.id)}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          {expandedScores.has(result.id) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span>
                            {expandedScores.has(result.id)
                              ? "Hide score details"
                              : "Show score details"}
                          </span>
                        </button>

                        {expandedScores.has(result.id) && (
                          <div className="mt-3 text-xs bg-muted/50 rounded-md p-3 space-y-2">
                            <div className="font-medium mb-2">Score Breakdown</div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-muted-foreground">Text Match:</span>
                                <span className="ml-2 font-mono">
                                  {result.scoreBreakdown.textScore.toFixed(4)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Vector Match:</span>
                                <span className="ml-2 font-mono">
                                  {result.scoreBreakdown.vectorScore.toFixed(4)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Base Score:</span>
                                <span className="ml-2 font-mono">
                                  {result.scoreBreakdown.baseScore.toFixed(4)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Reranked:</span>
                                <span className="ml-2 font-mono">
                                  {result.scoreBreakdown.rerankedScore.toFixed(4)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="font-medium mb-2">Reranking Signals</div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(result.scoreBreakdown.signals).map(
                                  ([key, value]) => (
                                    <div key={key}>
                                      <span className="text-muted-foreground capitalize">
                                        {key.replace(/([A-Z])/g, " $1").trim()}:
                                      </span>
                                      <span
                                        className={`ml-2 font-mono ${
                                          value > 1.0
                                            ? "text-green-600 dark:text-green-400"
                                            : ""
                                        }`}
                                      >
                                        {value.toFixed(2)}x
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border">
                              <div>
                                <span className="text-muted-foreground">Total Multiplier:</span>
                                <span className="ml-2 font-mono font-medium">
                                  {result.scoreBreakdown.totalMultiplier.toFixed(4)}x
                                </span>
                              </div>
                              <div className="mt-1">
                                <span className="text-muted-foreground">Final Score:</span>
                                <span className="ml-2 font-mono font-medium">
                                  {Math.round(result.scoreBreakdown.normalizedScore)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Searching</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Enter a search query above to find information across all your
                  indexed documentation sources.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Quick Stats */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Search Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Results</span>
                  <span className="font-medium">{results.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sources</span>
                  <span className="font-medium">
                    {new Set(results.map((r) => r.source.name)).size}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Popular Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Popular Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  "useState hook",
                  "API authentication",
                  "React components",
                  "Python decorators",
                  "Docker compose",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setQuery(suggestion);
                      search(suggestion);
                    }}
                    className="block w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
