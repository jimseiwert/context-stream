-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."DocumentType" AS ENUM('TXT', 'PDF', 'DOCX', 'MD', 'CSV', 'XLSX', 'HTML', 'RTF', 'ODT');--> statement-breakpoint
CREATE TYPE "public"."EmbeddingProvider" AS ENUM('OPENAI', 'AZURE_OPENAI', 'VERTEX_AI');--> statement-breakpoint
CREATE TYPE "public"."ImageProcessingMethod" AS ENUM('OCR', 'OPENAI_VISION', 'AZURE_VISION', 'SKIP');--> statement-breakpoint
CREATE TYPE "public"."JobStatus" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."JobType" AS ENUM('SCRAPE', 'EMBED', 'UPDATE', 'DOCUMENT_UPLOAD');--> statement-breakpoint
CREATE TYPE "public"."PlanTier" AS ENUM('FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE', 'SELF_HOSTED');--> statement-breakpoint
CREATE TYPE "public"."RescrapeSchedule" AS ENUM('NEVER', 'DAILY', 'WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."SourceScope" AS ENUM('GLOBAL', 'WORKSPACE');--> statement-breakpoint
CREATE TYPE "public"."SourceStatus" AS ENUM('PENDING', 'INDEXING', 'ACTIVE', 'ERROR', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."SourceType" AS ENUM('WEBSITE', 'GITHUB', 'DOCUMENT');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionStatus" AS ENUM('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING', 'INCOMPLETE');--> statement-breakpoint
CREATE TYPE "public"."UsageEventType" AS ENUM('SEARCH', 'SOURCE_ADDED', 'PAGE_INDEXED', 'API_REQUEST', 'WORKSPACE_CREATED');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('SUPER_ADMIN', 'ADMIN', 'USER');--> statement-breakpoint
CREATE TABLE "Account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"expiresAt" timestamp,
	"password" text,
	"scope" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApiKey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"userId" uuid NOT NULL,
	"lastUsedAt" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ApiKey_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"role" "UserRole" DEFAULT 'USER' NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "Verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkspaceSource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"sourceId" uuid NOT NULL,
	"customConfig" jsonb,
	"addedAt" timestamp DEFAULT now() NOT NULL,
	"addedBy" text
);
--> statement-breakpoint
CREATE TABLE "Workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"ownerId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Workspace_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pageId" uuid,
	"documentId" uuid,
	"chunkIndex" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sourceId" uuid NOT NULL,
	"filename" text NOT NULL,
	"type" "DocumentType" NOT NULL,
	"size" integer NOT NULL,
	"contentText" text NOT NULL,
	"metadata" jsonb,
	"checksum" text NOT NULL,
	"storagePath" text,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"indexedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sourceId" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"contentText" text NOT NULL,
	"contentHtml" text,
	"metadata" jsonb,
	"checksum" text NOT NULL,
	"indexedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"domain" text NOT NULL,
	"name" text,
	"logo" text,
	"type" "SourceType" NOT NULL,
	"scope" "SourceScope" DEFAULT 'WORKSPACE' NOT NULL,
	"pageCount" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"status" "SourceStatus" DEFAULT 'PENDING' NOT NULL,
	"lastScrapedAt" timestamp,
	"lastUpdatedAt" timestamp,
	"errorMessage" text,
	"rescrapeSchedule" "RescrapeSchedule" DEFAULT 'NEVER' NOT NULL,
	"nextScrapeAt" timestamp,
	"lastAutomatedScrapeAt" timestamp,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"metadata" jsonb,
	"quality" integer DEFAULT 50 NOT NULL,
	"createdById" text,
	"promotedToGlobalAt" timestamp,
	"promotedById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Source_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "batch_embedding_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"openai_batch_id" text NOT NULL,
	"status" text DEFAULT 'validating' NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer,
	"error_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "batch_embedding_jobs_openai_batch_id_unique" UNIQUE("openai_batch_id")
);
--> statement-breakpoint
CREATE TABLE "Job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sourceId" uuid NOT NULL,
	"type" "JobType" NOT NULL,
	"status" "JobStatus" DEFAULT 'PENDING' NOT NULL,
	"progress" jsonb,
	"result" jsonb,
	"errorMessage" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuditLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"ipAddress" text,
	"userAgent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"resultsCount" integer,
	"topPageIds" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"sourceIds" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"latencyMs" integer,
	"workspaceId" text,
	"userId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"queriedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SourceUsageStats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sourceId" uuid NOT NULL,
	"workspaceCount" integer DEFAULT 0 NOT NULL,
	"queryCount" integer DEFAULT 0 NOT NULL,
	"lastQueriedAt" timestamp,
	"calculatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SourceUsageStats_sourceId_unique" UNIQUE("sourceId")
);
--> statement-breakpoint
CREATE TABLE "UsageEvent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"eventType" "UsageEventType" NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"planTier" "PlanTier" DEFAULT 'FREE' NOT NULL,
	"searchesPerMonth" integer DEFAULT 50 NOT NULL,
	"maxSources" integer DEFAULT 3 NOT NULL,
	"maxWorkspaces" integer DEFAULT 1 NOT NULL,
	"maxPagesIndexed" integer DEFAULT 500 NOT NULL,
	"apiRateLimit" integer DEFAULT 30 NOT NULL,
	"searchesUsed" integer DEFAULT 0 NOT NULL,
	"sourcesUsed" integer DEFAULT 0 NOT NULL,
	"workspacesUsed" integer DEFAULT 0 NOT NULL,
	"pagesIndexed" integer DEFAULT 0 NOT NULL,
	"stripeCustomerId" text,
	"stripeSubscriptionId" text,
	"stripePriceId" text,
	"billingCycle" timestamp,
	"resetAt" timestamp NOT NULL,
	"status" "SubscriptionStatus" DEFAULT 'ACTIVE' NOT NULL,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	"trialEndsAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Subscription_userId_unique" UNIQUE("userId"),
	CONSTRAINT "Subscription_stripeCustomerId_unique" UNIQUE("stripeCustomerId"),
	CONSTRAINT "Subscription_stripeSubscriptionId_unique" UNIQUE("stripeSubscriptionId")
);
--> statement-breakpoint
CREATE TABLE "embedding_provider_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "EmbeddingProvider" NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer NOT NULL,
	"apiKey" text NOT NULL,
	"apiEndpoint" text,
	"deploymentName" text,
	"useBatchForNew" boolean DEFAULT false NOT NULL,
	"useBatchForRescrape" boolean DEFAULT true NOT NULL,
	"additionalConfig" jsonb,
	"isActive" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_processing_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" "ImageProcessingMethod" DEFAULT 'OCR' NOT NULL,
	"apiKey" text,
	"apiEndpoint" text,
	"ocrLanguage" text DEFAULT 'eng',
	"ocrQuality" integer DEFAULT 2,
	"visionModel" text,
	"visionPrompt" text,
	"maxImageSize" integer DEFAULT 4194304,
	"additionalConfig" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WorkspaceSource" ADD CONSTRAINT "WorkspaceSource_workspaceId_Workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WorkspaceSource" ADD CONSTRAINT "WorkspaceSource_sourceId_Source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_pageId_pages_id_fk" FOREIGN KEY ("pageId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_sourceId_Source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_sourceId_Source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_embedding_jobs" ADD CONSTRAINT "batch_embedding_jobs_source_id_Source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."Source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Job" ADD CONSTRAINT "Job_sourceId_Source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SourceUsageStats" ADD CONSTRAINT "SourceUsageStats_sourceId_Source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE INDEX "Account_userId_idx" ON "Account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ApiKey_key_idx" ON "ApiKey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "Session_userId_idx" ON "Session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Session_token_idx" ON "Session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "User_role_idx" ON "User" USING btree ("role");--> statement-breakpoint
