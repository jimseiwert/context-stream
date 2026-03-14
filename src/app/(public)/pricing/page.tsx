/**
 * Pricing Page
 * Display pricing plans and allow users to upgrade
 */

"use client";

export const dynamic = "force-dynamic";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicWrapper } from "@/components/layout/public-wrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateCheckout } from "@/hooks/use-subscription";
import { useSession } from "@/lib/auth/client";
import { PlanTier } from "@/lib/db/types";
import {
  AlertTriangle,
  Building2,
  Check,
  Loader2,
  Star,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PLANS = [
  {
    tier: PlanTier.FREE,
    name: "Free",
    price: 0,
    icon: Zap,
    description: "Perfect for trying out Context Stream",
    popular: false,
    features: {
      searchesPerMonth: 50,
      maxSources: 3,
      maxWorkspaces: 1,
      maxPagesIndexed: 500,
      apiRateLimit: 30,
    },
    highlights: [
      "50 searches per month",
      "Up to 3 documentation sources",
      "1 workspace",
      "500 pages indexed",
      "API access (30 req/min)",
      "Community support via GitHub Issues",
    ],
  },
  {
    tier: PlanTier.STARTER,
    name: "Starter",
    price: 9,
    icon: Star,
    description: "For individual developers and small projects",
    popular: true,
    features: {
      searchesPerMonth: 1000,
      maxSources: 20,
      maxWorkspaces: 3,
      maxPagesIndexed: 5000,
      apiRateLimit: 60,
    },
    highlights: [
      "1,000 searches per month",
      "Up to 20 documentation sources",
      "3 workspaces",
      "5,000 pages indexed",
      "API access (60 req/min)",
      "Priority GitHub Issues support",
      "MCP integration",
    ],
  },
  {
    tier: PlanTier.PRO,
    name: "Pro",
    price: 19,
    icon: Users,
    description: "For professional developers and teams",
    popular: false,
    features: {
      searchesPerMonth: 10000,
      maxSources: 100,
      maxWorkspaces: 10,
      maxPagesIndexed: 50000,
      apiRateLimit: 120,
    },
    highlights: [
      "10,000 searches per month",
      "Up to 100 documentation sources",
      "10 workspaces",
      "50,000 pages indexed",
      "API access (120 req/min)",
      "Priority GitHub Issues support",
      "MCP integration",
      "Advanced search features",
    ],
  },
  {
    tier: PlanTier.TEAM,
    name: "Team",
    price: 49,
    icon: Building2,
    description: "For growing teams and organizations",
    popular: false,
    features: {
      searchesPerMonth: 50000,
      maxSources: 500,
      maxWorkspaces: 50,
      maxPagesIndexed: 250000,
      apiRateLimit: 300,
    },
    highlights: [
      "50,000 searches per month",
      "Up to 500 documentation sources",
      "50 workspaces",
      "250,000 pages indexed",
      "API access (300 req/min)",
      "Priority GitHub Issues support",
      "MCP integration",
      "Advanced search features",
      "Team collaboration features",
    ],
  },
];

function PricingCard({
  plan,
  isLoading,
  isLoggedIn,
  onSelect,
}: {
  plan: (typeof PLANS)[0];
  isLoading: boolean;
  isLoggedIn: boolean;
  onSelect: (tier: PlanTier) => void;
}) {
  const Icon = plan.icon;
  const isFree = plan.tier === PlanTier.FREE;

  return (
    <div className={`pub-price-card${plan.popular ? " popular" : ""}`}>
      {plan.popular && (
        <div
          style={{
            background: "linear-gradient(90deg, #10b981, #06b6d4)",
            textAlign: "center",
            padding: "6px 0",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#030711",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Most Popular
        </div>
      )}
      <div style={{ padding: "28px" }}>
        {/* Icon */}
        <div className="pub-feat-icon">
          <Icon size={20} />
        </div>

        {/* Name & description */}
        <div style={{ marginBottom: 20 }}>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#dce4f0",
              marginBottom: 4,
            }}
          >
            {plan.name}
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#8899bb" }}>
            {plan.description}
          </p>
        </div>

        {/* Price */}
        <div style={{ marginBottom: 24 }}>
          {plan.price === 0 ? (
            <span
              style={{ fontSize: "2.5rem", fontWeight: 800, color: "#dce4f0" }}
            >
              Free
            </span>
          ) : (
            <>
              <span
                className="pub-g-text"
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                ${plan.price}
              </span>
              <span style={{ fontSize: "0.875rem", color: "#5a6a85" }}>
                /month
              </span>
            </>
          )}
        </div>

        {/* Feature list */}
        <ul style={{ listStyle: "none", padding: 0, marginBottom: 28 }}>
          {plan.highlights.map((feature, index) => (
            <li
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <Check
                size={16}
                style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }}
              />
              <span style={{ fontSize: "0.875rem", color: "#8899bb" }}>
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isFree ? (
          <Link
            href="/register"
            className="pub-ghost-btn"
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: "0.875rem",
              textDecoration: "none",
              width: "100%",
            }}
          >
            Get Started Free
          </Link>
        ) : !isLoggedIn ? (
          <Link
            href="/register"
            className={plan.popular ? "pub-g-btn" : "pub-ghost-btn"}
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: "0.875rem",
              textDecoration: "none",
              width: "100%",
            }}
          >
            Get Started with {plan.name}
          </Link>
        ) : (
          <button
            className={plan.popular ? "pub-g-btn" : "pub-ghost-btn"}
            onClick={() => onSelect(plan.tier)}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: "0.875rem",
              width: "100%",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            Upgrade to {plan.name}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { data: session } = useSession();
  const createCheckout = useCreateCheckout();
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!session?.user;

  const handleSelectPlan = async (tier: PlanTier) => {
    try {
      setError(null);
      await createCheckout.mutateAsync(tier);
    } catch (err: any) {
      setError(err.message || "Failed to create checkout session");
    }
  };

  return (
    <PublicWrapper>
      <PublicHeader />

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {/* Hero */}
        <div
          style={{
            textAlign: "center",
            maxWidth: 720,
            margin: "0 auto",
            padding: "80px 24px 48px",
          }}
        >
          <div className="pub-s-label" style={{ marginBottom: 16 }}>
            Plans &amp; Pricing
          </div>
          <h1
            className="pub-h-display"
            style={{ fontSize: "clamp(2.2rem,5vw,3.2rem)", marginBottom: 16 }}
          >
            Simple,{" "}
            <span className="pub-g-text">Transparent</span> Pricing
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#8899bb",
              maxWidth: 560,
              margin: "0 auto 32px",
            }}
          >
            Choose the plan that&apos;s right for you. All plans include access
            to our core features.
          </p>

          {error && (
            <Alert variant="destructive" style={{ marginBottom: 24, textAlign: "left" }}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Self-hosted info box */}
          <div
            style={{
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.18)",
              borderRadius: 12,
              padding: "16px 20px",
              textAlign: "left",
              fontSize: "0.875rem",
              color: "#8899bb",
            }}
          >
            <strong style={{ color: "#10b981" }}>Self-Hosted?</strong> Deploy
            Context Stream on your own infrastructure with unlimited usage. Check
            out our{" "}
            <Link
              href="https://github.com/jimseiwert/context-stream"
              style={{ color: "#10b981", textDecoration: "underline" }}
            >
              GitHub repository
            </Link>{" "}
            for installation instructions.
          </div>
        </div>

        {/* Pricing cards */}
        <h2 className="sr-only">Available Plans</h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          style={{
            gap: 24,
            maxWidth: 1160,
            margin: "0 auto",
            padding: "0 24px 64px",
          }}
        >
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.tier}
              plan={plan}
              isLoading={createCheckout.isPending}
              isLoggedIn={isLoggedIn}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>

        {/* Enterprise card */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 64px" }}>
          <div className="pub-card">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
              <div className="pub-feat-icon" style={{ flexShrink: 0 }}>
                <Building2 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#dce4f0",
                    marginBottom: 6,
                  }}
                >
                  Enterprise
                </h2>
                <p style={{ fontSize: "0.875rem", color: "#8899bb", marginBottom: 20 }}>
                  Need custom limits, dedicated support, or on-premise
                  deployment?
                </p>
                <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
                  {[
                    "Unlimited searches, sources, and workspaces",
                    "Dedicated support channel",
                    "Custom deployment options",
                    "SLA guarantees",
                  ].map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <Check
                        size={16}
                        style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }}
                      />
                      <span style={{ fontSize: "0.875rem", color: "#8899bb" }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="https://github.com/jimseiwert/context-stream/issues/new?template=enterprise.md"
                  className="pub-ghost-btn"
                  style={{ padding: "10px 20px", fontSize: "0.875rem" }}
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <hr className="pub-sep" style={{ maxWidth: 1160, margin: "0 auto 64px" }} />

        {/* FAQ */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
          <h2
            className="pub-h-display"
            style={{
              fontSize: "1.75rem",
              textAlign: "center",
              marginBottom: 40,
              color: "#dce4f0",
            }}
          >
            Frequently Asked Questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {[
              {
                q: "What happens if I exceed my quota?",
                a: "You'll receive warnings as you approach your limits. Once you reach your quota, you'll be prompted to upgrade to a higher plan to continue using the service.",
              },
              {
                q: "Can I change plans at any time?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards and debit cards through Stripe. Enterprise customers can arrange invoicing.",
              },
              {
                q: "Is self-hosting really free?",
                a: "Yes! Context Stream is open source and free to self-host with unlimited usage. You only pay for your own infrastructure costs (server, database, etc.).",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#dce4f0",
                    marginBottom: 8,
                  }}
                >
                  {q}
                </h3>
                <p style={{ fontSize: "0.9rem", color: "#8899bb", lineHeight: 1.65 }}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PublicFooter />
    </PublicWrapper>
  );
}
