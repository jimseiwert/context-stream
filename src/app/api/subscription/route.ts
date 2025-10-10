/**
 * Subscription Management API
 * GET /api/subscription - Get current subscription
 * POST /api/subscription - Create checkout session
 * DELETE /api/subscription - Cancel subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'
import {
  createStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription as cancelStripeSubscription,
  updateSubscriptionPlan,
  getPriceId,
} from '@/lib/stripe/client'
import { PlanTier } from '@prisma/client'
import { z } from 'zod'
import { IS_SAAS_MODE } from '@/lib/config/features'

const CreateCheckoutSchema = z.object({
  planTier: z.nativeEnum(PlanTier),
})

/**
 * GET /api/subscription
 * Get current user's subscription
 */
export async function GET(request: NextRequest) {
  if (!IS_SAAS_MODE) {
    return NextResponse.json(
      { error: 'Subscriptions not available in self-hosted mode' },
      { status: 400 }
    )
  }

  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    // If no subscription exists (for existing users), create a FREE one
    if (!subscription) {
      const { PLANS } = await import('@/lib/subscriptions/plans')
      const freePlan = PLANS[PlanTier.FREE]
      const now = new Date()
      const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          planTier: PlanTier.FREE,
          status: 'ACTIVE',
          searchesPerMonth: freePlan.features.searchesPerMonth,
          maxSources: freePlan.features.maxSources,
          maxWorkspaces: freePlan.features.maxWorkspaces,
          maxPagesIndexed: freePlan.features.maxPagesIndexed,
          apiRateLimit: freePlan.features.apiRateLimit,
          searchesUsed: 0,
          sourcesUsed: 0,
          workspacesUsed: 0,
          pagesIndexed: 0,
          resetAt,
        },
      })
      console.log(`Created missing FREE subscription for existing user ${session.user.id}`)
    }

    return NextResponse.json({ subscription })
  } catch (error: any) {
    console.error('GET /api/subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscription
 * Create Stripe checkout session for plan upgrade
 */
export async function POST(request: NextRequest) {
  if (!IS_SAAS_MODE) {
    return NextResponse.json(
      { error: 'Subscriptions not available in self-hosted mode' },
      { status: 400 }
    )
  }

  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planTier } = CreateCheckoutSchema.parse(body)

    // Validate plan tier
    if (planTier === PlanTier.FREE || planTier === PlanTier.SELF_HOSTED) {
      return NextResponse.json(
        { error: 'Cannot create checkout for free or self-hosted plans' },
        { status: 400 }
      )
    }

    const priceId = getPriceId(planTier)
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this plan' },
        { status: 400 }
      )
    }

    // Get or create subscription record
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    // If user already has an active Stripe subscription, update it directly
    if (subscription?.stripeSubscriptionId) {
      // This is an upgrade/downgrade - update existing subscription
      await updateSubscriptionPlan({
        subscriptionId: subscription.stripeSubscriptionId,
        newPriceId: priceId,
      })

      return NextResponse.json({
        message: 'Subscription updated successfully',
        redirect: '/settings/billing?upgraded=true'
      })
    }

    // No active subscription - create checkout session for new subscription
    // Create Stripe customer if needed
    let customerId = subscription?.stripeCustomerId
    if (!customerId) {
      customerId = await createStripeCustomer({
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name || session.user.email,
      })

      // Update subscription with customer ID
      if (subscription) {
        await prisma.subscription.update({
          where: { userId: session.user.id },
          data: { stripeCustomerId: customerId },
        })
      }
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${baseUrl}/settings/billing?success=true`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
      userId: session.user.id,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('POST /api/subscription error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/subscription
 * Cancel subscription at end of period
 */
export async function DELETE(request: NextRequest) {
  if (!IS_SAAS_MODE) {
    return NextResponse.json(
      { error: 'Subscriptions not available in self-hosted mode' },
      { status: 400 }
    )
  }

  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription to cancel' },
        { status: 400 }
      )
    }

    // Cancel subscription in Stripe
    const updated = await cancelStripeSubscription(subscription.stripeSubscriptionId)

    // Update local subscription
    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    })

    return NextResponse.json({
      message: 'Subscription will be canceled at end of billing period',
      cancelAt: new Date(updated.cancel_at! * 1000),
    })
  } catch (error: any) {
    console.error('DELETE /api/subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: error.message },
      { status: 500 }
    )
  }
}
