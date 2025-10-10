/**
 * Pricing Page
 * Display pricing plans and allow users to upgrade
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useCreateCheckout } from '@/hooks/use-subscription'
import { PlanTier } from '@prisma/client'
import { Check, Loader2, AlertTriangle, Zap, Star, Users, Building2 } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  {
    tier: PlanTier.FREE,
    name: 'Free',
    price: 0,
    icon: Zap,
    description: 'Perfect for trying out Context Stream',
    popular: false,
    features: {
      searchesPerMonth: 50,
      maxSources: 3,
      maxWorkspaces: 1,
      maxPagesIndexed: 500,
      apiRateLimit: 30,
    },
    highlights: [
      '50 searches per month',
      'Up to 3 documentation sources',
      '1 workspace',
      '500 pages indexed',
      'API access (30 req/min)',
      'Community support via GitHub Issues',
    ],
  },
  {
    tier: PlanTier.STARTER,
    name: 'Starter',
    price: 9,
    icon: Star,
    description: 'For individual developers and small projects',
    popular: true,
    features: {
      searchesPerMonth: 1000,
      maxSources: 20,
      maxWorkspaces: 3,
      maxPagesIndexed: 5000,
      apiRateLimit: 60,
    },
    highlights: [
      '1,000 searches per month',
      'Up to 20 documentation sources',
      '3 workspaces',
      '5,000 pages indexed',
      'API access (60 req/min)',
      'Priority GitHub Issues support',
      'MCP integration',
    ],
  },
  {
    tier: PlanTier.PRO,
    name: 'Pro',
    price: 19,
    icon: Users,
    description: 'For professional developers and teams',
    popular: false,
    features: {
      searchesPerMonth: 10000,
      maxSources: 100,
      maxWorkspaces: 10,
      maxPagesIndexed: 50000,
      apiRateLimit: 120,
    },
    highlights: [
      '10,000 searches per month',
      'Up to 100 documentation sources',
      '10 workspaces',
      '50,000 pages indexed',
      'API access (120 req/min)',
      'Priority GitHub Issues support',
      'MCP integration',
      'Advanced search features',
    ],
  },
  {
    tier: PlanTier.TEAM,
    name: 'Team',
    price: 49,
    icon: Building2,
    description: 'For growing teams and organizations',
    popular: false,
    features: {
      searchesPerMonth: 50000,
      maxSources: 500,
      maxWorkspaces: 50,
      maxPagesIndexed: 250000,
      apiRateLimit: 300,
    },
    highlights: [
      '50,000 searches per month',
      'Up to 500 documentation sources',
      '50 workspaces',
      '250,000 pages indexed',
      'API access (300 req/min)',
      'Priority GitHub Issues support',
      'MCP integration',
      'Advanced search features',
      'Team collaboration features',
    ],
  },
]

function PricingCard({ plan, isLoading, onSelect }: {
  plan: typeof PLANS[0]
  isLoading: boolean
  onSelect: (tier: PlanTier) => void
}) {
  const Icon = plan.icon
  const isFree = plan.tier === PlanTier.FREE

  return (
    <Card className={plan.popular ? 'border-primary shadow-lg' : ''}>
      {plan.popular && (
        <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium rounded-t-lg">
          Most Popular
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <Icon className="h-8 w-8 text-primary" />
          {plan.popular && <Badge>Popular</Badge>}
        </div>
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">${plan.price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {plan.highlights.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isFree ? (
          <Button variant="outline" className="w-full" asChild>
            <Link href="/register">Get Started Free</Link>
          </Button>
        ) : (
          <Button
            className="w-full"
            variant={plan.popular ? 'default' : 'outline'}
            onClick={() => onSelect(plan.tier)}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upgrade to {plan.name}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function PricingPage() {
  const createCheckout = useCreateCheckout()
  const [error, setError] = useState<string | null>(null)

  const handleSelectPlan = async (tier: PlanTier) => {
    try {
      setError(null)
      await createCheckout.mutateAsync(tier)
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout session')
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Choose the plan that's right for you. All plans include access to our core features.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="text-left">
          <AlertDescription>
            <strong>Self-Hosted?</strong> Deploy Context Stream on your own infrastructure with unlimited usage.
            Check out our{' '}
            <Link href="https://github.com/yourusername/context-stream" className="underline">
              GitHub repository
            </Link>{' '}
            for installation instructions.
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.tier}
            plan={plan}
            isLoading={createCheckout.isPending}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      <div className="mt-16 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>
              Need custom limits, dedicated support, or on-premise deployment?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited searches, sources, and workspaces</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Dedicated support channel</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Custom deployment options</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">SLA guarantees</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="https://github.com/yourusername/context-stream/issues/new?template=enterprise.md">
                Contact Us
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Separator className="my-16" />

      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">What happens if I exceed my quota?</h3>
            <p className="text-muted-foreground">
              You&apos;ll receive warnings as you approach your limits. Once you reach your quota, you&apos;ll be prompted
              to upgrade to a higher plan to continue using the service.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I change plans at any time?</h3>
            <p className="text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your
              next billing cycle.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
            <p className="text-muted-foreground">
              We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us for
              a full refund.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-muted-foreground">
              We accept all major credit cards and debit cards through Stripe. Enterprise customers can arrange
              invoicing.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Is self-hosting really free?</h3>
            <p className="text-muted-foreground">
              Yes! Context Stream is open source and free to self-host with unlimited usage. You only pay for
              your own infrastructure costs (server, database, etc.).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
