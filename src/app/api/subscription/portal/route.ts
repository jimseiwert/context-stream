/**
 * Billing Portal API
 * POST /api/subscription/portal - Create billing portal session
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api'
import { prisma } from '@/lib/db'
import { createBillingPortalSession } from '@/lib/stripe/client'
import { IS_SAAS_MODE } from '@/lib/config/features'

export async function POST(request: NextRequest) {
  if (!IS_SAAS_MODE) {
    return NextResponse.json(
      { error: 'Billing portal not available in self-hosted mode' },
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

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const portalSession = await createBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${baseUrl}/settings/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('POST /api/subscription/portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create billing portal session', details: error.message },
      { status: 500 }
    )
  }
}
