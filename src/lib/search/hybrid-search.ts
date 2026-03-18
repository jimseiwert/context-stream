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
import { getEmbeddingConfigById } from "@/lib/embeddings/config";

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
  /**
   * If provided, use this vector store config's embedding settings for
   * generating the query embedding instead of the globally active config.
   */
  vectorStoreConfigId?: string;
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

/**
 * Fetches just the `vectorStoreConfigId` FK from a collection row.
 * Returns undefined if the collection does not exist or has no assigned store.
 */
async function getCollectionVectorStoreId(
  collectionId: string
): Promise<string | undefined> {
  const rows = await db
    .select({ vectorStoreConfigId: collections.vectorStoreConfigId })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  return rows[0]?.vectorStoreConfigId ?? undefined;
}

/**
 * Generates a single query embedding vector.
 *
 * When `vectorStoreConfigId` is supplied the embedding is generated using that
 * store's own embedding provider and decrypted credentials (via
 * `getEmbeddingConfigById`). This ensures the query vector lives in the same
 * embedding space as the stored chunk vectors.
 *
 * Falls back to the globally active config (via `generateEmbeddings`) when no
 * store ID is provided.
 *
 * Returns a zero vector on any failure so BM25 results still surface.
 */
async function generateQueryEmbedding(
  query: string,
  vectorStoreConfigId?: string
): Promise<number[]> {
  // --- Path 1: use the specific store's embedding config ---
  if (vectorStoreConfigId) {
    try {
      const config = await getEmbeddingConfigById(vectorStoreConfigId);
      if (!config) {
        console.warn(
          `[HybridSearch] Vector store config ${vectorStoreConfigId} not found — falling back to global config`
        );
        // fall through to Path 2
      } else {
        const cc = config.connectionConfig as Record<string, unknown>;
        const dimensions =
          typeof cc.dimensions === "number" ? cc.dimensions : 1536;

        switch (config.provider) {
          case "openai": {
            const apiKey = cc.apiKey as string | undefined;
            const model = cc.model as string | undefined;
            if (!apiKey || !model) {
              throw new Error(
                "OpenAI embedding config missing apiKey or model"
              );
            }
            const response = await fetch(
              "https://api.openai.com/v1/embeddings",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model,
                  input: [query],
                  encoding_format: "float",
                }),
                signal: AbortSignal.timeout(60000),
              }
            );
            if (!response.ok) {
              const body = await response.text().catch(() => "");
              throw new Error(
                `OpenAI embeddings API error ${response.status}: ${body.slice(0, 300)}`
              );
            }
            const data = (await response.json()) as {
              data: Array<{ embedding: number[]; index: number }>;
            };
            return data.data[0].embedding;
          }

          case "azure_openai": {
            const apiKey = cc.apiKey as string | undefined;
            const endpoint = cc.endpoint as string | undefined;
            const deploymentName = cc.deploymentName as string | undefined;
            if (!apiKey || !endpoint || !deploymentName) {
              throw new Error(
                "Azure OpenAI embedding config missing apiKey, endpoint, or deploymentName"
              );
            }
            const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deploymentName}/embeddings?api-version=2024-02-01`;
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "api-key": apiKey,
              },
              body: JSON.stringify({ input: [query], encoding_format: "float" }),
              signal: AbortSignal.timeout(60000),
            });
            if (!response.ok) {
              const body = await response.text().catch(() => "");
              throw new Error(
                `Azure OpenAI embeddings API error ${response.status}: ${body.slice(0, 300)}`
              );
            }
            const data = (await response.json()) as {
              data: Array<{ embedding: number[]; index: number }>;
            };
            return data.data[0].embedding;
          }

          case "vertex_ai": {
            const { VertexAIEmbeddingProvider } = await import(
              "@/lib/embeddings/vertex"
            );
            const provider = new VertexAIEmbeddingProvider(config);
            const embeddings = await provider.generateEmbeddings([query]);
            return embeddings[0];
          }

          default:
            console.warn(
              `[HybridSearch] Unknown embedding provider "${config.provider}" for store ${vectorStoreConfigId} — falling back to global config`
            );
            // fall through to Path 2
        }
      }
    } catch (err) {
      console.error(
        `[HybridSearch] Failed to generate embedding with store config ${vectorStoreConfigId}:`,
        err
      );
      return new Array(1536).fill(0);
    }
  }

  // --- Path 2: fall back to the globally active embedding config ---
  try {
    const embeddings = await generateEmbeddings([query]);
    return embeddings[0];
  } catch (err) {
    console.error("[HybridSearch] Failed to generate query embedding:", err);
    return new Array(1536).fill(0);
  }
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
    vectorStoreConfigId: explicitVsConfigId,
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
  // Resolve the vector store config to use for embeddings:
  //   - explicit vectorStoreConfigId on options takes highest precedence
  //   - otherwise, derive it from the collection's assigned store
  //   - if neither is available, generateQueryEmbedding falls back to the
  //     globally active config
  // ---------------------------------------------------------------------------
  const vsConfigId =
    explicitVsConfigId ??
    (collectionId
      ? await getCollectionVectorStoreId(collectionId)
      : undefined);

  const queryEmbedding = await generateQueryEmbedding(query, vsConfigId);

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
