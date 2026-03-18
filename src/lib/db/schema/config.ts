// Drizzle Schema - System Configuration
// VectorStoreConfig (with embedded embedding config), RagEngineConfig, SharedCredentials, ImageProcessingConfig

import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  imageProcessingMethodEnum,
  credentialTypeEnum,
} from "./enums";

// ---------------------------------------------------------------------------
// Shared Credentials — reusable credential vault referenced by vector store
// and RAG engine configs to avoid duplicating secrets.
//
// credentialData stores an AES-256-GCM encrypted JSON string whose shape
// depends on the credential type:
//
//   API_KEY              → { key: string }
//   SERVICE_ACCOUNT_JSON → { json: object }   (full GCP service account JSON)
//   CONNECTION_STRING    → { connectionString: string }
//   AZURE_CREDENTIALS    → { tenantId, clientId, clientSecret, subscriptionId? }
// ---------------------------------------------------------------------------
export const sharedCredentials = pgTable(
  "shared_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: credentialTypeEnum("type").notNull(),
    /** AES-256-GCM encrypted JSON string */
    credentialData: text("credentialData").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("shared_credentials_type_idx").on(table.type),
  })
);

// ---------------------------------------------------------------------------
// Vector Store Config — owns its embedding configuration
//
// storeProvider and embeddingProvider are plain text (not enum) so adding new
// providers requires no DB migration.
//
// storeConfig: AES-256-GCM encrypted JSON with provider-specific connection
// fields, e.g.:
//   pgvector                → { connectionString: string }
//   pinecone                → { apiKey: string, indexName: string, environment?: string }
//   qdrant                  → { url: string, collectionName: string, apiKey?: string }
//   weaviate                → { url: string, className: string, apiKey?: string }
//   vertex_ai_vector_search → { projectId, location, indexEndpointId, deployedIndexId }
//
// embeddingConfig: AES-256-GCM encrypted JSON with embedding provider fields:
//   openai       → { apiKey: string }
//   azure_openai → { apiKey: string, endpoint: string, deploymentName: string }
//   vertex_ai    → { projectId: string, location: string, accessToken?: string,
//                    serviceAccountJson?: object }
//
// If storeCredentialId / embeddingCredentialId is set it takes precedence over
// any inline credentials in the respective config JSON.
// ---------------------------------------------------------------------------
export const vectorStoreConfigs = pgTable(
  "vector_store_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().default(""),
    // Store connection
    storeProvider: text("storeProvider").notNull().default(""),
    /** AES-256-GCM encrypted JSON — provider-specific store connection fields */
    storeConfig: text("storeConfig").notNull().default(""),
    storeCredentialId: uuid("storeCredentialId"),
    // Embedding config (owned by this store)
    embeddingProvider: text("embeddingProvider").notNull().default(""),
    /** AES-256-GCM encrypted JSON — embedding provider fields */
    embeddingConfig: text("embeddingConfig").notNull().default(""),
    embeddingCredentialId: uuid("embeddingCredentialId"),
    // Batch processing
    useBatchForNew: boolean("useBatchForNew").default(false).notNull(),
    useBatchForRescrape: boolean("useBatchForRescrape").default(true).notNull(),
    isActive: boolean("isActive").default(false).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    isActiveIdx: index("vector_store_configs_isActive_idx").on(table.isActive),
    storeProviderIdx: index("vector_store_configs_storeProvider_idx").on(table.storeProvider),
    storeCredentialFk: foreignKey({
      columns: [table.storeCredentialId],
      foreignColumns: [sharedCredentials.id],
    }).onDelete("set null"),
    embeddingCredentialFk: foreignKey({
      columns: [table.embeddingCredentialId],
      foreignColumns: [sharedCredentials.id],
    }).onDelete("set null"),
  })
);

// ---------------------------------------------------------------------------
// RAG Engine Config — first-class table for full-pipeline RAG providers
//
// These providers handle retrieval + embedding internally (e.g. Vertex AI RAG
// Engine), so no separate vector store or embedding step is needed.
//
// provider is plain text for extensibility, e.g. 'vertex_ai_rag_engine'.
//
// connectionConfig: AES-256-GCM encrypted JSON, shape depends on provider:
//   vertex_ai_rag_engine → { projectId, location, ragCorpusName,
//                            serviceAccountJson?: object }
// ---------------------------------------------------------------------------
export const ragEngineConfigs = pgTable(
  "rag_engine_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().default(""),
    /** Plain-text provider identifier, e.g. 'vertex_ai_rag_engine' */
    provider: text("provider").notNull(),
    /** AES-256-GCM encrypted JSON — provider-specific connection fields */
    connectionConfig: text("connectionConfig").notNull(),
    sharedCredentialId: uuid("sharedCredentialId"),
    isActive: boolean("isActive").default(false).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    isActiveIdx: index("rag_engine_configs_isActive_idx").on(table.isActive),
    providerIdx: index("rag_engine_configs_provider_idx").on(table.provider),
    sharedCredentialFk: foreignKey({
      columns: [table.sharedCredentialId],
      foreignColumns: [sharedCredentials.id],
    }).onDelete("set null"),
  })
);

// ---------------------------------------------------------------------------
// Image Processing Config
// ---------------------------------------------------------------------------
export const imageProcessingConfigs = pgTable(
  "image_processing_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    method: imageProcessingMethodEnum("method").default("OCR").notNull(),
    apiKey: text("apiKey"),
    apiEndpoint: text("apiEndpoint"),
    ocrLanguage: text("ocrLanguage").default("eng"),
    ocrQuality: integer("ocrQuality").default(2),
    visionModel: text("visionModel"),
    visionPrompt: text("visionPrompt"),
    maxImageSize: integer("maxImageSize").default(4194304),
    additionalConfig: jsonb("additionalConfig"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    isActiveIdx: index("image_processing_configs_isActive_idx").on(table.isActive),
    methodIdx: index("image_processing_configs_method_idx").on(table.method),
  })
);
