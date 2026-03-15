// Drizzle Schema - System Configuration
// EmbeddingProviderConfig, VectorStoreConfig, SharedCredentials, ImageProcessingConfig

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
import { pgEnum } from "drizzle-orm/pg-core";
import {
  embeddingProviderEnum,
  imageProcessingMethodEnum,
  credentialTypeEnum,
} from "./enums";

export const vectorStoreProviderEnum = pgEnum("VectorStoreProvider", [
  "PGVECTOR",
  "PINECONE",
  "QDRANT",
  "WEAVIATE",
  "VERTEX_AI_VECTOR_SEARCH",
]);

// ---------------------------------------------------------------------------
// Shared Credentials — reusable credential vault referenced by embedding
// and vector store configs to avoid duplicating secrets.
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
// Embedding Provider Config
//
// connectionConfig stores an AES-256-GCM encrypted JSON string whose shape
// depends on the provider:
//
//   OPENAI              → { apiKey: string }
//   AZURE_OPENAI        → { apiKey: string, endpoint: string, deploymentName: string }
//   VERTEX_AI           → { projectId: string, location: string,
//                           accessToken?: string,
//                           serviceAccountJson?: object }
//   VERTEX_AI_RAG_ENGINE→ { projectId: string, location: string,
//                           ragCorpusName: string,
//                           serviceAccountJson?: object }
//
// If sharedCredentialId is set it takes precedence over any inline credentials
// in connectionConfig (the connection config still holds non-secret fields
// such as projectId, endpoint, deploymentName).
//
// isRagEngine — when true the embedding pipeline is skipped; the provider
// handles retrieval + embedding internally (e.g. Vertex AI RAG Engine).
// ---------------------------------------------------------------------------
export const embeddingProviderConfigs = pgTable(
  "embedding_provider_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: embeddingProviderEnum("provider").notNull(),
    name: text("name").notNull().default(""),
    model: text("model").notNull(),
    dimensions: integer("dimensions").notNull(),
    /** AES-256-GCM encrypted JSON — provider-specific connection fields */
    connectionConfig: text("connectionConfig").notNull(),
    /** Optional reference to a shared credential (overrides inline credential) */
    sharedCredentialId: uuid("sharedCredentialId"),
    /** When true no separate embedding step is needed — the provider handles it */
    isRagEngine: boolean("isRagEngine").default(false).notNull(),
    useBatchForNew: boolean("useBatchForNew").default(false).notNull(),
    useBatchForRescrape: boolean("useBatchForRescrape").default(true).notNull(),
    isActive: boolean("isActive").default(false).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    isActiveIdx: index("embedding_provider_configs_isActive_idx").on(
      table.isActive
    ),
    providerIdx: index("embedding_provider_configs_provider_idx").on(
      table.provider
    ),
    sharedCredentialFk: foreignKey({
      columns: [table.sharedCredentialId],
      foreignColumns: [sharedCredentials.id],
    }).onDelete("set null"),
  })
);

// ---------------------------------------------------------------------------
// Vector Store Config
//
// connectionConfig stores an AES-256-GCM encrypted JSON string whose shape
// depends on the provider:
//
//   PGVECTOR                → { connectionString: string }
//   PINECONE                → { apiKey: string, indexName: string, environment?: string }
//   QDRANT                  → { url: string, collectionName: string, apiKey?: string }
//   WEAVIATE                → { url: string, className: string, apiKey?: string }
//   VERTEX_AI_VECTOR_SEARCH → { projectId: string, location: string,
//                               indexEndpointId: string, deployedIndexId: string,
//                               serviceAccountJson?: object }
//
// handlesEmbedding — when true the vector store generates its own embeddings
// (e.g. Weaviate with a vectorizer module, Pinecone with inference). In that
// case the separate embedding provider config is still consulted for dimension
// metadata but generateEmbeddings() is not called.
// ---------------------------------------------------------------------------
export const vectorStoreConfigs = pgTable(
  "vector_store_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: vectorStoreProviderEnum("provider").notNull(),
    name: text("name").notNull().default(""),
    /** AES-256-GCM encrypted JSON — provider-specific connection fields */
    connectionConfig: text("connectionConfig").notNull(),
    /** Optional reference to a shared credential (overrides inline credential) */
    sharedCredentialId: uuid("sharedCredentialId"),
    /** When true the vector store handles its own embeddings */
    handlesEmbedding: boolean("handlesEmbedding").default(false).notNull(),
    isActive: boolean("isActive").default(false).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    isActiveIdx: index("vector_store_configs_isActive_idx").on(table.isActive),
    providerIdx: index("vector_store_configs_provider_idx").on(table.provider),
    sharedCredentialFk: foreignKey({
      columns: [table.sharedCredentialId],
      foreignColumns: [sharedCredentials.id],
    }).onDelete("set null"),
  })
);

// ImageProcessingConfig table
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
    isActiveIdx: index("image_processing_configs_isActive_idx").on(
      table.isActive
    ),
    methodIdx: index("image_processing_configs_method_idx").on(table.method),
  })
);
