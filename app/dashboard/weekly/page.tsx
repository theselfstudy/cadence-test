"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

import { useEntries, useEntriesRevision } from "@/stores/useEntries";
// import { useEntries, useEntriesHydrated, useEntriesRevision } from "@/stores/useEntries";
import { useFreshData } from "@/hooks/useFreshData";
import { useSettings } from "@/stores/useSettings";

import {
  getWeekRange,
  getEntriesForWeek,
  getDataWeekBounds,
  calculateWeeklyStats,
  compareWeeks,
} from "@/lib/weeklyUtils";

import {
  WeeklyNavigation,
  DayFilterBar,
  WeeklyStatsCards,
  WeeklyComparison,
  WeeklyCharts,
} from "@/components/weekly";

import { FilterBar } from "@/components/history";
import { useWeeklyFilters } from "@/hooks/useWeeklyFilters";

// import { BRISTOL_TYPES, POST_BOWEL_FEELINGS, CYCLE_PHASES } from "@/lib/constants";
import type { StoredEntry, TimeFormat } from "@/types";
import { EntryCard } from "@/components/ui/EntryCard";
import { SyncWithGoogleSheetsButton, SyncStatusBadge } from "@/components/sync";

// ============================================
// TYPES
// ============================================

type ViewMode = "cards" | "table";

// Day names in standard order
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ============================================
// WEEKLY PAGE
// ============================================

