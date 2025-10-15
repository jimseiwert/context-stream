/*
  Warnings:

  - You are about to alter the column `embedding` on the `chunks` table. The data in that column could be lost. The data in that column will be cast from `vector(1536)` to `Unsupported("vector(1536)")`.
  - You are about to drop the `QueryLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE', 'SELF_HOSTED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('SEARCH', 'SOURCE_ADDED', 'PAGE_INDEXED', 'API_REQUEST', 'WORKSPACE_CREATED');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "scope" TEXT;

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "pageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quality" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);

-- DropTable
DROP TABLE "public"."QueryLog";

-- CreateTable
CREATE TABLE "query_logs" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultsCount" INTEGER,
    "topPageIds" TEXT[],
    "sourceIds" TEXT[],
    "latencyMs" INTEGER,
    "workspaceId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queriedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "searchesPerMonth" INTEGER NOT NULL DEFAULT 50,
    "maxSources" INTEGER NOT NULL DEFAULT 3,
    "maxWorkspaces" INTEGER NOT NULL DEFAULT 1,
    "maxPagesIndexed" INTEGER NOT NULL DEFAULT 500,
    "apiRateLimit" INTEGER NOT NULL DEFAULT 30,
    "searchesUsed" INTEGER NOT NULL DEFAULT 0,
    "sourcesUsed" INTEGER NOT NULL DEFAULT 0,
    "workspacesUsed" INTEGER NOT NULL DEFAULT 0,
    "pagesIndexed" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "billingCycle" TIMESTAMP(3),
    "resetAt" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "UsageEventType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "query_logs_workspaceId_idx" ON "query_logs"("workspaceId");

-- CreateIndex
CREATE INDEX "query_logs_queriedAt_idx" ON "query_logs"("queriedAt");

-- CreateIndex
CREATE INDEX "query_logs_userId_idx" ON "query_logs"("userId");

-- CreateIndex
CREATE INDEX "query_logs_createdAt_idx" ON "query_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_planTier_idx" ON "Subscription"("planTier");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_eventType_timestamp_idx" ON "UsageEvent"("userId", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "UsageEvent_timestamp_idx" ON "UsageEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
