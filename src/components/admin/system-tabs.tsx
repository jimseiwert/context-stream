"use client";

import { useState } from "react";
import { Activity, Settings, Database, Flag, ShieldCheck } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const ALL_TABS: Tab[] = [
  { id: "health", label: "Health", icon: <Activity size={13} /> },
  { id: "vectorstore", label: "Vector Stores", icon: <Database size={13} /> },
  { id: "flags", label: "Feature Flags", icon: <Flag size={13} /> },
  { id: "enterprise", label: "Enterprise", icon: <ShieldCheck size={13} /> },
];

interface SystemTabsProps {
  children: Record<string, React.ReactNode>;
  isSuperAdmin: boolean;
  /** Whether to show the enterprise SSO/license tab (requires valid license) */
  showEnterpriseTab?: boolean;
}

export function SystemTabs({
  children,
  isSuperAdmin,
  showEnterpriseTab = false,
}: SystemTabsProps) {
  const [activeTab, setActiveTab] = useState("health");

  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.id === "flags") return isSuperAdmin;
    if (t.id === "enterprise") return isSuperAdmin && showEnterpriseTab;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "0.125rem",
          borderBottom: "1px solid var(--app-border, rgba(255,255,255,0.06))",
          paddingBottom: "0",
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              fontSize: "0.78rem",
              fontWeight: activeTab === tab.id ? 600 : 400,
              padding: "0.5rem 0.875rem",
              borderRadius: "0.375rem 0.375rem 0 0",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--app-accent-green)"
                  : "2px solid transparent",
              background: "transparent",
              color:
                activeTab === tab.id
                  ? "var(--app-accent-green)"
                  : "var(--app-text-muted)",
              cursor: "pointer",
              transition: "color 0.15s",
              marginBottom: "-1px",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>{children[activeTab]}</div>
    </div>
  );
}
