// Hybrid Search Engine
// Combines BM25 (PostgreSQL full-text search) and pgvector similarity search
// with configurable weights. Filters by workspace or collection when specified.

import { db } from "@/lib/db";
import { sql, eq, and, inArray } from "drizzle-orm";
import {
  chunks,
  pages,
  documents,
  sources,
  workspaceSources,
  collections,
  collectionSources,
} from "@/lib/db/schema";
import { generateEmbeddings } from "@/lib/embeddings/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  chunkId: string;
  pageId: string | null;
  documentId: string | null;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  title: string;
  /** Chunk content truncated to ~300 characters. */
  excerpt: string;
  /** Combined BM25 + vector score. */
  score: number;
  bm25Score: number;
  vectorScore: number;
  indexedAt: Date | null;
}

export interface SearchOptions {
  workspaceId?: string;
  collectionId?: string;
  sourceIds?: string[];
  /** Weight applied to BM25 score (default 0.3). */
  bm25Weight?: number;
  /** Weight applied to vector similarity score (default 0.7). */
  vectorWeight?: number;
  /** Maximum number of results to return (default 20). */
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the set of source IDs visible for a given workspace.
 * Includes both workspace-linked sources and GLOBAL sources.
 */
async function getWorkspaceSourceIds(workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ sourceId: workspaceSources.sourceId })
    .from(workspaceSources)
    .where(eq(workspaceSources.workspaceId, workspaceId));

  const wsIds = rows.map((r) => r.sourceId);

  // Also include GLOBAL sources
  const globalRows = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.scope, "GLOBAL"));

  const globalIds = globalRows.map((r) => r.id);

  // Deduplicate
  return [...new Set([...wsIds, ...globalIds])];
}

/**
 * Returns the set of source IDs belonging to a collection.
 */
async function getCollectionSourceIds(collectionId: string): Promise<string[]> {
  const rows = await db
    .select({ sourceId: collectionSources.sourceId })
    .from(collectionSources)
    .where(eq(collectionSources.collectionId, collectionId));

  return rows.map((r) => r.sourceId);
}

// ---------------------------------------------------------------------------
// Main search function
// ---------------------------------------------------------------------------

