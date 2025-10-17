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
import { getEmbeddingProvider, type EmbeddingProvider } from "@/lib/embeddings/provider";
import { getActiveEmbeddingConfig } from "@/lib/embeddings/config";
import { ContentExtractor } from "@/lib/scraper/content-extractor";
import { LlmsTxtParser } from "@/lib/scraper/llms-txt-parser";
import { RobotsParser } from "@/lib/scraper/robots-parser";
import { SitemapParser } from "@/lib/scraper/sitemap-parser";
import { BotProtectionDetector, type ProtectionLevel } from "@/lib/scraper/bot-protection-detector";
import { extractAndVerifyFavicon } from "@/lib/favicon-extractor";
import { prisma } from "@/lib/db";
import * as cheerio from "cheerio";

export interface PageTask {
  url: string;
  depth: number;
  referer?: string; // Page that linked to this one (for proper browser simulation)
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
  // Optional metadata updates (only included when they change)
  name?: string;
  logo?: string;
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
  checkCancellation?: () => Promise<boolean>; // Check if job has been cancelled
}

export class PipelineProcessor {
  private tasks = new Map<string, PageTask>();
  private visited = new Set<string>();
  private robotsParser: RobotsParser;
  private llmsTxtParser: LlmsTxtParser;
  private sitemapParser: SitemapParser;
  private contentExtractor: ContentExtractor;
  private botProtectionDetector: BotProtectionDetector;
  private embeddingProvider?: EmbeddingProvider; // MEMORY FIX: Reuse single provider instance

  private fetchQueue: PageTask[] = [];
  private extractQueue: PageTask[] = [];
  private embedQueue: PageTask[] = [];
  private saveQueue: PageTask[] = [];

  private isProcessing = false;
  private isCancelled = false;
  private config: PipelineConfig;
  private protectionLevel: ProtectionLevel = 'none';

  // Track best name score - always check first few pages to potentially find better metadata
  // During rescrape, we preserve existing good metadata by initializing with reasonable baseline scores
  private bestNameScore = 0;
  private pagesCheckedForMetadata = 0;
  private readonly MAX_PAGES_TO_CHECK_FOR_METADATA = 3;

  // Track sitemap URLs for merge with crawled URLs
  private sitemapUrls = new Set<string>();

  // Progress counters (independent of task map for accurate progress after cleanup)
  private totalTasksDiscovered = 0;
  private totalCompleted = 0;
  private totalFailed = 0;

  // Track failures by stage for detailed reporting
  private failuresByStage = {
    fetch: [] as Array<{ url: string; error: string }>,
    extract: [] as Array<{ url: string; error: string }>,
    insufficientContent: [] as Array<{ url: string; error: string }>,
    embed: [] as Array<{ url: string; error: string }>,
    save: [] as Array<{ url: string; error: string }>,
  };

  constructor(config: PipelineConfig) {
    // Store config with defaults
    // Note: Concurrency will be adjusted after bot protection detection in process()
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
    this.botProtectionDetector = new BotProtectionDetector();
  }

