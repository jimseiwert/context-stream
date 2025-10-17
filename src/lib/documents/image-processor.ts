/**
 * Image Processing & OCR
 * Extracts text from images using various methods
 * Supports air-gap compatible OCR (Tesseract.js) and cloud vision APIs
 */

import { createWorker } from 'tesseract.js'
import { ImageProcessingMethod } from '@prisma/client'
import { ImageInfo } from './extractors'

export interface ImageProcessingConfig {
  method: ImageProcessingMethod
  // OCR settings
  ocrLanguage?: string // default: 'eng'
  ocrQuality?: number // 1=fast, 2=balanced, 3=best
  // Vision API settings
  apiKey?: string
  apiEndpoint?: string
  visionModel?: string
  visionPrompt?: string
  // General
  maxImageSize?: number // max size in bytes
}

export interface ImageTextResult {
  text: string
  confidence?: number // 0-100
  processingMethod: ImageProcessingMethod
  error?: string
}

/**
 * Process image and extract text based on configured method
 */
export async function processImage(
  imageBuffer: Buffer,
  config: ImageProcessingConfig
): Promise<ImageTextResult> {
  // Validate image size
  if (config.maxImageSize && imageBuffer.length > config.maxImageSize) {
    return {
      text: '',
      processingMethod: config.method,
      error: `Image size (${imageBuffer.length} bytes) exceeds maximum (${config.maxImageSize} bytes)`,
    }
  }

  switch (config.method) {
    case 'OCR':
      return await processWithOCR(imageBuffer, config)
    case 'OPENAI_VISION':
      return await processWithOpenAIVision(imageBuffer, config)
    case 'AZURE_VISION':
      return await processWithAzureVision(imageBuffer, config)
    case 'SKIP':
      return {
        text: '[Image content skipped]',
        processingMethod: 'SKIP',
      }
    default:
      throw new Error(`Unsupported image processing method: ${config.method}`)
  }
}

/**
 * Process image using Tesseract.js OCR (air-gap compatible)
 */
async function processWithOCR(
  imageBuffer: Buffer,
  config: ImageProcessingConfig
): Promise<ImageTextResult> {
  const worker = await createWorker(config.ocrLanguage || 'eng', config.ocrQuality || 2)

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(imageBuffer)

    await worker.terminate()

    return {
      text: text.trim(),
      confidence: Math.round(confidence),
      processingMethod: 'OCR',
    }
  } catch (error: any) {
    await worker.terminate()
    return {
      text: '',
      processingMethod: 'OCR',
      error: `OCR failed: ${error.message}`,
    }
  }
}

/**
 * Process image using OpenAI Vision API
 */
async function processWithOpenAIVision(
  imageBuffer: Buffer,
  config: ImageProcessingConfig
): Promise<ImageTextResult> {
  if (!config.apiKey) {
    return {
      text: '',
      processingMethod: 'OPENAI_VISION',
      error: 'OpenAI API key not configured',
    }
  }

  try {
    const base64Image = imageBuffer.toString('base64')
    const model = config.visionModel || 'gpt-4o-mini'
    const prompt =
      config.visionPrompt ||
      'Extract all text from this image. If there are tables, preserve the structure. Include any captions or labels.'

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const result = await response.json()
    const text = result.choices[0]?.message?.content || ''

    return {
      text: text.trim(),
      processingMethod: 'OPENAI_VISION',
    }
  } catch (error: any) {
    return {
      text: '',
      processingMethod: 'OPENAI_VISION',
      error: `Vision API failed: ${error.message}`,
    }
  }
}

/**
 * Process image using Azure Computer Vision API
 */
