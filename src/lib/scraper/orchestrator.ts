// Scraper Orchestrator
// Main coordinator for web scraping operations

import { SourceType } from '@prisma/client'
import { ContentExtractor } from './content-extractor'
import { URLDiscovery } from './url-discovery'
import { RobotsParser } from './robots-parser'

export interface ScraperConfig {
  maxPages?: number
  maxDepth?: number
  concurrency?: number
  timeout?: number
  respectRobotsTxt?: boolean
  userAgent?: string
  includePatterns?: string[]
  excludePatterns?: string[]
}

export interface PageContent {
  url: string
  title: string | null
  text: string
  html: string | null
  metadata: Record<string, any>
  checksum: string
}

export interface ScrapeProgress {
  pagesScraped: number
  total: number
  errors: number
  currentPage: string
  percentage: number
}

export class ScraperOrchestrator {
  private contentExtractor: ContentExtractor
  private urlDiscovery: URLDiscovery
  private robotsParser: RobotsParser

  constructor() {
    this.contentExtractor = new ContentExtractor()
    this.urlDiscovery = new URLDiscovery()
    this.robotsParser = new RobotsParser()
  }

  /**
   * Scrape a documentation source
   */
  async scrapeSource(
    sourceUrl: string,
    domain: string,
    type: SourceType,
    config: ScraperConfig = {},
    onProgress?: (progress: ScrapeProgress) => void
  ): Promise<PageContent[]> {
    console.log(`[Orchestrator] Starting scrape for ${sourceUrl}`)
    console.log(`[Orchestrator] Domain: ${domain}, Type: ${type}`)
    console.log(`[Orchestrator] Config:`, config)

    const {
      maxPages = 1000,
      maxDepth = 10,
      respectRobotsTxt = true,
      concurrency = 5,
    } = config

    // 1. Load robots.txt if required
    if (respectRobotsTxt) {
      console.log(`[Orchestrator] Loading robots.txt for ${domain}`)
      await this.robotsParser.load(domain)
      console.log(`[Orchestrator] robots.txt loaded`)
    }

    // 2. Discover URLs
    console.log(`[Orchestrator] Starting URL discovery`)
    const urls = await this.urlDiscovery.discover(sourceUrl, domain, {
      maxPages,
      maxDepth,
      respectRobotsTxt,
      robotsParser: respectRobotsTxt ? this.robotsParser : undefined,
      includePatterns: config.includePatterns,
      excludePatterns: config.excludePatterns,
      onProgress: (pagesFound, total) => {
        // Report discovery progress
        if (onProgress) {
          onProgress({
            pagesScraped: pagesFound,
            total: total,
            errors: 0,
            currentPage: sourceUrl,
            percentage: Math.floor((pagesFound / total) * 100),
          })
        }
      },
    })

    console.log(`[Orchestrator] Discovered ${urls.length} URLs`)

    // 3. Scrape pages with concurrency control
    console.log(`[Orchestrator] Starting page scraping with concurrency ${concurrency}`)
    const pages: PageContent[] = []
    let scrapedCount = 0
    let errorCount = 0

    // Process in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency)

      const results = await Promise.allSettled(
        batch.map((url) =>
          this.scrapePage(url, config.timeout).catch((error) => {
            console.error(`Failed to scrape ${url}:`, error.message)
            errorCount++
            return null
          })
        )
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          pages.push(result.value)
          scrapedCount++

          // Report progress
          if (onProgress) {
            onProgress({
              pagesScraped: scrapedCount,
              total: urls.length,
              errors: errorCount,
              currentPage: result.value.url,
              percentage: Math.floor((scrapedCount / urls.length) * 100),
            })
          }
        }
      }
    }

    return pages
  }

  /**
   * Scrape a single page
   */
  async scrapePage(
    url: string,
    timeout = 30000
  ): Promise<PageContent> {
    return this.contentExtractor.extract(url, timeout)
  }

  /**
   * Discover URLs from a starting point
   */
  async discoverUrls(
    startUrl: string,
    domain: string,
    config: Partial<ScraperConfig> = {}
  ): Promise<string[]> {
    const respectRobotsTxt = config.respectRobotsTxt !== false

    if (respectRobotsTxt) {
      await this.robotsParser.load(domain)
    }

    return this.urlDiscovery.discover(startUrl, domain, {
      maxPages: config.maxPages || 1000,
      maxDepth: config.maxDepth || 10,
      respectRobotsTxt,
      robotsParser: respectRobotsTxt ? this.robotsParser : undefined,
      includePatterns: config.includePatterns,
      excludePatterns: config.excludePatterns,
    })
  }

  /**
   * Check if a URL is allowed by robots.txt
   */
  async isAllowed(url: string): Promise<boolean> {
    const domain = new URL(url).hostname
    await this.robotsParser.load(domain)
    return this.robotsParser.isAllowed(url)
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await this.contentExtractor.cleanup()
  }
}
