// Workspace API Routes - GET /api/workspaces, POST /api/workspaces

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { eq, or } from "drizzle-orm";

// GET /api/workspaces — list workspaces for the authenticated user
export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Find workspaces where user is owner
    const ownedWorkspaces = await db.query.workspaces.findMany({
      where: eq(workspaces.ownerId, userId),
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

    // Find workspaces where user is a member (but not owner)
    const memberEntries = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.userId, userId),
      with: {
        workspace: {
          with: {
            members: {
              with: {
                user: {
                  columns: { id: true, name: true, email: true, image: true },
                },
              },
            },
          },
        },
      },
    });

    // Deduplicate (owned workspaces may appear in member list too)
    const ownedIds = new Set(ownedWorkspaces.map((w) => w.id));
    const memberWorkspaces = memberEntries
      .map((m) => m.workspace)
      .filter((w) => !ownedIds.has(w.id));

    const allWorkspaces = [...ownedWorkspaces, ...memberWorkspaces];

    return NextResponse.json({ workspaces: allWorkspaces });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/workspaces — create a new workspace
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      throw new ValidationError("Workspace name is required");
    }
    if (name.length > 100) {
      throw new ValidationError("Workspace name must be 100 characters or fewer");
    }

    // Auto-generate slug from name + timestamp
    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now()}`;

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name,
        slug,
        ownerId: userId,
      })
      .returning();

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
