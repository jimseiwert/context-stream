/**
 * Pipeline Processor
 *
 * Efficient single-pass scraping with parallel stage processing:
 * 1. FETCH - Download HTML (once)
 * 2. EXTRACT - Parse content + discover links
 * 3. EMBED - Generate vector embeddings
 * 4. SAVE - Store in database
 *
 * Each page flows through stages in parallel for maximum efficiency.
 */

import { createChunks } from "@/lib/db/queries/chunks";
import { upsertPage } from "@/lib/db/queries/pages";
import { getEmbeddingProvider } from "@/lib/embeddings/provider";
import { ContentExtractor } from "@/lib/scraper/content-extractor";
import { LlmsTxtParser } from "@/lib/scraper/llms-txt-parser";
import { RobotsParser } from "@/lib/scraper/robots-parser";
import { SitemapParser } from "@/lib/scraper/sitemap-parser";
import { extractAndVerifyFavicon } from "@/lib/favicon-extractor";
import { prisma } from "@/lib/db";
import * as cheerio from "cheerio";

export interface PageTask {
  url: string;
  depth: number;
  stage:
    | "QUEUED"
    | "FETCHING"
    | "EXTRACTING"
    | "EMBEDDING"
    | "SAVING"
    | "COMPLETED"
    | "FAILED";
  html?: string;
  content?: {
    title: string | null;
    text: string;
    html: string | null;
    metadata: Record<string, any>;
    checksum: string;
  };
  error?: string;
}

export interface PipelineProgress {
  queued: number;
  fetching: number;
  extracting: number;
  embedding: number;
  saving: number;
  completed: number;
  failed: number;
  total: number;
}

export interface PipelineConfig {
  startUrl: string;
  domain: string;
  sourceId: string;
  maxPages: number;
  maxDepth: number;
  respectRobotsTxt: boolean;
  isInitialScrape?: boolean; // True for initial scrapes (real-time embeddings), false for re-scrapes (batch embeddings)
  fetchConcurrency?: number;
  extractConcurrency?: number;
  embeddingConcurrency?: number;
  saveConcurrency?: number;
  onProgress?: (progress: PipelineProgress) => void;
}

export class PipelineProcessor {
  private tasks = new Map<string, PageTask>();
  private visited = new Set<string>();
  private robotsParser: RobotsParser;
  private llmsTxtParser: LlmsTxtParser;
  private sitemapParser: SitemapParser;
  private contentExtractor: ContentExtractor;
  private embeddingProvider: ReturnType<typeof getEmbeddingProvider>;

  private fetchQueue: PageTask[] = [];
  private extractQueue: PageTask[] = [];
  private embedQueue: PageTask[] = [];
  private saveQueue: PageTask[] = [];

  private isProcessing = false;
  private config: PipelineConfig;
  private logoExtracted = false; // Track if we've extracted the favicon
  private nameExtracted = false; // Track if we've extracted the source name

  // Track failures by stage for detailed reporting
  private failuresByStage = {
    fetch: [] as Array<{ url: string; error: string }>,
    extract: [] as Array<{ url: string; error: string }>,
    embed: [] as Array<{ url: string; error: string }>,
    save: [] as Array<{ url: string; error: string }>,
  };

  constructor(config: PipelineConfig) {
    this.config = {
      fetchConcurrency: 5,
      extractConcurrency: 3,
      embeddingConcurrency: 2,
      saveConcurrency: 3,
      ...config,
    };
    this.robotsParser = new RobotsParser();
    this.llmsTxtParser = new LlmsTxtParser();
    this.sitemapParser = new SitemapParser();
    this.contentExtractor = new ContentExtractor();
    this.embeddingProvider = getEmbeddingProvider();
  }

