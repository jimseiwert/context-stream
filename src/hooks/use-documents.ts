/**
 * React Query hooks for document operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Document {
  id: string
  filename: string
  type: string
  size: number
  chunksCount: number
  uploadedAt: string
  indexedAt: string | null
  metadata?: any
}

export interface DocumentsResponse {
  documents: Document[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface UploadResult {
  success: boolean
  message: string
  results: Array<{
    filename: string
    jobId: string
    status: string
  }>
  errors?: Array<{
    filename: string
    error: string
  }>
}

/**
 * Fetch documents for a source
 */
export function useDocuments(sourceId: string, page = 1, limit = 20) {
  return useQuery<DocumentsResponse>({
    queryKey: ['documents', sourceId, page, limit],
    queryFn: async () => {
      const res = await fetch(
        `/api/sources/${sourceId}/documents?page=${page}&limit=${limit}`
      )
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch documents')
      }
      return res.json()
    },
    enabled: !!sourceId,
  })
}

/**
 * Upload documents to a source
 */
export function useUploadDocuments(sourceId: string) {
  const queryClient = useQueryClient()

  return useMutation<UploadResult, Error, { files: File[]; override?: boolean }>({
    mutationFn: async ({ files, override = false }) => {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })

      // Add override flag
      if (override) {
        formData.append('override', 'true')
      }

      const res = await fetch(`/api/sources/${sourceId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to upload documents')
      }

      return res.json()
    },
    onSuccess: (data) => {
      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['documents', sourceId] })

      // Invalidate source query to update document count
      queryClient.invalidateQueries({ queryKey: ['sources', sourceId] })

      // Show success toast
      if (data.results.length > 0) {
        toast.success(
          `${data.results.length} document${data.results.length > 1 ? 's' : ''} queued for processing`
        )
      }

      // Show errors if any
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((error) => {
          toast.error(`${error.filename}: ${error.error}`)
        })
      }
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`)
    },
  })
}

/**
 * Delete a document from a source
 */
export function useDeleteDocument(sourceId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/sources/${sourceId}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete document')
      }
    },
    onSuccess: () => {
      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['documents', sourceId] })

      // Invalidate source query to update document count
      queryClient.invalidateQueries({ queryKey: ['sources', sourceId] })

      // Show success toast
      toast.success('Document deleted successfully')
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`)
    },
  })
}
