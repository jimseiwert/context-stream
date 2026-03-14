// Source Management Queries - Drizzle ORM
// Handles all database operations for Sources with Global Source Architecture

import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  pages,
  sources,
  sourceUsageStats,
  workspaceSources,
  workspaces,
  queryLogs,
  type SourceScope,
  type SourceStatus,
  type SourceType,
} from "@/lib/db/schema";

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
  config?: unknown;
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
  const userWorkspaces = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId));

  const workspaceIds = workspaceId
    ? [workspaceId]
    : userWorkspaces.map((w: any) => w.id);

  if (workspaceIds.length === 0) {
    return { sources: [], total: 0 };
  }

  // Build where conditions
  const conditions = [];

  // Global sources OR workspace-specific sources
  const scopeConditions = [
    and(eq(sources.scope, "GLOBAL"), status ? eq(sources.status, status) : undefined),
  ];

  // Add workspace sources condition
  const wsCondition = and(
    inArray(workspaceSources.workspaceId, workspaceIds),
    status ? eq(sources.status, status) : undefined
  );

  if (wsCondition) {
    // We need to join with workspaceSources for this condition
    scopeConditions.push(wsCondition);
  }

  if (scope) {
    conditions.push(eq(sources.scope, scope));
  }

  // Execute query with pagination
  const sourcesQuery = db
    .select({
      source: sources,
      pageCount: count(pages.id),
      usageStats: sourceUsageStats,
    })
    .from(sources)
    .leftJoin(pages, eq(pages.sourceId, sources.id))
    .leftJoin(sourceUsageStats, eq(sourceUsageStats.sourceId, sources.id))
    .leftJoin(workspaceSources, eq(workspaceSources.sourceId, sources.id))
    .where(
      and(
        or(...scopeConditions),
        ...conditions
      )
    )
    .groupBy(sources.id, sourceUsageStats.id)
    .orderBy(desc(sources.updatedAt))
    .limit(limit)
    .offset(offset);

  const totalQuery = db
    .select({ count: count() })
    .from(sources)
    .leftJoin(workspaceSources, eq(workspaceSources.sourceId, sources.id))
    .where(
      and(
        or(...scopeConditions),
        ...conditions
      )
    );

  const [sourcesResult, totalResult] = await Promise.all([
    sourcesQuery,
    totalQuery,
  ]);

  return {
    sources: sourcesResult.map((row: any) => ({
      ...row.source,
      _count: { pages: row.pageCount },
      usageStats: row.usageStats,
    })),
    total: totalResult[0]?.count || 0,
  };
}

/**
 * Get a single source by ID with all related data
 */
export async function getSourceById(sourceId: string) {
  const result = await db.query.sources.findFirst({
    where: eq(sources.id, sourceId),
    with: {
      pages: {
        limit: 10,
        orderBy: desc(pages.indexedAt),
        columns: {
          id: true,
          url: true,
          title: true,
          indexedAt: true,
        },
      },
    },
  });

  if (!result) return null;

  // Get counts
  const [pageCount, workspaceSourceCount] = await Promise.all([
    db.select({ count: count() }).from(pages).where(eq(pages.sourceId, sourceId)),
    db.select({ count: count() }).from(workspaceSources).where(eq(workspaceSources.sourceId, sourceId)),
  ]);

  // Get workspace sources with workspace details
  const workspaceSourcesList = await db
    .select({
      id: workspaceSources.id,
      workspaceId: workspaceSources.workspaceId,
      addedAt: workspaceSources.addedAt,
      addedBy: workspaceSources.addedBy,
      workspace: {
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
      },
    })
    .from(workspaceSources)
    .leftJoin(workspaces, eq(workspaces.id, workspaceSources.workspaceId))
    .where(eq(workspaceSources.sourceId, sourceId));

  // Get usage stats
  const stats = await db.query.sourceUsageStats.findFirst({
    where: eq(sourceUsageStats.sourceId, sourceId),
  });

  return {
    ...result,
    _count: {
      pages: pageCount[0]?.count || 0,
      workspaceSources: workspaceSourceCount[0]?.count || 0,
    },
    workspaceSources: workspaceSourcesList,
    usageStats: stats,
  };
}

/**
 * Check if a source URL already exists
 */