  /**
   * Start the pipeline processing
   */
  async process(): Promise<{ completed: number; failed: number }> {
    console.log(`[Pipeline] Starting for ${this.config.startUrl}`);

    // Load robots.txt
    if (this.config.respectRobotsTxt) {
      console.log(`[Pipeline] Loading robots.txt for ${this.config.domain}`);
      await this.robotsParser.load(this.config.domain);
    }

    // Efficiency Strategy:
    // 1. Check for llms-full.txt (complete content in one file)
    // 2. Check for llms.txt (summary + links to pages)
    // 3. Check for sitemap.xml (list of URLs)
    // 4. Fall back to manual HTML crawling

    const baseUrl = `https://${this.config.domain}`;
    let usedEfficientMethod = false;

    // Try llms.txt first
    console.log(`[Pipeline] Checking for llms.txt files...`);
    const llmsTxtResult = await this.llmsTxtParser.check(baseUrl);

    if (
      llmsTxtResult.found &&
      llmsTxtResult.type === "full" &&
      llmsTxtResult.content
    ) {
      // llms-full.txt found - use complete content
      console.log(`[Pipeline] Found llms-full.txt! Using complete content.`);
      this.addTaskWithContent({
        url: `${baseUrl}/llms-full.txt`,
        depth: 0,
        stage: "EXTRACTING",
        html: llmsTxtResult.content,
      });
      usedEfficientMethod = true;
    } else if (
      llmsTxtResult.found &&
      llmsTxtResult.type === "summary" &&
      llmsTxtResult.links
    ) {
      // llms.txt found - use summary and linked pages
      console.log(
        `[Pipeline] Found llms.txt with ${llmsTxtResult.links.length} links`
      );

      // Add llms.txt content itself
      if (llmsTxtResult.content) {
        this.addTaskWithContent({
          url: `${baseUrl}/llms.txt`,
          depth: 0,
          stage: "EXTRACTING",
          html: llmsTxtResult.content,
        });
      }

      // Add all linked pages
      for (const link of llmsTxtResult.links) {
        this.addTask({
          url: link,
          depth: 0,
          stage: "QUEUED",
        });
      }
      usedEfficientMethod = true;
    }

    // Try sitemap if llms.txt not found or incomplete
    if (!usedEfficientMethod) {
      console.log(`[Pipeline] Checking for sitemap.xml...`);
      const sitemapResult = await this.sitemapParser.parse(baseUrl);

      if (sitemapResult.found && sitemapResult.urls.length > 0) {
        console.log(
          `[Pipeline] Found sitemap with ${sitemapResult.urls.length} URLs`
        );

        // Add all URLs from sitemap
        for (const url of sitemapResult.urls) {
          this.addTask({
            url,
            depth: 0,
            stage: "QUEUED",
          });
        }
        usedEfficientMethod = true;
      }
    }

    // Fall back to manual crawling if no efficient method worked
    if (!usedEfficientMethod) {
      console.log(
        `[Pipeline] No llms.txt or sitemap found, using manual crawling`
      );
      this.addTask({
        url: this.config.startUrl,
        depth: 0,
        stage: "QUEUED",
      });
    }

    this.isProcessing = true;

    // Start parallel workers for each stage
    await Promise.all([
      this.runFetchWorkers(),
      this.runExtractWorkers(),
      this.runEmbedWorkers(),
      this.runSaveWorkers(),
    ]);

    const stats = this.getProgress();
    console.log(
      `[Pipeline] Completed: ${stats.completed}, Failed: ${stats.failed}`
    );

    // Print detailed failure summary
    this.printFailureSummary();

    return {
      completed: stats.completed,
      failed: stats.failed,
    };
  }

  /**
   * Print detailed failure summary by stage
   */
  private printFailureSummary() {
    const totalFailures =
      this.failuresByStage.fetch.length +
      this.failuresByStage.extract.length +
      this.failuresByStage.embed.length +
      this.failuresByStage.save.length;

    if (totalFailures === 0) {
      console.log(`[Pipeline] ✅ No failures!`);
      return;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`[Pipeline] ❌ FAILURE SUMMARY (${totalFailures} total failures)`);
    console.log(`${'='.repeat(80)}`);

    // Group errors by message for better readability
    const printStageFailures = (stage: string, failures: Array<{ url: string; error: string }>) => {
      if (failures.length === 0) return;

      console.log(`\n📍 ${stage.toUpperCase()} Stage: ${failures.length} failures`);
      console.log(`${'-'.repeat(80)}`);

      // Group by error message
      const errorGroups = new Map<string, string[]>();
      for (const failure of failures) {
        const urls = errorGroups.get(failure.error) || [];
        urls.push(failure.url);
        errorGroups.set(failure.error, urls);
      }

      // Print grouped errors
      for (const [error, urls] of errorGroups) {
        console.log(`\n  Error: ${error}`);
        console.log(`  Affected URLs (${urls.length}):`);
        const displayCount = Math.min(urls.length, 10);
        for (let i = 0; i < displayCount; i++) {
          console.log(`    ${i + 1}. ${urls[i]}`);
        }
        if (urls.length > 10) {
          console.log(`    ... and ${urls.length - 10} more URLs`);
        }
      }
    };

    printStageFailures('fetch', this.failuresByStage.fetch);
    printStageFailures('extract', this.failuresByStage.extract);
    printStageFailures('embed', this.failuresByStage.embed);
    printStageFailures('save', this.failuresByStage.save);

    console.log(`\n${'='.repeat(80)}\n`);
  }

