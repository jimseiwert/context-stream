/**
 * Admin Embedding Config API (by ID)
 * PATCH /api/admin/embedding-config/[id] - Update embedding provider configuration
 * DELETE /api/admin/embedding-config/[id] - Delete embedding provider configuration
 */

import { getApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import { encryptApiKey } from "@/lib/utils/encryption";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/embedding-config/[id]
 * Update an existing embedding provider configuration
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

    // Parse request body
    const body = await request.json();
    const {
      provider,
      model,
      dimensions,
      apiKey,
      apiEndpoint,
      deploymentName,
      useBatchForNew,
      useBatchForRescrape,
      additionalConfig,
      isActive,
    } = body;

    // Build update data object
    const updateData: any = {};

    if (provider !== undefined) updateData.provider = provider;
    if (model !== undefined) updateData.model = model;
    if (dimensions !== undefined) updateData.dimensions = parseInt(dimensions, 10);
    if (apiEndpoint !== undefined) updateData.apiEndpoint = apiEndpoint || null;
    if (deploymentName !== undefined) updateData.deploymentName = deploymentName || null;
    if (useBatchForNew !== undefined) updateData.useBatchForNew = useBatchForNew;
    if (useBatchForRescrape !== undefined) updateData.useBatchForRescrape = useBatchForRescrape;
    if (additionalConfig !== undefined) updateData.additionalConfig = additionalConfig || null;

    // If API key is provided, encrypt it
    if (apiKey) {
      updateData.apiKey = encryptApiKey(apiKey);
    }

    // If this config should be activated, deactivate all others first
    if (isActive === true) {
      await prisma.embeddingProviderConfig.updateMany({
        where: {
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false },
      });
      updateData.isActive = true;
    } else if (isActive === false) {
      updateData.isActive = false;
    }

    // Update config
    const updatedConfig = await prisma.embeddingProviderConfig.update({
      where: { id },
      data: updateData,
    });

    // Return config with masked key - never expose API keys to UI
    return NextResponse.json({
      config: {
        id: updatedConfig.id,
        provider: updatedConfig.provider,
        model: updatedConfig.model,
        dimensions: updatedConfig.dimensions,
        apiKey: "***masked***", // Never expose API keys to UI
        apiEndpoint: updatedConfig.apiEndpoint,
        deploymentName: updatedConfig.deploymentName,
        useBatchForNew: updatedConfig.useBatchForNew,
        useBatchForRescrape: updatedConfig.useBatchForRescrape,
        additionalConfig: updatedConfig.additionalConfig,
        isActive: updatedConfig.isActive,
        createdAt: updatedConfig.createdAt.toISOString(),
        updatedAt: updatedConfig.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`[API] PATCH /api/admin/embedding-config/[id] error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/embedding-config/[id]
 * Delete an embedding provider configuration
 * Requires SUPER_ADMIN role
 * Cannot delete the active configuration
 */
export async function DELETE(
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

    // Prevent deletion of active configuration
    if (existingConfig.isActive) {
      return NextResponse.json(
        { error: "Cannot delete active configuration. Activate another configuration first." },
        { status: 400 }
      );
    }

    // Delete config
    await prisma.embeddingProviderConfig.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Configuration deleted successfully",
    });
  } catch (error: any) {
    console.error(`[API] DELETE /api/admin/embedding-config/[id] error:`, error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
