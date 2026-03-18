// Admin RAG Engine Config — PATCH, DELETE /api/admin/rag-engine-config/[id]

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ragEngineConfigs } from "@/lib/db/schema";
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

    const existing = await db.query.ragEngineConfigs.findFirst({
      where: eq(ragEngineConfigs.id, id),
    });

    if (!existing) {
      throw new NotFoundError("RagEngineConfig");
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    if ("isActive" in body && body.isActive === true) {
      await db
        .update(ragEngineConfigs)
        .set({ isActive: false })
        .where(ne(ragEngineConfigs.id, id));
      updateData.isActive = true;
    } else if ("isActive" in body) {
      updateData.isActive = body.isActive;
    }

    if (typeof body.name === "string") {
      updateData.name = body.name.trim();
    }

    if (typeof body.provider === "string") {
      updateData.provider = body.provider.trim();
    }

    if ("sharedCredentialId" in body) {
      updateData.sharedCredentialId =
        typeof body.sharedCredentialId === "string"
          ? body.sharedCredentialId
          : null;
    }

    if (
      "connectionConfig" in body &&
      body.connectionConfig &&
      typeof body.connectionConfig === "object" &&
      !Array.isArray(body.connectionConfig)
    ) {
      updateData.connectionConfig = encryptApiKey(
        JSON.stringify(body.connectionConfig as Record<string, unknown>)
      );
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(ragEngineConfigs)
      .set(updateData)
      .where(eq(ragEngineConfigs.id, id))
      .returning({
        id: ragEngineConfigs.id,
        name: ragEngineConfigs.name,
        provider: ragEngineConfigs.provider,
        sharedCredentialId: ragEngineConfigs.sharedCredentialId,
        isActive: ragEngineConfigs.isActive,
        createdAt: ragEngineConfigs.createdAt,
        updatedAt: ragEngineConfigs.updatedAt,
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

    const existing = await db.query.ragEngineConfigs.findFirst({
      where: eq(ragEngineConfigs.id, id),
    });

    if (!existing) {
      throw new NotFoundError("RagEngineConfig");
    }

    await db.delete(ragEngineConfigs).where(eq(ragEngineConfigs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
