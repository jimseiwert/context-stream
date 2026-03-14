# Phase 1 — App Shell & Navigation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete authenticated app shell — sidebar, topbar, dark theme, command palette, toast system, and route stubs — that all future phases will live inside.

**Architecture:** The shell is a server-side layout (`(authenticated)/layout.tsx`) that fetches the session once, then renders a client `AppShell` component that owns sidebar collapse state. The sidebar and topbar are client components that read from a shared `ShellContext`. Route pages remain server components.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, shadcn/ui (Radix), Lucide React, Sonner (toasts), cmdk (command palette), Better Auth

**GitHub Issue:** https://github.com/jimseiwert/context-stream/issues/20

---

## Chunk 1: Theme & CSS Foundation

### Task 1: App theme tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add app-shell CSS custom properties and utility classes**

> Note: `no-scrollbar` is already defined in the existing `globals.css` — do NOT re-add it.

Append to the bottom of `src/app/globals.css`:

```css
/* ── ContextStream App Shell Theme ── */
:root {
  --app-bg: #07090f;
  --app-surface: rgba(10, 12, 18, 0.85);
  --app-card: rgba(255, 255, 255, 0.04);
  --app-card-border: rgba(255, 255, 255, 0.08);
  --app-card-highlight: rgba(16, 185, 129, 0.5);
  --app-text-primary: #e2e8f0;
  --app-text-secondary: #94a3b8;
  --app-text-muted: #4a5568;
  --app-accent-green: #10b981;
  --app-accent-blue: #3b82f6;
  --app-accent-amber: #f59e0b;
  --app-accent-red: #ef4444;
  --app-accent-cyan: #06b6d4;
  --app-sidebar-width: 220px;
  --app-sidebar-collapsed-width: 52px;
  --app-topbar-height: 52px;
  --font-mono: 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;
}

/* Glass card pattern */
.app-card {
  background: var(--app-card);
  border: 1px solid var(--app-card-border);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.app-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--app-card-highlight),
    transparent
  );
  opacity: 0.6;
}

/* Stat value — monospace gradient */
.stat-value {
  font-family: var(--font-mono);
  font-size: 1.6rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--app-accent-green), var(--app-accent-blue));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}

/* Section label */
.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--app-text-muted);
}

/* Live pulse badge */
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-accent-green);
  animation: live-pulse 1.5s ease-in-out infinite;
}

/* Sidebar transition */
.sidebar-transition {
  transition: width 0.2s ease;
}

/* Ambient glow helpers */
.glow-green {
  background: radial-gradient(ellipse, rgba(16, 185, 129, 0.07) 0%, transparent 65%);
}

.glow-blue {
  background: radial-gradient(ellipse, rgba(59, 130, 246, 0.06) 0%, transparent 65%);
}
```

- [ ] **Step 2: Verify globals.css parses without error**

```bash
cd /Users/jimseiwert/repos/context-stream && npx tsc --noEmit 2>&1 | head -20
```

