// Admin Embedding Config API — GET, POST /api/admin/embedding-config

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { embeddingProviderConfigs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { encryptApiKey } from "@/lib/utils/encryption";

export const dynamic = "force-dynamic";

const VALID_PROVIDERS = [
  "OPENAI",
  "AZURE_OPENAI",
  "VERTEX_AI",
  "VERTEX_AI_RAG_ENGINE",
] as const;

type EmbeddingProviderValue = (typeof VALID_PROVIDERS)[number];

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const configs = await db.query.embeddingProviderConfigs.findMany({
      columns: {
        id: true,
        provider: true,
        name: true,
        model: true,
        dimensions: true,
        sharedCredentialId: true,
        isRagEngine: true,
        useBatchForNew: true,
        useBatchForRescrape: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // connectionConfig intentionally excluded (contains encrypted secrets)
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

    const provider =
      typeof body.provider === "string" ? body.provider : "";
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const model =
      typeof body.model === "string" ? body.model.trim() : "";
    const dimensions =
      typeof body.dimensions === "number" ? body.dimensions : 1536;
    const isRagEngine = body.isRagEngine === true;
    const sharedCredentialId =
      typeof body.sharedCredentialId === "string"
        ? body.sharedCredentialId
        : null;

    if (!VALID_PROVIDERS.includes(provider as EmbeddingProviderValue)) {
      throw new ValidationError(
        `provider must be one of: ${VALID_PROVIDERS.join(", ")}`
      );
    }

    if (!model) {
      throw new ValidationError("model is required");
    }

    // connectionConfig — the caller passes a plain JSON object; we encrypt it.
    const rawConnectionConfig =
      body.connectionConfig &&
      typeof body.connectionConfig === "object" &&
      !Array.isArray(body.connectionConfig)
        ? (body.connectionConfig as Record<string, unknown>)
        : null;

    if (!rawConnectionConfig) {
      throw new ValidationError("connectionConfig is required");
    }

    const connectionConfig = encryptApiKey(
      JSON.stringify(rawConnectionConfig)
    );

    const [config] = await db
      .insert(embeddingProviderConfigs)
      .values({
        provider: provider as EmbeddingProviderValue,
        name,
        model,
        dimensions,
        connectionConfig,
        sharedCredentialId: sharedCredentialId || null,
        isRagEngine,
        isActive: false,
      })
      .returning();

    const { connectionConfig: _cfg, ...safeConfig } = config;

    return NextResponse.json({ config: safeConfig }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
