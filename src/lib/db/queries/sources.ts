// Source Management Queries
// Handles all database operations for Sources with Global Source Architecture

import { prisma } from "@/lib/db";
import { Prisma, SourceScope, SourceStatus, SourceType } from "@prisma/client";

export interface GetWorkspaceSourcesParams {
  userId: string;
  workspaceId?: string;
  status?: SourceStatus;
  scope?: SourceScope;
  limit: number;
  offset: number;
}

export interface CreateSourceParams {
  url: string;
  domain: string;
  type: SourceType;
  scope: SourceScope;
  config?: Prisma.JsonValue;
  createdById: string;
}

export interface PromoteSourceParams {
  sourceId: string;
  adminId: string;
  reason?: string;
}

/**
 * Get all sources available to a user's workspaces
 * Includes both global sources and workspace-specific sources
 */
export async function getWorkspaceSources(params: GetWorkspaceSourcesParams) {
  const { userId, workspaceId, status, scope, limit, offset } = params;

  // Get user's workspaces
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  const workspaceIds = workspaceId
    ? [workspaceId]
    : workspaces.map((w) => w.id);

  // Build where clause for sources
  const where: Prisma.SourceWhereInput = {
    OR: [
      // Global sources (available to all)
      {
        scope: "GLOBAL",
        ...(status && { status }),
      },
      // Workspace-specific sources
      {
        workspaceSources: {
          some: { workspaceId: { in: workspaceIds } },
        },
        ...(status && { status }),
      },
    ],
    ...(scope && { scope }),
  };

  // Execute query with pagination
  const [sources, total] = await prisma.$transaction([
    prisma.source.findMany({
      where,
      include: {
        _count: { select: { pages: true } },
        workspaceSources: {
          where: { workspaceId: { in: workspaceIds } },
          select: { addedAt: true, addedBy: true },
        },
        usageStats: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.source.count({ where }),
  ]);

  return { sources, total };
}

/**
 * Get a single source by ID with all related data
 */
export async function getSourceById(sourceId: string) {
  return prisma.source.findUnique({
    where: { id: sourceId },
    include: {
      _count: {
        select: {
          pages: true,
          workspaceSources: true,
        },
      },
      workspaceSources: {
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      usageStats: true,
      pages: {
        take: 10,
        orderBy: { indexedAt: "desc" },
        select: {
          id: true,
          url: true,
          title: true,
          indexedAt: true,
        },
      },
    },
  });
}

/**
 * Check if a source URL already exists
 */
export async function findSourceByUrl(url: string) {
  return prisma.source.findUnique({
    where: { url },
    include: {
      workspaceSources: {
        select: {
          workspaceId: true,
          addedAt: true,
        },
      },
      _count: {
        select: { workspaceSources: true },
      },
    },
  });
}

/**
 * Create a new source
 */
export async function createSource(params: CreateSourceParams) {
  return prisma.source.create({
    data: {
      url: params.url,
      domain: params.domain,
      type: params.type,
      scope: params.scope,
      config: params.config as Prisma.InputJsonValue,
      status: "PENDING",
      createdById: params.createdById,
    },
  });
}

/**
 * Link a source to a workspace
 */
export async function linkSourceToWorkspace(
  sourceId: string,
  workspaceId: string,
  addedBy: string,
  customConfig?: Prisma.JsonValue
) {
  return prisma.workspaceSource.create({
    data: {
      sourceId,
      workspaceId,
      addedBy,
      customConfig: customConfig as Prisma.InputJsonValue,
    },
  });
}

/**
 * Update source status
 */
export async function updateSourceStatus(
  sourceId: string,
  status: SourceStatus,
  errorMessage?: string
) {
  return prisma.source.update({
    where: { id: sourceId },
    data: {
      status,
      errorMessage,
      ...(status === "ACTIVE" && {
        lastScrapedAt: new Date(),
        lastUpdatedAt: new Date(),
      }),
    },
  });
}

/**
 * Promote a workspace source to global
 */
export async function promoteSourceToGlobal(params: PromoteSourceParams) {
  const { sourceId, adminId, reason } = params;

  return prisma.$transaction(async (tx) => {
    // Update source scope
    const updated = await tx.source.update({
      where: { id: sourceId },
      data: {
        scope: "GLOBAL",
        promotedToGlobalAt: new Date(),
        promotedById: adminId,
      },
      include: {
        workspaceSources: true,
        pages: { select: { id: true } },
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "PROMOTE_SOURCE",
        entityType: "SOURCE",
        entityId: sourceId,
        before: { scope: "WORKSPACE" },
        after: { scope: "GLOBAL" },
        reason,
      },
    });

    // Update usage stats
    await tx.sourceUsageStats.upsert({
      where: { sourceId },
      create: {
        sourceId,
        workspaceCount: updated.workspaceSources.length,
      },
      update: {
        workspaceCount: updated.workspaceSources.length,
        calculatedAt: new Date(),
      },
    });

    return updated;
  });
}

/**
 * Demote a global source to workspace-specific
 */
export async function demoteSourceToWorkspace(
  sourceId: string,
  adminId: string,
  targetWorkspaceId: string,
  reason?: string
) {
  return prisma.$transaction(async (tx) => {
    // Keep only the target workspace link, remove others
    await tx.workspaceSource.deleteMany({
      where: {
        sourceId,
        workspaceId: { not: targetWorkspaceId },
      },
    });

    // Update source scope
    const updated = await tx.source.update({
      where: { id: sourceId },
      data: {
        scope: "WORKSPACE",
        promotedToGlobalAt: null,
        promotedById: null,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "DEMOTE_SOURCE",
        entityType: "SOURCE",
        entityId: sourceId,
        before: { scope: "GLOBAL" },
        after: { scope: "WORKSPACE", workspaceId: targetWorkspaceId },
        reason,
      },
    });

    return updated;
  });
}

/**
 * Delete a source and all related data
 */
export async function deleteSource(sourceId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.source.findUnique({
      where: { id: sourceId },
      select: { scope: true, url: true },
    });

    if (!source) {
      throw new Error("Source not found");
    }

    // Delete the source (cascades to pages, chunks, jobs, workspaceSources)
    await tx.source.delete({
      where: { id: sourceId },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: "DELETE_SOURCE",
        entityType: "SOURCE",
        entityId: sourceId,
        before: { scope: source.scope, url: source.url },
        after: null as unknown as Prisma.InputJsonValue,
      },
    });

    return { success: true };
  });
}

/**
 * Get sources that are candidates for promotion to global
 * (workspace sources used by 2+ workspaces)
 */
export async function getPromotionCandidates(minWorkspaces = 2) {
  return prisma.source
    .findMany({
      where: {
        scope: "WORKSPACE",
        status: "ACTIVE",
        workspaceSources: {
          // Only get sources with 2+ workspace links
          some: {},
        },
      },
      include: {
        _count: {
          select: { workspaceSources: true, pages: true },
        },
        workspaceSources: {
          include: {
            workspace: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        usageStats: true,
      },
      orderBy: {
        workspaceSources: {
          _count: "desc",
        },
      },
    })
    .then((sources) =>
      sources.filter((s) => s._count.workspaceSources >= minWorkspaces)
    );
}

/**
 * Update source usage statistics
 */
export async function updateSourceUsageStats(sourceId: string) {
  const stats = await prisma.$transaction(async (tx) => {
    // Count workspaces
    const workspaceCount = await tx.workspaceSource.count({
      where: { sourceId },
    });

    // Count queries (from QueryLog)
    const queryCount = await tx.queryLog.count({
      where: {
        sourceIds: {
          has: sourceId,
        },
      },
    });

    // Get last query time
    const lastQuery = await tx.queryLog.findFirst({
      where: {
        sourceIds: {
          has: sourceId,
        },
      },
      orderBy: { queriedAt: "desc" },
      select: { queriedAt: true },
    });

    // Upsert stats
    return tx.sourceUsageStats.upsert({
      where: { sourceId },
      create: {
        sourceId,
        workspaceCount,
        queryCount,
        lastQueriedAt: lastQuery?.queriedAt,
      },
      update: {
        workspaceCount,
        queryCount,
        lastQueriedAt: lastQuery?.queriedAt,
        calculatedAt: new Date(),
      },
    });
  });

  return stats;
}

/**
 * Get all sources for admin dashboard
 */
export async function getAdminSources(params: {
  scope?: SourceScope;
  minWorkspaces?: number;
  sortBy?: "workspaceCount" | "queryCount" | "pageCount";
  limit: number;
  offset: number;
}) {
  const {
    scope,
    minWorkspaces,
    sortBy = "workspaceCount",
    limit,
    offset,
  } = params;

  const where: Prisma.SourceWhereInput = {
    ...(scope && { scope }),
  };

  // Build order by clause
  let orderBy: Prisma.SourceOrderByWithRelationInput = { updatedAt: "desc" };

  if (sortBy === "workspaceCount") {
    orderBy = { workspaceSources: { _count: "desc" } };
  } else if (sortBy === "queryCount") {
    orderBy = { usageStats: { queryCount: "desc" } };
  } else if (sortBy === "pageCount") {
    orderBy = { pages: { _count: "desc" } };
  }

  const [sources, total] = await prisma.$transaction([
    prisma.source.findMany({
      where,
      include: {
        _count: {
          select: {
            pages: true,
            workspaceSources: true,
          },
        },
        usageStats: true,
        workspaceSources: {
          include: {
            workspace: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.source.count({ where }),
  ]);

  // Filter by minWorkspaces if specified
  const filtered = minWorkspaces
    ? sources.filter((s) => s._count.workspaceSources >= minWorkspaces)
    : sources;

  return {
    sources: filtered,
    total: minWorkspaces ? filtered.length : total,
  };
}
