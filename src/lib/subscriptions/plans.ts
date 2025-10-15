// Subscription Plans Configuration
// Defines all plan tiers, quotas, and pricing

import { PlanTier } from '@prisma/client'

export interface PlanConfig {
  tier: PlanTier
  name: string
  price: number // USD per month (0 for free)
  stripePriceId?: string // Set in environment variables
  features: {
    searchesPerMonth: number
    maxSources: number
    maxWorkspaces: number
    maxPagesIndexed: number
    apiRateLimit: number // requests per minute
  }
  description: string
  highlights: string[] // Key selling points
}

// Plan configurations
export const PLANS: Record<PlanTier, PlanConfig> = {
  [PlanTier.FREE]: {
    tier: PlanTier.FREE,
    name: 'Free',
    price: 0,
    features: {
      searchesPerMonth: 50,
      maxSources: 3,
      maxWorkspaces: 1,
      maxPagesIndexed: 500,
      apiRateLimit: 30,
    },
    description: 'Try Context Stream with basic features',
    highlights: [
      '50 searches per month',
      '3 documentation sources',
      '1 workspace',
      'MCP integration',
      'GitHub Issues support',
    ],
  },

  [PlanTier.STARTER]: {
    tier: PlanTier.STARTER,
    name: 'Starter',
    price: 9,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: {
      searchesPerMonth: 1000,
      maxSources: 20,
      maxWorkspaces: 3,
      maxPagesIndexed: 5000,
      apiRateLimit: 60,
    },
    description: 'Perfect for individual developers',
    highlights: [
      '1,000 searches per month',
      '20 documentation sources',
      '3 workspaces',
      'MCP integration',
      'Priority GitHub Issues',
    ],
  },

  [PlanTier.PRO]: {
    tier: PlanTier.PRO,
    name: 'Pro',
    price: 19,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      searchesPerMonth: 10000,
      maxSources: 100,
      maxWorkspaces: 10,
      maxPagesIndexed: 50000,
      apiRateLimit: 120,
    },
    description: 'For professional developers and small teams',
    highlights: [
      '10,000 searches per month',
      '100 documentation sources',
      '10 workspaces',
      'Advanced search features',
      'Priority GitHub Issues',
    ],
  },

  [PlanTier.TEAM]: {
    tier: PlanTier.TEAM,
    name: 'Team',
    price: 49,
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID,
    features: {
      searchesPerMonth: 50000,
      maxSources: -1, // Unlimited
      maxWorkspaces: -1, // Unlimited
      maxPagesIndexed: 250000,
      apiRateLimit: 300,
    },
    description: 'For development teams',
    highlights: [
      '50,000 searches per month',
      'Unlimited sources',
      'Unlimited workspaces',
      'Team collaboration',
      'Priority GitHub Issues',
    ],
  },

  [PlanTier.ENTERPRISE]: {
    tier: PlanTier.ENTERPRISE,
    name: 'Enterprise',
    price: -1, // Custom pricing
    features: {
      searchesPerMonth: -1, // Unlimited
      maxSources: -1, // Unlimited
      maxWorkspaces: -1, // Unlimited
      maxPagesIndexed: -1, // Unlimited
      apiRateLimit: 1000,
    },
    description: 'Custom solution for large organizations',
    highlights: [
      'Unlimited everything',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
      'On-premise option',
    ],
  },

  [PlanTier.SELF_HOSTED]: {
    tier: PlanTier.SELF_HOSTED,
    name: 'Self-Hosted',
    price: 0,
    features: {
      searchesPerMonth: -1, // Unlimited
      maxSources: -1, // Unlimited
      maxWorkspaces: -1, // Unlimited
      maxPagesIndexed: -1, // Unlimited
      apiRateLimit: -1, // Unlimited (managed by user)
    },
    description: 'Run on your own infrastructure',
    highlights: [
      'Unlimited everything',
      'Full control',
      'No external dependencies',
      'Docker deployment',
      'Community support',
    ],
  },
}

// Helper functions
export function getPlan(tier: PlanTier): PlanConfig {
  return PLANS[tier]
}

export function isFeatureUnlimited(value: number): boolean {
  return value === -1
}

export function checkQuota(used: number, limit: number): boolean {
  if (isFeatureUnlimited(limit)) return true
  return used < limit
}

export function getQuotaPercentage(used: number, limit: number): number {
  if (isFeatureUnlimited(limit)) return 0
  return Math.min(100, (used / limit) * 100)
}

export function isApproachingLimit(used: number, limit: number, threshold = 0.8): boolean {
  if (isFeatureUnlimited(limit)) return false
  return used / limit >= threshold
}

// Get all paid plans (for pricing page)
export function getPaidPlans(): PlanConfig[] {
  return [
    PLANS[PlanTier.STARTER],
    PLANS[PlanTier.PRO],
    PLANS[PlanTier.TEAM],
  ]
}

// Get plan display name
export function getPlanDisplayName(tier: PlanTier): string {
  return PLANS[tier].name
}

// Calculate monthly cost
export function calculateMonthlyCost(tier: PlanTier): number {
  return PLANS[tier].price
}
