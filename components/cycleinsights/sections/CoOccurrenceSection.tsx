"use client";

import { useMemo, useState } from "react";
import type { StoredEntry } from "@/types";
import type { DetectedCycle } from "@/lib/monthlyUtils";
import { calculateCoOccurrences } from "@/lib/insightUtils";
import type { CoOccurrence } from "@/lib/insightUtils";

// ============================================
// CO-OCCURRENCE SECTION
// Shows symptoms and events that tend to appear together
// Displayed as 2x2 snapshot cards with expandable details
// ============================================

interface CoOccurrenceSectionProps {
  entries: StoredEntry[];
  cycles: DetectedCycle[];
}

export function CoOccurrenceSection({ entries, cycles }: CoOccurrenceSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const completeCycles = useMemo(() => {
    return cycles.filter((c) => !c.isOngoing && c.length !== null);
  }, [cycles]);

  const coOccurrences = useMemo(() => {
    return calculateCoOccurrences(entries);
  }, [entries]);

  // Early data state
  if (completeCycles.length < 2) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">🔗</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">More data needed</p>
        <p className="text-xs text-app-gray">
          Keep logging! Co-occurring events will appear after {2 - completeCycles.length}+ complete cycle{2 - completeCycles.length !== 1 ? "s" : ""}
          {/* {2 - completeCycles.length !== 1 ? "s" : ""} to see co-occurring events */}
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

  // No co-occurrences found
  if (coOccurrences.length === 0) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">🔗</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">No strong co-occurrences yet</p>
        <p className="text-xs text-app-gray">
          Events that frequently appear on the same day will show here as you log more data
        </p>
      </div>
    );
  }

  const displayedPairs = showAll ? coOccurrences : coOccurrences.slice(0, 4);
  const hasMore = coOccurrences.length > 4;

  return (
    <div className="space-y-4">
      {/* Intro text */}
      <p className="text-sm text-app-gray">
        Some symptoms and events tend to show up at the same time.
      </p>

      {/* 2x2 Grid of Snapshot Cards */}
      <div className="grid grid-cols-2 gap-3">
        {displayedPairs.map((pair) => (
          <CoOccurrenceCard key={pair.id} pair={pair} />
        ))}
      </div>

      {/* Show All / Show Less button */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm font-medium text-app-teal hover:text-app-teal/80 transition-colors"
        >
          {showAll 
            ? "Show less" 
            : `Show ${coOccurrences.length - 4} more co-occurrence${coOccurrences.length - 4 !== 1 ? 's' : ''}`
          }
        </button>
      )}

      {/* Disclaimer */}
      <div className="bg-app-cream/50 rounded-lg p-3">
        <p className="text-xs text-app-gray">
          💡 These patterns show what occurs together, not what causes what. You might find it
          helpful to notice these connections in your own experience.
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ============================================
// CO-OCCURRENCE CARD
// ============================================

interface CoOccurrenceCardProps {
  pair: CoOccurrence;
}

function CoOccurrenceCard({ pair }: CoOccurrenceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Desktop: hover + click
  // Mobile: only click
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const showContent = isDesktop ? isExpanded || isHovered : isExpanded;

  const getTypeIcon = (type: "symptom" | "medicine") => {
    return type === "symptom" ? "🏷️" : "💊";
  };

  const getAccentColor = () => {
    if (pair.item1.type === "medicine" || pair.item2.type === "medicine") {
      return "bg-app-green";
    }
    return "bg-app-teal";
  };

  const getBorderColor = () => {
    if (pair.item1.type === "medicine" || pair.item2.type === "medicine") {
      return "border-app-green";
    }
    return "border-app-teal";
  };

  const isSymptomToMedicine =
    pair.item1.type === "symptom" && pair.item2.type === "medicine";
  const isMedicineToSymptom =
    pair.item1.type === "medicine" && pair.item2.type === "symptom";
  const showDirectionalArrow = isSymptomToMedicine || isMedicineToSymptom;

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

        <div className="p-4">
          {/* Centered Items Display */}
          <div className="flex flex-col items-center text-center space-y-2">
            {/* Item 1 */}
            <div className="flex items-center gap-2">
              <span className="text-xl">{getTypeIcon(pair.item1.type)}</span>
              <span className="text-sm font-semibold text-app-charcoal">{pair.item1.name}</span>
            </div>

            {/* Arrow */}
            <span className="text-lg text-app-gray">{showDirectionalArrow ? "↓" : "↕"}</span>

            {/* Item 2 */}
            <div className="flex items-center gap-2">
              <span className="text-xl">{getTypeIcon(pair.item2.type)}</span>
              <span className="text-sm font-semibold text-app-charcoal">{pair.item2.name}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-app-border/50">
            <div className="text-center">
              <p className="text-lg font-bold text-app-charcoal">{pair.coOccurrenceCount}×</p>
              <p className="text-xs text-app-gray">together</p>
            </div>
            <div className="w-px h-8 bg-app-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-app-teal">
                {Math.round(pair.coOccurrenceRate * 100)}%
              </p>
              <p className="text-xs text-app-gray">rate</p>
            </div>
          </div>

          {/* Expand indicator */}
          <div className="flex justify-center mt-2">
            <svg
              className={`w-4 h-4 text-app-gray transition-transform ${showContent ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Expanded Content */}
          {showContent && pair.metadata && (
            <div
              className="mt-3 pt-3 border-t border-app-border/50 space-y-2 bg-app-cream/5 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg md:mx-0 md:mb-0 md:px-0 md:pb-0 md:bg-transparent"
            >
              {/* First / Last co-occurrence */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-app-gray">First together:</span>
                  <p className="font-medium text-app-charcoal">
                    {formatDate(pair.metadata.firstCoOccurrenceDate)}
                  </p>
                </div>
                <div>
                  <span className="text-app-gray">Last together:</span>
                  <p className="font-medium text-app-charcoal">
                    {formatDate(pair.metadata.lastCoOccurrenceDate)}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-app-gray italic">{pair.description}</p>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}