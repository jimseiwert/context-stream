// URL Discovery Utility
// Extracts same-domain links from HTML content

/**
 * Extracts all valid same-domain links from HTML content.
 * Filters out anchors, javascript:, mailto:, and cross-domain links.
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const links: string[] = [];
  const seen = new Set<string>();

  // Match all href attributes
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    const raw = match[1].trim();

    // Skip empty, anchors, javascript, mailto, tel
    if (!raw || raw.startsWith("#") || raw.startsWith("javascript:") ||
        raw.startsWith("mailto:") || raw.startsWith("tel:")) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(raw, base.toString());
    } catch {
      continue;
    }

    // Only same origin
    if (resolved.origin !== base.origin) {
      continue;
    }

    // Normalize: remove fragment, keep pathname + search
    resolved.hash = "";
    const normalized = resolved.toString();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      links.push(normalized);
    }
  }

  return links;
}
