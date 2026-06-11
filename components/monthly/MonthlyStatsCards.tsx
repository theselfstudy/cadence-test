"use client";

import { useState } from "react";
import type { MonthlyStats, MonthComparison } from "@/lib/monthlyUtils";

// ============================================
// MONTHLY STATS CARDS
// Shows: Top Symptom, Timing Patterns, Cycle Phase, New This Month
// ============================================

interface MonthlyStatsCardsProps {
  /** Stats for the current month or selected date range */
  stats: MonthlyStats;
  /** Comparison with previous month */
  comparison: MonthComparison | null;
  /** Whether there's data from the previous month */
  hasPreviousMonthData: boolean;
  /** Top symptoms with intensities for this month or selected range */
  topSymptoms?: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  /** Top symptoms from last month for comparison */
  lastMonthTopSymptoms?: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  /** Current cycle phase from this month's entries */
  currentCyclePhase?: string | null;
  /** Days logged with cycle data this month */
  cycleDaysLogged?: number;
  /** Total days in the current month */
  daysInMonth?: number;
  /** Getting phase ranges per month from entries */
  phaseRanges?: { phase: string; startDate: string; endDate: string | null; days: number }[];
  /** Currently selected dates (full YYYY-MM-DD strings, can span months) */
  selectedDates?: string[];
  /** Currently selected days in current month only (for UI highlighting) */
  selectedDaysInCurrentMonth?: number[];
  /** Current month range for date formatting */
  monthRange?: { year: number; month: number; label: string };
  /** Enabled sections config */
  enabledSections: {
    symptoms: boolean;
    bowel: boolean;
    cycle: boolean;
    medicine: boolean;
  };
}