export async function findSourceByUrl(url: string) {
  const result = await db.query.sources.findFirst({
    where: eq(sources.url, url),
  });

  if (!result) return null;

  // Get workspace sources
  const workspaceSourcesList = await db
    .select({
      workspaceId: workspaceSources.workspaceId,
      addedAt: workspaceSources.addedAt,
    })
    .from(workspaceSources)
    .where(eq(workspaceSources.sourceId, result.id));

  const workspaceSourceCount = await db
    .select({ count: count() })
    .from(workspaceSources)
    .where(eq(workspaceSources.sourceId, result.id));

  return {
    ...result,
    workspaceSources: workspaceSourcesList,
    _count: {
      workspaceSources: workspaceSourceCount[0]?.count || 0,
    },
  };
}

/**
 * Create a new source
 */
export async function createSource(params: CreateSourceParams) {
  const [source] = await db
    .insert(sources)
    .values({
      url: params.url,
      domain: params.domain,
      type: params.type,
      scope: params.scope,
      config: params.config,
      status: "PENDING",
      createdById: params.createdById,
    })
    .returning();

  return source;
}

/**
 * Link a source to a workspace
 */
export async function linkSourceToWorkspace(
  sourceId: string,
  workspaceId: string,
  addedBy: string,
  customConfig?: unknown
) {
  const [workspaceSource] = await db
    .insert(workspaceSources)
    .values({
      sourceId,
      workspaceId,
      addedBy,
      customConfig,
    })
    .returning();

  return workspaceSource;
}

/**
 * Update source status
 */
export async function updateSourceStatus(
  sourceId: string,
  status: SourceStatus,
  errorMessage?: string
) {
  const updateData: Partial<typeof sources.$inferInsert> = {
    status,
    errorMessage,
  };

  if (status === "ACTIVE") {
    updateData.lastScrapedAt = new Date();
    updateData.lastUpdatedAt = new Date();
  }

  const [updated] = await db
    .update(sources)
    .set(updateData)
    .where(eq(sources.id, sourceId))
    .returning();

  return updated;
}

/**
 * Promote a workspace source to global
 */
