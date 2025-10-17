/**
 * PDF Parser Client
 * Calls the PDF Parser microservice to extract text from PDFs
 */

type PDFInfo = {
  Author?: string
  Title?: string
  CreationDate?: string
  [key: string]: any
}

type PDFData = {
  numpages: number
  numrender: number
  info: PDFInfo
  metadata: any
  text: string
  version: string
}

// Get PDF parser service URL from environment
const PDF_PARSER_URL = process.env.PDF_PARSER_URL || 'http://localhost:8001'

/**
 * Parse PDF date format (D:YYYYMMDDHHmmSS) to JavaScript Date
 */
function parsePDFDate(pdfDate: string | null): Date | undefined {
  if (!pdfDate) return undefined

  try {
    // PDF date format: D:YYYYMMDDHHmmSS+HH'mm'
    // Example: D:20240101120000+00'00'
    const match = pdfDate.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
    if (!match) return undefined

    const [, year, month, day, hour, minute, second] = match
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // JavaScript months are 0-indexed
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    )
  } catch (error) {
    return undefined
  }
}

export async function parsePDF(buffer: Buffer): Promise<PDFData> {
  try {
    console.log(`[PDF Parser] Calling PDF parser service at ${PDF_PARSER_URL}`)
    console.log(`[PDF Parser] Buffer size: ${buffer.length} bytes`)

    // Create form data with the PDF buffer
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' })
    formData.append('file', blob, 'document.pdf')

    // Call the PDF parser service
    const response = await fetch(`${PDF_PARSER_URL}/parse`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[PDF Parser] Service error: ${error}`)
      throw new Error(`PDF parser service error: ${error}`)
    }

    const result = await response.json()
    console.log(`[PDF Parser] Received response:`, {
      pages: result.metadata?.pages,
      textLength: result.text?.length,
      firstChars: result.text?.substring(0, 100)
    })

    // Parse PDF date if present
    const createdDate = parsePDFDate(result.metadata.createdDate)

    // Transform response to match expected format
    return {
      numpages: result.metadata.pages,
      numrender: result.metadata.pages,
      info: {
        Author: result.metadata.author || undefined,
        Title: result.metadata.title || undefined,
        CreationDate: result.metadata.createdDate || undefined,
      },
      metadata: {
        ...result.metadata,
        // Override createdDate with parsed Date object or omit if invalid
        ...(createdDate && { createdDate }),
      },
      text: result.text,
      version: '1.0',
    }
  } catch (error: any) {
    throw new Error(`PDF parsing failed: ${error.message}`)
  }
}
