// Embedding Service
// Reads active embedding provider config from DB and delegates to the appropriate provider

import { db } from "@/lib/db";
import { embeddingProviderConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const BATCH_SIZE = 100;

interface EmbeddingConfig {
  provider: "OPENAI" | "AZURE_OPENAI" | "VERTEX_AI";
  model: string;
  dimensions: number;
  apiKey: string;
  apiEndpoint?: string | null;
  deploymentName?: string | null;
}

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Fetches the active embedding provider configuration from the database.
 */
async function getActiveConfig(): Promise<EmbeddingConfig | null> {
  const config = await db.query.embeddingProviderConfigs.findFirst({
    where: eq(embeddingProviderConfigs.isActive, true),
  });

  if (!config) return null;

  return {
    provider: config.provider,
    model: config.model,
    dimensions: config.dimensions,
    apiKey: config.apiKey,
    apiEndpoint: config.apiEndpoint,
    deploymentName: config.deploymentName,
  };
}

/**
 * Generates embeddings via OpenAI API.
 */
async function embedWithOpenAI(
  texts: string[],
  config: EmbeddingConfig
): Promise<number[][]> {
  const endpoint = config.apiEndpoint ?? "https://api.openai.com";
  const url = `${endpoint.replace(/\/$/, "")}/v1/embeddings`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: texts,
      encoding_format: "float",
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenAI embeddings API error ${response.status}: ${body.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as OpenAIEmbeddingResponse;

  // Sort by index to ensure order matches input
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map((item) => item.embedding);
}

/**
 * Generates embeddings via Azure OpenAI API.
 */
async function embedWithAzureOpenAI(
  texts: string[],
  config: EmbeddingConfig
): Promise<number[][]> {
  if (!config.apiEndpoint || !config.deploymentName) {
    throw new Error(
      "Azure OpenAI requires both apiEndpoint and deploymentName to be configured"
    );
  }

  const url = `${config.apiEndpoint.replace(/\/$/, "")}/openai/deployments/${config.deploymentName}/embeddings?api-version=2024-02-01`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      input: texts,
      encoding_format: "float",
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Azure OpenAI embeddings API error ${response.status}: ${body.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as OpenAIEmbeddingResponse;
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map((item) => item.embedding);
}

/**
 * Returns zero-padded embeddings for development mode when no config is present.
 */
function generateZeroEmbeddings(texts: string[], dimensions: number): number[][] {
  return texts.map(() => new Array<number>(dimensions).fill(0));
}

/**
 * Processes a single batch of texts through the configured embedding provider.
 */
async function embedBatch(
  texts: string[],
  config: EmbeddingConfig | null
): Promise<number[][]> {
  if (!config) {
    console.warn("[Embeddings] No active embedding config — returning zero embeddings");
    return generateZeroEmbeddings(texts, 1536);
  }

  switch (config.provider) {
    case "OPENAI":
      return embedWithOpenAI(texts, config);
    case "AZURE_OPENAI":
      return embedWithAzureOpenAI(texts, config);
    case "VERTEX_AI":
      // Vertex AI not fully implemented — fall back to zeros in dev
      console.warn("[Embeddings] Vertex AI provider not yet implemented — returning zero embeddings");
      return generateZeroEmbeddings(texts, config.dimensions);
    default:
      console.warn(`[Embeddings] Unknown provider — returning zero embeddings`);
      return generateZeroEmbeddings(texts, 1536);
  }
}

/**
 * Generates embeddings for an array of texts.
 * Reads the active provider config from DB, batches requests (max 100 per batch),
 * and returns a 2D array of embedding vectors.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const config = await getActiveConfig();

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(batch, config);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
