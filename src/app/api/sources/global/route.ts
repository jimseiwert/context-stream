// Global Sources Route - GET /api/sources/global
// Returns all GLOBAL-scoped sources (admin or any authenticated user can view)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { eq, desc } from "drizzle-orm";

// GET /api/sources/global — list all global sources
export async function GET() {
  try {
    await requireAuth();

    const globalSources = await db.query.sources.findMany({
      where: eq(sources.scope, "GLOBAL"),
      orderBy: [desc(sources.createdAt)],
    });

    return NextResponse.json({ sources: globalSources });
  } catch (error) {
    return handleApiError(error);
  }
}
