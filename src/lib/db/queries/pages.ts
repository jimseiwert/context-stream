import { createHash } from "crypto";
import { db } from "@/lib/db";
import { pages, chunks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export interface UpsertPageInput {
  sourceId: string;
  url: string;
  title?: string | null;
  contentText: string;
  contentHtml?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function upsertPage(
  input: UpsertPageInput
): Promise<{ page: { id: string } }> {
  const checksum = createHash("sha256").update(input.contentText).digest("hex");

  const existing = await db.query.pages.findFirst({
    where: and(eq(pages.sourceId, input.sourceId), eq(pages.url, input.url)),
    columns: { id: true, checksum: true },
  });

  if (existing) {
    if (existing.checksum !== checksum) {
      // Content changed — update page and delete stale chunks
      await db
        .update(pages)
        .set({
          title: input.title ?? null,
          contentText: input.contentText,
          contentHtml: input.contentHtml ?? null,
          metadata: input.metadata ?? null,
          checksum,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, existing.id));

      await db.delete(chunks).where(eq(chunks.pageId, existing.id));
    }
    return { page: { id: existing.id } };
  }

  const [page] = await db
    .insert(pages)
    .values({
      sourceId: input.sourceId,
      url: input.url,
      title: input.title ?? null,
      contentText: input.contentText,
      contentHtml: input.contentHtml ?? null,
      metadata: input.metadata ?? null,
      checksum,
    })
    .returning({ id: pages.id });

  return { page };
}
