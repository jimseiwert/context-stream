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
import { encryptApiKey, decryptApiKey } from "@/lib/utils/encryption";
import { eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await db.query.ragEngineConfigs.findFirst({
      where: eq(ragEngineConfigs.id, id),
    });

    if (!existing) throw new NotFoundError("RagEngineConfig");

    // Decrypt and return non-sensitive fields only.
    // serviceAccountJson is not returned — only whether one is stored.
    let decrypted: Record<string, unknown> = {};
    try {
      decrypted = JSON.parse(decryptApiKey(existing.connectionConfig)) as Record<string, unknown>;
    } catch {
      // If decryption fails, return empty fields (user must re-enter)
    }

    const { serviceAccountJson, ...nonSensitive } = decrypted as {
      serviceAccountJson?: unknown;
      [key: string]: unknown;
    };

    return NextResponse.json({
      config: {
        id: existing.id,
        name: existing.name,
        provider: existing.provider,
        isActive: existing.isActive,
        connectionConfig: nonSensitive,
        hasServiceAccountJson: Boolean(serviceAccountJson),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

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
      const incoming = body.connectionConfig as Record<string, unknown>;

      // If serviceAccountJson is absent or empty, preserve the existing one
      // so the user doesn't have to re-upload it on every edit.
      if (!incoming.serviceAccountJson) {
        try {
          const existingDecrypted = JSON.parse(
            decryptApiKey(existing.connectionConfig)
          ) as Record<string, unknown>;
          if (existingDecrypted.serviceAccountJson) {
            incoming.serviceAccountJson = existingDecrypted.serviceAccountJson;
          }
        } catch {
          // If decryption fails, proceed without merging
        }
      }

      updateData.connectionConfig = encryptApiKey(JSON.stringify(incoming));
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
