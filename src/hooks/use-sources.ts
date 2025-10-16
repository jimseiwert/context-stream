import { apiClient } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types based on API contracts
export interface Source {
  id: string;
  name?: string | null;
  url: string;
  domain: string;
  logo?: string | null;
  type: "WEBSITE" | "GITHUB" | "DOCUMENT";
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
  workspaceCount?: number;
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
  type: "WEBSITE" | "GITHUB" | "DOCUMENT";
  scope?: "GLOBAL" | "WORKSPACE"; // Optional - defaults to WORKSPACE
  workspaceId?: string; // Optional - API will use user's workspace if not provided
  rescrapeSchedule?: "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY";
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
export function useSources(workspaceId?: string, limit?: number) {
  return useQuery({
    queryKey: ["sources", workspaceId, limit],
    queryFn: async () => {
      const params: any = workspaceId ? { workspaceId } : {};
      if (limit) {
        params.limit = limit;
      }
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

// Get ALL sources for admin (no pagination)
export function useAdminSources() {
  return useQuery({
    queryKey: ["admin-sources"],
    queryFn: async () => {
      const response = await apiClient.get<{
        sources: Source[];
        summary: {
          total: number;
          global: number;
          workspace: number;
        };
      }>("/api/admin/sources");
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
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });

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
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      toast.success(data.message || "Re-scraping started");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to start re-scraping";
      toast.error(message);
    },
  });
}

// Admin: Delete source (including global sources)
export function useAdminDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const response = await apiClient.delete<{
        message: string;
        details: {
          id: string;
          url: string;
          name?: string | null;
          scope: string;
          status: string;
          pagesDeleted: number;
          workspacesAffected: number;
          jobsDeleted: number;
        };
      }>(`/api/admin/sources/${sourceId}`);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      toast.success(
        `Source deleted: ${data.details.pagesDeleted} pages, ${data.details.workspacesAffected} workspaces affected`
      );
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to delete source";
      toast.error(message);
    },
  });
}

// Cancel running job
export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/api/sources/${sourceId}/jobs`);
      return response;
    },
    onSuccess: (data, sourceId) => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["sources", sourceId] });
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      queryClient.invalidateQueries({ queryKey: ["job-status", sourceId] });
      toast.success(data.message || "Job cancelled successfully");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to cancel job";
      toast.error(message);
    },
  });
}

// Browse global sources (for discovery)
export interface GlobalSource {
  id: string;
  name?: string | null;
  domain: string;
  url: string;
  logo?: string | null;
  type: string;
  pageCount: number;
  workspaceCount: number;
}

export function useGlobalSources(search?: string, page = 1) {
  return useQuery({
    queryKey: ["global-sources", search, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      if (search) {
        params.search = search;
      }
      const response = await apiClient.get<{
        sources: GlobalSource[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          hasMore: boolean;
        };
      }>("/api/sources/global", params);
      return response;
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

// Add a source to a workspace
export function useAddSourceToWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      sourceId,
    }: {
      workspaceId: string;
      sourceId: string;
    }) => {
      const response = await apiClient.post<{
        message: string;
        workspaceSource: any;
      }>(`/api/workspaces/${workspaceId}/sources`, { sourceId });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success(data.message || "Source added to workspace successfully");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to add source to workspace";
      toast.error(message);
    },
  });
}
