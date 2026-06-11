"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/components/cycleinsights/shared/CollapsibleSection";
import { TimeBasedPattern, groupPatterns, ItemCategory } from "@/lib/allInsightsUtils";

// ============================================
// TIME-BASED PATTERNS SECTION
// Occasional, Recent, and Trending tabs
// With grouped headers: Symptom → Bristol → Medicine
// ============================================

interface TimeBasedPatternsSectionProps {
  patterns: {
    occasional: TimeBasedPattern[];
    recent: TimeBasedPattern[];
    trending: TimeBasedPattern[];
  };
  totalEntries: number;
}

type TabType = "occasional" | "recent" | "trending";

const CATEGORY_ORDER: ItemCategory[] = ["symptom", "bristol", "medication"];
const CATEGORY_LABELS: Record<ItemCategory, string> = {
  symptom: "Symptoms",
  bristol: "Bristol",
  medication: "Medicine",
};

export function TimeBasedPatternsSection({ patterns, totalEntries }: TimeBasedPatternsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("occasional");

  // Hide section if not enough data (≥20 entries)
  if (totalEntries < 20) {
    return null;
  }

  const totalPatterns =
    patterns.occasional.length + patterns.recent.length + patterns.trending.length;

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "occasional", label: "Occasional", count: patterns.occasional.length },
    { id: "recent", label: "Recent", count: patterns.recent.length },
    { id: "trending", label: "Trends", count: patterns.trending.length },
  ];

  const currentPatterns = patterns[activeTab];
  const grouped = groupPatterns(currentPatterns);

  return (
    <CollapsibleSection
      title="Patterns"
      badge={totalPatterns > 0 ? `${totalPatterns} found` : undefined}
      helpText="Occasional items appear some days but not consistently. Recent items are new in the last 2 weeks. Trends show what's increasing or decreasing over 4 weeks."
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      }
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-app-border mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-app-teal"
                : "text-app-gray hover:text-app-charcoal"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs bg-app-cream px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-teal" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content with Grouped Headers */}
      {currentPatterns.length === 0 ? (
        <EmptyState tab={activeTab} totalEntries={totalEntries} />
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.map((category) => {
            const categoryPatterns = grouped[category];
            if (categoryPatterns.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="text-xs font-medium text-app-gray uppercase tracking-wide mb-2">
                  {CATEGORY_LABELS[category]}
                </h4>
                <div className="space-y-2">
                  {categoryPatterns.map((pattern, index) => (
                    <PatternCard key={`${pattern.itemType}-${pattern.itemName}-${index}`} pattern={pattern} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}

function PatternCard({ pattern }: { pattern: TimeBasedPattern }) {
  const getTrendIcon = () => {
    if (pattern.trendDirection === "up") {
      return (
        <svg className="w-4 h-4 text-app-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (pattern.trendDirection === "down") {
      return (
        <svg className="w-4 h-4 text-app-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="bg-app-cream/50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-app-charcoal">{pattern.itemName}</span>
        {getTrendIcon()}
      </div>
      <p className="text-sm text-app-gray mt-1">{pattern.description}</p>
    </div>
  );
}

function EmptyState({ tab, totalEntries }: { tab: TabType; totalEntries: number }) {
  const needsMoreData = totalEntries < 28 && tab === "trending";

  const messages = {
    occasional: {
      title: "No occasional patterns yet",
      subtitle: "Items that appear 2-4 days per week will show here",
    },
    recent: {
      title: "No new items recently",
      subtitle: "Items first logged in the last 2 weeks will appear here",
    },
    trending: {
      title: needsMoreData
        ? "Need more data for trends"
        : "No clear trends detected",
      subtitle: needsMoreData
        ? `Log ${28 - totalEntries} more entries to see trends`
        : "Items with increasing or decreasing frequency will appear here",
    },
  };

  return (
    <div className="text-center py-6 text-app-gray">
      <p className="text-sm">{messages[tab].title}</p>
      <p className="text-xs mt-1">{messages[tab].subtitle}</p>
    </div>
  );
}
