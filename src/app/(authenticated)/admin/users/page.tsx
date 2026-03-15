// Admin Users Page — Server Component
// Lists all users with workspace count, subscription, and management actions

import { db } from "@/lib/db";
import { users, workspaces, subscriptions, sessions } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, desc, count } from "drizzle-orm";
import { Users } from "lucide-react";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { UserToggleButton } from "@/components/admin/user-toggle-button";
import { ImpersonateButton } from "@/components/admin/impersonate-button";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null | undefined): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, { bg: string; color: string }> = {
    SUPER_ADMIN: {
      bg: "rgba(16,185,129,0.12)",
      color: "var(--app-accent-green)",
    },
    ADMIN: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
    USER: { bg: "rgba(107,114,128,0.12)", color: "#9ca3af" },
  };
  const style = colorMap[role] ?? colorMap.USER;

  return (
    <span
      style={{
        fontSize: "0.65rem",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.06em",
        background: style.bg,
        color: style.color,
        borderRadius: "9999px",
        padding: "0.15rem 0.5rem",
      }}
    >
      {role.replace("_", " ")}
    </span>
  );
}

function StatusDot({ emailVerified }: { emailVerified: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.5rem",
        height: "0.5rem",
        borderRadius: "50%",
        background: emailVerified ? "var(--app-accent-green)" : "#ef4444",
        flexShrink: 0,
      }}
      title={emailVerified ? "Active" : "Disabled"}
    />
  );
}

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const currentUserRole = (session.user as { role?: string } | undefined)
    ?.role ?? "USER";

  // Fetch all users with workspace counts and subscriptions
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Enrich each user
  const enriched = await Promise.all(
    allUsers.map(async (u) => {
      const [wsResult] = await db
        .select({ count: count() })
        .from(workspaces)
        .where(eq(workspaces.ownerId, u.id));

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, u.id),
        columns: { planTier: true, status: true },
      });

      const latestSession = await db.query.sessions.findFirst({
        where: eq(sessions.userId, u.id),
        columns: { updatedAt: true },
        orderBy: [desc(sessions.updatedAt)],
      });

      return {
        ...u,
        workspaceCount: Number(wsResult?.count ?? 0),
        planTier: subscription?.planTier ?? null,
        lastActiveAt: latestSession?.updatedAt ?? null,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2rem",
            height: "2rem",
            borderRadius: "0.5rem",
            background: "rgba(16,185,129,0.1)",
            color: "var(--app-accent-green)",
            flexShrink: 0,
          }}
        >
          <Users size={16} />
        </div>
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--app-text-primary)" }}
          >
            User Management
          </h1>
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
            {enriched.length} users registered
          </p>
        </div>
      </div>

      {/* Users table */}
      <div className="app-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom:
                    "1px solid var(--app-border, rgba(255,255,255,0.06))",
                }}
              >
                {[
                  "User",
                  "Role",
                  "Workspaces",
                  "Plan",
                  "Joined",
                  "Last Active",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left" as const,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      color: "var(--app-text-muted)",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.map((user, idx) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom:
                      idx < enriched.length - 1
                        ? "1px solid var(--app-border, rgba(255,255,255,0.04))"
                        : "none",
                  }}
                >
                  {/* User avatar + name + email */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                      }}
                    >
                      <StatusDot emailVerified={user.emailVerified} />
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt={user.name}
                          style={{
                            width: "1.75rem",
                            height: "1.75rem",
                            borderRadius: "50%",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "1.75rem",
                            height: "1.75rem",
                            borderRadius: "50%",
                            background:
                              "rgba(16,185,129,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color: "var(--app-accent-green)",
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            color: "var(--app-text-primary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {user.name}
                        </p>
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--app-text-muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                    <RoleBadge role={user.role} />
                  </td>

                  {/* Workspace count */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--app-text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {user.workspaceCount}
                    </span>
                  </td>

                  {/* Plan */}
                  <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: user.planTier
                          ? "var(--app-text-secondary)"
                          : "var(--app-text-muted)",
                      }}
                    >
                      {user.planTier ?? "—"}
                    </span>
                  </td>

                  {/* Joined */}
                  <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--app-text-muted)",
                      }}
                    >
                      {formatDate(user.createdAt)}
                    </span>
                  </td>

                  {/* Last active */}
                  <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--app-text-muted)",
                      }}
                    >
                      {formatDate(user.lastActiveAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "nowrap",
                      }}
                    >
                      <UserRoleSelect
                        userId={user.id}
                        currentRole={user.role}
                        currentUserRole={currentUserRole}
                      />
                      <UserToggleButton
                        userId={user.id}
                        emailVerified={user.emailVerified}
                      />
                      {currentUserRole === "SUPER_ADMIN" && (
                        <ImpersonateButton
                          userId={user.id}
                          userName={user.name}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {enriched.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "var(--app-text-muted)",
                      fontSize: "0.875rem",
                    }}
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
