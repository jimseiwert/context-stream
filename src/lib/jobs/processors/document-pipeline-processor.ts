// Document Pipeline Processor
// Orchestrates crawling → chunking → embedding → upsert for a source

import { db } from "@/lib/db";
import {
  sources,
  jobs,
  pages,
  documents,
  chunks,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { crawlWebsite } from "@/lib/scraper/website-crawler";
import { crawlGitHub } from "@/lib/scraper/github-crawler";
import { chunkText } from "@/lib/embeddings/chunker";
import { generateEmbeddings } from "@/lib/embeddings/service";
import crypto from "crypto";

interface SourceConfig {
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  branch?: string;
  pathFilter?: string;
  fileTypes?: string[];
}

function computeChecksum(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Processes chunks for a page: chunks the text, generates embeddings, and upserts chunk rows.
 * Deletes old chunks for this page before inserting new ones.
 */
async function processPageChunks(pageId: string, contentText: string): Promise<void> {
  const textChunks = chunkText(contentText);
  if (textChunks.length === 0) return;

  const embeddings = await generateEmbeddings(textChunks);

  // Delete old chunks for this page
  await db.delete(chunks).where(eq(chunks.pageId, pageId));

  // Insert new chunks
  const chunkRows = textChunks.map((content, index) => ({
    pageId,
    chunkIndex: index,
    content,
    embedding: embeddings[index] ?? null,
    metadata: { charCount: content.length },
  }));

  if (chunkRows.length > 0) {
    // Insert in batches of 50 to avoid hitting parameter limits
    for (let i = 0; i < chunkRows.length; i += 50) {
      const batch = chunkRows.slice(i, i + 50);
      await db.insert(chunks).values(batch);
    }
  }
}

/**
 * Processes chunks for a document: similar to processPageChunks but uses documentId.
 */
async function processDocumentChunks(documentId: string, contentText: string): Promise<void> {
  const textChunks = chunkText(contentText);
  if (textChunks.length === 0) return;

  const embeddings = await generateEmbeddings(textChunks);

  // Delete old chunks for this document
  await db.delete(chunks).where(eq(chunks.documentId, documentId));

  const chunkRows = textChunks.map((content, index) => ({
    documentId,
    chunkIndex: index,
    content,
    embedding: embeddings[index] ?? null,
    metadata: { charCount: content.length },
  }));

  if (chunkRows.length > 0) {
    for (let i = 0; i < chunkRows.length; i += 50) {
      const batch = chunkRows.slice(i, i + 50);
      await db.insert(chunks).values(batch);
    }
  }
}

/**
 * Upserts a crawled page: inserts if new (by URL), updates if checksum changed.
 * Returns the page ID.
 */
async function upsertPage(
  sourceId: string,
  url: string,
  title: string,
  contentText: string,
  metadata: Record<string, unknown>
): Promise<string> {
  const checksum = computeChecksum(contentText);

  // Check if page already exists for this source+url
  const existing = await db.query.pages.findFirst({
    where: eq(pages.sourceId, sourceId),
    columns: { id: true, checksum: true, url: true },
  });

  // Use a more specific lookup by sourceId + url using raw query
  const existingByUrl = await db.query.pages.findFirst({
    where: (p, { and, eq: eqFn }) => and(eqFn(p.sourceId, sourceId), eqFn(p.url, url)),
    columns: { id: true, checksum: true },
  });

  if (existingByUrl) {
    if (existingByUrl.checksum === checksum) {
      // Content unchanged — skip
      return existingByUrl.id;
    }
    // Content changed — update
    await db
      .update(pages)
      .set({
        title,
        contentText,
        checksum,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, existingByUrl.id));
    return existingByUrl.id;
  }

  // Insert new page
  const [inserted] = await db
    .insert(pages)
    .values({
      sourceId,
      url,
      title,
      contentText,
      checksum,
      metadata,
    })
    .returning({ id: pages.id });

  return inserted.id;
}

/**
 * Main pipeline processor.
 * 1. Marks job as RUNNING
 * 2. Loads source config
 * 3. Crawls/fetches content based on source type
 * 4. Chunks + embeds + upserts
 * 5. Updates source status + job status
 */
export async function processDocumentPipeline(
  jobId: string,
  sourceId: string
): Promise<void> {
  // Mark job as RUNNING
  await db
    .update(jobs)
    .set({ status: "RUNNING", startedAt: new Date() })
    .where(eq(jobs.id, jobId));

  try {
    // Load source
    const source = await db.query.sources.findFirst({
      where: eq(sources.id, sourceId),
    });

    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    // Mark source as indexing
    await db
      .update(sources)
      .set({ status: "INDEXING" })
      .where(eq(sources.id, sourceId));

    const config = (source.config ?? {}) as SourceConfig;
    let pageCount = 0;

    if (source.type === "WEBSITE") {
      // Crawl website
      const crawledPages = await crawlWebsite(source.url, {
        maxDepth: config.maxDepth,
        includePatterns: config.includePatterns,
        excludePatterns: config.excludePatterns,
      });

      console.log(
        `[Pipeline] Crawled ${crawledPages.length} pages from ${source.url}`
      );

      for (const crawledPage of crawledPages) {
        const pageId = await upsertPage(
          sourceId,
          crawledPage.url,
          crawledPage.title,
          crawledPage.contentText,
          crawledPage.metadata as Record<string, unknown>
        );
        await processPageChunks(pageId, crawledPage.contentText);
        pageCount++;
      }
    } else if (source.type === "GITHUB") {
      // Crawl GitHub repo
      const files = await crawlGitHub(source.url, {
        branch: config.branch,
        pathFilter: config.pathFilter,
        fileTypes: config.fileTypes,
      });

      console.log(
        `[Pipeline] Fetched ${files.length} files from ${source.url}`
      );

      for (const file of files) {
        const fileUrl = file.metadata.repoUrl;
        const pageId = await upsertPage(
          sourceId,
          fileUrl,
          file.title,
          file.contentText,
          file.metadata as unknown as Record<string, unknown>
        );
        await processPageChunks(pageId, file.contentText);
        pageCount++;
      }
    } else if (source.type === "DOCUMENT") {
      // Process existing documents for this source (e.g., after re-index trigger)
      const sourceDocs = await db.query.documents.findMany({
        where: eq(documents.sourceId, sourceId),
        columns: { id: true, contentText: true },
      });

      for (const doc of sourceDocs) {
        await processDocumentChunks(doc.id, doc.contentText);

        // Mark document as indexed
        await db
          .update(documents)
          .set({ indexedAt: new Date() })
          .where(eq(documents.id, doc.id));

        pageCount++;
      }
    }

    // Update source: ACTIVE + timestamps + page count
    await db
      .update(sources)
      .set({
        status: "ACTIVE",
        lastScrapedAt: new Date(),
        lastUpdatedAt: new Date(),
        pageCount,
        errorMessage: null,
      })
      .where(eq(sources.id, sourceId));

    // Mark job as COMPLETED
    await db
      .update(jobs)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        result: { pageCount },
      })
      .where(eq(jobs.id, jobId));

    console.log(
      `[Pipeline] Job ${jobId} completed — processed ${pageCount} items for source ${sourceId}`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown pipeline error";

    console.error(`[Pipeline] Job ${jobId} failed:`, error);

    // Mark source as ERROR
    await db
      .update(sources)
      .set({ status: "ERROR", errorMessage: message })
      .where(eq(sources.id, sourceId))
      .catch(() => {});

    // Mark job as FAILED
    await db
      .update(jobs)
      .set({
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: message,
      })
      .where(eq(jobs.id, jobId))
      .catch(() => {});
  }
}