Expected: No CSS-related errors (tsc doesn't parse CSS, just confirming project still compiles)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(shell): add app theme tokens and utility classes to globals.css"
```

---

## Chunk 2: Shell Context & Layout Wiring

### Task 2: ShellContext — shared sidebar state

**Files:**
- Create: `src/contexts/shell-context.tsx`

- [ ] **Step 1: Create ShellContext**

```tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ShellContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

const STORAGE_KEY = "cs-sidebar-collapsed";

export function ShellProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <ShellContext.Provider value={{ sidebarCollapsed, toggleSidebar }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside ShellProvider");
  return ctx;
}
```

- [ ] **Step 2: Run type check**

```bash
cd /Users/jimseiwert/repos/context-stream && npx tsc --noEmit 2>&1 | grep -E "error|Error" | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/contexts/shell-context.tsx
git commit -m "feat(shell): add ShellContext for sidebar collapse state"
```

### Task 3: AppShell client wrapper

**Files:**
- Create: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Create AppShell component**

```tsx
"use client";

import { ShellProvider } from "@/contexts/shell-context";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { Toaster } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    image?: string | null;
  };
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <ShellProvider>
      {/* Ambient background glows */}
      <div
        className="fixed pointer-events-none z-0"
        style={{ top: "-120px", left: "60px", width: "500px", height: "500px" }}
      >
        <div className="w-full h-full glow-green" />
      </div>
      <div
        className="fixed pointer-events-none z-0"
        style={{ bottom: "-100px", right: "100px", width: "400px", height: "400px" }}
      >
        <div className="w-full h-full glow-blue" />
      </div>

      <div
        className="relative z-10 flex h-screen overflow-hidden"
        style={{ background: "var(--app-bg)", color: "var(--app-text-primary)" }}
      >
        <AppSidebar user={user} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AppTopbar user={user} />
          <main
            className="flex-1 overflow-y-auto p-6"
            style={{ background: "var(--app-bg)" }}
          >
            {children}
          </main>
        </div>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(10,12,18,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0",
          },
        }}
      />
    </ShellProvider>
  );
}
```

- [ ] **Step 2: Run type check**

```bash
cd /Users/jimseiwert/repos/context-stream && npx tsc --noEmit 2>&1 | grep -E "error|Error" | head -20
```

Expected: Errors only for missing `AppSidebar` and `AppTopbar` — that's fine, those come next.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "feat(shell): add AppShell wrapper with ambient glows and Toaster"
```

### Task 4: Update authenticated layout to use AppShell

**Files:**
- Modify: `src/app/(authenticated)/layout.tsx`

> **Prerequisite note:** `src/lib/auth/auth.ts` currently uses the `prismaAdapter` pointing at the `prisma` Drizzle-compat shim exported from `src/lib/db.ts`. This IS working — `auth.api.getSession()` succeeds in the current hello-world dashboard. No migration needed for Phase 1. Phase 3 will migrate auth.ts to the Drizzle adapter if needed.

- [ ] **Step 1: Rewrite layout to pass user to AppShell**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email,
    role: (session.user as { role?: string }).role ?? "USER",
    image: session.user.image ?? null,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
```

- [ ] **Step 2: Commit (even though AppShell deps are incomplete — layout won't load yet)**

```bash
git add src/app/(authenticated)/layout.tsx
git commit -m "feat(shell): wire authenticated layout to AppShell"
```

---

## Chunk 3: Sidebar Component

### Task 5: AppSidebar

**Files:**
- Create: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Create nav config**

> Note: `no-scrollbar` is already defined in `globals.css` — no addition needed.

The nav structure lives in the sidebar file itself as a constant — no separate file needed (YAGNI).

- [ ] **Step 2: Create AppSidebar**

```tsx
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
```

- [ ] **Step 3: Run type check**

```bash
cd /Users/jimseiwert/repos/context-stream && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: Only errors for missing `AppTopbar` import in `app-shell.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat(shell): add collapsible AppSidebar with role-gated nav sections"
```

---

## Chunk 4: Topbar Component

### Task 6: AppTopbar

> **Mobile sidebar:** Mobile overlay sidebar (spec section 3, "Mobile: sidebar slides in as overlay") is deferred — tracked in a follow-up issue. Phase 1 delivers desktop layout only.

**Files:**
- Create: `src/components/layout/app-topbar.tsx`

