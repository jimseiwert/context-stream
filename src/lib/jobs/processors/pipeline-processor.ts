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

import { ContentExtractor } from '@/lib/scraper/content-extractor'
import { getEmbeddingProvider } from '@/lib/embeddings/provider'
import { upsertPage } from '@/lib/db/queries/pages'
import { createChunks } from '@/lib/db/queries/chunks'
import { RobotsParser } from '@/lib/scraper/robots-parser'
import { LlmsTxtParser } from '@/lib/scraper/llms-txt-parser'
import { SitemapParser } from '@/lib/scraper/sitemap-parser'
import * as cheerio from 'cheerio'

export interface PageTask {
  url: string
  depth: number
  stage: 'QUEUED' | 'FETCHING' | 'EXTRACTING' | 'EMBEDDING' | 'SAVING' | 'COMPLETED' | 'FAILED'
  html?: string
  content?: {
    title: string | null
    text: string
    html: string | null
    metadata: Record<string, any>
    checksum: string
  }
  error?: string
}

export interface PipelineProgress {
  queued: number
  fetching: number
  extracting: number
  embedding: number
  saving: number
  completed: number
  failed: number
  total: number
}

export interface PipelineConfig {
  startUrl: string
  domain: string
  sourceId: string
  maxPages: number
  maxDepth: number
  respectRobotsTxt: boolean
  fetchConcurrency?: number
  extractConcurrency?: number
  embeddingConcurrency?: number
  saveConcurrency?: number
  onProgress?: (progress: PipelineProgress) => void
}

export class PipelineProcessor {
  private tasks = new Map<string, PageTask>()
  private visited = new Set<string>()
  private robotsParser: RobotsParser
  private llmsTxtParser: LlmsTxtParser
  private sitemapParser: SitemapParser
  private contentExtractor: ContentExtractor
  private embeddingProvider: ReturnType<typeof getEmbeddingProvider>

  private fetchQueue: PageTask[] = []
  private extractQueue: PageTask[] = []
  private embedQueue: PageTask[] = []
  private saveQueue: PageTask[] = []

  private isProcessing = false
  private config: PipelineConfig

  constructor(config: PipelineConfig) {
    this.config = {
      fetchConcurrency: 5,
      extractConcurrency: 3,
      embeddingConcurrency: 2,
      saveConcurrency: 3,
      ...config,
    }
    this.robotsParser = new RobotsParser()
    this.llmsTxtParser = new LlmsTxtParser()
    this.sitemapParser = new SitemapParser()
    this.contentExtractor = new ContentExtractor()
    this.embeddingProvider = getEmbeddingProvider()
  }

  /**
   * Start the pipeline processing
   */
  async process(): Promise<{ completed: number; failed: number }> {
    console.log(`[Pipeline] Starting for ${this.config.startUrl}`)

    // Load robots.txt
    if (this.config.respectRobotsTxt) {
      console.log(`[Pipeline] Loading robots.txt for ${this.config.domain}`)
      await this.robotsParser.load(this.config.domain)
    }

    // Efficiency Strategy:
    // 1. Check for llms-full.txt (complete content in one file)
    // 2. Check for llms.txt (summary + links to pages)
    // 3. Check for sitemap.xml (list of URLs)
    // 4. Fall back to manual HTML crawling

    const baseUrl = `https://${this.config.domain}`
    let usedEfficientMethod = false

    // Try llms.txt first
    console.log(`[Pipeline] Checking for llms.txt files...`)
    const llmsTxtResult = await this.llmsTxtParser.check(baseUrl)

    if (llmsTxtResult.found && llmsTxtResult.type === 'full' && llmsTxtResult.content) {
      // llms-full.txt found - use complete content
      console.log(`[Pipeline] Found llms-full.txt! Using complete content.`)
      this.addTaskWithContent({
        url: `${baseUrl}/llms-full.txt`,
        depth: 0,
        stage: 'EXTRACTING',
        html: llmsTxtResult.content,
      })
      usedEfficientMethod = true
    } else if (llmsTxtResult.found && llmsTxtResult.type === 'summary' && llmsTxtResult.links) {
      // llms.txt found - use summary and linked pages
      console.log(`[Pipeline] Found llms.txt with ${llmsTxtResult.links.length} links`)

      // Add llms.txt content itself
      if (llmsTxtResult.content) {
        this.addTaskWithContent({
          url: `${baseUrl}/llms.txt`,
          depth: 0,
          stage: 'EXTRACTING',
          html: llmsTxtResult.content,
        })
      }

      // Add all linked pages
      for (const link of llmsTxtResult.links) {
        this.addTask({
          url: link,
          depth: 0,
          stage: 'QUEUED',
        })
      }
      usedEfficientMethod = true
    }

    // Try sitemap if llms.txt not found or incomplete
    if (!usedEfficientMethod) {
      console.log(`[Pipeline] Checking for sitemap.xml...`)
      const sitemapResult = await this.sitemapParser.parse(baseUrl)

      if (sitemapResult.found && sitemapResult.urls.length > 0) {
        console.log(`[Pipeline] Found sitemap with ${sitemapResult.urls.length} URLs`)

        // Add all URLs from sitemap
        for (const url of sitemapResult.urls) {
          this.addTask({
            url,
            depth: 0,
            stage: 'QUEUED',
          })
        }
        usedEfficientMethod = true
      }
    }

    // Fall back to manual crawling if no efficient method worked
    if (!usedEfficientMethod) {
      console.log(`[Pipeline] No llms.txt or sitemap found, using manual crawling`)
      this.addTask({
        url: this.config.startUrl,
        depth: 0,
        stage: 'QUEUED',
      })
    }

    this.isProcessing = true

    // Start parallel workers for each stage
    await Promise.all([
      this.runFetchWorkers(),
      this.runExtractWorkers(),
      this.runEmbedWorkers(),
      this.runSaveWorkers(),
    ])

    const stats = this.getProgress()
    console.log(`[Pipeline] Completed: ${stats.completed}, Failed: ${stats.failed}`)

    return {
      completed: stats.completed,
      failed: stats.failed,
    }
  }

