// Jobs Page — Server Component
// Displays jobs grouped by status: running, pending, completed, failed

import { db } from "@/lib/db";
import { jobs, sources } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, desc, or, inArray } from "drizzle-orm";
import { JobCard } from "@/components/jobs/job-card";
import type { JobCardData } from "@/components/jobs/job-card";

export const dynamic = "force-dynamic";

async function fetchJobs() {
  const jobList = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      dispatchMode: jobs.dispatchMode,
      logs: jobs.logs,
      errorMessage: jobs.errorMessage,
      progress: jobs.progress,
      startedAt: jobs.startedAt,
      completedAt: jobs.completedAt,
      createdAt: jobs.createdAt,
      sourceName: sources.name,
      sourceType: sources.type,
      sourceUrl: sources.url,
    })
    .from(jobs)
    .leftJoin(sources, eq(jobs.sourceId, sources.id))
    .orderBy(desc(jobs.createdAt))
    .limit(200);

  return jobList as JobCardData[];
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.75rem",
      }}
    >
      <p className="section-label" style={{ margin: 0 }}>
        {label}
      </p>
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          backgroundColor: "rgba(255,255,255,0.06)",
          color: "var(--app-text-muted)",
          padding: "1px 7px",
          borderRadius: "9999px",
        }}
      >
        {count}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p
      style={{
        fontSize: "0.8rem",
        color: "var(--app-text-muted)",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      {message}
    </p>
  );
}

export default async function JobsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const allJobs = await fetchJobs();

  const running = allJobs.filter((j) => j.status === "RUNNING");
  const pending = allJobs.filter((j) => j.status === "PENDING");
  const completed = allJobs
    .filter((j) => j.status === "COMPLETED")
    .slice(0, 20);
  const failed = allJobs
    .filter((j) => j.status === "FAILED")
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--app-text-primary)" }}
        >
          Jobs
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--app-text-secondary)" }}
        >
          Monitor indexing jobs and their progress
        </p>
      </div>

      {/* Running */}
      <div>
        <SectionHeader label="Running" count={running.length} />
        {running.length === 0 ? (
          <EmptyState message="No running jobs" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {running.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Pending */}
      <div>
        <SectionHeader label="Queued / Pending" count={pending.length} />
        {pending.length === 0 ? (
          <EmptyState message="No queued jobs" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pending.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      <div>
        <SectionHeader label="Recent Completed" count={completed.length} />
        {completed.length === 0 ? (
          <EmptyState message="No completed jobs yet" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {completed.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Failed */}
      <div>
        <SectionHeader label="Recent Failed" count={failed.length} />
        {failed.length === 0 ? (
          <EmptyState message="No failed jobs" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {failed.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
