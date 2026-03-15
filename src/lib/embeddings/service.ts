// Embedding Service
// Reads active embedding provider config from DB and delegates to the appropriate provider

import { getActiveEmbeddingConfig } from "./config";

const BATCH_SIZE = 100;

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Returns zero-padded embeddings for development mode when no config is present.
 */
function generateZeroEmbeddings(
  texts: string[],
  dimensions: number
): number[][] {
  return texts.map(() => new Array<number>(dimensions).fill(0));
}

/**
 * Processes a single batch of texts through the configured embedding provider.
 */
async function embedBatch(texts: string[]): Promise<number[][]> {
  let config;
  try {
    config = await getActiveEmbeddingConfig();
  } catch {
    console.warn(
      "[Embeddings] No active embedding config — returning zero embeddings"
    );
    return generateZeroEmbeddings(texts, 1536);
  }

  if (config.isRagEngine) {
    console.warn(
      "[Embeddings] Active provider is a RAG Engine — embeddings are handled internally. Returning zeros."
    );
    return generateZeroEmbeddings(texts, config.dimensions);
  }

  const cc = config.connectionConfig as Record<string, string | undefined>;

  switch (config.provider) {
    case "OPENAI": {
      const apiKey = cc.apiKey;
      if (!apiKey) throw new Error("OpenAI requires connectionConfig.apiKey");

      const url = "https://api.openai.com/v1/embeddings";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
      return [...data.data]
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    }

    case "AZURE_OPENAI": {
      const { apiKey, endpoint, deploymentName } = cc;
      if (!apiKey || !endpoint || !deploymentName) {
        throw new Error(
          "Azure OpenAI requires connectionConfig.apiKey, endpoint, and deploymentName"
        );
      }

      const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deploymentName}/embeddings?api-version=2024-02-01`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ input: texts, encoding_format: "float" }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Azure OpenAI embeddings API error ${response.status}: ${body.slice(0, 300)}`
        );
      }

      const data = (await response.json()) as OpenAIEmbeddingResponse;
      return [...data.data]
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    }

    case "VERTEX_AI": {
      // Delegate to VertexAIEmbeddingProvider which handles both accessToken and serviceAccountJson
      const { VertexAIEmbeddingProvider } = await import("./vertex");
      const provider = new VertexAIEmbeddingProvider(config);
      return provider.generateEmbeddings(texts);
    }

    default:
      console.warn(
        `[Embeddings] Unknown provider ${config.provider} — returning zero embeddings`
      );
      return generateZeroEmbeddings(texts, config.dimensions);
  }
}

/**
 * Generates embeddings for an array of texts.
 * Reads the active provider config from DB, batches requests (max 100 per batch),
 * and returns a 2D array of embedding vectors.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(batch);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
