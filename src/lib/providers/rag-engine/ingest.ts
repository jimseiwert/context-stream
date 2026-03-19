/**
 * Vertex AI RAG Engine — page ingestion
 *
 * Uploads a crawled page as a RAG file in the active corpus so that it becomes
 * searchable through the Vertex AI RAG Engine retrieval API.
 *
 * API reference:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/rag-api
 */

import { db } from "@/lib/db";
import { ragEngineConfigs } from "@/lib/db/schema";
import { decryptApiKey } from "@/lib/utils/encryption";
import { getGcpBearerToken } from "@/lib/utils/gcp-auth";
import { buildRagCorpusName } from "./vertex-ai-rag";
import { eq } from "drizzle-orm";

interface RagEngineConnection {
  projectId: string;
  location: string;
  ragCorpusId: string;
  serviceAccountJson?: object;
}

/**
 * Loads and decrypts a RAG engine config by ID, or falls back to the active one.
 * Returns null if neither is configured.
 */
export async function getActiveRagEngineConfig(
  specificId?: string | null
): Promise<RagEngineConnection | null> {
  const config = specificId
    ? await db.query.ragEngineConfigs.findFirst({
        where: eq(ragEngineConfigs.id, specificId),
      })
    : await db.query.ragEngineConfigs.findFirst({
        where: eq(ragEngineConfigs.isActive, true),
      });

  if (!config) return null;

  let connectionConfig: Record<string, unknown>;
  try {
    connectionConfig = JSON.parse(
      decryptApiKey(config.connectionConfig)
    ) as Record<string, unknown>;
  } catch {
    console.error("[RagIngest] Failed to decrypt RAG engine config");
    return null;
  }

  const { projectId, location, ragCorpusId, serviceAccountJson } =
    connectionConfig as {
      projectId?: string;
      location?: string;
      ragCorpusId?: string;
      serviceAccountJson?: object;
    };

  if (!projectId || !location || !ragCorpusId) {
    console.error("[RagIngest] RAG engine config missing required fields");
    return null;
  }

  return { projectId, location, ragCorpusId, serviceAccountJson };
}

/**
 * Uploads a single page to the active Vertex AI RAG corpus as a RAG file.
 *
 * Uses the uploadRagFile multipart API — no GCS bucket required.
 * Each call creates (or replaces, by display_name) a file in the corpus.
 *
 * @param connection - Decrypted RAG engine connection fields
 * @param displayName - Human-readable name for the RAG file (e.g. page title)
 * @param content - Plain-text content to index
 * @param sourceUrl - Original URL, stored as description metadata
 */
export async function uploadPageToRagCorpus(
  connection: RagEngineConnection,
  displayName: string,
  content: string,
  sourceUrl: string
): Promise<void> {
  const { projectId, location, ragCorpusId, serviceAccountJson } = connection;

  const corpusName = buildRagCorpusName(projectId, location, ragCorpusId);
  const token = await getGcpBearerToken(serviceAccountJson);

  const endpoint = `https://${location}-aiplatform.googleapis.com/upload/v1beta1/${corpusName}/ragFiles:upload`;

  // display_name must be a safe identifier — strip URL characters
  const safeName = displayName
    .replace(/https?:\/\//g, "")
    .replace(/[^a-zA-Z0-9._\- ]/g, "_")
    .slice(0, 128)
    .trim() || "page";

  // Build multipart/form-data manually so we control Content-Disposition exactly.
  // FormData + Blob always adds filename= to every part, which makes Vertex AI
  // report "Multipart body contains multiple files."
  // The metadata part must have NO filename — only the file part gets one.
  const boundary = `----ContextStreamBoundary${Date.now()}`;
  const metaJson = JSON.stringify({
    rag_file: { display_name: safeName, description: sourceUrl.slice(0, 1000) },
  });

  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="metadata"\r\n` +
    `Content-Type: application/json\r\n` +
    `\r\n` +
    `${metaJson}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeName}.txt"\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n` +
    `\r\n` +
    `${content}\r\n` +
    `--${boundary}--\r\n`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let detail: string;
    try {
      const data = JSON.parse(raw) as { error?: { message?: string } };
      detail = data.error?.message ?? raw.slice(0, 400);
    } catch {
      detail = raw.slice(0, 400) || res.statusText;
    }
    throw new Error(`Vertex AI RAG upload failed (${res.status}): ${detail}`);
  }
}
