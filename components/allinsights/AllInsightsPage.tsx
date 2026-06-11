"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useEntries, useEntriesRevision } from "@/stores/useEntries";
import { useFreshData } from "@/hooks/useFreshData";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useSettings } from "@/stores/useSettings";
import { SyncWithGoogleSheetsButton, SyncStatusBadge } from "@/components/sync";
import { EntriesSection } from "@/components/cycleinsights/sections/EntriesSection";
import { CollapsibleSection } from "@/components/cycleinsights/shared/CollapsibleSection";

import { ChangeDetectionSection } from "./sections/ChangeDetectionSection";
import { WeeklyLoadSection } from "./sections/WeeklyLoadSection";
import { CoOccurrenceSection } from "./sections/CoOccurrenceSection";
import { ConsistencySection } from "./sections/ConsistencySection";

import {
  calculateSummaryStats,
  calculateChangeDetection,
  calculateWeeklyLoadStats,
  calculateConsistencyMetrics,
} from "@/lib/allInsightsUtils";

// ============================================
// ALL INSIGHTS PAGE
// Cycle-agnostic insights for all users
// Uses time-based windows instead of cycle-based aggregations
// ============================================

export function AllInsightsPage() {
  // ============================================
  // DATA FROM STORES
  // ============================================

  const entries = useEntries((state) => state.entries);
  const revision = useEntriesRevision();
  const renderKey = useFreshData();
  const isGoogleSheetConnected = useSettings((state) => state.isGoogleSheetConnected);
  const periodTrackingEnabled = useSettings((state) => state.periodTracking.enabled);
  const symptomsEnabled = useSettings((state) => state.symptoms.enabled);
  const stoolTrackingEnabled = useSettings((state) => state.stoolTracking.enabled);
  const medicineTrackingEnabled = useSettings((state) => state.medicineTracking.enabled);
  const isMobile = useIsMobile();

  // ============================================
  // CALCULATIONS
  // ============================================

  const summaryStats = useMemo(() => {
    return calculateSummaryStats(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision, renderKey]);

  const weeklyLoadStats = useMemo(() => {
    return calculateWeeklyLoadStats(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision]);

  const changeDetection = useMemo(() => {
    if (summaryStats.uniqueDaysLogged < 14) return [];
    return calculateChangeDetection(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision, summaryStats.uniqueDaysLogged]);

  const consistencyMetrics = useMemo(() => {
    if (summaryStats.uniqueDaysLogged < 14) return [];
    return calculateConsistencyMetrics(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision, summaryStats.uniqueDaysLogged]);

  // ============================================
  // RENDER
  // ============================================

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
            <h1 className="text-2xl font-bold text-app-charcoal">All Insights</h1>
          </div>
          <p className="text-app-gray mt-1">Patterns & trends across all your data</p>
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

      {/* Cycle Insights Note - only show if period tracking is enabled */}
      {periodTrackingEnabled && (
        <div className="bg-app-red/5 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-app-plumb flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-app-charcoal">
            Looking for cycle trends? Head to{" "}
            <Link href="/dashboard/cycleinsights" className="text-app-red font-medium hover:underline">
              Cycle Insights
            </Link>
          </p>
        </div>
      )}

      {/* Section 1: Trust Banner / Summary Stats */}
      <TrustBanner
        stats={summaryStats}
        symptomsEnabled={symptomsEnabled}
        medicineTrackingEnabled={medicineTrackingEnabled}
      />

      {/* Section 2: Weekly Load (≥14 days) - Right after TrustBanner */}
      <WeeklyLoadSection
        loadStats={weeklyLoadStats}
        uniqueDaysLogged={summaryStats.uniqueDaysLogged}
        defaultExpanded={true}
        symptomsEnabled={symptomsEnabled}
        stoolTrackingEnabled={stoolTrackingEnabled}
        medicineTrackingEnabled={medicineTrackingEnabled}
      />

      {/* Section 3: Change Detection (≥14 days) */}
      <ChangeDetectionSection
        changes={changeDetection}
        uniqueDaysLogged={summaryStats.uniqueDaysLogged}
        defaultExpanded={!isMobile}
        symptomsEnabled={symptomsEnabled}
        stoolTrackingEnabled={stoolTrackingEnabled}
        medicineTrackingEnabled={medicineTrackingEnabled}
      />

      {/* Section 4: Co-Occurrences (14+ days) */}
      <CoOccurrenceSection
        entries={entries}
        uniqueDaysLogged={summaryStats.uniqueDaysLogged}
        defaultExpanded={!isMobile}
      />

      {/* Section 5: Consistency & Variability (≥14 days) */}
      <ConsistencySection
        consistencyData={consistencyMetrics}
        uniqueDaysLogged={summaryStats.uniqueDaysLogged}
        defaultExpanded={!isMobile}
        symptomsEnabled={symptomsEnabled}
        stoolTrackingEnabled={stoolTrackingEnabled}
        medicineTrackingEnabled={medicineTrackingEnabled}
      />

      {/* Section 6: Entries - Always show */}
      <CollapsibleSection
        title="All Entries"
        helpText="Browse all your logged entries. Use the filters to find specific dates or entry types."
        defaultExpanded={!isMobile}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
        badge={summaryStats.totalEntries > 0 ? `${summaryStats.totalEntries} entries` : undefined}
      >
        <EntriesSection entries={entries} />
      </CollapsibleSection>
    </div>
  );
}

// ============================================
// TRUST BANNER COMPONENT
// ============================================

interface TrustBannerProps {
  stats: ReturnType<typeof calculateSummaryStats>;
  symptomsEnabled?: boolean;
  medicineTrackingEnabled?: boolean;
}

function TrustBanner({ stats, symptomsEnabled = true, medicineTrackingEnabled = true }: TrustBannerProps) {
  const hasData = stats.totalEntries > 0;
  const DAYS_FOR_INSIGHTS = 14;
  const DAYS_FOR_REFINED_INSIGHTS = 28;
  const daysUntilInsights = Math.max(0, DAYS_FOR_INSIGHTS - stats.uniqueDaysLogged);
  const insightsUnlocked = stats.uniqueDaysLogged >= DAYS_FOR_INSIGHTS;
  const refinedInsightsUnlocked = stats.uniqueDaysLogged >= DAYS_FOR_REFINED_INSIGHTS;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center">
          <svg className="w-8 h-8 text-app-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={0.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-app-charcoal">Your Data Summary</h2>
          <p className="text-sm text-app-gray">
            {!hasData
              ? "Start logging to see insights"
              : `${stats.totalEntries} entries across ${stats.uniqueDaysLogged} days`}
          </p>
        </div>
      </div>

      {hasData && (() => {
        const enabledStats = [
          { value: stats.uniqueDaysLogged, label: "Days Logged", show: true },
          { value: stats.totalEntries, label: "Total Entries", show: true },
          { value: stats.uniqueSymptoms, label: "Symptoms Tracked", show: symptomsEnabled },
          { value: stats.uniqueMedications, label: "Medications Logged", show: medicineTrackingEnabled },
        ].filter(stat => stat.show);

        const gridCols = enabledStats.length <= 2 ? "grid-cols-2" : enabledStats.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4";

        return (
          <div className={`grid ${gridCols} gap-3 mt-4`}>
            {enabledStats.map((stat) => (
              <div key={stat.label} className="bg-app-cream rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-app-charcoal">{stat.value}</p>
                <p className="text-xs text-app-gray">{stat.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Progress messaging - before insights are unlocked */}
      {hasData && daysUntilInsights > 0 && (
        <div className="mt-4 bg-app-cream/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-app-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-app-charcoal">Unlocking Insights</span>
          </div>
          <p className="text-sm text-app-gray">
            Log for {daysUntilInsights} more day{daysUntilInsights !== 1 ? "s" : ""} to unlock insights including change detection, co-occurrences, and consistency patterns.
          </p>
          {/* Progress dots - shows progress toward 14 days */}
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {Array.from({ length: DAYS_FOR_INSIGHTS }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i < stats.uniqueDaysLogged ? "bg-app-teal" : "bg-app-border"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-app-gray mt-2">
            {stats.uniqueDaysLogged} of {DAYS_FOR_INSIGHTS} days
          </p>
        </div>
      )}

      {/* Early insights caveat - between 14-28 days */}
      {hasData && insightsUnlocked && !refinedInsightsUnlocked && (
        <div className="mt-4 bg-app-teal/5 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-app-plumb flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-app-gray">
              <span className="font-semibold text-app-plumb">Early insights unlocked!</span> These patterns are based on {stats.uniqueDaysLogged} days of data and will continue to refine as you log more entries. After 4 weeks, your insights will be more stable and reliable.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
