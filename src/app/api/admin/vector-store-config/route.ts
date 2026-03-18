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
        name: true,
        storeProvider: true,
        storeCredentialId: true,
        embeddingProvider: true,
        embeddingCredentialId: true,
        useBatchForNew: true,
        useBatchForRescrape: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // storeConfig and embeddingConfig intentionally excluded (contain encrypted secrets)
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

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const storeProvider =
      typeof body.storeProvider === "string" ? body.storeProvider.trim() : "";
    const embeddingProvider =
      typeof body.embeddingProvider === "string"
        ? body.embeddingProvider.trim()
        : "";
    const useBatchForNew = body.useBatchForNew === true;
    const useBatchForRescrape = body.useBatchForRescrape !== false; // default true
    const storeCredentialId =
      typeof body.storeCredentialId === "string"
        ? body.storeCredentialId
        : null;
    const embeddingCredentialId =
      typeof body.embeddingCredentialId === "string"
        ? body.embeddingCredentialId
        : null;

    if (!storeProvider) {
      throw new ValidationError("storeProvider is required");
    }

    if (!embeddingProvider) {
      throw new ValidationError("embeddingProvider is required");
    }

    if (
      !body.storeConfig ||
      typeof body.storeConfig !== "object" ||
      Array.isArray(body.storeConfig)
    ) {
      throw new ValidationError("storeConfig must be a non-null object");
    }

    if (
      !body.embeddingConfig ||
      typeof body.embeddingConfig !== "object" ||
      Array.isArray(body.embeddingConfig)
    ) {
      throw new ValidationError("embeddingConfig must be a non-null object");
    }

    const storeConfigEncrypted = encryptApiKey(
      JSON.stringify(body.storeConfig as Record<string, unknown>)
    );
    const embeddingConfigEncrypted = encryptApiKey(
      JSON.stringify(body.embeddingConfig as Record<string, unknown>)
    );

    const [config] = await db
      .insert(vectorStoreConfigs)
      .values({
        name,
        storeProvider,
        storeConfig: storeConfigEncrypted,
        storeCredentialId: storeCredentialId || null,
        embeddingProvider,
        embeddingConfig: embeddingConfigEncrypted,
        embeddingCredentialId: embeddingCredentialId || null,
        useBatchForNew,
        useBatchForRescrape,
        isActive: false,
      })
      .returning({
        id: vectorStoreConfigs.id,
        name: vectorStoreConfigs.name,
        storeProvider: vectorStoreConfigs.storeProvider,
        storeCredentialId: vectorStoreConfigs.storeCredentialId,
        embeddingProvider: vectorStoreConfigs.embeddingProvider,
        embeddingCredentialId: vectorStoreConfigs.embeddingCredentialId,
        useBatchForNew: vectorStoreConfigs.useBatchForNew,
        useBatchForRescrape: vectorStoreConfigs.useBatchForRescrape,
        isActive: vectorStoreConfigs.isActive,
        createdAt: vectorStoreConfigs.createdAt,
        updatedAt: vectorStoreConfigs.updatedAt,
      });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
