// Workspace Leave Route - POST /api/workspaces/[id]/leave

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/utils/errors";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/workspaces/[id]/leave — leave a workspace (cannot leave if owner)
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = session.user.id;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      columns: { id: true, ownerId: true },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace");
    }

    if (workspace.ownerId === userId) {
      throw new ForbiddenError(
        "The workspace owner cannot leave. Transfer ownership or delete the workspace instead."
      );
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, id),
        eq(workspaceMembers.userId, userId)
      ),
      columns: { id: true },
    });

    if (!membership) {
      throw new ForbiddenError("You are not a member of this workspace");
    }

    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
