// Enterprise Notion Crawler
// Crawls a Notion database or page tree using the Notion API.
// Gated behind hasLicenseFeature('notion').
//
// Notion API reference: https://developers.notion.com/reference
// Notion-Version: 2022-06-28

import { hasLicenseFeature } from "@/lib/license";
import { CrawledPage } from "@/lib/scraper/website-crawler";

export interface NotionConfig {
  /** Notion integration token (secret_xxx) */
  integrationToken: string;
  /** Optional — ID of a Notion database to crawl */
  databaseId?: string;
  /** Optional — ID of a single Notion page to crawl (and its descendants) */
  pageId?: string;
}

// ---------------------------------------------------------------------------
// Notion API types (minimal subset needed for crawling)
// ---------------------------------------------------------------------------

interface NotionRichText {
  type: "text" | "mention" | "equation";
  plain_text: string;
  text?: { content: string };
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

interface NotionPage {
  id: string;
  object: "page";
  url: string;
  properties: Record<
    string,
    {
      type: string;
      title?: NotionRichText[];
      rich_text?: NotionRichText[];
      [key: string]: unknown;
    }
  >;
}

interface NotionDatabaseQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

interface NotionBlockChildrenResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHeaders(integrationToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${integrationToken}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

/**
 * Extracts a plain-text title from a Notion page's properties.
 * Notion stores page titles in the "title" property (type = "title").
 */
function extractPageTitle(page: NotionPage): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === "title" && Array.isArray(prop.title)) {
      return prop.title.map((rt) => rt.plain_text).join("");
    }
  }
  return page.id;
}

/**
 * Extracts plain text from a rich_text array.
 */
function richTextToPlainText(richTexts: NotionRichText[]): string {
  return richTexts.map((rt) => rt.plain_text).join("");
}

/**
 * Converts a single Notion block to a plain-text string.
 * Supports the most common block types used in documentation.
 */
function blockToText(block: NotionBlock): string {
  const type = block.type;
  const blockData = (block as Record<string, unknown>)[type] as
    | Record<string, unknown>
    | undefined;

  if (!blockData) return "";

  // Blocks with rich_text array
  const textBearingTypes = [
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "bulleted_list_item",
    "numbered_list_item",
    "to_do",
    "toggle",
    "quote",
    "callout",
    "code",
  ];

  if (textBearingTypes.includes(type)) {
    const richTexts = blockData.rich_text as NotionRichText[] | undefined;
    if (Array.isArray(richTexts)) {
      return richTextToPlainText(richTexts);
    }
  }

  // Table rows
  if (type === "table_row") {
    const cells = blockData.cells as NotionRichText[][] | undefined;
    if (Array.isArray(cells)) {
      return cells
        .map((cell) => richTextToPlainText(cell))
        .filter(Boolean)
        .join(" | ");
    }
  }

  return "";
}

// ---------------------------------------------------------------------------
// API wrappers
// ---------------------------------------------------------------------------

/**
 * Fetches all pages from a Notion database using cursor-based pagination.
 */
