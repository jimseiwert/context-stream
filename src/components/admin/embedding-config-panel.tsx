"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Plus } from "lucide-react";

type EmbeddingConfig = {
  id: string;
  provider: string;
  model: string;
  dimensions: number;
  apiEndpoint: string | null;
  deploymentName: string | null;
  isActive: boolean;
  createdAt: Date | string;
};

interface EmbeddingConfigPanelProps {
  configs: EmbeddingConfig[];
}

const PROVIDER_COLORS: Record<string, string> = {
  OPENAI: "#10a37f",
  AZURE_OPENAI: "#0078d4",
  VERTEX_AI: "#4285f4",
};

export function EmbeddingConfigPanel({ configs: initialConfigs }: EmbeddingConfigPanelProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    provider: "OPENAI",
    model: "",
    dimensions: "1536",
    apiKey: "",
    apiEndpoint: "",
    deploymentName: "",
  });

  async function handleSetActive(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/embedding-config/${id}`, {
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
    if (!confirm("Delete this embedding config?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/embedding-config/${id}`, {
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
      const res = await fetch("/api/admin/embedding-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          model: form.model,
          dimensions: parseInt(form.dimensions, 10) || 1536,
          apiKey: form.apiKey,
          apiEndpoint: form.apiEndpoint || null,
          deploymentName: form.deploymentName || null,
        }),
      });

      const data = (await res.json()) as {
        config?: EmbeddingConfig;
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
      setForm({
        provider: "OPENAI",
        model: "",
        dimensions: "1536",
        apiKey: "",
        apiEndpoint: "",
        deploymentName: "",
      });
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
      {/* Config list */}
      {configs.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "var(--app-text-muted)" }}>
          No embedding configs configured yet.
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                {cfg.isActive ? (
                  <CheckCircle2 size={14} style={{ color: "var(--app-accent-green)", flexShrink: 0 }} />
                ) : (
                  <XCircle size={14} style={{ color: "var(--app-text-muted)", flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        color: PROVIDER_COLORS[cfg.provider] ?? "var(--app-text-muted)",
                        background: `${PROVIDER_COLORS[cfg.provider] ?? "#666"}20`,
                        borderRadius: "9999px",
                        padding: "0.1rem 0.4rem",
                      }}
                    >
                      {cfg.provider}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--app-text-primary)" }}>
                      {cfg.model}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--app-text-muted)" }}>
                      {cfg.dimensions}d
                    </span>
                  </div>
                  {cfg.apiEndpoint && (
                    <p style={{ fontSize: "0.68rem", color: "var(--app-text-muted)", marginTop: "0.15rem" }}>
                      {cfg.apiEndpoint}
                      {cfg.deploymentName ? ` / ${cfg.deploymentName}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
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

      {/* Add form toggle */}
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
          Add Config
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
            Add Embedding Config
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
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
                <option value="OPENAI">OpenAI</option>
                <option value="AZURE_OPENAI">Azure OpenAI</option>
                <option value="VERTEX_AI">Vertex AI</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--app-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                Model
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="text-embedding-3-small"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--app-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                Dimensions
              </label>
              <input
                type="number"
                value={form.dimensions}
                onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                placeholder="1536"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--app-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                API Key
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="sk-..."
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--app-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                API Endpoint (optional)
              </label>
              <input
                type="text"
                value={form.apiEndpoint}
                onChange={(e) => setForm({ ...form, apiEndpoint: e.target.value })}
                placeholder="https://api.openai.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--app-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                Deployment Name (Azure)
              </label>
              <input
                type="text"
                value={form.deploymentName}
                onChange={(e) => setForm({ ...form, deploymentName: e.target.value })}
                placeholder="my-deployment"
                style={inputStyle}
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
