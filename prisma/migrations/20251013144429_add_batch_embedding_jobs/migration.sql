-- CreateTable
CREATE TABLE "batch_embedding_jobs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "openai_batch_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'validating',
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER,
    "error_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "batch_embedding_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "batch_embedding_jobs_openai_batch_id_key" ON "batch_embedding_jobs"("openai_batch_id");

-- CreateIndex
CREATE INDEX "batch_embedding_jobs_source_id_idx" ON "batch_embedding_jobs"("source_id");

-- CreateIndex
CREATE INDEX "batch_embedding_jobs_status_idx" ON "batch_embedding_jobs"("status");

-- AddForeignKey
ALTER TABLE "batch_embedding_jobs" ADD CONSTRAINT "batch_embedding_jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
