// Robots.txt Parser
// Parses and respects robots.txt rules

export class RobotsParser {
  private rules: Map<string, RobotRules> = new Map()

  /**
   * Load and parse robots.txt for a domain
   */
  async load(domain: string): Promise<void> {
    if (this.rules.has(domain)) {
      console.log(`[RobotsParser] Rules already loaded for ${domain}`)
      return // Already loaded
    }

    console.log(`[RobotsParser] Loading robots.txt for ${domain}`)
    try {
      const robotsUrl = `https://${domain}/robots.txt`
      console.log(`[RobotsParser] Fetching ${robotsUrl}`)
      const response = await fetch(robotsUrl)
      console.log(`[RobotsParser] Got response ${response.status}`)

      if (!response.ok) {
        // If robots.txt doesn't exist, allow everything
        this.rules.set(domain, { allow: ['*'], disallow: [] })
        return
      }

      const text = await response.text()
      const rules = this.parse(text)
      this.rules.set(domain, rules)
    } catch (error) {
      console.warn(`Failed to load robots.txt for ${domain}:`, error)
      // On error, be conservative and allow everything
      this.rules.set(domain, { allow: ['*'], disallow: [] })
    }
  }

  /**
   * Parse robots.txt content
   */
  private parse(text: string): RobotRules {
    const lines = text.split('\n')
    const rules: RobotRules = { allow: [], disallow: [] }

    let currentUserAgent = ''
    let isRelevant = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue

      const [key, ...valueParts] = trimmed.split(':')
      const value = valueParts.join(':').trim()

      if (!key || !value) continue

      const lowerKey = key.toLowerCase()

      if (lowerKey === 'user-agent') {
        currentUserAgent = value.toLowerCase()
        // Check if rules apply to us (or *)
        isRelevant = currentUserAgent === '*' || currentUserAgent.includes('contextstream')
      } else if (isRelevant) {
        if (lowerKey === 'disallow') {
          rules.disallow.push(value)
        } else if (lowerKey === 'allow') {
          rules.allow.push(value)
        } else if (lowerKey === 'crawl-delay') {
          const delay = parseFloat(value)
          if (!isNaN(delay) && delay > 0) {
            rules.crawlDelay = delay
          }
        }
      }
    }

    // If no disallow rules found, allow everything
    if (rules.disallow.length === 0 && rules.allow.length === 0) {
      rules.allow.push('*')
    }

    return rules
  }

  /**
   * Get crawl-delay from loaded rules (returns first non-undefined crawl-delay found)
   */
  getCrawlDelay(): number | undefined {
    for (const rules of this.rules.values()) {
      if (rules.crawlDelay !== undefined) {
        return rules.crawlDelay
      }
    }
    return undefined
  }

  /**
   * Check if a URL is allowed by robots.txt
   */
  isAllowed(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname
      const path = urlObj.pathname

      const rules = this.rules.get(domain)
      if (!rules) {
        // If no rules loaded, be conservative and allow
        return true
      }

      // Check disallow rules first
      for (const pattern of rules.disallow) {
        if (this.matchesPattern(path, pattern)) {
          // Check if explicitly allowed
          for (const allowPattern of rules.allow) {
            if (this.matchesPattern(path, allowPattern)) {
              return true
            }
          }
          return false
        }
      }

      return true
    } catch (error) {
      // On error, allow the URL
      return true
    }
  }

  /**
   * Check if path matches a robots.txt pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Handle wildcard patterns
    if (pattern === '*' || pattern === '/') {
      return true
    }

    // Convert robots.txt pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*') // * matches any characters
      .replace(/\$/g, '$') // $ marks end of URL
      .replace(/\?/g, '\\?') // Escape special chars

    try {
      const regex = new RegExp(`^${regexPattern}`)
      return regex.test(path)
    } catch (error) {
      // Invalid pattern, don't match
      return false
    }
  }
}

interface RobotRules {
  allow: string[]
  disallow: string[]
  crawlDelay?: number // Crawl-delay in seconds
}
