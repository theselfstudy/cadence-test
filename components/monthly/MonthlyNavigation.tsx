"use client";

import { useMemo } from "react";
import type { MonthRange } from "@/lib/monthlyUtils";

// ============================================
// MONTHLY NAVIGATION
// Prev/Next month buttons with month label display
// Limited to months with data
// ============================================

interface MonthlyNavigationProps {
  /** Current month range being displayed */
  monthRange: MonthRange;
  /** Current month offset (0 = current month, -1 = last month, etc.) */
  monthOffset: number;
  /** Whether user can navigate to next month */
  canGoNext: boolean;
  /** Whether user can navigate to previous month */
  canGoPrev: boolean;
  /** Callback when navigating to next month */
  onNextMonth: () => void;
  /** Callback when navigating to previous month */
  onPrevMonth: () => void;
  /** Callback when jumping to current month */
  onCurrentMonth: () => void;
  /** Whether there's data in the current month */
  hasDataThisMonth: boolean;
}

export function MonthlyNavigation({
  monthRange,
  monthOffset,
  canGoNext,
  canGoPrev,
  onNextMonth,
  onPrevMonth,
  onCurrentMonth,
  hasDataThisMonth,
}: MonthlyNavigationProps) {
  // Determine if this is current month for label
  const isCurrentMonth = monthOffset === 0;
  const isLastMonth = monthOffset === -1;

  const monthLabel = useMemo(() => {
    if (isCurrentMonth) return "This Month";
    if (isLastMonth) return "Last Month";
    if (monthOffset === -2) return "2 Months Ago";
    return `${Math.abs(monthOffset)} Months Ago`;
  }, [monthOffset, isCurrentMonth, isLastMonth]);

  // Format date range for display
  const dateRangeLabel = useMemo(() => {
    const startDay = monthRange.start.getDate();
    const endDay = monthRange.end.getDate();
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthName = monthNames[monthRange.month];
    return `${monthName} ${startDay} - ${monthName} ${endDay}, ${monthRange.year}`;
  }, [monthRange]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-app-white rounded-xl border border-app-border shadow-sm">
      {/* Month Info */}
      <div className="text-center sm:text-left">
        <h2 className="text-lg font-semibold text-app-charcoal">{monthLabel}</h2>
        <p className="text-sm text-app-gray">{monthRange.label}</p>
        <p className="text-xs text-app-gray/70 mt-0.5">{dateRangeLabel}</p>
        {!hasDataThisMonth && (
          <p className="text-xs text-app-gray/70 mt-1 italic">No entries this month</p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-2">
        {/* Previous Month */}
        <button
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoPrev
              ? "bg-app-cream text-app-charcoal hover:bg-app-border"
              : "bg-app-cream/50 text-app-gray/50 cursor-not-allowed"
          }`}
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Jump to Current Month (shown when not on current month) */}
        {!isCurrentMonth && (
          <button
            onClick={onCurrentMonth}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-app-teal/10 text-app-teal hover:bg-app-teal/20 transition-colors"
          >
            Today
          </button>
        )}

        {/* Next Month */}
        <button
          onClick={onNextMonth}
          disabled={!canGoNext}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoNext
              ? "bg-app-cream text-app-charcoal hover:bg-app-border"
              : "bg-app-cream/50 text-app-gray/50 cursor-not-allowed"
          }`}
          aria-label="Next month"
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