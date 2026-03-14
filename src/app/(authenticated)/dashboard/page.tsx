// Dashboard Page — Server Component
// Overview of indexing activity, running jobs, and recent jobs

import { db } from "@/lib/db";
import { jobs, sources } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, desc, count } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

function JobStatusBadge({ status }: { status: string }) {
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
        fontSize: "0.65rem",
        fontWeight: 600,
        color: colorMap[status] ?? "#9ca3af",
        textTransform: "uppercase" as const,
        letterSpacing: "0.04em",
      }}
    >
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Fetch running jobs count
  const [runningResult] = await db
    .select({ count: count() })
    .from(jobs)
    .where(eq(jobs.status, "RUNNING"));

  const runningCount = runningResult?.count ?? 0;

  // Fetch recent 3 jobs with source name
  const recentJobs = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      createdAt: jobs.createdAt,
      sourceName: sources.name,
      sourceUrl: sources.url,
    })
    .from(jobs)
    .leftJoin(sources, eq(jobs.sourceId, sources.id))
    .orderBy(desc(jobs.createdAt))
    .limit(3);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-text-primary)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--app-text-secondary)" }}>
          Overview of your indexing activity
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Documents", value: "—", sub: "Total indexed" },
          { label: "Chunks", value: "—", sub: "Vector embeddings" },
          { label: "Searches", value: "—", sub: "Last 7 days" },
          { label: "Sources", value: "—", sub: "Active sources" },
        ].map((stat) => (
          <div key={stat.label} className="app-card p-4">
            <p className="section-label mb-3">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
            <p className="text-xs mt-2" style={{ color: "var(--app-text-muted)" }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Running jobs + recent jobs row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Running Jobs stat card */}
        <Link href="/jobs" style={{ textDecoration: "none" }}>
          <div
            className="app-card p-4"
            style={{
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            <p className="section-label mb-3">Running Jobs</p>
            <p
              className="stat-value"
              style={{
                color:
                  runningCount > 0
                    ? "var(--app-accent-green, #22c55e)"
                    : undefined,
              }}
            >
              {runningCount}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--app-text-muted)" }}>
              {runningCount === 1 ? "1 job active" : `${runningCount} jobs active`}
            </p>
          </div>
        </Link>

        {/* Recent Jobs mini-list */}
        <div className="app-card p-4">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
            }}
          >
            <p className="section-label" style={{ margin: 0 }}>
              Recent Jobs
            </p>
            <Link
              href="/jobs"
              style={{
                fontSize: "0.72rem",
                color: "var(--app-text-muted)",
                textDecoration: "none",
              }}
            >
              View all →
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
              No jobs yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--app-text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {job.sourceName ?? job.sourceUrl ?? "Unknown source"}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      flexShrink: 0,
                    }}
                  >
                    <JobStatusBadge status={job.status} />
                    <span style={{ fontSize: "0.7rem", color: "var(--app-text-muted)" }}>
                      {formatTimeAgo(job.createdAt)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity placeholder */}
      <div className="app-card p-6">
        <p className="section-label mb-4">Recent Activity</p>
        <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
          No activity yet. Add a source to get started.
        </p>
      </div>
    </div>
  );
}
