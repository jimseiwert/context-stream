// Workspace Member Routes - PATCH, DELETE /api/workspaces/[id]/members/[userId]

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/utils/errors";
import { eq, and } from "drizzle-orm";
import type { UserRole } from "@/lib/db/schema/enums";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

// PATCH /api/workspaces/[id]/members/[userId] — update member role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id, userId: targetUserId } = await params;
    const requesterId = session.user.id;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      columns: { id: true, ownerId: true },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace");
    }

    if (workspace.ownerId !== requesterId) {
      throw new ForbiddenError("Only the workspace owner can change member roles");
    }

    const body = await request.json() as Record<string, unknown>;
    const role = body.role as string | undefined;

    const validRoles: UserRole[] = ["USER", "ADMIN", "SUPER_ADMIN"];
    if (!role || !validRoles.includes(role as UserRole)) {
      throw new ValidationError(
        `Role must be one of: ${validRoles.join(", ")}`
      );
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, id),
        eq(workspaceMembers.userId, targetUserId)
      ),
      columns: { id: true },
    });

    if (!membership) {
      throw new NotFoundError("Workspace member");
    }

    const [updated] = await db
      .update(workspaceMembers)
      .set({ role: role as UserRole })
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, targetUserId)
        )
      )
      .returning();

    return NextResponse.json({ member: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/workspaces/[id]/members/[userId] — remove member
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id, userId: targetUserId } = await params;
    const requesterId = session.user.id;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      columns: { id: true, ownerId: true },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace");
    }

    // Owner can remove anyone; members can only remove themselves
    const isSelf = requesterId === targetUserId;
    const isOwner = workspace.ownerId === requesterId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenError("You do not have permission to remove this member");
    }

    // Cannot remove the owner via this endpoint
    if (targetUserId === workspace.ownerId) {
      throw new ForbiddenError(
        "Cannot remove the workspace owner. Use the leave endpoint or delete the workspace."
      );
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, id),
        eq(workspaceMembers.userId, targetUserId)
      ),
      columns: { id: true },
    });

    if (!membership) {
      throw new NotFoundError("Workspace member");
    }

    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, targetUserId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
