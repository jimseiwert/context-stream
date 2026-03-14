"use client";

// Search Filters Component
// Client component: source selector, collection selector, BM25/vector weight sliders.
// All selections update URL search params.

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SourceOption {
  id: string;
  name: string;
}

interface CollectionOption {
  id: string;
  name: string;
}

interface SearchFiltersProps {
  sources: SourceOption[];
  collections: CollectionOption[];
}

export function SearchFilters({ sources, collections }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "__all__") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset pagination
      params.delete("offset");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const bm25Weight = parseFloat(searchParams.get("bm25Weight") ?? "0.3");
  const vectorWeight = parseFloat(searchParams.get("vectorWeight") ?? "0.7");
  const selectedSource = searchParams.get("sourceIds") ?? "";
  const selectedCollection = searchParams.get("collectionId") ?? "";

  const handleWeightChange = (type: "bm25" | "vector", raw: string) => {
    const val = parseFloat(raw);
    if (isNaN(val)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("bm25Weight", type === "bm25" ? val.toFixed(2) : (1 - val).toFixed(2));
    params.set(
      "vectorWeight",
      type === "vector" ? val.toFixed(2) : (1 - val).toFixed(2)
    );
    params.delete("offset");
    router.push(`?${params.toString()}`);
  };

  return (
    <aside className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Filters</h3>

        {/* Source selector */}
        {sources.length > 0 && (
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Source
            </Label>
            <Select
              value={selectedSource || "__all__"}
              onValueChange={(v) => updateParam("sourceIds", v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Collection selector */}
        {collections.length > 0 && (
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Collection
            </Label>
            <Select
              value={selectedCollection || "__all__"}
              onValueChange={(v) => updateParam("collectionId", v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All collections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All collections</SelectItem>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Weight sliders */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Search Weights</h3>

        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <Label className="text-xs text-muted-foreground">BM25 (keyword)</Label>
            <span className="text-xs font-mono text-muted-foreground">
              {(bm25Weight * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={bm25Weight}
            onChange={(e) => handleWeightChange("bm25", e.target.value)}
            className="w-full accent-primary"
            aria-label="BM25 weight"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <Label className="text-xs text-muted-foreground">
              Vector (semantic)
            </Label>
            <span className="text-xs font-mono text-muted-foreground">
              {(vectorWeight * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={vectorWeight}
            onChange={(e) => handleWeightChange("vector", e.target.value)}
            className="w-full accent-primary"
            aria-label="Vector weight"
          />
        </div>
      </div>
    </aside>
  );
}
