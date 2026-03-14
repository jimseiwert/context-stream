"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, ChevronDown } from "lucide-react";

interface Source {
  id: string;
  name: string;
  type: string;
}

interface DocumentsFiltersProps {
  sources: Source[];
  currentSourceId: string;
  currentType: string;
  currentQ: string;
}

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "page", label: "Web pages" },
  { value: "document", label: "Documents" },
];

export function DocumentsFilters({
  sources,
  currentSourceId,
  currentType,
  currentQ,
}: DocumentsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset to first page on filter change
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--app-text-muted)" }}
        />
        <input
          type="search"
          placeholder="Search by name..."
          defaultValue={currentQ}
          onChange={(e) => updateParam("q", e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md outline-none"
          style={{
            background: "var(--app-card-bg, rgba(255,255,255,0.04))",
            border: "1px solid var(--app-card-border)",
            color: "var(--app-text-primary)",
          }}
        />
      </div>

      {/* Source filter */}
      <div className="relative">
        <select
          value={currentSourceId}
          onChange={(e) => updateParam("sourceId", e.target.value)}
          className="appearance-none pr-8 pl-3 py-1.5 text-sm rounded-md outline-none cursor-pointer"
          style={{
            background: "var(--app-card-bg, rgba(255,255,255,0.04))",
            border: "1px solid var(--app-card-border)",
            color: "var(--app-text-primary)",
          }}
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--app-text-muted)" }}
        />
      </div>

      {/* Type filter chips */}
      <div className="flex items-center gap-1.5">
        {TYPE_OPTIONS.map((opt) => {
          const isActive = currentType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateParam("type", opt.value)}
              className="px-3 py-1.5 text-xs rounded-full transition-all"
              style={{
                background: isActive
                  ? "rgba(16,185,129,0.12)"
                  : "var(--app-card-bg, rgba(255,255,255,0.04))",
                border: isActive
                  ? "1px solid rgba(16,185,129,0.3)"
                  : "1px solid var(--app-card-border)",
                color: isActive
                  ? "var(--app-accent-green, #10b981)"
                  : "var(--app-text-secondary)",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
