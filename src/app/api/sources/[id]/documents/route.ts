/**
 * Document Upload API Routes
 *
 * POST /api/sources/[id]/documents - Upload document(s) to a source
 * GET  /api/sources/[id]/documents - List documents for a source
 */

import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'
import { addDocumentJob } from '@/lib/jobs/queue'
import { validateDocument } from '@/lib/documents/validator'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * POST /api/sources/[id]/documents
 * Upload one or more documents to a source
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sourceId } = await params

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

    // Check if source is a DOCUMENT type or can accept documents
    if (source.type !== 'DOCUMENT') {
      return NextResponse.json(
        { error: 'This source does not accept document uploads. Create a DOCUMENT source first.' },
        { status: 400 }
      )
    }

    // Check if user has access to this source
    const hasAccess =
      source.scope === 'GLOBAL' ||
      source.workspaceSources.some((ws) => ws.workspace.ownerId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const overrideExisting = formData.get('override') === 'true'

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Validate and process each file
    const results = []
    const errors = []

    for (const file of files) {
      try {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push({
            filename: file.name,
            error: `File size exceeds maximum (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
          })
          continue
        }

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Validate document type
        const validation = validateDocument(buffer, file.name)
        if (!validation.valid) {
          errors.push({
            filename: file.name,
            error: validation.error,
          })
          continue
        }

        // Save file to temporary location
        const tempDir = join(tmpdir(), 'context-stream-uploads')
        await mkdir(tempDir, { recursive: true })

        const tempFilename = `${randomUUID()}-${file.name}`
        const tempPath = join(tempDir, tempFilename)

        await writeFile(tempPath, buffer)

        // Create job record
        const job = await prisma.job.create({
          data: {
            sourceId,
            type: 'DOCUMENT_UPLOAD',
            status: 'PENDING',
            progress: {
              stage: 'pending',
              filename: file.name,
            },
          },
        })

        // Queue document processing job
        await addDocumentJob(sourceId, file.name, tempPath, session.user.id, overrideExisting)

        results.push({
          filename: file.name,
          jobId: job.id,
          status: 'queued',
        })
      } catch (error: any) {
        errors.push({
          filename: file.name,
          error: error.message,
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `${results.length} file(s) queued for processing`,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API] POST /api/sources/[id]/documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sources/[id]/documents
 * List documents for a source
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sourceId } = await params

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

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

    // Get documents
    const documents = await prisma.document.findMany({
      where: { sourceId },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.document.count({ where: { sourceId } })

    // Format response
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      type: doc.type,
      size: doc.size,
      chunksCount: doc._count.chunks,
      uploadedAt: doc.uploadedAt,
      indexedAt: doc.indexedAt,
      metadata: doc.metadata,
    }))

    return NextResponse.json({
      documents: formattedDocuments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('[API] GET /api/sources/[id]/documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
