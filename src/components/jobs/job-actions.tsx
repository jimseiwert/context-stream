"use client";

// Job Actions Component
// Cancel / Retry buttons for the job detail page

import { useState } from "react";
import { useRouter } from "next/navigation";

interface JobActionsProps {
  jobId: string;
  status: string;
  sourceId: string;
}

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export function JobActions({ jobId, status, sourceId: _sourceId }: JobActionsProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const isTerminal = TERMINAL_STATUSES.has(status);
  const isRunning = status === "RUNNING" || status === "PENDING";
  const isFailed = status === "FAILED";

  if (isTerminal && !isFailed) return null;

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      // Retry is not yet wired to a dedicated endpoint; refresh to let user re-trigger
      router.refresh();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {isRunning && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: "8px",
            background: "rgba(239,68,68,0.08)",
            color: "#ef4444",
            fontSize: "0.8rem",
            fontWeight: 500,
            cursor: cancelling ? "not-allowed" : "pointer",
            opacity: cancelling ? 0.6 : 1,
          }}
        >
          {cancelling ? "Cancelling..." : "Cancel Job"}
        </button>
      )}

      {isFailed && (
        <button
          onClick={handleRetry}
          disabled={retrying}
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: "8px",
            background: "rgba(34,197,94,0.08)",
            color: "var(--app-accent-green, #22c55e)",
            fontSize: "0.8rem",
            fontWeight: 500,
            cursor: retrying ? "not-allowed" : "pointer",
            opacity: retrying ? 0.6 : 1,
          }}
        >
          {retrying ? "Retrying..." : "Retry Job"}
        </button>
      )}
    </div>
  );
}
