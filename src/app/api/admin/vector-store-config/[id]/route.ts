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
      // Deactivate all other configs
      await db
        .update(vectorStoreConfigs)
        .set({ isActive: false })
        .where(ne(vectorStoreConfigs.id, id));
      updateData.isActive = true;
    } else if ("isActive" in body) {
      updateData.isActive = body.isActive;
    }

    if (
      typeof body.connectionString === "string" &&
      body.connectionString.trim()
    ) {
      try {
        updateData.connectionEncrypted = encryptApiKey(
          body.connectionString.trim()
        );
      } catch {
        updateData.connectionEncrypted = `plain:${body.connectionString.trim()}`;
      }
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
        provider: vectorStoreConfigs.provider,
        additionalConfig: vectorStoreConfigs.additionalConfig,
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

    await db
      .delete(vectorStoreConfigs)
      .where(eq(vectorStoreConfigs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
