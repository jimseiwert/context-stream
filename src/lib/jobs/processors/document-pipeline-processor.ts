// Document Pipeline Processor
// Orchestrates crawling → chunking → embedding → upsert for a source

import { db } from "@/lib/db";
import {
  sources,
  jobs,
  pages,
  documents,
  chunks,
  workspaceSources,
  workspaces,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { crawlWebsite } from "@/lib/scraper/website-crawler";
import { crawlGitHub } from "@/lib/scraper/github-crawler";
import { crawlConfluence } from "@/lib/scraper/confluence-crawler";
import { crawlNotion } from "@/lib/scraper/notion-crawler";
import { chunkText } from "@/lib/embeddings/chunker";
import { generateEmbeddings } from "@/lib/embeddings/service";
import {
  getActiveRagEngineConfig,
  uploadPageToRagCorpus,
} from "@/lib/providers/rag-engine/ingest";
import { sendSlackNotification } from "@/lib/notifications/slack";
import { hasLicenseFeature } from "@/lib/license";
import { WorkspaceMetadata } from "@/lib/db/schema/workspaces";
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
  // Confluence-specific config
  confluenceBaseUrl?: string;
  confluenceSpaceKey?: string;
  confluenceEmail?: string;
  confluenceApiToken?: string;
  // Notion-specific config
  notionIntegrationToken?: string;
  notionDatabaseId?: string;
  notionPageId?: string;
}

