"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface UserToggleButtonProps {
  userId: string;
  emailVerified: boolean;
}

export function UserToggleButton({
  userId,
  emailVerified,
}: UserToggleButtonProps) {
  const [enabled, setEnabled] = useState(emailVerified);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleToggle() {
    const newVal = !enabled;
    setEnabled(newVal);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailVerified: newVal }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: { message?: string } };
          alert(data.error?.message ?? "Failed to update account status");
          setEnabled(!newVal);
          return;
        }

        router.refresh();
      } catch {
        alert("Failed to update account status");
        setEnabled(!newVal);
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      style={{
        fontSize: "0.72rem",
        fontWeight: 500,
        padding: "0.2rem 0.5rem",
        borderRadius: "0.375rem",
        border: "1px solid",
        cursor: isPending ? "wait" : "pointer",
        background: "transparent",
        borderColor: enabled
          ? "rgba(239,68,68,0.4)"
          : "rgba(34,197,94,0.4)",
        color: enabled ? "#ef4444" : "var(--app-accent-green)",
        transition: "opacity 0.15s",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {enabled ? "Disable" : "Enable"}
    </button>
  );
}
