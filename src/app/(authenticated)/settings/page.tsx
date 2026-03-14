// Settings Page — Workspace info, members, and API key management
// Server Component: fetches data server-side, delegates mutations to client components

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ApiKeyManager } from "./_components/api-key-manager";
import { InviteMemberForm } from "./_components/invite-member-form";
import { RemoveMemberButton } from "./_components/remove-member-button";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userId = session.user.id;

  // Fetch the user's primary (personal) workspace — first owned workspace
  const userWorkspaces = await db.query.workspaces.findMany({
    where: eq(workspaces.ownerId, userId),
    with: {
      members: {
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
    orderBy: (w, { asc }) => asc(w.createdAt),
  });

  // Personal workspace is the first one created by this user
  const personalWorkspace = userWorkspaces[0] ?? null;

  // Fetch all workspaces the user is a member of (non-owned)
  const memberEntries = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    with: {
      workspace: {
        with: {
          members: {
            with: {
              user: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
  });

  const ownedIds = new Set(userWorkspaces.map((w) => w.id));
  const memberWorkspaces = memberEntries
    .map((e) => e.workspace)
    .filter((w) => !ownedIds.has(w.id));

  // Fetch API keys (without the full key value — use prefix)
  const rawKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
    columns: {
      id: true,
      name: true,
      key: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: (k, { desc }) => desc(k.createdAt),
  });

  const maskedKeys = rawKeys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.key.substring(0, 8),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page header */}
      <div>
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--app-text-primary)" }}
        >
          Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--app-text-secondary)" }}>
          Manage your workspaces and API keys.
        </p>
      </div>

      {/* Personal Workspace */}
      {personalWorkspace && (
        <section className="space-y-4">
          <h2 className="section-label">Personal Workspace</h2>

          <div className="app-card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                  Name
                </p>
                <p className="text-sm font-medium" style={{ color: "var(--app-text-primary)" }}>
                  {personalWorkspace.name}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--app-text-muted)" }}>
                  Slug
                </p>
                <p
                  className="text-sm font-mono"
                  style={{ color: "var(--app-text-secondary)" }}
                >
                  {personalWorkspace.slug}
                </p>
              </div>
            </div>

            {/* Members */}
            <div>
              <p className="section-label mb-3">Members</p>
              <div className="space-y-2">
                {personalWorkspace.members.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--app-text-muted)" }}>
                    No additional members.
                  </p>
                ) : (
                  personalWorkspace.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between py-2 border-t"
                      style={{ borderColor: "var(--app-card-border)" }}
                    >
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--app-text-primary)" }}
                        >
                          {m.user.name || m.user.email}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--app-text-muted)" }}
                        >
                          {m.user.email} &middot; {m.role}
                          {!m.joinedAt && (
                            <span
                              className="ml-1"
                              style={{ color: "var(--app-accent-amber)" }}
                            >
                              (pending)
                            </span>
                          )}
                        </p>
                      </div>
                      <RemoveMemberButton
                        workspaceId={personalWorkspace.id}
                        userId={m.userId}
                        memberName={m.user.name || m.user.email}
                      />
                    </div>
                  ))
                )}
              </div>
              <InviteMemberForm workspaceId={personalWorkspace.id} />
            </div>
          </div>
        </section>
      )}

      {/* Other owned workspaces */}
      {userWorkspaces.length > 1 && (
        <section className="space-y-4">
          <h2 className="section-label">Other Workspaces</h2>
          <div className="space-y-4">
            {userWorkspaces.slice(1).map((ws) => (
              <div key={ws.id} className="app-card p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: "var(--app-text-muted)" }}
                    >
                      Name
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--app-text-primary)" }}
                    >
                      {ws.name}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: "var(--app-text-muted)" }}
                    >
                      Slug
                    </p>
                    <p
                      className="text-sm font-mono"
                      style={{ color: "var(--app-text-secondary)" }}
                    >
                      {ws.slug}
                    </p>
                  </div>
                </div>

                {ws.members.length > 0 && (
                  <div>
                    <p className="section-label mb-3">Members</p>
                    <div className="space-y-2">
                      {ws.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-2 border-t"
                          style={{ borderColor: "var(--app-card-border)" }}
                        >
                          <div className="min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: "var(--app-text-primary)" }}
                            >
                              {m.user.name || m.user.email}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--app-text-muted)" }}
                            >
                              {m.user.email} &middot; {m.role}
                              {!m.joinedAt && (
                                <span
                                  className="ml-1"
                                  style={{ color: "var(--app-accent-amber)" }}
                                >
                                  (pending)
                                </span>
                              )}
                            </p>
                          </div>
                          <RemoveMemberButton
                            workspaceId={ws.id}
                            userId={m.userId}
                            memberName={m.user.name || m.user.email}
                          />
                        </div>
                      ))}
                    </div>
                    <InviteMemberForm workspaceId={ws.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Workspaces where user is a member */}
      {memberWorkspaces.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-label">Joined Workspaces</h2>
          <div className="space-y-4">
            {memberWorkspaces.map((ws) => (
              <div key={ws.id} className="app-card p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: "var(--app-text-muted)" }}
                    >
                      Name
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--app-text-primary)" }}
                    >
                      {ws.name}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: "var(--app-text-muted)" }}
                    >
                      Slug
                    </p>
                    <p
                      className="text-sm font-mono"
                      style={{ color: "var(--app-text-secondary)" }}
                    >
                      {ws.slug}
                    </p>
                  </div>
                </div>
                <p
                  className="text-xs mt-3"
                  style={{ color: "var(--app-text-muted)" }}
                >
                  {ws.members.length} member{ws.members.length !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* API Keys */}
      <section className="space-y-4">
        <h2 className="section-label">API Keys</h2>
        <ApiKeyManager initialKeys={maskedKeys} />
      </section>
    </div>
  );
}
