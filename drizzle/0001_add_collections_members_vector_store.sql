-- Migration: Add collections, workspace_members, vector_store_configs
-- and extend jobs with workspaceId, dispatchMode, logs

CREATE TYPE "public"."JobDispatchMode" AS ENUM('INPROCESS', 'WORKER', 'KUBERNETES');--> statement-breakpoint
CREATE TYPE "public"."VectorStoreProvider" AS ENUM('PGVECTOR', 'PINECONE', 'QDRANT', 'WEAVIATE');--> statement-breakpoint

CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" "UserRole" DEFAULT 'USER' NOT NULL,
	"invitedAt" timestamp DEFAULT now() NOT NULL,
	"joinedAt" timestamp,
	CONSTRAINT "workspace_members_workspaceId_userId_key" UNIQUE("workspaceId","userId")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collectionId" uuid NOT NULL,
	"sourceId" uuid NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collection_sources_collectionId_sourceId_key" UNIQUE("collectionId","sourceId")
);
--> statement-breakpoint
CREATE TABLE "vector_store_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "VectorStoreProvider" NOT NULL,
	"connectionEncrypted" text NOT NULL,
	"additionalConfig" jsonb,
	"isActive" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Job" ADD COLUMN "workspaceId" uuid;--> statement-breakpoint
ALTER TABLE "Job" ADD COLUMN "dispatchMode" "JobDispatchMode" DEFAULT 'INPROCESS' NOT NULL;--> statement-breakpoint
ALTER TABLE "Job" ADD COLUMN "logs" text;--> statement-breakpoint

-- Foreign keys
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_Workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_workspaceId_Workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_sources" ADD CONSTRAINT "collection_sources_collectionId_collections_id_fk" FOREIGN KEY ("collectionId") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_sources" ADD CONSTRAINT "collection_sources_sourceId_Source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Job" ADD CONSTRAINT "Job_workspaceId_Workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Indexes
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "collections_workspaceId_idx" ON "collections" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "collection_sources_collectionId_idx" ON "collection_sources" USING btree ("collectionId");--> statement-breakpoint
CREATE INDEX "collection_sources_sourceId_idx" ON "collection_sources" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "vector_store_configs_isActive_idx" ON "vector_store_configs" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "vector_store_configs_provider_idx" ON "vector_store_configs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "Job_workspaceId_idx" ON "Job" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "Job_dispatchMode_idx" ON "Job" USING btree ("dispatchMode");
