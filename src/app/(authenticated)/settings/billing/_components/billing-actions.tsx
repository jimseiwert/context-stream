"use client";

// BillingActions — Client component for upgrade / manage subscription buttons.
// Calls API endpoints and redirects to Stripe-hosted pages.

import { useState } from "react";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";

interface BillingActionsProps {
  planTier: string;
  hasActiveSubscription: boolean;
}

export function BillingActions({ planTier, hasActiveSubscription }: BillingActionsProps) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  async function handleManageSubscription() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/subscription/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Portal error:", data.error);
        setLoadingPortal(false);
      }
    } catch {
      setLoadingPortal(false);
    }
  }

  const isFree = planTier === "FREE";

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {isFree ? (
          <button
            onClick={() => setUpgradeOpen(true)}
            className="text-sm px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-80"
            style={{
              background: "linear-gradient(135deg, #10b981, #3b82f6)",
              color: "white",
            }}
          >
            Upgrade plan
          </button>
        ) : (
          <>
            <button
              onClick={() => setUpgradeOpen(true)}
              className="text-sm px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-80"
              style={{
                background: "rgba(16,185,129,0.12)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              Change plan
            </button>
            {hasActiveSubscription && (
              <button
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="text-sm px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--app-text-secondary)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {loadingPortal ? "Opening portal..." : "Manage subscription"}
              </button>
            )}
          </>
        )}
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
