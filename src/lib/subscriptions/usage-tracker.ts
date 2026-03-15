// Usage Tracker
// Tracks and queries usage for quota enforcement

import { db } from "@/lib/db";
import { subscriptions, usageEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UsageEventType } from "@/lib/db/schema/enums";
import { PLANS } from "./plans";

// Insert a usage event row for audit/analytics purposes
export async function trackUsage(
  userId: string,
  eventType: UsageEventType,
  count: number = 1
): Promise<void> {
  try {
    await db.insert(usageEvents).values({
      userId,
      eventType,
      count,
      timestamp: new Date(),
    });
  } catch (err) {
    // Non-fatal: log but never block the primary operation
    console.error("[usage-tracker] Failed to insert usage event:", err);
  }
}

// Return current subscription usage counters for a user
export async function getCurrentUsage(userId: string): Promise<{
  searchesUsed: number;
  sourcesUsed: number;
  pagesIndexed: number;
  workspacesUsed: number;
  resetAt: Date;
}> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!sub) {
    return {
      searchesUsed: 0,
      sourcesUsed: 0,
      pagesIndexed: 0,
      workspacesUsed: 0,
      resetAt: new Date(),
    };
  }

  return {
    searchesUsed: sub.searchesUsed,
    sourcesUsed: sub.sourcesUsed,
    pagesIndexed: sub.pagesIndexed,
    workspacesUsed: sub.workspacesUsed,
    resetAt: sub.resetAt,
  };
}

// Check whether a user is within their quota for a given resource.
// Returns allowed=false with details when the limit has been reached.
export async function checkQuota(
  userId: string,
  resource: "searches" | "pages" | "sources" | "workspaces"
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  percentUsed: number;
}> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!sub) {
    // No subscription row — treat as FREE plan defaults
    const freePlan = PLANS["FREE"].features;
    return {
      allowed: true,
      used: 0,
      limit: freePlan.searchesPerMonth,
      percentUsed: 0,
    };
  }

  let used: number;
  let limit: number;

  switch (resource) {
    case "searches":
      used = sub.searchesUsed;
      limit = sub.searchesPerMonth;
      break;
    case "pages":
      used = sub.pagesIndexed;
      limit = sub.maxPagesIndexed;
      break;
    case "sources":
      used = sub.sourcesUsed;
      limit = sub.maxSources;
      break;
    case "workspaces":
      used = sub.workspacesUsed;
      limit = sub.maxWorkspaces;
      break;
  }

  // -1 means unlimited (ENTERPRISE / SELF_HOSTED)
  if (limit === -1) {
    return { allowed: true, used, limit, percentUsed: 0 };
  }

  const percentUsed = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const allowed = used < limit;

  return { allowed, used, limit, percentUsed };
}
