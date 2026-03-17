/**
 * llms.txt Parser
 *
 * Implements the llms.txt standard for efficient LLM-friendly content discovery
 * See: https://llmstxt.org/
 *
 * Priority:
 * 1. /llms-full.txt - Complete content in one file
 * 2. /llms.txt - Summary + links to other pages
 */

export interface LlmsTxtResult {
  found: boolean
  type?: 'full' | 'summary'
  content?: string
  links?: string[]
}

export class LlmsTxtParser {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  /**
   * Check for and parse llms.txt files
   * Priority:
   * 1. startUrl/llms-full.txt (path-specific complete content)
   * 2. startUrl/llms.txt (path-specific summary)
   * 3. domain/llms-full.txt (domain-level complete content)
   * 4. domain/llms.txt (domain-level summary)
   */
  async check(startUrl: string, domainUrl?: string): Promise<LlmsTxtResult> {
    // If startUrl and domainUrl are different (path-specific), try path first
    if (domainUrl && startUrl !== domainUrl && !startUrl.endsWith('/')) {
      // Try path-specific llms-full.txt first
      const pathFullResult = await this.fetchLlmsTxt(startUrl, 'llms-full.txt')
      if (pathFullResult.found) {
        return pathFullResult
      }

      // Try path-specific llms.txt
      const pathSummaryResult = await this.fetchLlmsTxt(startUrl, 'llms.txt')
      if (pathSummaryResult.found) {
        return pathSummaryResult
      }
    }

    // Fall back to domain-level files
    const baseUrl = domainUrl || startUrl

    // Try domain llms-full.txt
    const domainFullResult = await this.fetchLlmsTxt(baseUrl, 'llms-full.txt')
    if (domainFullResult.found) {
      return domainFullResult
    }

    // Try domain llms.txt
    const domainSummaryResult = await this.fetchLlmsTxt(baseUrl, 'llms.txt')
    if (domainSummaryResult.found) {
      return domainSummaryResult
    }

    return { found: false }
  }

  /**
   * Fetch and parse a specific llms.txt file
   */
  private async fetchLlmsTxt(baseUrl: string, filename: string): Promise<LlmsTxtResult> {
    try {
      const url = new URL(filename, baseUrl).href
      console.log(`[llms.txt] Checking: ${url}`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      })

      if (!response.ok) {
        return { found: false }
      }

      const content = await response.text()

      if (!content || content.trim().length === 0) {
        return { found: false }
      }

      console.log(`[llms.txt] Found ${filename} (${content.length} bytes)`)

      // For llms-full.txt, return complete content
      if (filename === 'llms-full.txt') {
        return {
          found: true,
          type: 'full',
          content: content.trim(),
        }
      }

      // For llms.txt, extract links
      const links = this.extractLinks(content, baseUrl)
      return {
        found: true,
        type: 'summary',
        content: content.trim(),
        links,
      }
    } catch (error) {
      // File doesn't exist or network error
      return { found: false }
    }
  }

  /**
   * Extract URLs from llms.txt content
   */
  private extractLinks(content: string, baseUrl: string): string[] {
    const links = new Set<string>()

    // Match markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let match
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      try {
        const url = new URL(match[2], baseUrl).href
        links.add(url)
      } catch {
        // Invalid URL, skip
      }
    }

    // Match plain URLs (http:// or https://)
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g
    while ((match = urlRegex.exec(content)) !== null) {
      try {
        const url = new URL(match[0], baseUrl).href
        links.add(url)
      } catch {
        // Invalid URL, skip
      }
    }

    return Array.from(links)
  }
}
