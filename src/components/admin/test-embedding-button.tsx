"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

export function TestEmbeddingButton() {
  const [result, setResult] = useState<{
    dimensions: number;
    sample: number[];
    latencyMs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/system/test-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "ContextStream embedding test" }),
      });

      const data = (await res.json()) as {
        dimensions?: number;
        sample?: number[];
        latencyMs?: number;
        error?: { message?: string };
      };

      if (!res.ok) {
        setError(data.error?.message ?? "Test failed");
        return;
      }

      setResult({
        dimensions: data.dimensions ?? 0,
        sample: data.sample ?? [],
        latencyMs: data.latencyMs ?? 0,
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <button
        onClick={handleTest}
        disabled={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          padding: "0.375rem 0.75rem",
          borderRadius: "0.375rem",
          border: "1px solid rgba(16,185,129,0.3)",
          background: "rgba(16,185,129,0.08)",
          color: "var(--app-accent-green)",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        <Zap size={12} />
        {loading ? "Testing..." : "Test Embedding"}
      </button>

      {result && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--app-text-secondary)",
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.15)",
            borderRadius: "0.375rem",
            padding: "0.5rem 0.75rem",
            fontFamily: "monospace",
          }}
        >
          <p style={{ color: "var(--app-accent-green)" }}>
            OK — {result.dimensions} dims, {result.latencyMs}ms
          </p>
          <p style={{ color: "var(--app-text-muted)", marginTop: "0.2rem" }}>
            Sample: [{result.sample.map((n) => n.toFixed(4)).join(", ")}
            {result.sample.length > 0 ? ", ..." : ""}]
          </p>
        </div>
      )}

      {error && (
        <p
          style={{
            fontSize: "0.72rem",
            color: "#ef4444",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "0.375rem",
            padding: "0.4rem 0.6rem",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
