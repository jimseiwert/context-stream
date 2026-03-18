// Admin RAG Engine Config API — GET, POST /api/admin/rag-engine-config

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ragEngineConfigs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { encryptApiKey } from "@/lib/utils/encryption";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const configs = await db.query.ragEngineConfigs.findMany({
      columns: {
        id: true,
        name: true,
        provider: true,
        sharedCredentialId: true,
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

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const provider =
      typeof body.provider === "string" ? body.provider.trim() : "";
    const sharedCredentialId =
      typeof body.sharedCredentialId === "string"
        ? body.sharedCredentialId
        : null;

    if (!provider) {
      throw new ValidationError("provider is required");
    }

    if (
      !body.connectionConfig ||
      typeof body.connectionConfig !== "object" ||
      Array.isArray(body.connectionConfig)
    ) {
      throw new ValidationError("connectionConfig must be a non-null object");
    }

    const connectionConfigEncrypted = encryptApiKey(
      JSON.stringify(body.connectionConfig as Record<string, unknown>)
    );

    const [config] = await db
      .insert(ragEngineConfigs)
      .values({
        name,
        provider,
        connectionConfig: connectionConfigEncrypted,
        sharedCredentialId: sharedCredentialId || null,
        isActive: false,
      })
      .returning({
        id: ragEngineConfigs.id,
        name: ragEngineConfigs.name,
        provider: ragEngineConfigs.provider,
        sharedCredentialId: ragEngineConfigs.sharedCredentialId,
        isActive: ragEngineConfigs.isActive,
        createdAt: ragEngineConfigs.createdAt,
        updatedAt: ragEngineConfigs.updatedAt,
      });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
