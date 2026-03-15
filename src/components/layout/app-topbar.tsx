"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight, ChevronDown, LogOut, Settings, AlertTriangle, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSubscription } from "@/hooks/use-subscription";

const saasMode = process.env.NEXT_PUBLIC_SAAS_MODE === "true";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sources": "Sources",
  "/collections": "Collections",
  "/documents": "Documents",
  "/jobs": "Jobs",
  "/settings/pipeline": "Pipeline Config",
  "/search": "Search",
  "/mcp": "MCP Server",
  "/admin/users": "Users",
  "/admin/system": "System",
  "/admin/usage": "Usage",
  "/settings": "Settings",
  "/settings/billing": "Billing",
};

function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let current = "";
  for (const seg of segments) {
    current += "/" + seg;
    const label = ROUTE_LABELS[current] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href: current });
  }

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight size={12} style={{ color: "var(--app-text-muted)" }} />
          )}
          {i === crumbs.length - 1 ? (
            <span style={{ color: "var(--app-text-primary)", fontWeight: 500 }}>
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-white transition-colors"
              style={{ color: "var(--app-text-secondary)" }}
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

// QuotaBanner renders an amber or red banner when usage exceeds thresholds.
// Only rendered when NEXT_PUBLIC_SAAS_MODE=true.
function QuotaBanner() {
  const { data: subscription } = useSubscription();

  if (!subscription) return null;

  const { usage, features } = subscription;

  type ResourceEntry = {
    label: string;
    used: number;
    limit: number;
  };

  const resources: ResourceEntry[] = [
    {
      label: "search",
      used: usage.searchesUsed,
      limit: features.searchesPerMonth,
    },
    {
      label: "source",
      used: usage.sourcesUsed,
      limit: features.maxSources,
    },
    {
      label: "page",
      used: usage.pagesIndexed,
      limit: features.maxPagesIndexed,
    },
  ];

  // Skip unlimited resources
  const metered = resources.filter((r) => r.limit > 0 && r.limit !== -1);

  const exceeded = metered.find((r) => r.used >= r.limit);
  if (exceeded) {
    return (
      <div
        className="flex items-center justify-between px-5 py-2 text-xs font-medium"
        style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
      >
        <div className="flex items-center gap-2">
          <XCircle size={13} />
          <span>
            {exceeded.label.charAt(0).toUpperCase() + exceeded.label.slice(1)} quota reached ({exceeded.used.toLocaleString()} / {exceeded.limit.toLocaleString()}).
          </span>
        </div>
        <Link
          href="/settings/billing"
          className="underline hover:no-underline font-semibold"
        >
          Upgrade now
        </Link>
      </div>
    );
  }

  const approaching = metered.find(
    (r) => r.used / r.limit >= 0.8
  );
  if (approaching) {
    const pct = Math.round((approaching.used / approaching.limit) * 100);
    return (
      <div
        className="flex items-center justify-between px-5 py-2 text-xs font-medium"
        style={{ background: "rgba(245,158,11,0.10)", borderBottom: "1px solid rgba(245,158,11,0.25)", color: "#fcd34d" }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} />
          <span>
            You are at {pct}% of your {approaching.label} quota ({approaching.used.toLocaleString()} / {approaching.limit.toLocaleString()}).
          </span>
        </div>
        <Link
          href="/settings/billing"
          className="underline hover:no-underline font-semibold"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return null;
}

interface AppTopbarProps {
  user: {
    name: string | null;
    email: string;
    image?: string | null;
  };
}

export function AppTopbar({ user }: AppTopbarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="flex flex-col flex-shrink-0">
      <header
        className="flex items-center justify-between px-5"
        style={{
          height: "var(--app-topbar-height)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,12,18,0.7)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Left: workspace switcher stub + breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Workspace switcher — Phase 3 will make this interactive */}
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-white/5 transition-colors"
            style={{
              color: "var(--app-text-secondary)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            disabled
            aria-label="Workspace switcher (coming in Phase 3)"
          >
            <span>Personal</span>
            <ChevronDown size={11} />
          </button>
          <Breadcrumbs />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notification bell */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/5 transition-colors"
            style={{ color: "var(--app-text-secondary)" }}
            aria-label="Notifications"
          >
            <Bell size={15} />
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-opacity hover:opacity-80"
                style={{
                  background: "linear-gradient(135deg, #10b981, #3b82f6)",
                  color: "white",
                  fontFamily: "var(--font-mono)",
                }}
                aria-label="User menu"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{
                background: "rgba(10,12,18,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--app-text-primary)",
                minWidth: "180px",
              }}
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">
                  {user.name ?? "User"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--app-text-muted)" }}>
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.07)" }} />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings size={13} />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.07)" }} />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 cursor-pointer"
                style={{ color: "var(--app-accent-red)" }}
              >
                <LogOut size={13} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Quota warning banners — only in SaaS mode */}
      {saasMode && <QuotaBanner />}
    </div>
  );
}
