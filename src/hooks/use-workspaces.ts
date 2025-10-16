import { apiClient } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  owner?: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    sources: number;
  };
  sources?: Array<{
    source: {
      id: string;
      url: string;
      type: string;
      status: string;
      scope: string;
      createdAt: string;
      lastScrapedAt: string | null;
      _count: {
        pages: number;
      };
    };
  }>;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
}

// Get all workspaces for current user
export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await apiClient.get<{ workspaces: Workspace[] }>(
        "/api/workspaces"
      );
      return response.workspaces;
    },
    staleTime: 60 * 1000, // Consider fresh for 1 minute
  });
}

// Get single workspace details
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ["workspaces", workspaceId],
    queryFn: async () => {
      const response = await apiClient.get<{ workspace: Workspace }>(
        `/api/workspaces/${workspaceId}`
      );
      return response.workspace;
    },
    enabled: !!workspaceId,
  });
}

// Create new workspace
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorkspaceInput) => {
      const response = await apiClient.post<{
        workspace: Workspace;
        message: string;
      }>("/api/workspaces", data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success(data.message || "Workspace created successfully");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to create workspace";
      toast.error(message);
    },
  });
}

// Update workspace
export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateWorkspaceInput) => {
      const response = await apiClient.put<{
        workspace: Workspace;
        message: string;
      }>(`/api/workspaces/${workspaceId}`, data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId] });
      toast.success(data.message || "Workspace updated successfully");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to update workspace";
      toast.error(message);
    },
  });
}

// Delete workspace
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const response = await apiClient.delete<{ message: string }>(
        `/api/workspaces/${workspaceId}`
      );
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success(data.message || "Workspace deleted successfully");
    },
    onError: (error: any) => {
      const message =
        error.data?.error || error.message || "Failed to delete workspace";
      toast.error(message);
    },
  });
}