- [ ] **Step 1: Create AppTopbar**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight, ChevronDown, LogOut, Settings } from "lucide-react";
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

  // Build breadcrumb segments
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
    <header
      className="flex items-center justify-between px-5 flex-shrink-0"
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
        {/* Notification bell (placeholder) */}
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
  );
}
```

- [ ] **Step 2: Run type check**

```bash
cd /Users/jimseiwert/repos/context-stream && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: Zero errors (all imports are now resolved)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-topbar.tsx
git commit -m "feat(shell): add AppTopbar with breadcrumbs and user menu"
```

---

## Chunk 5: Command Palette

### Task 7: Command palette (⌘K)

**Files:**
- Create: `src/components/layout/command-palette.tsx`
- Modify: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Add shadcn Command component**

```bash
cd /Users/jimseiwert/repos/context-stream && npx shadcn@latest add command --yes 2>&1 | tail -5
```

Expected: `src/components/ui/command.tsx` created

- [ ] **Step 2: Create CommandPalette component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Globe,
  FolderOpen,
  FileText,
  Cpu,
  Search,
  Plug,
  Users,
  Server,
  BarChart3,
  Settings,
  CreditCard,
  Settings2,
} from "lucide-react";

const COMMANDS = [
  { group: "Navigation", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { group: "Navigation", label: "Sources", href: "/sources", icon: Globe },
  { group: "Navigation", label: "Collections", href: "/collections", icon: FolderOpen },
  { group: "Navigation", label: "Documents", href: "/documents", icon: FileText },
  { group: "Navigation", label: "Jobs", href: "/jobs", icon: Cpu },
  { group: "Navigation", label: "Pipeline Config", href: "/settings/pipeline", icon: Settings2 },
  { group: "Navigation", label: "Search", href: "/search", icon: Search },
  { group: "Navigation", label: "MCP Server", href: "/mcp", icon: Plug },
  { group: "Admin", label: "Users", href: "/admin/users", icon: Users },
  { group: "Admin", label: "System", href: "/admin/system", icon: Server },
  { group: "Admin", label: "Usage", href: "/admin/usage", icon: BarChart3 },
  { group: "Settings", label: "Workspace Settings", href: "/settings", icon: Settings },
  { group: "Settings", label: "Billing", href: "/settings/billing", icon: CreditCard },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const groups = [...new Set(COMMANDS.map((c) => c.group))];

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      style={
        {
          "--tw-ring-color": "rgba(16,185,129,0.3)",
        } as React.CSSProperties
      }
    >
      <CommandInput placeholder="Navigate to..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group, i) => (
          <div key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {COMMANDS.filter((c) => c.group === group).map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <CommandItem
                    key={cmd.href}
                    onSelect={() => handleSelect(cmd.href)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Icon size={14} />
                    {cmd.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 3: Add CommandPalette to AppShell**

In `src/components/layout/app-shell.tsx`, add the import and render it inside the shell:

```tsx
// Add import at top:
import { CommandPalette } from "./command-palette";

// Add inside the return, after </div> closing the main app div, before <Toaster>:
<CommandPalette />
```

- [ ] **Step 4: Run type check**

```bash
cd /Users/jimseiwert/repos/context-stream && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: Zero errors

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/command-palette.tsx src/components/layout/app-shell.tsx src/components/ui/command.tsx package.json package-lock.json
git commit -m "feat(shell): add command palette (⌘K) with full nav shortcuts"
```

---

## Chunk 6: Route Stubs & Coming Soon

### Task 8: ComingSoon component + all route stubs

**Files:**
- Create: `src/components/layout/coming-soon.tsx`
- Create: `src/app/(authenticated)/sources/page.tsx`
- Create: `src/app/(authenticated)/collections/page.tsx`
- Create: `src/app/(authenticated)/documents/page.tsx`
- Create: `src/app/(authenticated)/jobs/page.tsx`
- Create: `src/app/(authenticated)/search/page.tsx`
- Create: `src/app/(authenticated)/mcp/page.tsx`
- Create: `src/app/(authenticated)/admin/users/page.tsx`
- Create: `src/app/(authenticated)/admin/system/page.tsx`
- Create: `src/app/(authenticated)/admin/usage/page.tsx`
- Create: `src/app/(authenticated)/settings/page.tsx`
- Create: `src/app/(authenticated)/settings/billing/page.tsx`
- Create: `src/app/(authenticated)/settings/pipeline/page.tsx`

- [ ] **Step 1: Create ComingSoon component**

```tsx
// src/components/layout/coming-soon.tsx
import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
  issue?: string;
}

