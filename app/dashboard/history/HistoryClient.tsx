"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { StoredEntry, TimeFormat } from "@/types";
import { useEntries, useEntriesRevision } from "@/stores/useEntries";
// import { useEntries, useEntriesHydrated, useEntriesRevision } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";
// import { useSavedFilters } from "@/stores/useSavedFilters";
import { downloadEntriesAsCSV, calculateSummaryStats } from "@/lib/csvExport";
import { useHistoryFilters } from "@/hooks/useHistoryFilters";
import { useFreshData } from "@/hooks/useFreshData";
import { FilterBar } from "@/components/history";
import { CYCLE_PHASES } from "@/lib/constants";
import { getLocalDateString } from '@/lib/dateUtils';
import { EntryCard } from '@/components/ui/EntryCard';
import { SyncWithGoogleSheetsButton, SyncStatusBadge } from '@/components/sync';


// ============================================
// TYPES
// ============================================

type DateRangeFilter = "7" | "30" | "90" | "all" | "custom";
type ViewMode = "cards" | "table";

interface DateRange {
  start: string;
  end: string;
}

// ============================================
// CONSTANTS
// ============================================

const ENTRIES_PER_PAGE = 10;

// ============================================
// HISTORY PAGE
// ============================================

export default function HistoryPage() {
  // Client-side rendering guard - wait for both client mount AND store hydration
  const [isClient, setIsClient] = useState(false);
  // const isHydrated = useEntriesHydrated();

  // URL search params for pre-filtering (e.g., from Cycle Insights)
  const searchParams = useSearchParams();

  // Store data
  const entries = useEntries((state) => state.entries);
  const revision = useEntriesRevision();
  const renderKey = useFreshData();
  const { isGoogleSheetConnected, timeFormat } = useSettings();

  const settings = useSettings();

  // const importEntriesFromSheet = useEntries((state) => state.importEntriesFromSheet);

  // Saved filters store
  // const loadSavedFiltersFromSheet = useSavedFilters((state) => state.loadFromSheet);
  
  // Filter state - initialize from URL params if present
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>(() => {
    // Will be properly initialized in useEffect after client-side hydration
    return "all";
  });
  const [customRange, setCustomRange] = useState<DateRange>({
    start: "",
    end: "",
  });
  
  // Track if we've initialized from URL params
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showStats, setShowStats] = useState(true);
  const [showEntries, setShowEntries] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Pagination state
  const [visibleCount, setVisibleCount] = useState(ENTRIES_PER_PAGE);

    // Date-filtered entries (before advanced filters)
  const dateFilteredEntries = useMemo(() => {
    const todayStr = getLocalDateString();
    
    let startDateStr: string;
    let endDateStr: string;
    
    switch (dateRangeFilter) {
      case "7": {
        const start = new Date();
        start.setDate(start.getDate() - 6); // Today + 6 previous days = 7 days
        startDateStr = getLocalDateString(start);
        endDateStr = todayStr;
        break;
      }
      case "30": {
        const start = new Date();
        start.setDate(start.getDate() - 29); // Today + 29 previous days = 30 days
        startDateStr = getLocalDateString(start);
        endDateStr = todayStr;
        break;
      }
      case "90": {
        const start = new Date();
        start.setDate(start.getDate() - 89); // Today + 89 previous days = 90 days
        startDateStr = getLocalDateString(start);
        endDateStr = todayStr;
        break;
      }
      case "custom":
        if (customRange.start && customRange.end) {
          startDateStr = customRange.start;
          endDateStr = customRange.end;
        } else {
          return [...entries].sort((a, b) => b.date.localeCompare(a.date));
        }
        break;
      case "all":
      default:
        return [...entries].sort((a, b) => b.date.localeCompare(a.date));
    }
    
    return entries
      .filter(entry => entry.date >= startDateStr && entry.date <= endDateStr)
      .sort((a, b) => b.date.localeCompare(a.date));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, dateRangeFilter, customRange, revision, renderKey]);

  // Advanced filters hook - operates on date-filtered entries
    const {
    filters,
    filteredEntries,
    activeFilterCount,
    categoryFilterCounts,
    availableOptions,
    hasFilters,
    toggleSymptom,
    toggleCyclePhase,
    toggleFlowLevel,
    toggleBristolType,
    toggleFeeling,
    toggleMedicine,
    selectAllSymptoms,
    selectAllCycle,
    selectAllBowel,
    selectAllMedicine,
    clearCategory,
    setFilters,
    clearAllFilters,
  } = useHistoryFilters(dateFilteredEntries);
  
  // Initialize filters from URL search params (e.g., from Cycle Insights "Explore in History")
  useEffect(() => {
    if (initializedFromUrl) return;
    
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    if (startDate && endDate) {
      setCustomRange({ start: startDate, end: endDate });
      setDateRangeFilter("custom");
      setInitializedFromUrl(true);
    }
  }, [searchParams, initializedFromUrl]);

  // Check if user should see backup prompt (anonymous mode, has entries, hasn't dismissed recently)
  useEffect(() => {
    setIsClient(true);

    // Show backup prompt for anonymous users with entries
    if (!isGoogleSheetConnected && entries.length > 0) {
      const lastDismissed = localStorage.getItem("cadence-backup-prompt-dismissed");
      if (!lastDismissed) {
        setShowBackupPrompt(true);
      } else {
        // Show again after 7 days
        const dismissed = new Date(lastDismissed);
        const daysSince = (Date.now() - dismissed.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) {
          setShowBackupPrompt(true);
        }
      }
    }
  }, [isGoogleSheetConnected, entries.length]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(ENTRIES_PER_PAGE);
  }, [dateRangeFilter, customRange, filters]);

  // Auto-expand advanced filters when filters are active
  useEffect(() => {
    if (hasFilters && !showAdvancedFilters) {
      setShowAdvancedFilters(true);
    }
  }, [hasFilters]);
  
  // Get visible entries for pagination
  const visibleEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount]);
  
  const hasMoreEntries = visibleCount < filteredEntries.length;
  const remainingCount = filteredEntries.length - visibleCount;
  
  // Today's date string for max attribute on date inputs
  const todayStr = useMemo(() => getLocalDateString(), []);

  // Validate custom date range (start must not be after end)
  const isDateRangeInvalid = dateRangeFilter === "custom" &&
    customRange.start !== "" &&
    customRange.end !== "" &&
    customRange.start > customRange.end;

  // Check if either custom date is in the future (iOS Safari ignores max attribute)
  const hasFutureDateError = dateRangeFilter === "custom" &&
    ((customRange.start !== "" && customRange.start > todayStr) ||
     (customRange.end !== "" && customRange.end > todayStr));

  // Calculate stats for filtered entries
  const stats = useMemo(() => calculateSummaryStats(filteredEntries), [filteredEntries]);
  
  // Handle CSV export
  const handleExport = () => {
    if (filteredEntries.length === 0) return;

    downloadEntriesAsCSV(filteredEntries, {
      timeFormat: timeFormat,
      includeSymptoms: settings.symptoms.enabled,
      includePeriod: settings.periodTracking.enabled,
      includeStool: settings.stoolTracking.enabled,
      includeMedicine: settings.medicineTracking.enabled,
      customProducts: settings.periodTracking.productTracking?.customProducts ?? {},
    });
  };
  
  // Handle backup prompt dismiss
  const dismissBackupPrompt = () => {
    localStorage.setItem("cadence-backup-prompt-dismissed", new Date().toISOString());
    setShowBackupPrompt(false);
  };

  // Handle load more
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ENTRIES_PER_PAGE);
  };

  // if (!isClient || !isHydrated) {
  //   return <HistorySkeleton />;
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
            <h1 className="text-2xl font-bold text-app-charcoal">History</h1>
          </div>
          <p className="text-app-gray mt-1">Browse and export all your logged entries</p>
          {isGoogleSheetConnected && (
            <div className="mt-2">
              <SyncStatusBadge />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Filter count badge */}
          {activeFilterCount > 0 && (
            <span className="text-sm text-app-teal">
              {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
            </span>
          )}
          {isGoogleSheetConnected && (
            <SyncWithGoogleSheetsButton variant="subtle" />
          )}
        </div>
      </div>

      {/* Anonymous Backup Prompt */}
      {showBackupPrompt && (
        <BackupPromptBanner
          onExport={handleExport}
          onDismiss={dismissBackupPrompt}
          entryCount={entries.length}
        />
      )}

      {/* Filters & Controls */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Date Range Filters */}
          <div className="flex items-center gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 sm:overflow-visible">
            <span className="text-sm text-app-gray mr-1">Show:</span>
            {(["7", "30", "90", "all", "custom"] as DateRangeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateRangeFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateRangeFilter === filter
                    ? "bg-app-teal text-white"
                    : "bg-app-cream text-app-charcoal hover:bg-app-border"
                }`}
              >
                {getFilterLabel(filter)}
              </button>
            ))}
          </div>

          {/* Stats Toggle & Export */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`
                flex items-center gap-2
                px-3 py-2 text-sm rounded-lg transition-colors
                ${showStats
                  ? "bg-app-plumb text-white"
                  : "bg-app-cream text-app-charcoal hover:bg-app-border"}
              `}
              title={showStats ? "Hide statistics" : "Show statistics"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Stats</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExport}
              disabled={filteredEntries.length === 0 || isDateRangeInvalid || hasFutureDateError}
              className="
                flex items-center gap-2
                px-3 py-2 text-sm rounded-lg transition-colors
                bg-app-teal text-white
                hover:bg-app-teal/70
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              title={isDateRangeInvalid ? "Fix date range to export" : hasFutureDateError ? "Dates cannot be in the future" : "Export filtered entries to CSV"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
        
        {/* Custom Date Range Picker */}
        {dateRangeFilter === "custom" && (
          <div className="mt-4 pt-4 border-t border-app-border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-app-gray">From:</label>
                <input
                  type="date"
                  value={customRange.start}
                  max={todayStr}
                  onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                  className="px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-teal"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-app-gray">To:</label>
                <input
                  type="date"
                  value={customRange.end}
                  max={todayStr}
                  onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                  className="px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-teal"
                />
              </div>
              {(customRange.start || customRange.end) && (
                <button
                  onClick={() => {
                    setCustomRange({ start: "", end: "" });
                    setDateRangeFilter("all");
                  }}
                  className="px-3 py-1.5 text-sm text-app-red hover:text-app-red/80 hover:bg-app-red/10 rounded-lg transition-colors"
                  title="Clear dates and show all entries"
                >
                  Clear Dates
                </button>
              )}
            </div>
            {isDateRangeInvalid && (
              <p className="mt-2 text-sm text-app-red">
                Start date cannot be after end date. Please adjust your date range.
              </p>
            )}
            {!isDateRangeInvalid && hasFutureDateError && (
              <p className="mt-2 text-sm text-app-red">
                Dates cannot be in the future.
              </p>
            )}
          </div>
        )}

        {/* Advanced Filters Toggle */}
        <div className="mt-4 pt-4 border-t border-app-border">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm text-app-charcoal hover:text-app-teal transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-app-teal text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Advanced Filters Content */}
          {showAdvancedFilters && (
            <div className="mt-4">
            <FilterBar
              filters={filters}
              availableOptions={availableOptions}
              categoryFilterCounts={categoryFilterCounts}
              hasFilters={hasFilters}
              settings={settings}
              onLoadSavedFilter={setFilters}
              toggleSymptom={toggleSymptom}
              toggleCyclePhase={toggleCyclePhase}
              toggleFlowLevel={toggleFlowLevel}
              toggleBristolType={toggleBristolType}
              toggleFeeling={toggleFeeling}
              toggleMedicine={toggleMedicine}
              selectAllSymptoms={selectAllSymptoms}
              selectAllCycle={selectAllCycle}
              selectAllBowel={selectAllBowel}
              selectAllMedicine={selectAllMedicine}
              clearCategory={clearCategory}
              clearAllFilters={clearAllFilters}
            />
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics Panel */}
      {showStats && filteredEntries.length > 0 && (
        <SummaryStatsPanel stats={stats} timeFormat={timeFormat} />
      )}

      {/* Entry List Section - Shown by default */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowEntries(!showEntries)}
            className="flex items-center gap-3 text-left py-2"
          >
            <span className="text-app-gray text-xl">{showEntries ? "−" : "+"}</span>
            <div>
              <h2 className="text-lg font-semibold text-app-charcoal">
                Entries ({filteredEntries.length})
              </h2>
              {filteredEntries.length !== entries.length && (
                <p className="text-xs text-app-gray">
                  Filtered from {entries.length} total
                </p>
              )}
            </div>
          </button>
          {/* View Toggle (only when expanded) */}
          {showEntries && (
            <div className="hidden sm:flex rounded-lg overflow-hidden border border-app-border">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-2 py-1 text-xs transition-colors ${
                  viewMode === "cards"
                    ? "bg-app-teal text-white"
                    : "bg-white text-app-charcoal hover:bg-app-cream"
                }`}
                title="Card View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-2 py-1 text-xs transition-colors ${
                  viewMode === "table"
                    ? "bg-app-teal text-white"
                    : "bg-white text-app-charcoal hover:bg-app-cream"
                }`}
                title="Table View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {showEntries && (
          <div className="mt-4">
            {filteredEntries.length === 0 ? (
              <EmptyState
                hasAnyEntries={entries.length > 0}
                hasDateFilteredEntries={dateFilteredEntries.length > 0}
                hasActiveFilters={hasFilters}
                onClearFilters={clearAllFilters}
              />
            ) : viewMode === "cards" ? (
              <div className="space-y-3">
                <EntryCard
                  entries={visibleEntries}
                  timeFormat={timeFormat}
                  customProducts={settings.periodTracking.productTracking?.customProducts}
                />

                {/* Load More Button */}
                {hasMoreEntries && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                      onClick={handleLoadMore}
                      className="px-4 py-2 text-sm bg-app-teal text-white rounded-lg hover:bg-app-teal/90 transition-colors"
                    >
                      Show More ({remainingCount} remaining)
                    </button>
                    <p className="text-xs text-app-gray">
                      Showing {visibleEntries.length} of {filteredEntries.length} entries
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <SummaryTable entries={filteredEntries} timeFormat={timeFormat} />
            )}
          </div>
        )}
      </div>

      {/* Debug JSON View */}
      {/* {filteredEntries.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium text-app-gray hover:text-app-charcoal">
            🔍 View Raw JSON Data ({filteredEntries.length} entries)
          </summary>
          <pre className="mt-4 p-4 bg-app-charcoal text-app-cream text-xs rounded-lg overflow-x-auto max-h-96">
            {JSON.str ingify(filteredEntries, null, 2)}
          </pre>
        </details>
      )} */}
    </div>
  );
}

// ============================================
// BACKUP PROMPT BANNER
// ============================================

interface BackupPromptBannerProps {
  onExport: () => void;
  onDismiss: () => void;
  entryCount: number;
}

function BackupPromptBanner({ onExport, onDismiss, entryCount }: BackupPromptBannerProps) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800">Back up your data</h3>
          <p className="text-sm text-amber-700 mt-1">
            You have {entryCount} {entryCount === 1 ? "entry" : "entries"} stored locally on this device. 
            Export to CSV to keep a backup, or{" "}
            <Link href="/settings" className="underline hover:text-amber-900">
              connect a Google Sheet
            </Link>{" "}
            for automatic cloud sync.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Export Now
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-sm text-amber-700 hover:text-amber-900 transition-colors"
            >
              Remind me later
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// SUMMARY STATISTICS PANEL
// ============================================

interface SummaryStatsPanelProps {
  stats: ReturnType<typeof calculateSummaryStats>;
  timeFormat: TimeFormat;
}

function SummaryStatsPanel({ stats }: SummaryStatsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    typeof window !== "undefined" && window.innerWidth < 640
  );  
  // Get top symptoms
  const topSymptoms = Object.entries(stats.symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Get top medicines
  const topMedicines = Object.entries(stats.medicineUsageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Format average duration
  const avgDuration = stats.avgDurationMinutes 
    ? stats.avgDurationMinutes < 60 
      ? `${stats.avgDurationMinutes} min`
      : `${Math.floor(stats.avgDurationMinutes / 60)}h ${stats.avgDurationMinutes % 60}m`
    : "—";

  return (
    <div className="card">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-lg font-semibold text-app-charcoal flex items-center gap-2">
          <svg className="w-5 h-5 text-app-plumb" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Summary Statistics
        </h3>
        <span className="text-app-gray text-xl">
          {isCollapsed ? "+" : "−"}
        </span>
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Entries" value={stats.totalEntries} icon="📊" />
            <StatCard
              label="Date Range"
              value={stats.dateRange
                ? `${formatDateShort(stats.dateRange.start)} - ${formatDateShort(stats.dateRange.end)}`
                : "—"
              }
              icon="📅"
              small
            />
            <StatCard label="Avg Duration" value={avgDuration} icon="⏱️" />
            <StatCard label="Most Active Day" value={getMostCommon(stats.entriesByDayOfWeek) || "—"} icon="📆" />
          </div>

          {/* Detailed Breakdowns */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Top Symptoms */}
            {topSymptoms.length > 0 && (
              <div className="bg-app-cream/50 rounded-lg border border-app-border p-3">
                <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
                  <span>Top Symptoms</span>
                  <span className="text-xs">Count</span>
                </h4>
                <div className="space-y-1">
                  {topSymptoms.map(([symptom, count]) => (
                    <div key={symptom} className="flex justify-between text-sm">
                      <span className="text-app-charcoal">{symptom}</span>
                      <span className="text-app-teal font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bristol Distribution */}
            {Object.keys(stats.bristolTypeCounts).length > 0 && (
              <div className="bg-app-cream/50 rounded-lg border border-app-border p-3">
                <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
                  <span>Bristol Types</span>
                  <span className="text-xs">Count</span>
                </h4>
                <div className="space-y-1">
                  {Object.entries(stats.bristolTypeCounts)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-app-charcoal">Type {type}</span>
                        <span className="text-app-plumb font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Cycle Phase Distribution */}
            {Object.keys(stats.cyclePhaseDistribution).length > 0 && (
              <div className="bg-app-cream/50 rounded-lg border border-app-border p-3">
                <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
                  <span>Cycle Phases</span>
                  <span className="text-xs">Count</span>
                </h4>
                <div className="space-y-1">
                  {Object.entries(stats.cyclePhaseDistribution).map(([phase, count]) => {
                    const phaseInfo = CYCLE_PHASES.find(p => p.value === phase);
                    return (
                      <div key={phase} className="flex justify-between text-sm">
                        <span className="text-app-charcoal">{phaseInfo?.label || phase}</span>
                        <span className="text-app-red font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Medicines */}
            {topMedicines.length > 0 && (
              <div className="bg-app-cream/50 rounded-lg border border-app-border p-3">
                <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
                  <span>Medicines Taken</span>
                  <span className="text-xs">Count</span>
                </h4>
                <div className="space-y-1">
                  {topMedicines.map(([medicine, count]) => (
                    <div key={medicine} className="flex justify-between text-sm">
                      <span className="text-app-charcoal truncate mr-2">{medicine}</span>
                      <span className="text-app-taupe font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time of Day */}
            {Object.keys(stats.entriesByTimeOfDay).length > 0 && (
              <div className="bg-app-cream/50 rounded-lg border border-app-border p-3">
                <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
                  <span>Time of Day</span>
                  <span className="text-xs">Count</span>
                </h4>
                <div className="space-y-1">
                  {["Morning", "Afternoon", "Evening", "Night"].map(tod => {
                    const count = stats.entriesByTimeOfDay[tod] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={tod} className="flex justify-between text-sm">
                        <span className="text-app-charcoal">{tod}</span>
                        <span className="text-app-gray font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  small = false
}: {
  label: string;
  value: string | number;
  icon: string;
  small?: boolean;
}) {
  return (
    <div className="p-3 bg-app-cream/50 rounded-lg border border-app-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-app-gray">{label}</span>
      </div>
      <p className={`font-semibold text-app-charcoal ${small ? "text-sm" : "text-lg"}`}>
        {value}
      </p>
    </div>
  );
}

// ============================================
// SUMMARY TABLE VIEW
// ============================================

interface SummaryTableProps {
  entries: StoredEntry[];
  timeFormat: TimeFormat;
}

function SummaryTable({ entries, timeFormat }: SummaryTableProps) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-app-cream border-b border-app-border">
            <tr>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Date</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Time</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Duration</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Symptoms</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Bristol</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Cycle</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Meds</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {entries.map((entry) => (
              <SummaryTableRow key={entry.id} entry={entry} timeFormat={timeFormat} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryTableRow({ entry, timeFormat }: { entry: StoredEntry; timeFormat: TimeFormat }) {
  // Calculate duration
  const duration = calculateDuration(entry.startTime, entry.endTime);
  
  // Get symptom count
  const symptomCount = Object.keys(entry.symptomIntensities).length + 
                       Object.keys(entry.periodSymptomIntensities).length;
  
  // Get top symptom (by intensity, treating null as logged-without-intensity)
  const allSymptoms = {
    ...entry.symptomIntensities,
    ...entry.periodSymptomIntensities
  };
  const topSymptom = Object.entries(allSymptoms)
    .sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1))[0];
  
  // Get medicine count
  const medCount = entry.medicineLog.length;
  
  return (
    <tr className="hover:bg-app-cream/50 transition-colors">
      {/* Date */}
      <td className="p-3 whitespace-nowrap">
        <div>
          <p className="font-medium text-app-charcoal">{formatDateShort(entry.date)}</p>
          <p className="text-xs text-app-gray">{getDayOfWeek(entry.date)}</p>
        </div>
      </td>
      
      {/* Time */}
      <td className="p-3 whitespace-nowrap text-app-gray">
        {formatTimeForDisplay(entry.startTime, timeFormat)} → {formatTimeForDisplay(entry.endTime, timeFormat)}
      </td>
      
      {/* Duration */}
      <td className="p-3 whitespace-nowrap text-app-charcoal">
        {duration}
      </td>
      
      {/* Symptoms */}
      <td className="p-3">
        {symptomCount > 0 ? (
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-app-teal/10 text-app-teal text-xs rounded-full">
              {symptomCount} logged
            </span>
            {topSymptom && (
              <p className="text-xs text-app-gray mt-1 truncate max-w-[120px]">
                Top: {topSymptom[0]}
                {topSymptom[1] !== null && ` (${topSymptom[1]})`}
              </p>
            )}
          </div>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
      
      {/* Bristol */}
      <td className="p-3 whitespace-nowrap">
        {entry.stoolType ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-app-plumb/10 text-app-plumb text-xs rounded-full">
            Type {entry.stoolType}
          </span>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
      
      {/* Cycle Phase */}
      <td className="p-3 whitespace-nowrap">
        {entry.cyclePhase ? (
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-app-red/10 text-app-red text-xs rounded-full capitalize">
              {entry.cyclePhase.replace("_", " ")}
            </span>
            {entry.periodFlow && (
              <p className="text-xs text-app-gray mt-1 capitalize">{entry.periodFlow}</p>
            )}
          </div>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
      
      {/* Medicines */}
      <td className="p-3 whitespace-nowrap">
        {medCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-app-taupe/20 text-app-charcoal text-xs rounded-full">
            {medCount} taken
          </span>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
      
      {/* Notes */}
      <td className="p-3 max-w-[150px]">
        {entry.notes ? (
          <p className="text-xs text-app-gray truncate" title={entry.notes}>
            {entry.notes}
          </p>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
    </tr>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-app-charcoal mb-2">{title}</p>
      <div className="pl-2">{children}</div>
    </div>
  );
}

function DataRow({ 
  label, 
  value, 
  mono = false,
  error = false 
}: { 
  label: string; 
  value: string | number | null; 
  mono?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-app-gray">{label}:</span>
      <span className={`
        ${mono ? "font-mono text-xs" : ""} 
        ${error ? "text-app-red" : "text-app-charcoal"}
      `}>
        {value ?? "—"}
      </span>
    </div>
  );
}

interface EmptyStateProps {
  hasAnyEntries: boolean;
  hasDateFilteredEntries: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function EmptyState({ 
  hasAnyEntries, 
  hasDateFilteredEntries, 
  hasActiveFilters,
  onClearFilters 
}: EmptyStateProps) {
  // Determine which message to show
  const getMessage = () => {
    if (!hasAnyEntries) {
      return {
        title: "No entries yet",
        description: "Start logging to see your history here",
        showLogButton: true,
      };
    }
    
    if (hasActiveFilters && hasDateFilteredEntries) {
      return {
        title: "No entries match your filters",
        description: "Try adjusting or clearing your filters to see more entries",
        showClearFilters: true,
      };
    }
    
    return {
      title: "No entries in this date range",
      description: "Try adjusting your date filters or select 'All Time'",
      showLogButton: false,
    };
  };

  const message = getMessage();

  return (
    <div className="card text-center py-12">
      <span className="text-4xl block mb-4">📋</span>
      <h3 className="text-lg font-semibold text-app-charcoal mb-2">
        {message.title}
      </h3>
      <p className="text-app-gray mb-4">
        {message.description}
      </p>
      
      {message.showLogButton && (
        <Link
          href="/entry"
          className="inline-flex items-center gap-2 px-6 py-3 bg-app-teal text-white font-medium rounded-lg hover:bg-app-teal/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Your First Entry
        </Link>
      )}
      
      {message.showClearFilters && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-6 py-3 bg-app-teal text-white font-medium rounded-lg hover:bg-app-teal/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear All Filters
        </button>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 bg-app-border rounded animate-pulse" />
        <div className="h-4 w-48 bg-app-border rounded animate-pulse mt-2" />
      </div>
      <div className="h-12 bg-app-border rounded-lg animate-pulse" />
      <div className="h-24 bg-app-border rounded-lg animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="card">
          <div className="h-6 w-32 bg-app-border rounded animate-pulse" />
          <div className="h-4 w-24 bg-app-border rounded animate-pulse mt-2" />
          <div className="flex gap-2 mt-3">
            <div className="h-6 w-20 bg-app-border rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-app-border rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getFilterLabel(filter: DateRangeFilter): string {
  switch (filter) {
    case "7": return "7 Days";
    case "30": return "30 Days";
    case "90": return "90 Days";
    case "all": return "All Time";
    case "custom": return "Input Custom";
    default: return filter;
  }
}

function formatDate(dateStr: string): string {
  // Parse YYYY-MM-DD as local date, not UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeForDisplay(timeStr: string, format: TimeFormat): string {
  if (!timeStr) return "";
  
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  
  if (format === "24h") {
    return `${hourStr.padStart(2, "0")}:${minute}`;
  }
  
  // 12h format
  if (hour === 0) return `12:${minute} AM`;
  if (hour === 12) return `12:${minute} PM`;
  if (hour > 12) return `${hour - 12}:${minute} PM`;
  return `${hour}:${minute} AM`;
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "—";
  
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  let startTotal = startHour * 60 + startMin;
  let endTotal = endHour * 60 + endMin;
  
  // Handle crossing midnight
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }
  
  const duration = endTotal - startTotal;
  
  if (duration < 60) {
    return `${duration}m`;
  }
  
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

function getMostCommon(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}