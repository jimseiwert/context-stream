import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

export interface ApiKey {
  id: string
  name: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface CreateApiKeyInput {
  name: string
  expiresInDays?: number
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey
  key: string
  warning: string
}

// Get all API keys for the current user
export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const response = await apiClient.get<{ apiKeys: ApiKey[] }>("/api/api-keys")
      return response.apiKeys
    },
  })
}

// Create a new API key
export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateApiKeyInput) => {
      const response = await apiClient.post<CreateApiKeyResponse>(
        "/api/api-keys",
        data
      )
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      toast.success("API key created successfully")
    },
    onError: (error: any) => {
      const message = error.data?.error || error.message || "Failed to create API key"
      toast.error(message)
    },
  })
}

// Delete an API key
export function useDeleteApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiClient.delete<{ message: string }>(
        `/api/api-keys/${keyId}`
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      toast.success("API key deleted successfully")
    },
    onError: (error: any) => {
      const message = error.data?.error || error.message || "Failed to delete API key"
      toast.error(message)
    },
  })
}
