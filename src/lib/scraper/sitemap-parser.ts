// Sitemap parser — discovers URLs from sitemap.xml / sitemap index files

export interface SitemapResult {
  found: boolean;
  urls: string[];
}

export class SitemapParser {
  async parse(baseUrl: string, maxUrls = 500): Promise<SitemapResult> {
    const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();

    try {
      const res = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "ContextStreamBot/1.0" },
      });

      if (!res.ok) return { found: false, urls: [] };

      const xml = await res.text();
      const urls = this.extractUrls(xml).slice(0, maxUrls);

      return { found: urls.length > 0, urls };
    } catch {
      return { found: false, urls: [] };
    }
  }

  private extractUrls(xml: string): string[] {
    const urls: string[] = [];

    // Match <loc>...</loc> entries (works for both sitemaps and sitemap indexes)
    const locPattern = /<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi;
    let match: RegExpExecArray | null;

    while ((match = locPattern.exec(xml)) !== null) {
      const url = match[1].trim();
      // Skip nested sitemap files
      if (!url.endsWith(".xml")) {
        urls.push(url);
      }
    }

    return urls;
  }
}
