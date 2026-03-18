-- Migration: Vector store and embedding config redesign
-- Merges embedding provider config into vector_store_configs, introduces
-- rag_engine_configs as a first-class table, adds FK columns to collections,
-- and removes the now-obsolete embedding_provider_configs table and legacy enums.

-- ---------------------------------------------------------------------------
-- 1. Create rag_engine_configs table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "rag_engine_configs" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name"             text NOT NULL DEFAULT '',
  "provider"         text NOT NULL,
  "connectionConfig" text NOT NULL,
  "sharedCredentialId" uuid,
  "isActive"         boolean NOT NULL DEFAULT false,
  "createdAt"        timestamp DEFAULT now() NOT NULL,
  "updatedAt"        timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "rag_engine_configs_isActive_idx"
  ON "rag_engine_configs" ("isActive");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "rag_engine_configs_provider_idx"
  ON "rag_engine_configs" ("provider");
--> statement-breakpoint

ALTER TABLE "rag_engine_configs"
  ADD CONSTRAINT "rag_engine_configs_sharedCredentialId_shared_credentials_id_fk"
  FOREIGN KEY ("sharedCredentialId")
  REFERENCES "shared_credentials"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. Add new columns to vector_store_configs
-- ---------------------------------------------------------------------------

-- Store connection columns (replace old provider enum + connectionConfig + sharedCredentialId)
ALTER TABLE "vector_store_configs"
  ADD COLUMN IF NOT EXISTS "storeProvider"         text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "storeConfig"           text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "storeCredentialId"     uuid,
  ADD COLUMN IF NOT EXISTS "embeddingProvider"     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "embeddingConfig"       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "embeddingCredentialId" uuid,
  ADD COLUMN IF NOT EXISTS "useBatchForNew"        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "useBatchForRescrape"   boolean NOT NULL DEFAULT true;
--> statement-breakpoint

-- FK constraints for the new credential columns
DO $$ BEGIN
  ALTER TABLE "vector_store_configs"
    ADD CONSTRAINT "vector_store_configs_storeCredentialId_shared_credentials_id_fk"
    FOREIGN KEY ("storeCredentialId")
    REFERENCES "shared_credentials"("id")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "vector_store_configs"
    ADD CONSTRAINT "vector_store_configs_embeddingCredentialId_shared_credentials_id_fk"
    FOREIGN KEY ("embeddingCredentialId")
    REFERENCES "shared_credentials"("id")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- New indexes
CREATE INDEX IF NOT EXISTS "vector_store_configs_storeProvider_idx"
  ON "vector_store_configs" ("storeProvider");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. Data migration — populate new columns from old data
-- ---------------------------------------------------------------------------

-- 3a. Copy storeProvider from old provider enum (lowercase mapping)
UPDATE "vector_store_configs"
SET "storeProvider" = CASE "provider"
  WHEN 'PGVECTOR'                THEN 'pgvector'
  WHEN 'PINECONE'                THEN 'pinecone'
  WHEN 'QDRANT'                  THEN 'qdrant'
  WHEN 'WEAVIATE'                THEN 'weaviate'
  WHEN 'VERTEX_AI_VECTOR_SEARCH' THEN 'vertex_ai_vector_search'
  ELSE lower("provider")
END
WHERE "storeProvider" = '';
--> statement-breakpoint

-- 3b. Copy connectionConfig → storeConfig
UPDATE "vector_store_configs"
SET "storeConfig" = "connectionConfig"
WHERE "storeConfig" = '' AND "connectionConfig" IS NOT NULL AND "connectionConfig" != '';
--> statement-breakpoint

-- 3c. Copy storeCredentialId from old sharedCredentialId
UPDATE "vector_store_configs"
SET "storeCredentialId" = "sharedCredentialId"
WHERE "storeCredentialId" IS NULL AND "sharedCredentialId" IS NOT NULL;
--> statement-breakpoint

-- 3d. Copy active (non-RAG) embedding config into each vector store config
UPDATE "vector_store_configs" vs
SET
  "embeddingProvider" = CASE ep."provider"
    WHEN 'OPENAI'             THEN 'openai'
    WHEN 'AZURE_OPENAI'       THEN 'azure_openai'
    WHEN 'VERTEX_AI'          THEN 'vertex_ai'
    ELSE lower(ep."provider")
  END,
  "embeddingConfig"   = ep."connectionConfig",
  "useBatchForNew"    = ep."useBatchForNew",
  "useBatchForRescrape" = ep."useBatchForRescrape"
FROM "embedding_provider_configs" ep
WHERE ep."isActive" = true
  AND ep."isRagEngine" = false;
--> statement-breakpoint

-- 3e. Migrate active RAG engine providers into rag_engine_configs
INSERT INTO "rag_engine_configs" (
  "id", "name", "provider", "connectionConfig",
  "sharedCredentialId", "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  COALESCE("name", ''),
  CASE "provider"
    WHEN 'VERTEX_AI_RAG_ENGINE' THEN 'vertex_ai_rag_engine'
    ELSE lower("provider")
  END,
  "connectionConfig",
  "sharedCredentialId",
  "isActive",
  "createdAt",
  "updatedAt"
FROM "embedding_provider_configs"
WHERE "isRagEngine" = true
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. Add vectorStoreConfigId and ragEngineConfigId to collections
-- ---------------------------------------------------------------------------
ALTER TABLE "collections"
  ADD COLUMN IF NOT EXISTS "vectorStoreConfigId" uuid,
  ADD COLUMN IF NOT EXISTS "ragEngineConfigId"   uuid;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "collections"
    ADD CONSTRAINT "collections_vectorStoreConfigId_vector_store_configs_id_fk"
    FOREIGN KEY ("vectorStoreConfigId")
    REFERENCES "vector_store_configs"("id")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "collections"
    ADD CONSTRAINT "collections_ragEngineConfigId_rag_engine_configs_id_fk"
    FOREIGN KEY ("ragEngineConfigId")
    REFERENCES "rag_engine_configs"("id")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "collections_vectorStoreConfigId_idx"
  ON "collections" ("vectorStoreConfigId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "collections_ragEngineConfigId_idx"
  ON "collections" ("ragEngineConfigId");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. Assign existing collections to the active vector store (if one exists)
-- ---------------------------------------------------------------------------
UPDATE "collections"
SET "vectorStoreConfigId" = vs."id"
FROM "vector_store_configs" vs
WHERE vs."isActive" = true
  AND "collections"."vectorStoreConfigId" IS NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 6. Drop obsolete columns from vector_store_configs
-- ---------------------------------------------------------------------------
ALTER TABLE "vector_store_configs"
  DROP COLUMN IF EXISTS "provider",
  DROP COLUMN IF EXISTS "connectionConfig",
  DROP COLUMN IF EXISTS "sharedCredentialId",
  DROP COLUMN IF EXISTS "handlesEmbedding";
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 7. Drop embedding_provider_configs table
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "embedding_provider_configs";
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 8. Drop EmbeddingProvider enum type if it exists
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  DROP TYPE IF EXISTS "public"."EmbeddingProvider";
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 9. Drop VectorStoreProvider enum type if it exists
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  DROP TYPE IF EXISTS "public"."VectorStoreProvider";
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
