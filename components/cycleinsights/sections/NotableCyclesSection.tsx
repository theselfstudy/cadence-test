// /components/cycleinsights/sections/NotableCyclesSection.tsx
"use client";

import { useMemo, useState } from "react";
import type { StoredEntry } from "@/types";
import type { DetectedCycle } from "@/lib/monthlyUtils";
import {
  calculateNotableCycles,
  calculateConsistentPatterns,
} from "@/lib/insightUtils";
import type { NotableReason, NotableCycle } from "@/lib/insightUtils";

// ============================================
// NOTABLE CYCLES SECTION
// Shows cycles that differed from the user's usual pattern
// Displayed as 2x2 snapshot cards with expandable details
// ============================================

interface NotableCyclesSectionProps {
  entries: StoredEntry[];
  cycles: DetectedCycle[];
}

export function NotableCyclesSection({ entries, cycles }: NotableCyclesSectionProps) {
  const completeCycles = useMemo(() => {
    return cycles.filter((c) => !c.isOngoing && c.length !== null);
  }, [cycles]);

  const consistentPatterns = useMemo(() => {
    return calculateConsistentPatterns(entries, cycles);
  }, [entries, cycles]);

  const notableCycles = useMemo(() => {
    return calculateNotableCycles(cycles, entries, consistentPatterns);
  }, [cycles, entries, consistentPatterns]);

  // Calculate average cycle length for display
  const avgCycleLength = useMemo(() => {
    if (completeCycles.length === 0) return null;
    const lengths = completeCycles.map((c) => c.length!);
    return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  }, [completeCycles]);

  // Early data state
  if (completeCycles.length < 2) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">📌</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">More data needed</p>
        <p className="text-xs text-app-gray">
          Keep logging! Any notable observations will appear after {2 - completeCycles.length}+ complete cycle{2 - completeCycles.length !== 1 ? "s" : ""}
          {/* {2 - completeCycles.length !== 1 ? "s" : ""} to see notable observations */}
        </p>

        <div className="flex items-center justify-center gap-1 mt-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < completeCycles.length ? "bg-app-teal" : "bg-app-border"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // No notable cycles found
  if (notableCycles.length === 0) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">📝</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          All cycles within your usual range
        </p>
        <p className="text-xs text-app-gray">
          Your recent cycles have been consistent with your typical patterns
        </p>
      </div>
    );
  }

  // Get cycle length from the cycle data
  const getCycleLength = (cycleIndex: number): number | null => {
    const cycle = completeCycles[cycleIndex - 1];
    return cycle?.length ?? null;
  };

  // Get cycle date range
  const getCycleDateRange = (cycleIndex: number): { start: string; end: string | null } | null => {
    const cycle = completeCycles[cycleIndex - 1];
    if (!cycle) return null;
    return { start: cycle.startDate, end: cycle.endDate };
  };

  return (
    <div className="space-y-4">
      {/* 2x2 Grid of Snapshot Cards */}
      <div className="grid grid-cols-2 gap-3">
        {notableCycles.slice(0, 4).map((cycle) => (
          <NotableCycleCard
            key={`cycle-${cycle.cycleIndex}`}
            cycle={cycle}
            cycleLength={getCycleLength(cycle.cycleIndex)}
            avgCycleLength={avgCycleLength}
            dateRange={getCycleDateRange(cycle.cycleIndex)}
          />
        ))}
      </div>

      {/* Show more indicator if there are additional cycles */}
      {notableCycles.length > 4 && (
        <p className="text-xs text-app-gray text-center">
          Showing most recent 4 of {notableCycles.length} notable cycles
        </p>
      )}

      {/* Reassuring footer */}
      <div className="bg-app-cream/50 rounded-lg p-3">
        <p className="text-xs text-app-gray">
          💡 Cycles naturally vary from month to month. These are observations noting
          differences from usual patterns.
        </p>
      </div>
    </div>
  );
}

// ============================================
// HELPER: Format date for display
// ============================================

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================
// NOTABLE CYCLE CARD
// ============================================

interface NotableCycleCardProps {
  cycle: NotableCycle;
  cycleLength: number | null;
  avgCycleLength: number | null;
  dateRange: { start: string; end: string | null } | null;
}