export default function WeeklyPage() {
  // Client-side rendering guard - wait for both client mount AND store hydration
  const [isClient, setIsClient] = useState(false);
  // const isHydrated = useEntriesHydrated();

  // Store data
  const entries = useEntries((state) => state.entries);
  const revision = useEntriesRevision();
  const renderKey = useFreshData();
  const weekStartDay = useSettings((state) => state.weekStartDay);
  const timeFormat = useSettings((state) => state.timeFormat);
  const stoolTrackingEnabled = useSettings((state) => state.stoolTracking.enabled);
  const periodTrackingEnabled = useSettings((state) => state.periodTracking.enabled);
  const medicineTrackingEnabled = useSettings((state) => state.medicineTracking.enabled);
  const symptomsEnabled = useSettings((state) => state.symptoms.enabled);
  const isGoogleSheetConnected = useSettings((state) => state.isGoogleSheetConnected);

  const settings = useSettings();

  // Week navigation state
  const [weekOffset, setWeekOffset] = useState(0);

  // Day filter state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showStats, setShowStats] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [showEntries, setShowEntries] = useState(true);

  // Initialize client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get week range for current offset
  const weekRange = useMemo(
    () => getWeekRange(weekStartDay, weekOffset),
    [weekStartDay, weekOffset]
  );

  // Get previous week range for comparison labels
  const prevWeekRange = useMemo(
    () => getWeekRange(weekStartDay, weekOffset - 1),
    [weekStartDay, weekOffset]
  );

  // Get data bounds (earliest/latest weeks with data)
  const dataBounds = useMemo(
    () => getDataWeekBounds(entries, weekStartDay),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, weekStartDay, revision, renderKey]
  );

  // Get entries for current week
  const weekEntries = useMemo(
    () => getEntriesForWeek(entries, weekStartDay, weekOffset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, weekStartDay, weekOffset, revision, renderKey]
  );

  // Get entries for previous week (for comparison)
  const prevWeekEntries = useMemo(
    () => getEntriesForWeek(entries, weekStartDay, weekOffset - 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, weekStartDay, weekOffset, revision, renderKey]
  );

  // Calculate ordered days based on user preference
  const orderedDays = useMemo(() => {
    const { start } = weekRange;
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(DAY_NAMES[date.getDay()]);
    }
    return days;
  }, [weekRange]);

  // Count entries per day
  const entriesPerDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const day of orderedDays) {
      counts[day] = 0;
    }
    for (const entry of weekEntries) {
      const date = new Date(entry.date + "T12:00:00");
      const dayName = DAY_NAMES[date.getDay()];
      counts[dayName] = (counts[dayName] || 0) + 1;
    }
    return counts;
  }, [weekEntries, orderedDays]);

  // Filter entries by selected days first
  const dayFilteredEntries = useMemo(() => {
    if (selectedDays.length === 0) return weekEntries;

    return weekEntries.filter((entry) => {
      const date = new Date(entry.date + "T12:00:00");
      const dayName = DAY_NAMES[date.getDay()];
      return selectedDays.includes(dayName);
    });
  }, [weekEntries, selectedDays]);

  // Use the advanced filters hook
  const {
    filters,
    filteredEntries,
    activeFilterCount,
    categoryFilterCounts,
    availableOptions,
    hasFilters: hasAdvancedFilters,
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
  } = useWeeklyFilters(dayFilteredEntries);

  // Calculate stats for filtered entries
  const stats = useMemo(() => calculateWeeklyStats(filteredEntries), [filteredEntries]);
  
  // Calculate cycle data for stats card
  const cycleData = useMemo(() => {
    const phaseDates: Record<string, Set<string>> = {};
    const daysWithCycleData = new Set<string>();
    
    for (const entry of filteredEntries) {
      if (entry.cyclePhase) {
        if (!phaseDates[entry.cyclePhase]) {
          phaseDates[entry.cyclePhase] = new Set();
        }
        phaseDates[entry.cyclePhase].add(entry.date);
        daysWithCycleData.add(entry.date);
      }
    }
    
    // Phase distribution - count unique days per phase
    const phaseDistribution: Record<string, number> = {};
    for (const [phase, dates] of Object.entries(phaseDates)) {
      phaseDistribution[phase] = dates.size;
    }
    
    // Most common phase (by unique days, not entries)
    let currentPhase: string | null = null;
    let maxCount = 0;
    for (const [phase, count] of Object.entries(phaseDistribution)) {
      if (count > maxCount) {
        maxCount = count;
        currentPhase = phase;
      }
    }
    
    // Calculate phase ranges (consecutive date ranges)
    const phaseRanges: { phase: string; startDate: string; endDate: string | null; days: number }[] = [];
    
    // Get all dates with phases, sorted
    const allDatesWithPhase: { date: string; phase: string }[] = [];
    for (const entry of filteredEntries) {
      if (entry.cyclePhase) {
        // Only add if not already present (dedupe by date, keep first phase for that date)
        if (!allDatesWithPhase.some(d => d.date === entry.date)) {
          allDatesWithPhase.push({ date: entry.date, phase: entry.cyclePhase });
        }
      }
    }
    allDatesWithPhase.sort((a, b) => a.date.localeCompare(b.date));
    
    // Group consecutive days with same phase
    let currentRange: { phase: string; startDate: string; endDate: string | null; days: number } | null = null;
    
    for (const { date, phase } of allDatesWithPhase) {
      if (!currentRange) {
        currentRange = { phase, startDate: date, endDate: date, days: 1 };
      } else if (currentRange.phase === phase && isConsecutiveDate(currentRange.endDate!, date)) {
        currentRange.endDate = date;
        currentRange.days += 1;
      } else {
        phaseRanges.push(currentRange);
        currentRange = { phase, startDate: date, endDate: date, days: 1 };
      }
    }
    
    if (currentRange) {
      phaseRanges.push(currentRange);
    }
    
    return {
      currentCyclePhase: currentPhase,
      cycleDaysLogged: daysWithCycleData.size,
      phaseDistribution,
      phaseRanges,
    };
  }, [filteredEntries]);

  // Helper to check if two dates are consecutive
  function isConsecutiveDate(date1: string, date2: string): boolean {
    const d1 = new Date(date1 + "T12:00:00");
    const d2 = new Date(date2 + "T12:00:00");
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays === 1;
  }

  // Calculate top symptoms with intensities for the stats card
  const topSymptoms = useMemo(() => {
    const symptomStats: Record<string, { 
        count: number; 
        totalIntensity: number; 
        intensityCount: number;
        isPeriodRelated: boolean;
    }> = {};

    for (const entry of filteredEntries) {
        // Regular symptoms
        for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
        if (!symptomStats[symptom]) {
            symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, isPeriodRelated: false };
        }
        symptomStats[symptom].count += 1;
        if (intensity !== null) {
            symptomStats[symptom].totalIntensity += intensity;
            symptomStats[symptom].intensityCount += 1;
        }
        }
        // Period-related symptoms
        for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
        if (!symptomStats[symptom]) {
            symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, isPeriodRelated: true };
        }
        symptomStats[symptom].count += 1;
        symptomStats[symptom].isPeriodRelated = true;
        if (intensity !== null) {
            symptomStats[symptom].totalIntensity += intensity;
            symptomStats[symptom].intensityCount += 1;
        }
        }
    }

    return Object.entries(symptomStats)
        .map(([name, data]) => ({
        name,
        count: data.count,
        avgIntensity:
            data.intensityCount > 0
            ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10
            : null,
        isPeriodRelated: data.isPeriodRelated,
    }))
        .sort((a, b) => b.count - a.count);
  }, [filteredEntries]);

    // Calculate last week's top symptoms for comparison
    const lastWeekTopSymptoms = useMemo(() => {
        const symptomStats: Record<string, { 
            count: number; 
            totalIntensity: number; 
            intensityCount: number;
            isPeriodRelated: boolean;
        }> = {};

        for (const entry of prevWeekEntries) {
            // Regular symptoms
            for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
            if (!symptomStats[symptom]) {
                symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, isPeriodRelated: false };
            }
            symptomStats[symptom].count += 1;
            if (intensity !== null) {
                symptomStats[symptom].totalIntensity += intensity;
                symptomStats[symptom].intensityCount += 1;
            }
            }
            // Period-related symptoms
            for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
            if (!symptomStats[symptom]) {
                symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, isPeriodRelated: true };
            }
            symptomStats[symptom].count += 1;
            symptomStats[symptom].isPeriodRelated = true;
            if (intensity !== null) {
                symptomStats[symptom].totalIntensity += intensity;
                symptomStats[symptom].intensityCount += 1;
            }
            }
        }

        return Object.entries(symptomStats)
            .map(([name, data]) => ({
            name,
            count: data.count,
            avgIntensity:
                data.intensityCount > 0
                ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10
                : null,
            isPeriodRelated: data.isPeriodRelated,
            }))
            .sort((a, b) => b.count - a.count);
        }, [prevWeekEntries]);

  // Week-over-week comparison (uses full week data, not filtered)
  const comparison = useMemo(
    () => compareWeeks(weekEntries, prevWeekEntries),
    [weekEntries, prevWeekEntries]
  );

  // Toggle day selection
  const handleToggleDay = (day: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  // Select all days (clear selection)
  const handleSelectAllDays = () => {
    setSelectedDays([]);
  };

  // Clear all filters (both day and advanced)
  const handleClearAllFilters = () => {
    setSelectedDays([]);
    clearAllFilters();
  };
  // Total active filter count
  const totalFilterCount = selectedDays.length + activeFilterCount;

  // Enabled sections config
  const enabledSections = {
    symptoms: symptomsEnabled,
    bowel: stoolTrackingEnabled,
    cycle: periodTrackingEnabled,
    medicine: medicineTrackingEnabled,
  };

  // if (!isClient || !isHydrated) {
  //   return <WeeklyPageSkeleton />;
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
            <h1 className="text-2xl font-bold text-app-charcoal">Weekly View</h1>
          </div>
          <p className="text-app-gray mt-1">Summary and trends per week</p>
          {isGoogleSheetConnected && (
            <div className="mt-2">
              <SyncStatusBadge />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Filter count badge */}
          {totalFilterCount > 0 && (
            <span className="text-sm text-app-teal">
              {totalFilterCount} filter{totalFilterCount !== 1 ? "s" : ""} active
            </span>
          )}
          {isGoogleSheetConnected && (
            <SyncWithGoogleSheetsButton variant="subtle" />
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <WeeklyNavigation
        weekRange={weekRange}
        weekOffset={weekOffset}
        earliestWeekOffset={dataBounds.earliest}
        onWeekChange={setWeekOffset}
        hasDataThisWeek={weekEntries.length > 0}
      />

      {/* Filters Section */}
      <div className="card">
        {/* Day Filters */}
        <DayFilterBar
          weekStartDay={weekStartDay}
          selectedDays={selectedDays}
          onToggleDay={handleToggleDay}
          onSelectAllDays={handleSelectAllDays}
          entriesPerDay={entriesPerDay}
        />

        {/* Category Filters */}
        <div className="mt-4 pt-4 border-t border-app-border">
        <FilterBar
            filters={filters}
            availableOptions={availableOptions}
            categoryFilterCounts={categoryFilterCounts}
            hasFilters={hasAdvancedFilters}
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
            hideSavedFilters={true}
        />
        </div>

        {/* Clear All Filters */}
        {totalFilterCount > 0 && (
          <div className="mt-4 pt-4 border-t border-app-border flex justify-end">
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-app-red hover:text-app-red/80 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Entry Count Summary */}
      {(totalFilterCount > 0 || filteredEntries.length !== weekEntries.length) && (
        <p className="text-sm text-app-gray">
          Showing {filteredEntries.length} of {weekEntries.length} entries this week
        </p>
      )}

      {/* Week at a Glance Section */}
      <div className="card">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-app-charcoal">Week at a Glance</h2>
          <span className="text-app-gray text-xl">{showStats ? "−" : "+"}</span>
        </button>

        {showStats && (
          <div className="mt-4">
            <WeeklyStatsCards
              stats={stats}
              comparison={comparison}
              hasPreviousWeekData={prevWeekEntries.length > 0}
              topSymptoms={topSymptoms}
              lastWeekTopSymptoms={lastWeekTopSymptoms}
              periodTrackingEnabled={periodTrackingEnabled}
              currentCyclePhase={cycleData.currentCyclePhase}
              cycleDaysLogged={cycleData.cycleDaysLogged}
              phaseDistribution={cycleData.phaseDistribution}
              phaseRanges={cycleData.phaseRanges}
              enabledSections={enabledSections}
            />
          </div>
        )}
      </div>

      {/* Weekly Charts Section */}
      <div className="card">
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-app-charcoal">Weekly Charts</h2>
          <span className="text-app-gray text-xl">{showCharts ? "−" : "+"}</span>
        </button>

        {showCharts && (
          <div className="mt-4">
            <WeeklyCharts
              entries={weekEntries}
              orderedDays={orderedDays}
              enabledSections={enabledSections}
              onDayClick={handleToggleDay}
              selectedDays={selectedDays}
              onClearFilter={handleSelectAllDays}
              customProducts={settings.periodTracking.productTracking?.customProducts}
              medicines={settings.medicineTracking.medicines}
              weekLabel={weekRange.label}
            />
          </div>
        )}
      </div>

      {/* Week over Week Section */}
      <div className="card">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-app-charcoal">Week over Week</h2>
          <span className="text-app-gray text-xl">{showComparison ? "−" : "+"}</span>
        </button>

        {showComparison && (
          <div className="mt-4">
            <WeeklyComparison
              comparison={comparison}
              hasPreviousWeekData={prevWeekEntries.length > 0}
              thisWeekLabel={weekRange.label}
              lastWeekLabel={prevWeekRange.label}
              thisWeekStartLabel={formatWeekStart(weekRange.start)}
              lastWeekStartLabel={formatWeekStart(prevWeekRange.start)}
              enabledSections={enabledSections}
            />
          </div>
        )}
      </div>

      {/* Entry List Section - Shown by default */}
      <div className="card">
        <div
          onClick={() => setShowEntries(!showEntries)}
          className="w-full flex items-center justify-between cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowEntries(!showEntries);
            }
          }}
        >
          <div>
            <h2 className="text-lg font-semibold text-app-charcoal">
              Entries ({filteredEntries.length})
            </h2>
            {filteredEntries.length !== weekEntries.length && (
              <p className="text-xs text-app-gray">
                Filtered from {weekEntries.length} total
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle (only when expanded) */}
            {showEntries && (
              <div className="flex rounded-lg overflow-hidden border border-app-border">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode("cards");
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode("table");
                  }}
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
            <span className="text-app-gray text-xl">{showEntries ? "−" : "+"}</span>
          </div>
        </div>

        {showEntries && (
          <div className="mt-4">
            {filteredEntries.length === 0 ? (
              <EmptyEntriesState
                hasWeekEntries={weekEntries.length > 0}
                hasFilters={totalFilterCount > 0}
                onClearFilters={handleClearAllFilters}
              />
            ) : viewMode === "cards" ? (
              <EntryCard
                entries={filteredEntries}
                timeFormat={timeFormat}
                customProducts={settings.periodTracking.productTracking?.customProducts}
              />
            ) : (
              <EntryTable entries={filteredEntries} timeFormat={timeFormat} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ENTRY TABLE COMPONENT
// ============================================

interface EntryTableProps {
  entries: StoredEntry[];
  timeFormat: TimeFormat;
}

function EntryTable({ entries, timeFormat }: EntryTableProps) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full text-sm">
          <thead className="bg-app-cream border-b border-app-border">
            <tr>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Date
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Time
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Symptoms
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Bristol
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Cycle
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Meds
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-app-cream/50 transition-colors">
                <td className="p-3 whitespace-nowrap">
                  <p className="font-medium text-app-charcoal">{formatDateShort(entry.date)}</p>
                  <p className="text-xs text-app-gray">{getDayOfWeek(entry.date)}</p>
                </td>
                <td className="p-3 whitespace-nowrap text-app-gray">
                  {formatTimeForDisplay(entry.startTime, timeFormat)}
                </td>
                <td className="p-3">
                  {Object.keys(entry.symptomIntensities).length +
                    Object.keys(entry.periodSymptomIntensities).length >
                  0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-app-teal/10 text-app-teal text-xs rounded-full">
                      {Object.keys(entry.symptomIntensities).length +
                        Object.keys(entry.periodSymptomIntensities).length}{" "}
                      logged
                    </span>
                  ) : (
                    <span className="text-app-gray">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {entry.stoolType ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-app-plumb/10 text-app-plumb text-xs rounded-full">
                      Type {entry.stoolType}
                    </span>
                  ) : (
                    <span className="text-app-gray">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {entry.cyclePhase ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-app-red/10 text-app-red text-xs rounded-full capitalize">
                      {entry.cyclePhase.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="text-app-gray">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {entry.medicineLog.length > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-app-taupe/20 text-app-charcoal text-xs rounded-full">
                      {entry.medicineLog.length} taken
                    </span>
                  ) : (
                    <span className="text-app-gray">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATES
// ============================================

interface EmptyEntriesStateProps {
  hasWeekEntries: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}

function EmptyEntriesState({ hasWeekEntries, hasFilters, onClearFilters }: EmptyEntriesStateProps) {
  if (hasFilters && hasWeekEntries) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🔍</span>
        <p className="text-app-charcoal font-medium">No entries match your filters</p>
        <p className="text-sm text-app-gray mt-1">Try adjusting your filters</p>
        <button
          onClick={onClearFilters}
          className="mt-4 px-4 py-2 text-sm bg-app-teal text-white rounded-lg hover:bg-app-teal/90 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <span className="text-3xl block mb-2">📋</span>
      <p className="text-app-charcoal font-medium">No entries this week</p>
      <p className="text-sm text-app-gray mt-1">Start logging to see your entries here</p>
      <Link
        href="/entry"
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-app-teal text-white rounded-lg hover:bg-app-teal/90 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Log Entry
      </Link>
    </div>
  );
}

function WeeklyPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 bg-app-border rounded animate-pulse" />
      <div className="h-24 bg-app-border rounded-xl animate-pulse" />
      <div className="h-16 bg-app-border rounded-lg animate-pulse" />
      <div className="h-64 bg-app-border rounded-lg animate-pulse" />
      <div className="h-48 bg-app-border rounded-lg animate-pulse" />
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatWeekStart(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
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

