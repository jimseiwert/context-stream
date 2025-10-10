import { apiClient } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types based on API contracts
export interface Source {
  id: string;
  name?: string | null;
  url: string;
  domain: string;
  type: "WEBSITE" | "GITHUB" | "CONFLUENCE" | "CUSTOM";
  scope: "GLOBAL" | "WORKSPACE";
  status: "PENDING" | "INDEXING" | "ACTIVE" | "ERROR" | "PAUSED";
  config?: {
    maxPages?: number;
    maxDepth?: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    respectRobotsTxt?: boolean;
    userAgent?: string;
  };
  rescrapeSchedule?: "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY";
  nextScrapeAt?: string | null;
  lastAutomatedScrapeAt?: string | null;
  pageCount: number;
  lastScrapedAt?: string;
  lastUpdatedAt?: string;
  errorMessage?: string;
  estimatedStorageKB?: number;
  createdAt: string;
  updatedAt: string;
  // Optional fields for detail view
  lastScrapeJob?: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    pagesScraped: number;
    errorMessage: string | null;
  };
  pages?: Array<{
    id: string;
    url: string;
    title: string | null;
    lastScrapedAt?: string | null;
  }>;
  jobs?: Array<{
    id: string;
    type: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }>;
  scrapeJobs?: Array<{
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    pagesScraped: number;
    errorMessage: string | null;
  }>;
}

export interface CreateSourceInput {
  url: string;
  type: "WEBSITE" | "GITHUB" | "CONFLUENCE" | "CUSTOM";
  scope?: "GLOBAL" | "WORKSPACE"; // Optional - defaults to WORKSPACE
  workspaceId?: string; // Optional - API will use user's workspace if not provided
  config?: {
    maxPages?: number;
    respectRobotsTxt?: boolean;
    userAgent?: string;
  };
}

export interface UpdateSourceInput {
  name?: string;
  config?: {
    maxPages?: number;
    respectRobotsTxt?: boolean;
  };
  rescrapeSchedule?: "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY";
}

// Get all sources for a workspace
export function useSources(workspaceId?: string) {
  return useQuery({
    queryKey: ["sources", workspaceId],
    queryFn: async () => {
      const params = workspaceId ? { workspaceId } : {};
      const response = await apiClient.get<{
        sources: Source[];
        summary: {
          total: number;
          global: number;
          workspace: number;
        };
      }>("/api/sources", params);
      return response.sources;
    },
    staleTime: 60 * 1000, // Consider fresh for 1 minute
  });
}

// Get single source details
export function useSource(sourceId: string) {
  return useQuery({
    queryKey: ["sources", sourceId],
    queryFn: async () => {
      const response = await apiClient.get<{ source: Source }>(
        `/api/sources/${sourceId}`
      );
      return response.source;
    },
    enabled: !!sourceId,
  });
}

// Create a new source
export function useCreateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSourceInput) => {
      const response = await apiClient.post<{
        source?: Source;
        jobId?: string;
        isGlobal?: boolean;
        message?: string;
        estimatedTime?: string;
      }>("/api/sources", data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });

      if (data.isGlobal || data.source?.scope === "GLOBAL") {
        toast.success(
          data.message || "Global source added to workspace instantly!"
        );
      } else {
        toast.success("Source created! Indexing started.");
      }
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to create source";
      toast.error(message);
    },
  });
}

// Update source settings
export function useUpdateSource(sourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSourceInput) => {
      const response = await apiClient.put<{ source: Source }>(
        `/api/sources/${sourceId}`,
        data
      );
      return response.source;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["sources", sourceId] });
      toast.success("Source updated successfully");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to update source";
      toast.error(message);
    },
  });
}

// Delete source
export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const response = await apiClient.delete<{ message: string }>(
        `/api/sources/${sourceId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Source deleted successfully");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to delete source";
      toast.error(message);
    },
  });
}

// Trigger manual re-scraping
export function useRescrapeSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      fullReindex = false,
    }: {
      sourceId: string;
      fullReindex?: boolean;
    }) => {
      const response = await apiClient.post<{
        jobId: string;
        estimatedTime: string;
        message: string;
      }>(`/api/sources/${sourceId}/scrape`, { fullReindex });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success(data.message || "Re-scraping started");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to start re-scraping";
      toast.error(message);
    },
  });
}

// Admin: Trigger manual re-scraping (including global sources)
export function useAdminRescrapeSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      fullReindex = false,
    }: {
      sourceId: string;
      fullReindex?: boolean;
    }) => {
      const response = await apiClient.post<{
        jobId: string;
        estimatedTime: string;
        message: string;
        scope: string;
      }>(`/api/admin/sources/${sourceId}/scrape`, { fullReindex });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success(data.message || "Re-scraping started");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to start re-scraping";
      toast.error(message);
    },
  });
}
