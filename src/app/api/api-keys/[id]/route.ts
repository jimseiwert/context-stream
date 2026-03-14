// API Key Routes - DELETE /api/api-keys/[id]

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/utils/errors";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/api-keys/[id] — revoke (delete) the key (user must own it)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = session.user.id;

    const key = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, id),
      columns: { id: true, userId: true },
    });

    if (!key) {
      throw new NotFoundError("API key");
    }

    if (key.userId !== userId) {
      throw new ForbiddenError("You do not own this API key");
    }

    await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
