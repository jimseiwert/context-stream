/**
 * Individual Document API Routes
 *
 * DELETE /api/sources/[id]/documents/[documentId] - Delete a document
 */

import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DELETE /api/sources/[id]/documents/[documentId]
 * Delete a document and its chunks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Authentication check
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sourceId, documentId } = await params

    // Verify source exists and user has access
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        workspaceSources: {
          include: {
            workspace: true,
          },
        },
      },
    })

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Check if user has access to this source
    const hasAccess =
      source.scope === 'GLOBAL' ||
      source.workspaceSources.some((ws) => ws.workspace.ownerId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify document exists and belongs to this source
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.sourceId !== sourceId) {
      return NextResponse.json(
        { error: 'Document does not belong to this source' },
        { status: 400 }
      )
    }

    // Delete document and its chunks in a transaction
    await prisma.$transaction([
      // Delete all chunks for this document
      prisma.chunk.deleteMany({
        where: { documentId },
      }),
      // Delete the document
      prisma.document.delete({
        where: { id: documentId },
      }),
      // Update source page count
      prisma.source.update({
        where: { id: sourceId },
        data: {
          pageCount: {
            decrement: 1,
          },
        },
      }),
    ])

    console.log(
      `[API] Deleted document ${documentId} with ${document._count.chunks} chunks from source ${sourceId}`
    )

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      chunksDeleted: document._count.chunks,
    })
  } catch (error: any) {
    console.error('[API] DELETE /api/sources/[id]/documents/[documentId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