/**
 * Hybrid search combining BM25 full-text and pgvector similarity.
 *
 * Approach:
 * 1. Generate query embedding.
 * 2. Run vector similarity search (top 100 candidates).
 * 3. Run BM25 full-text search (top 100 candidates).
 * 4. Merge results by combining scores: combined = bm25Weight * bm25 + vectorWeight * vector.
 * 5. Filter to allowed source IDs (workspace / collection / explicit list).
 * 6. Join with pages / documents / sources for metadata.
 * 7. Return top `limit` sorted by combined score.
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions
): Promise<{ results: SearchResult[]; total: number }> {
  const {
    workspaceId,
    collectionId,
    sourceIds: explicitSourceIds,
    bm25Weight = 0.3,
    vectorWeight = 0.7,
    limit = 20,
    offset = 0,
  } = options;

  if (!query || !query.trim()) {
    return { results: [], total: 0 };
  }

  // Determine the allowed source IDs (null means "no filter")
  let allowedSourceIds: string[] | null = null;

  if (explicitSourceIds && explicitSourceIds.length > 0) {
    allowedSourceIds = explicitSourceIds;
  } else if (collectionId) {
    allowedSourceIds = await getCollectionSourceIds(collectionId);
    if (allowedSourceIds.length === 0) {
      return { results: [], total: 0 };
    }
  } else if (workspaceId) {
    allowedSourceIds = await getWorkspaceSourceIds(workspaceId);
    if (allowedSourceIds.length === 0) {
      return { results: [], total: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // Step 1: Generate query embedding
  // ---------------------------------------------------------------------------
  let queryEmbedding: number[];
  try {
    const embeddings = await generateEmbeddings([query]);
    queryEmbedding = embeddings[0];
  } catch (err) {
    console.error("[HybridSearch] Failed to generate query embedding:", err);
    // Fall back to zeros — BM25 results will still surface
    queryEmbedding = new Array(1536).fill(0);
  }

  const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

  // ---------------------------------------------------------------------------
  // Step 2: Vector similarity search (raw SQL required for <=> operator)
  // ---------------------------------------------------------------------------
  // We pull top 100 candidates by vector distance. The embedding column may be
  // null for chunks that were never embedded; those are excluded.
  const vectorRows = await db.execute<{
    id: string;
    vector_score: number;
  }>(sql`
    SELECT
      id,
      (1 - (embedding <=> ${sql.raw(`'${embeddingLiteral}'::vector`)}))::float8 AS vector_score
    FROM chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${sql.raw(`'${embeddingLiteral}'::vector`)}
    LIMIT 100
  `);

  // ---------------------------------------------------------------------------
  // Step 3: BM25 full-text search (Drizzle query builder)
  // ---------------------------------------------------------------------------
  const bm25Rows = await db.execute<{
    id: string;
    bm25_score: number;
  }>(sql`
    SELECT
      id,
      ts_rank(
        to_tsvector('english', content),
        plainto_tsquery('english', ${query})
      ) AS bm25_score
    FROM chunks
    WHERE to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
    LIMIT 100
  `);

  // ---------------------------------------------------------------------------
  // Step 4: Merge results
  // ---------------------------------------------------------------------------
  const scoreMap = new Map<string, { bm25Score: number; vectorScore: number }>();

  for (const row of vectorRows) {
    const existing = scoreMap.get(row.id) ?? { bm25Score: 0, vectorScore: 0 };
    existing.vectorScore = Number(row.vector_score);
    scoreMap.set(row.id, existing);
  }

  for (const row of bm25Rows) {
    const existing = scoreMap.get(row.id) ?? { bm25Score: 0, vectorScore: 0 };
    existing.bm25Score = Number(row.bm25_score);
    scoreMap.set(row.id, existing);
  }

  if (scoreMap.size === 0) {
    return { results: [], total: 0 };
  }

  const candidateIds = [...scoreMap.keys()];

  // ---------------------------------------------------------------------------
  // Step 5: Fetch chunk metadata + join parents
  // ---------------------------------------------------------------------------
  const chunkRows = await db.query.chunks.findMany({
    where: inArray(chunks.id, candidateIds),
    with: {
      page: {
        with: { source: true },
      },
      document: {
        with: { source: true },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Step 6: Filter by allowed source IDs and compute combined scores
  // ---------------------------------------------------------------------------
  type ScoredResult = SearchResult & { _combined: number };
  const scored: ScoredResult[] = [];

  for (const chunk of chunkRows) {
    // Resolve source from page or document parent
    const source = chunk.page?.source ?? chunk.document?.source ?? null;
    if (!source) continue;

    // Apply source filter
    if (allowedSourceIds && !allowedSourceIds.includes(source.id)) continue;

    const scores = scoreMap.get(chunk.id) ?? { bm25Score: 0, vectorScore: 0 };
    const combined =
      bm25Weight * scores.bm25Score + vectorWeight * scores.vectorScore;

    const title =
      chunk.page?.title ??
      chunk.document?.filename ??
      source.name ??
      source.url;

    const excerpt =
      chunk.content.length > 300
        ? chunk.content.slice(0, 297) + "..."
        : chunk.content;

    const indexedAt =
      chunk.page?.indexedAt ?? chunk.document?.indexedAt ?? null;

    scored.push({
      chunkId: chunk.id,
      pageId: chunk.pageId ?? null,
      documentId: chunk.documentId ?? null,
      sourceId: source.id,
      sourceName: source.name ?? source.domain,
      sourceType: source.type,
      title: title ?? "Untitled",
      excerpt,
      score: combined,
      bm25Score: scores.bm25Score,
      vectorScore: scores.vectorScore,
      indexedAt,
      _combined: combined,
    });
  }

  // Sort by combined score descending
  scored.sort((a, b) => b._combined - a._combined);

  const total = scored.length;

  // Apply pagination
  const paginated = scored.slice(offset, offset + limit);

  // Strip the internal _combined field before returning
  const results: SearchResult[] = paginated.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ _combined, ...rest }) => rest
  );

  return { results, total };
}
