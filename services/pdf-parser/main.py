"""
PDF Parser Microservice
Extracts text and metadata from PDF files using PyPDF2
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PyPDF2 import PdfReader
import io
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF Parser Service", version="1.0.0")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "pdf-parser"}


@app.post("/parse")
async def parse_pdf(file: UploadFile = File(...)):
    """
    Parse a PDF file and extract text and metadata

    Returns:
    - text: Extracted text content
    - metadata: PDF metadata (pages, author, title, etc.)
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        # Read the uploaded file
        contents = await file.read()
        pdf_file = io.BytesIO(contents)

        # Parse PDF
        reader = PdfReader(pdf_file)

        # Extract text from all pages
        text_parts = []
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_num == 0:
                logger.info(f"First page text length: {len(page_text) if page_text else 0}")
                logger.info(f"First 100 chars: {page_text[:100] if page_text else 'EMPTY'}")
            text_parts.append(page_text)

        full_text = "\n".join(text_parts)
        logger.info(f"Total extracted text length: {len(full_text)}")

        # Extract metadata
        metadata = {
            "pages": len(reader.pages),
            "author": None,
            "title": None,
            "createdDate": None,
        }

        # Get PDF metadata if available
        if reader.metadata:
            metadata["author"] = reader.metadata.get("/Author")
            metadata["title"] = reader.metadata.get("/Title")
            metadata["createdDate"] = reader.metadata.get("/CreationDate")

        logger.info(f"Successfully parsed PDF: {file.filename} ({metadata['pages']} pages, {len(full_text)} chars)")

        return JSONResponse(content={
            "text": full_text,
            "metadata": metadata,
        })

    except Exception as e:
        logger.error(f"Error parsing PDF {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
