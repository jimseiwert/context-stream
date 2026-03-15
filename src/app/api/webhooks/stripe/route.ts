// Stripe Webhook Endpoint — POST /api/webhooks/stripe
// Validates the stripe-signature header and dispatches events to handlers.

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
} from "@/lib/stripe/webhooks";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature invalid: ${message}` },
      { status: 400 }
    );
  }

  // Dispatch to appropriate handler — return 200 immediately for all events
  // so Stripe doesn't retry unnecessarily on slow processing.
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event as Stripe.CheckoutSessionCompletedEvent
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event as Stripe.CustomerSubscriptionUpdatedEvent
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event as Stripe.CustomerSubscriptionDeletedEvent
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event as Stripe.InvoicePaymentFailedEvent
        );
        break;
      default:
        // Unhandled event — acknowledge receipt and move on
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] Handler error for ${event.type}:`, err);
    // Still return 200 to prevent Stripe from re-delivering the same event.
    // Log to monitoring so the issue is visible.
  }

  return NextResponse.json({ received: true });
}
