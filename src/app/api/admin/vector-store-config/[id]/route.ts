// Admin Vector Store Config — PATCH, DELETE /api/admin/vector-store-config/[id]

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vectorStoreConfigs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import {
  handleApiError,
  NotFoundError,
  ValidationError,
} from "@/lib/utils/errors";
import { encryptApiKey } from "@/lib/utils/encryption";
import { eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await db.query.vectorStoreConfigs.findFirst({
      where: eq(vectorStoreConfigs.id, id),
    });

    if (!existing) {
      throw new NotFoundError("VectorStoreConfig");
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    if ("isActive" in body && body.isActive === true) {
      await db
        .update(vectorStoreConfigs)
        .set({ isActive: false })
        .where(ne(vectorStoreConfigs.id, id));
      updateData.isActive = true;
    } else if ("isActive" in body) {
      updateData.isActive = body.isActive;
    }

    if (typeof body.name === "string") {
      updateData.name = body.name.trim();
    }

    if (typeof body.storeProvider === "string") {
      updateData.storeProvider = body.storeProvider.trim();
    }

    if (typeof body.embeddingProvider === "string") {
      updateData.embeddingProvider = body.embeddingProvider.trim();
    }

    if (typeof body.useBatchForNew === "boolean") {
      updateData.useBatchForNew = body.useBatchForNew;
    }

    if (typeof body.useBatchForRescrape === "boolean") {
      updateData.useBatchForRescrape = body.useBatchForRescrape;
    }

    if ("storeCredentialId" in body) {
      updateData.storeCredentialId =
        typeof body.storeCredentialId === "string"
          ? body.storeCredentialId
          : null;
    }

    if ("embeddingCredentialId" in body) {
      updateData.embeddingCredentialId =
        typeof body.embeddingCredentialId === "string"
          ? body.embeddingCredentialId
          : null;
    }

    if (
      "storeConfig" in body &&
      body.storeConfig &&
      typeof body.storeConfig === "object" &&
      !Array.isArray(body.storeConfig)
    ) {
      updateData.storeConfig = encryptApiKey(
        JSON.stringify(body.storeConfig as Record<string, unknown>)
      );
    }

    if (
      "embeddingConfig" in body &&
      body.embeddingConfig &&
      typeof body.embeddingConfig === "object" &&
      !Array.isArray(body.embeddingConfig)
    ) {
      updateData.embeddingConfig = encryptApiKey(
        JSON.stringify(body.embeddingConfig as Record<string, unknown>)
      );
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(vectorStoreConfigs)
      .set(updateData)
      .where(eq(vectorStoreConfigs.id, id))
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

    return NextResponse.json({ config: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await db.query.vectorStoreConfigs.findFirst({
      where: eq(vectorStoreConfigs.id, id),
    });

    if (!existing) {
      throw new NotFoundError("VectorStoreConfig");
    }

    await db.delete(vectorStoreConfigs).where(eq(vectorStoreConfigs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
