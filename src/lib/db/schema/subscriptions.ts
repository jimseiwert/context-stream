// Drizzle Schema - Subscriptions & Billing
// Subscription model

import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { planTierEnum, subscriptionStatusEnum } from "./enums";

// Subscription table
export const subscriptions = pgTable(
  "Subscription",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    planTier: planTierEnum("planTier").default("FREE").notNull(),
    searchesPerMonth: integer("searchesPerMonth").default(50).notNull(),
    maxSources: integer("maxSources").default(3).notNull(),
    maxWorkspaces: integer("maxWorkspaces").default(1).notNull(),
    maxPagesIndexed: integer("maxPagesIndexed").default(500).notNull(),
    apiRateLimit: integer("apiRateLimit").default(30).notNull(),
    searchesUsed: integer("searchesUsed").default(0).notNull(),
    sourcesUsed: integer("sourcesUsed").default(0).notNull(),
    workspacesUsed: integer("workspacesUsed").default(0).notNull(),
    pagesIndexed: integer("pagesIndexed").default(0).notNull(),
    stripeCustomerId: text("stripeCustomerId").unique(),
    stripeSubscriptionId: text("stripeSubscriptionId").unique(),
    stripePriceId: text("stripePriceId"),
    billingCycle: timestamp("billingCycle", { mode: "date" }),
    resetAt: timestamp("resetAt", { mode: "date" }).notNull(),
    status: subscriptionStatusEnum("status").default("ACTIVE").notNull(),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
    trialEndsAt: timestamp("trialEndsAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("Subscription_userId_idx").on(table.userId),
    planTierIdx: index("Subscription_planTier_idx").on(table.planTier),
    statusIdx: index("Subscription_status_idx").on(table.status),
    stripeCustomerIdIdx: index("Subscription_stripeCustomerId_idx").on(
      table.stripeCustomerId
    ),
    stripeSubscriptionIdIdx: index("Subscription_stripeSubscriptionId_idx").on(
      table.stripeSubscriptionId
    ),
  })
);

// Relations
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));