  /**
   * Add a task to the pipeline
   */
  private addTask(task: PageTask) {
    // Skip if already visited or at max pages
    if (this.visited.has(task.url) || this.tasks.size >= this.config.maxPages) {
      return
    }

    // Skip if max depth exceeded
    if (task.depth > this.config.maxDepth) {
      return
    }

    // Check robots.txt
    if (this.config.respectRobotsTxt && !this.robotsParser.isAllowed(task.url)) {
      console.log(`[Pipeline] Blocked by robots.txt: ${task.url}`)
      return
    }

    // Check domain
    try {
      const urlDomain = new URL(task.url).hostname
      if (urlDomain !== this.config.domain && urlDomain !== `www.${this.config.domain}`) {
        return
      }
    } catch {
      return
    }

    this.visited.add(task.url)
    this.tasks.set(task.url, task)
    this.fetchQueue.push(task)
    this.reportProgress()
  }

  /**
   * Add a task with pre-fetched content (for llms.txt files)
   * Skips the FETCH stage and goes directly to EXTRACT
   */
  private addTaskWithContent(task: PageTask) {
    // Skip if already visited or at max pages
    if (this.visited.has(task.url) || this.tasks.size >= this.config.maxPages) {
      return
    }

    this.visited.add(task.url)
    this.tasks.set(task.url, task)
    this.extractQueue.push(task)
    this.reportProgress()
  }

  /**
   * Fetch workers - Download HTML
   */
  private async runFetchWorkers() {
    const workers = []
    for (let i = 0; i < this.config.fetchConcurrency!; i++) {
      workers.push(this.fetchWorker())
    }
    await Promise.all(workers)
  }

