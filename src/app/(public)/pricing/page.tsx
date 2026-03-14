"use client";

export const dynamic = "force-dynamic";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicWrapper } from "@/components/layout/public-wrapper";
import { Building2, Check, Star, Users, Zap } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    name: "Free",
    price: 0,
    icon: Zap,
    description: "Perfect for trying out ContextStream",
    popular: false,
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
    name: "Starter",
    price: 9,
    icon: Star,
    description: "For individual developers and small projects",
    popular: true,
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
    name: "Pro",
    price: 19,
    icon: Users,
    description: "For professional developers and teams",
    popular: false,
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
    name: "Team",
    price: 49,
    icon: Building2,
    description: "For growing teams and organizations",
    popular: false,
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

function PricingCard({ plan }: { plan: (typeof PLANS)[0] }) {
  const Icon = plan.icon;
  const isFree = plan.price === 0;

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
        <div className="pub-feat-icon">
          <Icon size={20} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#dce4f0", marginBottom: 4 }}>
            {plan.name}
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#8899bb" }}>{plan.description}</p>
        </div>
        <div style={{ marginBottom: 24 }}>
          {isFree ? (
            <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "#dce4f0" }}>Free</span>
          ) : (
            <>
              <span className="pub-g-text" style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1 }}>
                ${plan.price}
              </span>
              <span style={{ fontSize: "0.875rem", color: "#5a6a85" }}>/month</span>
            </>
          )}
        </div>
        <ul style={{ listStyle: "none", padding: 0, marginBottom: 28 }}>
          {plan.highlights.map((feature) => (
            <li key={feature} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
              <Check size={16} style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: "0.875rem", color: "#8899bb" }}>{feature}</span>
            </li>
          ))}
        </ul>
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
          {isFree ? "Get Started Free" : `Get Started with ${plan.name}`}
        </Link>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <PublicWrapper>
      <PublicHeader />
      <div style={{ flex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto", padding: "80px 24px 48px" }}>
          <div className="pub-s-label" style={{ marginBottom: 16 }}>Plans &amp; Pricing</div>
          <h1 className="pub-h-display" style={{ fontSize: "clamp(2.2rem,5vw,3.2rem)", marginBottom: 16 }}>
            Simple, <span className="pub-g-text">Transparent</span> Pricing
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#8899bb", maxWidth: 560, margin: "0 auto 32px" }}>
            Choose the plan that&apos;s right for you. All plans include access to our core features.
          </p>
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 12, padding: "16px 20px", textAlign: "left", fontSize: "0.875rem", color: "#8899bb" }}>
            <strong style={{ color: "#10b981" }}>Self-Hosted?</strong> Deploy ContextStream on your own
            infrastructure with unlimited usage. Check out our{" "}
            <Link href="https://github.com/jimseiwert/context-stream" style={{ color: "#10b981", textDecoration: "underline" }}>
              GitHub repository
            </Link>{" "}
            for installation instructions.
          </div>
        </div>

        {/* Cards */}
        <h2 className="sr-only">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 24, maxWidth: 1160, margin: "0 auto", padding: "0 24px 64px" }}>
          {PLANS.map((plan) => <PricingCard key={plan.name} plan={plan} />)}
        </div>

        {/* Enterprise */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 64px" }}>
          <div className="pub-card">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
              <div className="pub-feat-icon" style={{ flexShrink: 0 }}>
                <Building2 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#dce4f0", marginBottom: 6 }}>Enterprise</h2>
                <p style={{ fontSize: "0.875rem", color: "#8899bb", marginBottom: 20 }}>
                  Need custom limits, dedicated support, or on-premise deployment?
                </p>
                <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
                  {["Unlimited searches, sources, and workspaces", "Dedicated support channel", "Custom deployment options", "SLA guarantees"].map((item) => (
                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <Check size={16} style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: "0.875rem", color: "#8899bb" }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="https://github.com/jimseiwert/context-stream/issues/new?template=enterprise.md" className="pub-ghost-btn" style={{ padding: "10px 20px", fontSize: "0.875rem" }}>
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>

        <hr className="pub-sep" style={{ maxWidth: 1160, margin: "0 auto 64px" }} />

        {/* FAQ */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
          <h2 className="pub-h-display" style={{ fontSize: "1.75rem", textAlign: "center", marginBottom: 40, color: "#dce4f0" }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {[
              { q: "What happens if I exceed my quota?", a: "You'll receive warnings as you approach your limits. Once you reach your quota, you'll be prompted to upgrade to a higher plan to continue using the service." },
              { q: "Can I change plans at any time?", a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle." },
              { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund." },
              { q: "What payment methods do you accept?", a: "We accept all major credit cards and debit cards through Stripe. Enterprise customers can arrange invoicing." },
              { q: "Is self-hosting really free?", a: "Yes! ContextStream is open source and free to self-host with unlimited usage. You only pay for your own infrastructure costs (server, database, etc.)." },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#dce4f0", marginBottom: 8 }}>{q}</h3>
                <p style={{ fontSize: "0.9rem", color: "#8899bb", lineHeight: 1.65 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <PublicFooter />
    </PublicWrapper>
  );
}