  /**
   * Add a task to the pipeline
   */
  private addTask(task: PageTask) {
    // Skip if already visited or at max pages
    if (this.visited.has(task.url) || this.tasks.size >= this.config.maxPages) {
      return;
    }

    // Skip if max depth exceeded
    if (task.depth > this.config.maxDepth) {
      return;
    }

    // Check robots.txt
    if (
      this.config.respectRobotsTxt &&
      !this.robotsParser.isAllowed(task.url)
    ) {
      console.log(`[Pipeline] Blocked by robots.txt: ${task.url}`);
      return;
    }

    // Check domain
    try {
      const urlDomain = new URL(task.url).hostname;
      if (
        urlDomain !== this.config.domain &&
        urlDomain !== `www.${this.config.domain}`
      ) {
        return;
      }
    } catch {
      return;
    }

    this.visited.add(task.url);
    this.tasks.set(task.url, task);
    this.fetchQueue.push(task);
    this.reportProgress();
  }

  /**
   * Add a task with pre-fetched content (for llms.txt files)
   * Skips the FETCH stage and goes directly to EXTRACT
   */
  private addTaskWithContent(task: PageTask) {
    // Skip if already visited or at max pages
    if (this.visited.has(task.url) || this.tasks.size >= this.config.maxPages) {
      return;
    }

    // Skip non-content files
    if (this.isNonContentFile(task.url)) {
      console.log(`[Pipeline] Skipping non-content file: ${task.url}`);
      return;
    }

    this.visited.add(task.url);
    this.tasks.set(task.url, task);
    this.extractQueue.push(task);
    this.reportProgress();
  }

  /**
   * Fetch workers - Download HTML
   */
  private async runFetchWorkers() {
    const workers = [];
    for (let i = 0; i < this.config.fetchConcurrency!; i++) {
      workers.push(this.fetchWorker());
    }
    await Promise.all(workers);
  }

