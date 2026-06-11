"use client";

import { useState, useRef } from "react";
import { CollapsibleSection } from "@/components/cycleinsights/shared/CollapsibleSection";
import { ChangeDetectionResult, groupChangeDetection, ItemCategory } from "@/lib/allInsightsUtils";
import { BuildingInsightPlaceholder } from "./BuildingInsightPlaceholder";

// ============================================
// CHANGE DETECTION SECTION
// Shows what's increasing/decreasing recently
// Tabbed by Symptoms | Bristol | Medicine
// Scrollable content with sticky tabs
// ============================================

interface ChangeDetectionSectionProps {
  changes: ChangeDetectionResult[];
  uniqueDaysLogged: number;
  defaultExpanded?: boolean;
  symptomsEnabled?: boolean;
  stoolTrackingEnabled?: boolean;
  medicineTrackingEnabled?: boolean;
}

type TabType = "symptom" | "bristol" | "medication";

const TAB_CONFIG: { id: TabType; label: string }[] = [
  { id: "symptom", label: "Symptoms" },
  { id: "bristol", label: "Bristol" },
  { id: "medication", label: "Medicine" },
];

const CATEGORY_COLORS: Record<TabType, { bg: string; bgLight: string; text: string }> = {
  symptom: {
    bg: "bg-app-teal",
    bgLight: "bg-app-teal/10",
    text: "text-app-teal",
  },
  bristol: {
    bg: "bg-app-plumb",
    bgLight: "bg-app-plumb/10",
    text: "text-app-plumb",
  },
  medication: {
    bg: "bg-app-green",
    bgLight: "bg-app-green/10",
    text: "text-app-green",
  },
};

