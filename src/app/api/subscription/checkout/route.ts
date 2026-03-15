// POST /api/subscription/checkout
// Creates a Stripe Checkout session and returns the redirect URL.
// Requires STRIPE_SECRET_KEY and NEXT_PUBLIC_SAAS_MODE=true to be functional.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { handleApiError, ValidationError } from "@/lib/utils/errors";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS } from "@/lib/subscriptions/plans";
import { PlanTier } from "@/lib/db/schema/enums";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    if (!stripe) {
      return NextResponse.json(
        { error: "Billing is not configured on this instance." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { planTier?: string };
    const planTier = (body.planTier ?? "STARTER") as PlanTier;

    const plan = PLANS[planTier];
    if (!plan || !plan.stripePriceId) {
      throw new ValidationError(`No Stripe price ID configured for plan: ${planTier}`);
    }

    // Look up any existing customer ID
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      "http://localhost:3000";

    // Build the checkout session — attach existing Stripe customer if available
    const existingCustomerId = sub?.stripeCustomerId ?? undefined;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      customer: existingCustomerId,
      customer_email: existingCustomerId ? undefined : session.user.email,
      success_url: `${baseUrl}/settings/billing?checkout=success`,
      cancel_url: `${baseUrl}/settings/billing?checkout=cancelled`,
      metadata: {
        userId,
        planTier,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return handleApiError(error);
  }
}
