"use client";

import { useMemo, useState } from "react";
import type { StoredEntry } from "@/types";
import type { DetectedCycle } from "@/lib/monthlyUtils";
import { calculateEmergingPatterns } from "@/lib/insightUtils";
import type { EmergingPattern } from "@/lib/insightUtils";
import { ConsistencyRing } from "../shared/RingIndicator";

// ============================================
// EMERGING PATTERNS SECTION
// Shows occasional patterns (30-59%), recently appeared, and trends
// Organized in tabs: Occasional > Recent > Trends
// ============================================

interface EmergingPatternsSectionProps {
  entries: StoredEntry[];
  cycles: DetectedCycle[];
}

type EmergingTab = "occasional" | "recent" | "trends";

export function EmergingPatternsSection({
  entries,
  cycles,
}: EmergingPatternsSectionProps) {
  const [activeTab, setActiveTab] = useState<EmergingTab>("occasional");

  const completeCycles = useMemo(() => {
    return cycles.filter((c) => !c.isOngoing && c.length !== null);
  }, [cycles]);

  const emergingPatterns = useMemo(() => {
    return calculateEmergingPatterns(entries, cycles);
  }, [entries, cycles]);

  // Group patterns by type
  const { occasional, recentlyAppeared, trends } = useMemo(() => {
    const occasional: EmergingPattern[] = [];
    const recentlyAppeared: EmergingPattern[] = [];
    const trends: EmergingPattern[] = [];

    for (const pattern of emergingPatterns) {
      if (pattern.type === "occasional") {
        occasional.push(pattern);
      } else if (pattern.type === "new") {
        recentlyAppeared.push(pattern);
      } else if (pattern.type === "increasing" || pattern.type === "decreasing") {
        trends.push(pattern);
      }
    }

    return { occasional, recentlyAppeared, trends };
  }, [emergingPatterns]);

  // Tab configuration
  const tabs: { id: EmergingTab; label: string; count: number }[] = [
    { id: "occasional", label: "Occasional", count: occasional.length },
    { id: "recent", label: "Recent", count: recentlyAppeared.length },
    { id: "trends", label: "Trends", count: trends.length },
  ];

  // Early data state
  if (completeCycles.length < 2) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">🌱</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          More data needed
        </p>
        <p className="text-xs text-app-gray">
          Keep loggin! Emerging patterns will begin to appear after {2 - completeCycles.length}+ complete cycle{2 - completeCycles.length !== 1 ? "s" : ""}
          {/* {2 - completeCycles.length !== 1 ? "s" : ""} to see emerging patterns */}
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

  // No patterns found
  if (emergingPatterns.length === 0) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">🏷️</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          No emerging patterns yet
        </p>
        <p className="text-xs text-app-gray">
          New patterns and trends will appear here as you log more data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Intro text */}
      <p className="text-sm text-app-gray">
        Patterns that appear less frequently, have recently started, or are changing over time.
      </p>

      {/* Tab Navigation */}
      <div className="flex rounded-lg overflow-hidden border border-app-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-app-charcoal text-white"
                : "bg-white text-app-charcoal hover:bg-app-cream/50"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-app-cream text-app-gray"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === "occasional" && (
          <OccasionalView patterns={occasional} totalCycles={completeCycles.length} />
        )}
        {activeTab === "recent" && <RecentView patterns={recentlyAppeared} />}
        {activeTab === "trends" && <TrendsView patterns={trends} />}
      </div>

      {/* Info footer */}
      <p className="text-xs text-app-gray text-center pt-2">
        💡 Patterns here may become consistent over time, or they may be one-time occurrences.
      </p>
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
// HELPER: Get colors based on item type
// ============================================

function getItemTypeColors(itemType: EmergingPattern["itemType"], isPeriodRelated?: boolean) {
  if (isPeriodRelated) {
    return {
      bg: "bg-app-red/10",
      border: "border-app-red/20",
      text: "text-app-red",
      expandedBg: "bg-app-red/5",
    };
  }

  switch (itemType) {
    case "symptom":
      return {
        bg: "bg-app-teal/10",
        border: "border-app-teal/20",
        text: "text-app-teal",
        expandedBg: "bg-app-teal/5",
      };
    case "stool":
      return {
        bg: "bg-app-plumb/10",
        border: "border-app-plumb/20",
        text: "text-app-plumb",
        expandedBg: "bg-app-plumb/5",
      };
    case "medicine":
      return {
        bg: "bg-app-green/10",
        border: "border-app-green/20",
        text: "text-app-green",
        expandedBg: "bg-app-green/5",
      };
  }
}

function getTypeIcon(itemType: EmergingPattern["itemType"]) {
  switch (itemType) {
    case "symptom":
      return "🏷️";
    case "medicine":
      return "💊";
    case "stool":
      return "🧻";
  }
}

// ============================================
// EXPANDABLE PATTERN CARD
// ============================================

interface ExpandablePatternCardProps {
  pattern: EmergingPattern;
  variant: "occasional" | "recent" | "trend";
}

