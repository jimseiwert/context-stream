// Stripe Client
// Singleton Stripe instance gated behind STRIPE_SECRET_KEY presence

import Stripe from "stripe";

// Only instantiate if secret key is configured
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia" as any,
    })
  : null;

// Helper to assert Stripe is configured (use in server-side billing routes)
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.");
  }
  return stripe;
}
