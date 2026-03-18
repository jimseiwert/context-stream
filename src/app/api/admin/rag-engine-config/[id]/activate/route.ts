// Admin RAG Engine Config — PATCH /api/admin/rag-engine-config/[id]/activate

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ragEngineConfigs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError, NotFoundError } from "@/lib/utils/errors";
import { eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
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

    // Deactivate all other configs, then activate this one
    await db
      .update(ragEngineConfigs)
      .set({ isActive: false })
      .where(ne(ragEngineConfigs.id, id));

    const [activated] = await db
      .update(ragEngineConfigs)
      .set({ isActive: true, updatedAt: new Date() })
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

    return NextResponse.json({ config: activated });
  } catch (error) {
    return handleApiError(error);
  }
}
