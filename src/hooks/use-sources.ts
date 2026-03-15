"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface AdminSource {
  id: string;
  url: string;
  domain: string;
  name: string | null;
  logo: string | null;
  type: string;
  scope: "GLOBAL" | "WORKSPACE";
  status: string;
  pageCount: number;
  workspaceCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Fetch all sources (admin view — no scope filter)
async function fetchAdminSources(): Promise<AdminSource[]> {
  const data = await apiClient.get<{ sources: AdminSource[] }>("/api/sources");
  return data.sources;
}

export function useAdminSources() {
  return useQuery<AdminSource[], Error>({
    queryKey: ["admin-sources"],
    queryFn: fetchAdminSources,
    staleTime: 30_000,
  });
}

export function useAdminRescrapeSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      fullReindex,
    }: {
      sourceId: string;
      fullReindex?: boolean;
    }) => {
      return apiClient.post(`/api/sources/${sourceId}/trigger`, {
        fullReindex,
      });
    },
    onSuccess: () => {
      toast.success("Re-scrape job queued");
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (error: any) => {
      toast.error("Failed to queue re-scrape", {
        description: error.message,
      });
    },
  });
}

export function useAdminDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      return apiClient.delete(`/api/sources/${sourceId}`);
    },
    onSuccess: () => {
      toast.success("Source deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (error: any) => {
      toast.error("Failed to delete source", {
        description: error.message,
      });
    },
  });
}
