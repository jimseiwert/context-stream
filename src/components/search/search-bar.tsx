"use client";

// Search Bar Component
// Client component with 300ms debounce that updates ?q= in the URL.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  /** Placeholder text */
  placeholder?: string;
  /** Additional className for the wrapper */
  className?: string;
}

export function SearchBar({ placeholder = "Search your knowledge base...", className }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local value in sync when URL changes externally
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  const pushQuery = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) {
        params.set("q", q.trim());
      } else {
        params.delete("q");
      }
      // Reset to page 1 on new query
      params.delete("offset");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      pushQuery(next);
    }, 300);
  };

  const handleClear = () => {
    setValue("");
    pushQuery("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative flex items-center ${className ?? ""}`}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9 pr-9"
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
