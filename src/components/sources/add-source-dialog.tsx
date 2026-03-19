"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SourceType = "WEBSITE" | "GITHUB" | "DOCUMENT";

interface ConfigOption {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
}

const TYPE_LABELS: Record<SourceType, { label: string; placeholder: string; hint: string }> = {
  WEBSITE: {
    label: "Website URL",
    placeholder: "https://docs.example.com",
    hint: "We will crawl the site and index all reachable pages.",
  },
  GITHUB: {
    label: "GitHub Repository URL",
    placeholder: "https://github.com/owner/repo",
    hint: "We will index .md, .ts, .js, and .py files from the repository.",
  },
  DOCUMENT: {
    label: "Source URL (identifier)",
    placeholder: "https://example.com/docs",
    hint: "A DOCUMENT source holds uploaded files. You can upload files after creation.",
  },
};

export function AddSourceDialog({ open, onOpenChange }: AddSourceDialogProps) {
  const router = useRouter();
  const [type, setType] = useState<SourceType>("WEBSITE");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [ragEngineConfigId, setRagEngineConfigId] = useState<string>("");
  const [vectorStoreConfigId, setVectorStoreConfigId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ragConfigs, setRagConfigs] = useState<ConfigOption[]>([]);
  const [vectorStoreConfigs, setVectorStoreConfigs] = useState<ConfigOption[]>([]);

  // Fetch available configs when dialog opens
  useEffect(() => {
    if (!open) return;
    void Promise.all([
      fetch("/api/admin/rag-engine-config").then((r) => r.json()).catch(() => ({ configs: [] })),
      fetch("/api/admin/vector-store-config").then((r) => r.json()).catch(() => ({ configs: [] })),
    ]).then(([ragData, vsData]) => {
      setRagConfigs((ragData as { configs?: ConfigOption[] }).configs ?? []);
      setVectorStoreConfigs((vsData as { configs?: ConfigOption[] }).configs ?? []);
    });
  }, [open]);

  function reset() {
    setType("WEBSITE");
    setUrl("");
    setName("");
    setRagEngineConfigId("");
    setVectorStoreConfigId("");
    setError(null);
    setIsLoading(false);
  }

  function handleOpenChange(value: boolean) {
    if (!value) reset();
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    const trimmedName = name.trim();

    if (!trimmedUrl) {
      setError("URL is required");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Please enter a valid URL (e.g. https://...)");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmedUrl,
          type,
          name: trimmedName || undefined,
          ragEngineConfigId: ragEngineConfigId || null,
          vectorStoreConfigId: vectorStoreConfigId || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: { message?: string } };
        throw new Error(data.error?.message ?? `Request failed with status ${response.status}`);
      }

      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const typeInfo = TYPE_LABELS[type];
  const hasRagConfigs = ragConfigs.length > 0;
  const hasVectorStoreConfigs = vectorStoreConfigs.length > 0;
  const showConfigSection = hasRagConfigs || hasVectorStoreConfigs;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
          <DialogDescription>
            Connect a website, GitHub repository, or create a document source.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source type selector */}
          <div className="space-y-1.5">
            <Label>Source Type</Label>
            <div className="flex gap-2">
              {(["WEBSITE", "GITHUB", "DOCUMENT"] as SourceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={[
                    "flex-1 py-1.5 px-3 rounded text-xs font-medium border transition-colors",
                    type === t
                      ? "border-[var(--app-accent-green)] text-[var(--app-accent-green)] bg-[var(--app-accent-green)]/10"
                      : "border-[var(--app-card-border)] text-[var(--app-text-secondary)] hover:border-[var(--app-text-secondary)]",
                  ].join(" ")}
                >
                  {t === "WEBSITE" ? "Website" : t === "GITHUB" ? "GitHub" : "Document"}
                </button>
              ))}
            </div>
          </div>

          {/* URL input */}
          <div className="space-y-1.5">
            <Label htmlFor="source-url">{typeInfo.label}</Label>
            <Input
              id="source-url"
              type="url"
              placeholder={typeInfo.placeholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
              {typeInfo.hint}
            </p>
          </div>

          {/* Optional name */}
          <div className="space-y-1.5">
            <Label htmlFor="source-name">
              Name <span className="text-xs font-normal opacity-60">(optional)</span>
            </Label>
            <Input
              id="source-name"
              type="text"
              placeholder="My Documentation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Index config overrides */}
          {showConfigSection && (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-medium" style={{ color: "var(--app-text-secondary)" }}>
                Index Configuration{" "}
                <span className="font-normal opacity-60">(optional — uses system default if not set)</span>
              </p>

              {hasRagConfigs && (
                <div className="space-y-1.5">
                  <Label htmlFor="rag-engine-config">RAG Engine</Label>
                  <select
                    id="rag-engine-config"
                    value={ragEngineConfigId}
                    onChange={(e) => {
                      setRagEngineConfigId(e.target.value);
                      if (e.target.value) setVectorStoreConfigId("");
                    }}
                    disabled={isLoading}
                    className="w-full rounded-md border px-3 py-1.5 text-sm bg-transparent"
                    style={{
                      borderColor: "var(--app-card-border)",
                      color: "var(--app-text-primary)",
                    }}
                  >
                    <option value="">System default</option>
                    {ragConfigs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.provider}
                        {c.isActive ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasVectorStoreConfigs && (
                <div className="space-y-1.5">
                  <Label htmlFor="vector-store-config">Vector Store</Label>
                  <select
                    id="vector-store-config"
                    value={vectorStoreConfigId}
                    onChange={(e) => {
                      setVectorStoreConfigId(e.target.value);
                      if (e.target.value) setRagEngineConfigId("");
                    }}
                    disabled={isLoading}
                    className="w-full rounded-md border px-3 py-1.5 text-sm bg-transparent"
                    style={{
                      borderColor: "var(--app-card-border)",
                      color: "var(--app-text-primary)",
                    }}
                  >
                    <option value="">System default</option>
                    {vectorStoreConfigs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.provider}
                        {c.isActive ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                  {ragEngineConfigId && (
                    <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                      Disabled — RAG engine is selected (handles embedding internally).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