  private async fetchWorker() {
    while (this.isProcessing) {
      const task = this.fetchQueue.shift()
      if (!task) {
        await this.sleep(100)
        if (this.isDone()) break
        continue
      }

      try {
        task.stage = 'FETCHING'
        this.reportProgress()

        console.log(`[Pipeline] Fetching: ${task.url}`)
        const response = await fetch(task.url, {
          headers: {
            'User-Agent': 'ContextStream/1.0 (Documentation Indexer; +https://contextstream.ai)',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        task.html = await response.text()
        task.stage = 'EXTRACTING'
        this.extractQueue.push(task)
        this.reportProgress()

      } catch (error: any) {
        console.error(`[Pipeline] Fetch failed for ${task.url}:`, error.message)
        task.stage = 'FAILED'
        task.error = error.message
        this.reportProgress()
      }
    }
  }

  /**
   * Extract workers - Parse content and discover links
   */
  private async runExtractWorkers() {
    const workers = []
    for (let i = 0; i < this.config.extractConcurrency!; i++) {
      workers.push(this.extractWorker())
    }
    await Promise.all(workers)
  }

  private async extractWorker() {
    while (this.isProcessing) {
      const task = this.extractQueue.shift()
      if (!task || !task.html) {
        await this.sleep(100)
        if (this.isDone()) break
        continue
      }

      try {
        console.log(`[Pipeline] Extracting: ${task.url}`)

        // Extract content
        const content = await this.contentExtractor.extractFromHtml(task.html, task.url)
        task.content = content

        // Discover links from HTML
        const links = this.extractLinks(task.html, task.url)
        console.log(`[Pipeline] Found ${links.length} links from ${task.url}`)

        // Add discovered links to queue
        for (const link of links) {
          this.addTask({
            url: link,
            depth: task.depth + 1,
            stage: 'QUEUED',
          })
        }

        task.stage = 'EMBEDDING'
        this.embedQueue.push(task)
        this.reportProgress()

      } catch (error: any) {
        console.error(`[Pipeline] Extract failed for ${task.url}:`, error.message)
        task.stage = 'FAILED'
        task.error = error.message
        this.reportProgress()
      }
    }
  }

  /**
   * Embed workers - Generate vector embeddings
   */
  private async runEmbedWorkers() {
    const workers = []
    for (let i = 0; i < this.config.embeddingConcurrency!; i++) {
      workers.push(this.embedWorker())
    }
    await Promise.all(workers)
  }

  private async embedWorker() {
    while (this.isProcessing) {
      const task = this.embedQueue.shift()
      if (!task || !task.content) {
        await this.sleep(100)
        if (this.isDone()) break
        continue
      }

      try {
        console.log(`[Pipeline] Embedding: ${task.url}`)

        // Generate embeddings if content is long enough
        if (task.content.text && task.content.text.length > 50) {
          const chunks = await this.embeddingProvider.chunkAndEmbed(task.content.text)
          console.log(`[Pipeline] Generated ${chunks.length} chunks for ${task.url}`)

          // Store chunks in task for saving
          ;(task.content as any).chunks = chunks
        }

        task.stage = 'SAVING'
        this.saveQueue.push(task)
        this.reportProgress()

      } catch (error: any) {
        console.error(`[Pipeline] Embed failed for ${task.url}:`, error.message)
        task.stage = 'FAILED'
        task.error = error.message
        this.reportProgress()
      }
    }
  }

  /**
   * Save workers - Store in database
   */
  private async runSaveWorkers() {
    const workers = []
    for (let i = 0; i < this.config.saveConcurrency!; i++) {
      workers.push(this.saveWorker())
    }
    await Promise.all(workers)
  }

  private async saveWorker() {
    while (this.isProcessing) {
      const task = this.saveQueue.shift()
      if (!task || !task.content) {
        await this.sleep(100)
        if (this.isDone()) break
        continue
      }

      try {
        console.log(`[Pipeline] Saving: ${task.url}`)

        // Save page to database
        const { page } = await upsertPage({
          sourceId: this.config.sourceId,
          url: task.url,
          title: task.content.title,
          contentText: task.content.text,
          contentHtml: task.content.html,
          metadata: task.content.metadata,
        })

        // Save chunks with embeddings
        const chunks = (task.content as any).chunks
        if (chunks && chunks.length > 0) {
          await createChunks(
            chunks.map((chunk: any, chunkIndex: number) => ({
              pageId: page.id,
              chunkIndex,
              content: chunk.content,
              embedding: chunk.embedding,
              metadata: chunk.metadata,
            }))
          )
        }

        task.stage = 'COMPLETED'
        this.reportProgress()

      } catch (error: any) {
        console.error(`[Pipeline] Save failed for ${task.url}:`, error.message)
        task.stage = 'FAILED'
        task.error = error.message
        this.reportProgress()
      }
    }
  }

  /**
   * Extract links from HTML
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html)
    const links = new Set<string>()

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return

      try {
        // Resolve relative URLs
        const absolute = new URL(href, baseUrl).href

        // Remove hash and query params
        const clean = absolute.split('#')[0].split('?')[0]
        if (clean) {
          links.add(clean)
        }
      } catch {
        // Invalid URL, skip
      }
    })

    return Array.from(links)
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
    }

    for (const task of this.tasks.values()) {
      if (task.stage === 'FETCHING') progress.fetching++
      else if (task.stage === 'COMPLETED') progress.completed++
      else if (task.stage === 'FAILED') progress.failed++
    }

    return progress
  }

  /**
   * Report progress to callback
   */
  private reportProgress() {
    if (this.config.onProgress) {
      this.config.onProgress(this.getProgress())
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
        (t) => t.stage === 'COMPLETED' || t.stage === 'FAILED'
      )
    )
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.isProcessing = false
    await this.contentExtractor.cleanup()
  }
}
