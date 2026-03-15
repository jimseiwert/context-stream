// Admin Embedding Config API — GET, POST /api/admin/embedding-config

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { embeddingProviderConfigs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const configs = await db.query.embeddingProviderConfigs.findMany({
      columns: {
        id: true,
        provider: true,
        model: true,
        dimensions: true,
        apiEndpoint: true,
        deploymentName: true,
        useBatchForNew: true,
        useBatchForRescrape: true,
        additionalConfig: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // apiKey intentionally excluded from list response
      },
    });

    return NextResponse.json({ configs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as Record<string, unknown>;

    const provider = typeof body.provider === "string" ? body.provider : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const dimensions =
      typeof body.dimensions === "number" ? body.dimensions : 1536;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const apiEndpoint =
      typeof body.apiEndpoint === "string" ? body.apiEndpoint.trim() : null;
    const deploymentName =
      typeof body.deploymentName === "string"
        ? body.deploymentName.trim()
        : null;

    const validProviders = ["OPENAI", "AZURE_OPENAI", "VERTEX_AI"];
    if (!validProviders.includes(provider)) {
      throw new ValidationError(
        "provider must be one of: OPENAI, AZURE_OPENAI, VERTEX_AI"
      );
    }

    if (!model) {
      throw new ValidationError("model is required");
    }

    if (!apiKey) {
      throw new ValidationError("apiKey is required");
    }

    const [config] = await db
      .insert(embeddingProviderConfigs)
      .values({
        provider: provider as "OPENAI" | "AZURE_OPENAI" | "VERTEX_AI",
        model,
        dimensions,
        apiKey,
        apiEndpoint: apiEndpoint || null,
        deploymentName: deploymentName || null,
        isActive: false,
      })
      .returning();

    // Return config without apiKey
    const { apiKey: _key, ...safeConfig } = config;

    return NextResponse.json({ config: safeConfig }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
