// Enterprise Confluence Crawler
// Crawls a Confluence Cloud space using the REST API v2.
// Gated behind hasLicenseFeature('confluence').
//
// Confluence REST API v2 reference:
//   https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
//
// Authentication: Basic auth using email + API token
//   https://developer.atlassian.com/cloud/confluence/basic-auth-for-rest-apis/

import { hasLicenseFeature } from "@/lib/license";
import { CrawledPage } from "@/lib/scraper/website-crawler";

export interface ConfluenceConfig {
  /** Base URL of the Atlassian site, e.g. https://company.atlassian.net */
  baseUrl: string;
  /** Confluence space key, e.g. "ENG" */
  spaceKey: string;
  /** Atlassian account email address */
  email: string;
  /** Atlassian API token (not the account password) */
  apiToken: string;
}

/** Shape of a page returned by GET /wiki/api/v2/spaces/{spaceKey}/pages */
interface ConfluencePageSummary {
  id: string;
  title: string;
  status: string;
  spaceId: string;
}

/** Shape of the paginated response wrapper from Confluence REST API v2 */
interface ConfluencePaginatedResponse<T> {
  results: T[];
  _links?: {
    next?: string;
  };
}

/** Shape of a full page body from GET /wiki/api/v2/pages/{pageId}?body-format=storage */
interface ConfluencePageDetail {
  id: string;
  title: string;
  status: string;
  version?: { number: number };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
  };
  _links?: {
    webui?: string;
  };
}

/**
 * Strips Confluence storage format (XHTML subset) XML tags, leaving plain text.
 * Also collapses whitespace for readability.
 */
function storageFormatToPlainText(storageXml: string): string {
  // Remove structured macros wholesale (they contain non-readable markup)
  let text = storageXml.replace(/<ac:[^>]*?>[\s\S]*?<\/ac:[^>]*?>/gi, " ");

  // Remove all remaining XML/HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 10))
    );

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Crawls all pages in a Confluence space and returns them as CrawledPage objects.
 *
 * Requires hasLicenseFeature('confluence') — returns empty array otherwise.
 *
 * @throws Error if the Confluence API returns a non-OK response (callers should
 *   catch and mark the job as failed).
 */
export async function crawlConfluence(
  config: ConfluenceConfig
): Promise<CrawledPage[]> {
  if (!hasLicenseFeature("confluence")) {
    console.warn(
      "[Confluence] License does not include 'confluence' feature — crawl skipped"
    );
    return [];
  }

  const { baseUrl, spaceKey, email, apiToken } = config;

  // Basic auth header: base64(email:apiToken)
  const authHeader =
    "Basic " + Buffer.from(`${email}:${apiToken}`).toString("base64");

  const baseHeaders: Record<string, string> = {
    Authorization: authHeader,
    Accept: "application/json",
  };

  /**
   * Fetches all page summaries for the space using cursor-based pagination.
   */
  async function fetchAllPageSummaries(): Promise<ConfluencePageSummary[]> {
    const all: ConfluencePageSummary[] = [];
    let nextUrl: string | null =
      `${baseUrl}/wiki/api/v2/spaces/${encodeURIComponent(spaceKey)}/pages?limit=50&status=current`;

    while (nextUrl) {
      const response = await fetch(nextUrl, { headers: baseHeaders });

      if (!response.ok) {
        const body = await response.text().catch(() => "(no body)");
        throw new Error(
          `[Confluence] Failed to list pages for space ${spaceKey}: ${response.status} ${body}`
        );
      }

      const data =
        (await response.json()) as ConfluencePaginatedResponse<ConfluencePageSummary>;

      all.push(...data.results);

      // Resolve next cursor URL — the _links.next is relative to the base
      if (data._links?.next) {
        // next can be relative (e.g. /wiki/api/v2/...) or absolute
        nextUrl = data._links.next.startsWith("http")
          ? data._links.next
          : `${baseUrl}${data._links.next}`;
      } else {
        nextUrl = null;
      }
    }

    return all;
  }

  /**
   * Fetches the full page content in storage format.
   */
  async function fetchPageDetail(
    pageId: string
  ): Promise<ConfluencePageDetail> {
    const url = `${baseUrl}/wiki/api/v2/pages/${encodeURIComponent(pageId)}?body-format=storage`;
    const response = await fetch(url, { headers: baseHeaders });

    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      throw new Error(
        `[Confluence] Failed to fetch page ${pageId}: ${response.status} ${body}`
      );
    }

    return response.json() as Promise<ConfluencePageDetail>;
  }

  console.log(
    `[Confluence] Fetching pages for space: ${spaceKey} from ${baseUrl}`
  );

  const summaries = await fetchAllPageSummaries();
  console.log(
    `[Confluence] Found ${summaries.length} pages in space ${spaceKey}`
  );

  const crawledPages: CrawledPage[] = [];

  for (const summary of summaries) {
    try {
      const detail = await fetchPageDetail(summary.id);
      const storageXml = detail.body?.storage?.value ?? "";
      const contentText = storageFormatToPlainText(storageXml);

      // Build a web URL for the page
      const pageWebUrl =
        detail._links?.webui
          ? `${baseUrl}${detail._links.webui}`
          : `${baseUrl}/wiki/spaces/${spaceKey}/pages/${summary.id}`;

      crawledPages.push({
        url: pageWebUrl,
        title: detail.title || summary.title || `Page ${summary.id}`,
        contentText,
        metadata: {
          depth: 0,
          crawledAt: new Date().toISOString(),
          confluencePageId: summary.id,
          confluenceSpaceKey: spaceKey,
          version: detail.version?.number,
        },
      });
    } catch (err) {
      console.warn(
        `[Confluence] Skipping page ${summary.id} due to error:`,
        err instanceof Error ? err.message : err
      );
      // Continue with remaining pages rather than aborting the whole crawl
    }
  }

  console.log(
    `[Confluence] Successfully crawled ${crawledPages.length}/${summaries.length} pages`
  );

  return crawledPages;
}
