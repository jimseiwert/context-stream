# PDF Parser Microservice

A lightweight Python microservice for parsing PDF files and extracting text and metadata using PyPDF2.

## Features

- Extract text from PDF files
- Extract metadata (pages, author, title, creation date)
- Fast and reliable PDF parsing
- Health check endpoint
- Air-gap compatible (no external API calls)

## API Endpoints

### POST /parse
Upload a PDF file and get extracted text and metadata.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (PDF file)

**Response:**
```json
{
  "text": "Extracted text content...",
  "metadata": {
    "pages": 10,
    "author": "Author Name",
    "title": "Document Title",
    "createdDate": "D:20240101120000"
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "pdf-parser"
}
```

## Local Development

### Install dependencies
```bash
pip install -r requirements.txt
```

### Run the service
```bash
python main.py
```

The service will be available at http://localhost:8001

## Docker

### Build the image
```bash
docker build -t pdf-parser .
```

### Run the container
```bash
docker run -p 8001:8001 pdf-parser
```

## Railway Deployment

1. Create a new service in Railway
2. Connect this directory as the root
3. Railway will automatically detect the Dockerfile
4. Set the port to 8001
5. Deploy!

## Environment Variables

None required - this service is stateless and air-gap compatible.
