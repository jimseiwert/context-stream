// Authentication Middleware
// Provides auth checks for API routes using better-auth

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { UnauthorizedError, ForbiddenError } from '@/lib/utils/errors'
import { Permission, hasPermission } from './permissions'
import { UserRole } from '@prisma/client'
import { headers } from 'next/headers'

// Session type
export interface AuthSession {
  user: {
    id: string
    email: string
    name: string
    image: string | null
    role: UserRole
  }
}

// Get session from request headers
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return session
}

// Require authentication - throws if not authenticated
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession()

  if (!session || !session.user) {
    throw new UnauthorizedError('Authentication required')
  }

  // Fetch user with role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
    },
  })

  if (!user) {
    throw new UnauthorizedError('User not found')
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    },
  }
}

// Require specific permission - throws if not authorized
export async function requirePermission(permission: Permission): Promise<AuthSession> {
  const session = await requireAuth()

  if (!hasPermission(session.user.role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`)
  }

  return session
}

// Require admin role (ADMIN or SUPER_ADMIN)
export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth()

  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Admin access required')
  }

  return session
}

// Require super admin role
export async function requireSuperAdmin(): Promise<AuthSession> {
  const session = await requireAuth()

  if (session.user.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Super admin access required')
  }

  return session
}

// Optional auth - returns session if authenticated, null otherwise
export async function getOptionalAuth(): Promise<AuthSession | null> {
  try {
    return await requireAuth()
  } catch (error) {
    return null
  }
}

// Check if user owns workspace
export async function requireWorkspaceOwnership(
  userId: string,
  workspaceId: string
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  })

  if (!workspace) {
    throw new ForbiddenError('Workspace not found')
  }

  if (workspace.ownerId !== userId) {
    throw new ForbiddenError('You do not own this workspace')
  }
}
