"use client";

import { useMemo } from "react";
import type { WeekStartDay } from "@/types";

// ============================================
// DAY FILTER BAR
// Day toggles (S M T W T F S) only - category filters moved to main Filters section
// ============================================

interface DayFilterBarProps {
  /** User's week start preference */
  weekStartDay: WeekStartDay;
  /** Currently selected days (empty = all days) */
  selectedDays: string[];
  /** Toggle a day on/off */
  onToggleDay: (day: string) => void;
  /** Select all days */
  onSelectAllDays: () => void;
  /** Count of entries per day for badges */
  entriesPerDay: Record<string, number>;
}

// Day abbreviations in standard order (Sunday first)
const DAYS_FROM_SUNDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FROM_MONDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Single letter abbreviations for mobile
const DAY_LETTERS: Record<string, string> = {
  Sun: "S",
  Mon: "M",
  Tue: "T",
  Wed: "W",
  Thu: "T",
  Fri: "F",
  Sat: "S",
};

export function DayFilterBar({
  weekStartDay,
  selectedDays,
  onToggleDay,
  onSelectAllDays,
  entriesPerDay,
}: DayFilterBarProps) {
  // Order days based on user preference
  const orderedDays = useMemo(() => {
    return weekStartDay === "sunday" ? DAYS_FROM_SUNDAY : DAYS_FROM_MONDAY;
  }, [weekStartDay]);

  // Check if all days are selected (or none selected = show all)
  const allDaysSelected = selectedDays.length === 0 || selectedDays.length === 7;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="text-sm text-app-gray shrink-0">Filter by day:</span>

      <div className="flex items-center gap-1 flex-wrap">
        {/* All Days Button */}
        <button
          onClick={onSelectAllDays}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            allDaysSelected
              ? "bg-app-teal text-white"
              : "bg-app-cream text-app-charcoal hover:bg-app-border"
          }`}
        >
          All
        </button>

        {/* Individual Day Buttons */}
        {orderedDays.map((day) => {
          const isSelected = selectedDays.includes(day);
          const entryCount = entriesPerDay[day] || 0;
          const hasEntries = entryCount > 0;

          return (
            <button
              key={day}
              onClick={() => onToggleDay(day)}
              className={`relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                isSelected
                  ? "bg-app-teal text-white"
                  : hasEntries
                    ? "bg-app-cream text-app-charcoal hover:bg-app-border"
                    : "bg-app-cream/50 text-app-gray hover:bg-app-cream"
              }`}
              title={`${day}${entryCount > 0 ? ` (${entryCount} entries)` : ""}`}
            >
              {/* Mobile: single letter, Desktop: 3-letter abbrev */}
              <span className="sm:hidden">{DAY_LETTERS[day]}</span>
              <span className="hidden sm:inline">{day}</span>

              {/* Entry count indicator dot */}
              {hasEntries && !isSelected && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-app-teal rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}