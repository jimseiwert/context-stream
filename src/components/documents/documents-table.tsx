"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Globe,
  Github,
  Package,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
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
import { toast } from "sonner";

export interface DocumentItem {
  id: string;
  type: "page" | "document";
  title: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  mimeType?: string;
  size?: number;
  chunkCount: number;
  indexedAt: Date | string | null;
  createdAt: Date | string;
}

interface DocumentsTableProps {
  items: DocumentItem[];
  total: number;
  page: number;
  limit: number;
  onPageChange?: (page: number) => void;
}

type SortKey = "title" | "sourceName" | "type" | "size" | "chunkCount" | "indexedAt";
type SortDir = "asc" | "desc";

function formatDate(date: Date | string | null): string {
  if (!date) return "Not indexed";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TypeIcon({ type, sourceType, mimeType }: { type: "page" | "document"; sourceType: string; mimeType?: string }) {
  if (type === "page") {
    if (sourceType === "GITHUB") return <Github size={15} style={{ color: "var(--app-text-muted)" }} />;
    return <Globe size={15} style={{ color: "var(--app-text-muted)" }} />;
  }
  if (mimeType === "application/pdf" || mimeType?.includes("pdf")) {
    return <FileText size={15} style={{ color: "#f87171" }} />;
  }
  return <Package size={15} style={{ color: "var(--app-text-muted)" }} />;
}

function IndexedBadge({ indexedAt }: { indexedAt: Date | string | null }) {
  if (!indexedAt) {
    return (
      <Badge variant="warning" className="text-[10px] py-0">
        Pending
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="text-[10px] py-0">
      Indexed
    </Badge>
  );
}

export function DocumentsTable({ items, total, page, limit, onPageChange }: DocumentsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("indexedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.ceil(total / limit);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }, [selected.size, items]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const sortedItems = [...items].sort((a, b) => {
    let aVal: string | number | Date | null = null;
    let bVal: string | number | Date | null = null;
    switch (sortKey) {
      case "title": aVal = a.title; bVal = b.title; break;
      case "sourceName": aVal = a.sourceName; bVal = b.sourceName; break;
      case "type": aVal = a.type; bVal = b.type; break;
      case "size": aVal = a.size ?? 0; bVal = b.size ?? 0; break;
      case "chunkCount": aVal = a.chunkCount; bVal = b.chunkCount; break;
      case "indexedAt":
        aVal = a.indexedAt ? new Date(a.indexedAt).getTime() : 0;
        bVal = b.indexedAt ? new Date(b.indexedAt).getTime() : 0;
        break;
    }
    if (aVal === null) aVal = "";
    if (bVal === null) bVal = "";
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const selectedItems = items.filter((i) => selected.has(i.id));
      const results = await Promise.allSettled(
        selectedItems.map((item) =>
          fetch(`/api/documents/${item.id}?type=${item.type}`, { method: "DELETE" })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (succeeded > 0) {
        toast.success(`Deleted ${succeeded} item${succeeded !== 1 ? "s" : ""}`);
      }
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} item${failed !== 1 ? "s" : ""}`);
      }
      setSelected(new Set());
      setDeleteDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("An error occurred while deleting items");
    } finally {
      setDeleting(false);
    }
  };

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} style={{ color: "var(--app-accent-green)" }} />
      : <ChevronDown size={12} style={{ color: "var(--app-accent-green)" }} />;
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <Check size={14} style={{ color: "var(--app-accent-green)" }} />
          <span style={{ color: "var(--app-text-primary)" }}>
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                toast.info("Re-index functionality coming soon");
              }}
            >
              <RefreshCw size={12} />
              Re-index
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 size={12} />
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {items.length === 0 ? (
        <div className="app-card p-8 text-center">
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
            No documents found. Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="app-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: "var(--app-card-border)" }}
              >
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                    aria-label="Select all"
                  />
                </th>
                <th className="py-3 px-2 w-6" />
                <th
                  className="text-left py-3 px-4 font-medium cursor-pointer select-none"
                  style={{ color: "var(--app-text-secondary)" }}
                  onClick={() => handleSort("title")}
                >
                  <span className="flex items-center gap-1">
                    Name <SortIcon col="title" />
                  </span>
                </th>
                <th
                  className="text-left py-3 px-4 font-medium cursor-pointer select-none"
                  style={{ color: "var(--app-text-secondary)" }}
                  onClick={() => handleSort("sourceName")}
                >
                  <span className="flex items-center gap-1">
                    Source <SortIcon col="sourceName" />
                  </span>
                </th>
                <th
                  className="text-left py-3 px-4 font-medium cursor-pointer select-none"
                  style={{ color: "var(--app-text-secondary)" }}
                  onClick={() => handleSort("type")}
                >
                  <span className="flex items-center gap-1">
                    Type <SortIcon col="type" />
                  </span>
                </th>
                <th
                  className="text-right py-3 px-4 font-medium cursor-pointer select-none"
                  style={{ color: "var(--app-text-secondary)" }}
                  onClick={() => handleSort("size")}
                >
                  <span className="flex items-center gap-1 justify-end">
                    Size <SortIcon col="size" />
                  </span>
                </th>
                <th
                  className="text-left py-3 px-4 font-medium cursor-pointer select-none"
                  style={{ color: "var(--app-text-secondary)" }}
                  onClick={() => handleSort("indexedAt")}
                >
                  <span className="flex items-center gap-1">
                    Indexed <SortIcon col="indexedAt" />
                  </span>
                </th>
                <th
                  className="text-right py-3 px-4 font-medium cursor-pointer select-none"
                  style={{ color: "var(--app-text-secondary)" }}
                  onClick={() => handleSort("chunkCount")}
                >
                  <span className="flex items-center gap-1 justify-end">
                    Chunks <SortIcon col="chunkCount" />
                  </span>
                </th>
                <th className="py-3 px-4 w-8" />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`cursor-pointer transition-colors hover:bg-white/[0.02] ${idx < sortedItems.length - 1 ? "border-b" : ""}`}
                  style={{ borderColor: "var(--app-card-border)" }}
                  onClick={(e) => {
                    // Avoid navigation when clicking checkbox or action buttons
                    if ((e.target as HTMLElement).closest("input,button")) return;
                    router.push(`/documents/${item.id}?type=${item.type}`);
                  }}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded"
                      aria-label={`Select ${item.title}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="py-3 px-2">
                    <TypeIcon type={item.type} sourceType={item.sourceType} mimeType={item.mimeType} />
                  </td>
                  <td className="py-3 px-4">
                    <p
                      className="font-medium truncate max-w-xs"
                      style={{ color: "var(--app-text-primary)" }}
                    >
                      {item.title}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.sourceName}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <IndexedBadge indexedAt={item.indexedAt} />
                  </td>
                  <td
                    className="py-3 px-4 text-right"
                    style={{ color: "var(--app-text-secondary)" }}
                  >
                    {formatSize(item.size)}
                  </td>
                  <td
                    className="py-3 px-4"
                    style={{ color: "var(--app-text-secondary)" }}
                  >
                    {formatDate(item.indexedAt)}
                  </td>
                  <td
                    className="py-3 px-4 text-right"
                    style={{ color: "var(--app-text-secondary)" }}
                  >
                    {item.chunkCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "var(--app-text-muted)" }}
                      aria-label="Delete"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete "${item.title}"?`)) return;
                        const res = await fetch(`/api/documents/${item.id}?type=${item.type}`, {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          toast.success("Deleted");
                          router.refresh();
                        } else {
                          toast.error("Delete failed");
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p style={{ color: "var(--app-text-muted)" }}>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
            {total.toLocaleString()} items
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              Previous
            </Button>
            <span style={{ color: "var(--app-text-secondary)" }}>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected documents and all their chunks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={14} className="mr-1.5" />
                  Delete {selected.size} items
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