export async function promoteSourceToGlobal(params: PromoteSourceParams) {
  const { sourceId, adminId, reason } = params;

  return await db.transaction(async (tx) => {
    // Update source scope
    const [updated] = await tx
      .update(sources)
      .set({
        scope: "GLOBAL",
        promotedToGlobalAt: new Date(),
        promotedById: adminId,
      })
      .where(eq(sources.id, sourceId))
      .returning();

    // Get workspace sources count
    const wsCount = await tx
      .select({ count: count() })
      .from(workspaceSources)
      .where(eq(workspaceSources.sourceId, sourceId));

    // Create audit log
    await tx.insert(auditLogs).values({
      userId: adminId,
      action: "PROMOTE_SOURCE",
      entityType: "SOURCE",
      entityId: sourceId,
      before: { scope: "WORKSPACE" },
      after: { scope: "GLOBAL" },
      reason,
    });

    // Update usage stats
    await tx
      .insert(sourceUsageStats)
      .values({
        sourceId,
        workspaceCount: wsCount[0]?.count || 0,
      })
      .onConflictDoUpdate({
        target: sourceUsageStats.sourceId,
        set: {
          workspaceCount: wsCount[0]?.count || 0,
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
  return await db.transaction(async (tx) => {
    // Keep only the target workspace link, remove others
    await tx
      .delete(workspaceSources)
      .where(
        and(
          eq(workspaceSources.sourceId, sourceId),
          sql`${workspaceSources.workspaceId} != ${targetWorkspaceId}`
        )
      );

    // Update source scope
    const [updated] = await tx
      .update(sources)
      .set({
        scope: "WORKSPACE",
        promotedToGlobalAt: null,
        promotedById: null,
      })
      .where(eq(sources.id, sourceId))
      .returning();

    // Create audit log
    await tx.insert(auditLogs).values({
      userId: adminId,
      action: "DEMOTE_SOURCE",
      entityType: "SOURCE",
      entityId: sourceId,
      before: { scope: "GLOBAL" },
      after: { scope: "WORKSPACE", workspaceId: targetWorkspaceId },
      reason,
    });

    return updated;
  });
}

/**
 * Delete a source and all related data
 */
export async function deleteSource(sourceId: string, userId: string) {
  return await db.transaction(async (tx) => {
    const source = await tx.query.sources.findFirst({
      where: eq(sources.id, sourceId),
      columns: {
        scope: true,
        url: true,
      },
    });

    if (!source) {
      throw new Error("Source not found");
    }

    // Delete the source (cascades to pages, chunks, jobs, workspaceSources)
    await tx.delete(sources).where(eq(sources.id, sourceId));

    // Create audit log
    await tx.insert(auditLogs).values({
      userId,
      action: "DELETE_SOURCE",
      entityType: "SOURCE",
      entityId: sourceId,
      before: { scope: source.scope, url: source.url },
      after: null,
    });

    return { success: true };
  });
}

/**
 * Get sources that are candidates for promotion to global
 * (workspace sources used by 2+ workspaces)
 */
export async function getPromotionCandidates(minWorkspaces = 2) {
  const result = await db
    .select({
      source: sources,
      workspaceCount: count(workspaceSources.id),
      pageCount: count(pages.id),
    })
    .from(sources)
    .leftJoin(workspaceSources, eq(workspaceSources.sourceId, sources.id))
    .leftJoin(pages, eq(pages.sourceId, sources.id))
    .where(
      and(
        eq(sources.scope, "WORKSPACE"),
        eq(sources.status, "ACTIVE")
      )
    )
    .groupBy(sources.id)
    .having(sql`COUNT(DISTINCT ${workspaceSources.id}) >= ${minWorkspaces}`)
    .orderBy(desc(count(workspaceSources.id)));

  // Get full details for each source
  const sourceIds = result.map((r: any) => r.source.id);
  if (sourceIds.length === 0) return [];

  const fullSources = await Promise.all(
    sourceIds.map((id: any) => getSourceById(id))
  );

  return fullSources.filter((s): s is NonNullable<typeof s> => s !== null);
}

/**
 * Update source usage statistics
 */
export async function updateSourceUsageStats(sourceId: string) {
  return await db.transaction(async (tx) => {
    // Count workspaces
    const wsCount = await tx
      .select({ count: count() })
      .from(workspaceSources)
      .where(eq(workspaceSources.sourceId, sourceId));

    const workspaceCount = wsCount[0]?.count || 0;

    // Count queries
    const qCount = await tx
      .select({ count: count() })
      .from(queryLogs)
      .where(sql`${sourceId} = ANY(${queryLogs.sourceIds})`);

    const queryCount = qCount[0]?.count || 0;

    // Get last query time
    const lastQuery = await tx
      .select({ queriedAt: queryLogs.queriedAt })
      .from(queryLogs)
      .where(sql`${sourceId} = ANY(${queryLogs.sourceIds})`)
      .orderBy(desc(queryLogs.queriedAt))
      .limit(1);

    // Upsert stats
    const [stats] = await tx
      .insert(sourceUsageStats)
      .values({
        sourceId,
        workspaceCount,
        queryCount,
        lastQueriedAt: lastQuery[0]?.queriedAt,
      })
      .onConflictDoUpdate({
        target: sourceUsageStats.sourceId,
        set: {
          workspaceCount,
          queryCount,
          lastQueriedAt: lastQuery[0]?.queriedAt,
          calculatedAt: new Date(),
        },
      })
      .returning();

    return stats;
  });
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

  // Build where conditions
  const conditions = [];
  if (scope) {
    conditions.push(eq(sources.scope, scope));
  }

  // Determine order by
  let orderByClause;
  if (sortBy === "queryCount") {
    orderByClause = desc(sourceUsageStats.queryCount);
  } else if (sortBy === "pageCount") {
    orderByClause = desc(count(pages.id));
  } else {
    orderByClause = desc(count(workspaceSources.id));
  }

  const result = await db
    .select({
      source: sources,
      usageStats: sourceUsageStats,
      workspaceCount: count(workspaceSources.id),
      pageCount: count(pages.id),
    })
    .from(sources)
    .leftJoin(sourceUsageStats, eq(sourceUsageStats.sourceId, sources.id))
    .leftJoin(workspaceSources, eq(workspaceSources.sourceId, sources.id))
    .leftJoin(pages, eq(pages.sourceId, sources.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sources.id, sourceUsageStats.id)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ count: count() })
    .from(sources)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Filter by minWorkspaces if specified
  const filtered = minWorkspaces
    ? result.filter((s: any) => s.workspaceCount >= minWorkspaces)
    : result;

  return {
    sources: filtered.map((row: any) => ({
      ...row.source,
      _count: {
        pages: row.pageCount,
        workspaceSources: row.workspaceCount,
      },
      usageStats: row.usageStats,
    })),
    total: minWorkspaces ? filtered.length : (totalResult[0]?.count || 0),
  };
}
