"use client";

import { ShellProvider } from "@/contexts/shell-context";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { CommandPalette } from "./command-palette";
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

      <CommandPalette />
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
