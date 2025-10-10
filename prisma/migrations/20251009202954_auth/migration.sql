/*
  Warnings:

  - You are about to alter the column `embedding` on the `chunks` table. The data in that column could be lost. The data in that column will be cast from `vector(1536)` to `Unsupported("vector(1536)")`.
  - A unique constraint covering the columns `[token]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "token" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");
