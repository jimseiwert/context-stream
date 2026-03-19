// Website Crawler
// Depth-limited, rate-limited crawler using fetch + cheerio

import * as cheerio from "cheerio";
import { extractLinks } from "./url-discovery";

export interface CrawlConfig {
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  rateLimitMs?: number;
  /** Called each time a new page is successfully crawled, with the running count */
  onPageCrawled?: (count: number) => void | Promise<void>;
}

export interface CrawledPage {
  url: string;
  title: string;
  contentText: string;
  metadata: {
    description?: string;
    depth: number;
    crawledAt: string;
    /** Allow crawlers (Confluence, Notion, GitHub, etc.) to attach extra metadata */
    [key: string]: unknown;
  };
}

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_RATE_LIMIT_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parses and returns robots.txt disallowed paths for a given base URL.
 */
async function fetchRobotsDisallowed(baseUrl: string): Promise<Set<string>> {
  const disallowed = new Set<string>();
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "ContextStreamBot/1.0" },
    });
    if (!response.ok) return disallowed;
    const text = await response.text();
    let applyToAll = false;
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("user-agent:")) {
        const agent = trimmed.slice("user-agent:".length).trim();
        applyToAll = agent === "*";
      } else if (applyToAll && trimmed.toLowerCase().startsWith("disallow:")) {
        const path = trimmed.slice("disallow:".length).trim();
        if (path) disallowed.add(path);
      }
    }
  } catch {
    // robots.txt is optional — ignore errors
  }
  return disallowed;
}

function isDisallowed(url: string, disallowed: Set<string>): boolean {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  for (const rule of disallowed) {
    if (pathname.startsWith(rule)) return true;
  }
  return false;
}

function matchesPattern(url: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true;
  return patterns.some((p) => {
    try {
      // Support simple glob-style wildcards
      const regexStr = p.replace(/\./g, "\\.").replace(/\*/g, ".*");
      return new RegExp(regexStr).test(url);
    } catch {
      return url.includes(p);
    }
  });
}

/**
 * Crawls a website starting from the given URL.
 * Respects robots.txt, rate-limits requests, and stays within the same domain.
 */
export async function crawlWebsite(
  startUrl: string,
  config: CrawlConfig = {}
): Promise<CrawledPage[]> {
  const {
    maxDepth = DEFAULT_MAX_DEPTH,
    includePatterns = [],
    excludePatterns = [],
    rateLimitMs = DEFAULT_RATE_LIMIT_MS,
    onPageCrawled,
  } = config;

  const results: CrawledPage[] = [];
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];

  // Fetch robots.txt once
  const disallowed = await fetchRobotsDisallowed(startUrl);

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { url, depth } = item;

    if (visited.has(url)) continue;
    visited.add(url);

    // Depth check
    if (depth > maxDepth) continue;

    // Robots.txt check
    if (isDisallowed(url, disallowed)) {
      console.log(`[Crawler] Skipping (robots.txt): ${url}`);
      continue;
    }

    // Include/exclude pattern checks
    if (includePatterns.length > 0 && !matchesPattern(url, includePatterns)) continue;
    if (excludePatterns.length > 0 && matchesPattern(url, excludePatterns)) continue;

    // Rate limiting
    if (visited.size > 1) {
      await sleep(rateLimitMs);
    }

    let html: string;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent": "ContextStreamBot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (!response.ok) {
        console.warn(`[Crawler] HTTP ${response.status} for ${url}`);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        continue;
      }
      html = await response.text();
    } catch (err) {
      console.warn(`[Crawler] Failed to fetch ${url}:`, err);
      continue;
    }

    // Parse with cheerio
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $("title").first().text().trim() ||
      $("h1").first().text().trim() ||
      url;

    // Extract description
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      undefined;

    // Remove script, style, nav, footer, header for cleaner text
    $("script, style, nav, footer, header, noscript, [aria-hidden='true']").remove();

    // Extract main content text
    const contentText = $("body").text().replace(/\s+/g, " ").trim();

    if (contentText.length > 0) {
      results.push({
        url,
        title,
        contentText,
        metadata: {
          description,
          depth,
          crawledAt: new Date().toISOString(),
        },
      });
      if (onPageCrawled) {
        await onPageCrawled(results.length);
      }
    }

    // Discover child links for next depth level
    if (depth < maxDepth) {
      const childLinks = extractLinks(html, url);
      for (const link of childLinks) {
        if (!visited.has(link)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  return results;
}
