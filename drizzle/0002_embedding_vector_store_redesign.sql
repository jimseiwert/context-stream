-- Migration: Embedding provider and vector store config redesign
-- Adds shared_credentials table, replaces scattered fields with connectionConfig,
-- adds VERTEX_AI_RAG_ENGINE provider, adds isRagEngine/handlesEmbedding flags.

--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "CredentialType" AS ENUM('API_KEY', 'SERVICE_ACCOUNT_JSON', 'CONNECTION_STRING', 'AZURE_CREDENTIALS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add VERTEX_AI_RAG_ENGINE to EmbeddingProvider enum
DO $$ BEGIN
 ALTER TYPE "EmbeddingProvider" ADD VALUE 'VERTEX_AI_RAG_ENGINE';
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN invalid_parameter_value THEN null;
END $$;
--> statement-breakpoint

-- Add VERTEX_AI_VECTOR_SEARCH to VectorStoreProvider enum
DO $$ BEGIN
 ALTER TYPE "VectorStoreProvider" ADD VALUE 'VERTEX_AI_VECTOR_SEARCH';
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN invalid_parameter_value THEN null;
END $$;
--> statement-breakpoint

-- Create shared_credentials table
CREATE TABLE IF NOT EXISTS "shared_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "type" "CredentialType" NOT NULL,
  "credentialData" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_credentials_type_idx" ON "shared_credentials" ("type");
--> statement-breakpoint

-- Migrate embedding_provider_configs:
-- 1. Add new columns
ALTER TABLE "embedding_provider_configs"
  ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "connectionConfig" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "sharedCredentialId" uuid REFERENCES "shared_credentials"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "isRagEngine" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- 2. Migrate existing data: pack apiKey (already encrypted) into connectionConfig JSON
--    For OPENAI: { apiKey: ... }
--    For AZURE_OPENAI: { apiKey: ..., endpoint: ..., deploymentName: ... }
--    For VERTEX_AI: { apiKey (accessToken): ..., projectId: ..., location: ... }
UPDATE "embedding_provider_configs"
SET "connectionConfig" = CASE
  WHEN provider = 'AZURE_OPENAI' THEN
    '{"apiKey":"' || replace(coalesce("apiKey", ''), '"', '\"') || '"' ||
    CASE WHEN "apiEndpoint" IS NOT NULL THEN ',"endpoint":"' || replace("apiEndpoint", '"', '\"') || '"' ELSE '' END ||
    CASE WHEN "deploymentName" IS NOT NULL THEN ',"deploymentName":"' || replace("deploymentName", '"', '\"') || '"' ELSE '' END ||
    '}'
  WHEN provider = 'VERTEX_AI' THEN
    '{"accessToken":"' || replace(coalesce("apiKey", ''), '"', '\"') || '"' ||
    CASE WHEN "additionalConfig"->>'projectId' IS NOT NULL THEN ',"projectId":"' || replace("additionalConfig"->>'projectId', '"', '\"') || '"' ELSE '' END ||
    CASE WHEN "additionalConfig"->>'location' IS NOT NULL THEN ',"location":"' || replace("additionalConfig"->>'location', '"', '\"') || '"' ELSE '' END ||
    '}'
  ELSE
    '{"apiKey":"' || replace(coalesce("apiKey", ''), '"', '\"') || '"}'
END
WHERE "connectionConfig" = '';
--> statement-breakpoint

-- 3. Drop old columns
ALTER TABLE "embedding_provider_configs"
  DROP COLUMN IF EXISTS "apiKey",
  DROP COLUMN IF EXISTS "apiEndpoint",
  DROP COLUMN IF EXISTS "deploymentName",
  DROP COLUMN IF EXISTS "additionalConfig";
--> statement-breakpoint

-- Migrate vector_store_configs:
-- 1. Add new columns
ALTER TABLE "vector_store_configs"
  ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "connectionConfig" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "sharedCredentialId" uuid REFERENCES "shared_credentials"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "handlesEmbedding" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- 2. Migrate existing data: move connectionEncrypted into connectionConfig JSON
UPDATE "vector_store_configs"
SET "connectionConfig" = '{"connectionString":"' || replace(coalesce("connectionEncrypted", ''), '"', '\"') || '"}'
WHERE "connectionConfig" = '';
--> statement-breakpoint

-- 3. Drop old columns
ALTER TABLE "vector_store_configs"
  DROP COLUMN IF EXISTS "connectionEncrypted",
  DROP COLUMN IF EXISTS "additionalConfig";
--> statement-breakpoint

-- Add index on sharedCredentialId for embedding configs
CREATE INDEX IF NOT EXISTS "embedding_provider_configs_shared_credential_idx" ON "embedding_provider_configs" ("sharedCredentialId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vector_store_configs_shared_credential_idx" ON "vector_store_configs" ("sharedCredentialId");
