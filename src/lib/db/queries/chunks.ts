import { db } from "@/lib/db";
import { chunks } from "@/lib/db/schema";

export interface ChunkRecord {
  pageId: string;
  chunkIndex: number;
  content: string;
  embedding?: number[] | null;
  metadata?: Record<string, unknown> | null;
}

export async function createChunks(records: ChunkRecord[]): Promise<void> {
  if (records.length === 0) return;
  await db.insert(chunks).values(records);
}
