"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface UserRoleSelectProps {
  userId: string;
  currentRole: string;
  currentUserRole: string; // the admin's own role
}

const ROLE_LABELS: Record<string, string> = {
  USER: "User",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "var(--app-accent-green)",
  ADMIN: "#f59e0b",
  USER: "var(--app-text-muted)",
};

export function UserRoleSelect({
  userId,
  currentRole,
  currentUserRole,
}: UserRoleSelectProps) {
  const [role, setRole] = useState(currentRole);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ADMIN can assign USER/ADMIN; SUPER_ADMIN can assign any
  const allowedRoles =
    currentUserRole === "SUPER_ADMIN"
      ? ["USER", "ADMIN", "SUPER_ADMIN"]
      : ["USER", "ADMIN"];

  async function handleChange(newRole: string) {
    if (newRole === role) return;
    setRole(newRole);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: { message?: string } };
          alert(data.error?.message ?? "Failed to update role");
          setRole(currentRole);
          return;
        }

        router.refresh();
      } catch {
        alert("Failed to update role");
        setRole(currentRole);
      }
    });
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      style={{
        background: "var(--app-bg-secondary, #1a1a2e)",
        border: "1px solid var(--app-border, rgba(255,255,255,0.08))",
        borderRadius: "0.375rem",
        color: ROLE_COLORS[role] ?? "var(--app-text-primary)",
        fontSize: "0.75rem",
        fontWeight: 600,
        padding: "0.2rem 0.5rem",
        cursor: isPending ? "wait" : "pointer",
        outline: "none",
      }}
    >
      {allowedRoles.map((r) => (
        <option key={r} value={r} style={{ color: ROLE_COLORS[r] }}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
