"use client";

// UpgradeDialog — Modal plan comparison with CTA buttons.
// Triggered by useUpgradePrompt or directly from quota-exceeded responses.

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/use-subscription";

const PLAN_ORDER = ["FREE", "STARTER", "PRO", "TEAM"] as const;
type DisplayPlan = (typeof PLAN_ORDER)[number];

const PLAN_DETAILS: Record<
  DisplayPlan,
  {
    name: string;
    price: string;
    searchesPerMonth: string;
    maxSources: string;
    maxWorkspaces: string;
    maxPagesIndexed: string;
    priceId: string;
  }
> = {
  FREE: {
    name: "Free",
    price: "$0/mo",
    searchesPerMonth: "1,000",
    maxSources: "5",
    maxWorkspaces: "1",
    maxPagesIndexed: "500",
    priceId: "",
  },
  STARTER: {
    name: "Starter",
    price: "$9/mo",
    searchesPerMonth: "10,000",
    maxSources: "20",
    maxWorkspaces: "1",
    maxPagesIndexed: "5,000",
    priceId: "STARTER",
  },
  PRO: {
    name: "Pro",
    price: "$19/mo",
    searchesPerMonth: "100,000",
    maxSources: "100",
    maxWorkspaces: "10",
    maxPagesIndexed: "50,000",
    priceId: "PRO",
  },
  TEAM: {
    name: "Team",
    price: "$49/mo",
    searchesPerMonth: "500,000",
    maxSources: "Unlimited",
    maxWorkspaces: "50",
    maxPagesIndexed: "200,000",
    priceId: "TEAM",
  },
};

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeDialog({ open, onClose, reason }: UpgradeDialogProps) {
  const { data: subscription } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  const currentTier = (subscription?.planTier ?? "FREE") as DisplayPlan;
  const currentIndex = PLAN_ORDER.indexOf(currentTier);
  const recommendedTier: DisplayPlan =
    currentIndex < PLAN_ORDER.length - 1
      ? PLAN_ORDER[currentIndex + 1]
      : PLAN_ORDER[PLAN_ORDER.length - 1];

  async function handleUpgrade(planTier: DisplayPlan) {
    if (!planTier || planTier === "FREE") return;
    setLoading(planTier);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-3xl"
        style={{
          background: "rgba(10,12,18,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--app-text-primary)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Upgrade your plan
          </DialogTitle>
          {reason && (
            <DialogDescription style={{ color: "var(--app-text-secondary)" }}>
              {reason}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Plan comparison table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4" style={{ color: "var(--app-text-muted)" }}>
                  Feature
                </th>
                {PLAN_ORDER.map((tier) => (
                  <th
                    key={tier}
                    className="text-center py-2 px-3"
                    style={{
                      color:
                        tier === recommendedTier
                          ? "#10b981"
                          : "var(--app-text-primary)",
                      fontWeight: tier === recommendedTier ? 700 : 500,
                    }}
                  >
                    {PLAN_DETAILS[tier].name}
                    {tier === recommendedTier && (
                      <span
                        className="ml-1 text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                      >
                        Recommended
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Price", key: "price" as const },
                { label: "Searches / mo", key: "searchesPerMonth" as const },
                { label: "Sources", key: "maxSources" as const },
                { label: "Workspaces", key: "maxWorkspaces" as const },
                { label: "Pages indexed", key: "maxPagesIndexed" as const },
              ].map(({ label, key }) => (
                <tr
                  key={key}
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <td className="py-2 pr-4" style={{ color: "var(--app-text-secondary)" }}>
                    {label}
                  </td>
                  {PLAN_ORDER.map((tier) => (
                    <td
                      key={tier}
                      className="text-center py-2 px-3"
                      style={{
                        color:
                          tier === recommendedTier
                            ? "var(--app-text-primary)"
                            : "var(--app-text-secondary)",
                        background:
                          tier === recommendedTier
                            ? "rgba(16,185,129,0.04)"
                            : undefined,
                      }}
                    >
                      {PLAN_DETAILS[tier][key]}
                    </td>
                  ))}
                </tr>
              ))}

              {/* CTA row */}
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <td />
                {PLAN_ORDER.map((tier) => (
                  <td key={tier} className="py-3 px-3 text-center">
                    {tier === currentTier ? (
                      <span
                        className="text-xs px-3 py-1.5 rounded"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "var(--app-text-muted)",
                        }}
                      >
                        Current plan
                      </span>
                    ) : tier === "FREE" ? null : (
                      <button
                        onClick={() => handleUpgrade(tier)}
                        disabled={loading === tier}
                        className="text-xs px-3 py-1.5 rounded font-medium transition-opacity disabled:opacity-50"
                        style={{
                          background:
                            tier === recommendedTier
                              ? "linear-gradient(135deg, #10b981, #3b82f6)"
                              : "rgba(255,255,255,0.08)",
                          color: "white",
                        }}
                      >
                        {loading === tier
                          ? "Redirecting..."
                          : `Upgrade to ${PLAN_DETAILS[tier].name}`}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
