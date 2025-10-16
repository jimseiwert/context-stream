/**
 * Admin Sources API Routes
 *
 * GET /api/admin/sources - List ALL sources (no pagination limit, admin only)
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

/**
 * GET /api/admin/sources
 * List all sources - admin only, no pagination limits
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get("scope"); // 'GLOBAL' | 'WORKSPACE' | undefined
    const status = searchParams.get("status");

    // Build query
    const where: any = {};

    if (scope) {
      where.scope = scope;
    }

    if (status) {
      where.status = status;
    }

    // Fetch ALL sources (no limit)
    const sources = await prisma.source.findMany({
      where,
      include: {
        _count: {
          select: {
            pages: true,
            documents: true,
            workspaceSources: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format sources to match frontend expectations
    const formattedSources = sources.map((source) => ({
      ...source,
      // For DOCUMENT sources, use documents count; for others use pages count
      pageCount: source.type === 'DOCUMENT' ? source._count.documents : source._count.pages,
      workspaceCount: source._count.workspaceSources,
      config: source.config || undefined,
    }));

    return NextResponse.json({
      sources: formattedSources,
      summary: {
        total: sources.length,
        global: sources.filter((s) => s.scope === "GLOBAL").length,
        workspace: sources.filter((s) => s.scope === "WORKSPACE").length,
      },
    });
  } catch (error: any) {
    console.error("[API] GET /api/admin/sources error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
