// Stripe Webhook Handlers
// Handles incoming Stripe events and updates the database accordingly

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS } from "@/lib/subscriptions/plans";
import { PlanTier } from "@/lib/db/schema/enums";

// Map Stripe price IDs to plan tiers
function planTierFromPriceId(priceId: string): PlanTier {
  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID;

  if (starterPriceId && priceId === starterPriceId) return "STARTER";
  if (proPriceId && priceId === proPriceId) return "PRO";
  if (teamPriceId && priceId === teamPriceId) return "TEAM";

  return "FREE";
}

// checkout.session.completed
// Fired when a user completes a Stripe Checkout. Links the subscription record.
export async function handleCheckoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent
): Promise<void> {
  const session = event.data.object;

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.warn("[webhook] checkout.session.completed missing customer or subscription id");
    return;
  }

  // Derive userId from client_reference_id set at checkout creation
  const userId = session.client_reference_id;
  if (!userId) {
    console.warn("[webhook] checkout.session.completed missing client_reference_id");
    return;
  }

  // Determine plan tier from the price ID on the line items
  const priceId =
    session.line_items?.data[0]?.price?.id ?? "";
  const tier = planTierFromPriceId(priceId);
  const planFeatures = PLANS[tier].features;

  await db
    .update(subscriptions)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId || null,
      planTier: tier,
      status: "ACTIVE",
      searchesPerMonth: planFeatures.searchesPerMonth,
      maxSources: planFeatures.maxSources,
      maxWorkspaces: planFeatures.maxWorkspaces,
      maxPagesIndexed: planFeatures.maxPagesIndexed,
      apiRateLimit: planFeatures.apiRateLimit,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[webhook] checkout.session.completed — userId=${userId} tier=${tier}`);
}

// customer.subscription.updated
// Handles plan changes (upgrades/downgrades) and cancellation scheduling.
export async function handleSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent
): Promise<void> {
  const sub = event.data.object;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  const priceId = sub.items.data[0]?.price?.id ?? "";
  const tier = planTierFromPriceId(priceId);
  const planFeatures = PLANS[tier].features;

  // Map Stripe status to internal status
  type StripeStatus = Stripe.Subscription["status"];
  const statusMap: Partial<Record<StripeStatus, "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING">> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
  };
  const status = statusMap[sub.status as StripeStatus] ?? "ACTIVE";

  await db
    .update(subscriptions)
    .set({
      planTier: tier,
      status,
      stripePriceId: priceId || null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      searchesPerMonth: planFeatures.searchesPerMonth,
      maxSources: planFeatures.maxSources,
      maxWorkspaces: planFeatures.maxWorkspaces,
      maxPagesIndexed: planFeatures.maxPagesIndexed,
      apiRateLimit: planFeatures.apiRateLimit,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  console.log(`[webhook] customer.subscription.updated — customerId=${customerId} tier=${tier} status=${status}`);
}

// customer.subscription.deleted
// Reverts the user to FREE plan limits and marks status as CANCELED.
export async function handleSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent
): Promise<void> {
  const sub = event.data.object;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  const freePlan = PLANS["FREE"].features;

  await db
    .update(subscriptions)
    .set({
      planTier: "FREE",
      status: "CANCELED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
      searchesPerMonth: freePlan.searchesPerMonth,
      maxSources: freePlan.maxSources,
      maxWorkspaces: freePlan.maxWorkspaces,
      maxPagesIndexed: freePlan.maxPagesIndexed,
      apiRateLimit: freePlan.apiRateLimit,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  console.log(`[webhook] customer.subscription.deleted — customerId=${customerId} reverted to FREE`);
}

// invoice.payment_failed
// Sets status to PAST_DUE so the UI can prompt the user to update payment.
export async function handleInvoicePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent
): Promise<void> {
  const invoice = event.data.object;

  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  await db
    .update(subscriptions)
    .set({
      status: "PAST_DUE",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  console.log(`[webhook] invoice.payment_failed — customerId=${customerId} status=PAST_DUE`);
}
