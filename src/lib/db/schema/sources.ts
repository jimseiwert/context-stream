// Drizzle Schema - Sources & Documentation
// Source, Page, Chunk, Document models

import { relations, sql } from "drizzle-orm";
import {
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  documentTypeEnum,
  rescrapeScheduleEnum,
  sourceScopeEnum,
  sourceStatusEnum,
  sourceTypeEnum,
} from "./enums";
import { ragEngineConfigs, vectorStoreConfigs } from "./config";

// Custom pgvector type for embeddings
const vector = customType<{
  data: number[];
  config: { dimension: number };
  driverData: string;
}>({
  dataType(config) {
    return `vector(${config?.dimension ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Source table
export const sources = pgTable(
  "Source",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull().unique(),
    domain: text("domain").notNull(),
    name: text("name"),
    logo: text("logo"),
    type: sourceTypeEnum("type").notNull(),
    scope: sourceScopeEnum("scope").default("WORKSPACE").notNull(),
    pageCount: integer("pageCount").default(0).notNull(),
    config: jsonb("config"),
    status: sourceStatusEnum("status").default("PENDING").notNull(),
    lastScrapedAt: timestamp("lastScrapedAt", { mode: "date" }),
    lastUpdatedAt: timestamp("lastUpdatedAt", { mode: "date" }),
    errorMessage: text("errorMessage"),
    rescrapeSchedule: rescrapeScheduleEnum("rescrapeSchedule")
      .default("NEVER")
      .notNull(),
    nextScrapeAt: timestamp("nextScrapeAt", { mode: "date" }),
    lastAutomatedScrapeAt: timestamp("lastAutomatedScrapeAt", { mode: "date" }),
    tags: text("tags").array().default(sql`ARRAY[]::text[]`).notNull(),
    metadata: jsonb("metadata"),
    quality: integer("quality").default(50).notNull(),
    createdById: text("createdById"),
    promotedToGlobalAt: timestamp("promotedToGlobalAt", { mode: "date" }),
    promotedById: text("promotedById"),
    /** Optional: pin this source to a specific RAG engine instead of the global active one */
    ragEngineConfigId: uuid("ragEngineConfigId"),
    /** Optional: pin this source to a specific vector store instead of the global active one */
    vectorStoreConfigId: uuid("vectorStoreConfigId"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    scopeIdx: index("Source_scope_idx").on(table.scope),
    domainIdx: index("Source_domain_idx").on(table.domain),
    statusIdx: index("Source_status_idx").on(table.status),
    urlIdx: index("Source_url_idx").on(table.url),
    nextScrapeAtIdx: index("Source_nextScrapeAt_idx").on(table.nextScrapeAt),
    rescrapeScheduleIdx: index("Source_rescrapeSchedule_idx").on(
      table.rescrapeSchedule
    ),
    ragEngineConfigFk: foreignKey({
      columns: [table.ragEngineConfigId],
      foreignColumns: [ragEngineConfigs.id],
    }).onDelete("set null"),
    vectorStoreConfigFk: foreignKey({
      columns: [table.vectorStoreConfigId],
      foreignColumns: [vectorStoreConfigs.id],
    }).onDelete("set null"),
  })
);

// Page table
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("sourceId")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    contentText: text("contentText").notNull(),
    contentHtml: text("contentHtml"),
    metadata: jsonb("metadata"),
    checksum: text("checksum").notNull(),
    /** RAG file resource name returned by Vertex AI — used for cleanup on delete */
    ragFileId: text("ragFileId"),
    indexedAt: timestamp("indexedAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdUrlUnique: uniqueIndex("pages_sourceId_url_key").on(
      table.sourceId,
      table.url
    ),
    sourceIdIdx: index("pages_sourceId_idx").on(table.sourceId),
    checksumIdx: index("pages_checksum_idx").on(table.checksum),
  })
);

// Document table
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("sourceId")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    type: documentTypeEnum("type").notNull(),
    size: integer("size").notNull(),
    contentText: text("contentText").notNull(),
    metadata: jsonb("metadata"),
    checksum: text("checksum").notNull(),
    storagePath: text("storagePath"),
    /** RAG file resource name returned by Vertex AI — used for cleanup on delete */
    ragFileId: text("ragFileId"),
    uploadedAt: timestamp("uploadedAt", { mode: "date" })
      .defaultNow()
      .notNull(),
    indexedAt: timestamp("indexedAt", { mode: "date" }),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdChecksumUnique: uniqueIndex("documents_sourceId_checksum_key").on(
      table.sourceId,
      table.checksum
    ),
    sourceIdIdx: index("documents_sourceId_idx").on(table.sourceId),
    typeIdx: index("documents_type_idx").on(table.type),
    checksumIdx: index("documents_checksum_idx").on(table.checksum),
  })
);

// Chunk table with embeddings
export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("pageId").references(() => pages.id, { onDelete: "cascade" }),
    documentId: uuid("documentId").references(() => documents.id, {
      onDelete: "cascade",
    }),
    chunkIndex: integer("chunkIndex").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimension: 1536 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    pageIdChunkIndexUnique: uniqueIndex("chunks_pageId_chunkIndex_key").on(
      table.pageId,
      table.chunkIndex
    ),
    documentIdChunkIndexUnique: uniqueIndex(
      "chunks_documentId_chunkIndex_key"
    ).on(table.documentId, table.chunkIndex),
    pageIdIdx: index("chunks_pageId_idx").on(table.pageId),
    documentIdIdx: index("chunks_documentId_idx").on(table.documentId),
  })
);

// Relations (Note: workspaceSources relation is defined in workspaces.ts to avoid circular dependency)
export const sourcesRelations = relations(sources, ({ many }) => ({
  pages: many(pages),
  documents: many(documents),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  source: one(sources, {
    fields: [pages.sourceId],
    references: [sources.id],
  }),
  chunks: many(chunks),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  source: one(sources, {
    fields: [documents.sourceId],
    references: [sources.id],
  }),
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  page: one(pages, {
    fields: [chunks.pageId],
    references: [pages.id],
  }),
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
}));
