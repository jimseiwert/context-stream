"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  workspaceId: string;
}

export function InviteMemberForm({ workspaceId }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to invite member");
      }

      toast.success(`Invitation sent to ${trimmed}`);
      setEmail("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 text-sm px-3 py-1.5 rounded-md border bg-transparent"
        style={{
          borderColor: "var(--app-card-border)",
          color: "var(--app-text-primary)",
        }}
      />
      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
        style={{ background: "var(--app-accent-green)", color: "#000" }}
      >
        {loading ? "Inviting…" : "Invite"}
      </button>
    </form>
  );
}
