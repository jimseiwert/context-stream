/**
 * Workspace Sources API Routes
 *
 * POST /api/workspaces/[id]/sources - Add a source to a workspace
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AddSourceSchema = z.object({
  sourceId: z.string().uuid("Invalid source ID"),
});

/**
 * POST /api/workspaces/[id]/sources
 * Add an existing source to a workspace
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Verify user has access to this workspace (owner check)
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        ownerId: session.user.id,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const data = AddSourceSchema.parse(body);

    // Verify source exists
    const source = await prisma.source.findUnique({
      where: { id: data.sourceId },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    // For WORKSPACE scope sources, verify user has access
    if (source.scope === "WORKSPACE") {
      const hasAccess = await prisma.workspaceSource.findFirst({
        where: {
          sourceId: source.id,
          workspace: {
            ownerId: session.user.id,
          },
        },
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: "You don't have access to this workspace source" },
          { status: 403 }
        );
      }
    }

    // Check if source is already added to this workspace
    const existingLink = await prisma.workspaceSource.findUnique({
      where: {
        workspaceId_sourceId: {
          workspaceId,
          sourceId: data.sourceId,
        },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "This source is already added to the workspace" },
        { status: 409 }
      );
    }

    // Add source to workspace
    const workspaceSource = await prisma.workspaceSource.create({
      data: {
        workspaceId,
        sourceId: data.sourceId,
        addedBy: session.user.id,
      },
      include: {
        source: {
          include: {
            _count: {
              select: {
                pages: true,
                workspaceSources: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Source added to workspace successfully",
        workspaceSource,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API] POST /api/workspaces/[id]/sources error:", error);

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
