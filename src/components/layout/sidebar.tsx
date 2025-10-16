"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import {
  Home,
  Database,
  Search,
  Settings,
  Users,
  BarChart3,
  Shield,
  FileText,
  Plus,
  FolderKanban,
  Check,
  ChevronsUpDown
} from "lucide-react"
import { useWorkspaceContext } from "@/contexts/workspace-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Workspaces", href: "/workspaces", icon: FolderKanban },
  { name: "Sources", href: "/sources", icon: Database },
  { name: "Search", href: "/search", icon: Search },
  { name: "Settings", href: "/settings", icon: Settings },
]

const adminNavigation = [
  { name: "Admin Dashboard", href: "/admin", icon: Shield },
  { name: "Admin Sources", href: "/admin/sources", icon: Database },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Statistics", href: "/admin/stats", icon: BarChart3 },
]

interface SidebarProps {
  userRole?: "USER" | "ADMIN" | "SUPER_ADMIN"
}

export function Sidebar({ userRole = "USER" }: SidebarProps) {
  const pathname = usePathname()
  const showAdminSection = userRole === "ADMIN" || userRole === "SUPER_ADMIN"
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspaceContext()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard">
          <Logo size={32} animated={true} />
        </Link>
      </div>

      {/* Workspace Switcher */}
      <div className="border-b px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
            >
              <span className="truncate">
                {currentWorkspace?.name || "Select Workspace"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => switchWorkspace(workspace.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{workspace.name}</span>
                  {currentWorkspace?.id === workspace.id && (
                    <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/workspaces" className="cursor-pointer">
                <FolderKanban className="mr-2 h-4 w-4" />
                Manage Workspaces
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {/* Add Source Button */}
        <Button
          className="w-full justify-start mb-4"
          asChild
        >
          <Link href="/sources/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Link>
        </Button>

        {/* Main Navigation */}
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.name}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                pathname === item.href && "bg-secondary"
              )}
              asChild
            >
              <Link href={item.href}>
                <Icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          )
        })}

        {/* Admin Navigation */}
        {showAdminSection && (
          <>
            <div className="mt-6 pt-6 border-t">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase">
                Administration
              </p>
            </div>
            <div className="mt-2 space-y-1">
              {adminNavigation.map((item) => {
                const Icon = item.icon
                const showItem =
                  item.href === "/admin/users"
                    ? userRole === "SUPER_ADMIN"
                    : true

                if (!showItem) return null

                return (
                  <Button
                    key={item.name}
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      pathname === item.href && "bg-secondary"
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  </Button>
                )
              })}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>Version 1.0.0</p>
          <Link
            href="/docs"
            className="hover:text-primary transition-colors"
          >
            Documentation
          </Link>
          {" · "}
          <Link
            href="https://github.com/contextstream/contextstream"
            target="_blank"
            className="hover:text-primary transition-colors"
          >
            GitHub
          </Link>
        </div>
      </div>
    </div>
  )
}