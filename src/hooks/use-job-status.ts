import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

export interface Job {
  id: string
  sourceId: string
  type: "SCRAPE" | "EMBED" | "UPDATE"
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
  progress?: {
    pagesScraped: number
    total: number
    currentPage?: string
    errors?: Array<{
      url: string
      error: string
    }>
  }
  result?: Record<string, any>
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

// Poll job status
export function useJobStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", jobId],
    queryFn: async () => {
      const response = await apiClient.get<{ job: Job }>(`/api/jobs/${jobId}`)
      return response.job
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Poll every 2 seconds while job is running
      if (data?.status === "RUNNING" || data?.status === "PENDING") {
        return 2000
      }
      // Stop polling when complete
      return false
    },
  })
}

// Hook for real-time job progress using Server-Sent Events
export function useJobStream(jobId: string | undefined) {
  const [progress, setProgress] = useState<Job | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return

    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setProgress(data)

        if (data.status === "COMPLETED" || data.status === "FAILED" || data.status === "CANCELLED") {
          setIsComplete(true)
          eventSource.close()
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err)
      }
    }

    eventSource.onerror = (err) => {
      console.error("SSE error:", err)
      setError("Connection lost. Retrying...")
      // Browser will automatically reconnect
    }

    return () => {
      eventSource.close()
    }
  }, [jobId])

  return { progress, isComplete, error }
}

// Get all jobs
export function useJobs(sourceId?: string) {
  return useQuery({
    queryKey: ["jobs", sourceId],
    queryFn: async () => {
      const params = sourceId ? { sourceId } : {}
      const response = await apiClient.get<{
        jobs: Job[]
        total: number
      }>("/api/jobs", params)
      return response.jobs
    },
    refetchInterval: 5000, // Refresh every 5 seconds to catch status updates
  })
}