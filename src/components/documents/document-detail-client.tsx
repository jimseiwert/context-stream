"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Globe,
  Github,
  Package,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChunkEditor, type Chunk as ChunkData } from "./chunk-editor";
import { toast } from "sonner";

interface ItemData {
  id: string;
  type: "page" | "document";
  title: string;
  url: string;
  contentText: string;
  mimeType?: string;
  size?: number;
  indexedAt: Date | string | null;
  updatedAt: Date | string;
  metadata: Record<string, unknown> | null;
  source: {
    id: string;
    name: string | null;
    type: "WEBSITE" | "GITHUB" | "DOCUMENT";
    url: string;
    status: "PENDING" | "INDEXING" | "ACTIVE" | "ERROR" | "PAUSED";
  };
  chunks: ChunkData[];
}

interface DocumentDetailClientProps {
  item: ItemData;
  tab: string;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "Not indexed";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TypeIcon({ item }: { item: ItemData }) {
  if (item.type === "page") {
    if (item.source.type === "GITHUB") return <Github size={16} />;
    return <Globe size={16} />;
  }
  if (item.mimeType?.includes("pdf")) return <FileText size={16} style={{ color: "#f87171" }} />;
  return <Package size={16} />;
}

function ContentPreview({ item }: { item: ItemData }) {
  const isCode =
    item.type === "document" &&
    (item.mimeType?.includes("javascript") ||
      item.mimeType?.includes("typescript") ||
      item.mimeType?.includes("python") ||
      item.title?.match(/\.(ts|js|py|sh|go|rs|java|cpp|c|rb|php)$/i));

  if (isCode) {
    const lang = item.title.split(".").pop() ?? "";
    return (
      <pre
        className="text-xs leading-relaxed overflow-auto max-h-[600px] p-4 rounded-lg"
        style={{
          background: "rgba(0,0,0,0.3)",
          color: "var(--app-text-secondary)",
          border: "1px solid var(--app-card-border)",
        }}
      >
        <code className={`language-${lang}`}>{item.contentText}</code>
      </pre>
    );
  }

  if (item.type === "page") {
    // Try to detect markdown
    const looksLikeMarkdown = item.contentText.match(/^#{1,6}\s|^\*\*|^-\s|\[.+\]\(.+\)/m);
    if (looksLikeMarkdown) {
      // Render as prose — simple markdown-like styling
      return (
        <div
          className="prose prose-sm prose-invert max-w-none overflow-auto max-h-[600px] p-4 rounded-lg text-sm leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.01)",
            border: "1px solid var(--app-card-border)",
            color: "var(--app-text-secondary)",
          }}
        >
          <pre className="whitespace-pre-wrap break-words font-sans">{item.contentText}</pre>
        </div>
      );
    }
    return (
      <div
        className="overflow-auto max-h-[600px] p-4 rounded-lg text-sm leading-relaxed"
        style={{
          background: "rgba(255,255,255,0.01)",
          border: "1px solid var(--app-card-border)",
          color: "var(--app-text-secondary)",
        }}
      >
        <pre className="whitespace-pre-wrap break-words font-sans">{item.contentText}</pre>
      </div>
    );
  }

  return (
    <pre
      className="text-xs leading-relaxed overflow-auto max-h-[600px] p-4 rounded-lg whitespace-pre-wrap break-words"
      style={{
        background: "rgba(0,0,0,0.2)",
        color: "var(--app-text-secondary)",
        border: "1px solid var(--app-card-border)",
      }}
    >
      {item.contentText}
    </pre>
  );
}

