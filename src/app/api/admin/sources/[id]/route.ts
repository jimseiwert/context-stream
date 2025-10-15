/**
 * Admin - Delete Source
 *
 * DELETE /api/admin/sources/[id]
 * Deletes any source (including GLOBAL)
 * Only accessible by ADMIN and SUPER_ADMIN roles
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/sources/[id]
 * Delete a source (including global sources)
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

    // Check if user is ADMIN or SUPER_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Only admins can delete sources" },
        { status: 403 }
      );
    }

    const { id: sourceId } = await params;

    // Fetch source with details for audit log
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        _count: {
          select: {
            workspaceSources: true,
            pages: true,
            jobs: true,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Store source details for response
    const sourceDetails = {
      id: source.id,
      url: source.url,
      name: source.name,
      scope: source.scope,
      status: source.status,
      pagesDeleted: source._count.pages,
      workspacesAffected: source._count.workspaceSources,
      jobsDeleted: source._count.jobs,
    };

    // Log the action BEFORE deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SOURCE_DELETED",
        entityType: "SOURCE",
        entityId: sourceId,
        before: {
          scope: source.scope,
          url: source.url,
          name: source.name,
          status: source.status,
          workspacesCount: source._count.workspaceSources,
          pagesCount: source._count.pages,
          jobsCount: source._count.jobs,
        },
        after: Prisma.JsonNull,
        reason: `Admin deleted ${source.scope.toLowerCase()} source`,
      },
    });

    // Delete source (cascade will handle pages, chunks, jobs, and workspace sources)
    await prisma.source.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({
      message: "Source deleted successfully",
      details: sourceDetails,
    });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[API] DELETE /api/admin/sources/${id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
