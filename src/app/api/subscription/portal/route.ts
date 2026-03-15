// POST /api/subscription/portal
// Creates a Stripe Customer Portal session and returns the redirect URL.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(_request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    if (!stripe) {
      return NextResponse.json(
        { error: "Billing is not configured on this instance." },
        { status: 503 }
      );
    }

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found. Please subscribe first." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${baseUrl}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return handleApiError(error);
  }
}
