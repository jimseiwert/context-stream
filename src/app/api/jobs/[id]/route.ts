/**
 * Job Status API Routes
 *
 * GET /api/jobs/[id] - Get job status and progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * GET /api/jobs/[id]
 * Get job status, progress, and metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = params.id

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        source: {
          select: {
            id: true,
            url: true,
            domain: true,
            status: true,
            workspaceSources: {
              select: {
                workspaceId: true,
              },
            },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user has access to this job's source workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: {
          in: job.source.workspaceSources.map((ws) => ws.workspaceId),
        },
      },
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ job })

  } catch (error: any) {
    console.error(`[API] GET /api/jobs/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
