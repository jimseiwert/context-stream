CREATE TABLE "rag_engine_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"provider" text NOT NULL,
	"connectionConfig" text NOT NULL,
	"sharedCredentialId" uuid,
	"isActive" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "embedding_provider_configs" CASCADE;--> statement-breakpoint
ALTER TABLE "vector_store_configs" DROP CONSTRAINT "vector_store_configs_sharedCredentialId_shared_credentials_id_fk";
--> statement-breakpoint
DROP INDEX "vector_store_configs_provider_idx";--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "vectorStoreConfigId" uuid;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "ragEngineConfigId" uuid;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "storeProvider" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "storeConfig" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "storeCredentialId" uuid;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "embeddingProvider" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "embeddingConfig" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "embeddingCredentialId" uuid;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "useBatchForNew" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "useBatchForRescrape" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rag_engine_configs" ADD CONSTRAINT "rag_engine_configs_sharedCredentialId_shared_credentials_id_fk" FOREIGN KEY ("sharedCredentialId") REFERENCES "public"."shared_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rag_engine_configs_isActive_idx" ON "rag_engine_configs" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "rag_engine_configs_provider_idx" ON "rag_engine_configs" USING btree ("provider");--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_vectorStoreConfigId_vector_store_configs_id_fk" FOREIGN KEY ("vectorStoreConfigId") REFERENCES "public"."vector_store_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_ragEngineConfigId_rag_engine_configs_id_fk" FOREIGN KEY ("ragEngineConfigId") REFERENCES "public"."rag_engine_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD CONSTRAINT "vector_store_configs_storeCredentialId_shared_credentials_id_fk" FOREIGN KEY ("storeCredentialId") REFERENCES "public"."shared_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD CONSTRAINT "vector_store_configs_embeddingCredentialId_shared_credentials_id_fk" FOREIGN KEY ("embeddingCredentialId") REFERENCES "public"."shared_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collections_vectorStoreConfigId_idx" ON "collections" USING btree ("vectorStoreConfigId");--> statement-breakpoint
CREATE INDEX "collections_ragEngineConfigId_idx" ON "collections" USING btree ("ragEngineConfigId");--> statement-breakpoint
CREATE INDEX "vector_store_configs_storeProvider_idx" ON "vector_store_configs" USING btree ("storeProvider");--> statement-breakpoint
ALTER TABLE "vector_store_configs" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "vector_store_configs" DROP COLUMN "connectionConfig";--> statement-breakpoint
ALTER TABLE "vector_store_configs" DROP COLUMN "sharedCredentialId";--> statement-breakpoint
ALTER TABLE "vector_store_configs" DROP COLUMN "handlesEmbedding";--> statement-breakpoint
DROP TYPE "public"."EmbeddingProvider";--> statement-breakpoint
DROP TYPE "public"."VectorStoreProvider";