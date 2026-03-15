"use client";

import { useState } from "react";

interface ExportCsvButtonProps {
  range: string;
}

export function ExportCsvButton({ range }: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/usage?range=${range}&format=csv`
      );

      if (!res.ok) {
        alert("Failed to export CSV");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `usage-${range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export CSV");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        padding: "0.375rem 0.75rem",
        borderRadius: "0.375rem",
        border: "1px solid var(--app-border, rgba(255,255,255,0.08))",
        background: "transparent",
        color: "var(--app-text-secondary)",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {loading ? "Exporting..." : "Export CSV"}
    </button>
  );
}