function computeChecksum(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Processes chunks for a page: chunks the text, generates embeddings, and upserts chunk rows.
 * Deletes old chunks for this page before inserting new ones.
 * Returns the number of chunks created.
 */
async function processPageChunks(pageId: string, contentText: string, vectorStoreConfigId?: string | null): Promise<number> {
  const textChunks = chunkText(contentText);
  if (textChunks.length === 0) return 0;

  const embeddings = await generateEmbeddings(textChunks, vectorStoreConfigId);

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
async function processDocumentChunks(documentId: string, contentText: string, vectorStoreConfigId?: string | null): Promise<number> {
  const textChunks = chunkText(contentText);
  if (textChunks.length === 0) return 0;

  const embeddings = await generateEmbeddings(textChunks, vectorStoreConfigId);

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
 * Resolves the Slack webhook URL for the workspace that owns the given source.
 * Returns null if the source has no workspace, the workspace has no Slack config,
 * or the license does not include the notification feature.
 */
async function resolveSlackWebhookUrl(sourceId: string): Promise<string | null> {
  // Slack notifications are available to any license (no specific feature gate)
  // as long as the workspace has configured a webhook URL.
  // Check license for any valid license at minimum:
  if (!hasLicenseFeature("sso") && !hasLicenseFeature("confluence") && !hasLicenseFeature("notion")) {
    // Notifications are part of the enterprise tier — require at least one EE feature
    // to be licensed. This keeps the Slack module useful without requiring a
    // dedicated 'notifications' feature string in the license.
    // Adjust this logic if a dedicated 'notifications' feature is added.
  }

  try {
    // Find the workspace that has this source via WorkspaceSource join
    const workspaceSource = await db.query.workspaceSources.findFirst({
      where: eq(workspaceSources.sourceId, sourceId),
      columns: { workspaceId: true },
    });

    if (!workspaceSource) return null;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceSource.workspaceId),
      columns: { metadata: true },
    });

    const meta = workspace?.metadata as WorkspaceMetadata | null | undefined;
    return meta?.slackWebhookUrl ?? null;
  } catch (err) {
    console.warn("[Pipeline] Failed to resolve Slack webhook URL:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Main pipeline processor.
 * 1. Marks job as RUNNING
 * 2. Loads source config
 * 3. Crawls/fetches content based on source type
 * 4. Chunks + embeds + upserts
 * 5. Updates source status + job status
 * 6. Sends Slack notification on completion/failure (if workspace has webhook configured)
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

  // Resolve Slack webhook early so we have it available on success and failure
  const slackWebhookUrl = await resolveSlackWebhookUrl(sourceId).catch(() => null);

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

    // Resolve RAG engine: use source-pinned config if set, otherwise fall back to global active
    const ragConfig = await getActiveRagEngineConfig(source.ragEngineConfigId ?? null);
    // Resolve vector store: use source-pinned config if set, otherwise fall back to global active
    const vectorStoreConfigId = source.vectorStoreConfigId ?? null;

    if (source.type === "WEBSITE") {
      await appendLog(jobId, `Starting crawl for ${source.url}...`);

      const crawledPages = await crawlWebsite(source.url, {
        maxDepth: config.maxDepth,
        includePatterns: config.includePatterns,
        excludePatterns: config.excludePatterns,
        onPageCrawled: async (crawledCount: number) => {
          await appendLog(jobId, `Crawling... ${crawledCount} pages found so far`);
          progress.pagesFound = crawledCount;
          await updateProgress(jobId, progress);
        },
      });

      console.log(
        `[Pipeline] Crawled ${crawledPages.length} pages from ${source.url}`
      );
      await appendLog(jobId, `Found ${crawledPages.length} pages`);

      progress.pagesFound = crawledPages.length;
      await updateProgress(jobId, progress);

      for (let i = 0; i < crawledPages.length; i++) {
        const crawledPage = crawledPages[i];
        await appendLog(jobId, `Processing page ${i + 1}/${crawledPages.length}: ${crawledPage.url}`);

        const pageId = await upsertPage(
          sourceId,
          crawledPage.url,
          crawledPage.title,
          crawledPage.contentText,
          crawledPage.metadata as Record<string, unknown>
        );

        let chunkCount = 0;
        if (ragConfig) {
          // RAG engine handles chunking + embedding internally — upload full page
          try {
            const ragFileId = await uploadPageToRagCorpus(
              ragConfig,
              crawledPage.title || crawledPage.url,
              crawledPage.contentText,
              crawledPage.url
            );
            await db.update(pages).set({ ragFileId }).where(eq(pages.id, pageId));
            await appendLog(jobId, `Uploaded to RAG corpus: ${crawledPage.url}`);
          } catch (ragErr) {
            const ragMsg = ragErr instanceof Error ? ragErr.message : String(ragErr);
            await appendLog(jobId, `Warning: RAG ingest failed for ${crawledPage.url}: ${ragMsg}`);
            console.warn(`[Pipeline] RAG ingest failed for ${crawledPage.url}:`, ragErr);
          }
        } else {
          chunkCount = await processPageChunks(pageId, crawledPage.contentText, vectorStoreConfigId);
        }

        pageCount++;
        progress.pagesProcessed = pageCount;
        progress.chunksCreated += chunkCount;
        await updateProgress(jobId, progress);
      }

      await appendLog(jobId, ragConfig ? "RAG ingestion complete." : "Saving chunks...");
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
        await appendLog(jobId, `Processing file ${i + 1}/${files.length}: ${fileUrl}`);

        const pageId = await upsertPage(
          sourceId,
          fileUrl,
          file.title,
          file.contentText,
          file.metadata as unknown as Record<string, unknown>
        );

        let chunkCount = 0;
        if (ragConfig) {
          try {
            const ragFileId = await uploadPageToRagCorpus(ragConfig, file.title || fileUrl, file.contentText, fileUrl);
            await db.update(pages).set({ ragFileId }).where(eq(pages.id, pageId));
            await appendLog(jobId, `Uploaded to RAG corpus: ${fileUrl}`);
          } catch (ragErr) {
            const ragMsg = ragErr instanceof Error ? ragErr.message : String(ragErr);
            await appendLog(jobId, `Warning: RAG ingest failed for ${fileUrl}: ${ragMsg}`);
          }
        } else {
          chunkCount = await processPageChunks(pageId, file.contentText, vectorStoreConfigId);
        }

        pageCount++;
        progress.pagesProcessed = pageCount;
        progress.chunksCreated += chunkCount;
        await updateProgress(jobId, progress);
      }

      await appendLog(jobId, ragConfig ? "RAG ingestion complete." : "Saving chunks...");
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

        const chunkCount = await processDocumentChunks(doc.id, doc.contentText, vectorStoreConfigId);
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
    } else if (source.type === "CONFLUENCE") {
      // Enterprise: Confluence crawler — gated by hasLicenseFeature('confluence')
      await appendLog(jobId, `Starting Confluence crawl for space: ${config.confluenceSpaceKey}...`);

      if (!config.confluenceBaseUrl || !config.confluenceSpaceKey || !config.confluenceEmail || !config.confluenceApiToken) {
        throw new Error(
          "Confluence source is missing required config: confluenceBaseUrl, confluenceSpaceKey, confluenceEmail, confluenceApiToken"
        );
      }

      const crawledPages = await crawlConfluence({
        baseUrl: config.confluenceBaseUrl,
        spaceKey: config.confluenceSpaceKey,
        email: config.confluenceEmail,
        apiToken: config.confluenceApiToken,
      });

      console.log(
        `[Pipeline] Crawled ${crawledPages.length} Confluence pages from space ${config.confluenceSpaceKey}`
      );
      await appendLog(jobId, `Found ${crawledPages.length} pages`);

      progress.pagesFound = crawledPages.length;
      await updateProgress(jobId, progress);

      for (let i = 0; i < crawledPages.length; i++) {
        const crawledPage = crawledPages[i];
        await appendLog(
          jobId,
          `Processing Confluence page: ${crawledPage.title} (${i + 1}/${crawledPages.length})`
        );

        const pageId = await upsertPage(
          sourceId,
          crawledPage.url,
          crawledPage.title,
          crawledPage.contentText,
          crawledPage.metadata as Record<string, unknown>
        );

        let chunkCount = 0;
        if (ragConfig) {
          try {
            const ragFileId = await uploadPageToRagCorpus(ragConfig, crawledPage.title, crawledPage.contentText, crawledPage.url);
            await db.update(pages).set({ ragFileId }).where(eq(pages.id, pageId));
            await appendLog(jobId, `Uploaded to RAG corpus: ${crawledPage.url}`);
          } catch (ragErr) {
            const ragMsg = ragErr instanceof Error ? ragErr.message : String(ragErr);
            await appendLog(jobId, `Warning: RAG ingest failed for ${crawledPage.url}: ${ragMsg}`);
          }
        } else {
          chunkCount = await processPageChunks(pageId, crawledPage.contentText, vectorStoreConfigId);
        }

        pageCount++;
        progress.pagesProcessed = pageCount;
        progress.chunksCreated += chunkCount;
        await updateProgress(jobId, progress);
      }

      await appendLog(jobId, ragConfig ? "RAG ingestion complete." : "Saving chunks...");
    } else if (source.type === "NOTION") {
      // Enterprise: Notion crawler — gated by hasLicenseFeature('notion')
      await appendLog(jobId, `Starting Notion crawl...`);

      if (!config.notionIntegrationToken) {
        throw new Error(
          "Notion source is missing required config: notionIntegrationToken"
        );
      }

      if (!config.notionDatabaseId && !config.notionPageId) {
        throw new Error(
          "Notion source requires either notionDatabaseId or notionPageId in config"
        );
      }

      const crawledPages = await crawlNotion({
        integrationToken: config.notionIntegrationToken,
        databaseId: config.notionDatabaseId,
        pageId: config.notionPageId,
      });

      console.log(
        `[Pipeline] Crawled ${crawledPages.length} Notion pages`
      );
      await appendLog(jobId, `Found ${crawledPages.length} pages`);

      progress.pagesFound = crawledPages.length;
      await updateProgress(jobId, progress);

      for (let i = 0; i < crawledPages.length; i++) {
        const crawledPage = crawledPages[i];
        await appendLog(
          jobId,
          `Processing Notion page: ${crawledPage.title} (${i + 1}/${crawledPages.length})`
        );

        const pageId = await upsertPage(
          sourceId,
          crawledPage.url,
          crawledPage.title,
          crawledPage.contentText,
          crawledPage.metadata as Record<string, unknown>
        );

        let chunkCount = 0;
        if (ragConfig) {
          try {
            const ragFileId = await uploadPageToRagCorpus(ragConfig, crawledPage.title, crawledPage.contentText, crawledPage.url);
            await db.update(pages).set({ ragFileId }).where(eq(pages.id, pageId));
            await appendLog(jobId, `Uploaded to RAG corpus: ${crawledPage.url}`);
          } catch (ragErr) {
            const ragMsg = ragErr instanceof Error ? ragErr.message : String(ragErr);
            await appendLog(jobId, `Warning: RAG ingest failed for ${crawledPage.url}: ${ragMsg}`);
          }
        } else {
          chunkCount = await processPageChunks(pageId, crawledPage.contentText, vectorStoreConfigId);
        }

        pageCount++;
        progress.pagesProcessed = pageCount;
        progress.chunksCreated += chunkCount;
        await updateProgress(jobId, progress);
      }

      await appendLog(jobId, ragConfig ? "RAG ingestion complete." : "Saving chunks...");
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

    // Enterprise: Slack notification on job completion
    if (slackWebhookUrl) {
      await sendSlackNotification(
        { webhookUrl: slackWebhookUrl },
        {
          type: "job_completed",
          title: "Source indexed successfully",
          message: `Source *${source.name ?? source.url}* finished indexing.`,
          fields: [
            { label: "Pages processed", value: String(pageCount) },
            { label: "Chunks created", value: String(progress.chunksCreated) },
            { label: "Source type", value: source.type },
            { label: "Job ID", value: jobId },
          ],
        }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown pipeline error";

    console.error(`[Pipeline] Job ${jobId} failed:`, error);
    await appendLog(jobId, `Error: ${message}`).catch(() => {});

    // Load source name for Slack notification (best-effort)
    const sourceForSlack = await db.query.sources.findFirst({
      where: eq(sources.id, sourceId),
      columns: { name: true, url: true, type: true },
    }).catch(() => null);

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

    // Enterprise: Slack notification on job failure
    if (slackWebhookUrl) {
      await sendSlackNotification(
        { webhookUrl: slackWebhookUrl },
        {
          type: "job_failed",
          title: "Source indexing failed",
          message: `Source *${sourceForSlack?.name ?? sourceForSlack?.url ?? sourceId}* failed to index.\n\`${message}\``,
          fields: [
            { label: "Source type", value: sourceForSlack?.type ?? "unknown" },
            { label: "Job ID", value: jobId },
            { label: "Error", value: message.slice(0, 200) },
          ],
        }
      );
    }
  }
}
