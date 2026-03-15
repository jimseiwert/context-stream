// Search API Route — GET /api/search
// Accepts session auth (cookie) or API key (Authorization: Bearer <key>).
// Delegates to the hybrid search engine.
// Enforces search quota when NEXT_PUBLIC_SAAS_MODE=true.

import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/lib/search/hybrid-search";
import { parseQuery } from "@/lib/search/query-parser";
import { validateApiKey, getApiKeyFromHeaders } from "@/lib/auth/api-key";
import { getOptionalAuth } from "@/lib/auth/middleware";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/utils/errors";
import { checkQuota, trackUsage } from "@/lib/subscriptions/usage-tracker";

const saasMode = process.env.NEXT_PUBLIC_SAAS_MODE === "true";

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------------------------------------
    // Authentication: session OR API key
    // ---------------------------------------------------------------------------
    let userId: string | null = null;

    // Try session auth first
    const session = await getOptionalAuth();
    if (session) {
      userId = session.user.id;
    } else {
      // Try API key from Authorization header or X-API-Key header
      const rawKey = getApiKeyFromHeaders(request.headers);
      if (rawKey) {
        userId = await validateApiKey(rawKey);
      }
    }

    if (!userId) {
      throw new UnauthorizedError("Authentication required");
    }

    // ---------------------------------------------------------------------------
    // Quota enforcement (SaaS mode only)
    // ---------------------------------------------------------------------------
    if (saasMode) {
      const quota = await checkQuota(userId, "searches");
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: "quota_exceeded",
            resource: "searches",
            used: quota.used,
            limit: quota.limit,
            upgrade_url: "/settings/billing",
          },
          { status: 402 }
        );
      }
    }

    // ---------------------------------------------------------------------------
    // Parse query parameters
    // ---------------------------------------------------------------------------
    const { searchParams } = new URL(request.url);

    const rawQ = searchParams.get("q") ?? "";
    if (!rawQ.trim()) {
      throw new ValidationError("Query parameter 'q' is required");
    }

    // Allow inline key:value filters inside the query string
    const { query, filters } = parseQuery(rawQ);

    const workspaceId = searchParams.get("workspaceId") ?? filters["workspace"] ?? undefined;
    const collectionId = searchParams.get("collectionId") ?? filters["collection"] ?? undefined;

    const sourceIdsParam = searchParams.get("sourceIds");
    const sourceIds = sourceIdsParam
      ? sourceIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const bm25Weight = parseFloat(searchParams.get("bm25Weight") ?? "0.3");
    const vectorWeight = parseFloat(searchParams.get("vectorWeight") ?? "0.7");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Validate numeric params
    if (isNaN(bm25Weight) || bm25Weight < 0 || bm25Weight > 1) {
      throw new ValidationError("bm25Weight must be a number between 0 and 1");
    }
    if (isNaN(vectorWeight) || vectorWeight < 0 || vectorWeight > 1) {
      throw new ValidationError("vectorWeight must be a number between 0 and 1");
    }
    if (isNaN(limit) || limit < 1) {
      throw new ValidationError("limit must be a positive integer");
    }
    if (isNaN(offset) || offset < 0) {
      throw new ValidationError("offset must be a non-negative integer");
    }

    // ---------------------------------------------------------------------------
    // Execute search
    // ---------------------------------------------------------------------------
    const { results, total } = await hybridSearch(query || rawQ, {
      workspaceId,
      collectionId,
      sourceIds,
      bm25Weight,
      vectorWeight,
      limit,
      offset,
    });

    // ---------------------------------------------------------------------------
    // Track usage (SaaS mode only, fire-and-forget)
    // ---------------------------------------------------------------------------
    if (saasMode) {
      trackUsage(userId, "SEARCH").catch((err) =>
        console.error("[search] trackUsage failed:", err)
      );
    }

    return NextResponse.json({
      results,
      total,
      query: query || rawQ,
      options: {
        workspaceId,
        collectionId,
        sourceIds,
        bm25Weight,
        vectorWeight,
        limit,
        offset,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
