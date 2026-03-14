// Drizzle Schema - Workspaces & Multi-Tenancy
// Workspace and WorkspaceSource models

import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { sources } from "./sources";

// Workspace table
export const workspaces = pgTable(
  "Workspace",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: uuid("ownerId").references(() => users.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdIdx: index("Workspace_ownerId_idx").on(table.ownerId),
    slugIdx: index("Workspace_slug_idx").on(table.slug),
  })
);

// WorkspaceSource join table (will reference sources from sources.ts)
export const workspaceSources = pgTable(
  "WorkspaceSource",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceId: uuid("sourceId")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    customConfig: jsonb("customConfig"),
    addedAt: timestamp("addedAt", { mode: "date" }).defaultNow().notNull(),
    addedBy: text("addedBy"),
  },
  (table) => ({
    workspaceSourceUnique: uniqueIndex(
      "WorkspaceSource_workspaceId_sourceId_key"
    ).on(table.workspaceId, table.sourceId),
    workspaceIdIdx: index("WorkspaceSource_workspaceId_idx").on(
      table.workspaceId
    ),
    sourceIdIdx: index("WorkspaceSource_sourceId_idx").on(table.sourceId),
  })
);

// Relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  workspaceSources: many(workspaceSources),
}));

export const workspaceSourcesRelations = relations(
  workspaceSources,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceSources.workspaceId],
      references: [workspaces.id],
    }),
    source: one(sources, {
      fields: [workspaceSources.sourceId],
      references: [sources.id],
    }),
  })
);
