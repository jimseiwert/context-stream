// Content Extractor
// Extracts clean, readable content from web pages

import * as cheerio from 'cheerio'
import { createHash } from 'crypto'

export interface PageContent {
  url: string
  title: string | null
  text: string
  html: string | null
  metadata: Record<string, any>
  checksum: string
}

export class ContentExtractor {
  private userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry(url: string, timeout: number, maxRetries = 3): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
          },
        })

        clearTimeout(timeoutId)

        // If successful or client error (4xx), return immediately
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response
        }

        // Server error (5xx) - retry
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
          console.log(`[ContentExtractor] Retry ${attempt}/${maxRetries} for ${url} - waiting ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error: any) {
        lastError = error

        // Don't retry on abort errors
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`)
        }

        // Retry on network errors
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(`[ContentExtractor] Retry ${attempt}/${maxRetries} for ${url} after error: ${error.message} - waiting ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * Extract content from a URL
   */
  async extract(url: string, timeout = 30000): Promise<PageContent> {
    // Fetch the page with retry logic
    const response = await this.fetchWithRetry(url, timeout)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const contentType = response.headers.get('content-type') || ''

    // Only process HTML content
    if (!contentType.includes('text/html')) {
      throw new Error(`Unsupported content type: ${contentType}`)
    }

    // Parse and extract content
    return this.extractFromHtml(html, url)
  }

  /**
   * Extract content from HTML string
   */
  extractFromHtml(html: string, url: string): PageContent {
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript').remove()

    // Extract metadata first (needed for better title extraction)
    const metadata = this.extractMetadata($)

    // Extract title with priority: og:title > twitter:title > title tag > h1
    const title =
      metadata.meta?.['og:title'] ||
      metadata.meta?.['twitter:title'] ||
      $('title').text().trim() ||
      $('h1').first().text().trim() ||
      null

    // Extract main content
    // Try to find main content container
    let mainContent =
      $('main').html() ||
      $('article').html() ||
      $('[role="main"]').html() ||
      $('body').html() ||
      ''

    // Extract plain text
    const text = this.extractText($, mainContent)

    // Generate checksum
    const checksum = createHash('sha256').update(text).digest('hex')

    const result = {
      url,
      title,
      text,
      html: mainContent,
      metadata,
      checksum,
    }

    // MEMORY FIX: Help garbage collection by dereferencing cheerio instance
    // This doesn't guarantee immediate cleanup but helps signal GC
    mainContent = '';

    return result
  }

  /**
   * Extract site name from HTML with priority ranking
   * Returns both the site name and a quality score (higher is better)
   */
  extractSiteName(html: string): { name: string | null; score: number } {
    const $ = cheerio.load(html)
    const metaTags: Record<string, string> = {}

    // Extract meta tags
    $('meta').each((_, el) => {
      const $el = $(el)
      const name = $el.attr('name') || $el.attr('property') || $el.attr('itemprop')
      const content = $el.attr('content')
      if (name && content) {
        metaTags[name] = content
      }
    })

    // Priority 1: og:site_name (score: 100) - Designed specifically for site names
    if (metaTags['og:site_name']) {
      return { name: metaTags['og:site_name'].trim(), score: 100 }
    }

    // Priority 2: application-name (score: 90) - Site-level application name
    if (metaTags['application-name']) {
      return { name: metaTags['application-name'].trim(), score: 90 }
    }

    // Priority 3: Parse title tag for site name (score: 70)
    // Format is usually: "Page Title | Site Name" or "Page Title - Site Name"
    const titleText = $('title').text().trim()
    if (titleText) {
      const siteName = this.parseSiteNameFromTitle(titleText)
      if (siteName) {
        return { name: siteName, score: 70 }
      }
    }

    // Priority 4: og:title (score: 50) - Might be page-specific but better than nothing
    if (metaTags['og:title']) {
      return { name: metaTags['og:title'].trim(), score: 50 }
    }

    // Priority 5: First h1 (score: 30) - Likely page-specific, lowest priority
    const h1Text = $('h1').first().text().trim()
    if (h1Text) {
      return { name: h1Text, score: 30 }
    }

    return { name: null, score: 0 }
  }

  /**
   * Parse site name from title tag by splitting on common separators
   * Takes the last part as the site name (e.g., "Getting Started | React Docs" → "React Docs")
   */
  private parseSiteNameFromTitle(title: string): string | null {
    // Common separators in title tags
    const separators = ['|', '–', '—', '-', '•', '::']

    for (const separator of separators) {
      if (title.includes(separator)) {
        const parts = title.split(separator).map(p => p.trim())

        // Take the last part (usually the site name)
        const siteName = parts[parts.length - 1]

        // Validate it's not too short and not too long
        if (siteName.length >= 2 && siteName.length <= 100) {
          return siteName
        }
      }
    }

    // If no separator found and title is reasonable length, use the whole thing
    if (title.length >= 2 && title.length <= 100) {
      return title
    }

    return null
  }

  /**
   * Extract clean text from HTML
   */
  private extractText($: cheerio.CheerioAPI, html: string): string {
    const $temp = cheerio.load(html)

    // Get text content
    let text = $temp.text()

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove excessive newlines
      .trim()

    return text
  }

  /**
   * Extract metadata from page
   */
  private extractMetadata($: cheerio.CheerioAPI): Record<string, any> {
    const metadata: Record<string, any> = {}

    // Extract headings structure
    const headings: Array<{ level: number; text: string }> = []
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const $el = $(el)
      const level = parseInt(el.tagName[1])
      const text = $el.text().trim()
      if (text) {
        headings.push({ level, text })
      }
    })
    metadata.headings = headings

    // Extract code blocks
    const codeBlocks: Array<{ language: string | null; code: string }> = []
    $('pre code, code.hljs, .highlight pre').each((_, el) => {
      const $el = $(el)
      const code = $el.text().trim()
      const language =
        $el.attr('class')?.match(/language-(\w+)/)?.[1] ||
        $el.parent().attr('class')?.match(/language-(\w+)/)?.[1] ||
        null

      if (code) {
        codeBlocks.push({ language, code })
      }
    })
    metadata.codeBlocks = codeBlocks

    // Extract meta tags
    const metaTags: Record<string, string> = {}
    $('meta').each((_, el) => {
      const $el = $(el)
      const name =
        $el.attr('name') || $el.attr('property') || $el.attr('itemprop')
      const content = $el.attr('content')

      if (name && content) {
        metaTags[name] = content
      }
    })
    metadata.meta = metaTags

    // Extract description
    metadata.description =
      metaTags['description'] ||
      metaTags['og:description'] ||
      metaTags['twitter:description'] ||
      null

    // Extract author
    metadata.author =
      metaTags['author'] || metaTags['article:author'] || null

    // Word count
    metadata.wordCount = this.extractText($, $.html()).split(/\s+/).length

    return metadata
  }

  /**
   * Clean up resources (placeholder for future browser-based scraping)
   */
  async cleanup() {
    // Currently using fetch, no cleanup needed
    // If we add Playwright/Puppeteer later, close browser here
  }
}
