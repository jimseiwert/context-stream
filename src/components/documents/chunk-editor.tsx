"use client";

import { useState } from "react";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface Chunk {
  id: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date | string;
  tokenCountEstimate: number;
  embeddingPreview?: number[];
}

interface ChunkEditorProps {
  chunk: Chunk;
  documentId: string;
  onUpdated?: (updated: Chunk) => void;
}

export function ChunkEditor({ chunk, documentId, onUpdated }: ChunkEditorProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(chunk.content);
  const [saving, setSaving] = useState(false);

  const tokenEst = chunk.tokenCountEstimate ?? Math.ceil(chunk.content.length / 4);

  const handleSave = async () => {
    if (content.trim() === chunk.content) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/chunks/${chunk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to update chunk");
      }

      const data = (await res.json()) as { chunk: Chunk };
      toast.success("Chunk updated and re-embedded");
      setEditing(false);
      onUpdated?.(data.chunk);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update chunk");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(chunk.content);
    setEditing(false);
  };

  return (
    <div
      className="rounded-lg p-4 space-y-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--app-card-border)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(16,185,129,0.1)",
              color: "var(--app-accent-green, #10b981)",
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            #{chunk.chunkIndex}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--app-text-muted)" }}
          >
            ~{tokenEst} tokens
          </span>
        </div>

        {!editing && (
          <button
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            style={{ color: "var(--app-text-muted)" }}
            aria-label="Edit chunk"
            onClick={() => setEditing(true)}
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-sm rounded-md resize-y outline-none font-mono"
            style={{
              background: "var(--app-card-bg, rgba(255,255,255,0.04))",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "var(--app-text-primary)",
              minHeight: "80px",
            }}
            autoFocus
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors"
              style={{
                color: "var(--app-text-secondary)",
                border: "1px solid var(--app-card-border)",
              }}
              onClick={handleCancel}
              disabled={saving}
            >
              <X size={12} />
              Cancel
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors"
              style={{
                background: saving ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.15)",
                color: "var(--app-accent-green, #10b981)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Saving & re-embedding...
                </>
              ) : (
                <>
                  <Check size={12} />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap break-words"
          style={{ color: "var(--app-text-secondary)" }}
        >
          {chunk.content}
        </p>
      )}

      {/* Embedding preview */}
      {chunk.embeddingPreview && chunk.embeddingPreview.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {chunk.embeddingPreview.slice(0, 8).map((v, i) => (
            <span
              key={i}
              className="font-mono text-[10px] px-1 py-0.5 rounded"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--app-text-muted)",
                border: "1px solid var(--app-card-border)",
              }}
            >
              {v.toFixed(4)}
            </span>
          ))}
          <span
            className="text-[10px]"
            style={{ color: "var(--app-text-muted)" }}
          >
            …
          </span>
        </div>
      )}
    </div>
  );
}
