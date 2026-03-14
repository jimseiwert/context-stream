// Job Detail Page — Server Component
// Shows job metadata, progress, and live log stream

import { db } from "@/lib/db";
import { jobs, sources } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { LogStream } from "@/components/jobs/log-stream";
import { JobActions } from "@/components/jobs/job-actions";

export const dynamic = "force-dynamic";

interface JobProgress {
  pagesFound?: number;
  pagesProcessed?: number;
  chunksCreated?: number;
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString();
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

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    RUNNING: "var(--app-accent-green, #22c55e)",
    COMPLETED: "var(--app-accent-green, #22c55e)",
    FAILED: "#ef4444",
    PENDING: "#f59e0b",
    CANCELLED: "#6b7280",
  };
  return (
    <span
      style={{
        fontSize: "0.7rem",
        fontWeight: 600,
        color: colorMap[status] ?? "#9ca3af",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
      }}
    >
      {status}
    </span>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;

  const [job] = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      dispatchMode: jobs.dispatchMode,
      progress: jobs.progress,
      result: jobs.result,
      logs: jobs.logs,
      errorMessage: jobs.errorMessage,
      startedAt: jobs.startedAt,
      completedAt: jobs.completedAt,
      createdAt: jobs.createdAt,
      sourceName: sources.name,
      sourceType: sources.type,
      sourceUrl: sources.url,
      sourceId: jobs.sourceId,
    })
    .from(jobs)
    .leftJoin(sources, eq(jobs.sourceId, sources.id))
    .where(eq(jobs.id, id));

  if (!job) {
    notFound();
  }

  const progress = job.progress as JobProgress | null;
  const pagesFound = progress?.pagesFound ?? 0;
  const pagesProcessed = progress?.pagesProcessed ?? 0;
  const progressPct =
    pagesFound > 0 ? Math.min(100, Math.round((pagesProcessed / pagesFound) * 100)) : 0;

  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(job.status);

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/jobs"
          style={{
            fontSize: "0.8rem",
            color: "var(--app-text-muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            marginBottom: "0.75rem",
          }}
        >
          ← Back to Jobs
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--app-text-primary)", margin: 0 }}
          >
            {job.sourceName ?? job.sourceUrl ?? "Job"} — {job.type}
          </h1>
          <StatusBadge status={job.status} />
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--app-text-muted)",
            marginTop: "0.25rem",
          }}
        >
          Job ID: {job.id}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
        {/* Left: log stream */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Progress bar */}
          {pagesFound > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  color: "var(--app-text-muted)",
                  marginBottom: "0.35rem",
                }}
              >
                <span>
                  {pagesProcessed}/{pagesFound} pages
                </span>
                <span>{progressPct}%</span>
              </div>
              <div
                style={{
                  height: "6px",
                  borderRadius: "3px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPct}%`,
                    backgroundColor: "var(--app-accent-green, #22c55e)",
                    borderRadius: "3px",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Log terminal */}
          <LogStream
            jobId={job.id}
            initialLogs={job.logs}
            initialStatus={job.status}
          />
        </div>

        {/* Right: metadata panel + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="app-card" style={{ padding: "1rem" }}>
            <p className="section-label" style={{ marginBottom: "0.75rem" }}>
              Job Details
            </p>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "0.4rem 0.75rem",
                fontSize: "0.78rem",
              }}
            >
              <dt style={{ color: "var(--app-text-muted)", whiteSpace: "nowrap" }}>Source</dt>
              <dd style={{ color: "var(--app-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {job.sourceName ?? "—"}
              </dd>

              <dt style={{ color: "var(--app-text-muted)" }}>Type</dt>
              <dd style={{ color: "var(--app-text-primary)", margin: 0 }}>{job.sourceType ?? "—"}</dd>

              <dt style={{ color: "var(--app-text-muted)" }}>Dispatch</dt>
              <dd style={{ color: "var(--app-text-primary)", margin: 0 }}>{job.dispatchMode}</dd>

              <dt style={{ color: "var(--app-text-muted)" }}>Created</dt>
              <dd style={{ color: "var(--app-text-primary)", margin: 0 }}>{formatDateTime(job.createdAt)}</dd>

              <dt style={{ color: "var(--app-text-muted)" }}>Started</dt>
              <dd style={{ color: "var(--app-text-primary)", margin: 0 }}>{formatDateTime(job.startedAt)}</dd>

              <dt style={{ color: "var(--app-text-muted)" }}>Completed</dt>
              <dd style={{ color: "var(--app-text-primary)", margin: 0 }}>{formatDateTime(job.completedAt)}</dd>

              <dt style={{ color: "var(--app-text-muted)" }}>Duration</dt>
              <dd style={{ color: "var(--app-text-primary)", margin: 0 }}>
                {formatDuration(job.startedAt, job.completedAt)}
              </dd>

              {progress?.chunksCreated !== undefined && (
                <>
                  <dt style={{ color: "var(--app-text-muted)" }}>Chunks</dt>
                  <dd style={{ color: "var(--app-text-primary)", margin: 0 }}>
                    {progress.chunksCreated}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* Error message */}
          {job.errorMessage && (
            <div
              className="app-card"
              style={{
                padding: "1rem",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <p className="section-label" style={{ marginBottom: "0.5rem", color: "#ef4444" }}>
                Error
              </p>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "#fca5a5",
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {job.errorMessage}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <JobActions
            jobId={job.id}
            status={job.status}
            sourceId={job.sourceId}
          />
        </div>
      </div>
    </div>
  );
}
