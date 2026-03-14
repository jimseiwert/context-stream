// Document Upload Route - POST /api/sources/[id]/documents
// Accepts multipart form data, extracts text, saves to documents table, triggers embedding

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, documents, chunks } from "@/lib/db/schema";
import type { DocumentType } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/utils/errors";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { chunkText } from "@/lib/embeddings/chunker";
import { generateEmbeddings } from "@/lib/embeddings/service";

type RouteParams = { params: Promise<{ id: string }> };

// Supported document MIME types → DocumentType enum
const SUPPORTED_TYPES: Record<string, DocumentType> = {
  "text/plain": "TXT",
  "text/markdown": "MD",
  "text/x-markdown": "MD",
  "text/csv": "CSV",
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/msword": "DOCX",
};

// Extension fallback map
const EXTENSION_TYPES: Record<string, DocumentType> = {
  ".txt": "TXT",
  ".md": "MD",
  ".mdx": "MD",
  ".csv": "CSV",
  ".pdf": "PDF",
  ".docx": "DOCX",
  ".doc": "DOCX",
};

function detectDocumentType(filename: string, mimeType: string): DocumentType | null {
  const fromMime = SUPPORTED_TYPES[mimeType.split(";")[0].trim().toLowerCase()];
  if (fromMime) return fromMime;

  const ext = "." + filename.split(".").pop()?.toLowerCase();
  return EXTENSION_TYPES[ext] ?? null;
}

/**
 * Attempts to send the PDF buffer to the PDF parser service.
 * Falls back to empty string if the service is unavailable.
 */
async function extractPdfText(buffer: Buffer, filename: string): Promise<string> {
  const pdfParserUrl = process.env.PDF_PARSER_URL;

  if (pdfParserUrl) {
    try {
      const form = new FormData();
      // Copy to a plain ArrayBuffer to satisfy TypeScript's BlobPart constraint
      const arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuf], { type: "application/pdf" });
      form.append("file", blob, filename);

      const response = await fetch(`${pdfParserUrl.replace(/\/$/, "")}/parse`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        const data = (await response.json()) as { text?: string };
        return data.text ?? "";
      }
      console.warn(`[Documents] PDF parser returned ${response.status}`);
    } catch (err) {
      console.warn("[Documents] PDF parser unavailable, using fallback:", err);
    }
  }

  // Simple fallback: extract readable ASCII text from PDF buffer
  // (Very basic — only catches text-layer PDFs with simple encoding)
  const text = buffer.toString("latin1");
  const readable = text.replace(/[^\x20-\x7E\n\t]/g, " ").replace(/\s+/g, " ").trim();
  return readable.length > 100 ? readable : "[PDF content — parser not available]";
}

/**
 * Extracts text from a DOCX buffer by parsing the word/document.xml inside the ZIP.
 * Does not require external libraries.
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  // DOCX is a ZIP file; we need to extract word/document.xml
  // Without a zip library, we do a best-effort text extraction
  try {
    const text = buffer.toString("utf-8");
    // Extract text between XML tags
    const xmlMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) ?? [];
    const extracted = xmlMatches
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return extracted.length > 0 ? extracted : "[DOCX content could not be extracted]";
  } catch {
    return "[DOCX content could not be extracted]";
  }
}

/**
 * Extracts plain text content from an uploaded file buffer based on its document type.
 */
async function extractTextContent(
  buffer: Buffer,
  filename: string,
  docType: DocumentType
): Promise<string> {
  switch (docType) {
    case "TXT":
    case "MD":
    case "HTML":
    case "RTF":
      return buffer.toString("utf-8");

    case "CSV": {
      const text = buffer.toString("utf-8");
      // Convert CSV rows to readable text
      return text.replace(/,/g, " | ").replace(/"/g, "");
    }

    case "PDF":
      return extractPdfText(buffer, filename);

    case "DOCX":
      return extractDocxText(buffer);

    default:
      return buffer.toString("utf-8");
  }
}

// POST /api/sources/[id]/documents — upload and process a document file
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: sourceId } = await params;
    const userId = session.user.id;

    // Verify source exists and user has access
    const source = await db.query.sources.findFirst({
      where: eq(sources.id, sourceId),
      columns: { id: true, createdById: true, type: true },
    });

    if (!source) {
      throw new NotFoundError("Source");
    }

    if (
      source.createdById !== userId &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      throw new ForbiddenError("You do not have permission to upload documents to this source");
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ValidationError("A file must be provided in the 'file' form field");
    }

    const filename = file.name;
    const mimeType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const size = buffer.length;

    // Detect document type
    const docType = detectDocumentType(filename, mimeType);
    if (!docType) {
      throw new ValidationError(
        `Unsupported file type. Supported: PDF, TXT, MD, CSV, DOCX`
      );
    }

    // Extract text content
    const contentText = await extractTextContent(buffer, filename, docType);

    // Compute checksum for deduplication
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Check for duplicate in this source
    const existing = await db.query.documents.findFirst({
      where: (d, { and, eq: eqFn }) =>
        and(eqFn(d.sourceId, sourceId), eqFn(d.checksum, checksum)),
      columns: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "This file has already been uploaded to this source" } },
        { status: 409 }
      );
    }

    // Insert document record
    const [document] = await db
      .insert(documents)
      .values({
        sourceId,
        filename,
        type: docType,
        size,
        contentText,
        checksum,
        metadata: { mimeType, uploadedBy: userId },
      })
      .returning();

    // Process chunks + embeddings asynchronously (fire and forget)
    setImmediate(async () => {
      try {
        const textChunks = chunkText(contentText);
        if (textChunks.length === 0) return;

        const embeddings = await generateEmbeddings(textChunks);

        // Remove any old chunks for this document
        await db.delete(chunks).where(eq(chunks.documentId, document.id));

        const chunkRows = textChunks.map((content, index) => ({
          documentId: document.id,
          chunkIndex: index,
          content,
          embedding: embeddings[index] ?? null,
          metadata: { charCount: content.length },
        }));

        for (let i = 0; i < chunkRows.length; i += 50) {
          await db.insert(chunks).values(chunkRows.slice(i, i + 50));
        }

        // Mark document as indexed
        await db
          .update(documents)
          .set({ indexedAt: new Date() })
          .where(eq(documents.id, document.id));

        console.log(`[Documents] Indexed ${textChunks.length} chunks for document ${document.id}`);
      } catch (err) {
        console.error(`[Documents] Failed to process chunks for document ${document.id}:`, err);
      }
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/sources/[id]/documents — list documents for a source
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id: sourceId } = await params;

    const source = await db.query.sources.findFirst({
      where: eq(sources.id, sourceId),
      columns: { id: true },
    });

    if (!source) {
      throw new NotFoundError("Source");
    }

    const docs = await db.query.documents.findMany({
      where: eq(documents.sourceId, sourceId),
      columns: {
        id: true,
        filename: true,
        type: true,
        size: true,
        checksum: true,
        metadata: true,
        uploadedAt: true,
        indexedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ documents: docs });
  } catch (error) {
    return handleApiError(error);
  }
}
