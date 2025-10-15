// Source Management Service
// Business logic for source CRUD operations with global source architecture

import { prisma, Prisma, SourceScope, SourceStatus } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/utils/errors";

// Get sources available to workspace (global + workspace-specific)
export async function getWorkspaceSources(params: {
  userId: string;
  workspaceId?: string;
  status?: SourceStatus;
  scope?: SourceScope;
  limit: number;
  offset: number;
}) {
  const { userId, workspaceId, status, scope, limit, offset } = params;

  // Get user's workspaces
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  const workspaceIds = workspaceId
    ? [workspaceId]
    : workspaces.map((w) => w.id);

  if (workspaceIds.length === 0) {
    return { sources: [], total: 0 };
  }

  // Build query: global sources + workspace-specific sources
  const where: Prisma.SourceWhereInput = {
    AND: [
      {
        OR: [
          // Global sources (always accessible)
          { scope: SourceScope.GLOBAL },
          // Workspace-specific sources (only if linked)
          {
            workspaceSources: {
              some: { workspaceId: { in: workspaceIds } },
            },
          },
        ],
      },
      // Optional filters
      status ? { status } : {},
      scope ? { scope } : {},
    ],
  };

  // Execute query with pagination
  const [sources, total] = await prisma.$transaction([
    prisma.source.findMany({
      where,
      include: {
        _count: { select: { pages: true } },
        workspaceSources: {
          where: { workspaceId: { in: workspaceIds } },
          select: { addedAt: true, workspaceId: true },
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

// Get single source by ID with access check
export async function getSourceById(sourceId: string, userId: string) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: {
      _count: {
        select: { pages: true },
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
  });

  if (!source) {
    throw new NotFoundError("Source");
  }

  // Check access: global sources are always accessible
  if (source.scope === SourceScope.GLOBAL) {
    return source;
  }

  // For workspace sources, check if user has access
  const userWorkspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  const userWorkspaceIds = userWorkspaces.map((w) => w.id);
  const hasAccess = source.workspaceSources.some((ws) =>
    userWorkspaceIds.includes(ws.workspaceId)
  );

  if (!hasAccess) {
    throw new ForbiddenError("You do not have access to this source");
  }

  return source;
}

// Check if source exists by URL
export async function checkSourceExists(url: string) {
  return await prisma.source.findUnique({
    where: { url },
    include: {
      workspaceSources: {
        select: { workspaceId: true },
      },
    },
  });
}

// Create new source or link existing global source
export async function createSource(params: {
  url: string;
  domain: string;
  type: "WEBSITE" | "GITHUB";
  workspaceId: string;
  userId: string;
  config?: any;
}) {
  const { url, domain, type, workspaceId, userId, config } = params;

  // Check if source already exists
  const existingSource = await checkSourceExists(url);

  if (existingSource) {
    // If global source, just link to workspace
    if (existingSource.scope === SourceScope.GLOBAL) {
      // Check if already linked
      const existingLink = await prisma.workspaceSource.findUnique({
        where: {
          workspaceId_sourceId: {
            workspaceId,
            sourceId: existingSource.id,
          },
        },
      });

      if (existingLink) {
        throw new ConflictError(
          "This global source is already added to your workspace"
        );
      }

      // Create workspace link
      await prisma.workspaceSource.create({
        data: {
          sourceId: existingSource.id,
          workspaceId,
          addedBy: userId,
        },
      });

      return {
        source: existingSource,
        isGlobal: true,
        linked: true,
      };
    }

    // If workspace source in another workspace, return error
    throw new ConflictError(
      "This source is already indexed in another workspace. Contact an admin to promote it to global."
    );
  }

  // Create new source with WORKSPACE scope
  const source = await prisma.source.create({
    data: {
      url,
      domain,
      type,
      scope: SourceScope.WORKSPACE,
      status: SourceStatus.PENDING,
      config,
      createdById: userId,
    },
  });

  // Link to workspace
  await prisma.workspaceSource.create({
    data: {
      sourceId: source.id,
      workspaceId,
      addedBy: userId,
    },
  });

  // Initialize usage stats
  await prisma.sourceUsageStats.create({
    data: {
      sourceId: source.id,
      workspaceCount: 1,
    },
  });

  return {
    source,
    isGlobal: false,
    linked: false,
  };
}

// Update source configuration
export async function updateSource(
  sourceId: string,
  userId: string,
  data: {
    config?: any;
    status?: SourceStatus;
  }
) {
  const source = await getSourceById(sourceId, userId);

  // Only allow updates to workspace sources owned by user
  // or global sources if user is admin
  if (source.scope === SourceScope.WORKSPACE) {
    const userWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const userWorkspaceIds = userWorkspaces.map((w) => w.id);
    const ownsSource = source.workspaceSources.some((ws) =>
      userWorkspaceIds.includes(ws.workspaceId)
    );

    if (!ownsSource) {
      throw new ForbiddenError("You cannot update this source");
    }
  }

  return await prisma.source.update({
    where: { id: sourceId },
    data,
  });
}

// Delete source or remove workspace link
export async function deleteSource(
  sourceId: string,
  workspaceId: string,
  userId: string
) {
  const source = await getSourceById(sourceId, userId);

  // Verify workspace ownership
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace || workspace.ownerId !== userId) {
    throw new ForbiddenError("You do not own this workspace");
  }

  // Remove workspace link
  await prisma.workspaceSource.delete({
    where: {
      workspaceId_sourceId: {
        workspaceId,
        sourceId,
      },
    },
  });

  // Update usage stats
  await prisma.sourceUsageStats.update({
    where: { sourceId },
    data: {
      workspaceCount: { decrement: 1 },
    },
  });

  // If workspace source and no more workspaces use it, delete entirely
  if (source.scope === SourceScope.WORKSPACE) {
    const remainingLinks = await prisma.workspaceSource.count({
      where: { sourceId },
    });

    if (remainingLinks === 0) {
      await prisma.source.delete({
        where: { id: sourceId },
      });
    }
  }

  return { deleted: true };
}

// Promote source to global (admin only)
export async function promoteSourceToGlobal(params: {
  sourceId: string;
  adminId: string;
  reason?: string;
}) {
  const { sourceId, adminId, reason } = params;

  const source = await prisma.$transaction(async (tx) => {
    // Get current source
    const currentSource = await tx.source.findUnique({
      where: { id: sourceId },
      include: {
        workspaceSources: true,
        _count: { select: { pages: true } },
      },
    });

    if (!currentSource) {
      throw new NotFoundError("Source");
    }

    if (currentSource.scope === SourceScope.GLOBAL) {
      throw new ConflictError("Source is already global");
    }

    // Update source scope
    const updated = await tx.source.update({
      where: { id: sourceId },
      data: {
        scope: SourceScope.GLOBAL,
        promotedToGlobalAt: new Date(),
        promotedById: adminId,
      },
      include: {
        workspaceSources: true,
        _count: { select: { pages: true } },
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "PROMOTE_SOURCE",
        entityType: "SOURCE",
        entityId: sourceId,
        before: { scope: SourceScope.WORKSPACE },
        after: { scope: SourceScope.GLOBAL },
        reason,
      },
    });

    return updated;
  });

  return source;
}

// Demote source to workspace (super admin only)
export async function demoteSourceToWorkspace(params: {
  sourceId: string;
  adminId: string;
  targetWorkspaceId: string;
  reason?: string;
}) {
  const { sourceId, adminId, targetWorkspaceId, reason } = params;

  const source = await prisma.$transaction(async (tx) => {
    const currentSource = await tx.source.findUnique({
      where: { id: sourceId },
    });

    if (!currentSource) {
      throw new NotFoundError("Source");
    }

    if (currentSource.scope === SourceScope.WORKSPACE) {
      throw new ConflictError("Source is already workspace-scoped");
    }

    // Update source scope
    const updated = await tx.source.update({
      where: { id: sourceId },
      data: {
        scope: SourceScope.WORKSPACE,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "DEMOTE_SOURCE",
        entityType: "SOURCE",
        entityId: sourceId,
        before: { scope: SourceScope.GLOBAL },
        after: { scope: SourceScope.WORKSPACE, targetWorkspaceId },
        reason,
      },
    });

    return updated;
  });

  return source;
}

// Get admin statistics
export async function getAdminSourceStats() {
  const [
    total,
    globalCount,
    workspaceCount,
    activeCount,
    indexingCount,
    errorCount,
  ] = await Promise.all([
    prisma.source.count(),
    prisma.source.count({ where: { scope: SourceScope.GLOBAL } }),
    prisma.source.count({ where: { scope: SourceScope.WORKSPACE } }),
    prisma.source.count({ where: { status: SourceStatus.ACTIVE } }),
    prisma.source.count({ where: { status: SourceStatus.INDEXING } }),
    prisma.source.count({ where: { status: SourceStatus.ERROR } }),
  ]);

  // Find promotion candidates (workspace sources used by 2+ workspaces)
  const promotionCandidates = await prisma.source.findMany({
    where: {
      scope: SourceScope.WORKSPACE,
      workspaceSources: {
        some: {},
      },
    },
    include: {
      _count: {
        select: { workspaceSources: true },
      },
    },
  });

  const candidatesCount = promotionCandidates.filter(
    (s) => s._count.workspaceSources >= 2
  ).length;

  return {
    total,
    global: globalCount,
    workspace: workspaceCount,
    active: activeCount,
    indexing: indexingCount,
    error: errorCount,
    promotionCandidates: candidatesCount,
  };
}
