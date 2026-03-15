// Admin Vector Store Config API — GET, POST /api/admin/vector-store-config

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vectorStoreConfigs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { encryptApiKey } from "@/lib/utils/encryption";

export const dynamic = "force-dynamic";

const VALID_PROVIDERS = [
  "PGVECTOR",
  "PINECONE",
  "QDRANT",
  "WEAVIATE",
  "VERTEX_AI_VECTOR_SEARCH",
] as const;

type VectorStoreProviderValue = (typeof VALID_PROVIDERS)[number];

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const configs = await db.query.vectorStoreConfigs.findMany({
      columns: {
        id: true,
        provider: true,
        name: true,
        sharedCredentialId: true,
        handlesEmbedding: true,
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
    const handlesEmbedding = body.handlesEmbedding === true;
    const sharedCredentialId =
      typeof body.sharedCredentialId === "string"
        ? body.sharedCredentialId
        : null;

    if (!VALID_PROVIDERS.includes(provider as VectorStoreProviderValue)) {
      throw new ValidationError(
        `provider must be one of: ${VALID_PROVIDERS.join(", ")}`
      );
    }

    // Accept either connectionConfig (new) or connectionString (legacy simple form)
    let connectionConfig: Record<string, unknown> | null = null;

    if (
      body.connectionConfig &&
      typeof body.connectionConfig === "object" &&
      !Array.isArray(body.connectionConfig)
    ) {
      connectionConfig = body.connectionConfig as Record<string, unknown>;
    } else if (
      typeof body.connectionString === "string" &&
      body.connectionString.trim()
    ) {
      // Legacy simple form — wrap in connectionConfig
      connectionConfig = { connectionString: body.connectionString.trim() };
    }

    if (!connectionConfig) {
      throw new ValidationError(
        "connectionConfig (or connectionString) is required"
      );
    }

    const connectionConfigEncrypted = encryptApiKey(
      JSON.stringify(connectionConfig)
    );

    const [config] = await db
      .insert(vectorStoreConfigs)
      .values({
        provider: provider as VectorStoreProviderValue,
        name,
        connectionConfig: connectionConfigEncrypted,
        sharedCredentialId: sharedCredentialId || null,
        handlesEmbedding,
        isActive: false,
      })
      .returning({
        id: vectorStoreConfigs.id,
        provider: vectorStoreConfigs.provider,
        name: vectorStoreConfigs.name,
        sharedCredentialId: vectorStoreConfigs.sharedCredentialId,
        handlesEmbedding: vectorStoreConfigs.handlesEmbedding,
        isActive: vectorStoreConfigs.isActive,
        createdAt: vectorStoreConfigs.createdAt,
        updatedAt: vectorStoreConfigs.updatedAt,
      });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
