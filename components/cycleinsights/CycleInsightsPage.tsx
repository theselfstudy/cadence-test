"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useEntries, useEntriesRevision } from "@/stores/useEntries";
import { useFreshData } from "@/hooks/useFreshData";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useSettings } from "@/stores/useSettings";
import { SyncWithGoogleSheetsButton, SyncStatusBadge } from "@/components/sync";
import { 
  DetectedCycle, 
  detectCycleBoundaries, 
  compareCycles, 
  buildCyclePhaseSymptomHeatMap 
} from "@/lib/monthlyUtils";

import { TrustBanner } from "./sections/TrustBanner";
import { ThisCycleSection } from "./sections/ThisCycleSection";
import { ConsistentPatternsSection } from "./sections/ConsistentPatternsSection";
import { EmergingPatternsSection } from "./sections/EmergingPatternsSection";
import { NotableCyclesSection } from "./sections/NotableCyclesSection";
import { DetailedViewsSection } from "./sections/DetailedViewsSection";
import { EntriesSection } from "./sections/EntriesSection";
import { CollapsibleSection } from "./shared/CollapsibleSection";

import {
  calculateConsistentPatterns,
  calculateEmergingPatterns,
  calculateNotableCycles,
} from "@/lib/insightUtils";

// ============================================
// CYCLE INSIGHTS PAGE
// Main container for all cycle insight sections
// Single scrollable page with collapsible sections
// ============================================

