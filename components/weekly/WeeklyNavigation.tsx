"use client";

import { useMemo } from "react";
import type { WeekRange } from "@/lib/weeklyUtils";

// ============================================
// WEEKLY NAVIGATION
// Prev/Next week buttons with date range display
// Limited to weeks with data
// ============================================

interface WeeklyNavigationProps {
  /** Current week range being displayed */
  weekRange: WeekRange;
  /** Current week offset (0 = current week, -1 = last week, etc.) */
  weekOffset: number;
  /** Earliest week offset with data */
  earliestWeekOffset: number;
  /** Callback when week changes */
  onWeekChange: (newOffset: number) => void;
  /** Whether there's data in the current week */
  hasDataThisWeek: boolean;
}

export function WeeklyNavigation({
  weekRange,
  weekOffset,
  earliestWeekOffset,
  onWeekChange,
  hasDataThisWeek,
}: WeeklyNavigationProps) {
  // Can't go forward past current week (offset 0)
  const canGoNext = weekOffset < 0;
  // Can't go back past earliest week with data
  const canGoPrev = weekOffset > earliestWeekOffset;

  // Determine if this is current week for label
  const isCurrentWeek = weekOffset === 0;
  const isLastWeek = weekOffset === -1;

  const weekLabel = useMemo(() => {
    if (isCurrentWeek) return "This Week";
    if (isLastWeek) return "Last Week";
    if (weekOffset === -2) return "2 Weeks Ago";
    return `${Math.abs(weekOffset)} Weeks Ago`;
  }, [weekOffset, isCurrentWeek, isLastWeek]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-app-white rounded-xl border border-app-border shadow-sm">
      {/* Week Info */}
      <div className="text-center sm:text-left">
        <h2 className="text-lg font-semibold text-app-charcoal">{weekLabel}</h2>
        <p className="text-sm text-app-gray">{weekRange.label}</p>
        {!hasDataThisWeek && (
          <p className="text-xs text-app-gray/70 mt-1 italic">No entries this week</p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-2">
        {/* Previous Week */}
        <button
          onClick={() => onWeekChange(weekOffset - 1)}
          disabled={!canGoPrev}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoPrev
              ? "bg-app-cream text-app-charcoal hover:bg-app-border"
              : "bg-app-cream/50 text-app-gray/50 cursor-not-allowed"
          }`}
          aria-label="Previous week"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Jump to Current Week (shown when not on current week) */}
        {!isCurrentWeek && (
          <button
            onClick={() => onWeekChange(0)}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-app-teal/10 text-app-teal hover:bg-app-teal/20 transition-colors"
          >
            Today
          </button>
        )}

        {/* Next Week */}
        <button
          onClick={() => onWeekChange(weekOffset + 1)}
          disabled={!canGoNext}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoNext
              ? "bg-app-cream text-app-charcoal hover:bg-app-border"
              : "bg-app-cream/50 text-app-gray/50 cursor-not-allowed"
          }`}
          aria-label="Next week"
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}