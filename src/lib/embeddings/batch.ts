/**
 * OpenAI Batch Embeddings API
 *
 * This module handles batch embedding generation using OpenAI's Batch API
 * for 50% cost savings compared to real-time embeddings.
 *
 * Workflow:
 * 1. Collect page chunks that need embeddings
 * 2. Create a JSONL file with batch requests
 * 3. Upload file to OpenAI
 * 4. Create batch job
 * 5. Poll for completion (typically 24 hours)
 * 6. Download results and update database
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { writeFile, unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { chunkText } from './chunker';
import { createChunks } from '@/lib/db/queries/chunks';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface BatchEmbeddingRequest {
  custom_id: string;  // pageId:chunkIndex
  method: "POST";
  url: "/v1/embeddings";
  body: {
    model: "text-embedding-3-small";
    input: string;
    dimensions: 1536;
  };
}

export interface BatchEmbeddingResponse {
  custom_id: string;
  response: {
    status_code: number;
    body: {
      data: Array<{
        embedding: number[];
      }>;
    };
  };
}

/**
 * Create a batch job for generating embeddings
 *
 * @param sourceId - Source ID to process
 * @returns Batch job ID
 */
export async function createBatchEmbeddingJob(sourceId: string): Promise<string> {
  console.log(`[Batch] Creating batch embedding job for source: ${sourceId}`);

  // 1. Get all pages from the source that need embeddings
  const pages = await prisma.page.findMany({
    where: {
      sourceId,
      // Only include pages with content text (not empty)
      contentText: {
        not: ''
      },
    },
    select: {
      id: true,
      contentText: true,
    },
  });

  if (pages.length === 0) {
    console.log(`[Batch] No pages found for source ${sourceId}`);
    throw new Error('No pages to process');
  }

  console.log(`[Batch] Found ${pages.length} pages to process`);

  // 2. Create batch requests with proper chunking
  const requests: BatchEmbeddingRequest[] = [];

  for (const page of pages) {
    if (!page.contentText) continue;

    // Chunk the content (same as real-time embedding)
    // Use conservative chunking to stay under API limits
    const chunks = chunkText(page.contentText, {
      maxTokens: 400,
      overlap: 50,
    });

    // Create a batch request for each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      requests.push({
        custom_id: `${page.id}:${chunkIndex}`,
        method: "POST",
        url: "/v1/embeddings",
        body: {
          model: "text-embedding-3-small",
          input: chunks[chunkIndex].content,
          dimensions: 1536,
        },
      });
    }
  }

  console.log(`[Batch] Created ${requests.length} embedding requests`);

  // 3. Write requests to JSONL file
  const jsonl = requests.map(req => JSON.stringify(req)).join('\n');
  const tempFilePath = join(tmpdir(), `batch-${sourceId}-${Date.now()}.jsonl`);

  await writeFile(tempFilePath, jsonl, 'utf-8');
  console.log(`[Batch] Wrote batch file: ${tempFilePath}`);

  try {
    // 4. Upload file to OpenAI
    console.log(`[Batch] Uploading batch file to OpenAI...`);
    const file = await client.files.create({
      file: createReadStream(tempFilePath) as any,
      purpose: 'batch',
    });

    console.log(`[Batch] File uploaded: ${file.id}`);

    // 5. Create batch job
    console.log(`[Batch] Creating batch job...`);
    const batch = await client.batches.create({
      input_file_id: file.id,
      endpoint: '/v1/embeddings',
      completion_window: '24h',
      metadata: {
        source_id: sourceId,
        description: `Embeddings for source ${sourceId}`,
      },
    });

    console.log(`[Batch] Batch job created: ${batch.id}`);
    console.log(`[Batch]   Status: ${batch.status}`);
    console.log(`[Batch]   Request count: ${batch.request_counts?.total || requests.length}`);

    // 6. Store batch job record in database
    await prisma.$executeRaw`
      INSERT INTO batch_embedding_jobs (id, source_id, status, openai_batch_id, request_count, created_at)
      VALUES (gen_random_uuid(), ${sourceId}, 'validating', ${batch.id}, ${requests.length}, NOW())
      ON CONFLICT DO NOTHING
    `;

    console.log(`[Batch] Batch job record saved to database`);

    return batch.id;
  } finally {
    // Clean up temp file
    try {
      await unlink(tempFilePath);
      console.log(`[Batch] Cleaned up temp file: ${tempFilePath}`);
    } catch (error) {
      console.error(`[Batch] Error cleaning up temp file:`, error);
    }
  }
}

/**
 * Check the status of a batch job
 */
export async function checkBatchStatus(batchId: string) {
  const batch = await client.batches.retrieve(batchId);

  console.log(`[Batch] Status for ${batchId}:`);
  console.log(`[Batch]   Status: ${batch.status}`);
  console.log(`[Batch]   Completed: ${batch.request_counts?.completed || 0}/${batch.request_counts?.total || 0}`);
  console.log(`[Batch]   Failed: ${batch.request_counts?.failed || 0}`);

  return batch;
}

/**
 * Process completed batch job and update database with embeddings
 */
