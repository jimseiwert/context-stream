// Billing Page — /settings/billing
// Server Component: fetches subscription and invoice data, renders plan card,
// usage meters, and action buttons. Gated behind NEXT_PUBLIC_SAAS_MODE=true.

import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS } from "@/lib/subscriptions/plans";
import { stripe } from "@/lib/stripe/client";
import { BillingActions } from "./_components/billing-actions";

const saasMode = process.env.NEXT_PUBLIC_SAAS_MODE === "true";

// ---- Types ---------------------------------------------------------------

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
}

// ---- Helpers --------------------------------------------------------------

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function percentOf(used: number, limit: number): number {
  if (limit <= 0 || limit === -1) return 0;
  return Math.min(100, (used / limit) * 100);
}

function meterColor(pct: number): string {
  if (pct >= 90) return "#ef4444"; // red
  if (pct >= 70) return "#f59e0b"; // amber
  return "#10b981"; // green
}

// ---- Sub-components -------------------------------------------------------

function UsageMeter({ label, used, limit }: UsageMeterProps) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : percentOf(used, limit);
  const color = meterColor(pct);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: "var(--app-text-secondary)" }}>{label}</span>
        <span style={{ color: "var(--app-text-primary)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          {unlimited
            ? `${formatNumber(used)} / Unlimited`
            : `${formatNumber(used)} / ${formatNumber(limit)} (${Math.round(pct)}%)`}
        </span>
      </div>
      {!unlimited && (
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: "6px", background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
    TRIALING: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
    PAST_DUE: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
    CANCELED: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
    INCOMPLETE: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
  };
  const s = styles[status] ?? styles["INCOMPLETE"];

  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

// ---- Page -----------------------------------------------------------------

export default async function BillingPage() {
  if (!saasMode) {
    redirect("/settings");
  }

  const session = await requireAuth();
  const userId = session.user.id;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  const planTier = sub?.planTier ?? "FREE";
  const planConfig = PLANS[planTier];

  const usage = {
    searchesUsed: sub?.searchesUsed ?? 0,
    sourcesUsed: sub?.sourcesUsed ?? 0,
    pagesIndexed: sub?.pagesIndexed ?? 0,
    workspacesUsed: sub?.workspacesUsed ?? 0,
  };

  const limits = {
    searchesPerMonth: sub?.searchesPerMonth ?? planConfig.features.searchesPerMonth,
    maxSources: sub?.maxSources ?? planConfig.features.maxSources,
    maxPagesIndexed: sub?.maxPagesIndexed ?? planConfig.features.maxPagesIndexed,
    maxWorkspaces: sub?.maxWorkspaces ?? planConfig.features.maxWorkspaces,
  };

  // Fetch invoice history from Stripe (server-side, only if customer exists)
  type StripeInvoice = {
    id: string;
    number: string | null;
    amount_paid: number;
    status: string | null;
    created: number;
    hosted_invoice_url: string | null;
  };
  let invoices: StripeInvoice[] = [];
  if (stripe && sub?.stripeCustomerId) {
    try {
      const invoiceList = await stripe.invoices.list({
        customer: sub.stripeCustomerId,
        limit: 10,
      });
      invoices = invoiceList.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount_paid: inv.amount_paid,
        status: inv.status,
        created: inv.created,
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
      }));
    } catch (err) {
      console.error("[billing-page] Failed to fetch invoices:", err);
    }
  }

  const billingCycleDate = sub?.billingCycle
    ? new Date(sub.billingCycle).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const resetAtDate = sub?.resetAt
    ? new Date(sub.resetAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const hasActiveSubscription = !!sub?.stripeSubscriptionId;
  const isEnterprise = planTier === "ENTERPRISE" || planTier === "SELF_HOSTED";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--app-text-primary)" }}>
          Billing &amp; Subscription
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--app-text-secondary)" }}>
          Manage your plan, monitor usage, and view invoices.
        </p>
      </div>

      {/* Current Plan Card */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--app-text-muted)" }}>
              Current Plan
            </p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold" style={{ color: "var(--app-text-primary)" }}>
                {planConfig.name}
              </h2>
              <StatusBadge status={sub?.status ?? "ACTIVE"} />
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--app-text-secondary)" }}>
              {planConfig.price === 0
                ? "Free"
                : planConfig.price === -1
                ? "Custom pricing"
                : `$${planConfig.price} / month`}
            </p>
          </div>

          <div className="text-right text-xs" style={{ color: "var(--app-text-muted)" }}>
            {billingCycleDate && (
              <p>Billing cycle: <span style={{ color: "var(--app-text-secondary)" }}>{billingCycleDate}</span></p>
            )}
            {resetAtDate && (
              <p>Resets on: <span style={{ color: "var(--app-text-secondary)" }}>{resetAtDate}</span></p>
            )}
            {sub?.cancelAtPeriodEnd && (
              <p className="mt-1" style={{ color: "#fbbf24" }}>Cancels at period end</p>
            )}
            {sub?.trialEndsAt && (
              <p className="mt-1" style={{ color: "#60a5fa" }}>
                Trial ends:{" "}
                {new Date(sub.trialEndsAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons — client component for POST calls */}
        {!isEnterprise && (
          <BillingActions
            planTier={planTier}
            hasActiveSubscription={hasActiveSubscription}
          />
        )}

        {isEnterprise && (
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
            Contact{" "}
            <a href="mailto:support@contextstream.dev" className="underline">
              support@contextstream.dev
            </a>{" "}
            to manage your enterprise plan.
          </p>
        )}
      </section>

      {/* Usage Meters */}
      <section
        className="rounded-xl p-6 flex flex-col gap-5"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--app-text-primary)" }}>
          Usage
        </h3>
        <UsageMeter
          label="Pages indexed"
          used={usage.pagesIndexed}
          limit={limits.maxPagesIndexed}
        />
        <UsageMeter
          label="Searches this month"
          used={usage.searchesUsed}
          limit={limits.searchesPerMonth}
        />
        <UsageMeter
          label="Sources"
          used={usage.sourcesUsed}
          limit={limits.maxSources}
        />
        <UsageMeter
          label="Workspaces"
          used={usage.workspacesUsed}
          limit={limits.maxWorkspaces}
        />
      </section>

      {/* Invoice History */}
      {invoices.length > 0 && (
        <section
          className="rounded-xl p-6 flex flex-col gap-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--app-text-primary)" }}>
            Invoice History
          </h3>
          <div className="flex flex-col gap-2">
            {invoices.map((inv) => {
              const date = new Date(inv.created * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const amount = (inv.amount_paid / 100).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              });

              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between text-sm py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>
                      {inv.number ?? inv.id.slice(-8)}
                    </span>
                    <span style={{ color: "var(--app-text-secondary)" }}>{date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--app-text-primary)" }}>{amount}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          inv.status === "paid"
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(245,158,11,0.12)",
                        color:
                          inv.status === "paid" ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {inv.status}
                    </span>
                    {inv.hosted_invoice_url && (
                      <a
                        href={inv.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                        style={{ color: "var(--app-text-muted)" }}
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* No invoices yet */}
      {!isEnterprise && invoices.length === 0 && hasActiveSubscription && (
        <p className="text-sm" style={{ color: "var(--app-text-muted)" }}>
          No invoices found yet.
        </p>
      )}

      {/* Free plan upgrade prompt */}
      {planTier === "FREE" && (
        <section
          className="rounded-xl p-6 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.05), rgba(59,130,246,0.05))",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--app-text-primary)" }}>
            Ready to unlock more?
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--app-text-secondary)" }}>
            Upgrade to Starter, Pro, or Team for higher limits and more features.
          </p>
          <Link
            href="/pricing"
            className="inline-block text-xs px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-80"
            style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)", color: "white" }}
          >
            View all plans
          </Link>
        </section>
      )}
    </div>
  );
}
