/**
 * API Keys Management
 * GET  /api/api-keys - List user's API keys
 * POST /api/api-keys - Create new API key
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import * as crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().min(1).max(365).optional(),
});

/**
 * GET /api/api-keys
 * List user's API keys (without showing the actual key values)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ apiKeys });
  } catch (error: any) {
    console.error("[API] GET /api/api-keys error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys
 * Create a new API key for MCP authentication
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = CreateApiKeySchema.parse(body);

    // Generate a secure random API key
    const rawKey = crypto.randomBytes(32).toString("base64url");
    const keyPrefix = `cs_${rawKey.substring(0, 8)}`;
    const fullKey = `${keyPrefix}_${rawKey.substring(8)}`;

    // Hash the key for storage (we only store the hash, not the plaintext)
    const hashedKey = crypto.createHash("sha256").update(fullKey).digest("hex");

    // Calculate expiration date if specified
    let expiresAt: Date | null = null;
    if (data.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
    }

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        name: data.name,
        key: hashedKey,
        userId: session.user.id,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        apiKey,
        key: fullKey, // Return the plaintext key ONLY on creation
        warning: "Save this key securely! It will not be shown again.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API] POST /api/api-keys error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