function ExpandablePatternCard({ pattern, variant }: ExpandablePatternCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = getItemTypeColors(pattern.itemType, pattern.isPeriodRelated);

  // For trends, use different colors based on direction
  const trendColors =
    variant === "trend"
      ? pattern.type === "increasing"
        ? {
            bg: "bg-app-red/10",
            border: "border-app-red/20",
            text: "text-app-red",
            expandedBg: "bg-app-red/5",
          }
        : {
            bg: "bg-app-green/10",
            border: "border-app-green/20",
            text: "text-app-green",
            expandedBg: "bg-app-green/5",
          }
      : colors;

  const cardColors = variant === "trend" ? trendColors : colors;

  return (
    <button
      type="button"
      onClick={() => setIsExpanded(!isExpanded)}
      className={`w-full text-left rounded-lg p-3 border transition-all ${cardColors.bg} ${cardColors.border} ${
        isExpanded ? "ring-1 ring-app-charcoal/20" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Left side: Ring or Icon */}
        {variant === "occasional" ? (
          <div className="flex-shrink-0 pt-0.5">
            <ConsistencyRing
              cyclesPresent={pattern.cyclesPresent}
              totalCycles={pattern.totalCycles}
              isPeriodRelated={pattern.isPeriodRelated}
              size="sm"
              labelPosition="bottom"
            />
          </div>
        ) : (
          <span className="text-lg flex-shrink-0">
            {variant === "recent" ? "🆕" : pattern.type === "increasing" ? "📈" : "📉"}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-medium ${cardColors.text}`}>
              {getTypeIcon(pattern.itemType)} {pattern.name}
            </span>
            <svg
              className={`w-4 h-4 text-app-gray transition-transform flex-shrink-0 ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="text-xs text-app-gray mt-1">{pattern.description}</p>

          {/* Trend value */}
          {variant === "trend" && pattern.trend && (
            <p className={`text-xs mt-1 font-medium ${cardColors.text}`}>
              {pattern.trend.startValue} → {pattern.trend.endValue}
            </p>
          )}

          {/* Expanded Content */}
          {isExpanded && pattern.metadata && (
            <div
              className={`mt-3 pt-3 border-t border-app-border/50 space-y-2 ${cardColors.expandedBg} -mx-3 -mb-3 px-3 pb-3 rounded-b-lg`}
            >
              {/* First / Last logged */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-app-gray">First logged:</span>
                  <p className="font-medium text-app-charcoal">
                    {formatDate(pattern.metadata.firstLoggedDate)}
                  </p>
                </div>
                <div>
                  <span className="text-app-gray">Last logged:</span>
                  <p className="font-medium text-app-charcoal">
                    {formatDate(pattern.metadata.lastLoggedDate)}
                  </p>
                </div>
              </div>

              {/* Average intensity */}
              {pattern.metadata.avgIntensity !== undefined && (
                <div className="text-xs">
                  <span className="text-app-gray">Average intensity:</span>
                  <span className={`ml-1 font-medium ${cardColors.text}`}>
                    {pattern.metadata.avgIntensity}/10
                  </span>
                </div>
              )}

              {/* Cycles appeared in */}
              {pattern.metadata.cyclesAppearedIn.length > 0 && (
                <div className="text-xs">
                  <span className="text-app-gray">Appeared in:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pattern.metadata.cyclesAppearedIn.slice(0, 6).map((cycle) => (
                      <span
                        key={cycle.cycleIndex}
                        className="px-1.5 py-0.5 bg-app-white rounded text-app-charcoal"
                      >
                        Cycle {cycle.cycleIndex}
                      </span>
                    ))}
                    {pattern.metadata.cyclesAppearedIn.length > 6 && (
                      <span className="px-1.5 py-0.5 text-app-gray">
                        +{pattern.metadata.cyclesAppearedIn.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================
// OCCASIONAL VIEW
// ============================================

interface OccasionalViewProps {
  patterns: EmergingPattern[];
  totalCycles: number;
}

function OccasionalView({ patterns }: OccasionalViewProps) {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">🔄</span>
        <p className="text-app-charcoal font-medium">No occasional patterns</p>
        <p className="text-sm text-app-gray mt-1">
          Patterns appearing in 30-59% of cycles will show here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-app-gray">
        These patterns appear in some cycles but not consistently (30-59% of the time).
      </p>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {patterns.map((pattern) => (
          <ExpandablePatternCard key={pattern.id} pattern={pattern} variant="occasional" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// RECENT VIEW
// ============================================

interface RecentViewProps {
  patterns: EmergingPattern[];
}

function RecentView({ patterns }: RecentViewProps) {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">🆕</span>
        <p className="text-app-charcoal font-medium">No recent appearances</p>
        <p className="text-sm text-app-gray mt-1">
          Items first logged in your last 2 cycles will show here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-app-gray">These items appeared in your recent cycles.</p>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {patterns.map((pattern) => (
          <ExpandablePatternCard key={pattern.id} pattern={pattern} variant="recent" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// TRENDS VIEW
// ============================================

interface TrendsViewProps {
  patterns: EmergingPattern[];
}

function TrendsView({ patterns }: TrendsViewProps) {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">📊</span>
        <p className="text-app-charcoal font-medium">No trends detected yet</p>
        <p className="text-sm text-app-gray mt-1">
          Intensity trends require 4+ cycles of data to detect
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-app-gray">
        These patterns show intensity changes over your last several cycles.
      </p>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {patterns.map((pattern) => (
          <ExpandablePatternCard key={pattern.id} pattern={pattern} variant="trend" />
        ))}
      </div>
    </div>
  );
}