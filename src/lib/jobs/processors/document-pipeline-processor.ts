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
import { eq, sql } from "drizzle-orm";
import { crawlWebsite } from "@/lib/scraper/website-crawler";
import { crawlGitHub } from "@/lib/scraper/github-crawler";
import { chunkText } from "@/lib/embeddings/chunker";
import { generateEmbeddings } from "@/lib/embeddings/service";
import crypto from "crypto";

interface JobProgress {
  pagesFound: number;
  pagesProcessed: number;
  chunksCreated: number;
}

/**
 * Appends a timestamped log line to the job's logs column.
 */
async function appendLog(jobId: string, line: string): Promise<void> {
  const timestamped = `[${new Date().toISOString()}] ${line}`;
  await db
    .update(jobs)
    .set({
      logs: sql`COALESCE(logs, '') || ${timestamped + "\n"}`,
    })
    .where(eq(jobs.id, jobId))
    .catch((err) => {
      console.warn(`[Pipeline] Failed to append log for job ${jobId}:`, err);
    });
}

/**
 * Updates the progress jsonb on the job row.
 */
async function updateProgress(jobId: string, progress: JobProgress): Promise<void> {
  await db
    .update(jobs)
    .set({ progress })
    .where(eq(jobs.id, jobId))
    .catch((err) => {
      console.warn(`[Pipeline] Failed to update progress for job ${jobId}:`, err);
    });
}

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
 * Returns the number of chunks created.
 */
async function processPageChunks(pageId: string, contentText: string): Promise<number> {
  const textChunks = chunkText(contentText);
  if (textChunks.length === 0) return 0;

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

  return chunkRows.length;
}

/**
 * Processes chunks for a document: similar to processPageChunks but uses documentId.
 * Returns the number of chunks created.
 */
async function processDocumentChunks(documentId: string, contentText: string): Promise<number> {
  const textChunks = chunkText(contentText);
  if (textChunks.length === 0) return 0;

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

  return chunkRows.length;
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

  const progress: JobProgress = { pagesFound: 0, pagesProcessed: 0, chunksCreated: 0 };

  try {
    await appendLog(jobId, "Starting pipeline...");

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
      await appendLog(jobId, `Starting crawl for ${source.url}...`);

      const crawledPages = await crawlWebsite(source.url, {
        maxDepth: config.maxDepth,
        includePatterns: config.includePatterns,
        excludePatterns: config.excludePatterns,
      });

      console.log(
        `[Pipeline] Crawled ${crawledPages.length} pages from ${source.url}`
      );
      await appendLog(jobId, `Found ${crawledPages.length} pages`);

      progress.pagesFound = crawledPages.length;
      await updateProgress(jobId, progress);

      for (let i = 0; i < crawledPages.length; i++) {
        const crawledPage = crawledPages[i];
        await appendLog(jobId, `Crawling URL: ${crawledPage.url} (${i + 1}/${crawledPages.length})`);

        const pageId = await upsertPage(
          sourceId,
          crawledPage.url,
          crawledPage.title,
          crawledPage.contentText,
          crawledPage.metadata as Record<string, unknown>
        );

        await appendLog(jobId, `Chunking page ${i + 1}/${crawledPages.length}`);
        const chunkCount = await processPageChunks(pageId, crawledPage.contentText);

        await appendLog(jobId, `Generating embeddings for ${chunkCount} chunks`);
        pageCount++;
        progress.pagesProcessed = pageCount;
        progress.chunksCreated += chunkCount;
        await updateProgress(jobId, progress);
      }

      await appendLog(jobId, "Saving chunks...");
    } else if (source.type === "GITHUB") {
      await appendLog(jobId, `Starting crawl for GitHub repo: ${source.url}...`);

      const files = await crawlGitHub(source.url, {
        branch: config.branch,
        pathFilter: config.pathFilter,
        fileTypes: config.fileTypes,
      });

      console.log(
        `[Pipeline] Fetched ${files.length} files from ${source.url}`
      );
      await appendLog(jobId, `Found ${files.length} pages`);

      progress.pagesFound = files.length;
      await updateProgress(jobId, progress);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileUrl = file.metadata.repoUrl;
        await appendLog(jobId, `Crawling URL: ${fileUrl} (${i + 1}/${files.length})`);

        const pageId = await upsertPage(
          sourceId,
          fileUrl,
          file.title,
          file.contentText,
          file.metadata as unknown as Record<string, unknown>
        );

        await appendLog(jobId, `Chunking page ${i + 1}/${files.length}`);
        const chunkCount = await processPageChunks(pageId, file.contentText);

        await appendLog(jobId, `Generating embeddings for ${chunkCount} chunks`);
        pageCount++;
        progress.pagesProcessed = pageCount;
        progress.chunksCreated += chunkCount;
        await updateProgress(jobId, progress);
      }

      await appendLog(jobId, "Saving chunks...");
    } else if (source.type === "DOCUMENT") {
      // Process existing documents for this source (e.g., after re-index trigger)
      const sourceDocs = await db.query.documents.findMany({
        where: eq(documents.sourceId, sourceId),
        columns: { id: true, contentText: true },
      });

      await appendLog(jobId, `Found ${sourceDocs.length} pages`);
      progress.pagesFound = sourceDocs.length;
      await updateProgress(jobId, progress);

      for (let i = 0; i < sourceDocs.length; i++) {
        const doc = sourceDocs[i];
        await appendLog(jobId, `Chunking page ${i + 1}/${sourceDocs.length}`);

        const chunkCount = await processDocumentChunks(doc.id, doc.contentText);
        await appendLog(jobId, `Generating embeddings for ${chunkCount} chunks`);

        // Mark document as indexed
        await db
          .update(documents)
          .set({ indexedAt: new Date() })
          .where(eq(documents.id, doc.id));

        pageCount++;
        progress.pagesProcessed = pageCount;
        progress.chunksCreated += chunkCount;
        await updateProgress(jobId, progress);
      }

      await appendLog(jobId, "Saving chunks...");
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

    await appendLog(jobId, `Done. Processed ${pageCount} pages and ${progress.chunksCreated} chunks.`);

    // Mark job as COMPLETED
    await db
      .update(jobs)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        result: { pageCount },
        progress,
      })
      .where(eq(jobs.id, jobId));

    console.log(
      `[Pipeline] Job ${jobId} completed — processed ${pageCount} items for source ${sourceId}`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown pipeline error";

    console.error(`[Pipeline] Job ${jobId} failed:`, error);
    await appendLog(jobId, `Error: ${message}`).catch(() => {});

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
        progress,
      })
      .where(eq(jobs.id, jobId))
      .catch(() => {});
  }
}
