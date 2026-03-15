// Admin Users API — GET /api/admin/users
// List all users with workspace count and subscription info

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, workspaces, subscriptions, sessions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { eq, desc, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    // Fetch all users with workspace count, subscription, and latest session
    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // For each user, fetch workspace count and subscription
    const enriched = await Promise.all(
      userRows.map(async (user) => {
        const [wsCountResult] = await db
          .select({ count: count() })
          .from(workspaces)
          .where(eq(workspaces.ownerId, user.id));

        const subscription = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, user.id),
          columns: {
            planTier: true,
            status: true,
          },
        });

        // Get most recent session
        const latestSession = await db.query.sessions.findFirst({
          where: eq(sessions.userId, user.id),
          columns: {
            updatedAt: true,
          },
          orderBy: [desc(sessions.updatedAt)],
        });

        return {
          ...user,
          workspaceCount: wsCountResult?.count ?? 0,
          subscription: subscription ?? null,
          lastActiveAt: latestSession?.updatedAt ?? null,
        };
      })
    );

    return NextResponse.json({ users: enriched });
  } catch (error) {
    return handleApiError(error);
  }
}
