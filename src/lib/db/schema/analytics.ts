// Drizzle Schema - Search & Analytics
// QueryLog, SourceUsageStats, AuditLog, UsageEvent models

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { usageEventTypeEnum } from "./enums";
import { sources } from "./sources";

// QueryLog table
export const queryLogs = pgTable(
  "query_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    query: text("query").notNull(),
    resultsCount: integer("resultsCount"),
    topPageIds: text("topPageIds").array().default(sql`ARRAY[]::text[]`).notNull(),
    sourceIds: text("sourceIds").array().default(sql`ARRAY[]::text[]`).notNull(),
    latencyMs: integer("latencyMs"),
    workspaceId: text("workspaceId"),
    userId: uuid("userId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    queriedAt: timestamp("queriedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("query_logs_workspaceId_idx").on(table.workspaceId),
    queriedAtIdx: index("query_logs_queriedAt_idx").on(table.queriedAt),
    userIdIdx: index("query_logs_userId_idx").on(table.userId),
    createdAtIdx: index("query_logs_createdAt_idx").on(table.createdAt),
  })
);

// SourceUsageStats table
export const sourceUsageStats = pgTable(
  "SourceUsageStats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("sourceId")
      .notNull()
      .unique()
      .references(() => sources.id, { onDelete: "cascade" }),
    workspaceCount: integer("workspaceCount").default(0).notNull(),
    queryCount: integer("queryCount").default(0).notNull(),
    lastQueriedAt: timestamp("lastQueriedAt", { mode: "date" }),
    calculatedAt: timestamp("calculatedAt", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceCountIdx: index("SourceUsageStats_workspaceCount_idx").on(
      table.workspaceCount
    ),
    queryCountIdx: index("SourceUsageStats_queryCount_idx").on(
      table.queryCount
    ),
    sourceIdIdx: index("SourceUsageStats_sourceId_idx").on(table.sourceId),
  })
);

// AuditLog table
export const auditLogs = pgTable(
  "AuditLog",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId").notNull(),
    action: text("action").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("AuditLog_userId_idx").on(table.userId),
    actionIdx: index("AuditLog_action_idx").on(table.action),
    entityTypeEntityIdIdx: index("AuditLog_entityType_entityId_idx").on(
      table.entityType,
      table.entityId
    ),
    timestampIdx: index("AuditLog_timestamp_idx").on(table.timestamp),
  })
);

// UsageEvent table
export const usageEvents = pgTable(
  "UsageEvent",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId").notNull(),
    eventType: usageEventTypeEnum("eventType").notNull(),
    count: integer("count").default(1).notNull(),
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdEventTypeTimestampIdx: index(
      "UsageEvent_userId_eventType_timestamp_idx"
    ).on(table.userId, table.eventType, table.timestamp),
    timestampIdx: index("UsageEvent_timestamp_idx").on(table.timestamp),
  })
);

// Relations
export const queryLogsRelations = relations(queryLogs, ({ one }) => ({
  user: one(users, {
    fields: [queryLogs.userId],
    references: [users.id],
  }),
}));

export const sourceUsageStatsRelations = relations(
  sourceUsageStats,
  ({ one }) => ({
    source: one(sources, {
      fields: [sourceUsageStats.sourceId],
      references: [sources.id],
    }),
  })
);
