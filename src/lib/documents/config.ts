/**
 * Image Processing Configuration Helpers
 * Manage image processing settings for document uploads
 */

import { prisma } from '@/lib/db'
import { ImageProcessingMethod } from '@prisma/client'

export interface ImageProcessingConfig {
  id: string
  method: ImageProcessingMethod
  ocrLanguage: string | null
  ocrQuality: number | null
  apiKey: string | null
  apiEndpoint: string | null
  visionModel: string | null
  visionPrompt: string | null
  maxImageSize: number | null
  createdAt: Date
  updatedAt: Date
}

export interface ImageProcessingConfigInput {
  method: ImageProcessingMethod
  ocrLanguage?: string
  ocrQuality?: number
  apiKey?: string
  apiEndpoint?: string
  visionModel?: string
  visionPrompt?: string
}

/**
 * Get the current image processing configuration
 * Returns default OCR config if none exists
 */
export async function getImageProcessingConfig(): Promise<ImageProcessingConfig> {
  const config = await prisma.imageProcessingConfig.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (!config) {
    // Return default OCR configuration
    return {
      id: '',
      method: 'OCR',
      ocrLanguage: 'eng',
      ocrQuality: 2,
      apiKey: null,
      apiEndpoint: null,
      visionModel: null,
      visionPrompt: null,
      maxImageSize: 4194304,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  return config
}

/**
 * Update or create image processing configuration
 */
export async function updateImageProcessingConfig(
  input: ImageProcessingConfigInput
): Promise<ImageProcessingConfig> {
  // Check if config exists
  const existing = await prisma.imageProcessingConfig.findFirst()

  if (existing) {
    // Build update data - only include fields that are provided
    const updateData: any = {
      method: input.method,
    }

    // Only update fields that are explicitly provided
    if (input.ocrLanguage !== undefined) updateData.ocrLanguage = input.ocrLanguage
    if (input.ocrQuality !== undefined) updateData.ocrQuality = input.ocrQuality
    if (input.apiKey !== undefined) updateData.apiKey = input.apiKey
    if (input.apiEndpoint !== undefined) updateData.apiEndpoint = input.apiEndpoint
    if (input.visionModel !== undefined) updateData.visionModel = input.visionModel
    if (input.visionPrompt !== undefined) updateData.visionPrompt = input.visionPrompt

    // Update existing config
    return await prisma.imageProcessingConfig.update({
      where: { id: existing.id },
      data: updateData,
    })
  }

  // Create new config
  return await prisma.imageProcessingConfig.create({
    data: {
      method: input.method,
      ocrLanguage: input.ocrLanguage || 'eng',
      ocrQuality: input.ocrQuality || 2,
      apiKey: input.apiKey || null,
      apiEndpoint: input.apiEndpoint || null,
      visionModel: input.visionModel || 'gpt-4o',
      visionPrompt: input.visionPrompt || null,
    },
  })
}

/**
 * Validate image processing configuration
 */
export function validateImageProcessingConfig(
  input: ImageProcessingConfigInput
): { valid: boolean; error?: string } {
  // Validate OCR settings
  if (input.method === 'OCR') {
    if (!input.ocrLanguage) {
      return { valid: false, error: 'OCR language is required for OCR method' }
    }
    if (input.ocrQuality && (input.ocrQuality < 1 || input.ocrQuality > 3)) {
      return { valid: false, error: 'OCR quality must be between 1 and 3' }
    }
  }

  // Validate OpenAI Vision settings
  if (input.method === 'OPENAI_VISION') {
    if (!input.apiKey) {
      return { valid: false, error: 'API key is required for OpenAI Vision' }
    }
    if (!input.visionModel) {
      return { valid: false, error: 'Vision model is required for OpenAI Vision' }
    }
  }

  // Validate Azure Vision settings
  if (input.method === 'AZURE_VISION') {
    if (!input.apiEndpoint) {
      return { valid: false, error: 'API endpoint is required for Azure Vision' }
    }
    if (!input.apiKey) {
      return { valid: false, error: 'API key is required for Azure Vision' }
    }
  }

  return { valid: true }
}
