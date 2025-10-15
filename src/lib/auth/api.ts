// API Route Authentication Helpers
// Use these in API routes to get the current user session

import { auth } from './auth'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
}

/**
 * Get the current user session in API routes
 * Returns null if not authenticated
 */
export async function getApiSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session || !session.user) {
      return null
    }

    return {
      user: session.user as AuthenticatedUser,
      session,
    }
  } catch (error) {
    console.error('Error getting API session:', error)
    return null
  }
}

/**
 * Require authentication in API routes
 * Throws an error if not authenticated
 */
export async function requireApiAuth() {
  const session = await getApiSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: AuthenticatedUser) {
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
}

/**
 * Check if user has super admin role
 */
export function isSuperAdmin(user: AuthenticatedUser) {
  return user.role === 'SUPER_ADMIN'
}

/**
 * Get session from NextRequest (for middleware)
 * Returns null if not authenticated
 */
export async function getSession(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session || !session.user) {
      return null
    }

    return {
      user: session.user as AuthenticatedUser,
      session,
    }
  } catch (error) {
    console.error('Error getting session from request:', error)
    return null
  }
}