export function DocumentDetailClient({ item, tab: initialTab }: DocumentDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"preview" | "chunks">(
    initialTab === "chunks" ? "chunks" : "preview"
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [chunks, setChunks] = useState<ChunkData[]>(item.chunks);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${item.id}?type=${item.type}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Document deleted");
      router.push("/documents");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleChunkUpdated = (updated: ChunkData) => {
    setChunks((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--app-text-muted)" }}>
        <a href="/documents" style={{ color: "var(--app-text-muted)" }} className="hover:underline">
          Documents
        </a>
        <span>/</span>
        <span style={{ color: "var(--app-text-primary)" }} className="truncate max-w-sm">
          {item.title}
        </span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--app-card-border)",
              color: "var(--app-text-secondary)",
            }}
          >
            <TypeIcon item={item} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--app-text-primary)" }}>
              {item.title}
            </h1>
            <p className="text-xs mt-0.5 truncate max-w-lg" style={{ color: "var(--app-text-muted)" }}>
              {item.url}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              toast.info("Re-index queued");
            }}
          >
            <RefreshCw size={13} />
            Re-index
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={13} />
            Delete
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: preview + chunks tab */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab switcher */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg w-fit"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--app-card-border)" }}
          >
            {(["preview", "chunks"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="px-4 py-1.5 text-sm rounded-md capitalize transition-all"
                style={
                  activeTab === t
                    ? {
                        background: "rgba(16,185,129,0.12)",
                        color: "var(--app-accent-green, #10b981)",
                        fontWeight: 600,
                      }
                    : { color: "var(--app-text-secondary)" }
                }
              >
                {t === "chunks" ? `Chunks (${chunks.length})` : "Preview"}
              </button>
            ))}
          </div>

          {activeTab === "preview" && <ContentPreview item={item} />}

          {activeTab === "chunks" && (
            <div className="space-y-3">
              {chunks.length === 0 ? (
                <div className="app-card p-6 text-center">
                  <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
                    No chunks yet. This document may not have been indexed.
                  </p>
                </div>
              ) : (
                chunks.map((chunk) => (
                  <ChunkEditor
                    key={chunk.id}
                    chunk={chunk}
                    documentId={item.id}
                    onUpdated={handleChunkUpdated}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: metadata panel */}
        <div className="space-y-4">
          <div className="app-card p-4 space-y-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--app-text-primary)" }}>
              Metadata
            </h2>

            <div className="space-y-3 text-sm">
              {/* Source */}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                  Source
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={`/sources/${item.source.id}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--app-text-primary)" }}
                  >
                    {item.source.name ?? item.source.url}
                  </a>
                  <Badge variant="secondary" className="text-[10px]">
                    {item.source.type}
                  </Badge>
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                  Status
                </p>
                <Badge variant={item.indexedAt ? "success" : "warning"} className="text-[10px]">
                  {item.indexedAt ? "Indexed" : "Pending"}
                </Badge>
              </div>

              {/* URL/Path */}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                  {item.type === "page" ? "URL" : "Path"}
                </p>
                <div className="flex items-center gap-1.5">
                  <p
                    className="text-xs font-mono truncate flex-1"
                    style={{ color: "var(--app-text-secondary)" }}
                  >
                    {item.url}
                  </p>
                  {item.type === "page" && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--app-text-muted)" }}
                      className="flex-shrink-0 hover:text-white"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Mime type */}
              {item.mimeType && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                    Type
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--app-text-secondary)" }}>
                    {item.mimeType}
                  </p>
                </div>
              )}

              {/* Size */}
              {item.size != null && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                    Size
                  </p>
                  <p style={{ color: "var(--app-text-secondary)" }}>{formatSize(item.size)}</p>
                </div>
              )}

              {/* Indexed date */}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                  Indexed
                </p>
                <p style={{ color: "var(--app-text-secondary)" }}>
                  {formatDate(item.indexedAt)}
                </p>
              </div>

              {/* Updated date */}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                  Last updated
                </p>
                <p style={{ color: "var(--app-text-secondary)" }}>
                  {formatDate(item.updatedAt)}
                </p>
              </div>

              {/* Chunk count */}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                  Chunks
                </p>
                <p style={{ color: "var(--app-text-secondary)" }}>
                  {chunks.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <DocumentTags item={item} />
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{item.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {item.type} and all {chunks.length} associated
              chunks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Tags sub-component (inline for simplicity)
function DocumentTags({ item }: { item: ItemData }) {
  const initialTags = (item.metadata?.tags as string[] | undefined) ?? [];
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);

  const saveTags = async (newTags: string[]) => {
    setSaving(true);
    try {
      await fetch(`/api/documents/${item.id}?type=${item.type}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { tags: newTags } }),
      });
    } catch {
      toast.error("Failed to save tags");
    } finally {
      setSaving(false);
    }
  };

  const addTag = async (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    setInputVal("");
    await saveTags(next);
  };

  const removeTag = async (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    await saveTags(next);
  };

  return (
    <div className="app-card p-4 space-y-3">
      <h2 className="text-sm font-semibold" style={{ color: "var(--app-text-primary)" }}>
        Tags
      </h2>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "var(--app-accent-green, #10b981)",
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:opacity-70 transition-opacity"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
            No tags yet
          </p>
        )}
      </div>

      <input
        type="text"
        placeholder="Add tag + Enter"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(inputVal);
          }
        }}
        className="w-full px-3 py-1.5 text-xs rounded-md outline-none"
        style={{
          background: "var(--app-card-bg, rgba(255,255,255,0.04))",
          border: "1px solid var(--app-card-border)",
          color: "var(--app-text-primary)",
        }}
        disabled={saving}
      />
    </div>
  );
}