async function processWithAzureVision(
  imageBuffer: Buffer,
  config: ImageProcessingConfig
): Promise<ImageTextResult> {
  if (!config.apiKey || !config.apiEndpoint) {
    return {
      text: '',
      processingMethod: 'AZURE_VISION',
      error: 'Azure Vision API key or endpoint not configured',
    }
  }

  try {
    const endpoint = `${config.apiEndpoint}/vision/v3.2/read/analyze`

    // Submit image for analysis
    const submitResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': config.apiKey,
      },
      body: new Uint8Array(imageBuffer),
    })

    if (!submitResponse.ok) {
      throw new Error(`Azure Vision API error: ${submitResponse.statusText}`)
    }

    // Get operation location from headers
    const operationLocation = submitResponse.headers.get('Operation-Location')
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure')
    }

    // Poll for results
    let result: any
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second

      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': config.apiKey,
        },
      })

      result = await resultResponse.json()

      if (result.status === 'succeeded') {
        break
      } else if (result.status === 'failed') {
        throw new Error('Azure Vision processing failed')
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error('Azure Vision processing timeout')
    }

    // Extract text from result
    const readResults = result.analyzeResult?.readResults || []
    const text = readResults
      .flatMap((page: any) => page.lines || [])
      .map((line: any) => line.text)
      .join('\n')

    return {
      text: text.trim(),
      processingMethod: 'AZURE_VISION',
    }
  } catch (error: any) {
    return {
      text: '',
      processingMethod: 'AZURE_VISION',
      error: `Azure Vision failed: ${error.message}`,
    }
  }
}

/**
 * Process multiple images in batch
 */
export async function processBatchImages(
  images: ImageInfo[],
  config: ImageProcessingConfig,
  concurrency: number = 2
): Promise<ImageTextResult[]> {
  const results: ImageTextResult[] = []

  // Process in chunks based on concurrency
  for (let i = 0; i < images.length; i += concurrency) {
    const chunk = images.slice(i, i + concurrency)
    const chunkResults = await Promise.all(
      chunk.map((img) => processImage(img.buffer, config))
    )
    results.push(...chunkResults)
  }

  return results
}

/**
 * Get image processing config from database
 */
export async function getImageProcessingConfig(): Promise<ImageProcessingConfig> {
  const { getImageProcessingConfig: getConfigFromDB } = await import('./config')
  const dbConfig = await getConfigFromDB()

  // Map database config to image processor config format
  const config: ImageProcessingConfig = {
    method: dbConfig.method,
    ocrLanguage: dbConfig.ocrLanguage || 'eng',
    ocrQuality: dbConfig.ocrQuality || 2,
    maxImageSize: 4 * 1024 * 1024, // 4MB
  }

  // Add Vision API settings if applicable
  if (dbConfig.method === 'OPENAI_VISION' && dbConfig.apiKey) {
    config.apiKey = dbConfig.apiKey
    config.visionModel = dbConfig.visionModel || 'gpt-4o'
    config.visionPrompt = dbConfig.visionPrompt || undefined
  }

  if (dbConfig.method === 'AZURE_VISION' && dbConfig.apiKey && dbConfig.apiEndpoint) {
    config.apiKey = dbConfig.apiKey
    config.apiEndpoint = dbConfig.apiEndpoint
  }

  return config
}

/**
 * Extract images from PDF buffer
 * This is a placeholder - proper PDF image extraction requires pdf.js or similar
 */
export async function extractImagesFromPDF(
  pdfBuffer: Buffer
): Promise<ImageInfo[]> {
  // TODO: Implement PDF image extraction
  // This would use pdf.js or a similar library to extract embedded images
  // For now, return empty array
  return []
}

/**
 * Extract images from DOCX buffer
 */
export async function extractImagesFromDOCX(
  docxBuffer: Buffer
): Promise<ImageInfo[]> {
  // TODO: Implement DOCX image extraction
  // Mammoth.js can extract images, but we need to refactor the extraction
  // For now, return empty array
  return []
}

/**
 * Detect if an image contains meaningful text (vs just graphics)
 */
export async function hasTextContent(
  imageBuffer: Buffer,
  config: ImageProcessingConfig
): Promise<boolean> {
  // Quick OCR check to see if there's any text
  const result = await processWithOCR(imageBuffer, config)

  // Consider image has text if we extracted more than 10 characters
  return result.text.length > 10
}
