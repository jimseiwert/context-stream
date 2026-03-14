// Toast usage in any page/component: import { toast } from "sonner"

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