function NotableCycleCard({ cycle, cycleLength, avgCycleLength, dateRange }: NotableCycleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Desktop: hover + click
  // Mobile: only click
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const showContent = isDesktop ? isExpanded || isHovered : isExpanded;

  const getReasonIcon = (type: NotableReason["type"]) => {
    switch (type) {
      case "length_long":
        return "📅";
      case "length_short":
        return "📅";
      case "missing_symptom":
        return "➖";
      case "new_symptom":
        return "🏷️";
      case "intensity_change":
        return "📊";
      default:
        return "•";
    }
  };

  const getAccentColor = () => {
    const hasLengthChange = cycle.reasons.some(
      (r) => r.type === "length_long" || r.type === "length_short"
    );
    return hasLengthChange ? "bg-app-charcoal" : "bg-app-teal";
  };

  const getBorderColor = () => {
    const hasLengthChange = cycle.reasons.some(
      (r) => r.type === "length_long" || r.type === "length_short"
    );
    return hasLengthChange ? "border-app-charcoal" : "border-app-teal";
  };

  const displayedReasons = showContent ? cycle.reasons : cycle.reasons.slice(0, 1);
  const hasMoreReasons = cycle.reasons.length > 1;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full text-left bg-app-white rounded-xl border-2 shadow-sm overflow-hidden transition-all duration-200 ${
          showContent
            ? `${getBorderColor()} shadow-md`
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Accent bar */}
        <div className={`h-1 ${getAccentColor()}`} />

        <div className="p-3">
          {/* Header: Month + Cycle # */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
                Cycle {cycle.cycleIndex}
              </p>
              <p className="text-sm font-semibold text-app-charcoal">{cycle.monthLabel}</p>
              {cycleLength && (
                <p className="text-xs text-app-gray mt-0.5">
                  {cycleLength} days
                  {avgCycleLength && cycleLength !== avgCycleLength && (
                    <span className="text-app-gray/70"> (avg: {avgCycleLength})</span>
                  )}
                </p>
              )}
            </div>
            <svg
              className={`w-4 h-4 text-app-gray transition-transform flex-shrink-0 ${
                showContent ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Observations - always show first 2 */}
          <div className="space-y-1 pt-2 border-t border-app-border/50">
            {displayedReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-xs flex-shrink-0 mt-0.5">{getReasonIcon(reason.type)}</span>
                <p className="text-xs text-app-charcoal leading-tight">{reason.description}</p>
              </div>
            ))}
            {!showContent && hasMoreReasons && (
              <p className="text-xs text-app-gray italic">+{cycle.reasons.length - 1} more</p>
            )}
          </div>
          {/* Expanded Content */}
          {showContent && (
            <div
              className={`overflow-hidden transition-[max-height,margin,padding] duration-300 ease-in-out
                ${showContent
                  ? "max-h-[1000px] mt-3 pt-3 border-t border-app-border"
                  : "max-h-0 mt-0 pt-0 border-0"
                } bg-app-cream/5 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg md:mx-0 md:mb-0 md:px-0 md:pb-0 md:bg-transparent`}
            >
              {/* Additional reasons */}
              {hasMoreReasons && (
                <div className="space-y-1 mt-1">
                  {cycle.reasons.slice(displayedReasons.length).map((reason, idx) => (
                    <div key={idx + displayedReasons.length} className="flex items-start gap-1.5">
                      <span className="text-xs flex-shrink-0 mt-0.5">{getReasonIcon(reason.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-app-charcoal leading-tight">{reason.description}</p>
                        {reason.detail && (
                          <p className="text-xs text-app-gray mt-0.5">{reason.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show details for first reason if any */}
              {cycle.reasons[0].detail && (
                <div className="space-y-1 mt-2 pt-2 border-t border-app-border/30">
                  <p className="text-xs text-app-gray">
                    {getReasonIcon(cycle.reasons[0].type)} {cycle.reasons[0].detail}
                  </p>
                </div>
              )}

              {/* Date range */}
              {dateRange && (
                <div className="mt-3 pt-2 border-t border-app-border/50">
                  <div className="text-xs">
                    <span className="text-app-gray">Date range:</span>
                    <p className="font-medium text-app-charcoal">
                      {formatDate(dateRange.start)}
                      {dateRange.end && ` – ${formatDate(dateRange.end)}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

          )}

        </div>
      </button>
    </div>
  );
}