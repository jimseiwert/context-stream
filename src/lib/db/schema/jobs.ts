// Drizzle Schema - Background Jobs
// Job and BatchEmbeddingJob models

import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { jobStatusEnum, jobTypeEnum } from "./enums";
import { sources } from "./sources";

// Job table
export const jobs = pgTable(
  "Job",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("sourceId")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    type: jobTypeEnum("type").notNull(),
    status: jobStatusEnum("status").default("PENDING").notNull(),
    progress: jsonb("progress"),
    result: jsonb("result"),
    errorMessage: text("errorMessage"),
    startedAt: timestamp("startedAt", { mode: "date" }),
    completedAt: timestamp("completedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdIdx: index("Job_sourceId_idx").on(table.sourceId),
    statusIdx: index("Job_status_idx").on(table.status),
    typeIdx: index("Job_type_idx").on(table.type),
    createdAtIdx: index("Job_createdAt_idx").on(table.createdAt),
  })
);

// BatchEmbeddingJob table
export const batchEmbeddingJobs = pgTable(
  "batch_embedding_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    openaiBatchId: text("openai_batch_id").notNull().unique(),
    status: text("status").default("validating").notNull(),
    requestCount: integer("request_count").default(0).notNull(),
    successCount: integer("success_count"),
    errorCount: integer("error_count"),
    createdAt: timestamp("created_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (table) => ({
    sourceIdIdx: index("batch_embedding_jobs_sourceId_idx").on(table.sourceId),
    statusIdx: index("batch_embedding_jobs_status_idx").on(table.status),
  })
);

// Relations
export const jobsRelations = relations(jobs, ({ one }) => ({
  source: one(sources, {
    fields: [jobs.sourceId],
    references: [sources.id],
  }),
}));

export const batchEmbeddingJobsRelations = relations(
  batchEmbeddingJobs,
  ({ one }) => ({
    source: one(sources, {
      fields: [batchEmbeddingJobs.sourceId],
      references: [sources.id],
    }),
  })
);
