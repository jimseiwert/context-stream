/**
 * Admin Embedding Config Test API
 * POST /api/admin/embedding-config/test - Test embedding provider connection
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { OpenAIEmbeddingProvider } from "@/lib/embeddings/openai";
import { AzureOpenAIEmbeddingProvider } from "@/lib/embeddings/azure";
import { VertexAIEmbeddingProvider } from "@/lib/embeddings/vertex";
import type { EmbeddingConfig } from "@/lib/embeddings/config";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/embedding-config/test
 * Test embedding provider connection without saving
 * Requires SUPER_ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      provider,
      model,
      dimensions,
      apiKey,
      apiEndpoint,
      deploymentName,
      additionalConfig,
    } = body;

    // Validate required fields
    if (!provider || !model || !dimensions || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: provider, model, dimensions, apiKey" },
        { status: 400 }
      );
    }

    // Create a test config (not saved to database)
    const testConfig: EmbeddingConfig = {
      id: "test",
      provider,
      model,
      dimensions: parseInt(dimensions, 10),
      apiKey,
      apiEndpoint: apiEndpoint || null,
      deploymentName: deploymentName || null,
      useBatchForNew: false,
      useBatchForRescrape: false,
      additionalConfig: additionalConfig || null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create provider instance based on type
    let embeddingProvider;
    try {
      switch (provider) {
        case "OPENAI":
          embeddingProvider = new OpenAIEmbeddingProvider(testConfig);
          break;

        case "AZURE_OPENAI":
          if (!apiEndpoint || !deploymentName) {
            return NextResponse.json(
              { error: "Azure OpenAI requires apiEndpoint and deploymentName" },
              { status: 400 }
            );
          }
          embeddingProvider = new AzureOpenAIEmbeddingProvider(testConfig);
          break;

        case "VERTEX_AI":
          if (!additionalConfig?.projectId || !additionalConfig?.location) {
            return NextResponse.json(
              { error: "Vertex AI requires projectId and location in additionalConfig" },
              { status: 400 }
            );
          }
          embeddingProvider = new VertexAIEmbeddingProvider(testConfig);
          break;

        default:
          return NextResponse.json(
            { error: `Unsupported provider: ${provider}` },
            { status: 400 }
          );
      }
    } catch (error: any) {
      console.error("[API] Provider instantiation failed:", error);
      return NextResponse.json(
        { error: "Failed to create provider", details: error.message },
        { status: 400 }
      );
    }

    // Test the connection by generating a test embedding
    try {
      const testText = "This is a test sentence for embedding generation.";
      const startTime = Date.now();
      const embeddings = await embeddingProvider.generateEmbeddings([testText]);
      const latencyMs = Date.now() - startTime;

      if (!embeddings || embeddings.length === 0) {
        throw new Error("No embeddings returned");
      }

      const embedding = embeddings[0];
      if (!Array.isArray(embedding) || embedding.length !== dimensions) {
        throw new Error(
          `Expected embedding dimension ${dimensions}, got ${embedding.length}`
        );
      }

      return NextResponse.json({
        success: true,
        message: "Connection successful",
        test: {
          provider,
          model,
          dimensions,
          embeddingLength: embedding.length,
          latencyMs,
        },
      });
    } catch (error: any) {
      console.error("[API] Test embedding generation failed:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Connection test failed",
          details: error.message,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[API] POST /api/admin/embedding-config/test error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
