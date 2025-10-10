"use client";

export const dynamic = "force-dynamic";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bell, Boxes, ChevronRight, Key, Shield, User } from "lucide-react";
import Link from "next/link";

const settingsLinks = [
  {
    title: "MCP Setup",
    description: "Connect ContextStream to Claude, Cursor, Windsurf, and more",
    icon: Boxes,
    href: "/settings/integrations",
    available: true,
  },
  {
    title: "API Keys",
    description: "Manage API keys for MCP server authentication",
    icon: Key,
    href: "/settings/api-keys",
    available: true,
  },
  {
    title: "Profile",
    description: "Update your profile information and preferences",
    icon: User,
    href: "/settings/profile",
    available: true,
  },
  {
    title: "Security",
    description: "Manage your password and security settings",
    icon: Shield,
    href: "/settings/security",
    available: true,
  },
  {
    title: "Notifications",
    description: "Configure notification preferences and alerts",
    icon: Bell,
    href: "/settings/notifications",
    available: true,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((link) => {
          const Icon = link.icon;

          return link.available ? (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-all cursor-pointer hover:shadow-md hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl">{link.title}</CardTitle>
                      </div>
                      <CardDescription className="pt-2">
                        {link.description}
                      </CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ) : (
            <div key={link.href}>
              <Card className="h-full transition-all opacity-50 cursor-not-allowed">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl">{link.title}</CardTitle>
                      </div>
                      <CardDescription className="pt-2">
                        {link.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
