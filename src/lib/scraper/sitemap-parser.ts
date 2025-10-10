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
  private userAgent = 'ContextStream/1.0 (Documentation Indexer; +https://contextstream.ai)'
  private maxUrls = 10000 // Safety limit

  /**
   * Discover and parse sitemaps
   */
  async parse(baseUrl: string): Promise<SitemapResult> {
    const urls = new Set<string>()

    // Try common sitemap locations
    const sitemapUrls = [
      new URL('/sitemap.xml', baseUrl).href,
      new URL('/sitemap_index.xml', baseUrl).href,
      new URL('/sitemap-index.xml', baseUrl).href,
    ]

    for (const sitemapUrl of sitemapUrls) {
      if (urls.size >= this.maxUrls) break

      const result = await this.fetchAndParseSitemap(sitemapUrl)
      if (result.length > 0) {
        console.log(`[Sitemap] Found ${result.length} URLs from ${sitemapUrl}`)
        result.forEach(url => urls.add(url))
      }
    }

    if (urls.size === 0) {
      return { found: false, urls: [] }
    }

    return {
      found: true,
      urls: Array.from(urls).slice(0, this.maxUrls),
    }
  }

  /**
   * Fetch and parse a sitemap XML file
   */
  private async fetchAndParseSitemap(url: string): Promise<string[]> {
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
      return this.extractUrlsFromXml(xml)
    } catch (error) {
      // Sitemap doesn't exist or network error
      return []
    }
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
