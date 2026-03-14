"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceActions } from "./source-actions";
import { AddSourceDialog } from "./add-source-dialog";

interface Source {
  id: string;
  url: string;
  name: string | null;
  type: "WEBSITE" | "GITHUB" | "DOCUMENT";
  status: "PENDING" | "INDEXING" | "ACTIVE" | "ERROR" | "PAUSED";
  pageCount: number;
  lastScrapedAt: Date | string | null;
  createdAt: Date | string;
}

interface SourcesTableProps {
  sources: Source[];
}

const STATUS_BADGE_VARIANT: Record<
  string,
  "success" | "warning" | "error" | "info" | "default" | "secondary"
> = {
  ACTIVE: "success",
  INDEXING: "info",
  PENDING: "warning",
  ERROR: "error",
  PAUSED: "secondary",
};

const TYPE_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  WEBSITE: "default",
  GITHUB: "secondary",
  DOCUMENT: "outline",
};

function formatDate(date: Date | string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SourcesTable({ sources }: SourcesTableProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--app-text-primary)" }}
          >
            Sources
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--app-text-secondary)" }}
          >
            Manage your data sources — websites, GitHub repos, and document
            uploads.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Source</Button>
      </div>

      {/* Table */}
      {sources.length === 0 ? (
        <div className="app-card p-8 text-center">
          <p
            className="text-sm"
            style={{ color: "var(--app-text-secondary)" }}
          >
            No sources yet. Click{" "}
            <button
              className="underline"
              style={{ color: "var(--app-accent-green)" }}
              onClick={() => setAddOpen(true)}
            >
              Add Source
            </button>{" "}
            to get started.
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
                <th
                  className="text-left py-3 px-4 font-medium"
                  style={{ color: "var(--app-text-secondary)" }}
                >
                  Name / URL
                </th>
                <th
                  className="text-left py-3 px-4 font-medium"
                  style={{ color: "var(--app-text-secondary)" }}
                >
                  Type
                </th>
                <th
                  className="text-left py-3 px-4 font-medium"
                  style={{ color: "var(--app-text-secondary)" }}
                >
                  Status
                </th>
                <th
                  className="text-right py-3 px-4 font-medium"
                  style={{ color: "var(--app-text-secondary)" }}
                >
                  Pages
                </th>
                <th
                  className="text-left py-3 px-4 font-medium"
                  style={{ color: "var(--app-text-secondary)" }}
                >
                  Last Indexed
                </th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {sources.map((source, idx) => (
                <tr
                  key={source.id}
                  className={idx < sources.length - 1 ? "border-b" : ""}
                  style={{ borderColor: "var(--app-card-border)" }}
                >
                  <td className="py-3 px-4">
                    <div>
                      <p
                        className="font-medium truncate max-w-xs"
                        style={{ color: "var(--app-text-primary)" }}
                      >
                        {source.name || source.url}
                      </p>
                      {source.name && (
                        <p
                          className="text-xs truncate max-w-xs mt-0.5"
                          style={{ color: "var(--app-text-muted)" }}
                        >
                          {source.url}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={TYPE_BADGE_VARIANT[source.type] ?? "default"}>
                      {source.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={STATUS_BADGE_VARIANT[source.status] ?? "default"}
                    >
                      {source.status}
                    </Badge>
                  </td>
                  <td
                    className="py-3 px-4 text-right"
                    style={{ color: "var(--app-text-secondary)" }}
                  >
                    {source.pageCount.toLocaleString()}
                  </td>
                  <td
                    className="py-3 px-4"
                    style={{ color: "var(--app-text-secondary)" }}
                  >
                    {formatDate(source.lastScrapedAt)}
                  </td>
                  <td className="py-3 px-4">
                    <SourceActions
                      sourceId={source.id}
                      sourceName={source.name ?? source.url}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
