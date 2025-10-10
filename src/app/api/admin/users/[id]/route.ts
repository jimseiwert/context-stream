/**
 * Admin User Management API
 * PUT /api/admin/users/[id] - Update user role
 * DELETE /api/admin/users/[id] - Delete user (future)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const runtime = 'nodejs'

const UpdateUserSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
})

/**
 * PUT /api/admin/users/[id]
 * Update user role
 * Requires SUPER_ADMIN role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has super admin access
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = UpdateUserSchema.parse(body)

    // Prevent users from changing their own role
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot modify your own role' },
        { status: 400 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        role: data.role,
      },
      include: {
        _count: {
          select: {
            workspaces: true,
            apiKeys: true,
          },
        },
      },
    })

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name || 'Unknown',
        email: updatedUser.email,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
        image: updatedUser.image || null,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
        _count: {
          workspaces: updatedUser._count.workspaces,
          apiKeys: updatedUser._count.apiKeys,
        },
      },
    })
  } catch (error: any) {
    console.error('[API] PUT /api/admin/users/[id] error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
