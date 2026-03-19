"use client";

import { useState, useEffect, useRef } from "react";
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

export function AddSourceDialog({ open, onOpenChange }: AddSourceDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<SourceType>("WEBSITE");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [singlePage, setSinglePage] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [ragEngineConfigId, setRagEngineConfigId] = useState<string>("");
  const [vectorStoreConfigId, setVectorStoreConfigId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [ragConfigs, setRagConfigs] = useState<ConfigOption[]>([]);
  const [vectorStoreConfigs, setVectorStoreConfigs] = useState<ConfigOption[]>([]);

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
    setSinglePage(false);
    setFile(null);
    setRagEngineConfigId("");
    setVectorStoreConfigId("");
    setError(null);
    setIsLoading(false);
    setLoadingStep("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(value: boolean) {
    if (!value) reset();
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (type !== "DOCUMENT") {
      const trimmedUrl = url.trim();
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
    }

    if (type === "DOCUMENT" && !file) {
      setError("Please select a file to upload");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: create the source
      setLoadingStep(type === "DOCUMENT" ? "Creating source..." : "Adding source...");
      const body: Record<string, unknown> = {
        type,
        name: name.trim() || undefined,
        ragEngineConfigId: ragEngineConfigId || null,
        vectorStoreConfigId: vectorStoreConfigId || null,
      };

      if (type !== "DOCUMENT") {
        body.url = url.trim();
      }
      if (type === "WEBSITE" && singlePage) {
        body.config = { maxDepth: 0 };
      }

      const sourceRes = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!sourceRes.ok) {
        const data = (await sourceRes.json()) as { error?: { message?: string } | string };
        const msg = typeof data.error === "object"
          ? (data.error?.message ?? `Request failed with status ${sourceRes.status}`)
          : (data.error ?? `Request failed with status ${sourceRes.status}`);
        throw new Error(msg);
      }

      const { source } = (await sourceRes.json()) as { source: { id: string } };

      // Step 2: upload file for DOCUMENT sources
      if (type === "DOCUMENT" && file) {
        setLoadingStep("Uploading file...");
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(`/api/sources/${source.id}/documents`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = (await uploadRes.json()) as { error?: { message?: string } };
          throw new Error(data.error?.message ?? `Upload failed with status ${uploadRes.status}`);
        }
      }

      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  }

  const hasRagConfigs = ragConfigs.length > 0;
  const hasVectorStoreConfigs = vectorStoreConfigs.length > 0;
  const showConfigSection = hasRagConfigs || hasVectorStoreConfigs;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
          <DialogDescription>
            Connect a website, GitHub repository, or upload documents.
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

          {/* WEBSITE: URL + single-page toggle */}
          {type === "WEBSITE" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="source-url">Website URL</Label>
                <Input
                  id="source-url"
                  type="url"
                  placeholder="https://docs.example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSinglePage(false)}
                  className={[
                    "flex-1 py-1.5 px-3 rounded text-xs font-medium border transition-colors",
                    !singlePage
                      ? "border-[var(--app-accent-green)] text-[var(--app-accent-green)] bg-[var(--app-accent-green)]/10"
                      : "border-[var(--app-card-border)] text-[var(--app-text-secondary)] hover:border-[var(--app-text-secondary)]",
                  ].join(" ")}
                >
                  Crawl entire site
                </button>
                <button
                  type="button"
                  onClick={() => setSinglePage(true)}
                  className={[
                    "flex-1 py-1.5 px-3 rounded text-xs font-medium border transition-colors",
                    singlePage
                      ? "border-[var(--app-accent-green)] text-[var(--app-accent-green)] bg-[var(--app-accent-green)]/10"
                      : "border-[var(--app-card-border)] text-[var(--app-text-secondary)] hover:border-[var(--app-text-secondary)]",
                  ].join(" ")}
                >
                  Single page only
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                {singlePage
                  ? "Only the provided URL will be indexed."
                  : "We will crawl the site and index all reachable pages."}
              </p>
            </>
          )}

          {/* GITHUB: URL */}
          {type === "GITHUB" && (
            <div className="space-y-1.5">
              <Label htmlFor="source-url">GitHub Repository URL</Label>
              <Input
                id="source-url"
                type="url"
                placeholder="https://github.com/owner/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                We will index .md, .ts, .js, and .py files from the repository.
              </p>
            </div>
          )}

          {/* DOCUMENT: file picker */}
          {type === "DOCUMENT" && (
            <div className="space-y-1.5">
              <Label htmlFor="source-file">File</Label>
              <input
                ref={fileInputRef}
                id="source-file"
                type="file"
                accept=".pdf,.txt,.md,.mdx,.csv,.docx,.doc"
                disabled={isLoading}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm cursor-pointer rounded-md border px-3 py-1.5 bg-transparent"
                style={{
                  borderColor: "var(--app-card-border)",
                  color: "var(--app-text-primary)",
                }}
              />
              <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                Supported: PDF, TXT, MD, CSV, DOCX
              </p>
            </div>
          )}

          {/* Optional name */}
          <div className="space-y-1.5">
            <Label htmlFor="source-name">
              Name <span className="text-xs font-normal opacity-60">(optional)</span>
            </Label>
            <Input
              id="source-name"
              type="text"
              placeholder={type === "DOCUMENT" ? file?.name ?? "My Documents" : "My Documentation"}
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
              {isLoading ? (loadingStep || "Adding...") : type === "DOCUMENT" ? "Upload" : "Add Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
