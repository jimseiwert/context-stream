/**
 * Admin Embedding Config API
 * GET /api/admin/embedding-config - List all embedding provider configurations
 * POST /api/admin/embedding-config - Create or update embedding provider configuration
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { getAllEmbeddingConfigs } from "@/lib/embeddings/config";
import { encryptApiKey } from "@/lib/utils/encryption";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/embedding-config
 * List all embedding provider configurations with masked API keys
 * Requires SUPER_ADMIN role
 */
export async function GET(request: NextRequest) {
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

    // Get all configs
    const configs = await getAllEmbeddingConfigs();

    // Mask API keys before returning to UI
    const configsWithMaskedKeys = configs.map(config => ({
      id: config.id,
      provider: config.provider,
      model: config.model,
      dimensions: config.dimensions,
      apiKey: "***masked***", // Never expose API keys to UI
      apiEndpoint: config.apiEndpoint,
      deploymentName: config.deploymentName,
      useBatchForNew: config.useBatchForNew,
      useBatchForRescrape: config.useBatchForRescrape,
      additionalConfig: config.additionalConfig,
      isActive: config.isActive,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    }));

    return NextResponse.json({ configs: configsWithMaskedKeys });
  } catch (error: any) {
    console.error("[API] GET /api/admin/embedding-config error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/embedding-config
 * Create a new embedding provider configuration
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
      useBatchForNew,
      useBatchForRescrape,
      additionalConfig,
      isActive,
    } = body;

    // Validate required fields
    if (!provider || !model || !dimensions || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: provider, model, dimensions, apiKey" },
        { status: 400 }
      );
    }

    // Validate provider-specific requirements
    if (provider === "AZURE_OPENAI") {
      if (!apiEndpoint || !deploymentName) {
        return NextResponse.json(
          { error: "Azure OpenAI requires apiEndpoint and deploymentName" },
          { status: 400 }
        );
      }
    }

    if (provider === "VERTEX_AI") {
      if (!additionalConfig?.projectId || !additionalConfig?.location) {
        return NextResponse.json(
          { error: "Vertex AI requires projectId and location in additionalConfig" },
          { status: 400 }
        );
      }
    }

    // Encrypt API key
    const encryptedApiKey = encryptApiKey(apiKey);

    // If this config should be active, deactivate all others
    if (isActive) {
      await prisma.embeddingProviderConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    // Create new config
    const config = await prisma.embeddingProviderConfig.create({
      data: {
        provider,
        model,
        dimensions: parseInt(dimensions, 10),
        apiKey: encryptedApiKey,
        apiEndpoint: apiEndpoint || null,
        deploymentName: deploymentName || null,
        useBatchForNew: useBatchForNew ?? false,
        useBatchForRescrape: useBatchForRescrape ?? true,
        additionalConfig: additionalConfig || null,
        isActive: isActive ?? false,
      },
    });

    // Return config with masked key - never expose API keys to UI
    return NextResponse.json({
      config: {
        id: config.id,
        provider: config.provider,
        model: config.model,
        dimensions: config.dimensions,
        apiKey: "***masked***", // Never expose API keys to UI
        apiEndpoint: config.apiEndpoint,
        deploymentName: config.deploymentName,
        useBatchForNew: config.useBatchForNew,
        useBatchForRescrape: config.useBatchForRescrape,
        additionalConfig: config.additionalConfig,
        isActive: config.isActive,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("[API] POST /api/admin/embedding-config error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