CREATE INDEX "User_email_idx" ON "User" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "Verification_identifier_value_key" ON "Verification" USING btree ("identifier","value");--> statement-breakpoint
CREATE UNIQUE INDEX "WorkspaceSource_workspaceId_sourceId_key" ON "WorkspaceSource" USING btree ("workspaceId","sourceId");--> statement-breakpoint
CREATE INDEX "WorkspaceSource_workspaceId_idx" ON "WorkspaceSource" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "WorkspaceSource_sourceId_idx" ON "WorkspaceSource" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "Workspace_slug_idx" ON "Workspace" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "chunks_pageId_chunkIndex_key" ON "chunks" USING btree ("pageId","chunkIndex");--> statement-breakpoint
CREATE UNIQUE INDEX "chunks_documentId_chunkIndex_key" ON "chunks" USING btree ("documentId","chunkIndex");--> statement-breakpoint
CREATE INDEX "chunks_pageId_idx" ON "chunks" USING btree ("pageId");--> statement-breakpoint
CREATE INDEX "chunks_documentId_idx" ON "chunks" USING btree ("documentId");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_sourceId_checksum_key" ON "documents" USING btree ("sourceId","checksum");--> statement-breakpoint
CREATE INDEX "documents_sourceId_idx" ON "documents" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "documents_type_idx" ON "documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "documents_checksum_idx" ON "documents" USING btree ("checksum");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_sourceId_url_key" ON "pages" USING btree ("sourceId","url");--> statement-breakpoint
CREATE INDEX "pages_sourceId_idx" ON "pages" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "pages_checksum_idx" ON "pages" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "Source_scope_idx" ON "Source" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "Source_domain_idx" ON "Source" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "Source_status_idx" ON "Source" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Source_url_idx" ON "Source" USING btree ("url");--> statement-breakpoint
CREATE INDEX "Source_nextScrapeAt_idx" ON "Source" USING btree ("nextScrapeAt");--> statement-breakpoint
CREATE INDEX "Source_rescrapeSchedule_idx" ON "Source" USING btree ("rescrapeSchedule");--> statement-breakpoint
CREATE INDEX "batch_embedding_jobs_sourceId_idx" ON "batch_embedding_jobs" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "batch_embedding_jobs_status_idx" ON "batch_embedding_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Job_sourceId_idx" ON "Job" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "Job_status_idx" ON "Job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Job_type_idx" ON "Job" USING btree ("type");--> statement-breakpoint
CREATE INDEX "Job_createdAt_idx" ON "Job" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AuditLog_action_idx" ON "AuditLog" USING btree ("action");--> statement-breakpoint
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "query_logs_workspaceId_idx" ON "query_logs" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "query_logs_queriedAt_idx" ON "query_logs" USING btree ("queriedAt");--> statement-breakpoint
CREATE INDEX "query_logs_userId_idx" ON "query_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "query_logs_createdAt_idx" ON "query_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "SourceUsageStats_workspaceCount_idx" ON "SourceUsageStats" USING btree ("workspaceCount");--> statement-breakpoint
CREATE INDEX "SourceUsageStats_queryCount_idx" ON "SourceUsageStats" USING btree ("queryCount");--> statement-breakpoint
CREATE INDEX "SourceUsageStats_sourceId_idx" ON "SourceUsageStats" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "UsageEvent_userId_eventType_timestamp_idx" ON "UsageEvent" USING btree ("userId","eventType","timestamp");--> statement-breakpoint
CREATE INDEX "UsageEvent_timestamp_idx" ON "UsageEvent" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "Subscription_userId_idx" ON "Subscription" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Subscription_planTier_idx" ON "Subscription" USING btree ("planTier");--> statement-breakpoint
CREATE INDEX "Subscription_status_idx" ON "Subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription" USING btree ("stripeCustomerId");--> statement-breakpoint
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription" USING btree ("stripeSubscriptionId");--> statement-breakpoint
CREATE INDEX "embedding_provider_configs_isActive_idx" ON "embedding_provider_configs" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "embedding_provider_configs_provider_idx" ON "embedding_provider_configs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "image_processing_configs_isActive_idx" ON "image_processing_configs" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "image_processing_configs_method_idx" ON "image_processing_configs" USING btree ("method");