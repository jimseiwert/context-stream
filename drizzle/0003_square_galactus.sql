CREATE TYPE "public"."CredentialType" AS ENUM('API_KEY', 'SERVICE_ACCOUNT_JSON', 'CONNECTION_STRING', 'AZURE_CREDENTIALS');--> statement-breakpoint
ALTER TYPE "public"."EmbeddingProvider" ADD VALUE 'VERTEX_AI_RAG_ENGINE';--> statement-breakpoint
ALTER TYPE "public"."VectorStoreProvider" ADD VALUE 'VERTEX_AI_VECTOR_SEARCH';--> statement-breakpoint
CREATE TABLE "shared_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "CredentialType" NOT NULL,
	"credentialData" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" ADD COLUMN "connectionConfig" text NOT NULL;--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" ADD COLUMN "sharedCredentialId" uuid;--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" ADD COLUMN "isRagEngine" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "connectionConfig" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "sharedCredentialId" uuid;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD COLUMN "handlesEmbedding" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "shared_credentials_type_idx" ON "shared_credentials" USING btree ("type");--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" ADD CONSTRAINT "embedding_provider_configs_sharedCredentialId_shared_credentials_id_fk" FOREIGN KEY ("sharedCredentialId") REFERENCES "public"."shared_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_store_configs" ADD CONSTRAINT "vector_store_configs_sharedCredentialId_shared_credentials_id_fk" FOREIGN KEY ("sharedCredentialId") REFERENCES "public"."shared_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" DROP COLUMN "apiKey";--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" DROP COLUMN "apiEndpoint";--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" DROP COLUMN "deploymentName";--> statement-breakpoint
ALTER TABLE "embedding_provider_configs" DROP COLUMN "additionalConfig";--> statement-breakpoint
ALTER TABLE "vector_store_configs" DROP COLUMN "connectionEncrypted";--> statement-breakpoint
ALTER TABLE "vector_store_configs" DROP COLUMN "additionalConfig";