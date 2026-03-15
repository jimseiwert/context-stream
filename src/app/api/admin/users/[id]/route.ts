// Admin User Update API — PATCH /api/admin/users/[id]
// Update user role or account enabled state

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import {
  handleApiError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/utils/errors";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = (await request.json()) as Record<string, unknown>;

    // Find the target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundError("User");
    }

    const updateData: Record<string, unknown> = {};

    // Handle role update
    if ("role" in body) {
      const newRole = body.role as string;
      const validRoles = ["USER", "ADMIN", "SUPER_ADMIN"];

      if (!validRoles.includes(newRole)) {
        throw new ValidationError(
          "role must be one of: USER, ADMIN, SUPER_ADMIN"
        );
      }

      // ADMIN can only assign USER or ADMIN — not SUPER_ADMIN
      if (
        session.user.role === "ADMIN" &&
        newRole === "SUPER_ADMIN"
      ) {
        throw new ForbiddenError(
          "ADMIN cannot grant SUPER_ADMIN role"
        );
      }

      // Prevent self-demotion
      if (id === session.user.id && newRole !== session.user.role) {
        throw new ForbiddenError("Cannot change your own role");
      }

      updateData.role = newRole;
    }

    // Handle enable/disable (emailVerified as soft toggle)
    if ("emailVerified" in body) {
      const val = body.emailVerified;
      if (typeof val !== "boolean") {
        throw new ValidationError("emailVerified must be a boolean");
      }
      // Prevent disabling yourself
      if (id === session.user.id && val === false) {
        throw new ForbiddenError("Cannot disable your own account");
      }
      updateData.emailVerified = val;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    updateData.updatedAt = new Date();

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return handleApiError(error);
  }
}