export function ComingSoon({ title, description, issue }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div
        className="flex items-center justify-center w-14 h-14 rounded-xl"
        style={{
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.2)",
          color: "var(--app-accent-green)",
        }}
      >
        <Construction size={24} />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--app-text-primary)" }}>
          {title}
        </h1>
        <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
          {description ?? "This feature is coming soon."}
        </p>
        {issue && (
          <a
            href={issue}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs mt-2 hover:underline"
            style={{ color: "var(--app-accent-cyan)" }}
          >
            Track progress on GitHub →
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create all route stubs**

Each stub follows this exact pattern. Run these bash commands:

```bash
# Sources
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/sources
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/sources/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SourcesPage() {
  return (
    <ComingSoon
      title="Sources"
      description="Manage your data sources — websites, GitHub repos, and document uploads."
      issue="https://github.com/jimseiwert/context-stream/issues/23"
    />
  );
}
EOF

# Collections
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/collections
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/collections/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function CollectionsPage() {
  return (
    <ComingSoon
      title="Collections"
      description="Group sources into named collections for scoped MCP search."
      issue="https://github.com/jimseiwert/context-stream/issues/23"
    />
  );
}
EOF

# Documents
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/documents
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/documents/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function DocumentsPage() {
  return (
    <ComingSoon
      title="Documents"
      description="Browse, preview, and manage all indexed documents."
      issue="https://github.com/jimseiwert/context-stream/issues/26"
    />
  );
}
EOF

# Jobs
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/jobs
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/jobs/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function JobsPage() {
  return (
    <ComingSoon
      title="Jobs"
      description="Real-time job queue with progress streaming and history."
      issue="https://github.com/jimseiwert/context-stream/issues/24"
    />
  );
}
EOF

# Search
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/search
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/search/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SearchPage() {
  return (
    <ComingSoon
      title="Search"
      description="Hybrid BM25 + vector search with reranking and query playground."
      issue="https://github.com/jimseiwert/context-stream/issues/25"
    />
  );
}
EOF

# MCP
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/mcp
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/mcp/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function McpPage() {
  return (
    <ComingSoon
      title="MCP Server"
      description="Connect Claude Desktop, Cursor, and other AI tools to your knowledge base."
      issue="https://github.com/jimseiwert/context-stream/issues/25"
    />
  );
}
EOF

# Admin Users
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/admin/users
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/admin/users/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function AdminUsersPage() {
  return (
    <ComingSoon
      title="User Management"
      description="Manage users, roles, and workspace access."
      issue="https://github.com/jimseiwert/context-stream/issues/27"
    />
  );
}
EOF

# Admin System
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/admin/system
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/admin/system/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function AdminSystemPage() {
  return (
    <ComingSoon
      title="System"
      description="Configure embedding providers, vector stores, and feature flags."
      issue="https://github.com/jimseiwert/context-stream/issues/27"
    />
  );
}
EOF

# Admin Usage
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/admin/usage
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/admin/usage/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function AdminUsagePage() {
  return (
    <ComingSoon
      title="Usage Analytics"
      description="Per-workspace usage metrics — documents, API calls, and storage."
      issue="https://github.com/jimseiwert/context-stream/issues/27"
    />
  );
}
EOF

# Settings
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/settings
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/settings/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Workspace Settings"
      description="Manage workspace name, members, and API keys."
      issue="https://github.com/jimseiwert/context-stream/issues/22"
    />
  );
}
EOF

# Settings Billing
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/settings/billing
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/settings/billing/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function BillingPage() {
  return (
    <ComingSoon
      title="Billing"
      description="Manage your subscription plan, usage, and invoices."
      issue="https://github.com/jimseiwert/context-stream/issues/28"
    />
  );
}
EOF

# Settings Pipeline
mkdir -p /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/settings/pipeline
cat > /Users/jimseiwert/repos/context-stream/src/app/\(authenticated\)/settings/pipeline/page.tsx << 'EOF'
import { ComingSoon } from "@/components/layout/coming-soon";

export default function PipelineConfigPage() {
  return (
    <ComingSoon
      title="Pipeline Config"
      description="Configure chunking strategy, embedding provider, and re-index schedule."
      issue="https://github.com/jimseiwert/context-stream/issues/23"
    />
  );
}
EOF
```

- [ ] **Step 3: Run type check across all new files**

```bash
cd /Users/jimseiwert/repos/context-stream && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -30
```

Expected: Zero errors

- [ ] **Step 4: Commit all stubs**

```bash
git add src/components/layout/coming-soon.tsx src/app/\(authenticated\)/
git commit -m "feat(shell): add ComingSoon component and all route stubs for Phase 1"
```

---

## Chunk 7: Dashboard Page & Final Wiring

### Task 9: Dashboard page with stat card shells

> **Toast pattern:** The AC requires a global toast utility. `Sonner` is already in the shell. The pattern for all pages is `import { toast } from "sonner"` — no wrapper hook needed. Add a comment to the dashboard page documenting this.

**Files:**
- Modify: `src/app/(authenticated)/dashboard/page.tsx`

- [ ] **Step 1: Replace hello world dashboard with stat card skeletons**

The layout already fetches the session — no second fetch needed in the page. The user's name isn't available at the page level without re-fetching; use a generic greeting for now (Phase 3 will add a proper user context).

```tsx
// Toast usage: import { toast } from "sonner" — no wrapper needed

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-text-primary)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--app-text-secondary)" }}>
          Overview of your indexing activity
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Documents", value: "—", sub: "Total indexed" },
          { label: "Chunks", value: "—", sub: "Vector embeddings" },
          { label: "Searches", value: "—", sub: "Last 7 days" },
          { label: "Sources", value: "—", sub: "Active sources" },
        ].map((stat) => (
          <div key={stat.label} className="app-card p-4">
            <p className="section-label mb-3">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
            <p className="text-xs mt-2" style={{ color: "var(--app-text-muted)" }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Activity placeholder */}
      <div className="app-card p-6">
        <p className="section-label mb-4">Recent Activity</p>
        <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
          No activity yet. Add a source to get started.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run full type check**

```bash
cd /Users/jimseiwert/repos/context-stream && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: Zero errors

- [ ] **Step 3: Test build**

```bash
cd /Users/jimseiwert/repos/context-stream && npm run build 2>&1 | tail -20
```

Expected: Build succeeds (exit 0), no compilation errors

- [ ] **Step 4: Final commit**

```bash
git add src/app/\(authenticated\)/dashboard/page.tsx
git commit -m "feat(shell): add dashboard page with stat card shells"
```

### Task 10: Push and close issue

- [ ] **Step 1: Push branch**

```bash
git push origin HEAD
```

- [ ] **Step 2: Verify the app loads in dev**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000/dashboard | head -5
```

Expected: HTML response (will redirect to login since unauthenticated — that's correct)

- [ ] **Step 3: Close GitHub issue #20 after PR merges**

Mark https://github.com/jimseiwert/context-stream/issues/20 as complete.

---

## Summary

| Task | Files Created/Modified |
|---|---|
| 1 | `globals.css` |
| 2 | `src/contexts/shell-context.tsx` |
| 3 | `src/components/layout/app-shell.tsx` |
| 4 | `src/app/(authenticated)/layout.tsx` |
| 5 | `src/components/layout/app-sidebar.tsx` |
| 6 | `src/components/layout/app-topbar.tsx` |
| 7 | `src/components/layout/command-palette.tsx`, `src/components/ui/command.tsx` |
| 8 | `src/components/layout/coming-soon.tsx` + 12 route stubs |
| 9 | `src/app/(authenticated)/dashboard/page.tsx` |
