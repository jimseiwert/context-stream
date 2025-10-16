"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Clock, StopCircle } from 'lucide-react'
import { FactoryProgress } from './factory-progress'
import { useCancelJob } from '@/hooks/use-sources'

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
  result?: {
    documentsProcessed?: number
    chunksCreated?: number
    [key: string]: any
  } | null
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
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [elapsedTime, setElapsedTime] = useState<string>('')
  const [completionParticles, setCompletionParticles] = useState<Array<{ id: string; color: string }>>([])
  const [prevCompleted, setPrevCompleted] = useState(0)

  const cancelJob = useCancelJob()

  const handleCancelJob = async () => {
    if (!window.confirm('Are you sure you want to cancel this job?')) {
      return
    }

    try {
      await cancelJob.mutateAsync(sourceId)
      setIsPolling(false)
      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Error cancelling job:', error)
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const fetchJobStatus = async () => {
      try {
        const response = await fetch(`/api/sources/${sourceId}/jobs`)
        if (response.ok) {
          const data = await response.json()

          if (data.job) {
            const incomingJob = data.job

            // Only switch to a new job if:
            // 1. It's a different job ID
            // 2. AND it's actually RUNNING (not just PENDING)
            // This prevents progress from resetting when new PENDING jobs are created
            if (incomingJob.id !== currentJobId) {
              if (incomingJob.status === 'RUNNING') {
                console.log(`[JobProgress] Switching to new job ${incomingJob.id} (status: ${incomingJob.status})`)
                setCurrentJobId(incomingJob.id)
                setJob(incomingJob)
                setIsPolling(true)
              } else if (!currentJobId) {
                // No current job, so show this one even if PENDING
                console.log(`[JobProgress] First job ${incomingJob.id} (status: ${incomingJob.status})`)
                setCurrentJobId(incomingJob.id)
                setJob(incomingJob)
                if (incomingJob.status === 'PENDING' || incomingJob.status === 'RUNNING') {
                  setIsPolling(true)
                }
              } else {
                // Different job but still PENDING - keep showing current job
                console.log(`[JobProgress] Ignoring PENDING job ${incomingJob.id}, keeping current job ${currentJobId}`)
              }
            } else {
              // Same job, update progress
              setJob(incomingJob)

              // Start polling if not already polling and job is active
              const isActive = incomingJob.status === 'PENDING' || incomingJob.status === 'RUNNING'
              if (isActive && !isPolling) {
                setIsPolling(true)
              }

              // Stop polling if job is completed or failed
              if (incomingJob.status === 'COMPLETED' || incomingJob.status === 'FAILED') {
                setIsPolling(false)
                if (onComplete) {
                  onComplete()
                }
              }
            }
          } else {
            // No active job returned from API
            // Keep showing the last completed/failed job, but stop polling
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
  }, [sourceId, isPolling, onComplete, currentJobId])

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

  // Spawn completion particles when items complete
  useEffect(() => {
    if (!job) return

    const newCompleted = job.progress.completed
    if (newCompleted > prevCompleted && prevCompleted > 0) {
      // Items completed! Spawn particles
      const newItems = newCompleted - prevCompleted
      const colors = ['from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-orange-400 to-orange-600', 'from-indigo-400 to-indigo-600']

      for (let i = 0; i < Math.min(newItems, 5); i++) {
        const particleId = `${Date.now()}-${i}`
        const color = colors[Math.floor(Math.random() * colors.length)]

        setCompletionParticles(prev => [...prev, { id: particleId, color }])

        // Remove particle after animation completes
        setTimeout(() => {
          setCompletionParticles(prev => prev.filter(p => p.id !== particleId))
        }, 1200)
      }
    }

    setPrevCompleted(newCompleted)
  }, [job?.progress.completed])

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
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelJob}
                disabled={cancelJob.isPending}
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                {cancelJob.isPending ? 'Cancelling...' : 'Cancel'}
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          {job.type === 'SCRAPE'
            ? 'Parallel processing pipeline'
            : job.type === 'DOCUMENT_UPLOAD'
            ? 'Document processing and embedding pipeline'
            : 'Processing job'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isActive && (
          <>
            {/* Overall Progress Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Overall Progress</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">
                  {totalProcessed}<span className="text-muted-foreground mx-1">/</span>{job.progress.total}
                </span>
                <span className="text-xs text-muted-foreground">({percentComplete}%)</span>
              </div>
            </div>

            {/* High-Tech Pipeline Dashboard */}
            <FactoryProgress
              queued={job.progress.queued}
              fetching={job.progress.fetching}
              extracting={job.progress.extracting}
              embedding={job.progress.embedding}
              saving={job.progress.saving}
              completed={job.progress.completed}
              failed={job.progress.failed}
              total={job.progress.total}
            />
          </>
        )}

        {job.status === 'COMPLETED' && (
          <div className="text-sm text-muted-foreground">
            {job.type === 'DOCUMENT_UPLOAD'
              ? `Successfully processed ${job.result?.chunksCreated || 0} chunks from ${job.result?.documentsProcessed || 0} document(s)`
              : `Successfully indexed ${job.progress.completed} pages`
            }
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
