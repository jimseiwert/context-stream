// Favicon / logo extractor — finds the best icon URL from HTML and verifies it loads

import * as cheerio from "cheerio";

/**
 * Extracts the best favicon/logo URL from HTML and verifies it's accessible.
 * Returns null if nothing usable is found.
 */
export async function extractAndVerifyFavicon(
  html: string,
  pageUrl: string
): Promise<string | null> {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);

  const candidates: string[] = [];

  // Apple touch icon (highest quality)
  const appleIcon =
    $('link[rel="apple-touch-icon"]').attr("href") ||
    $('link[rel="apple-touch-icon-precomposed"]').attr("href");
  if (appleIcon) candidates.push(resolve(appleIcon, base));

  // Open Graph image
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) candidates.push(resolve(ogImage, base));

  // Standard favicon link tags
  $('link[rel~="icon"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) candidates.push(resolve(href, base));
  });

  // Default favicon path
  candidates.push(`${base.protocol}//${base.host}/favicon.ico`);

  for (const url of candidates) {
    if (await isAccessible(url)) return url;
  }

  return null;
}

function resolve(href: string, base: URL): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

async function isAccessible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
