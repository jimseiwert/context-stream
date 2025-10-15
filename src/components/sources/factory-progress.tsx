"use client"

import { useEffect, useRef, useState } from 'react'

interface PipelineProgressProps {
  queued: number
  fetching: number
  extracting: number
  embedding: number
  saving: number
  completed: number
  failed: number
  total: number
}

// Radial progress circle component
function RadialProgress({
  value,
  total,
  label,
  color
}: {
  value: number
  total: number
  label: string
  color: string
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  const circumference = 2 * Math.PI * 35
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="35"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-slate-300 dark:text-slate-800"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r="35"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${color} transition-all duration-500 drop-shadow-lg`}
            style={{
              filter: 'drop-shadow(0 0 8px currentColor)'
            }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-2xl font-bold ${color.replace('text-', 'text-')} tabular-nums`}>
              {value}
            </div>
          </div>
        </div>
      </div>
      {/* Label */}
      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  )
}

export function FactoryProgress({ queued, fetching, extracting, embedding, saving, completed, failed, total }: PipelineProgressProps) {
  const overallPercent = total > 0 ? Math.floor((completed / total) * 100) : 0
  const [completionHistory, setCompletionHistory] = useState<number[]>([0])
  const maxHistoryLength = 50

  // Track completion progress over time for sparkline
  useEffect(() => {
    setCompletionHistory(prev => {
      const newHistory = [...prev, completed]
      // Keep only last N points
      if (newHistory.length > maxHistoryLength) {
        return newHistory.slice(-maxHistoryLength)
      }
      return newHistory
    })
  }, [completed])

  // Generate sparkline path
  const generateSparklinePath = () => {
    if (completionHistory.length < 2) return ''

    const width = 400
    const height = 60
    const max = Math.max(...completionHistory, 1)
    const points = completionHistory.map((value, index) => {
      const x = (index / (completionHistory.length - 1)) * width
      const y = height - (value / max) * height
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-slate-300 dark:border-slate-700/50 shadow-2xl p-6">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Animated scan line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />

      {/* Main content */}
      <div className="relative">
        {/* Pipeline stages in a row */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <RadialProgress value={queued} total={total} label="Queue" color="text-slate-500 dark:text-slate-400" />
          <div className="flex-1 h-px bg-gradient-to-r from-slate-400 via-slate-500 to-blue-500" />
          <RadialProgress value={fetching} total={total} label="Fetch" color="text-blue-500" />
          <div className="flex-1 h-px bg-gradient-to-r from-blue-500 via-blue-600 to-purple-500" />
          <RadialProgress value={extracting} total={total} label="Extract" color="text-purple-500" />
          <div className="flex-1 h-px bg-gradient-to-r from-purple-500 via-purple-600 to-orange-500" />
          <RadialProgress value={embedding} total={total} label="Embed" color="text-orange-500" />
          <div className="flex-1 h-px bg-gradient-to-r from-orange-500 via-orange-600 to-indigo-500" />
          <RadialProgress value={saving} total={total} label="Save" color="text-indigo-500" />
        </div>

        {/* Completion sparkline panel */}
        <div className="relative p-4 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700/50 overflow-hidden">
          {/* Stats overlay */}
          <div className="relative z-10 flex items-center justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">{completed}</div>
                <div className="text-lg text-green-600/60 dark:text-green-500/60 tabular-nums">/ {total}</div>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">Completed Items</div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">{overallPercent}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider">Progress</div>
            </div>

            {/* Failed counter (if any) */}
            {failed > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-950/50 border border-red-400 dark:border-red-500/50">
                <div className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{failed}</div>
                <div className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider">Failed</div>
              </div>
            )}
          </div>

          {/* Sparkline chart */}
          <div className="relative h-16">
            <svg
              viewBox="0 0 400 60"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Gradient fill under the line */}
              <defs>
                <linearGradient id="sparklineGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(22, 163, 74)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(22, 163, 74)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="sparklineGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Fill area - Light mode */}
              {completionHistory.length >= 2 && (
                <path
                  d={`${generateSparklinePath()} L 400,60 L 0,60 Z`}
                  fill="url(#sparklineGradientLight)"
                  className="transition-all duration-300 dark:hidden"
                />
              )}

              {/* Fill area - Dark mode */}
              {completionHistory.length >= 2 && (
                <path
                  d={`${generateSparklinePath()} L 400,60 L 0,60 Z`}
                  fill="url(#sparklineGradientDark)"
                  className="transition-all duration-300 hidden dark:block"
                />
              )}

              {/* Line - Light mode */}
              {completionHistory.length >= 2 && (
                <path
                  d={generateSparklinePath()}
                  fill="none"
                  stroke="rgb(22, 163, 74)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300 dark:hidden"
                  style={{
                    filter: 'drop-shadow(0 0 3px rgb(22, 163, 74))'
                  }}
                />
              )}

              {/* Line - Dark mode */}
              {completionHistory.length >= 2 && (
                <path
                  d={generateSparklinePath()}
                  fill="none"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300 hidden dark:block"
                  style={{
                    filter: 'drop-shadow(0 0 4px rgb(34, 197, 94))'
                  }}
                />
              )}

              {/* Dot at the end - Light mode */}
              {completionHistory.length >= 2 && (
                <circle
                  cx="400"
                  cy={60 - (completed / Math.max(...completionHistory, 1)) * 60}
                  r="3.5"
                  fill="rgb(22, 163, 74)"
                  className="animate-pulse dark:hidden"
                  style={{
                    filter: 'drop-shadow(0 0 6px rgb(22, 163, 74))'
                  }}
                />
              )}

              {/* Dot at the end - Dark mode */}
              {completionHistory.length >= 2 && (
                <circle
                  cx="400"
                  cy={60 - (completed / Math.max(...completionHistory, 1)) * 60}
                  r="3"
                  fill="rgb(34, 197, 94)"
                  className="animate-pulse hidden dark:block"
                  style={{
                    filter: 'drop-shadow(0 0 6px rgb(34, 197, 94))'
                  }}
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
