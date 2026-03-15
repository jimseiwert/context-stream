// Admin System — POST /api/admin/system/test-embedding
// Tests the active embedding provider with a sample text

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { generateEmbeddings } from "@/lib/embeddings/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as Record<string, unknown>;
    const text =
      typeof body.text === "string" && body.text.trim()
        ? body.text.trim()
        : "Hello, world!";

    if (!text) {
      throw new ValidationError("text is required");
    }

    const start = Date.now();
    const embeddings = await generateEmbeddings([text]);
    const latencyMs = Date.now() - start;

    const embedding = embeddings[0] ?? [];
    const dimensions = embedding.length;
    // Return the first 5 values as a sample
    const sample = embedding.slice(0, 5);

    return NextResponse.json({ dimensions, sample, latencyMs });
  } catch (error) {
    return handleApiError(error);
  }
}
