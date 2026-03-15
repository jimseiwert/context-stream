// Admin Embedding Config — PATCH, DELETE /api/admin/embedding-config/[id]

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { embeddingProviderConfigs } from "@/lib/db/schema";
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

    const existing = await db.query.embeddingProviderConfigs.findFirst({
      where: eq(embeddingProviderConfigs.id, id),
    });

    if (!existing) {
      throw new NotFoundError("EmbeddingProviderConfig");
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    // "Set active" — deactivate all others first
    if ("isActive" in body && body.isActive === true) {
      await db
        .update(embeddingProviderConfigs)
        .set({ isActive: false })
        .where(ne(embeddingProviderConfigs.id, id));
      updateData.isActive = true;
    } else if ("isActive" in body) {
      updateData.isActive = body.isActive;
    }

    if (typeof body.name === "string") updateData.name = body.name.trim();
    if (typeof body.model === "string") updateData.model = body.model.trim();
    if (typeof body.dimensions === "number")
      updateData.dimensions = body.dimensions;
    if (typeof body.isRagEngine === "boolean")
      updateData.isRagEngine = body.isRagEngine;
    if ("sharedCredentialId" in body) {
      updateData.sharedCredentialId =
        typeof body.sharedCredentialId === "string"
          ? body.sharedCredentialId
          : null;
    }

    // connectionConfig — only update if caller provides a new object
    if (
      "connectionConfig" in body &&
      body.connectionConfig &&
      typeof body.connectionConfig === "object" &&
      !Array.isArray(body.connectionConfig)
    ) {
      updateData.connectionConfig = encryptApiKey(
        JSON.stringify(body.connectionConfig)
      );
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(embeddingProviderConfigs)
      .set(updateData)
      .where(eq(embeddingProviderConfigs.id, id))
      .returning();

    const { connectionConfig: _cfg, ...safeConfig } = updated;
    return NextResponse.json({ config: safeConfig });
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

    const existing = await db.query.embeddingProviderConfigs.findFirst({
      where: eq(embeddingProviderConfigs.id, id),
    });

    if (!existing) {
      throw new NotFoundError("EmbeddingProviderConfig");
    }

    await db
      .delete(embeddingProviderConfigs)
      .where(eq(embeddingProviderConfigs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
