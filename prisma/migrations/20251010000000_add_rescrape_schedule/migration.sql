-- CreateEnum
CREATE TYPE "RescrapeSchedule" AS ENUM ('NEVER', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Source" ADD COLUMN "rescrapeSchedule" "RescrapeSchedule" NOT NULL DEFAULT 'NEVER',
ADD COLUMN "nextScrapeAt" TIMESTAMP(3),
ADD COLUMN "lastAutomatedScrapeAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Source_nextScrapeAt_idx" ON "Source"("nextScrapeAt");

-- CreateIndex
CREATE INDEX "Source_rescrapeSchedule_idx" ON "Source"("rescrapeSchedule");