  private async fetchWorker() {
    while (this.isProcessing) {
      const task = this.fetchQueue.shift();
      if (!task) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      try {
        // Skip non-content files
        if (this.isNonContentFile(task.url)) {
          console.log(`[Pipeline] Skipping non-content file: ${task.url}`);
          task.stage = "COMPLETED";
          this.reportProgress();
          continue;
        }

        task.stage = "FETCHING";
        this.reportProgress();

        console.log(`[Pipeline] Fetching: ${task.url}`);
        const response = await fetch(task.url, {
          headers: {
            "User-Agent":
              "ContextStream/1.0 (Documentation Indexer; +https://contextstream.ai)",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Log content type for debugging (not an error)
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
          console.log(`[Pipeline] Processing non-HTML content for ${task.url} (${contentType})`);
        }

        const html = await response.text();

        // Validate HTML content
        if (!html || typeof html !== 'string') {
          throw new Error(`Invalid response: expected string, got ${typeof html}`);
        }

        if (html.length === 0) {
          throw new Error('Empty response body');
        }

        task.html = html;
        task.stage = "EXTRACTING";
        this.extractQueue.push(task);
        this.reportProgress();
      } catch (error: any) {
        console.error(
          `[Pipeline] Fetch failed for ${task.url}:`,
          error.message
        );
        task.stage = "FAILED";
        task.error = `[FETCH] ${error.message}`;
        this.failuresByStage.fetch.push({ url: task.url, error: error.message });
        this.reportProgress();
      }
    }
  }

  /**
   * Extract workers - Parse content and discover links
   */
  private async runExtractWorkers() {
    const workers = [];
    for (let i = 0; i < this.config.extractConcurrency!; i++) {
      workers.push(this.extractWorker());
    }
    await Promise.all(workers);
  }

  private async extractWorker() {
    while (this.isProcessing) {
      const task = this.extractQueue.shift();
      if (!task || !task.html) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      try {
        console.log(`[Pipeline] Extracting: ${task.url}`);

        // Keep reference to HTML for operations below
        const html = task.html;

        // Validate HTML before processing
        if (!html || typeof html !== 'string') {
          throw new Error(`Invalid HTML content: expected string, got ${typeof html}`);
        }

        // Extract content
        const content = await this.contentExtractor.extractFromHtml(
          html,
          task.url
        );
        task.content = content;

        // Extract favicon from the first successfully processed page (only if missing)
        if (!this.logoExtracted) {
          this.logoExtracted = true; // Mark as attempted

          try {
            // Check if source already has a logo
            const currentSource = await prisma.source.findUnique({
              where: { id: this.config.sourceId },
              select: { logo: true },
            });

            if (!currentSource?.logo) {
              console.log(`[Pipeline] Extracting favicon from ${task.url}`);
              const faviconUrl = await extractAndVerifyFavicon(html, task.url);
              if (faviconUrl) {
                // Update source with favicon URL
                await prisma.source.update({
                  where: { id: this.config.sourceId },
                  data: { logo: faviconUrl },
                });
                console.log(`[Pipeline] Saved favicon: ${faviconUrl}`);
              } else {
                console.log(`[Pipeline] No valid favicon found on ${task.url}`);
              }
            } else {
              console.log(`[Pipeline] Logo already exists, skipping extraction`);
            }
          } catch (faviconError: any) {
            console.error(`[Pipeline] Favicon extraction failed:`, faviconError.message);
            // Don't fail the entire task if favicon extraction fails
          }
        }

        // Extract source name from the first successfully processed page (only if missing)
        if (!this.nameExtracted && task.content?.title) {
          this.nameExtracted = true; // Mark as attempted

          try {
            // Check if source already has a name
            const currentSource = await prisma.source.findUnique({
              where: { id: this.config.sourceId },
              select: { name: true },
            });

            if (!currentSource?.name) {
              console.log(`[Pipeline] Setting source name from first page: ${task.content.title}`);
              await prisma.source.update({
                where: { id: this.config.sourceId },
                data: { name: task.content.title },
              });
              console.log(`[Pipeline] Source name updated: ${task.content.title}`);
            } else {
              console.log(`[Pipeline] Name already exists, skipping extraction`);
            }
          } catch (nameError: any) {
            console.error(`[Pipeline] Source name extraction failed:`, nameError.message);
            // Don't fail the entire task if name extraction fails
          }
        }

        // Discover links from HTML
        const links = this.extractLinks(html, task.url);
        console.log(`[Pipeline] Found ${links.length} links from ${task.url}`);

        // Add discovered links to queue
        for (const link of links) {
          this.addTask({
            url: link,
            depth: task.depth + 1,
            stage: "QUEUED",
          });
        }

        // MEMORY FIX: Clear HTML after all extraction operations are complete
        task.html = undefined;

        task.stage = "EMBEDDING";
        this.embedQueue.push(task);
        this.reportProgress();
      } catch (error: any) {
        console.error(
          `[Pipeline] Extract failed for ${task.url}:`,
          error.message
        );
        task.stage = "FAILED";
        task.error = `[EXTRACT] ${error.message}`;
        this.failuresByStage.extract.push({ url: task.url, error: error.message });
        this.reportProgress();
      }
    }
  }

  /**
   * Embed workers - Generate vector embeddings
   */
  private async runEmbedWorkers() {
    const workers = [];
    for (let i = 0; i < this.config.embeddingConcurrency!; i++) {
      workers.push(this.embedWorker());
    }
    await Promise.all(workers);
  }

  private async embedWorker() {
    while (this.isProcessing) {
      const task = this.embedQueue.shift();
      if (!task || !task.content) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      try {
        // Skip embeddings for re-scrapes (will be processed via batch API later)
        const isInitialScrape = this.config.isInitialScrape ?? true;

        if (!isInitialScrape) {
          console.log(`[Pipeline] Skipping embedding for re-scrape: ${task.url} (will use batch API)`);
          task.stage = "SAVING";
          this.saveQueue.push(task);
          this.reportProgress();
          continue;
        }

        console.log(`[Pipeline] Embedding: ${task.url}`);

        // Generate embeddings if content is long enough
        if (task.content.text && task.content.text.length > 50) {
          const chunks = await this.embeddingProvider.chunkAndEmbed(
            task.content.text
          );
          console.log(
            `[Pipeline] Generated ${chunks.length} chunks for ${task.url}`
          );

          // Store chunks in task for saving
          (task.content as any).chunks = chunks;
        }

        task.stage = "SAVING";
        this.saveQueue.push(task);
        this.reportProgress();
      } catch (error: any) {
        console.error(
          `[Pipeline] Embed failed for ${task.url}:`,
          error.message
        );
        task.stage = "FAILED";
        task.error = `[EMBED] ${error.message}`;
        this.failuresByStage.embed.push({ url: task.url, error: error.message });
        this.reportProgress();
      }
    }
  }

  /**
   * Save workers - Store in database
   */
  private async runSaveWorkers() {
    const workers = [];
    for (let i = 0; i < this.config.saveConcurrency!; i++) {
      workers.push(this.saveWorker());
    }
    await Promise.all(workers);
  }

  private async saveWorker() {
    while (this.isProcessing) {
      const task = this.saveQueue.shift();
      if (!task || !task.content) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      try {
        console.log(`[Pipeline] Saving: ${task.url}`);

        // Save page to database
        const { page } = await upsertPage({
          sourceId: this.config.sourceId,
          url: task.url,
          title: task.content.title,
          contentText: task.content.text,
          contentHtml: task.content.html,
          metadata: task.content.metadata,
        });

        // Save chunks with embeddings
        const chunks = (task.content as any).chunks;
        if (chunks && chunks.length > 0) {
          await createChunks(
            chunks.map((chunk: any, chunkIndex: number) => ({
              pageId: page.id,
              chunkIndex,
              content: chunk.content,
              embedding: chunk.embedding,
              metadata: chunk.metadata,
            }))
          );
        }

        task.stage = "COMPLETED";

        // MEMORY FIX: Clear task data after completion to free memory
        task.content = undefined;
        task.html = undefined;

        this.reportProgress();

        // MEMORY FIX: Remove completed tasks from map every 50 completions
        const completedCount = Array.from(this.tasks.values()).filter(t => t.stage === "COMPLETED").length;
        if (completedCount % 50 === 0) {
          this.cleanupCompletedTasks();
        }
      } catch (error: any) {
        console.error(`[Pipeline] Save failed for ${task.url}:`, error.message);
        task.stage = "FAILED";
        task.error = `[SAVE] ${error.message}`;
        this.failuresByStage.save.push({ url: task.url, error: error.message });
        this.reportProgress();
      }
    }
  }

  /**
   * MEMORY FIX: Periodically remove completed tasks from memory
   */
  private cleanupCompletedTasks() {
    const initialSize = this.tasks.size;
    for (const [url, task] of Array.from(this.tasks.entries())) {
      if (task.stage === "COMPLETED" || task.stage === "FAILED") {
        this.tasks.delete(url);
      }
    }
    const removed = initialSize - this.tasks.size;
    if (removed > 0) {
      console.log(`[Pipeline] Cleaned up ${removed} completed tasks from memory`);
    }
  }

  /**
   * Check if URL points to a non-content file that should be skipped
   */
  private isNonContentFile(url: string): boolean {
    // Skip sitemaps
    if (url.includes('sitemap') && (url.endsWith('.xml') || url.endsWith('.xml.gz'))) {
      return true;
    }

    // Skip RSS/Atom feeds
    if (url.endsWith('.rss') || url.endsWith('.atom') || url.includes('/feeds/') || url.includes('/feed/')) {
      return true;
    }

    // Skip other non-HTML files
    const nonContentExtensions = ['.pdf', '.zip', '.tar', '.gz', '.json', '.csv', '.xlsx', '.doc', '.docx'];
    if (nonContentExtensions.some(ext => url.endsWith(ext))) {
      return true;
    }

    return false;
  }

  /**
   * Extract links from HTML
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links = new Set<string>();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      try {
        // Resolve relative URLs
        const absolute = new URL(href, baseUrl).href;

        // Remove hash and query params
        const clean = absolute.split("#")[0].split("?")[0];
        if (clean) {
          links.add(clean);
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return Array.from(links);
  }

  /**
   * Get current progress
   */
  private getProgress(): PipelineProgress {
    const progress = {
      queued: this.fetchQueue.length,
      fetching: 0,
      extracting: this.extractQueue.length,
      embedding: this.embedQueue.length,
      saving: this.saveQueue.length,
      completed: 0,
      failed: 0,
      total: this.tasks.size,
    };

    for (const task of Array.from(this.tasks.values())) {
      if (task.stage === "FETCHING") progress.fetching++;
      else if (task.stage === "COMPLETED") progress.completed++;
      else if (task.stage === "FAILED") progress.failed++;
    }

    return progress;
  }

  /**
   * Report progress to callback
   */
  private reportProgress() {
    if (this.config.onProgress) {
      this.config.onProgress(this.getProgress());
    }
  }

  /**
   * Check if all processing is done
   */
  private isDone(): boolean {
    return (
      this.fetchQueue.length === 0 &&
      this.extractQueue.length === 0 &&
      this.embedQueue.length === 0 &&
      this.saveQueue.length === 0 &&
      Array.from(this.tasks.values()).every(
        (t) => t.stage === "COMPLETED" || t.stage === "FAILED"
      )
    );
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.isProcessing = false;
    await this.contentExtractor.cleanup();

    // MEMORY FIX: Clear all data structures to free memory
    this.tasks.clear();
    this.visited.clear();
    this.fetchQueue = [];
    this.extractQueue = [];
    this.embedQueue = [];
    this.saveQueue = [];

    console.log(`[Pipeline] Cleanup completed - all data structures cleared`);
  }
}
