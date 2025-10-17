/**
 * Document Text Extraction
 * Extracts text content from various document formats
 * All extractors are air-gap compatible (no external API calls)
 */

import { DocumentType } from '@prisma/client'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { fileTypeFromBuffer } from 'file-type'
import { parsePDF } from './pdf-parser'

export interface ExtractionResult {
  text: string
  metadata?: {
    pages?: number
    author?: string
    title?: string
    createdDate?: Date
    images?: ImageInfo[]
    tables?: number
    [key: string]: any
  }
}

export interface ImageInfo {
  index: number
  width?: number
  height?: number
  type?: string
  buffer: Buffer
}

/**
 * Main extraction function - routes to appropriate extractor
 */
export async function extractDocumentText(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  // Detect document type from buffer
  const type = await detectDocumentType(buffer, filename)

  switch (type) {
    case 'TXT':
    case 'MD':
      return extractTextFile(buffer)
    case 'PDF':
      return extractPDF(buffer)
    case 'DOCX':
      return extractDOCX(buffer)
    case 'CSV':
      return extractCSV(buffer)
    case 'XLSX':
      return extractXLSX(buffer)
    case 'HTML':
      return extractHTML(buffer)
    case 'RTF':
      return extractRTF(buffer)
    case 'ODT':
      return extractODT(buffer)
    default:
      throw new Error(`Unsupported document type: ${type}`)
  }
}

/**
 * Detect document type from buffer and filename
 */
export async function detectDocumentType(
  buffer: Buffer,
  filename: string
): Promise<DocumentType> {
  // Try file-type detection first
  const fileType = await fileTypeFromBuffer(buffer)

  // Map MIME types to document types
  if (fileType) {
    const mimeMap: Record<string, DocumentType> = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLSX',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'text/html': 'HTML',
      'text/rtf': 'RTF',
      'application/rtf': 'RTF',
      'application/vnd.oasis.opendocument.text': 'ODT',
    }

    if (fileType.mime in mimeMap) {
      return mimeMap[fileType.mime]
    }
  }

  // Fallback to extension-based detection
  const ext = filename.split('.').pop()?.toLowerCase()

  const extMap: Record<string, DocumentType> = {
    txt: 'TXT',
    md: 'MD',
    pdf: 'PDF',
    docx: 'DOCX',
    csv: 'CSV',
    xlsx: 'XLSX',
    xls: 'XLSX',
    html: 'HTML',
    htm: 'HTML',
    rtf: 'RTF',
    odt: 'ODT',
  }

  if (ext && ext in extMap) {
    return extMap[ext]
  }

  // Default to TXT for unknown types
  return 'TXT'
}

/**
 * Extract text from plain text files (TXT, MD)
 */
async function extractTextFile(buffer: Buffer): Promise<ExtractionResult> {
  const text = buffer.toString('utf-8')
  return {
    text: text.trim(),
    metadata: {
      pages: Math.ceil(text.length / 3000), // Rough page count
    },
  }
}

/**
 * Extract text from PDF files
 * Also extracts embedded images for later OCR processing
 */
async function extractPDF(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Use wrapper to handle CommonJS/ESM compatibility
    const data = await parsePDF(buffer)

    // Extract basic metadata (createdDate is already parsed in pdf-parser)
    const metadata: ExtractionResult['metadata'] = {
      pages: data.numpages,
      author: data.info?.Author,
      title: data.info?.Title,
      createdDate: data.metadata?.createdDate, // Already parsed as Date in pdf-parser
    }

    // Extract images from PDF (for OCR later)
    // Note: pdf-parse doesn't extract images directly, but we can use the raw buffer
    // Images will be extracted by the image processor
    const images: ImageInfo[] = []
    // TODO: Extract images using pdf.js or similar if needed

    if (images.length > 0) {
      metadata.images = images
    }

    return {
      text: data.text.trim(),
      metadata,
    }
  } catch (error: any) {
    throw new Error(`PDF extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from DOCX files
 */
async function extractDOCX(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer })

    const metadata: ExtractionResult['metadata'] = {
      pages: Math.ceil(result.value.length / 3000), // Rough page count
    }

    // TODO: Extract images from DOCX for separate processing
    // Images can be extracted using mammoth.convertToHtml with custom image handlers

    return {
      text: result.value.trim(),
      metadata,
    }
  } catch (error: any) {
    throw new Error(`DOCX extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from CSV files
 */
async function extractCSV(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const text = buffer.toString('utf-8')
    const lines = text.split('\n').filter((line) => line.trim())

    // Parse CSV manually (simple approach)
    const rows = lines.map((line) =>
      line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    )

    // Format as readable text
    const [headers, ...dataRows] = rows
    const formattedText = dataRows
      .map((row) => {
        return headers
          .map((header, i) => `${header}: ${row[i] || ''}`)
          .join('\n')
      })
      .join('\n\n')

    return {
      text: formattedText.trim(),
      metadata: {
        pages: 1,
        tables: 1,
      },
    }
  } catch (error: any) {
    throw new Error(`CSV extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from XLSX/Excel files
 */
async function extractXLSX(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    let allText = ''
    let tableCount = 0

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)

      if (csv.trim()) {
        allText += `\n\n=== ${sheetName} ===\n\n${csv}`
        tableCount++
      }
    }

    return {
      text: allText.trim(),
      metadata: {
        pages: workbook.SheetNames.length,
        tables: tableCount,
      },
    }
  } catch (error: any) {
    throw new Error(`XLSX extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from HTML files
 */
async function extractHTML(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const html = buffer.toString('utf-8')

    // Remove script and style tags
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()

    return {
      text,
      metadata: {
        pages: 1,
      },
    }
  } catch (error: any) {
    throw new Error(`HTML extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from RTF files
 * Basic RTF parser (strips RTF control words)
 */
async function extractRTF(buffer: Buffer): Promise<ExtractionResult> {
  try {
    let text = buffer.toString('utf-8')

    // Strip RTF control words and formatting
    text = text
      // Remove RTF header
      .replace(/\{\\rtf[^}]*\}/g, '')
      // Remove control words
      .replace(/\\[a-z]+\d*\s?/g, '')
      // Remove control symbols
      .replace(/\{|\}/g, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()

    return {
      text,
      metadata: {
        pages: Math.ceil(text.length / 3000),
      },
    }
  } catch (error: any) {
    throw new Error(`RTF extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from ODT (OpenDocument Text) files
 * ODT files are ZIP archives containing XML
 */
async function extractODT(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // ODT extraction requires unzipping and parsing XML
    // For now, use a simple approach with the JSZIP library would be needed
    // This is a placeholder - in production, use proper ODT parser
    throw new Error(
      'ODT extraction not fully implemented yet. Consider converting to DOCX first.'
    )
  } catch (error: any) {
    throw new Error(`ODT extraction failed: ${error.message}`)
  }
}

// Re-export validator for backwards compatibility
export { validateDocument } from './validator'
