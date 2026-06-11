"use client";

import { useMemo, useState } from "react";
import type { StoredEntry } from "@/types";
import { calculateCoOccurrences } from "@/lib/insightUtils";
import type { CoOccurrence } from "@/lib/insightUtils";
import { CollapsibleSection } from "@/components/cycleinsights/shared/CollapsibleSection";
import { BuildingInsightPlaceholder } from "./BuildingInsightPlaceholder";

// ============================================
// CO-OCCURRENCE SECTION (All Insights Version)
// Shows symptoms and events that tend to appear together
// Uses time-based threshold instead of cycle count
// ============================================

interface CoOccurrenceSectionProps {
  entries: StoredEntry[];
  uniqueDaysLogged: number;
  defaultExpanded?: boolean;
}

export function CoOccurrenceSection({ entries, uniqueDaysLogged, defaultExpanded = true }: CoOccurrenceSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const coOccurrences = useMemo(() => {
    return calculateCoOccurrences(entries);
  }, [entries]);

  const needsMoreData = uniqueDaysLogged < 14;

  // No co-occurrences found (but has enough data)
  if (!needsMoreData && coOccurrences.length === 0) {
    return (
      <CollapsibleSection
        title="What Happens Together"
        helpText="Shows symptoms and medications that frequently appear on the same day. These patterns may help you notice connections."
        defaultExpanded={defaultExpanded}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        }
      >
        <div className="text-center py-6 text-app-gray">
          <p className="text-sm">No strong co-occurrences yet</p>
          <p className="text-xs mt-1">Events that frequently appear together will show here</p>
        </div>
      </CollapsibleSection>
    );
  }

  const displayedPairs = showAll ? coOccurrences : coOccurrences.slice(0, 4);
  const hasMore = coOccurrences.length > 4;

  return (
    <CollapsibleSection
      title="What Happens Together"
      badge={!needsMoreData && coOccurrences.length > 0 ? `${coOccurrences.length} pairs` : undefined}
      helpText="Shows symptoms and medications that frequently appear on the same day. These patterns may help you notice connections."
      defaultExpanded={defaultExpanded}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      }
    >
      {needsMoreData ? (
        <BuildingInsightPlaceholder
          uniqueDaysLogged={uniqueDaysLogged}
          title="Finding your connections"
          subtitle="See which symptoms and medications tend to appear together on the same days."
        />
      ) : (
      <>
      {/* Intro text */}
      <p className="text-sm text-app-gray mb-4">
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
          className="w-full py-2 mt-3 text-sm font-medium text-app-teal hover:text-app-teal/80 transition-colors"
        >
          {showAll
            ? "Show less"
            : `Show ${coOccurrences.length - 4} more`
          }
        </button>
      )}

      {/* Disclaimer */}
      <div className="bg-app-cream/50 rounded-lg p-3 mt-4">
        <p className="text-xs text-app-gray">
          These patterns show what occurs together, not what causes what. You might find it
          helpful to notice these connections in your own experience.
        </p>
      </div>
      </>
      )}
    </CollapsibleSection>
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

  // Desktop: hover + click, Mobile: only click
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
          {/* Count - moved above items */}
          <div className="text-center mb-3">
            <p className="text-lg font-bold text-app-charcoal">{pair.coOccurrenceCount}× together</p>
          </div>

          {/* Mobile: Vertical Items Display */}
          <div className="flex flex-col items-center gap-1 md:hidden">
            {/* Item 1 */}
            <div className="flex items-center gap-1.5 bg-app-cream/50 rounded-full px-2.5 py-1">
              <span className="text-base">{getTypeIcon(pair.item1.type)}</span>
              <span className="text-xs font-semibold text-app-charcoal">{pair.item1.name}</span>
            </div>

            {/* Arrow */}
            <span className="text-sm text-app-gray">{showDirectionalArrow ? "↓" : "↕"}</span>

            {/* Item 2 */}
            <div className="flex items-center gap-1.5 bg-app-cream/50 rounded-full px-2.5 py-1">
              <span className="text-base">{getTypeIcon(pair.item2.type)}</span>
              <span className="text-xs font-semibold text-app-charcoal">{pair.item2.name}</span>
            </div>
          </div>

          {/* Desktop: Horizontal Items Display */}
          <div className="hidden md:flex items-center justify-center gap-2">
            {/* Item 1 */}
            <div className="flex items-center gap-1.5 bg-app-cream/50 rounded-full px-2.5 py-1">
              <span className="text-base">{getTypeIcon(pair.item1.type)}</span>
              <span className="text-xs font-semibold text-app-charcoal">{pair.item1.name}</span>
            </div>

            {/* Arrow */}
            <span className="text-sm text-app-gray">{showDirectionalArrow ? "↔" : "↔"}</span>

            {/* Item 2 */}
            <div className="flex items-center gap-1.5 bg-app-cream/50 rounded-full px-2.5 py-1">
              <span className="text-base">{getTypeIcon(pair.item2.type)}</span>
              <span className="text-xs font-semibold text-app-charcoal">{pair.item2.name}</span>
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
