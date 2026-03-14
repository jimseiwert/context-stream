"use client";

import { useState } from "react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Props {
  initialKeys: ApiKey[];
}

export function ApiKeyManager({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newKeyName.trim();
    if (!name) return;

    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to create API key");
      }

      const data = await res.json() as {
        apiKey: { id: string; name: string; key: string; prefix: string; createdAt: string; expiresAt: string | null; lastUsedAt: string | null };
      };

      setRevealedKey(data.apiKey.key);
      setKeys((prev) => [
        {
          id: data.apiKey.id,
          name: data.apiKey.name,
          prefix: data.apiKey.prefix,
          createdAt: data.apiKey.createdAt,
          expiresAt: data.apiKey.expiresAt,
          lastUsedAt: data.apiKey.lastUsedAt,
        },
        ...prev,
      ]);
      setNewKeyName("");
      setIsCreating(false);
      toast.success("API key created. Copy it now — it won't be shown again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to revoke API key");
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      if (revealedKey) setRevealedKey(null);
      toast.success("API key revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  }

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Failed to copy")
    );
  }

  return (
    <div className="app-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="section-label">API Keys</p>
        <button
          onClick={() => setIsCreating((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md border transition-colors"
          style={{
            borderColor: "var(--app-card-border)",
            color: "var(--app-text-secondary)",
          }}
        >
          {isCreating ? "Cancel" : "New key"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="Key name (e.g. Production)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            maxLength={100}
            className="flex-1 text-sm px-3 py-1.5 rounded-md border bg-transparent"
            style={{
              borderColor: "var(--app-card-border)",
              color: "var(--app-text-primary)",
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !newKeyName.trim()}
            className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
            style={{
              background: "var(--app-accent-green)",
              color: "#000",
            }}
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      {revealedKey && (
        <div
          className="rounded-md p-3 border text-xs font-mono break-all"
          style={{
            borderColor: "var(--app-accent-green)",
            background: "rgba(16,185,129,0.06)",
            color: "var(--app-accent-green)",
          }}
        >
          <p className="mb-1 font-sans text-xs" style={{ color: "var(--app-text-secondary)" }}>
            Copy your key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <span className="flex-1 break-all">{revealedKey}</span>
            <button
              onClick={() => copyToClipboard(revealedKey)}
              className="shrink-0 text-xs px-2 py-1 rounded border"
              style={{
                borderColor: "var(--app-accent-green)",
                color: "var(--app-accent-green)",
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--app-text-muted)" }}>
          No API keys yet.
        </p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between py-2 border-t"
              style={{ borderColor: "var(--app-card-border)" }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--app-text-primary)" }}>
                  {k.name}
                </p>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--app-text-muted)" }}>
                  {k.prefix}••••••••
                  {k.lastUsedAt && (
                    <span className="ml-2 font-sans">
                      Last used {new Date(k.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(k.id)}
                className="ml-4 shrink-0 text-xs px-2 py-1 rounded border transition-colors"
                style={{
                  borderColor: "var(--app-accent-red)",
                  color: "var(--app-accent-red)",
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
