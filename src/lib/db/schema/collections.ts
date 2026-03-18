// Drizzle Schema - Collections
// Collections and collection-source membership

import { relations } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sources } from "./sources";
import { workspaces } from "./workspaces";
import { vectorStoreConfigs, ragEngineConfigs } from "./config";

// Collection table
export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** Optional reference to the vector store config used for this collection */
    vectorStoreConfigId: uuid("vectorStoreConfigId"),
    /** Optional reference to a full-pipeline RAG engine config for this collection */
    ragEngineConfigId: uuid("ragEngineConfigId"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("collections_workspaceId_idx").on(table.workspaceId),
    vectorStoreConfigIdIdx: index("collections_vectorStoreConfigId_idx").on(
      table.vectorStoreConfigId
    ),
    ragEngineConfigIdIdx: index("collections_ragEngineConfigId_idx").on(
      table.ragEngineConfigId
    ),
    vectorStoreConfigFk: foreignKey({
      columns: [table.vectorStoreConfigId],
      foreignColumns: [vectorStoreConfigs.id],
    }).onDelete("set null"),
    ragEngineConfigFk: foreignKey({
      columns: [table.ragEngineConfigId],
      foreignColumns: [ragEngineConfigs.id],
    }).onDelete("set null"),
  })
);

// CollectionSource join table
export const collectionSources = pgTable(
  "collection_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collectionId")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    sourceId: uuid("sourceId")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    addedAt: timestamp("addedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    collectionSourceUnique: uniqueIndex("collection_sources_collectionId_sourceId_key").on(
      table.collectionId,
      table.sourceId
    ),
    collectionIdIdx: index("collection_sources_collectionId_idx").on(table.collectionId),
    sourceIdIdx: index("collection_sources_sourceId_idx").on(table.sourceId),
  })
);

// Relations
export const collectionsRelations = relations(collections, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [collections.workspaceId],
    references: [workspaces.id],
  }),
  vectorStoreConfig: one(vectorStoreConfigs, {
    fields: [collections.vectorStoreConfigId],
    references: [vectorStoreConfigs.id],
  }),
  ragEngineConfig: one(ragEngineConfigs, {
    fields: [collections.ragEngineConfigId],
    references: [ragEngineConfigs.id],
  }),
  collectionSources: many(collectionSources),
}));

export const collectionSourcesRelations = relations(collectionSources, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionSources.collectionId],
    references: [collections.id],
  }),
  source: one(sources, {
    fields: [collectionSources.sourceId],
    references: [sources.id],
  }),
}));
