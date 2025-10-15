"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface JobProgress {
  queued: number
  fetching: number
  extracting: number
  embedding: number
  saving: number
  completed: number
  failed: number
  total: number
}

interface Job {
  id: string
  type: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  progress: JobProgress
}

function formatElapsedTime(startTime: string, endTime?: string | null): string {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  const elapsed = Math.floor((end - start) / 1000) // seconds

  if (elapsed < 60) {
    return `${elapsed}s`
  }

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m ${seconds}s`
}

interface JobProgressProps {
  sourceId: string
  onComplete?: () => void
}

export function JobProgressDisplay({ sourceId, onComplete }: JobProgressProps) {
  const [job, setJob] = useState<Job | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [elapsedTime, setElapsedTime] = useState<string>('')

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const fetchJobStatus = async () => {
      try {
        const response = await fetch(`/api/sources/${sourceId}/jobs`)
        if (response.ok) {
          const data = await response.json()

          if (data.job) {
            setJob(data.job)

            // Start polling if not already polling and job is active
            const isActive = data.job.status === 'PENDING' || data.job.status === 'RUNNING'
            if (isActive && !isPolling) {
              setIsPolling(true)
            }

            // Stop polling if job is completed or failed
            if (data.job.status === 'COMPLETED' || data.job.status === 'FAILED') {
              setIsPolling(false)
              if (onComplete) {
                onComplete()
              }
            }
          } else {
            // No active job
            setJob(null)
            setIsPolling(false)
          }
        }
      } catch (error) {
        console.error('Error fetching job status:', error)
      }
    }

    // Initial fetch
    fetchJobStatus()

    // Set up polling every 2 seconds ONLY if there's an active job
    if (isPolling) {
      intervalId = setInterval(fetchJobStatus, 2000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [sourceId, isPolling, onComplete])

  // Update elapsed time every second for running jobs
  useEffect(() => {
    let timeIntervalId: NodeJS.Timeout | null = null

    if (job?.startedAt) {
      // Update immediately
      setElapsedTime(formatElapsedTime(job.startedAt, job.completedAt))

      // Continue updating every second for running jobs
      if (job.status === 'RUNNING' || job.status === 'PENDING') {
        timeIntervalId = setInterval(() => {
          setElapsedTime(formatElapsedTime(job.startedAt!, job.completedAt))
        }, 1000)
      }
    }

    return () => {
      if (timeIntervalId) {
        clearInterval(timeIntervalId)
      }
    }
  }, [job?.startedAt, job?.completedAt, job?.status])

  if (!job) {
    return null
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4" />
      case 'FAILED':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    switch (job.status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>
      case 'RUNNING':
        return <Badge variant="default">Running</Badge>
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return null
    }
  }

  const isActive = job.status === 'PENDING' || job.status === 'RUNNING'
  const totalProcessed = job.progress.completed + job.progress.failed
  const percentComplete = job.progress.total > 0
    ? Math.floor((totalProcessed / job.progress.total) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Indexing Pipeline</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {elapsedTime && (
              <Badge variant="outline" className="font-mono">
                {job.status === 'RUNNING' || job.status === 'PENDING'
                  ? `Running ${elapsedTime}`
                  : job.status === 'COMPLETED'
                  ? `Completed in ${elapsedTime}`
                  : job.status === 'FAILED'
                  ? `Failed after ${elapsedTime}`
                  : elapsedTime
                }
              </Badge>
            )}
            {getStatusBadge()}
          </div>
        </div>
        <CardDescription>
          {job.type === 'SCRAPE' ? 'Parallel processing pipeline' : 'Processing job'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isActive && (
          <>
            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">
                  {totalProcessed} / {job.progress.total} pages ({percentComplete}%)
                </span>
              </div>
              <Progress value={percentComplete} className="h-2" />
            </div>

            {/* Pipeline Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Queued */}
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Queued</div>
                  <div className="text-lg font-bold">{job.progress.queued}</div>
                </div>
              </div>

              {/* Fetching */}
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <div>
                  <div className="text-xs text-muted-foreground">Fetching</div>
                  <div className="text-lg font-bold text-blue-600">{job.progress.fetching}</div>
                </div>
              </div>

              {/* Extracting */}
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-purple-50 dark:bg-purple-950">
                <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                <div>
                  <div className="text-xs text-muted-foreground">Extracting</div>
                  <div className="text-lg font-bold text-purple-600">{job.progress.extracting}</div>
                </div>
              </div>

              {/* Embedding */}
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-orange-50 dark:bg-orange-950">
                <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
                <div>
                  <div className="text-xs text-muted-foreground">Embedding</div>
                  <div className="text-lg font-bold text-orange-600">{job.progress.embedding}</div>
                </div>
              </div>

              {/* Saving */}
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-indigo-50 dark:bg-indigo-950">
                <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                <div>
                  <div className="text-xs text-muted-foreground">Saving</div>
                  <div className="text-lg font-bold text-indigo-600">{job.progress.saving}</div>
                </div>
              </div>

              {/* Completed */}
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="text-lg font-bold text-green-600">{job.progress.completed}</div>
                </div>
              </div>
            </div>

            {/* Failed Count (if any) */}
            {job.progress.failed > 0 && (
              <div className="flex items-center gap-2 p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Failed Pages</div>
                  <div className="text-lg font-bold text-red-600">{job.progress.failed}</div>
                </div>
              </div>
            )}
          </>
        )}

        {job.status === 'COMPLETED' && (
          <div className="text-sm text-muted-foreground">
            Successfully indexed {job.progress.completed} pages
            {job.progress.failed > 0 && ` (${job.progress.failed} failed)`}
          </div>
        )}

        {job.status === 'FAILED' && (
          <div className="text-sm text-red-500">
            Job failed after processing {totalProcessed} pages
          </div>
        )}
      </CardContent>
    </Card>
  )
}
