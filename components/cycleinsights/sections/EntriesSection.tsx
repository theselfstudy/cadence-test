"use client";

import { useMemo, useState } from "react";
import type { StoredEntry } from "@/types";
import { useSettings } from "@/stores/useSettings";
import { EntryCard } from "@/components/ui/EntryCard";

// ============================================
// TYPES
// ============================================

interface EntriesSectionProps {
  entries: StoredEntry[];
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EntriesSection({ entries }: EntriesSectionProps) {
  const [visibleCount, setVisibleCount] = useState(10);
  
  // Get settings for custom products and time format
  const periodTracking = useSettings((state) => state.periodTracking);
  const timeFormat = useSettings((state) => state.timeFormat);
  
  const customProducts = useMemo(() => {
    return periodTracking?.productTracking?.customProducts || {};
  }, [periodTracking]);

  // Sort entries by date (most recent first), then by start time
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      // First sort by date descending
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // Then by start time descending
      return (b.startTime || "").localeCompare(a.startTime || "");
    });
  }, [entries]);

  const visibleEntries = sortedEntries.slice(0, visibleCount);
  const hasMore = visibleCount < sortedEntries.length;

  // No entries state
  if (entries.length === 0) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">📝</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          No entries yet
        </p>
        <p className="text-xs text-app-gray">
          Start logging to see your entries here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Intro text */}
      <p className="text-sm text-app-gray">
        All your logged entries, most recent first.
      </p>

      {/* Entry count summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-app-charcoal">
          Showing <span className="font-medium">{visibleEntries.length}</span> of{" "}
          <span className="font-medium">{sortedEntries.length}</span> entries
        </p>
      </div>

      {/* Entry cards */}
      <EntryCard
        entries={visibleEntries}
        timeFormat={timeFormat}
        customProducts={customProducts}
      />

      {/* Load more button */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 10)}
          className="w-full py-3 text-sm font-medium text-app-teal hover:text-app-teal/80 
                     bg-app-teal/5 hover:bg-app-teal/10 rounded-lg transition-colors"
        >
          Load more entries
          <span className="text-app-gray ml-1">
            ({sortedEntries.length - visibleCount} remaining)
          </span>
        </button>
      )}

      {/* All loaded indicator */}
      {!hasMore && sortedEntries.length > 10 && (
        <p className="text-center text-xs text-app-gray py-2">
          All entries loaded
        </p>
      )}
    </div>
  );
}