export async function processBatchResults(batchId: string) {
  console.log(`[Batch] Processing results for batch: ${batchId}`);

  // 1. Retrieve batch info
  const batch = await client.batches.retrieve(batchId);

  if (batch.status !== 'completed') {
    throw new Error(`Batch ${batchId} is not completed (status: ${batch.status})`);
  }

  if (!batch.output_file_id) {
    throw new Error(`Batch ${batchId} has no output file`);
  }

  // 2. Download results file
  console.log(`[Batch] Downloading results from file: ${batch.output_file_id}`);
  const fileContent = await client.files.content(batch.output_file_id);
  const fileText = await fileContent.text();

  // 3. MEMORY FIX: Parse JSONL results line by line to avoid loading everything into memory
  const results: BatchEmbeddingResponse[] = [];
  const lines = fileText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      try {
        results.push(JSON.parse(trimmed));
      } catch (error) {
        console.error(`[Batch] Failed to parse line:`, error);
      }
    }
  }

  console.log(`[Batch] Parsed ${results.length} results`);

  // 4. Group results by page and create chunks with embeddings
  let successCount = 0;
  let errorCount = 0;

  // Group results by pageId
  const resultsByPage = new Map<string, Map<number, number[]>>();

  for (const result of results) {
    try {
      if (result.response.status_code !== 200) {
        console.error(`[Batch] Error for ${result.custom_id}: Status ${result.response.status_code}`);
        errorCount++;
        continue;
      }

      // Extract pageId and chunkIndex from custom_id (format: "pageId:chunkIndex")
      const [pageId, chunkIndexStr] = result.custom_id.split(':');
      const chunkIndex = parseInt(chunkIndexStr, 10);
      const embedding = result.response.body.data[0].embedding;

      // Store in map
      if (!resultsByPage.has(pageId)) {
        resultsByPage.set(pageId, new Map());
      }
      resultsByPage.get(pageId)!.set(chunkIndex, embedding);

      successCount++;
    } catch (error) {
      console.error(`[Batch] Error processing result ${result.custom_id}:`, error);
      errorCount++;
    }
  }

  // 5. Create chunks in database
  console.log(`[Batch] Creating chunks for ${resultsByPage.size} pages...`);

  // MEMORY FIX: Process pages in batches and clear memory after each batch
  const pageEntries = Array.from(resultsByPage.entries());
  const BATCH_SIZE = 10;

  for (let i = 0; i < pageEntries.length; i += BATCH_SIZE) {
    const batch = pageEntries.slice(i, i + BATCH_SIZE);

    for (const [pageId, chunks] of batch) {
      try {
        // Get page content to re-chunk
        const page = await prisma.page.findUnique({
          where: { id: pageId },
          select: { contentText: true },
        });

        if (!page || !page.contentText) {
          console.error(`[Batch] Page ${pageId} not found or has no content`);
          continue;
        }

        // Re-chunk the content (deterministic chunking)
        const textChunks = chunkText(page.contentText, {
          maxTokens: 512,
          overlap: 50,
        });

        // Create chunk records with embeddings
        const chunkRecords = [];
        for (let j = 0; j < textChunks.length; j++) {
          const embedding = chunks.get(j);
          if (!embedding) {
            console.warn(`[Batch] Missing embedding for chunk ${j} of page ${pageId}`);
            continue;
          }

          chunkRecords.push({
            pageId,
            chunkIndex: j,
            content: textChunks[j].content,
            embedding,
            metadata: textChunks[j].metadata,
          });
        }

        // Batch insert chunks
        if (chunkRecords.length > 0) {
          await createChunks(chunkRecords);
          console.log(`[Batch] Created ${chunkRecords.length} chunks for page ${pageId}`);
        }

        // MEMORY FIX: Clear processed page data
        chunks.clear();
      } catch (error) {
        console.error(`[Batch] Error creating chunks for page ${pageId}:`, error);
        errorCount++;
      }
    }

    // MEMORY FIX: Force garbage collection hint after each batch
    if (global.gc && i > 0 && i % 50 === 0) {
      console.log(`[Batch] Processed ${i} pages, suggesting garbage collection...`);
      global.gc();
    }
  }

  // MEMORY FIX: Clear the results map
  resultsByPage.clear();

  console.log(`[Batch] Results processed:`);
  console.log(`[Batch]   Success: ${successCount}`);
  console.log(`[Batch]   Errors: ${errorCount}`);

  // 5. Update batch job status in database
  await prisma.$executeRaw`
    UPDATE batch_embedding_jobs
    SET status = 'completed',
        completed_at = NOW(),
        success_count = ${successCount},
        error_count = ${errorCount}
    WHERE openai_batch_id = ${batchId}
  `;

  return {
    successCount,
    errorCount,
    total: results.length,
  };
}

/**
 * Cancel a batch job
 */
export async function cancelBatchJob(batchId: string) {
  console.log(`[Batch] Canceling batch: ${batchId}`);

  const batch = await client.batches.cancel(batchId);

  await prisma.$executeRaw`
    UPDATE batch_embedding_jobs
    SET status = 'cancelled',
        completed_at = NOW()
    WHERE openai_batch_id = ${batchId}
  `;

  return batch;
}

/**
 * List all batch jobs with a specific status
 */
export async function listBatchJobs(status?: string) {
  const batches = await client.batches.list({
    limit: 100,
  });

  return batches.data.filter(batch =>
    !status || batch.status === status
  );
}
