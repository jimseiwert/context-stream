"use client";

import { useState } from "react";
import { Activity, Settings, Database, Flag } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "health", label: "Health", icon: <Activity size={13} /> },
  { id: "embedding", label: "Embedding Config", icon: <Settings size={13} /> },
  { id: "vectorstore", label: "Vector Store", icon: <Database size={13} /> },
  { id: "flags", label: "Feature Flags", icon: <Flag size={13} /> },
];

interface SystemTabsProps {
  children: Record<string, React.ReactNode>;
  isSuperAdmin: boolean;
}

export function SystemTabs({ children, isSuperAdmin }: SystemTabsProps) {
  const [activeTab, setActiveTab] = useState("health");

  const visibleTabs = TABS.filter(
    (t) => t.id !== "flags" || isSuperAdmin
  );

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
