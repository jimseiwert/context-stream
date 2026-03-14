"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SourceActionsProps {
  sourceId: string;
  sourceName: string;
}

export function SourceActions({ sourceId, sourceName }: SourceActionsProps) {
  const router = useRouter();
  const [isReindexing, setIsReindexing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reindexError, setReindexError] = useState<string | null>(null);

  async function handleReindex() {
    setIsReindexing(true);
    setReindexError(null);
    try {
      const response = await fetch(`/api/sources/${sourceId}/trigger`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to trigger re-index");
      }
      router.refresh();
    } catch (err) {
      setReindexError(err instanceof Error ? err.message : "Failed to trigger re-index");
    } finally {
      setIsReindexing(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      // Silently fail — page will refresh anyway
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {reindexError && (
        <span className="text-xs text-destructive">{reindexError}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleReindex}
        disabled={isReindexing}
      >
        {isReindexing ? "Queuing..." : "Re-index"}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Source</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{sourceName || sourceId}</strong> and all its indexed
              pages, documents, and embeddings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
