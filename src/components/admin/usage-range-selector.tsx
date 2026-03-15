"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

interface UsageRangeSelectorProps {
  current: string;
}

export function UsageRangeSelector({ current }: UsageRangeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(range: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: "0.5rem",
        border: "1px solid var(--app-border, rgba(255,255,255,0.08))",
        overflow: "hidden",
        opacity: isPending ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => handleChange(r.value)}
          disabled={isPending}
          style={{
            fontSize: "0.72rem",
            fontWeight: r.value === current ? 600 : 400,
            padding: "0.3rem 0.75rem",
            border: "none",
            borderRight:
              r.value !== "90d"
                ? "1px solid var(--app-border, rgba(255,255,255,0.08))"
                : "none",
            background:
              r.value === current
                ? "rgba(16,185,129,0.12)"
                : "transparent",
            color:
              r.value === current
                ? "var(--app-accent-green)"
                : "var(--app-text-muted)",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
