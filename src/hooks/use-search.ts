import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

export interface SearchResult {
  id: string
  title?: string
  url: string
  snippet: string
  source: {
    id: string
    name: string
    url: string
    scope: "GLOBAL" | "WORKSPACE"
  }
  score: number
  scoreBreakdown?: {
    textScore: number
    vectorScore: number
    baseScore: number
    rerankedScore: number
    signals: {
      frameworkMatch: number
      proximityMatch: number
      titleMatch: number
      codeQuality: number
      recency: number
      userFeedback: number
    }
    totalMultiplier: number
    normalizedScore: number
  }
}

export interface SearchFilters {
  sourceIds?: string[]
  dateRange?: {
    start: string
    end: string
  }
}

export function useSearch(workspaceId?: string) {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<SearchFilters>({})

  const searchQuery = useQuery({
    queryKey: ["search", workspaceId, query, filters],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return { results: [], total: 0 }
      }

      try {
        const response = await apiClient.post<{
          results: SearchResult[]
          total: number
          latencyMs: number
        }>("/api/search", {
          query,
          ...(workspaceId && { workspaceId }),
          filters,
          limit: 50,
          offset: 0,
        })

        return response
      } catch (error: any) {
        toast.error(error.message || "Search failed")
        throw error
      }
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
  })

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [])

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  return {
    query,
    setQuery,
    filters,
    updateFilters,
    clearFilters,
    search,
    results: searchQuery.data?.results || [],
    total: searchQuery.data?.total || 0,
    isLoading: searchQuery.isLoading,
    isError: searchQuery.isError,
    error: searchQuery.error,
  }
}

// Hook for search suggestions
export function useSearchSuggestions(query: string, workspaceId: string) {
  return useQuery({
    queryKey: ["search-suggestions", query, workspaceId],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return []
      }

      try {
        const response = await apiClient.get<{
          suggestions: Array<{
            text: string
            type: "popular_query" | "page_title"
            count?: number
            pageId?: string
          }>
        }>("/api/search/suggestions", {
          query,
          workspaceId,
          limit: 10,
        })

        return response.suggestions
      } catch (error) {
        // Don't show error for suggestions
        return []
      }
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000, // Cache for 1 minute
  })
}