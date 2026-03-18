"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Plus } from "lucide-react";

type VectorStoreConfig = {
  id: string;
  name: string;
  storeProvider: string;
  embeddingProvider: string;
  isActive: boolean;
  createdAt: Date | string;
};

interface VectorStorePanelProps {
  configs: VectorStoreConfig[];
}

const PROVIDER_COLORS: Record<string, string> = {
  pgvector: "#336791",
  pinecone: "#1b1f3b",
  qdrant: "#dc143c",
  weaviate: "#6bc3e4",
  vertex_ai_vector_search: "#4285f4",
};

const PROVIDER_LABELS: Record<string, string> = {
  pgvector: "pgvector",
  pinecone: "Pinecone",
  qdrant: "Qdrant",
  weaviate: "Weaviate",
  vertex_ai_vector_search: "Vertex AI Vector Search",
};

const EMBEDDING_LABELS: Record<string, string> = {
  openai: "OpenAI",
  azure_openai: "Azure OpenAI",
  vertex_ai: "Vertex AI",
};

export function VectorStorePanel({ configs: initialConfigs }: VectorStorePanelProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSetActive(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/vector-store-config/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      if (res.ok) {
        setConfigs((prev) =>
          prev.map((c) => ({ ...c, isActive: c.id === id }))
        );
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: { message?: string } };
        alert(data.error?.message ?? "Failed to set active");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vector store config?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/vector-store-config/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setConfigs((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: { message?: string } };
        alert(data.error?.message ?? "Failed to delete");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {configs.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "var(--app-text-muted)" }}>
          No vector store configs configured yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                border: cfg.isActive
                  ? "1px solid rgba(16,185,129,0.3)"
                  : "1px solid var(--app-border, rgba(255,255,255,0.06))",
                background: cfg.isActive
                  ? "rgba(16,185,129,0.05)"
                  : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {cfg.isActive ? (
                  <CheckCircle2 size={14} style={{ color: "var(--app-accent-green)", flexShrink: 0 }} />
                ) : (
                  <XCircle size={14} style={{ color: "var(--app-text-muted)", flexShrink: 0 }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        color: PROVIDER_COLORS[cfg.storeProvider] ?? "#888",
                        background: `${PROVIDER_COLORS[cfg.storeProvider] ?? "#888"}20`,
                        borderRadius: "9999px",
                        padding: "0.1rem 0.4rem",
                      }}
                    >
                      {PROVIDER_LABELS[cfg.storeProvider] ?? cfg.storeProvider}
                    </span>
                    {cfg.name && (
                      <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--app-text-primary)" }}>
                        {cfg.name}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "var(--app-text-muted)" }}>
                    Embedding: {EMBEDDING_LABELS[cfg.embeddingProvider] ?? cfg.embeddingProvider}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {!cfg.isActive && (
                  <button
                    onClick={() => handleSetActive(cfg.id)}
                    disabled={isPending}
                    style={{
                      fontSize: "0.72rem",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "0.375rem",
                      border: "1px solid rgba(16,185,129,0.3)",
                      background: "rgba(16,185,129,0.06)",
                      color: "var(--app-accent-green)",
                      cursor: "pointer",
                    }}
                  >
                    Set Active
                  </button>
                )}
                <button
                  onClick={() => handleDelete(cfg.id)}
                  disabled={isPending}
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => router.push("/admin/system-settings")}
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
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        <Plus size={12} />
        Add Vector Store
      </button>
    </div>
  );
}