  /**
   * Start the pipeline processing
   */
  async process(): Promise<{ completed: number; failed: number }> {
    console.log(`[Pipeline] Starting for ${this.config.startUrl}`);

    // Check current metadata state - we'll always check first few pages to potentially find better metadata
    const currentSource = await prisma.source.findUnique({
      where: { id: this.config.sourceId },
      select: { name: true, logo: true },
    });

    // If we have an existing name, assume it had a decent score (70 = parsed from title)
    // This protects against replacing good names with worse ones during rescrape
    // We'll only update if we find og:site_name (100) or application-name (90)
    if (currentSource?.name) {
      this.bestNameScore = 70;
      console.log(`[Pipeline] Existing name found: "${currentSource.name}" (baseline score: ${this.bestNameScore})`);
    }

    console.log(`[Pipeline] Current metadata: name="${currentSource?.name || 'none'}", logo=${currentSource?.logo ? 'yes' : 'no'}`);
    console.log(`[Pipeline] Will check first ${this.MAX_PAGES_TO_CHECK_FOR_METADATA} pages for better metadata`);

    // Load robots.txt
    if (this.config.respectRobotsTxt) {
      console.log(`[Pipeline] Loading robots.txt for ${this.config.domain}`);
      await this.robotsParser.load(this.config.domain);
    }

    // Detect bot protection and adjust scraping behavior
    console.log(`[Pipeline] Detecting bot protection for ${this.config.startUrl}...`);
    const crawlDelay = this.robotsParser.getCrawlDelay();
    const protectionResult = await this.botProtectionDetector.detect(this.config.startUrl, crawlDelay);
    this.protectionLevel = protectionResult.level;

    console.log(`[Pipeline] ${protectionResult.details}`);

    // Adjust concurrency based on protection level
    const concurrencySettings = this.getConcurrencyForProtectionLevel(protectionResult.level);
    this.config.fetchConcurrency = concurrencySettings.fetch;
    console.log(`[Pipeline] Adjusted fetch concurrency to ${this.config.fetchConcurrency} based on protection level`);

    // Efficiency Strategy:
    // 1. Check for llms-full.txt (complete content in one file)
    // 2. Check for llms.txt (summary + links to pages)
    // 3. Check for sitemap.xml (list of URLs)
    // 4. Fall back to manual HTML crawling

    const baseUrl = `https://${this.config.domain}`;
    let usedEfficientMethod = false;

    // Try llms.txt first (check startUrl path, then domain)
    console.log(`[Pipeline] Checking for llms.txt files at ${this.config.startUrl} and ${baseUrl}...`);
    const llmsTxtResult = await this.llmsTxtParser.check(this.config.startUrl, baseUrl);

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

    // Try sitemap if llms.txt not found
    // Note: We store sitemap URLs but ALSO crawl manually to ensure completeness
    if (!usedEfficientMethod) {
      console.log(`[Pipeline] Checking for sitemap.xml...`);
      const sitemapResult = await this.sitemapParser.parse(baseUrl, this.config.maxPages);

      if (sitemapResult.found && sitemapResult.urls.length > 0) {
        console.log(
          `[Pipeline] Found sitemap with ${sitemapResult.urls.length} URLs (will merge with crawled URLs)`
        );

        // Store sitemap URLs for later merging with crawled results
        for (const url of sitemapResult.urls) {
          // Skip sitemaps, feeds, and other non-content files
          if (!this.isNonContentFile(url)) {
            // Normalize URL before storing
            const normalized = this.normalizeUrl(url);
            if (normalized) {
              this.sitemapUrls.add(normalized);
            }
          } else {
            console.log(`[Pipeline] Skipping non-content URL from sitemap: ${url}`);
          }
        }

        console.log(`[Pipeline] Stored ${this.sitemapUrls.size} sitemap URLs for later merge`);
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

    // After crawling completes, merge sitemap URLs with crawled URLs
    // Add any sitemap URLs that weren't discovered during crawling
    if (this.sitemapUrls.size > 0) {
      const missingSitemapUrls = Array.from(this.sitemapUrls).filter(
        (url) => !this.visited.has(url)
      );

      if (missingSitemapUrls.length > 0) {
        console.log(
          `[Pipeline] Found ${missingSitemapUrls.length} URLs in sitemap that weren't discovered during crawl`
        );
        console.log(`[Pipeline] Adding missing sitemap URLs to queue...`);

        // Add missing URLs to the queue
        for (const url of missingSitemapUrls) {
          this.addTask({
            url,
            depth: 0,
            stage: "QUEUED",
          });
        }

        // Process the additional URLs
        console.log(`[Pipeline] Processing additional ${missingSitemapUrls.length} URLs from sitemap...`);
        await Promise.all([
          this.runFetchWorkers(),
          this.runExtractWorkers(),
          this.runEmbedWorkers(),
          this.runSaveWorkers(),
        ]);
      } else {
        console.log(`[Pipeline] ✓ All sitemap URLs were discovered during crawl`);
      }
    }

    const stats = this.getProgress();
    console.log(
      `[Pipeline] Completed: ${stats.completed}, Failed: ${stats.failed}`
    );

    // Print detailed failure summary
    this.printFailureSummary();

    // Purge old URLs that weren't found in this scrape
    await this.purgeStalePages();

    return {
      completed: stats.completed,
      failed: stats.failed,
    };
  }

  /**
   * Purge pages that existed before but weren't found in current scrape
   */
  private async purgeStalePages() {
    try {
      console.log(`[Pipeline] Checking for stale pages to purge...`);

      // Get all existing pages for this source
      const existingPages = await prisma.page.findMany({
        where: { sourceId: this.config.sourceId },
        select: { id: true, url: true },
      });

      if (existingPages.length === 0) {
        console.log(`[Pipeline] No existing pages to check`);
        return;
      }

      // Find pages that weren't visited in this scrape
      const stalePageIds: string[] = [];
      for (const page of existingPages) {
        const normalizedUrl = this.normalizeUrl(page.url);
        if (normalizedUrl && !this.visited.has(normalizedUrl)) {
          stalePageIds.push(page.id);
        }
      }

      if (stalePageIds.length === 0) {
        console.log(`[Pipeline] ✓ No stale pages found`);
        return;
      }

      console.log(
        `[Pipeline] Found ${stalePageIds.length} stale pages (out of ${existingPages.length} total)`
      );
      console.log(`[Pipeline] Purging stale pages...`);

      // Delete stale pages (chunks will be cascade deleted)
      const deleteResult = await prisma.page.deleteMany({
        where: {
          id: { in: stalePageIds },
        },
      });

      console.log(
        `[Pipeline] ✓ Purged ${deleteResult.count} stale pages from database`
      );
    } catch (error: any) {
      console.error(`[Pipeline] Failed to purge stale pages:`, error.message);
      // Don't fail the entire scrape if purge fails
    }
  }

  /**
   * Print detailed failure summary by stage
   */
  private printFailureSummary() {
    const totalFailures =
      this.failuresByStage.fetch.length +
      this.failuresByStage.extract.length +
      this.failuresByStage.insufficientContent.length +
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
    printStageFailures('insufficient content', this.failuresByStage.insufficientContent);
    printStageFailures('embed', this.failuresByStage.embed);
    printStageFailures('save', this.failuresByStage.save);

    console.log(`\n${'='.repeat(80)}\n`);
  }

  /**
   * Add a task to the pipeline
   */
  private addTask(task: PageTask) {
    // Normalize URL to prevent duplicates
    // Remove trailing slash, hash, and query params
    const normalizedUrl = this.normalizeUrl(task.url);
    if (!normalizedUrl) {
      return; // Invalid URL
    }
    task.url = normalizedUrl;

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

    // Count all tasks (both initial seeds and discovered links) in total
    // This ensures queue count never exceeds total count
    this.totalTasksDiscovered++;

    this.reportProgress();
  }

  /**
   * Add a task with pre-fetched content (for llms.txt files)
   * Skips the FETCH stage and goes directly to EXTRACT
   */
  private addTaskWithContent(task: PageTask) {
    // Normalize URL to prevent duplicates
    // Remove trailing slash, hash, and query params
    const normalizedUrl = this.normalizeUrl(task.url);
    if (!normalizedUrl) {
      return; // Invalid URL
    }
    task.url = normalizedUrl;

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

    // Count all tasks (both initial seeds and discovered links) in total
    // This ensures queue count never exceeds total count
    this.totalTasksDiscovered++;

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
    while (this.isProcessing && !this.isCancelled) {
      // Check for cancellation every iteration
      if (this.config.checkCancellation) {
        const cancelled = await this.config.checkCancellation();
        if (cancelled) {
          console.log('[Pipeline] Cancellation detected, stopping fetch worker');
          this.isCancelled = true;
          break;
        }
      }

      const task = this.fetchQueue.shift();
      if (!task) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      // Build headers OUTSIDE try block so they're accessible in retry logic
      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": task.referer ? "same-origin" : "none",
        "Cache-Control": "max-age=0",
      };

      // Add Referer header if we followed a link (makes requests look legitimate)
      if (task.referer) {
        headers["Referer"] = task.referer;
      }

      try {
        // Skip non-content files
        if (this.isNonContentFile(task.url)) {
          console.log(`[Pipeline] Skipping non-content file: ${task.url}`);
          task.stage = "COMPLETED";
          this.totalCompleted++;
          this.reportProgress();
          continue;
        }

        task.stage = "FETCHING";
        this.reportProgress();

        console.log(`[Pipeline] Fetching: ${task.url}`);

        // Add delay based on detected protection level
        const delayRange = this.getDelayRangeForProtectionLevel(this.protectionLevel);
        if (delayRange.max > 0) {
          const delayMs = delayRange.min + Math.random() * (delayRange.max - delayRange.min);
          await this.sleep(delayMs);
        }

        // Fetch with explicit redirect handling to log redirect chains
        const response = await fetch(task.url, {
          headers,
          redirect: 'follow'
        });

        // Log if URL was redirected
        if (response.redirected && response.url !== task.url) {
          console.log(`[Pipeline] Redirected: ${task.url} → ${response.url}`);

          // Update task URL to the final redirected URL
          const finalUrl = response.url;
          const normalizedFinalUrl = this.normalizeUrl(finalUrl);

          if (normalizedFinalUrl && normalizedFinalUrl !== task.url) {
            this.visited.add(normalizedFinalUrl);
          }
        }

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
        // Special handling for 403: try with opposite trailing slash
        if (error.message.includes('HTTP 403') && !task.url.includes('?')) {
          const hasTrailingSlash = task.url.endsWith('/');
          const alternateUrl = hasTrailingSlash
            ? task.url.slice(0, -1) // Remove trailing slash
            : task.url + '/'; // Add trailing slash

          console.log(
            `[Pipeline] 403 error, retrying with ${hasTrailingSlash ? 'without' : 'with'} trailing slash: ${alternateUrl}`
          );

          try {
            const retryResponse = await fetch(alternateUrl, {
              headers,
              redirect: 'follow'
            });

            if (retryResponse.ok) {
              console.log(`[Pipeline] ✓ Retry successful! Using ${alternateUrl}`);

              // Update task URL to the working version
              task.url = alternateUrl;

              // Update visited set with the correct URL
              this.visited.delete(task.url);
              this.visited.add(alternateUrl);

              // Log redirect if it happened
              if (retryResponse.redirected && retryResponse.url !== alternateUrl) {
                console.log(`[Pipeline] Redirected: ${alternateUrl} → ${retryResponse.url}`);
              }

              const html = await retryResponse.text();
              task.html = html;
              task.stage = "EXTRACTING";
              this.extractQueue.push(task);
              this.reportProgress();
              continue; // Skip error handling, we succeeded
            }
          } catch (retryError: any) {
            console.log(`[Pipeline] Retry also failed: ${retryError.message}`);
          }
        }

        console.error(`[Pipeline] Fetch failed for ${task.url}: ${error.message}`);
        task.stage = "FAILED";
        task.error = `[FETCH] ${error.message}`;
        this.totalFailed++;
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
    while (this.isProcessing && !this.isCancelled) {
      // Check for cancellation every iteration
      if (this.config.checkCancellation) {
        const cancelled = await this.config.checkCancellation();
        if (cancelled) {
          console.log('[Pipeline] Cancellation detected, stopping extract worker');
          this.isCancelled = true;
          break;
        }
      }

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

        // Validate minimum content length
        const MIN_CONTENT_LENGTH = 100;
        if (!content.text || content.text.trim().length < MIN_CONTENT_LENGTH) {
          throw new Error(
            `Insufficient content (${content.text?.trim().length || 0} characters, minimum ${MIN_CONTENT_LENGTH})`
          );
        }

        task.content = content;

        // Check first few pages for metadata (name/logo) to find best values
        if (this.pagesCheckedForMetadata < this.MAX_PAGES_TO_CHECK_FOR_METADATA) {
          this.pagesCheckedForMetadata++;

          // Extract site name and update if better than current
          try {
            const siteNameResult = this.contentExtractor.extractSiteName(html);

            if (siteNameResult.name && siteNameResult.score > this.bestNameScore) {
              console.log(`[Pipeline] Found better site name: "${siteNameResult.name}" (score: ${siteNameResult.score}, previous: ${this.bestNameScore}) from ${task.url}`);

              // Update the database with the better name
              await prisma.source.update({
                where: { id: this.config.sourceId },
                data: { name: siteNameResult.name },
              });

              this.bestNameScore = siteNameResult.score;
              console.log(`[Pipeline] Updated source name to: ${siteNameResult.name}`);

              // Report progress with updated name
              this.reportProgressWithMetadata({ name: siteNameResult.name });
            }
          } catch (nameError: any) {
            console.error(`[Pipeline] Site name extraction failed for ${task.url}:`, nameError.message);
            // Don't fail the entire task if name extraction fails
          }

          // Always try to extract logo from first few pages (we may find a better one)
          try {
            console.log(`[Pipeline] Extracting logo from ${task.url}`);
            const logoUrl = await extractAndVerifyFavicon(html, task.url);

            if (logoUrl) {
              // Check if this is different from the current logo
              const currentSource = await prisma.source.findUnique({
                where: { id: this.config.sourceId },
                select: { logo: true },
              });

              if (!currentSource?.logo || currentSource.logo !== logoUrl) {
                // Update source with new logo URL
                await prisma.source.update({
                  where: { id: this.config.sourceId },
                  data: { logo: logoUrl },
                });

                console.log(`[Pipeline] ${currentSource?.logo ? 'Updated' : 'Saved'} logo: ${logoUrl}`);

                // Report progress with updated logo
                this.reportProgressWithMetadata({ logo: logoUrl });
              }
            }
          } catch (logoError: any) {
            console.error(`[Pipeline] Logo extraction failed for ${task.url}:`, logoError.message);
            // Don't fail the entire task if logo extraction fails
          }

          // Log when we've checked enough pages
          if (this.pagesCheckedForMetadata >= this.MAX_PAGES_TO_CHECK_FOR_METADATA) {
            const finalSource = await prisma.source.findUnique({
              where: { id: this.config.sourceId },
              select: { logo: true },
            });
            console.log(`[Pipeline] ✓ Checked ${this.MAX_PAGES_TO_CHECK_FOR_METADATA} pages for metadata (best name score: ${this.bestNameScore}, logo: ${finalSource?.logo ? 'yes' : 'no'})`);
          }
        }

        // Discover links from HTML
        const links = this.extractLinks(html, task.url);
        console.log(`[Pipeline] Found ${links.length} links from ${task.url}`);

        // Add discovered links to queue with referer (current page)
        for (const link of links) {
          this.addTask({
            url: link,
            depth: task.depth + 1,
            referer: task.url, // Pass current page as referer for followed links
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
        this.totalFailed++;

        // Categorize insufficient content failures separately
        if (error.message.includes('Insufficient content')) {
          this.failuresByStage.insufficientContent.push({ url: task.url, error: error.message });
        } else {
          this.failuresByStage.extract.push({ url: task.url, error: error.message });
        }

        this.reportProgress();
      }
    }
  }

  /**
   * Embed workers - Generate vector embeddings
   */
  private async runEmbedWorkers() {
    // MEMORY FIX: Initialize embedding provider once and reuse across all workers
    // This prevents creating a new Azure/OpenAI client for every single page
    this.embeddingProvider = await getEmbeddingProvider();

    const workers = [];
    for (let i = 0; i < this.config.embeddingConcurrency!; i++) {
      workers.push(this.embedWorker());
    }
    await Promise.all(workers);
  }

  private async embedWorker() {
    while (this.isProcessing && !this.isCancelled) {
      // Check for cancellation every iteration
      if (this.config.checkCancellation) {
        const cancelled = await this.config.checkCancellation();
        if (cancelled) {
          console.log('[Pipeline] Cancellation detected, stopping embed worker');
          this.isCancelled = true;
          break;
        }
      }

      const task = this.embedQueue.shift();
      if (!task || !task.content) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      try {
        // Check if page exists with same checksum to avoid wasting embedding costs
        const existingPage = await prisma.page.findUnique({
          where: {
            sourceId_url: {
              sourceId: this.config.sourceId,
              url: task.url,
            },
          },
          select: { checksum: true },
        });

        // If content hasn't changed, skip embedding generation
        if (existingPage && existingPage.checksum === task.content.checksum) {
          console.log(
            `[Pipeline] Content unchanged for ${task.url}, skipping embedding`
          );
          task.stage = "SAVING";
          this.saveQueue.push(task);
          this.reportProgress();
          continue;
        }

        // Load active config to check batch API flags
        const embeddingConfig = await getActiveEmbeddingConfig();
        const isInitialScrape = this.config.isInitialScrape ?? true;

        // Determine if we should use batch API based on config flags
        const shouldUseBatch = isInitialScrape
          ? embeddingConfig.useBatchForNew
          : embeddingConfig.useBatchForRescrape;

        if (shouldUseBatch) {
          console.log(`[Pipeline] Skipping embedding for ${task.url} (batch API enabled for ${isInitialScrape ? 'new scrapes' : 'rescrapes'})`);
          task.stage = "SAVING";
          this.saveQueue.push(task);
          this.reportProgress();
          continue;
        }

        console.log(`[Pipeline] Embedding: ${task.url}`);

        // Generate embeddings if content is long enough
        if (task.content.text && task.content.text.length > 50) {
          // MEMORY FIX: Use the reused embedding provider instance
          // This prevents creating a new Azure/OpenAI client for every page
          if (!this.embeddingProvider) {
            throw new Error('Embedding provider not initialized');
          }
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
        this.totalFailed++;
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
    while (this.isProcessing && !this.isCancelled) {
      // Check for cancellation every iteration
      if (this.config.checkCancellation) {
        const cancelled = await this.config.checkCancellation();
        if (cancelled) {
          console.log('[Pipeline] Cancellation detected, stopping save worker');
          this.isCancelled = true;
          break;
        }
      }

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
        this.totalCompleted++;

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
    const lowerUrl = url.toLowerCase();

    // Skip sitemaps
    if (lowerUrl.includes('sitemap') && (lowerUrl.endsWith('.xml') || lowerUrl.endsWith('.xml.gz'))) {
      return true;
    }

    // Skip RSS/Atom feeds
    if (lowerUrl.endsWith('.rss') || lowerUrl.endsWith('.atom') || lowerUrl.includes('/feeds/') || lowerUrl.includes('/feed/')) {
      return true;
    }

    // Skip image files (discovered via logo extraction or linked from pages)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp'];
    if (imageExtensions.some(ext => lowerUrl.endsWith(ext))) {
      return true;
    }

    // Skip other non-HTML files
    const nonContentExtensions = ['.pdf', '.zip', '.tar', '.gz', '.json', '.csv', '.xlsx', '.doc', '.docx'];
    if (nonContentExtensions.some(ext => lowerUrl.endsWith(ext))) {
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

        // Skip image files and other non-content files
        // These may appear as links but shouldn't be crawled
        if (this.isNonContentFile(absolute)) {
          return;
        }

        // Normalize URL (same logic as addTask)
        const normalized = this.normalizeUrl(absolute);
        if (normalized) {
          links.add(normalized);
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
      completed: this.totalCompleted,  // Use persistent counter
      failed: this.totalFailed,  // Use persistent counter
      total: this.totalTasksDiscovered,  // Use persistent counter
    };

    // Still need to count FETCHING tasks from the map since they're actively being processed
    for (const task of Array.from(this.tasks.values())) {
      if (task.stage === "FETCHING") progress.fetching++;
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
   * Report progress with metadata updates (name/logo)
   * Only call this when metadata actually changes
   */
  private reportProgressWithMetadata(metadata: { name?: string; logo?: string }) {
    if (this.config.onProgress) {
      const progress = this.getProgress();
      this.config.onProgress({ ...progress, ...metadata });
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
   * Get concurrency settings based on protection level
   */
  private getConcurrencyForProtectionLevel(level: ProtectionLevel): { fetch: number } {
    switch (level) {
      case 'none':
        return { fetch: 5 }; // Default: 5 concurrent fetch workers
      case 'low':
        return { fetch: 3 }; // Moderate: 3 concurrent fetch workers
      case 'medium':
        return { fetch: 2 }; // Careful: 2 concurrent fetch workers
      case 'high':
        return { fetch: 1 }; // Very careful: 1 fetch worker (sequential)
      default:
        return { fetch: 5 };
    }
  }

  /**
   * Get delay range (min, max) in milliseconds based on protection level
   */
  private getDelayRangeForProtectionLevel(level: ProtectionLevel): { min: number; max: number } {
    switch (level) {
      case 'none':
        return { min: 0, max: 0 }; // No delay
      case 'low':
        return { min: 500, max: 1000 }; // 0.5-1 second delay
      case 'medium':
        return { min: 1000, max: 2000 }; // 1-2 second delay
      case 'high':
        return { min: 2000, max: 4000 }; // 2-4 second delay
      default:
        return { min: 0, max: 0 };
    }
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

    // MEMORY FIX: Cleanup embedding provider to release HTTP connections
    if (this.embeddingProvider) {
      await this.embeddingProvider.cleanup();
      this.embeddingProvider = undefined;
    }

    // MEMORY FIX: Clear all data structures to free memory
    this.tasks.clear();
    this.visited.clear();
    this.fetchQueue = [];
    this.extractQueue = [];
    this.embedQueue = [];
    this.saveQueue = [];

    console.log(`[Pipeline] Cleanup completed - all data structures cleared`);
  }

  /**
   * Normalize URL to prevent duplicates
   * - Remove hash fragments
   * - Remove query parameters (except for pages that require them)
   * - Lowercase hostname
   * - Smart trailing slash handling: preserve for directories, remove for files
   */
  private normalizeUrl(url: string): string | null {
    try {
      const parsed = new URL(url);

      // Lowercase hostname
      parsed.hostname = parsed.hostname.toLowerCase();

      // Remove hash
      parsed.hash = '';

      // Remove query params (most docs sites don't need them)
      // Note: Some sites use query params for content (e.g., search results)
      // but for documentation scraping, we typically want the canonical version
      parsed.search = '';

      // Trailing slash handling:
      // - Keep root path as-is: '/'
      // - Only remove trailing slash if path looks like a file (has extension)
      // - Preserve trailing slash for directory-like paths
      // This helps with servers that are strict about trailing slashes
      if (parsed.pathname !== '/') {
        const lastSegment = parsed.pathname.split('/').pop() || '';
        const hasFileExtension = lastSegment.includes('.') && !lastSegment.startsWith('.');

        // Only remove trailing slash for file paths with extensions
        if (hasFileExtension && parsed.pathname.endsWith('/')) {
          parsed.pathname = parsed.pathname.slice(0, -1);
        }
        // Otherwise preserve the original trailing slash (or lack thereof)
      }

      return parsed.href;
    } catch {
      return null;
    }
  }
}
