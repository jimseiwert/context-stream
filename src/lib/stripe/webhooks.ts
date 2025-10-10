// Stripe Webhook Handler
// Processes Stripe events and updates subscription status

import { prisma } from '@/lib/db'
import Stripe from 'stripe'
import { PlanTier, SubscriptionStatus } from '@prisma/client'
import { PLANS } from '../subscriptions/plans'
import { getNextResetDate } from '../subscriptions/usage-tracker'

/**
 * Handle checkout session completed
 * Creates or updates subscription when payment succeeds
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId
  const subscriptionId = session.subscription as string

  if (!userId || !subscriptionId) {
    console.error('Missing userId or subscriptionId in checkout session')
    return
  }

  // Get subscription details from Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
  })
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)

  const priceId = stripeSubscription.items.data[0].price.id
  const planTier = getPlanTierFromPriceId(priceId)

  if (!planTier) {
    console.error(`Unknown price ID: ${priceId}`)
    return
  }

  const plan = PLANS[planTier]

  // Create or update subscription
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planTier,
      stripeCustomerId: stripeSubscription.customer as string,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      searchesPerMonth: plan.features.searchesPerMonth,
      maxSources: plan.features.maxSources,
      maxWorkspaces: plan.features.maxWorkspaces,
      maxPagesIndexed: plan.features.maxPagesIndexed,
      apiRateLimit: plan.features.apiRateLimit,
      billingCycle: new Date(stripeSubscription.current_period_start * 1000),
      resetAt: getNextResetDate(),
      status: SubscriptionStatus.ACTIVE,
    },
    update: {
      planTier,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      searchesPerMonth: plan.features.searchesPerMonth,
      maxSources: plan.features.maxSources,
      maxWorkspaces: plan.features.maxWorkspaces,
      maxPagesIndexed: plan.features.maxPagesIndexed,
      apiRateLimit: plan.features.apiRateLimit,
      billingCycle: new Date(stripeSubscription.current_period_start * 1000),
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    },
  })

  console.log(`Subscription created/updated for user ${userId}`)
}

/**
 * Handle subscription updated
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId
  const subscriptionId = subscription.id

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0].price.id
  const planTier = getPlanTierFromPriceId(priceId)

  if (!planTier) {
    console.error(`Unknown price ID: ${priceId}`)
    return
  }

  const plan = PLANS[planTier]
  const status = mapStripeStatus(subscription.status)

  await prisma.subscription.update({
    where: { userId },
    data: {
      planTier,
      stripePriceId: priceId,
      searchesPerMonth: plan.features.searchesPerMonth,
      maxSources: plan.features.maxSources,
      maxWorkspaces: plan.features.maxWorkspaces,
      maxPagesIndexed: plan.features.maxPagesIndexed,
      apiRateLimit: plan.features.apiRateLimit,
      billingCycle: new Date(subscription.current_period_start * 1000),
      status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })

  console.log(`Subscription updated for user ${userId}`)
}

/**
 * Handle subscription deleted/canceled
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  // Downgrade to free plan
  const freePlan = PLANS[PlanTier.FREE]

  await prisma.subscription.update({
    where: { userId },
    data: {
      planTier: PlanTier.FREE,
      searchesPerMonth: freePlan.features.searchesPerMonth,
      maxSources: freePlan.features.maxSources,
      maxWorkspaces: freePlan.features.maxWorkspaces,
      maxPagesIndexed: freePlan.features.maxPagesIndexed,
      apiRateLimit: freePlan.features.apiRateLimit,
      status: SubscriptionStatus.CANCELED,
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
    },
  })

  console.log(`Subscription canceled for user ${userId}, downgraded to FREE`)
}

/**
 * Handle payment failed
 */
export async function handlePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    console.error('Missing subscription ID in invoice')
    return
  }

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`Subscription not found: ${subscriptionId}`)
    return
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.PAST_DUE,
    },
  })

  console.log(`Payment failed for subscription ${subscriptionId}`)
}

/**
 * Map Stripe subscription status to our status enum
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'past_due':
      return SubscriptionStatus.PAST_DUE
    case 'canceled':
    case 'unpaid':
      return SubscriptionStatus.CANCELED
    case 'trialing':
      return SubscriptionStatus.TRIALING
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.INCOMPLETE
    default:
      return SubscriptionStatus.ACTIVE
  }
}

/**
 * Get plan tier from Stripe price ID
 */
function getPlanTierFromPriceId(priceId: string): PlanTier | null {
  // Check each plan for matching price ID
  for (const [tier, config] of Object.entries(PLANS)) {
    if (config.stripePriceId === priceId) {
      return tier as PlanTier
    }
  }

  return null
}
