// Workspace Members Routes - GET, POST /api/workspaces/[id]/members

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from "@/lib/utils/errors";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/workspaces/[id]/members — list workspace members
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    // Must be owner or member to view members
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, id),
        eq(workspaceMembers.userId, userId)
      ),
      columns: { id: true },
    });

    if (workspace.ownerId !== userId && !membership) {
      throw new ForbiddenError("You do not have access to this workspace");
    }

    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, id),
      with: {
        user: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/workspaces/[id]/members — invite member by email
export async function POST(request: NextRequest, { params }: RouteParams) {
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
      throw new ForbiddenError("Only the workspace owner can invite members");
    }

    const body = await request.json() as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      throw new ValidationError("Email is required");
    }

    // Find user by email
    const invitedUser = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true, name: true },
    });

    if (!invitedUser) {
      throw new NotFoundError(`User with email ${email}`);
    }

    // Check if already a member
    const existing = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, id),
        eq(workspaceMembers.userId, invitedUser.id)
      ),
      columns: { id: true },
    });

    if (existing) {
      throw new ConflictError("User is already a member of this workspace");
    }

    // Cannot invite the owner (they're implicitly a member)
    if (invitedUser.id === workspace.ownerId) {
      throw new ConflictError("Cannot invite the workspace owner as a member");
    }

    const [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId: id,
        userId: invitedUser.id,
        role: "USER",
        // joinedAt is null — indicates pending invitation
      })
      .returning();

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
