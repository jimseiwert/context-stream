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
  private userAgent = 'ContextStream/1.0 (Documentation Indexer; +https://contextstream.ai)'

  /**
   * Check for and parse llms.txt files
   */
  async check(baseUrl: string): Promise<LlmsTxtResult> {
    // Try llms-full.txt first (complete content)
    const fullResult = await this.fetchLlmsTxt(baseUrl, 'llms-full.txt')
    if (fullResult.found) {
      return fullResult
    }

    // Try llms.txt (summary + links)
    const summaryResult = await this.fetchLlmsTxt(baseUrl, 'llms.txt')
    if (summaryResult.found) {
      return summaryResult
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
