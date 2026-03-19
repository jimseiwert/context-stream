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
async function embedBatch(texts: string[], vectorStoreConfigId?: string | null): Promise<number[][]> {
  let config;
  try {
    config = await getActiveEmbeddingConfig(vectorStoreConfigId);
  } catch {
    console.warn(
      "[Embeddings] No active embedding config — returning zero embeddings"
    );
    return generateZeroEmbeddings(texts, 1536);
  }

  const cc = config.connectionConfig as Record<string, unknown>;

  // model and dimensions are stored in connectionConfig for the new schema
  const model = cc.model as string | undefined;
  const dimensions = typeof cc.dimensions === "number" ? cc.dimensions : 1536;

  // RAG engine providers handle embeddings internally
  if (config.provider === "vertex_ai_rag_engine") {
    console.warn(
      "[Embeddings] Active provider is a RAG Engine — embeddings are handled internally. Returning zeros."
    );
    return generateZeroEmbeddings(texts, dimensions);
  }

  switch (config.provider) {
    case "openai": {
      const apiKey = cc.apiKey as string | undefined;
      if (!apiKey) throw new Error("OpenAI requires connectionConfig.apiKey");
      if (!model) throw new Error("OpenAI requires connectionConfig.model");

      const url = "https://api.openai.com/v1/embeddings";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
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

    case "azure_openai": {
      const apiKey = cc.apiKey as string | undefined;
      const endpoint = cc.endpoint as string | undefined;
      const deploymentName = cc.deploymentName as string | undefined;
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

    case "vertex_ai": {
      // Delegate to VertexAIEmbeddingProvider which handles both accessToken and serviceAccountJson
      const { VertexAIEmbeddingProvider } = await import("./vertex");
      const provider = new VertexAIEmbeddingProvider(config);
      return provider.generateEmbeddings(texts);
    }

    default:
      console.warn(
        `[Embeddings] Unknown provider ${config.provider} — returning zero embeddings`
      );
      return generateZeroEmbeddings(texts, dimensions);
  }
}

/**
 * Generates embeddings for an array of texts.
 * If vectorStoreConfigId is provided, uses that specific store config.
 * Otherwise uses the globally active one.
 */
export async function generateEmbeddings(texts: string[], vectorStoreConfigId?: string | null): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(batch, vectorStoreConfigId);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
