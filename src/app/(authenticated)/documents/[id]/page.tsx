// Document Detail Page — Server Component
// Shows page/document content preview, metadata, and chunks

import { db } from "@/lib/db";
import { pages, documents, chunks, sources } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { DocumentDetailClient } from "@/components/documents/document-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; tab?: string }>;
}

export default async function DocumentDetailPage({ params, searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const type = sp.type ?? "page";
  const tab = sp.tab ?? "preview";

  if (!["page", "document"].includes(type)) notFound();

  if (type === "page") {
    const row = await db.query.pages.findFirst({
      where: eq(pages.id, id),
      with: {
        source: {
          columns: { id: true, name: true, type: true, url: true, status: true },
        },
        chunks: {
          columns: {
            id: true,
            chunkIndex: true,
            content: true,
            metadata: true,
            createdAt: true,
            embedding: true,
          },
          orderBy: (c, { asc }) => [asc(c.chunkIndex)],
        },
      },
    });

    if (!row) notFound();

    const chunkData = row.chunks.map((c) => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      content: c.content,
      metadata: c.metadata as Record<string, unknown> | null,
      createdAt: c.createdAt,
      tokenCountEstimate: Math.ceil(c.content.length / 4),
      embeddingPreview: c.embedding ? c.embedding.slice(0, 8) : [],
    }));

    const item = {
      id: row.id,
      type: "page" as const,
      title: row.title ?? row.url,
      url: row.url,
      contentText: row.contentText,
      mimeType: undefined as string | undefined,
      size: undefined as number | undefined,
      indexedAt: row.indexedAt,
      updatedAt: row.updatedAt,
      metadata: row.metadata as Record<string, unknown> | null,
      source: row.source,
      chunks: chunkData,
    };

    return <DocumentDetailClient item={item} tab={tab} />;
  } else {
    const row = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      with: {
        source: {
          columns: { id: true, name: true, type: true, url: true, status: true },
        },
        chunks: {
          columns: {
            id: true,
            chunkIndex: true,
            content: true,
            metadata: true,
            createdAt: true,
            embedding: true,
          },
          orderBy: (c, { asc }) => [asc(c.chunkIndex)],
        },
      },
    });

    if (!row) notFound();

    const meta = row.metadata as Record<string, unknown> | null;

    const chunkData = row.chunks.map((c) => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      content: c.content,
      metadata: c.metadata as Record<string, unknown> | null,
      createdAt: c.createdAt,
      tokenCountEstimate: Math.ceil(c.content.length / 4),
      embeddingPreview: c.embedding ? c.embedding.slice(0, 8) : [],
    }));

    const item = {
      id: row.id,
      type: "document" as const,
      title: row.filename,
      url: row.source.url,
      contentText: row.contentText,
      mimeType: meta?.mimeType as string | undefined,
      size: row.size,
      indexedAt: row.indexedAt,
      updatedAt: row.updatedAt,
      metadata: meta,
      source: row.source,
      chunks: chunkData,
    };

    return <DocumentDetailClient item={item} tab={tab} />;
  }
}
