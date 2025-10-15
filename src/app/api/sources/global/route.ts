/**
 * Global Sources API Routes
 *
 * GET /api/sources/global - List available global sources (for browsing/adding)
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

/**
 * GET /api/sources/global
 * List available global sources for users to browse and add
 * Excludes sources already added to their workspace
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    // Get sources already added to workspace
    let addedSourceIds: string[] = [];
    if (workspace) {
      const workspaceSources = await prisma.workspaceSource.findMany({
        where: { workspaceId: workspace.id },
        select: { sourceId: true },
      });
      addedSourceIds = workspaceSources.map((ws) => ws.sourceId);
    }

    // Build where clause for global sources
    const where: any = {
      scope: "GLOBAL",
      status: "ACTIVE", // Only show active global sources
      ...(addedSourceIds.length > 0 && {
        id: { notIn: addedSourceIds }, // Exclude sources already added
      }),
    };

    // Add search filter
    if (search) {
      where.OR = [
        { domain: { contains: search, mode: "insensitive" } },
        { url: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch global sources with pagination
    const [sources, total] = await prisma.$transaction([
      prisma.source.findMany({
        where,
        select: {
          id: true,
          name: true,
          domain: true,
          url: true,
          logo: true,
          type: true,
          _count: {
            select: {
              pages: true,
              workspaceSources: true,
            },
          },
        },
        orderBy: [
          { workspaceSources: { _count: "desc" } }, // Most popular first
          { createdAt: "desc" },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.source.count({ where }),
    ]);

    return NextResponse.json({
      sources: sources.map((source) => ({
        ...source,
        pageCount: source._count.pages,
        workspaceCount: source._count.workspaceSources,
      })),
      pagination: {
        total,
        page,
        limit,
        hasMore: offset + sources.length < total,
      },
    });
  } catch (error: any) {
    console.error("[API] GET /api/sources/global error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
