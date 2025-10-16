/**
 * Admin Embedding Config Activation API
 * PATCH /api/admin/embedding-config/[id]/activate - Activate a specific embedding provider configuration
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { maskApiKey } from "@/lib/utils/encryption";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/embedding-config/[id]/activate
 * Activate a specific embedding provider configuration
 * Deactivates all other configurations
 * Requires SUPER_ADMIN role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check if config exists
    const existingConfig = await prisma.embeddingProviderConfig.findUnique({
      where: { id },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    // Deactivate all other configurations
    await prisma.embeddingProviderConfig.updateMany({
      where: {
        isActive: true,
        id: { not: id }
      },
      data: { isActive: false },
    });

    // Activate this configuration
    const activatedConfig = await prisma.embeddingProviderConfig.update({
      where: { id },
      data: { isActive: true },
    });

    // Return config with masked key
    return NextResponse.json({
      config: {
        id: activatedConfig.id,
        provider: activatedConfig.provider,
        model: activatedConfig.model,
        dimensions: activatedConfig.dimensions,
        apiKey: "***masked***",
        apiEndpoint: activatedConfig.apiEndpoint,
        deploymentName: activatedConfig.deploymentName,
        useBatchForNew: activatedConfig.useBatchForNew,
        useBatchForRescrape: activatedConfig.useBatchForRescrape,
        additionalConfig: activatedConfig.additionalConfig,
        isActive: activatedConfig.isActive,
        createdAt: activatedConfig.createdAt.toISOString(),
        updatedAt: activatedConfig.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`[API] PATCH /api/admin/embedding-config/[id]/activate error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
