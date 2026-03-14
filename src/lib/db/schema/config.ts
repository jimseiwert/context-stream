// Drizzle Schema - System Configuration
// EmbeddingProviderConfig and ImageProcessingConfig models

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { embeddingProviderEnum, imageProcessingMethodEnum } from "./enums";

// EmbeddingProviderConfig table
export const embeddingProviderConfigs = pgTable(
  "embedding_provider_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: embeddingProviderEnum("provider").notNull(),
    model: text("model").notNull(),
    dimensions: integer("dimensions").notNull(),
    apiKey: text("apiKey").notNull(),
    apiEndpoint: text("apiEndpoint"),
    deploymentName: text("deploymentName"),
    useBatchForNew: boolean("useBatchForNew").default(false).notNull(),
    useBatchForRescrape: boolean("useBatchForRescrape").default(true).notNull(),
    additionalConfig: jsonb("additionalConfig"),
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