export function MonthlyStatsCards({
  stats,
  comparison,
  hasPreviousMonthData,
  topSymptoms = [],
  lastMonthTopSymptoms = [],
  currentCyclePhase = null,
  cycleDaysLogged = 0,
  daysInMonth = 30,
  phaseRanges = [],
  selectedDates = [],
  selectedDaysInCurrentMonth = [],
  monthRange,
  enabledSections,
}: MonthlyStatsCardsProps) {
// Helper to format date range for display (supports cross-month)
  const formatDateRangeLabel = (): string | null => {
    if (selectedDates.length === 0) return null;
    
    const sortedDates = [...selectedDates].sort();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const formatDate = (dateStr: string): string => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return `${monthNames[month - 1]} ${day}`;
    };
    
    const formatDateWithYear = (dateStr: string): string => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return `${monthNames[month - 1]} ${day}, ${year}`;
    };
    
    if (sortedDates.length === 1) {
      return formatDateWithYear(sortedDates[0]);
    }
    
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    
    // Check if same month
    const firstMonth = firstDate.substring(0, 7); // YYYY-MM
    const lastMonth = lastDate.substring(0, 7);
    
    if (firstMonth === lastMonth) {
      // Same month - show compact range
      const [year, month] = firstDate.split("-").map(Number);
      const firstDay = parseInt(firstDate.split("-")[2], 10);
      const lastDay = parseInt(lastDate.split("-")[2], 10);
      return `${monthNames[month - 1]} ${firstDay}-${lastDay}, ${year}`;
    }
    
    // Cross-month - show full range
    const [firstYear] = firstDate.split("-").map(Number);
    const [lastYear] = lastDate.split("-").map(Number);
    
    if (firstYear === lastYear) {
      return `${formatDate(firstDate)} - ${formatDate(lastDate)}, ${firstYear}`;
    }
    
    return `${formatDateWithYear(firstDate)} - ${formatDateWithYear(lastDate)}`;
  };

  const dateRangeLabel = formatDateRangeLabel();
  const hasDateFilter = selectedDates.length > 0;

  // Calculate number of visible cards to adjust grid layout
  const visibleCards = [
    enabledSections.symptoms, // Top Symptom Card
    enabledSections.bowel, // Timing Patterns Card
    enabledSections.cycle, // Cycle Phase Card
    enabledSections.symptoms, // New This Month Card
  ].filter(Boolean).length;

  // Determine grid class based on number of visible cards
  // For 1 card: full width
  // For 2 cards: 2 columns
  // For 3 cards: 3 columns on medium screens, 2 on small
  // For 4 cards: 2x2 grid
  const getGridClass = () => {
    if (visibleCards === 0) return "grid grid-cols-1";
    if (visibleCards === 1) return "grid grid-cols-1";
    if (visibleCards === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-3";
    if (visibleCards === 3) return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3";
    return "grid grid-cols-1 sm:grid-cols-2 gap-3"; // 4 cards
  };

  return (
    <div className={getGridClass()}>
      {/* Top Symptom Card - only if symptom tracking enabled */}
      {enabledSections.symptoms && (
        <StatCard
          label="Top Symptom"
          value={topSymptoms[0]?.name || "—"}
          subtext={
            topSymptoms[0]
              ? hasDateFilter && dateRangeLabel
                ? `${topSymptoms[0].count}× (${dateRangeLabel})`
                : `${topSymptoms[0].count}× this month`
              : hasDateFilter
                ? "No symptoms in selected range"
                : "No symptoms logged"
          }
          accentColor="teal"
          valueSize="small"
          expandedContent={
            topSymptoms.length > 0 ? (
              <div className="space-y-3">
                {/* Top 5 by Count */}
                <div>
                  <p className="text-xs text-app-gray mb-1">Most Frequent</p>
                  <div className="bg-app-cream rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-app-border/50">
                          <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                          <th className="py-1.5 px-2 text-right text-app-gray font-medium">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSymptoms.slice(0, 5).map((symptom) => (
                          <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                            <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[120px]">
                              {symptom.name}
                            </td>
                            <td className="py-1.5 px-2 text-app-teal text-right font-medium">
                              {symptom.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly summary */}
                <div className="pt-2 border-t border-app-border">
                  <p className="text-xs text-app-gray">
                    {stats.uniqueSymptoms} unique symptom{stats.uniqueSymptoms !== 1 ? "s" : ""} logged across {stats.daysWithEntries} day{stats.daysWithEntries !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-app-gray">Log symptoms to see patterns.</p>
            )
          }
        />
      )}

      {/* Timing Patterns Card - only if bowel tracking enabled */}
      {enabledSections.bowel && (
        <StatCard
          label="Timing Patterns"
          value={getMostCommonTimeOfDay(stats.timeOfDayDistribution) || "—"}
          subtext={
            Object.keys(stats.timeOfDayDistribution).length > 0
              ? "most common time"
              : "No timing data"
          }
          accentColor="plumb"
          expandedContent={
            Object.keys(stats.timeOfDayDistribution).length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-app-gray mb-1">Distribution</p>
                <div className="bg-app-cream rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      {["Morning", "Afternoon", "Evening", "Night"].map((time) => {
                        const count = stats.timeOfDayDistribution[time] || 0;
                        if (count === 0) return null;
                        const total = Object.values(stats.timeOfDayDistribution).reduce((sum, v) => sum + v, 0);
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <tr key={time} className="border-b border-app-border/50 last:border-0">
                            <td className="py-1.5 px-2 text-app-charcoal">{time}</td>
                            <td className="py-1.5 px-2 text-app-gray text-right">
                              {count} <span className="text-app-gray/60">({percent}%)</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Most active day of week */}
                {stats.mostActiveDay && (
                  <div className="pt-2 border-t border-app-border">
                    <p className="text-xs text-app-gray">
                      Most active day: <span className="text-app-charcoal font-medium">{stats.mostActiveDay}</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-app-gray">Log entries to see timing patterns.</p>
            )
          }
        />
      )}

      {/* Cycle Phase Card - only if period tracking enabled */}
      {enabledSections.cycle && (
        <CyclePhaseCard
          currentPhase={currentCyclePhase}
          daysLogged={cycleDaysLogged}
          daysInMonth={daysInMonth}
          topSymptoms={topSymptoms}
          phaseRanges={phaseRanges}
          hasDateFilter={hasDateFilter}
          dateRangeLabel={dateRangeLabel}
          phaseDistribution={comparison?.cycle.thisMonth.phaseDistribution}
          monthRange={monthRange}
          selectedDates={selectedDates}
          selectedDaysInCurrentMonth={selectedDaysInCurrentMonth}
        />
      )}

      {/* New This Month Card - only if symptom tracking enabled */}
      {enabledSections.symptoms && (
        <NewThisMonthCard
          comparison={comparison}
          hasPreviousMonthData={hasPreviousMonthData}
          topSymptoms={topSymptoms}
          lastMonthTopSymptoms={lastMonthTopSymptoms}
          hasDateFilter={hasDateFilter}
        />
      )}
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accentColor: "teal" | "plumb" | "red" | "taupe" | "charcoal";
  valueSize?: "normal" | "small";
  expandedContent?: React.ReactNode;
}

function StatCard({
  label,
  value,
  subtext,
  accentColor,
  valueSize = "normal",
  expandedContent,
}: StatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 768;

  const showContent = isDesktop
    ? isExpanded || isHovered
    : isExpanded;


  const accentClasses: Record<string, string> = {
    teal: "bg-app-teal",
    plumb: "bg-app-plumb",
    red: "bg-app-red",
    taupe: "bg-app-taupe",
    charcoal: "bg-app-charcoal",
  };

  const borderClasses: Record<string, string> = {
    teal: "border-app-teal",
    plumb: "border-app-plumb",
    red: "border-app-red",
    taupe: "border-app-taupe",
    charcoal: "border-app-charcoal",
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-app-white rounded-xl border-2 shadow-sm overflow-hidden text-left transition-all duration-200 ${
          showContent
            ? `${borderClasses[accentColor]} shadow-md`
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Accent bar */}
        <div className={`h-1 ${accentClasses[accentColor]}`} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
              {label}
            </p>
            {expandedContent && (
              <svg
                className={`w-3.5 h-3.5 text-app-gray transition-transform flex-shrink-0 ${
                  showContent ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>

          {/* Main Value */}
          <p
            className={`font-bold text-app-charcoal mt-1 ${
              valueSize === "small" ? "text-lg truncate" : "text-2xl"
            }`}
          >
            {value}
          </p>

          {subtext && <p className="text-xs text-app-gray mt-1">{subtext}</p>}

          {/* Mobile: conditional mount */}
          <div className="block md:hidden">
            {showContent && (
              <div className="mt-3 pt-3 border-t border-app-border">
                {expandedContent}
              </div>
            )}
          </div>

          {/* Desktop: preserve existing behavior */}
          <div
            className={`
              hidden md:block overflow-hidden
              transition-[max-height,margin,padding] duration-300 ease-in-out
              ${showContent
                ? "max-h-[400px] mt-3 pt-3 border-t border-app-border"
                : "max-h-0 mt-0 pt-0 border-t-0"}
            `}
          >
            {expandedContent}
          </div>
        </div>
      </button>
    </div>
  );
}

// ============================================
// CYCLE PHASE CARD
// ============================================

interface CyclePhaseCardProps {
  currentPhase: string | null;
  daysLogged: number;
  daysInMonth: number;
  topSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  phaseRanges: { phase: string; startDate: string; endDate: string | null; days: number }[];
  hasDateFilter?: boolean;
  dateRangeLabel?: string | null;
  phaseDistribution?: Record<string, number>;
  monthRange?: { year: number; month: number; label: string };
  selectedDates?: string[];
  selectedDaysInCurrentMonth?: number[];
}

function CyclePhaseCard({ 
  currentPhase, 
  // daysLogged, 
  topSymptoms,
  phaseRanges,
  hasDateFilter = false,
  dateRangeLabel,
  phaseDistribution = {},
  monthRange,
  selectedDates = [],
  selectedDaysInCurrentMonth = [],
}: CyclePhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 768;

  const showContent = isDesktop
    ? isExpanded || isHovered
    : isExpanded;
  
  // Find highest intensity symptom (with isPeriodRelated info)
  const highestIntensity = topSymptoms
    .filter((s) => s.avgIntensity !== null)
    .sort((a, b) => (b.avgIntensity ?? 0) - (a.avgIntensity ?? 0))[0] as
    | { name: string; avgIntensity: number; count: number; isPeriodRelated: boolean }
    | undefined;

  // Format date as "Jan 1" 
  const formatDateCompact = (dateStr: string): string => {
    const [, month, day] = dateStr.split("-").map(Number);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[month - 1]} ${day}`;
  };

  // Priority order for phases (higher = more priority)
  // Menstrual > Ovulation > Follicular > Luteal > Not Sure
  const phasePriority: Record<string, number> = {
    menstrual: 5,
    ovulation: 4,
    follicular: 3,
    luteal: 2,
    not_sure: 1,
  };

  // Calculate phase distribution for selected dates (supports cross-month)
  // Applies priority-based selection: Menstrual > Ovulation > Follicular > Luteal > Not Sure
  const getFilteredPhaseDistribution = (): Record<string, number> => {
    if (!hasDateFilter || selectedDates.length === 0) {
      // No filter - use the full month distribution
      return phaseDistribution;
    }

    // Build a set of selected date strings for quick lookup
    const selectedDateStrings = new Set(selectedDates);

    // For each selected date, find the highest priority phase from phaseRanges
    const dateToPhase: Record<string, string> = {};
    
    for (const range of phaseRanges) {
      // Handle single-day ranges (where startDate === endDate or endDate is null for same day)
      const startDate = new Date(range.startDate + "T12:00:00");
      const endDate = range.endDate 
        ? new Date(range.endDate + "T12:00:00") 
        : new Date(range.startDate + "T12:00:00"); // Same day if no end date
      
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Only process if this date is in our selection
        if (selectedDateStrings.has(dateStr)) {
          const existingPhase = dateToPhase[dateStr];
          const existingPriority = existingPhase ? (phasePriority[existingPhase] || 0) : 0;
          const newPriority = phasePriority[range.phase] || 0;
          
          // Use priority-based selection - higher priority wins
          if (newPriority > existingPriority) {
            dateToPhase[dateStr] = range.phase;
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Count phases from the deduplicated date->phase map
    const filteredDistribution: Record<string, number> = {};
    for (const phase of Object.values(dateToPhase)) {
      filteredDistribution[phase] = (filteredDistribution[phase] || 0) + 1;
    }

    return filteredDistribution;
  };

  // Get the phase distribution to use (filtered or full month)
  const effectivePhaseDistribution = getFilteredPhaseDistribution();
  
  // Full month distribution for showing context in dropdown
  const fullMonthPhaseDistribution = phaseDistribution;

  // Count unique phases with data in the effective (possibly filtered) distribution
  const uniquePhasesInSelection = Object.keys(effectivePhaseDistribution).filter(
    (phase) => (effectivePhaseDistribution[phase] || 0) > 0
  ).length;

  // Get the set of phases that are part of the current selection (for highlighting)
  const selectedPhases = new Set(
    Object.keys(effectivePhaseDistribution).filter(
      (phase) => (effectivePhaseDistribution[phase] || 0) > 0
    )
  );

  // Helper to get the most recent phase info
  const getMostRecentPhaseInfo = (): { phase: string; startDate: string; endDate: string | null; days: number } | null => {
    if (phaseRanges.length === 0) return null;
    return phaseRanges[phaseRanges.length - 1];
  };

  const mostRecentPhase = getMostRecentPhaseInfo();
  const hasAnyPhaseData = Object.keys(fullMonthPhaseDistribution).length > 0;

  // Determine what to show as main display
  const getMainDisplay = (): { 
    phase: string; 
    dateRange: string; 
    isMultiPhase: boolean;
    highlightedPhases: Set<string>;
    singleSelectedPhase: string | null;
  } => {
    // If date filter is active
    if (hasDateFilter) {
      // No phase data in selection
      if (uniquePhasesInSelection === 0) {
        return {
          phase: "—",
          dateRange: dateRangeLabel || "No cycle data in selected range",
          isMultiPhase: false,
          highlightedPhases: new Set(),
          singleSelectedPhase: null,
        };
      }
      
      // Single phase in selection (could be single day or range with same phase)
      if (uniquePhasesInSelection === 1) {
        const singlePhase = Object.keys(effectivePhaseDistribution).find(
          (phase) => (effectivePhaseDistribution[phase] || 0) > 0
        )!;
        return {
          phase: formatPhase(singlePhase),
          dateRange: dateRangeLabel || "",
          isMultiPhase: false,
          highlightedPhases: new Set([singlePhase]),
          singleSelectedPhase: singlePhase,
        };
      }
      
      // Multiple phases in selection
      return {
        phase: `${uniquePhasesInSelection} Phases`,
        dateRange: dateRangeLabel || "",
        isMultiPhase: true,
        highlightedPhases: selectedPhases,
        singleSelectedPhase: null,
      };
    }
    
    // No date filter (whole month view)
    const uniquePhasesInMonth = Object.keys(fullMonthPhaseDistribution).filter(
      (phase) => (fullMonthPhaseDistribution[phase] || 0) > 0
    ).length;

    if (uniquePhasesInMonth > 1) {
      const totalDays = Object.values(fullMonthPhaseDistribution).reduce((sum, days) => sum + days, 0);
      return {
        phase: `${uniquePhasesInMonth} Phases`,
        dateRange: `${totalDays} days logged`,
        isMultiPhase: true,
        highlightedPhases: new Set(), // No highlighting for whole month
        singleSelectedPhase: null,
      };
    }
    
    // Single phase for whole month
    if (mostRecentPhase) {
      const startStr = formatDateCompact(mostRecentPhase.startDate);
      const endStr = mostRecentPhase.endDate ? formatDateCompact(mostRecentPhase.endDate) : "present";
      return {
        phase: formatPhase(mostRecentPhase.phase),
        dateRange: `${startStr} - ${endStr}`,
        isMultiPhase: false,
        highlightedPhases: new Set(), // No highlighting for whole month
        singleSelectedPhase: null,
      };
    }
    
    // Fallback to currentPhase prop if no phaseRanges
    if (currentPhase) {
      return {
        phase: formatPhase(currentPhase),
        dateRange: "",
        isMultiPhase: false,
        highlightedPhases: new Set(),
        singleSelectedPhase: null,
      };
    }
    
    return {
      phase: "—",
      dateRange: hasDateFilter ? "No cycle data in selected range" : "No cycle data this month",
      isMultiPhase: false,
      highlightedPhases: new Set(),
      singleSelectedPhase: null,
    };
  };

  const mainDisplay = getMainDisplay();

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-app-white rounded-xl border-2 shadow-sm overflow-hidden text-left transition-all duration-200 ${
          showContent
            ? "border-app-red shadow-md"
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Accent bar */}
        <div className="h-1 bg-app-red" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
              Cycle Phase
            </p>
            <svg
              className={`w-3.5 h-3.5 text-app-gray transition-transform flex-shrink-0 ${
                showContent ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Main Value - Current/Most Recent Phase */}
          <p className={`text-xl font-bold mt-1 ${
            mainDisplay.isMultiPhase 
              ? "text-app-charcoal" 
              : mainDisplay.singleSelectedPhase === "menstrual" || 
                (!hasDateFilter && mostRecentPhase?.phase === "menstrual")
                ? "text-app-red" 
                : "text-app-charcoal"
          }`}>
            {mainDisplay.phase}
          </p>

          {/* Date Range */}
          <p className="text-xs text-app-red mt-1">
            {mainDisplay.dateRange}
          </p>

          {/* Expanded Content - Phase Breakdown Table */}
          {/* Mobile */}
          <div className="block md:hidden">
            {showContent && (
              <div className="mt-3 pt-3 border-t border-app-border/50 space-y-2">
                {/* Phase Breakdown - Shows full month context with highlighting for selection */}
                {hasAnyPhaseData && (
                  <div>
                    <p className="text-xs text-app-gray mb-2">
                      {hasDateFilter && mainDisplay.highlightedPhases.size > 0
                        ? "Phase Breakdown (selected highlighted)"
                        : "Phase Breakdown"}
                    </p>
                    <div className="space-y-1">
                      {(() => {
                        const phaseOrder = ["menstrual", "follicular", "ovulation", "luteal", "not_sure"];
                        const phaseLabels: Record<string, string> = {
                          menstrual: "Period",
                          follicular: "Follicular",
                          ovulation: "Ovulation",
                          luteal: "Luteal",
                          not_sure: "Unsure",
                        };

                        // Get all phases from the full month for context
                        const allPhasesInMonth = new Set(
                          Object.keys(fullMonthPhaseDistribution).filter(
                            p => (fullMonthPhaseDistribution[p] || 0) > 0
                          )
                        );

                        return phaseOrder
                          .filter((phase) => allPhasesInMonth.has(phase))
                          .map((phase) => {
                            // When filtered, show selected days count; otherwise show full month count
                            const days = hasDateFilter
                              ? (effectivePhaseDistribution[phase] || 0)
                              : (fullMonthPhaseDistribution[phase] || 0);
                            const fullMonthDays = fullMonthPhaseDistribution[phase] || 0;

                            const label = phaseLabels[phase];
                            const isMenstrual = phase === "menstrual";
                            const isHighlighted = mainDisplay.highlightedPhases.has(phase);

                            // Determine border style for highlighted phases
                            const borderClass = isHighlighted
                              ? isMenstrual
                                ? "border-2 border-app-red"
                                : "border-2 border-app-teal"
                              : "border-2 border-transparent";

                            return (
                              <div
                                key={phase}
                                className={`flex justify-between items-center p-2 rounded-lg ${
                                  isMenstrual ? "bg-app-red/10" : "bg-app-teal/10"
                                } ${borderClass}`}
                              >
                                <span className={`text-sm font-medium ${isMenstrual ? "text-app-red" : "text-app-charcoal"}`}>
                                  {label}
                                </span>
                                <span className={`text-sm font-medium ${
                                  days > 0
                                    ? isMenstrual ? "text-app-red" : "text-app-teal"
                                    : "text-app-gray"
                                }`}>
                                  {hasDateFilter ? (
                                    // Show "X of Y days" when filtered
                                    days > 0
                                      ? `${days}d` + (fullMonthDays !== days ? ` of ${fullMonthDays}d` : "")
                                      : `— of ${fullMonthDays}d`
                                  ) : (
                                    // Show just days when not filtered
                                    `${days}d`
                                  )}
                                </span>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>
                )}

                {/* Highest Intensity Symptom */}
                {highestIntensity && (
                  <div className={`p-2 rounded-lg ${highestIntensity.isPeriodRelated ? "bg-app-red/10" : "bg-app-teal/10"}`}>
                    <p className="text-xs text-app-gray">Most Intense Symptom</p>
                    <p className={`text-sm font-medium ${highestIntensity.isPeriodRelated ? "text-app-red" : "text-app-teal"}`}>
                      {highestIntensity.name}{" "}
                      <span className="text-app-charcoal">
                        (avg {highestIntensity.avgIntensity}/10)
                      </span>
                    </p>
                  </div>
                )}

                {/* No data state */}
                {!hasAnyPhaseData && (
                  <p className="text-xs text-app-gray italic">
                    {hasDateFilter ? "No cycle data in selected range" : "Log cycle phases to see breakdown"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Desktop */}
          <div
            className={`
              hidden md:block overflow-hidden
              transition-[max-height,margin,padding] duration-300 ease-in-out
              ${showContent
                ? "max-h-[600px] mt-3 pt-3 border-t border-app-border/50"
                : "max-h-0 mt-0 pt-0 border-t-0"}
            `}
          >
            <div className="space-y-2">
              {/* Phase Breakdown - Shows full month context with highlighting for selection */}
              {hasAnyPhaseData && (
                <div>
                  <p className="text-xs text-app-gray mb-2">
                    {hasDateFilter && mainDisplay.highlightedPhases.size > 0 
                      ? "Phase Breakdown (selected highlighted)" 
                      : "Phase Breakdown"}
                  </p>
                  <div className="space-y-1">
                    {(() => {
                      const phaseOrder = ["menstrual", "follicular", "ovulation", "luteal", "not_sure"];
                      const phaseLabels: Record<string, string> = {
                        menstrual: "Period",
                        follicular: "Follicular",
                        ovulation: "Ovulation",
                        luteal: "Luteal",
                        not_sure: "Unsure",
                      };
                      
                      // Get all phases from the full month for context
                      const allPhasesInMonth = new Set(
                        Object.keys(fullMonthPhaseDistribution).filter(
                          p => (fullMonthPhaseDistribution[p] || 0) > 0
                        )
                      );
                      
                      return phaseOrder
                        .filter((phase) => allPhasesInMonth.has(phase))
                        .map((phase) => {
                          // When filtered, show selected days count; otherwise show full month count
                          const days = hasDateFilter 
                            ? (effectivePhaseDistribution[phase] || 0)
                            : (fullMonthPhaseDistribution[phase] || 0);
                          const fullMonthDays = fullMonthPhaseDistribution[phase] || 0;
                          
                          const label = phaseLabels[phase];
                          const isMenstrual = phase === "menstrual";
                          const isHighlighted = mainDisplay.highlightedPhases.has(phase);
                          
                          // Determine border style for highlighted phases
                          const borderClass = isHighlighted
                            ? isMenstrual
                              ? "border-2 border-app-red"
                              : "border-2 border-app-teal"
                            : "border-2 border-transparent";
                          
                          return (
                            <div 
                              key={phase} 
                              className={`flex justify-between items-center p-2 rounded-lg ${
                                isMenstrual ? "bg-app-red/10" : "bg-app-teal/10"
                              } ${borderClass}`}
                            >
                              <span className={`text-sm font-medium ${isMenstrual ? "text-app-red" : "text-app-charcoal"}`}>
                                {label}
                              </span>
                              <span className={`text-sm font-medium ${
                                days > 0 
                                  ? isMenstrual ? "text-app-red" : "text-app-teal"
                                  : "text-app-gray"
                              }`}>
                                {hasDateFilter ? (
                                  // Show "X of Y days" when filtered
                                  days > 0 
                                    ? `${days}d` + (fullMonthDays !== days ? ` of ${fullMonthDays}d` : "")
                                    : `— of ${fullMonthDays}d`
                                ) : (
                                  // Show just days when not filtered
                                  `${days}d`
                                )}
                              </span>
                            </div>
                          );
                        });
                    })()}
                  </div>
                </div>
              )}

              {/* Highest Intensity Symptom */}
              {highestIntensity && (
                <div className={`p-2 rounded-lg ${highestIntensity.isPeriodRelated ? "bg-app-red/10" : "bg-app-teal/10"}`}>
                  <p className="text-xs text-app-gray">Most Intense Symptom</p>
                  <p className={`text-sm font-medium ${highestIntensity.isPeriodRelated ? "text-app-red" : "text-app-teal"}`}>
                    {highestIntensity.name}{" "}
                    <span className="text-app-charcoal">
                      (avg {highestIntensity.avgIntensity}/10)
                    </span>
                  </p>
                </div>
              )}

              {/* No data state */}
              {!hasAnyPhaseData && (
                <p className="text-xs text-app-gray italic">
                  {hasDateFilter ? "No cycle data in selected range" : "Log cycle phases to see breakdown"}
                </p>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ============================================
// NEW THIS MONTH CARD
// ============================================

interface NewThisMonthCardProps {
  comparison: MonthComparison | null;
  hasPreviousMonthData: boolean;
  topSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  lastMonthTopSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  hasDateFilter?: boolean;
}

function NewThisMonthCard({
  comparison,
  hasPreviousMonthData,
  topSymptoms,
  lastMonthTopSymptoms,
  hasDateFilter = false,
}: NewThisMonthCardProps) {
  const cardLabel = hasDateFilter ? "New in Selection" : "New This Month";
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 768;

  const showContent = isDesktop
    ? isExpanded || isHovered
    : isExpanded;


  // No comparison available
  if (!hasPreviousMonthData || !comparison) {
    return (
      <div className="bg-app-white rounded-xl border-2 border-app-border shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-app-teal via-app-plumb to-app-red" />
        <div className="p-4">
          <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
            {cardLabel}
          </p>
          <p className="text-2xl font-bold text-app-gray mt-1">—</p>
          <p className="text-xs text-app-gray mt-1">
            {hasPreviousMonthData ? "No new symptoms" : "No data from last month"}
          </p>
        </div>
      </div>
    );
  }

  // Determine headline
  const hasNewSymptoms = comparison.symptoms.newSymptoms.length > 0;
  const hasResolvedSymptoms = comparison.symptoms.resolvedSymptoms.length > 0;
  const newCount = comparison.symptoms.newSymptoms.length;

  let headlineText = "No new symptoms";
  let headlineColor = "text-app-gray";

  if (hasNewSymptoms) {
    const firstNew = comparison.symptoms.newSymptoms[0];
    headlineText = firstNew.name;
    headlineColor = firstNew.isPeriodRelated ? "text-app-red" : "text-app-teal";
  } else if (hasResolvedSymptoms) {
    headlineText = `${comparison.symptoms.resolvedSymptoms.length} resolved`;
    headlineColor = "text-app-teal";
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-app-white rounded-xl border-2 shadow-sm overflow-hidden text-left transition-all duration-200 ${
          showContent
            ? "border-app-charcoal shadow-md"
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-app-teal via-app-plumb to-app-red" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
              {cardLabel}
            </p>
            <svg
              className={`w-3.5 h-3.5 text-app-gray transition-transform flex-shrink-0 ${
                showContent ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Headline */}
          <p className={`text-lg font-bold mt-1 truncate ${headlineColor}`}>{headlineText}</p>
          <p className="text-xs text-app-gray mt-1">
            {hasNewSymptoms && newCount > 1
              ? `+${newCount - 1} more new`
              : hasNewSymptoms
                ? "New symptom"
                : hasResolvedSymptoms
                  ? "From last month"
                  : "Patterns stable"}
          </p>

          {/* Expanded Content */}
          {/* Mobile */}
          <div className="block md:hidden">
            {showContent && (
              <div className="mt-3 pt-3 border-t border-app-border/50 space-y-2">
                {/* New Symptoms Pills */}
                {hasNewSymptoms && newCount > 1 && (
                  <div>
                    <p className="text-xs text-app-gray mb-1">All New Symptoms</p>
                    <div className="flex flex-wrap gap-1">
                      {comparison.symptoms.newSymptoms.map((symptom) => (
                        <span
                          key={symptom.name}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            symptom.isPeriodRelated
                              ? "bg-app-red/10 text-app-red"
                              : "bg-app-teal/10 text-app-teal"
                          }`}
                        >
                          {symptom.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolved Symptoms */}
                {hasResolvedSymptoms && (
                  <div>
                    <p className="text-xs text-app-gray mb-1">
                      Resolved
                      <span className="text-app-gray/60 ml-1">(0 logs this month)</span>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comparison.symptoms.resolvedSymptoms.slice(0, 6).map((symptom) => (
                        <span
                          key={symptom.name}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            symptom.isPeriodRelated
                              ? "bg-app-red/10 text-app-red"
                              : "bg-app-teal/10 text-app-teal"
                          }`}
                        >
                          {symptom.name}
                        </span>
                      ))}
                      {comparison.symptoms.resolvedSymptoms.length > 6 && (
                        <span className="px-2 py-0.5 text-xs text-app-gray">
                          +{comparison.symptoms.resolvedSymptoms.length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Month's Top Symptoms */}
                {lastMonthTopSymptoms.length > 0 && (
                  <div>
                    <p className="text-xs text-app-gray mb-1">Last Month&apos;s Top 5</p>
                    <div className="bg-app-cream rounded-md overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-app-border/50">
                            <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                            <th className="py-1.5 px-2 text-right text-app-gray font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastMonthTopSymptoms.slice(0, 5).map((symptom) => (
                            <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                              <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[100px]">
                                {symptom.name}
                              </td>
                              <td className="py-1.5 px-2 text-app-gray text-right font-medium">
                                {symptom.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Intensity change indicator */}
                {comparison.symptoms.intensityChange !== null && comparison.symptoms.intensityChange !== 0 && (
                  <div className="pt-2 border-t border-app-border">
                    <p className="text-xs text-app-gray">
                      Average intensity{" "}
                      <span className={comparison.symptoms.intensityChange < 0 ? "text-app-teal" : "text-app-red"}>
                        {comparison.symptoms.intensityChange < 0 ? "↓" : "↑"}{" "}
                        {Math.abs(comparison.symptoms.intensityChange).toFixed(1)}
                      </span>{" "}
                      vs last month
                    </p>
                  </div>
                )}

                {/* No symptoms either month */}
                {topSymptoms.length === 0 && lastMonthTopSymptoms.length === 0 && (
                  <p className="text-xs text-app-gray italic">No symptoms logged either month</p>
                )}
              </div>
            )}
          </div>

          {/* Desktop */}
          <div
            className={`
              hidden md:block overflow-hidden
              transition-[max-height,margin,padding] duration-300 ease-in-out
              ${showContent
                ? "max-h-[600px] mt-3 pt-3 border-t border-app-border/50"
                : "max-h-0 mt-0 pt-0 border-t-0"}
            `}
          >
            <div className="space-y-2">
              {/* New Symptoms Pills */}
              {hasNewSymptoms && newCount > 1 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">All New Symptoms</p>
                  <div className="flex flex-wrap gap-1">
                    {comparison.symptoms.newSymptoms.map((symptom) => (
                      <span
                        key={symptom.name}
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          symptom.isPeriodRelated
                            ? "bg-app-red/10 text-app-red"
                            : "bg-app-teal/10 text-app-teal"
                        }`}
                      >
                        {symptom.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved Symptoms */}
              {hasResolvedSymptoms && (
                <div>
                  <p className="text-xs text-app-gray mb-1">
                    Resolved
                    <span className="text-app-gray/60 ml-1">(0 logs this month)</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {comparison.symptoms.resolvedSymptoms.slice(0, 6).map((symptom) => (
                      <span
                        key={symptom.name}
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          symptom.isPeriodRelated
                            ? "bg-app-red/10 text-app-red"
                            : "bg-app-teal/10 text-app-teal"
                        }`}
                      >
                        {symptom.name}
                      </span>
                    ))}
                    {comparison.symptoms.resolvedSymptoms.length > 6 && (
                      <span className="px-2 py-0.5 text-xs text-app-gray">
                        +{comparison.symptoms.resolvedSymptoms.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Last Month's Top Symptoms */}
              {lastMonthTopSymptoms.length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">Last Month&apos;s Top 5</p>
                  <div className="bg-app-cream rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-app-border/50">
                          <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                          <th className="py-1.5 px-2 text-right text-app-gray font-medium">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastMonthTopSymptoms.slice(0, 5).map((symptom) => (
                          <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                            <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[100px]">
                              {symptom.name}
                            </td>
                            <td className="py-1.5 px-2 text-app-gray text-right font-medium">
                              {symptom.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Intensity change indicator */}
              {comparison.symptoms.intensityChange !== null && comparison.symptoms.intensityChange !== 0 && (
                <div className="pt-2 border-t border-app-border">
                  <p className="text-xs text-app-gray">
                    Average intensity{" "}
                    <span className={comparison.symptoms.intensityChange < 0 ? "text-app-teal" : "text-app-red"}>
                      {comparison.symptoms.intensityChange < 0 ? "↓" : "↑"}{" "}
                      {Math.abs(comparison.symptoms.intensityChange).toFixed(1)}
                    </span>{" "}
                    vs last month
                  </p>
                </div>
              )}

              {/* No symptoms either month */}
              {topSymptoms.length === 0 && lastMonthTopSymptoms.length === 0 && (
                <p className="text-xs text-app-gray italic">No symptoms logged either month</p>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMostCommonTimeOfDay(distribution: Record<string, number>): string | null {
  const entries = Object.entries(distribution);
  if (entries.length === 0) return null;

  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

function formatPhase(phase: string | null): string {
  if (!phase) return "—";
  const phaseMap: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
    not_sure: "Unsure",
  };
  return phaseMap[phase] || phase.charAt(0).toUpperCase() + phase.slice(1).replace("_", " ");
}