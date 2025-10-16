/**
 * Workspace API Routes - Individual Workspace Operations
 *
 * GET    /api/workspaces/[id] - Get workspace details
 * PUT    /api/workspaces/[id] - Update workspace
 * DELETE /api/workspaces/[id] - Delete workspace
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional(),
});

/**
 * GET /api/workspaces/[id]
 * Get workspace details with sources
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workspace = await prisma.workspace.findUnique({
      where: {
        id,
        ownerId: session.user.id, // Ensure user owns this workspace
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sources: {
          include: {
            source: {
              select: {
                id: true,
                url: true,
                type: true,
                status: true,
                scope: true,
                createdAt: true,
                lastScrapedAt: true,
                _count: {
                  select: {
                    pages: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            sources: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error: any) {
    console.error("[API] GET /api/workspaces/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workspaces/[id]
 * Update workspace details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify workspace belongs to user
    const existing = await prisma.workspace.findUnique({
      where: {
        id,
        ownerId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const data = UpdateWorkspaceSchema.parse(body);

    // Build update data
    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = data.name.toLowerCase().replace(/\s+/g, "-");
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    // Update workspace
    const workspace = await prisma.workspace.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            sources: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Workspace updated successfully",
      workspace,
    });
  } catch (error: any) {
    console.error("[API] PUT /api/workspaces/[id] error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]
 * Delete workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify workspace belongs to user
    const workspace = await prisma.workspace.findUnique({
      where: {
        id,
        ownerId: session.user.id,
      },
      include: {
        _count: {
          select: {
            sources: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has other workspaces
    const userWorkspaces = await prisma.workspace.count({
      where: {
        ownerId: session.user.id,
      },
    });

    if (userWorkspaces === 1) {
      return NextResponse.json(
        { error: "Cannot delete your only workspace" },
        { status: 400 }
      );
    }

    // Delete workspace (this will cascade delete workspace-source relations)
    await prisma.workspace.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Workspace deleted successfully",
    });
  } catch (error: any) {
    console.error("[API] DELETE /api/workspaces/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
