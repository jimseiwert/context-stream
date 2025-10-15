/**
 * Sitemap Parser
 *
 * Parses XML sitemaps to efficiently discover all URLs on a site
 * Supports:
 * - sitemap.xml
 * - sitemap_index.xml (nested sitemaps)
 * - robots.txt sitemap directive
 */

export interface SitemapResult {
  found: boolean
  urls: string[]
}

export class SitemapParser {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  /**
   * Discover and parse sitemaps
   * @param baseUrl - The base URL to search for sitemaps
   * @param maxUrls - Optional maximum number of URLs to return (no limit if not specified)
   */
  async parse(baseUrl: string, maxUrls?: number): Promise<SitemapResult> {
    const urls = new Set<string>()

    // Try common sitemap locations
    const sitemapUrls = [
      new URL('/sitemap.xml', baseUrl).href,
      new URL('/sitemap_index.xml', baseUrl).href,
      new URL('/sitemap-index.xml', baseUrl).href,
    ]

    for (const sitemapUrl of sitemapUrls) {
      if (maxUrls && urls.size >= maxUrls) break

      const result = await this.fetchAndParseSitemap(sitemapUrl, maxUrls)
      if (result.length > 0) {
        console.log(`[Sitemap] Found ${result.length} URLs from ${sitemapUrl}`)
        result.forEach(url => {
          if (!maxUrls || urls.size < maxUrls) {
            urls.add(url)
          }
        })
      }
    }

    if (urls.size === 0) {
      return { found: false, urls: [] }
    }

    const finalUrls = Array.from(urls)
    return {
      found: true,
      urls: maxUrls ? finalUrls.slice(0, maxUrls) : finalUrls,
    }
  }

  /**
   * Fetch and parse a sitemap XML file
   */
  private async fetchAndParseSitemap(url: string, maxUrls?: number, depth = 0): Promise<string[]> {
    // Prevent infinite recursion
    if (depth > 3) {
      console.log(`[Sitemap] Max depth reached at ${url}`)
      return []
    }

    try {
      console.log(`[Sitemap] Checking: ${url}`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      })

      if (!response.ok) {
        return []
      }

      const xml = await response.text()

      // Check if this is a sitemap index or a regular sitemap
      if (xml.includes('<sitemapindex')) {
        console.log(`[Sitemap] Found sitemap index at ${url}, fetching child sitemaps...`)
        return await this.processSitemapIndex(xml, maxUrls, depth)
      } else {
        // Regular sitemap with page URLs
        return this.extractUrlsFromXml(xml)
      }
    } catch (error) {
      // Sitemap doesn't exist or network error
      return []
    }
  }

  /**
   * Process a sitemap index by fetching all child sitemaps
   */
  private async processSitemapIndex(xml: string, maxUrls: number | undefined, depth: number): Promise<string[]> {
    const childSitemapUrls = this.extractUrlsFromXml(xml)
    const allUrls: string[] = []

    console.log(`[Sitemap] Processing ${childSitemapUrls.length} child sitemaps...`)

    // Fetch child sitemaps with concurrency limit
    const batchSize = 5 // Process 5 sitemaps at a time
    for (let i = 0; i < childSitemapUrls.length; i += batchSize) {
      if (maxUrls && allUrls.length >= maxUrls) {
        console.log(`[Sitemap] Reached max URLs limit (${maxUrls})`)
        break
      }

      const batch = childSitemapUrls.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(childUrl => this.fetchAndParseSitemap(childUrl, maxUrls, depth + 1))
      )

      results.forEach(urls => {
        urls.forEach(url => {
          if (!maxUrls || allUrls.length < maxUrls) {
            allUrls.push(url)
          }
        })
      })

      console.log(`[Sitemap] Progress: ${Math.min(i + batchSize, childSitemapUrls.length)}/${childSitemapUrls.length} child sitemaps processed, ${allUrls.length} URLs found`)
    }

    return allUrls
  }

  /**
   * Extract URLs from sitemap XML
   */
  private extractUrlsFromXml(xml: string): string[] {
    const urls: string[] = []

    // Match <loc>url</loc> tags
    const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/g
    let match

    while ((match = locRegex.exec(xml)) !== null) {
      const url = match[1].trim()
      if (url) {
        urls.push(url)
      }
    }

    return urls
  }
}
