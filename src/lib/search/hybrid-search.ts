// Hybrid Search Implementation
// Combines BM25 full-text search with vector similarity search

import { prisma } from "@/lib/db";
import { getEmbeddingProvider } from "@/lib/embeddings/provider";
import type { ParsedQuery } from "./query-parser";
import type { RerankableResult } from "./reranker";

export interface SearchOptions {
  workspaceId: string;
  limit?: number;
  offset?: number;
  sourceIds?: string[];
}

export interface SearchResult {
  id: string;
  pageId: string;
  title: string | null;
  snippet: string;
  url: string;
  score: number;
  source: {
    name: string;
    domain: string;
    url: string;
    scope: string;
    isGlobal: boolean;
  };
}

export class HybridSearch {

  /**
   * Perform hybrid search (BM25 + vector similarity)
   */
  async search(
    query: string,
    options: SearchOptions
  ): Promise<{
    results: SearchResult[];
    total: number;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    const { workspaceId, limit = 10, offset = 0, sourceIds } = options;

    // 1. Get sources available to workspace
    const availableSources = await this.getWorkspaceSources(
      workspaceId,
      sourceIds
    );
    const availableSourceIds = availableSources.map((s) => s.id);

    if (availableSourceIds.length === 0) {
      return {
        results: [],
        total: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Full-text search (BM25)
    const ftsResults = await this.fullTextSearch(query, availableSourceIds);

    // 3. Vector similarity search
    const vectorResults = await this.vectorSearch(query, availableSourceIds);

    // 4. Combine using Reciprocal Rank Fusion
    const combined = this.reciprocalRankFusion(ftsResults, vectorResults);

    // 5. Fetch page details
    const pageIds = combined.slice(offset, offset + limit).map((r) => r.id);
    const pages = await prisma.page.findMany({
      where: { id: { in: pageIds } },
      include: {
        source: {
          select: {
            id: true,
            url: true,
            domain: true,
            scope: true,
          },
        },
      },
    });

    // 6. Format results
    const results: SearchResult[] = pages.map((p) => ({
      id: p.id,
      pageId: p.id,
      title: p.title,
      snippet: this.extractSnippet(p.contentText, query),
      url: p.url,
      score: combined.find((r) => r.id === p.id)?.score || 0,
      source: {
        name: p.source.domain,
        domain: p.source.domain,
        url: p.source.url,
        scope: p.source.scope,
        isGlobal: p.source.scope === "GLOBAL",
      },
    }));

    // 7. Log query
    await this.logQuery({
      query,
      workspaceId,
      sourceIds: Array.from(new Set(pages.map((p) => p.source.id))),
      resultsCount: results.length,
      latencyMs: Date.now() - startTime,
    });

    return {
      results,
      total: combined.length,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Get sources available to a workspace
   */
  private async getWorkspaceSources(workspaceId: string, sourceIds?: string[]) {
    return prisma.source.findMany({
      where: {
        OR: [
          { scope: "GLOBAL", status: "ACTIVE" },
          {
            workspaceSources: {
              some: { workspaceId },
            },
            status: "ACTIVE",
          },
        ],
        ...(sourceIds ? { id: { in: sourceIds } } : {}),
      },
      select: { id: true },
    });
  }

  /**
   * Full-text search using PostgreSQL ts_vector
   */
  private async fullTextSearch(query: string, sourceIds: string[]) {
    return prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT
        p.id,
        ts_rank(
          to_tsvector('english', p."contentText"),
          plainto_tsquery('english', ${query})
        ) as rank
      FROM pages p
      WHERE p."sourceId"::text = ANY(${sourceIds})
        AND to_tsvector('english', p."contentText") @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 100
    `;
  }

  /**
   * Vector similarity search using pgvector
   */
  private async vectorSearch(query: string, sourceIds: string[]) {
    try {
      // Get embedding provider on-demand
      const embeddingProvider = await getEmbeddingProvider();

      // Generate query embedding
      const embeddings = await embeddingProvider.generateEmbeddings([
        query,
      ]);
      const queryVector = embeddings[0];

      const embeddingStr = `[${queryVector.join(",")}]`;

      // Perform vector search
      return prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
        SELECT
          c."pageId" as id,
          1 - (c.embedding <=> ${embeddingStr}::vector) as similarity
        FROM chunks c
        INNER JOIN pages p ON c."pageId" = p.id
        WHERE p."sourceId"::text = ANY(${sourceIds})
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> ${embeddingStr}::vector
        LIMIT 100
      `;
    } catch (error) {
      console.error("Vector search failed:", error);
      return [];
    }
  }

  /**
   * Combine results using Reciprocal Rank Fusion
   */
  private reciprocalRankFusion(
    ftsResults: Array<{ id: string; rank: number }>,
    vectorResults: Array<{ id: string; similarity: number }>
  ): Array<{ id: string; score: number }> {
    const k = 60; // RRF constant
    const scores = new Map<string, number>();

    // Add FTS scores
    ftsResults.forEach((result, index) => {
      const score = 1 / (k + index + 1);
      scores.set(result.id, (scores.get(result.id) || 0) + score);
    });

    // Add vector scores
    vectorResults.forEach((result, index) => {
      const score = 1 / (k + index + 1);
      scores.set(result.id, (scores.get(result.id) || 0) + score);
    });

    // Sort by combined score
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({ id, score }));
  }

  /**
   * Extract snippet from content
   */
  private extractSnippet(text: string, query: string, length = 200): string {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return text.slice(0, length) + "...";
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 150);

    return (
      (start > 0 ? "..." : "") +
      text.slice(start, end) +
      (end < text.length ? "..." : "")
    );
  }

  /**
   * Log query for analytics
   */
  private async logQuery(data: {
    query: string;
    workspaceId: string;
    sourceIds: string[];
    resultsCount: number;
    latencyMs: number;
  }) {
    try {
      await prisma.queryLog.create({
        data: {
          query: data.query,
          workspaceId: data.workspaceId,
          sourceIds: data.sourceIds,
          resultsCount: data.resultsCount,
          latencyMs: data.latencyMs,
          queriedAt: new Date(),
        },
      });

      // Update source usage stats
      for (const sourceId of data.sourceIds) {
        await prisma.sourceUsageStats.upsert({
          where: { sourceId },
          create: {
            sourceId,
            queryCount: 1,
            lastQueriedAt: new Date(),
          },
          update: {
            queryCount: { increment: 1 },
            lastQueriedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error("Failed to log query:", error);
      // Don't throw - logging failure shouldn't break search
    }
  }
}

/**
 * Get filtered and boosted sources based on parsed query
 */
export async function getFilteredSources(
  parsed: ParsedQuery,
  baseSourceIds: string[]
): Promise<{ ids: string[]; boostMap: Map<string, number> }> {
  const boostMap = new Map<string, number>();

  // Get all sources with their domains and tags
  const sources = await prisma.source.findMany({
    where: { id: { in: baseSourceIds } },
    select: {
      id: true,
      domain: true,
      tags: true,
    },
  });

  // Apply boosts for framework matches
  for (const source of sources) {
    let boost = 1.0;

    // Check if source domain matches any detected framework
    if (parsed.frameworks.length > 0) {
      const domainMatch = parsed.frameworks.some((fw) =>
        fw.domains.some((domain) => source.domain.includes(domain))
      );

      if (domainMatch) {
        boost = 2.0; // Strong boost for framework match
      }

      // Check if source has framework tags
      const frameworkTags = parsed.frameworks.map((f) => `framework:${f.name}`);
      const tagMatch =
        source.tags && source.tags.some((tag) => frameworkTags.includes(tag));

      if (tagMatch) {
        boost = Math.max(boost, 1.5); // Moderate boost for tag match
      }
    }

    boostMap.set(source.id, boost);
  }

  return {
    ids: baseSourceIds,
    boostMap,
  };
}

/**
 * Hybrid search function that works with parsed queries
 */
export async function hybridSearch(
  parsed: ParsedQuery,
  sourceIds: string[],
  excludePageIds: string[] = [],
  limit = 50
): Promise<RerankableResult[]> {
  const embeddingProvider = await getEmbeddingProvider();

  // Build search query from keywords
  const searchQuery = parsed.keywords.join(" ");

  // 1. Full-text search (BM25)
  const ftsResults =
    excludePageIds.length > 0
      ? await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT
          p.id,
          ts_rank(
            to_tsvector('english', p."contentText"),
            plainto_tsquery('english', ${searchQuery})
          ) as rank
        FROM pages p
        WHERE p."sourceId"::text = ANY(${sourceIds})
          AND p.id::text != ALL(${excludePageIds})
          AND to_tsvector('english', p."contentText") @@ plainto_tsquery('english', ${searchQuery})
        ORDER BY rank DESC
        LIMIT ${limit}
      `
      : await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT
          p.id,
          ts_rank(
            to_tsvector('english', p."contentText"),
            plainto_tsquery('english', ${searchQuery})
          ) as rank
        FROM pages p
        WHERE p."sourceId"::text = ANY(${sourceIds})
          AND to_tsvector('english', p."contentText") @@ plainto_tsquery('english', ${searchQuery})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

  // 2. Vector similarity search
  let vectorResults: Array<{ id: string; similarity: number }> = [];
  try {
    const embeddings = await embeddingProvider.generateEmbeddings([
      searchQuery,
    ]);
    const queryVector = embeddings[0];
    const embeddingStr = `[${queryVector.join(",")}]`;

    vectorResults =
      excludePageIds.length > 0
        ? await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
          SELECT
            c."pageId" as id,
            1 - (c.embedding <=> ${embeddingStr}::vector) as similarity
          FROM chunks c
          INNER JOIN pages p ON c."pageId" = p.id
          WHERE p."sourceId"::text = ANY(${sourceIds})
            AND c."pageId"::text != ALL(${excludePageIds})
            AND c.embedding IS NOT NULL
          ORDER BY c.embedding <=> ${embeddingStr}::vector
          LIMIT ${limit}
        `
        : await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
          SELECT
            c."pageId" as id,
            1 - (c.embedding <=> ${embeddingStr}::vector) as similarity
          FROM chunks c
          INNER JOIN pages p ON c."pageId" = p.id
          WHERE p."sourceId"::text = ANY(${sourceIds})
            AND c.embedding IS NOT NULL
          ORDER BY c.embedding <=> ${embeddingStr}::vector
          LIMIT ${limit}
        `;
  } catch (error) {
    console.error("Vector search failed:", error);
  }

  // 3. Combine using Reciprocal Rank Fusion
  const k = 60;
  const scores = new Map<
    string,
    { text: number; vector: number; combined: number }
  >();

  ftsResults.forEach((result, index) => {
    const score = 1 / (k + index + 1);
    scores.set(result.id, {
      text: score,
      vector: 0,
      combined: score,
    });
  });

  vectorResults.forEach((result, index) => {
    const score = 1 / (k + index + 1);
    const existing = scores.get(result.id);
    if (existing) {
      existing.vector = score;
      existing.combined += score;
    } else {
      scores.set(result.id, {
        text: 0,
        vector: score,
        combined: score,
      });
    }
  });

  // 4. Get top page IDs
  const topPageIds = Array.from(scores.entries())
    .sort((a, b) => b[1].combined - a[1].combined)
    .slice(0, limit)
    .map(([id]) => id);

  if (topPageIds.length === 0) {
    return [];
  }

  // 5. Fetch page details
  const pages = await prisma.page.findMany({
    where: { id: { in: topPageIds } },
    include: {
      source: {
        select: {
          id: true,
          name: true,
          domain: true,
          url: true,
          scope: true,
          tags: true,
        },
      },
    },
  });

  // 6. Format as RerankableResult
  const results: RerankableResult[] = pages.map((page) => {
    const pageScores = scores.get(page.id)!;
    return {
      pageId: page.id,
      title: page.title || page.url,
      url: page.url,
      content: page.contentText || "",
      source: {
        id: page.source.id,
        name: page.source.name || page.source.domain,
        domain: page.source.domain,
        scope: page.source.scope as 'GLOBAL' | 'WORKSPACE',
        tags: page.source.tags || undefined,
      },
      scores: {
        combined: pageScores.combined,
        text: pageScores.text,
        vector: pageScores.vector,
      },
    };
  });

  // Sort by combined score
  results.sort((a, b) => b.scores.combined - a.scores.combined);

  return results;
}
