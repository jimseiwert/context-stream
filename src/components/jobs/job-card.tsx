"use client";

// Job Card Component
// Displays a single job with status, metadata, and action buttons

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface JobProgress {
  pagesFound?: number;
  pagesProcessed?: number;
  chunksCreated?: number;
}

export interface JobCardData {
  id: string;
  type: string;
  status: string;
  dispatchMode: string;
  logs: string | null;
  errorMessage: string | null;
  progress: unknown;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  sourceName: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
}

function formatDuration(start: Date | string | null, end: Date | string | null): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diffMs = e - s;
  if (diffMs < 1000) return "<1s";
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

function formatTimeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, { bg: string; color: string }> = {
    RUNNING: { bg: "rgba(34,197,94,0.15)", color: "var(--app-accent-green, #22c55e)" },
    COMPLETED: { bg: "rgba(34,197,94,0.12)", color: "var(--app-accent-green, #22c55e)" },
    FAILED: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
    PENDING: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    CANCELLED: { bg: "rgba(107,114,128,0.2)", color: "#6b7280" },
  };
  const style = styleMap[status] ?? { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" };

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.color,
        fontSize: "0.65rem",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "9999px",
        letterSpacing: "0.05em",
        textTransform: "uppercase" as const,
      }}
    >
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      style={{
        backgroundColor: "rgba(99,102,241,0.12)",
        color: "#818cf8",
        fontSize: "0.65rem",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "9999px",
        letterSpacing: "0.05em",
        textTransform: "uppercase" as const,
      }}
    >
      {type}
    </span>
  );
}

export function JobCard({ job }: { job: JobCardData }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const lastLogLine = job.logs
    ? job.logs.trim().split("\n").filter(Boolean).at(-1)?.slice(0, 80)
    : null;

  const progress = job.progress as JobProgress | null;

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setCancelling(false);
    }
  }

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      // Trigger re-index via sources API
      if (job.sourceType && job.sourceUrl) {
        // Find source and trigger scrape — use source ID from job
        await fetch(`/api/sources/${job.id}/retry`, { method: "POST" }).catch(() => null);
      }
      router.refresh();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      className="app-card"
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        {job.status === "RUNNING" && (
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "var(--app-accent-green, #22c55e)",
              flexShrink: 0,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        )}
        <span
          style={{
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "var(--app-text-primary)",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {job.sourceName ?? job.sourceUrl ?? "Unknown source"}
        </span>
        <TypeBadge type={job.type} />
        <StatusBadge status={job.status} />
      </div>

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          fontSize: "0.75rem",
          color: "var(--app-text-muted)",
        }}
      >
        <span>Started {formatTimeAgo(job.createdAt)}</span>
        <span>Duration: {formatDuration(job.startedAt, job.completedAt)}</span>
        {progress && typeof progress.pagesProcessed === "number" && (
          <span>
            {progress.pagesProcessed}/{progress.pagesFound ?? "?"} pages
          </span>
        )}
      </div>

      {/* Last log line for running jobs */}
      {job.status === "RUNNING" && lastLogLine && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--app-text-secondary)",
            fontFamily: "var(--font-mono, monospace)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          {lastLogLine}
        </p>
      )}

      {/* Error message for failed jobs */}
      {job.status === "FAILED" && job.errorMessage && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "#ef4444",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          {job.errorMessage}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
        <Link
          href={`/jobs/${job.id}`}
          style={{
            fontSize: "0.75rem",
            color: "var(--app-text-secondary)",
            textDecoration: "none",
            padding: "3px 10px",
            border: "1px solid var(--app-border, rgba(255,255,255,0.08))",
            borderRadius: "6px",
          }}
        >
          View Logs
        </Link>

        {job.status === "RUNNING" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              fontSize: "0.75rem",
              color: "#ef4444",
              background: "none",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "6px",
              padding: "3px 10px",
              cursor: cancelling ? "not-allowed" : "pointer",
              opacity: cancelling ? 0.6 : 1,
            }}
          >
            {cancelling ? "Cancelling..." : "Cancel"}
          </button>
        )}

        {job.status === "FAILED" && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            style={{
              fontSize: "0.75rem",
              color: "var(--app-accent-green, #22c55e)",
              background: "none",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "6px",
              padding: "3px 10px",
              cursor: retrying ? "not-allowed" : "pointer",
              opacity: retrying ? 0.6 : 1,
            }}
          >
            {retrying ? "Retrying..." : "Retry"}
          </button>
        )}
      </div>
    </div>
  );
}
