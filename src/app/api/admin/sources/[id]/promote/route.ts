/**
 * Admin - Promote Source to Global
 *
 * POST /api/admin/sources/[id]/promote
 * Promotes a WORKSPACE source to GLOBAL scope
 * Only accessible by ADMIN and SUPER_ADMIN roles
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * POST /api/admin/sources/[id]/promote
 * Promote a workspace source to global
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is ADMIN or SUPER_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Only admins can promote sources to global' },
        { status: 403 }
      )
    }

    const sourceId = params.id

    // Fetch source
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        _count: {
          select: {
            workspaceSources: true,
            pages: true,
          },
        },
      },
    })

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Check if already global
    if (source.scope === 'GLOBAL') {
      return NextResponse.json(
        { error: 'Source is already global' },
        { status: 400 }
      )
    }

    // Check if source has been indexed (has pages)
    if (source._count.pages === 0) {
      return NextResponse.json(
        { error: 'Cannot promote source that has not been indexed yet' },
        { status: 400 }
      )
    }

    // Promote to GLOBAL
    const updatedSource = await prisma.source.update({
      where: { id: sourceId },
      data: {
        scope: 'GLOBAL',
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SOURCE_PROMOTED',
        entityType: 'SOURCE',
        entityId: sourceId,
        before: {
          scope: 'WORKSPACE',
          url: source.url,
          workspacesCount: source._count.workspaceSources,
        },
        after: {
          scope: 'GLOBAL',
          url: source.url,
          pagesCount: source._count.pages,
        },
      },
    })

    return NextResponse.json({
      message: 'Source promoted to global successfully',
      source: updatedSource,
      stats: {
        workspacesUsing: source._count.workspaceSources,
        pagesIndexed: source._count.pages,
      },
    })

  } catch (error: any) {
    console.error(`[API] POST /api/admin/sources/${params.id}/promote error:`, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
