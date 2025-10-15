/*
  Warnings:

  - You are about to alter the column `embedding` on the `chunks` table. The data in that column could be lost. The data in that column will be cast from `vector(1536)` to `Unsupported("vector(1536)")`.

*/
-- AlterTable
ALTER TABLE "chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);
