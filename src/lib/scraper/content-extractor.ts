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
    'ContextStream/1.0 (Documentation Indexer; +https://contextstream.ai)'

  /**
   * Extract content from a URL
   */
  async extract(url: string, timeout = 30000): Promise<PageContent> {
    try {
      // Fetch the page
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent,
        },
      })

      clearTimeout(timeoutId)

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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }
      throw error
    }
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
