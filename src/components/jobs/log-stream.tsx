"use client";

// Log Stream Component
// Connects to SSE endpoint and renders a live terminal-style log view

import { useEffect, useRef, useState } from "react";

interface SSEPayload {
  id: string;
  status: string;
  logs: string | null;
  progress: unknown;
  errorMessage: string | null;
  updatedAt: string;
}

interface LogStreamProps {
  jobId: string;
  initialLogs: string | null;
  initialStatus: string;
}

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export function LogStream({ jobId, initialLogs, initialStatus }: LogStreamProps) {
  const [logs, setLogs] = useState<string>(initialLogs ?? "");
  const [status, setStatus] = useState<string>(initialStatus);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTerminal = TERMINAL_STATUSES.has(status);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    if (isTerminal) return;

    const sseSupported = typeof EventSource !== "undefined";

    if (sseSupported) {
      const es = new EventSource(`/api/jobs/${jobId}/stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(null);
      };

      es.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data as string) as SSEPayload;
          if (payload.logs !== null) {
            setLogs(payload.logs);
          }
          setStatus(payload.status);

          if (TERMINAL_STATUSES.has(payload.status)) {
            es.close();
            setConnected(false);
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Fall back to polling
        startPolling();
      };

      return () => {
        es.close();
        setConnected(false);
      };
    } else {
      // No SSE support — poll from the start
      startPolling();
      return () => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
        }
      };
    }

    function startPolling() {
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${jobId}`);
          if (!res.ok) return;
          const data = (await res.json()) as { job: { status: string; logs: string | null } };
          const job = data.job;
          if (job.logs !== null) setLogs(job.logs);
          setStatus(job.status);

          if (TERMINAL_STATUSES.has(job.status)) {
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
          }
        } catch (err) {
          setError("Polling failed");
          console.error("[LogStream] Poll error:", err);
        }
      }, 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const lines = logs ? logs.split("\n").filter(Boolean) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {/* Connection status indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.75rem",
          color: "var(--app-text-muted)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: isTerminal
              ? "#6b7280"
              : connected
              ? "var(--app-accent-green, #22c55e)"
              : "#f59e0b",
          }}
        />
        <span>
          {isTerminal
            ? "Stream closed — job finished"
            : connected
            ? "Live"
            : error
            ? `Polling (${error})`
            : "Connecting..."}
        </span>
      </div>

      {/* Terminal */}
      <div
        style={{
          backgroundColor: "#0d1117",
          borderRadius: "8px",
          padding: "1rem",
          minHeight: "300px",
          maxHeight: "520px",
          overflowY: "auto",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.78rem",
          lineHeight: "1.6",
          color: "#22c55e",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {lines.length === 0 ? (
          <span style={{ color: "#4b5563" }}>Waiting for logs...</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
