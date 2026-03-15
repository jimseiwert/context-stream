// Content extractor — parses HTML into clean text, title, and metadata
import { createHash } from "crypto";
import * as cheerio from "cheerio";

export interface ExtractedContent {
  text: string;
  title: string | null;
  html: string;
  metadata: Record<string, unknown>;
  checksum: string;
}

export interface SiteNameResult {
  name: string | null;
  score: number;
}

export class ContentExtractor {
  async extractFromHtml(
    html: string,
    url: string
  ): Promise<ExtractedContent> {
    const $ = cheerio.load(html);

    // Remove non-content elements
    $(
      "script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar, .menu, .ads, .advertisement"
    ).remove();

    const title =
      $("title").first().text().trim() ||
      $("h1").first().text().trim() ||
      null;

    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      null;

    // Extract main content
    const mainSelectors = [
      "main",
      "article",
      '[role="main"]',
      ".content",
      ".main",
      "#content",
      "#main",
      ".documentation",
      ".docs-content",
    ];

    let contentEl = $("body");
    for (const sel of mainSelectors) {
      if ($(sel).length > 0) {
        contentEl = $(sel).first() as any;
        break;
      }
    }

    const text = contentEl
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const metadata: Record<string, unknown> = { url };
    if (description) metadata.description = description;

    const checksum = createHash("sha256").update(text).digest("hex");
    return { text, title, html, metadata, checksum };
  }

  extractSiteName(html: string): SiteNameResult {
    const $ = cheerio.load(html);

    const candidates: Array<{ name: string; score: number }> = [];

    const ogSiteName = $('meta[property="og:site_name"]').attr("content");
    if (ogSiteName?.trim()) {
      candidates.push({ name: ogSiteName.trim(), score: 10 });
    }

    const title = $("title").first().text().trim();
    if (title) {
      // "Docs | CompanyName" → take the last segment
      const parts = title.split(/[\|\-–—]/).map((p) => p.trim());
      if (parts.length > 1) {
        candidates.push({ name: parts[parts.length - 1], score: 6 });
      } else {
        candidates.push({ name: title, score: 3 });
      }
    }

    if (candidates.length === 0) return { name: null, score: 0 };

    const best = candidates.reduce((a, b) => (a.score >= b.score ? a : b));
    return best;
  }

  async cleanup(): Promise<void> {
    // No resources to release for this implementation
  }
}
