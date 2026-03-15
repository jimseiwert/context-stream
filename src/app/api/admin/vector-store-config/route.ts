// Admin Vector Store Config API — GET, POST /api/admin/vector-store-config

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vectorStoreConfigs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { encryptApiKey } from "@/lib/utils/encryption";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const configs = await db.query.vectorStoreConfigs.findMany({
      columns: {
        id: true,
        provider: true,
        additionalConfig: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // connectionEncrypted intentionally excluded from list
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
    const connectionString =
      typeof body.connectionString === "string"
        ? body.connectionString.trim()
        : "";

    const validProviders = ["PGVECTOR", "PINECONE", "QDRANT", "WEAVIATE"];
    if (!validProviders.includes(provider)) {
      throw new ValidationError(
        "provider must be one of: PGVECTOR, PINECONE, QDRANT, WEAVIATE"
      );
    }

    if (!connectionString) {
      throw new ValidationError("connectionString is required");
    }

    // Encrypt the connection string at rest
    let connectionEncrypted: string;
    try {
      connectionEncrypted = encryptApiKey(connectionString);
    } catch {
      // If ENCRYPTION_KEY is not set, store as plain text with a prefix marker
      connectionEncrypted = `plain:${connectionString}`;
    }

    const [config] = await db
      .insert(vectorStoreConfigs)
      .values({
        provider: provider as "PGVECTOR" | "PINECONE" | "QDRANT" | "WEAVIATE",
        connectionEncrypted,
        isActive: false,
      })
      .returning({
        id: vectorStoreConfigs.id,
        provider: vectorStoreConfigs.provider,
        additionalConfig: vectorStoreConfigs.additionalConfig,
        isActive: vectorStoreConfigs.isActive,
        createdAt: vectorStoreConfigs.createdAt,
        updatedAt: vectorStoreConfigs.updatedAt,
      });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
