// Workspace Management Queries
// Handles all database operations for Workspaces

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export interface CreateWorkspaceParams {
  name: string
  slug: string
  ownerId: string
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { ownerId: userId },
    include: {
      _count: {
        select: { sources: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspaceById(workspaceId: string, userId?: string) {
  const where: Prisma.WorkspaceWhereUniqueInput = {
    id: workspaceId,
    ...(userId && { ownerId: userId }),
  }

  return prisma.workspace.findUnique({
    where,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: { sources: true },
      },
      sources: {
        take: 10,
        orderBy: { addedAt: 'desc' },
        include: {
          source: {
            select: {
              id: true,
              url: true,
              domain: true,
              scope: true,
              status: true,
              lastScrapedAt: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Get workspace by slug
 */
export async function getWorkspaceBySlug(slug: string, userId?: string) {
  const where: Prisma.WorkspaceWhereInput = {
    slug,
    ...(userId && { ownerId: userId }),
  }

  return prisma.workspace.findFirst({
    where,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: { sources: true },
      },
    },
  })
}

/**
 * Create a new workspace
 */
export async function createWorkspace(params: CreateWorkspaceParams) {
  return prisma.workspace.create({
    data: {
      name: params.name,
      slug: params.slug,
      ownerId: params.ownerId,
    },
  })
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; slug?: string },
  userId?: string
) {
  const where: Prisma.WorkspaceWhereUniqueInput = {
    id: workspaceId,
    ...(userId && { ownerId: userId }),
  }

  return prisma.workspace.update({
    where,
    data,
  })
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string, userId?: string) {
  const where: Prisma.WorkspaceWhereUniqueInput = {
    id: workspaceId,
    ...(userId && { ownerId: userId }),
  }

  return prisma.workspace.delete({
    where,
  })
}

/**
 * Check if workspace slug is available
 */
export async function isSlugAvailable(slug: string, excludeId?: string) {
  const existing = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!existing) return true
  if (excludeId && existing.id === excludeId) return true

  return false
}

/**
 * Generate unique slug from name
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  // Convert to slug format
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Check if available
  if (await isSlugAvailable(slug)) {
    return slug
  }

  // Append number until unique
  let counter = 1
  while (true) {
    const candidate = `${slug}-${counter}`
    if (await isSlugAvailable(candidate)) {
      return candidate
    }
    counter++
  }
}

/**
 * Get workspace statistics
 */
export async function getWorkspaceStats(workspaceId: string) {
  const [sourceCount, pageCount, queryCount] = await Promise.all([
    // Count sources
    prisma.workspaceSource.count({
      where: { workspaceId },
    }),

    // Count pages across all sources
    prisma.page.count({
      where: {
        source: {
          workspaceSources: {
            some: { workspaceId },
          },
        },
      },
    }),

    // Count queries
    prisma.queryLog.count({
      where: { workspaceId },
    }),
  ])

  return {
    sourceCount,
    pageCount,
    queryCount,
  }
}

/**
 * Get workspace sources with details
 */
export async function getWorkspaceSources(
  workspaceId: string,
  params: { limit?: number; offset?: number } = {}
) {
  const { limit = 20, offset = 0 } = params

  const [sources, total] = await prisma.$transaction([
    prisma.workspaceSource.findMany({
      where: { workspaceId },
      include: {
        source: {
          include: {
            _count: {
              select: { pages: true },
            },
            usageStats: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.workspaceSource.count({
      where: { workspaceId },
    }),
  ])

  return {
    sources: sources.map((ws) => ws.source),
    total,
  }
}

/**
 * Remove source from workspace
 */
export async function removeSourceFromWorkspace(
  workspaceId: string,
  sourceId: string
) {
  return prisma.workspaceSource.delete({
    where: {
      workspaceId_sourceId: {
        workspaceId,
        sourceId,
      },
    },
  })
}
