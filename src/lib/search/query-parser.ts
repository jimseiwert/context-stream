// Search Query Parser
// Extracts key:value filter tokens from a raw search string.
// Example: "react hooks source:nextjs" → { query: "react hooks", filters: { source: "nextjs" } }

export interface ParsedQuery {
  query: string;
  filters: Record<string, string>;
}

/**
 * Parses a raw search string into a clean query and a set of key:value filters.
 *
 * Rules:
 * - Tokens that match the pattern `word:value` are treated as filters.
 * - Quoted values are supported: `source:"next js"`.
 * - The remaining tokens (after filter removal) form the clean query.
 * - Leading/trailing whitespace is stripped from both the query and values.
 */
export function parseQuery(raw: string): ParsedQuery {
  if (!raw || !raw.trim()) {
    return { query: "", filters: {} };
  }

  const filters: Record<string, string> = {};
  // Match key:value or key:"quoted value" tokens
  const filterPattern = /(\w+):(?:"([^"]*)"|([\S]+))/g;

  let cleanQuery = raw;
  let match: RegExpExecArray | null;

  // Collect all filter tokens
  const filterMatches: Array<{ full: string; key: string; value: string }> = [];

  while ((match = filterPattern.exec(raw)) !== null) {
    const key = match[1].toLowerCase();
    // Prefer quoted group, fall back to unquoted group
    const value = (match[2] ?? match[3] ?? "").trim();
    filterMatches.push({ full: match[0], key, value });
  }

  // Remove filter tokens from the query string and store them
  for (const fm of filterMatches) {
    filters[fm.key] = fm.value;
    cleanQuery = cleanQuery.replace(fm.full, "");
  }

  // Normalize whitespace in the remaining query
  cleanQuery = cleanQuery.replace(/\s+/g, " ").trim();

  return { query: cleanQuery, filters };
}
