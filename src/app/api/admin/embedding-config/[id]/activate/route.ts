// Admin Embedding Config Activation — PATCH /api/admin/embedding-config/[id]/activate

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { embeddingProviderConfigs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError, NotFoundError } from "@/lib/utils/errors";
import { eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/embedding-config/[id]/activate
 * Activate a specific configuration, deactivating all others.
 */
export async function PATCH(
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

    // Deactivate all other configurations
    await db
      .update(embeddingProviderConfigs)
      .set({ isActive: false })
      .where(ne(embeddingProviderConfigs.id, id));

    // Activate this configuration
    const [activated] = await db
      .update(embeddingProviderConfigs)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(embeddingProviderConfigs.id, id))
      .returning();

    const { connectionConfig: _cfg, ...safeConfig } = activated;
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    return handleApiError(error);
  }
}