export function ChangeDetectionSection({
  changes,
  uniqueDaysLogged,
  defaultExpanded = true,
  symptomsEnabled = true,
  stoolTrackingEnabled = true,
  medicineTrackingEnabled = true,
}: ChangeDetectionSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("symptom");
  const [isAtBottom, setIsAtBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const needsMoreData = uniqueDaysLogged < 14;

  // Filter tabs based on enabled settings
  const enabledTabs = TAB_CONFIG.filter((tab) => {
    if (tab.id === "symptom") return symptomsEnabled;
    if (tab.id === "bristol") return stoolTrackingEnabled;
    if (tab.id === "medication") return medicineTrackingEnabled;
    return true;
  });

  // Determine default tab (first enabled tab)
  const defaultTab = enabledTabs.length > 0 ? enabledTabs[0].id : "symptom";

  const grouped = groupChangeDetection(changes);
  const hasChanges = changes.length > 0;

  // Ensure activeTab is valid (reset to first enabled tab if current tab is disabled)
  const effectiveTab = enabledTabs.some((t) => t.id === activeTab) ? activeTab : defaultTab;
  const currentChanges = grouped[effectiveTab];
  const tabCounts = {
    symptom: grouped.symptom.length,
    bristol: grouped.bristol.length,
    medication: grouped.medication.length,
  };

  const colors = CATEGORY_COLORS[effectiveTab];

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
    }
  };

  return (
    <CollapsibleSection
      title="What's Changing"
      badge={!needsMoreData && hasChanges ? `${changes.length} changes` : undefined}
      helpText="Compares the last 2 weeks to the previous 2 weeks. Shows items that appeared significantly more or less often."
      defaultExpanded={defaultExpanded}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {/* Top arc: starts right-of-center, curves up and left, arrow pointing down */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12 C 15 5, 5 3, 5 12"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12 l -2 -2 m 2 2 l 2 -2"
          />
          {/* Bottom arc: starts left-of-center, curves down and right, arrow pointing up */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12 C 9 19, 19 21, 19 12"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 12 l -2 2 m 2 -2 l 2 2"
          />
        </svg>
      }
    >
      {needsMoreData ? (
        <BuildingInsightPlaceholder
          uniqueDaysLogged={uniqueDaysLogged}
          title="Tracking your changes"
          subtitle="Discover what symptoms and patterns are increasing or decreasing over time."
        />
      ) : (
      <>
      {/* Sticky Tab Navigation - only show if more than one tab enabled */}
      {enabledTabs.length > 1 && (
        <div className="sticky top-0 bg-white z-10 -mx-4 px-4 pt-1 pb-0">
          <div className="flex border-b border-app-border">
            {enabledTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                  effectiveTab === tab.id
                    ? CATEGORY_COLORS[tab.id].text
                    : "text-app-gray hover:text-app-charcoal"
                }`}
              >
                {tab.label}
                {tabCounts[tab.id] > 0 && (
                  <span className="ml-1.5 text-xs bg-app-cream px-1.5 py-0.5 rounded-full">
                    {tabCounts[tab.id]}
                  </span>
                )}
                {effectiveTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${CATEGORY_COLORS[tab.id].bg}`} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Tab Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[28rem] overflow-y-auto mt-4"
      >
        {currentChanges.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="space-y-3">
            {currentChanges.map((change, index) => (
              <ChangeCard
                key={`${change.itemType}-${change.itemName}-${index}`}
                change={change}
                colors={colors}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll indicator - outside scrollable area, hidden when at bottom */}
      {currentChanges.length > 3 && !isAtBottom && (
        <p className="text-xs text-app-gray text-center py-2 border-t border-app-border/30">
          ↓ Scroll to see more
        </p>
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

interface ChangeCardProps {
  change: ChangeDetectionResult;
  colors: { bg: string; bgLight: string; text: string };
}

function ChangeCard({ change, colors }: ChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isIncreasing = change.direction === "increasing";
  const isNew = change.baselineCount === 0;

  // Calculate "X times more/less"
  const timesChange = change.baselineCount > 0
    ? (change.recentCount / change.baselineCount).toFixed(1)
    : change.recentCount.toString();

  const changeText = isIncreasing
    ? isNew
      ? null // We'll show "New in the past two weeks" separately
      : `${timesChange}x more`
    : `${(change.baselineCount / change.recentCount).toFixed(1)}x less`;

  return (
    <div className={`rounded-lg p-3 ${colors.bgLight}`}>
      <div className="flex items-start gap-3">
        {/* Direction indicator */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isNew ? "bg-app-plumb/10 text-app-plumb" : isIncreasing ? "bg-app-teal/10 text-app-teal" : "bg-app-green/10 text-app-green"
        }`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isNew ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            ) : isIncreasing ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            )}
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-app-charcoal">{change.itemName}</span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-app-gray hover:text-app-charcoal p-1"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {isNew ? (
            <p className="text-sm text-app-gray font-sm mt-1">
              <span className={"text-app-plumb font-medium"}>
                New
              </span>{" "}
              in the past 2 weeks
            </p>
          ) : (
            <p className="text-sm text-app-gray mt-1">
              <span className={`font-medium ${isIncreasing ? "text-app-teal" : "text-app-green"}`}>
                {changeText}
              </span>{" "}
              often in the last 2 weeks
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-app-gray">
            <span>Last 2 weeks: {change.recentCount}x</span>
            <span>Previous 2 weeks: {change.baselineCount}x</span>
          </div>

          {/* Expandable 4-week history */}
          {isExpanded && change.weeklyHistory && (
            <div className="mt-3 pt-3 border-t border-app-border/50">
              <p className="text-xs font-medium text-app-gray mb-2">Weekly History</p>
              {/* Vertical list on mobile */}
              <div className="space-y-1.5 md:hidden">
                {change.weeklyHistory.map((week, idx) => (
                  <div key={week.weekLabel} className="flex items-center justify-between text-xs">
                    <span className="text-app-gray">
                      {idx === 0 ? "This week" : week.weekLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-app-cream rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors.bg} transition-all`}
                          style={{
                            width: `${Math.min(100, (week.count / Math.max(...change.weeklyHistory.map(w => w.count), 1)) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-app-charcoal font-medium w-6 text-right">{week.count}x</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Horizontal layout on desktop - same bar style as mobile */}
              <div className="hidden md:grid md:grid-cols-4 md:gap-8">
                {change.weeklyHistory.map((week, idx) => (
                  <div key={week.weekLabel} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-app-gray">
                        {idx === 0 ? "This week" : week.weekLabel}
                      </span>
                      <span className="text-app-charcoal font-medium">{week.count}x</span>
                    </div>
                    <div className="w-full h-1.5 bg-app-cream rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bg} transition-all`}
                        style={{
                          width: `${Math.min(100, (week.count / Math.max(...change.weeklyHistory.map(w => w.count), 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: TabType }) {
  const messages: Record<TabType, { title: string; subtitle: string }> = {
    symptom: {
      title: "No significant symptom changes",
      subtitle: "Symptom changes of 30% or more will appear here",
    },
    bristol: {
      title: "No significant Bristol changes",
      subtitle: "Bristol stool type changes of 30% or more will appear here",
    },
    medication: {
      title: "No significant medication changes",
      subtitle: "Medication usage changes of 30% or more will appear here",
    },
  };

  return (
    <div className="text-center py-6 text-app-gray">
      <p className="text-sm">{messages[tab].title}</p>
      <p className="text-xs mt-1">{messages[tab].subtitle}</p>
    </div>
  );
}
