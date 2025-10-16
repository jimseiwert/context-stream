/**
 * Image Processing Configuration API
 *
 * GET  /api/admin/image-processing-config - Get current config
 * POST /api/admin/image-processing-config - Update config
 */

import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'
import {
  getImageProcessingConfig,
  updateImageProcessingConfig,
  validateImageProcessingConfig,
} from '@/lib/documents/config'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateConfigSchema = z.object({
  method: z.enum(['OCR', 'OPENAI_VISION', 'AZURE_VISION', 'SKIP']),
  ocrLanguage: z.string().optional(),
  ocrQuality: z.number().min(1).max(3).optional(),
  apiKey: z.string().optional(),
  apiEndpoint: z.string().url().optional(),
  visionModel: z.string().optional(),
  visionPrompt: z.string().optional(),
})

/**
 * GET /api/admin/image-processing-config
 * Get current image processing configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma?.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Only administrators can access this endpoint' },
        { status: 403 }
      )
    }

    // Get config
    const config = await getImageProcessingConfig()

    // Mask sensitive data for response
    const maskedConfig = {
      ...config,
      apiKey: config.apiKey ? '********' : null,
    }

    return NextResponse.json({ config: maskedConfig })
  } catch (error: any) {
    console.error('[API] GET /api/admin/image-processing-config error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/image-processing-config
 * Update image processing configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma?.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Only administrators can access this endpoint' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const data = UpdateConfigSchema.parse(body)

    // Validate configuration
    const validation = validateImageProcessingConfig(data)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Update config
    const config = await updateImageProcessingConfig(data)

    // Mask sensitive data for response
    const maskedConfig = {
      ...config,
      apiKey: config.apiKey ? '********' : null,
    }

    return NextResponse.json({
      config: maskedConfig,
      message: 'Image processing configuration updated successfully',
    })
  } catch (error: any) {
    console.error('[API] POST /api/admin/image-processing-config error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
