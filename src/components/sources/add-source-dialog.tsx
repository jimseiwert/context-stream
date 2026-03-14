"use client";

import { useState } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType("WEBSITE");
    setUrl("");
    setName("");
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
