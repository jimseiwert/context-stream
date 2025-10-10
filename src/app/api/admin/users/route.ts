/**
 * Admin Users API
 * GET /api/admin/users - List all users (SUPER_ADMIN only)
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * List all users with their stats
 * Requires SUPER_ADMIN role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    // Get all users with their related data
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            workspaces: true,
            apiKeys: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format users for response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      image: user.image || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      _count: {
        workspaces: user._count.workspaces,
        apiKeys: user._count.apiKeys,
      },
    }));

    return NextResponse.json({
      users: formattedUsers,
    });
  } catch (error: any) {
    console.error("[API] GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
