// Workspace API Routes - GET, PATCH, DELETE /api/workspaces/[id]

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

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/workspaces/[id] — workspace details + members
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = session.user.id;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      with: {
        members: {
          with: {
            user: {
              columns: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace");
    }

    // User must be the owner or a member
    const isMember = workspace.members.some((m) => m.userId === userId);
    const isOwner = workspace.ownerId === userId;

    if (!isOwner && !isMember) {
      throw new ForbiddenError("You do not have access to this workspace");
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/workspaces/[id] — update workspace name (owner only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    if (workspace.ownerId !== userId) {
      throw new ForbiddenError("Only the workspace owner can update it");
    }

    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      throw new ValidationError("Workspace name is required");
    }
    if (name.length > 100) {
      throw new ValidationError("Workspace name must be 100 characters or fewer");
    }

    const [updated] = await db
      .update(workspaces)
      .set({ name, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();

    return NextResponse.json({ workspace: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/workspaces/[id] — delete workspace (owner only, not personal)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = session.user.id;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      columns: { id: true, ownerId: true, name: true },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace");
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenError("Only the workspace owner can delete it");
    }

    if (workspace.name === "Personal") {
      throw new ForbiddenError("Cannot delete your personal workspace");
    }

    await db
      .delete(workspaces)
      .where(and(eq(workspaces.id, id), eq(workspaces.ownerId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
