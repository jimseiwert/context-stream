// POST /api/admin/rag-engine-config/test
// Test a RAG engine connection with provided config values (without saving).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { getGcpBearerToken } from "@/lib/utils/gcp-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as Record<string, unknown>;
    const connectionConfig = body.connectionConfig as Record<string, unknown> | undefined;

    if (!connectionConfig || typeof connectionConfig !== "object") {
      return NextResponse.json(
        { error: { message: "connectionConfig is required" } },
        { status: 400 }
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
        { error: { message: "projectId, location, and ragCorpusId are required to test the connection" } },
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
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const detail = data.error?.message ?? res.statusText;
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