export function CycleInsightsPage() {
  // ============================================
  // DATA FROM STORES
  // ============================================
  
  const entries = useEntries((state) => state.entries);
  const revision = useEntriesRevision();
  const renderKey = useFreshData();
  // const isHydrated = useEntriesHydrated();
  const isGoogleSheetConnected = useSettings((state) => state.isGoogleSheetConnected);
  const periodTracking = useSettings((state) => state.periodTracking);
  const isMobile = useIsMobile();
  
  // ============================================
  // CYCLE DETECTION & CALCULATIONS
  // ============================================

const detectedCycles = useMemo(() => {
  return detectCycleBoundaries(entries);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [entries, revision, renderKey]);

  const cycleComparison = useMemo(() => {
    return compareCycles(entries, detectedCycles);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedCycles, entries, revision]);

  const cyclePhaseHeatMapData = useMemo(() => {
    return buildCyclePhaseSymptomHeatMap(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision]);

  // ============================================
  // DERIVED DATA
  // ============================================
  
  const completeCycles = useMemo(() => {
    return detectedCycles.filter((c: DetectedCycle) => !c.isOngoing);
  }, [detectedCycles]);

  const currentCycle = useMemo(() => {
    return detectedCycles.find((c: DetectedCycle) => c.isOngoing) || null;
  }, [detectedCycles]);

  const hasEnoughDataForDeepInsights = completeCycles.length >= 2;

  // Calculate consistent patterns for badge count
  const consistentPatterns = useMemo(() => {
    return calculateConsistentPatterns(entries, detectedCycles);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, detectedCycles, revision]);

  const emergingPatterns = useMemo(() => {
    return calculateEmergingPatterns(entries, detectedCycles);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, detectedCycles, revision]);

  // Calculate notable cycles for badge count
  const notableCycles = useMemo(() => {
    return calculateNotableCycles(detectedCycles, entries, consistentPatterns);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedCycles, entries, consistentPatterns, revision]);

  // ============================================
  // RENDER: NO PERIOD TRACKING
  // ============================================
  
  if (!periodTracking?.enabled) {
    return (
      <div className="p-4">
        <div className="bg-app-white rounded-xl border border-app-border p-8 text-center">
          <span className="text-4xl block mb-4">🌸</span>
          <h2 className="text-lg font-semibold text-app-charcoal mb-2">
            Period logging Not Enabled
          </h2>
          <p className="text-sm text-app-gray max-w-md mx-auto">
            Enable period logging in Settings to see cycle insights and patterns.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: NO DATA YET
  // ============================================
  
  if (entries.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-app-white rounded-xl border border-app-border p-8 text-center">
          <span className="text-4xl block mb-4">📝</span>
          <h2 className="text-lg font-semibold text-app-charcoal mb-2">
            No Entries Yet
          </h2>
          <p className="text-sm text-app-gray max-w-md mx-auto">
            Start logging entries to see your cycle insights and patterns emerge over time.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  // Wait for store hydration before rendering
  // if (!isHydrated) {
  //   return (
  //     <div className="p-4 space-y-4 max-w-4xl mx-auto animate-pulse">
  //       <div className="h-8 bg-gray-200 rounded w-48" />
  //       <div className="h-4 bg-gray-200 rounded w-72" />
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-6">
      {/* Page Header with Sync Button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-app-gray hover:text-app-charcoal">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-app-charcoal">Cycle Insights</h1>
          </div>
          <p className="text-app-gray mt-1">Cycle patterns and observations from your logged data</p>
          {isGoogleSheetConnected && (
            <div className="mt-2">
              <SyncStatusBadge />
            </div>
          )}
        </div>
        {isGoogleSheetConnected && (
          <SyncWithGoogleSheetsButton variant="subtle" />
        )}
      </div>

      {/* All Insights Note */}
      <div className="bg-app-teal/5 rounded-lg p-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-app-plumb flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-app-charcoal">
          Looking for all other trends? Head to{" "}
          <Link href="/dashboard/allinsights" className="text-app-teal font-medium hover:underline">
            All Insights
          </Link>
        </p>
      </div>

      {/* Section 0: Trust Banner - Always visible */}
      <TrustBanner
        cycles={detectedCycles}
        entries={entries}
        isGoogleSheetConnected={isGoogleSheetConnected}
      />

      {/* Section 1: This Cycle */}
      <CollapsibleSection
        title="This Cycle"
        icon={<CalendarCycleIcon className="w-5 h-5" />}
        helpText="Shows where you are in your current cycle based on your logged data."
        className="sm:rounded-xl"
        defaultExpanded={true}
      >
        <ThisCycleSection
          currentCycle={currentCycle}
          allCycles={detectedCycles}
          entries={entries}
        />
      </CollapsibleSection>

      {/* Section 2: Your Consistent Patterns - OLD PILL/BADGE FOR NUMBER OF PATTERNS # OF PATTERNS*/}
      <CollapsibleSection
        title="Your Consistent Patterns"
        icon={<PatternIcon className="w-5 h-5" />}
        helpText="Patterns that appear in at least 60% of your tracked cycles."
        defaultExpanded={!isMobile}
      >
        <ConsistentPatternsSection
          entries={entries}
          cycles={detectedCycles}
          cyclePhaseHeatMapData={cyclePhaseHeatMapData}
        />
      </CollapsibleSection>

      {/* Section 3: Occasional & Emerging */}
      <CollapsibleSection
        title="Occasional & Emerging"
        icon={<SparkleIcon className="w-5 h-5" />}
        badge={hasEnoughDataForDeepInsights && emergingPatterns.length > 0
          ? `${emergingPatterns.length} pattern${emergingPatterns.length !== 1 ? "s" : ""}`
          : undefined}
        helpText="Patterns that appear less frequently, have recently started, or are changing over time."
        defaultExpanded={!isMobile}
      >
        <EmergingPatternsSection
          entries={entries}
          cycles={detectedCycles}
        />
      </CollapsibleSection>

      {/* Section 4: Notable Cycles */}
      <CollapsibleSection
        title="Notable Cycles"
        icon={<FlagIcon className="w-5 h-5" />}
        badge={hasEnoughDataForDeepInsights && notableCycles.length > 0
          ? `${notableCycles.length} noted`
          : undefined}
        helpText="Observations about cycles that differed from your usual pattern. Cycles naturally vary."
        defaultExpanded={!isMobile}
      >
        <NotableCyclesSection
          entries={entries}
          cycles={detectedCycles}
        />
      </CollapsibleSection>

      {/* Section 6: Detailed Views */}
      <CollapsibleSection
        title="Detailed Views"
        icon={<ChartDetailIcon className="w-5 h-5" />}
        badge="Full details"
        helpText="Detailed breakdowns of your cycle data including cycle history."
        defaultExpanded={!isMobile}
      >
        <DetailedViewsSection
          cycles={detectedCycles}
          entries={entries}
          cycleComparison={cycleComparison}
        />
      </CollapsibleSection>

      {/* Section 7: Entries */}
      <CollapsibleSection
        title="Entries"
        icon={<EntryLogIcon className="w-5 h-5" />}
        badge={`${entries.length} entr${entries.length !== 1 ? "ies" : "y"}`}
        helpText="All your logged entries with full details."
        defaultExpanded={!isMobile}
      >
        <div className="sm:contents">
          <EntriesSection entries={entries} />
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================
// SECTION ICONS
// Custom SVG icons for each collapsible section
// ============================================

function CalendarCycleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
      />
      <circle cx="12" cy="14" r="2" strokeWidth={2} />
    </svg>
  );
}

function PatternIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
      />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
      />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" 
      />
    </svg>
  );
}

function ChartDetailIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
      />
    </svg>
  );
}

function EntryLogIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
      />
    </svg>
  );
}