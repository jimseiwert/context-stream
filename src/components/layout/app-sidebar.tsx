"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShell } from "@/contexts/shell-context";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Globe,
  FolderOpen,
  FileText,
  Cpu,
  Settings2,
  Search,
  Plug,
  Users,
  Server,
  BarChart3,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: { label: string; color: "green" | "amber" | "blue" | "red" };
  adminOnly?: boolean;
  saasOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Data Sources",
    items: [
      { label: "Sources", href: "/sources", icon: Globe },
      { label: "Collections", href: "/collections", icon: FolderOpen, saasOnly: true },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    title: "Indexing",
    items: [
      { label: "Jobs", href: "/jobs", icon: Cpu },
      { label: "Pipeline", href: "/settings/pipeline", icon: Settings2 },
    ],
  },
  {
    title: "Search",
    items: [
      { label: "Search", href: "/search", icon: Search },
      { label: "MCP Server", href: "/mcp", icon: Plug },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, adminOnly: true },
      { label: "System", href: "/admin/system", icon: Server, adminOnly: true },
      { label: "Usage", href: "/admin/usage", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Workspace", href: "/settings", icon: Settings },
      { label: "Billing", href: "/settings/billing", icon: CreditCard, saasOnly: true },
    ],
  },
];

const BADGE_STYLES = {
  green: { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  amber: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  blue: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  red: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
};

interface AppSidebarProps {
  user: { role: string };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useShell();
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const isSaas = process.env.NEXT_PUBLIC_SAAS_MODE === "true";

  const width = sidebarCollapsed
    ? "var(--app-sidebar-collapsed-width)"
    : "var(--app-sidebar-width)";

  return (
    <aside
      className="sidebar-transition flex-shrink-0 flex flex-col h-full relative z-20"
      style={{
        width,
        minWidth: width,
        background: "rgba(10,12,18,0.9)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 h-[52px] flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex-shrink-0">
          <Logo size={28} showText={false} animated={false} />
        </div>
        {!sidebarCollapsed && (
          <span
            className="font-semibold text-sm tracking-tight"
            style={{ color: "var(--app-text-primary)" }}
          >
            ContextStream
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-3">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (item.saasOnly && !isSaas) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              {!sidebarCollapsed && (
                <p className="section-label px-4 mb-1.5">{section.title}</p>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-md text-sm transition-all duration-150",
                      isActive
                        ? "text-white"
                        : "hover:bg-white/5"
                    )}
                    style={
                      isActive
                        ? {
                            background: "rgba(16,185,129,0.1)",
                            color: "#10b981",
                            boxShadow: "inset 1px 0 0 #10b981",
                          }
                        : { color: "var(--app-text-secondary)" }
                    }
                  >
                    <Icon size={15} className="flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {!sidebarCollapsed && item.badge && (
                      <span
                        className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: BADGE_STYLES[item.badge.color].bg,
                          color: BADGE_STYLES[item.badge.color].color,
                        }}
                      >
                        {item.badge.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center w-full h-10 flex-shrink-0 transition-colors hover:bg-white/5"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          color: "var(--app-text-muted)",
        }}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
