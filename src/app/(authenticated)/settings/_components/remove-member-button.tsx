"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  workspaceId: string;
  userId: string;
  memberName: string;
}

export function RemoveMemberButton({ workspaceId, userId, memberName }: Props) {
  const router = useRouter();

  async function handleRemove() {
    if (!confirm(`Remove ${memberName} from this workspace?`)) return;

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${userId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to remove member");
      }

      toast.success(`${memberName} removed from workspace`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <button
      onClick={handleRemove}
      className="text-xs px-2 py-1 rounded border transition-colors"
      style={{
        borderColor: "var(--app-accent-red)",
        color: "var(--app-accent-red)",
      }}
    >
      Remove
    </button>
  );
}
