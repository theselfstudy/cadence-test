"use client";

import type { ActiveFilter } from "@/types";
import { getCategoryIcon } from "@/lib/filterUtils";

interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (filter: ActiveFilter) => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto px-2 py-1 scrollbar-hide">
    <span className="text-sm text-app-gray shrink-0">Active:</span>
    {filters.map((filter, index) => (
      <span
        key={`${filter.category}-${filter.type}-${filter.value}-${index}`}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs
                  bg-app-teal/10 text-app-teal rounded-full
                  border border-app-teal/20 shrink-0"
      >
        <span>{getCategoryIcon(filter.category)}</span>
        <span className="max-w-[120px] truncate">{filter.label}</span>
        <button
          onClick={() => onRemove(filter)}
          className="ml-0.5 p-0.5 rounded-full hover:bg-app-teal/20 transition-colors"
          aria-label={`Remove ${filter.label} filter`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>
    ))}

    {filters.length > 1 && (
      <button
        onClick={onClearAll}
        className="text-xs text-app-red hover:text-app-red/80 transition-colors
                  underline underline-offset-2 shrink-0"
      >
        Clear All
      </button>
    )}
  </div>
  );
}