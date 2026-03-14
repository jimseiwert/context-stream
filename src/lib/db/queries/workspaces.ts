// Workspace Management Queries - Drizzle ORM
// Handles all database operations for Workspaces

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  pages,
  queryLogs,
  sources,
  sourceUsageStats,
  users,
  workspaces,
  workspaceSources,
} from "@/lib/db/schema";

export interface CreateWorkspaceParams {
  name: string;
  slug: string;
  ownerId: string;
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string) {
  const userWorkspaces = await db
    .select({
      workspace: workspaces,
      sourceCount: count(workspaceSources.id),
    })
    .from(workspaces)
    .leftJoin(
      workspaceSources,
      eq(workspaceSources.workspaceId, workspaces.id)
    )
    .where(eq(workspaces.ownerId, userId))
    .groupBy(workspaces.id)
    .orderBy(desc(workspaces.createdAt));

  return userWorkspaces.map((row: any) => ({
    ...row.workspace,
    _count: {
      sources: row.sourceCount,
    },
  }));
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspaceById(workspaceId: string, userId?: string) {
  const conditions = [eq(workspaces.id, workspaceId)];
  if (userId) {
    conditions.push(eq(workspaces.ownerId, userId));
  }

  const workspace = await db.query.workspaces.findFirst({
    where: and(...conditions),
    with: {
      owner: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!workspace) return null;

  // Get source count
  const sourceCount = await db
    .select({ count: count() })
    .from(workspaceSources)
    .where(eq(workspaceSources.workspaceId, workspaceId));

  // Get recent sources
  const recentSources = await db
    .select({
      id: workspaceSources.id,
      sourceId: workspaceSources.sourceId,
      addedAt: workspaceSources.addedAt,
      addedBy: workspaceSources.addedBy,
      source: {
        id: sources.id,
        url: sources.url,
        domain: sources.domain,
        scope: sources.scope,
        status: sources.status,
        lastScrapedAt: sources.lastScrapedAt,
      },
    })
    .from(workspaceSources)
    .leftJoin(sources, eq(sources.id, workspaceSources.sourceId))
    .where(eq(workspaceSources.workspaceId, workspaceId))
    .orderBy(desc(workspaceSources.addedAt))
    .limit(10);

  return {
    ...workspace,
    _count: {
      sources: sourceCount[0]?.count || 0,
    },
    sources: recentSources,
  };
}

/**
 * Get workspace by slug
 */
export async function getWorkspaceBySlug(slug: string, userId?: string) {
  const conditions = [eq(workspaces.slug, slug)];
  if (userId) {
    conditions.push(eq(workspaces.ownerId, userId));
  }

  const workspace = await db.query.workspaces.findFirst({
    where: and(...conditions),
    with: {
      owner: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!workspace) return null;

  // Get source count
  const sourceCount = await db
    .select({ count: count() })
    .from(workspaceSources)
    .where(eq(workspaceSources.workspaceId, workspace.id));

  return {
    ...workspace,
    _count: {
      sources: sourceCount[0]?.count || 0,
    },
  };
}

/**
 * Create a new workspace
 */
export async function createWorkspace(params: CreateWorkspaceParams) {
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: params.name,
      slug: params.slug,
      ownerId: params.ownerId,
    })
    .returning();

  return workspace;
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; slug?: string },
  userId?: string
) {
  const conditions = [eq(workspaces.id, workspaceId)];
  if (userId) {
    conditions.push(eq(workspaces.ownerId, userId));
  }

  const [updated] = await db
    .update(workspaces)
    .set(data)
    .where(and(...conditions))
    .returning();

  return updated;
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string, userId?: string) {
  const conditions = [eq(workspaces.id, workspaceId)];
  if (userId) {
    conditions.push(eq(workspaces.ownerId, userId));
  }

  const [deleted] = await db
    .delete(workspaces)
    .where(and(...conditions))
    .returning();

  return deleted;
}

/**
 * Check if workspace slug is available
 */
export async function isSlugAvailable(slug: string, excludeId?: string) {
  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    columns: {
      id: true,
    },
  });

  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;

  return false;
}

/**
 * Generate unique slug from name
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  // Convert to slug format
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Check if available
  if (await isSlugAvailable(slug)) {
    return slug;
  }

  // Append number until unique
  let counter = 1;
  while (true) {
    const candidate = `${slug}-${counter}`;
    if (await isSlugAvailable(candidate)) {
      return candidate;
    }
    counter++;
  }
}

/**
 * Get workspace statistics
 */
export async function getWorkspaceStats(workspaceId: string) {
  const [sourceCountResult, pageCountResult, queryCountResult] =
    await Promise.all([
      // Count sources
      db
        .select({ count: count() })
        .from(workspaceSources)
        .where(eq(workspaceSources.workspaceId, workspaceId)),

      // Count pages across all sources
      db
        .select({ count: count() })
        .from(pages)
        .innerJoin(sources, eq(sources.id, pages.sourceId))
        .innerJoin(
          workspaceSources,
          eq(workspaceSources.sourceId, sources.id)
        )
        .where(eq(workspaceSources.workspaceId, workspaceId)),

      // Count queries
      db
        .select({ count: count() })
        .from(queryLogs)
        .where(eq(queryLogs.workspaceId, workspaceId)),
    ]);

  return {
    sourceCount: sourceCountResult[0]?.count || 0,
    pageCount: pageCountResult[0]?.count || 0,
    queryCount: queryCountResult[0]?.count || 0,
  };
}

/**
 * Get workspace sources with details
 */
export async function getWorkspaceSources(
  workspaceId: string,
  params: { limit?: number; offset?: number } = {}
) {
  const { limit = 20, offset = 0 } = params;

  const [workspaceSourcesData, total] = await Promise.all([
    db
      .select({
        workspaceSource: workspaceSources,
        source: sources,
        pageCount: count(pages.id),
        usageStats: sourceUsageStats,
      })
      .from(workspaceSources)
      .leftJoin(sources, eq(sources.id, workspaceSources.sourceId))
      .leftJoin(pages, eq(pages.sourceId, sources.id))
      .leftJoin(sourceUsageStats, eq(sourceUsageStats.sourceId, sources.id))
      .where(eq(workspaceSources.workspaceId, workspaceId))
      .groupBy(
        workspaceSources.id,
        sources.id,
        sourceUsageStats.id
      )
      .orderBy(desc(workspaceSources.addedAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: count() })
      .from(workspaceSources)
      .where(eq(workspaceSources.workspaceId, workspaceId)),
  ]);

  return {
    sources: workspaceSourcesData.map((row: any) => ({
      ...row.source,
      _count: {
        pages: row.pageCount,
      },
      usageStats: row.usageStats,
    })),
    total: total[0]?.count || 0,
  };
}

/**
 * Remove source from workspace
 */
export async function removeSourceFromWorkspace(
  workspaceId: string,
  sourceId: string
) {
  const [deleted] = await db
    .delete(workspaceSources)
    .where(
      and(
        eq(workspaceSources.workspaceId, workspaceId),
        eq(workspaceSources.sourceId, sourceId)
      )
    )
    .returning();

  return deleted;
}
