// URL Discovery
// Discovers URLs from a starting point using BFS

import * as cheerio from 'cheerio'
import { RobotsParser } from './robots-parser'

export interface DiscoveryConfig {
  maxPages: number
  maxDepth: number
  respectRobotsTxt: boolean
  robotsParser?: RobotsParser
  includePatterns?: string[]
  excludePatterns?: string[]
  onProgress?: (pagesFound: number, total: number) => void
}

interface QueueItem {
  url: string
  depth: number
}

export class URLDiscovery {
  /**
   * Discover URLs from a starting point using breadth-first search
   */
  async discover(
    startUrl: string,
    domain: string,
    config: DiscoveryConfig
  ): Promise<string[]> {
    console.log(`[URLDiscovery] Starting discovery for ${startUrl}`)
    console.log(`[URLDiscovery] Config:`, { maxPages: config.maxPages, maxDepth: config.maxDepth, respectRobotsTxt: config.respectRobotsTxt })

    const {
      maxPages,
      maxDepth,
      respectRobotsTxt,
      robotsParser,
      includePatterns = [],
      excludePatterns = [],
    } = config

    const visited = new Set<string>()
    const queue: QueueItem[] = [{ url: startUrl, depth: 0 }]
    const discovered: string[] = []

    console.log(`[URLDiscovery] Starting BFS loop`)

    while (queue.length > 0 && discovered.length < maxPages) {
      console.log(`[URLDiscovery] Queue size: ${queue.length}, Discovered: ${discovered.length}/${maxPages}`)
      const { url, depth } = queue.shift()!

      // Skip if already visited
      if (visited.has(url)) {
        console.log(`[URLDiscovery] Skipping already visited: ${url}`)
        continue
      }
      visited.add(url)

      // Skip if max depth reached
      if (depth > maxDepth) {
        console.log(`[URLDiscovery] Skipping max depth reached: ${url}`)
        continue
      }

      // Check robots.txt
      if (respectRobotsTxt && robotsParser && !robotsParser.isAllowed(url)) {
        console.log(`[URLDiscovery] Blocked by robots.txt: ${url}`)
        continue
      }

      // Check include/exclude patterns
      if (!this.matchesPatterns(url, includePatterns, excludePatterns)) {
        console.log(`[URLDiscovery] Filtered by patterns: ${url}`)
        continue
      }

      // Add to discovered list
      console.log(`[URLDiscovery] ✓ Discovered: ${url}`)
      discovered.push(url)

      // Report progress
      if (config.onProgress) {
        config.onProgress(discovered.length, maxPages)
      }

      // Extract links and add to queue
      try {
        console.log(`[URLDiscovery] Extracting links from: ${url}`)
        const links = await this.extractLinks(url, domain)
        console.log(`[URLDiscovery] Found ${links.length} links from ${url}`)
        for (const link of links) {
          if (!visited.has(link) && discovered.length + queue.length < maxPages) {
            queue.push({ url: link, depth: depth + 1 })
          }
        }
      } catch (error: any) {
        console.warn(`[URLDiscovery] Failed to extract links from ${url}:`, error.message)
        // Continue with other URLs
      }
    }

    console.log(`[URLDiscovery] Discovery complete. Total discovered: ${discovered.length}`)
    return discovered
  }

  /**
   * Extract links from a page
   */
  private async extractLinks(url: string, domain: string): Promise<string[]> {
    console.log(`[URLDiscovery] Fetching ${url}...`)
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })
      console.log(`[URLDiscovery] Got response ${response.status} from ${url}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      const links = new Set<string>()

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href')
        if (!href) return

        try {
          // Resolve relative URLs
          const absolute = new URL(href, url).href

          // Only include links from the same domain
          const linkDomain = new URL(absolute).hostname
          if (linkDomain === domain || linkDomain === `www.${domain}`) {
            // Remove hash fragments and query params for deduplication
            const clean = absolute.split('#')[0].split('?')[0]
            if (clean) {
              links.add(clean)
            }
          }
        } catch (error) {
          // Invalid URL, skip
        }
      })

      return Array.from(links)
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error)
      return []
    }
  }

  /**
   * Check if URL matches include/exclude patterns
   */
  private matchesPatterns(
    url: string,
    includePatterns: string[],
    excludePatterns: string[]
  ): boolean {
    // If include patterns are specified, URL must match at least one
    if (includePatterns.length > 0) {
      const matches = includePatterns.some((pattern) =>
        new RegExp(pattern).test(url)
      )
      if (!matches) return false
    }

    // URL must not match any exclude patterns
    if (excludePatterns.length > 0) {
      const matches = excludePatterns.some((pattern) =>
        new RegExp(pattern).test(url)
      )
      if (matches) return false
    }

    // Exclude common non-content URLs
    const commonExcludes = [
      /\.(jpg|jpeg|png|gif|svg|ico|pdf|zip|tar|gz)$/i,
      /\/api\//,
      /\/auth\//,
      /\/login/,
      /\/logout/,
      /\/signup/,
      /\/search/,
    ]

    for (const pattern of commonExcludes) {
      if (pattern.test(url)) return false
    }

    return true
  }
}
