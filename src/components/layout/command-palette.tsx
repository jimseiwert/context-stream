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
    <CommandDialog open={open} onOpenChange={setOpen}>
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