async function queryDatabase(
  integrationToken: string,
  databaseId: string
): Promise<NotionPage[]> {
  const headers = makeHeaders(integrationToken);
  const all: NotionPage[] = [];
  let startCursor: string | undefined = undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (startCursor) body.start_cursor = startCursor;

    const response = await fetch(
      `${NOTION_API_BASE}/databases/${encodeURIComponent(databaseId)}/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      throw new Error(
        `[Notion] Failed to query database ${databaseId}: ${response.status} ${text}`
      );
    }

    const data = (await response.json()) as NotionDatabaseQueryResponse;
    all.push(...data.results);

    startCursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (startCursor);

  return all;
}

/**
 * Recursively fetches all text content from a page by traversing its block tree.
 * Returns plain text with newlines separating blocks.
 */
async function fetchBlockTextRecursive(
  integrationToken: string,
  blockId: string,
  depth = 0
): Promise<string> {
  // Guard against infinite recursion on deeply nested content
  if (depth > 10) return "";

  const headers = makeHeaders(integrationToken);
  const lines: string[] = [];
  let startCursor: string | undefined = undefined;

  do {
    const url = new URL(
      `${NOTION_API_BASE}/blocks/${encodeURIComponent(blockId)}/children`
    );
    url.searchParams.set("page_size", "100");
    if (startCursor) url.searchParams.set("start_cursor", startCursor);

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      console.warn(
        `[Notion] Failed to fetch blocks for ${blockId}: ${response.status} ${text}`
      );
      break;
    }

    const data = (await response.json()) as NotionBlockChildrenResponse;

    for (const block of data.results) {
      const line = blockToText(block);
      if (line) lines.push(line);

      // Recurse into child blocks
      if (block.has_children) {
        const childText = await fetchBlockTextRecursive(
          integrationToken,
          block.id,
          depth + 1
        );
        if (childText) lines.push(childText);
      }
    }

    startCursor =
      data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (startCursor);

  return lines.join("\n");
}

/**
 * Fetches a single Notion page's metadata.
 */
async function fetchPage(
  integrationToken: string,
  pageId: string
): Promise<NotionPage> {
  const headers = makeHeaders(integrationToken);
  const response = await fetch(
    `${NOTION_API_BASE}/pages/${encodeURIComponent(pageId)}`,
    { headers }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(
      `[Notion] Failed to fetch page ${pageId}: ${response.status} ${text}`
    );
  }

  return response.json() as Promise<NotionPage>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Crawls a Notion database or page and returns all content as CrawledPage objects.
 *
 * - If `databaseId` is provided, queries all pages in the database.
 * - If `pageId` is provided, crawls that page and its child blocks.
 * - If both are provided, the database takes precedence.
 *
 * Requires hasLicenseFeature('notion') — returns empty array otherwise.
 *
 * @throws Error if the Notion API returns a non-OK response on the initial request.
 */
export async function crawlNotion(
  config: NotionConfig
): Promise<CrawledPage[]> {
  if (!hasLicenseFeature("notion")) {
    console.warn(
      "[Notion] License does not include 'notion' feature — crawl skipped"
    );
    return [];
  }

  const { integrationToken, databaseId, pageId } = config;

  if (!databaseId && !pageId) {
    throw new Error(
      "[Notion] Either databaseId or pageId must be provided in NotionConfig"
    );
  }

  const crawledPages: CrawledPage[] = [];

  if (databaseId) {
    // --- Database mode: query all pages, then fetch each page's content ---
    console.log(`[Notion] Querying database: ${databaseId}`);
    const pages = await queryDatabase(integrationToken, databaseId);
    console.log(`[Notion] Found ${pages.length} pages in database ${databaseId}`);

    for (const page of pages) {
      try {
        const title = extractPageTitle(page);
        const contentText = await fetchBlockTextRecursive(
          integrationToken,
          page.id
        );

        crawledPages.push({
          url: page.url,
          title,
          contentText,
          metadata: {
            depth: 0,
            crawledAt: new Date().toISOString(),
            notionPageId: page.id,
            notionDatabaseId: databaseId,
          },
        });
      } catch (err) {
        console.warn(
          `[Notion] Skipping page ${page.id} due to error:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  } else if (pageId) {
    // --- Single page mode: fetch the page and its block tree ---
    console.log(`[Notion] Fetching page: ${pageId}`);
    const page = await fetchPage(integrationToken, pageId);
    const title = extractPageTitle(page);
    const contentText = await fetchBlockTextRecursive(integrationToken, pageId);

    crawledPages.push({
      url: page.url,
      title,
      contentText,
      metadata: {
        depth: 0,
        crawledAt: new Date().toISOString(),
        notionPageId: pageId,
      },
    });
  }

  console.log(`[Notion] Crawl complete — ${crawledPages.length} pages returned`);
  return crawledPages;
}
