/**
 * Admin Embedding Config Test API
 * POST /api/admin/embedding-config/test — Test a provider connection without saving.
 * Requires SUPER_ADMIN role.
 */

import { getApiSession } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { OpenAIEmbeddingProvider } from "@/lib/embeddings/openai";
import { AzureOpenAIEmbeddingProvider } from "@/lib/embeddings/azure";
import { VertexAIEmbeddingProvider } from "@/lib/embeddings/vertex";
import type { EmbeddingConfig } from "@/lib/embeddings/config";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { role: true },
    });

    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { provider, connectionConfig } = body;

    if (!provider || !connectionConfig) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: provider, connectionConfig",
        },
        { status: 400 }
      );
    }

    if (
      typeof connectionConfig !== "object" ||
      Array.isArray(connectionConfig)
    ) {
      return NextResponse.json(
        { error: "connectionConfig must be a JSON object" },
        { status: 400 }
      );
    }

    const testConfig: EmbeddingConfig = {
      id: "test",
      provider: provider as string,
      name: "test",
      connectionConfig: connectionConfig as Record<string, unknown>,
      embeddingCredentialId: null,
      useBatchForNew: false,
      useBatchForRescrape: false,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let embeddingProvider;

    try {
      switch (provider) {
        case "openai":
          embeddingProvider = new OpenAIEmbeddingProvider(testConfig);
          break;

        case "azure_openai":
          embeddingProvider = new AzureOpenAIEmbeddingProvider(testConfig);
          break;

        case "vertex_ai":
          embeddingProvider = new VertexAIEmbeddingProvider(testConfig);
          break;

        case "vertex_ai_rag_engine":
          return NextResponse.json(
            {
              error:
                "Vertex AI RAG Engine handles embeddings internally — connection test is not available.",
            },
            { status: 400 }
          );

        default:
          return NextResponse.json(
            { error: `Unsupported provider: ${provider}` },
            { status: 400 }
          );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: "Failed to create provider", details: message },
        { status: 400 }
      );
    }

    try {
      const testText = "This is a test sentence for embedding generation.";
      const startTime = Date.now();
      const embeddings = await embeddingProvider.generateEmbeddings([testText]);
      const latencyMs = Date.now() - startTime;

      if (!embeddings || embeddings.length === 0) {
        throw new Error("No embeddings returned");
      }

      const embedding = embeddings[0];

      return NextResponse.json({
        success: true,
        message: "Connection successful",
        test: {
          provider,
          embeddingLength: embedding.length,
          latencyMs,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { success: false, error: "Connection test failed", details: message },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
