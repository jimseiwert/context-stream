"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Plus } from "lucide-react";

type VectorStoreConfig = {
  id: string;
  provider: string;
  isActive: boolean;
  createdAt: Date | string;
};

interface VectorStorePanelProps {
  configs: VectorStoreConfig[];
}

const PROVIDER_COLORS: Record<string, string> = {
  PGVECTOR: "#336791",
  PINECONE: "#1b1f3b",
  QDRANT: "#dc143c",
  WEAVIATE: "#6bc3e4",
};

const PROVIDER_LABELS: Record<string, string> = {
  PGVECTOR: "pgvector",
  PINECONE: "Pinecone",
  QDRANT: "Qdrant",
  WEAVIATE: "Weaviate",
};

export function VectorStorePanel({ configs: initialConfigs }: VectorStorePanelProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    provider: "PGVECTOR",
    connectionString: "",
  });

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const res = await fetch("/api/admin/vector-store-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          connectionString: form.connectionString,
        }),
      });

      const data = (await res.json()) as {
        config?: VectorStoreConfig;
        error?: { message?: string };
      };

      if (!res.ok) {
        setFormError(data.error?.message ?? "Failed to create config");
        return;
      }

      if (data.config) {
        setConfigs((prev) => [...prev, data.config!]);
      }

      setShowForm(false);
      setForm({ provider: "PGVECTOR", connectionString: "" });
      router.refresh();
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--app-bg-secondary, #1a1a2e)",
    border: "1px solid var(--app-border, rgba(255,255,255,0.08))",
    borderRadius: "0.375rem",
    color: "var(--app-text-primary)",
    fontSize: "0.8rem",
    padding: "0.375rem 0.625rem",
    outline: "none",
    width: "100%",
  };

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
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: PROVIDER_COLORS[cfg.provider] ?? "#666",
                    background: `${PROVIDER_COLORS[cfg.provider] ?? "#666"}20`,
                    borderRadius: "9999px",
                    padding: "0.1rem 0.4rem",
                  }}
                >
                  {PROVIDER_LABELS[cfg.provider] ?? cfg.provider}
                </span>
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

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
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
      ) : (
        <form
          onSubmit={handleCreate}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            padding: "1rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--app-border, rgba(255,255,255,0.08))",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--app-text-primary)", margin: 0 }}>
            Add Vector Store Config
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--app-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                Provider
              </label>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="PGVECTOR">pgvector</option>
                <option value="PINECONE">Pinecone</option>
                <option value="QDRANT">Qdrant</option>
                <option value="WEAVIATE">Weaviate</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--app-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                Connection String
              </label>
              <input
                type="password"
                value={form.connectionString}
                onChange={(e) => setForm({ ...form, connectionString: e.target.value })}
                placeholder="postgresql://..."
                style={inputStyle}
                required
              />
            </div>
          </div>

          {formError && (
            <p style={{ fontSize: "0.72rem", color: "#ef4444" }}>{formError}</p>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                padding: "0.375rem 0.75rem",
                borderRadius: "0.375rem",
                border: "none",
                background: "var(--app-accent-green)",
                color: "#000",
                cursor: "pointer",
              }}
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                fontSize: "0.75rem",
                padding: "0.375rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid var(--app-border, rgba(255,255,255,0.08))",
                background: "transparent",
                color: "var(--app-text-muted)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
