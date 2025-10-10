/**
 * Subscription Hook
 * Manages subscription operations (get, upgrade, cancel, billing portal)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlanTier } from '@prisma/client'

export interface Subscription {
  id: string
  userId: string
  planTier: PlanTier
  status: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: Date
  searchesPerMonth: number
  maxSources: number
  maxWorkspaces: number
  maxPagesIndexed: number
  apiRateLimit: number
}

async function fetchSubscription(): Promise<{ subscription: Subscription }> {
  const response = await fetch('/api/subscription')

  if (response.status === 404) {
    throw new Error('No subscription found')
  }

  if (!response.ok) {
    throw new Error('Failed to fetch subscription')
  }

  return response.json()
}

async function createCheckoutSession(planTier: PlanTier): Promise<{ url?: string; redirect?: string; message?: string }> {
  const response = await fetch('/api/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planTier }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create checkout session')
  }

  return response.json()
}

async function cancelSubscription(): Promise<{ message: string; cancelAt: Date }> {
  const response = await fetch('/api/subscription', {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to cancel subscription')
  }

  return response.json()
}

async function createBillingPortalSession(): Promise<{ url: string }> {
  const response = await fetch('/api/subscription/portal', {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create billing portal session')
  }

  return response.json()
}

export function useSubscription() {
  return useQuery<{ subscription: Subscription }, Error>({
    queryKey: ['subscription'],
    queryFn: fetchSubscription,
    staleTime: 60000, // 1 minute
    retry: false,
  })
}

export function useCreateCheckout() {
  const queryClient = useQueryClient()

  return useMutation<{ url?: string; redirect?: string; message?: string }, Error, PlanTier>({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      if (data.url) {
        // New subscription - redirect to Stripe checkout
        window.location.href = data.url
      } else if (data.redirect) {
        // Existing subscription upgraded - invalidate cache and redirect to billing
        queryClient.invalidateQueries({ queryKey: ['subscription'] })
        queryClient.invalidateQueries({ queryKey: ['usage'] })
        window.location.href = data.redirect
      }
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation<{ message: string; cancelAt: Date }, Error>({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      // Invalidate subscription query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })
}

export function useBillingPortal() {
  return useMutation<{ url: string }, Error>({
    mutationFn: createBillingPortalSession,
    onSuccess: (data) => {
      // Open Stripe billing portal in new tab
      window.open(data.url, '_blank', 'noopener,noreferrer')
    },
  })
}
