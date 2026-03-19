// Admin System — POST /api/admin/system/test-rag-engine
// Tests the active RAG engine config by verifying corpus access

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { ragEngineConfigs } from "@/lib/db/schema";
import { decryptApiKey } from "@/lib/utils/encryption";
import { getGcpBearerToken } from "@/lib/utils/gcp-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdmin();

    const activeConfig = await db.query.ragEngineConfigs.findFirst({
      where: eq(ragEngineConfigs.isActive, true),
    });

    if (!activeConfig) {
      return NextResponse.json(
        { error: { message: "No active RAG engine configured." } },
        { status: 400 }
      );
    }

    let connectionConfig: Record<string, unknown>;
    try {
      connectionConfig = JSON.parse(
        decryptApiKey(activeConfig.connectionConfig)
      ) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: { message: "Failed to decrypt RAG engine config — encryption key may have changed." } },
        { status: 500 }
      );
    }

    const { projectId, location, ragCorpusId, serviceAccountJson } = connectionConfig as {
      projectId?: string;
      location?: string;
      ragCorpusId?: string;
      serviceAccountJson?: object;
    };

    if (!projectId || !location || !ragCorpusId) {
      return NextResponse.json(
        { error: { message: "RAG engine config is missing projectId, location, or ragCorpusId." } },
        { status: 400 }
      );
    }

    const corpusResourceName = `projects/${projectId}/locations/${location}/ragCorpora/${ragCorpusId}`;
    const start = Date.now();

    let token: string;
    try {
      token = await getGcpBearerToken(serviceAccountJson);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: { message: `Authentication failed: ${msg}` } },
        { status: 400 }
      );
    }

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1beta1/${corpusResourceName}`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const detail = body.error?.message ?? res.statusText;
      return NextResponse.json(
        { error: { message: `Corpus unreachable (${res.status}): ${detail}` } },
        { status: 400 }
      );
    }

    const corpus = (await res.json()) as { displayName?: string; name?: string };

    return NextResponse.json({
      latencyMs,
      corpusName: corpus.displayName ?? corpus.name ?? corpusResourceName,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
