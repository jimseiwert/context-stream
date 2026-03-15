// GET /api/subscription
// Returns the current user's subscription with usage counters.

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS } from "@/lib/subscriptions/plans";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (!sub) {
      // Return default FREE tier values when no subscription row exists yet
      const freePlan = PLANS["FREE"];
      return NextResponse.json({
        subscription: {
          planTier: "FREE",
          status: "ACTIVE",
          price: freePlan.price,
          features: freePlan.features,
          usage: {
            searchesUsed: 0,
            sourcesUsed: 0,
            pagesIndexed: 0,
            workspacesUsed: 0,
          },
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          billingCycle: null,
          resetAt: null,
          cancelAtPeriodEnd: false,
          trialEndsAt: null,
        },
      });
    }

    const planConfig = PLANS[sub.planTier];

    return NextResponse.json({
      subscription: {
        id: sub.id,
        planTier: sub.planTier,
        status: sub.status,
        price: planConfig?.price ?? 0,
        features: {
          searchesPerMonth: sub.searchesPerMonth,
          maxSources: sub.maxSources,
          maxWorkspaces: sub.maxWorkspaces,
          maxPagesIndexed: sub.maxPagesIndexed,
          apiRateLimit: sub.apiRateLimit,
        },
        usage: {
          searchesUsed: sub.searchesUsed,
          sourcesUsed: sub.sourcesUsed,
          pagesIndexed: sub.pagesIndexed,
          workspacesUsed: sub.workspacesUsed,
        },
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        billingCycle: sub.billingCycle,
        resetAt: sub.resetAt,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        trialEndsAt: sub.trialEndsAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
