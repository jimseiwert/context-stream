"use client";

// useSubscription — React Query hook for the current user's subscription
// Calls GET /api/subscription and caches the result.

import { useQuery } from "@tanstack/react-query";

export interface SubscriptionFeatures {
  searchesPerMonth: number;
  maxSources: number;
  maxWorkspaces: number;
  maxPagesIndexed: number;
  apiRateLimit: number;
}

export interface SubscriptionUsage {
  searchesUsed: number;
  sourcesUsed: number;
  pagesIndexed: number;
  workspacesUsed: number;
}

export interface Subscription {
  id?: string;
  planTier: string;
  status: string;
  price: number;
  features: SubscriptionFeatures;
  usage: SubscriptionUsage;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingCycle: string | null;
  resetAt: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
}

async function fetchSubscription(): Promise<Subscription> {
  const res = await fetch("/api/subscription");
  if (!res.ok) {
    throw new Error("Failed to fetch subscription");
  }
  const data = (await res.json()) as { subscription: Subscription };
  return data.subscription;
}

export function useSubscription() {
  return useQuery<Subscription, Error>({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    staleTime: 60_000, // 1 minute
    retry: false,
  });
}
