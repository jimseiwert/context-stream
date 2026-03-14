// API Key Routes - GET /api/api-keys, POST /api/api-keys

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// GET /api/api-keys — list user's API keys (prefix only, never full key)
export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, userId),
      columns: {
        id: true,
        name: true,
        key: false, // never expose full key in list
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        userId: true,
      },
    });

    // We need the first 8 chars as prefix — fetch separately
    const fullKeys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, userId),
      columns: { id: true, key: true },
    });

    const prefixMap = new Map(
      fullKeys.map((k) => [k.id, k.key.substring(0, 8)])
    );

    const result = keys.map((k) => ({
      ...k,
      prefix: prefixMap.get(k.id) ?? "",
    }));

    return NextResponse.json({ apiKeys: result });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/api-keys — create new API key (returns full key once)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      throw new ValidationError("API key name is required");
    }
    if (name.length > 100) {
      throw new ValidationError("API key name must be 100 characters or fewer");
    }

    // Parse optional expiresAt
    let expiresAt: Date | null = null;
    if (body.expiresAt !== undefined && body.expiresAt !== null) {
      const parsed = new Date(body.expiresAt as string);
      if (isNaN(parsed.getTime())) {
        throw new ValidationError("Invalid expiresAt date");
      }
      expiresAt = parsed;
    }

    // Generate key: cs_live_ prefix + 32 hex chars (16 random bytes)
    const randomHex = crypto.randomBytes(16).toString("hex");
    const key = `cs_live_${randomHex}`;

    const [created] = await db
      .insert(apiKeys)
      .values({
        name,
        key,
        userId,
        ...(expiresAt ? { expiresAt } : {}),
      })
      .returning();

    // Return full key once — never again
    return NextResponse.json(
      {
        apiKey: {
          id: created.id,
          name: created.name,
          key, // Full key returned only on creation
          prefix: key.substring(0, 8),
          createdAt: created.createdAt,
          expiresAt: created.expiresAt,
          lastUsedAt: created.lastUsedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
