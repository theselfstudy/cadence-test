"use client";

import { useState } from "react";
import type { WeeklyStats, WeekComparison } from "@/lib/weeklyUtils";

// ============================================
// WEEKLY STATS CARDS
// Shows: Top Symptom, Timing Patterns, Cycle Phase (if enabled), New This Week
// ============================================

interface WeeklyStatsCardsProps {
  /** Stats for the current week */
  stats: WeeklyStats;
  /** Comparison with previous week (null if no previous data) */
  comparison: WeekComparison | null;
  /** Whether there's data from the previous week */
  hasPreviousWeekData: boolean;
  /** Top symptoms with intensities for this week */
  topSymptoms?: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  /** Top symptoms from last week for comparison */
  lastWeekTopSymptoms?: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  /** Whether period tracking is enabled */
  periodTrackingEnabled?: boolean;
  /** Current cycle phase from this week's entries */
  currentCyclePhase?: string | null;
  /** Days logged with cycle data this week */
  cycleDaysLogged?: number;
  /** Phase distribution - unique days per phase */
  phaseDistribution?: Record<string, number>;
  /** Phase date ranges for display */
  phaseRanges?: { phase: string; startDate: string; endDate: string | null; days: number }[];
  /** Which tracking categories are enabled */
  enabledSections?: {
    symptoms: boolean;
    bowel: boolean;
    cycle: boolean;
    medicine: boolean;
  };
}

export function WeeklyStatsCards({
  stats,
  comparison,
  hasPreviousWeekData,
  topSymptoms = [],
  lastWeekTopSymptoms = [],
  periodTrackingEnabled = false,
  currentCyclePhase = null,
  cycleDaysLogged = 0,
  phaseDistribution = {},
  phaseRanges = [],
  enabledSections = { symptoms: true, bowel: true, cycle: true, medicine: true },
}: WeeklyStatsCardsProps) {
  // Calculate number of visible cards
  const visibleCardCount =
    (enabledSections.symptoms ? 2 : 0) + // Top Symptom + New This Week
    (enabledSections.bowel ? 1 : 0) +     // Timing Patterns
    (enabledSections.cycle ? 1 : 0);      // Cycle Phase

  // Determine grid column classes based on visible card count
  const getGridClasses = () => {
    if (visibleCardCount === 1) {
      return "grid grid-cols-1 gap-3";
    } else if (visibleCardCount === 2) {
      return "grid grid-cols-1 sm:grid-cols-2 gap-3";
    } else if (visibleCardCount === 3) {
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
    } else {
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3";
    }
  };

  return (
    <div className={getGridClasses()}>
      {/* Top Symptom Card - only if symptoms enabled */}
      {enabledSections.symptoms && (
        <StatCard
        label="Top Symptom"
        value={topSymptoms[0]?.name || "—"}
        subtext={
          topSymptoms[0]
            ? `${topSymptoms[0].count}× this week`
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
            </div>
          ) : (
            <p className="text-xs text-app-gray">Log symptoms to see patterns.</p>
          )
        }
      />
      )}

      {/* Timing Patterns Card - only if bowel enabled */}
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
                      return (
                        <tr key={time} className="border-b border-app-border/50 last:border-0">
                          <td className="py-1.5 px-2 text-app-charcoal">{time}</td>
                          <td className="py-1.5 px-2 text-app-gray text-right">{count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-app-gray">Log entries to see timing patterns.</p>
          )
        }
      />
      )}

      {/* Cycle Phase Card - only if cycle enabled */}
      {enabledSections.cycle && periodTrackingEnabled && (
        <CyclePhaseCard
          currentPhase={currentCyclePhase}
          daysLogged={cycleDaysLogged}
          topSymptoms={topSymptoms}
          phaseDistribution={phaseDistribution}
          phaseRanges={phaseRanges}
        />
      )}

      {/* New This Week Card - only if symptoms enabled */}
      {enabledSections.symptoms && (
        <NewThisWeekCard
          comparison={comparison}
          hasPreviousWeekData={hasPreviousWeekData}
          topSymptoms={topSymptoms}
          lastWeekTopSymptoms={lastWeekTopSymptoms}
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

          {/* Expanded Content */}
          {expandedContent && (
            <>
              {/* Mobile */}
              <div className="block md:hidden">
                {showContent && (
                  <div className="mt-3 pt-3 border-t border-app-border">
                    {expandedContent}
                  </div>
                )}
              </div>

              {/* Desktop */}
              <div
                className={`hidden md:block overflow-hidden transition-all duration-200 ${
                  showContent ? "max-h-[500px] mt-3 pt-3 border-t border-app-border" : "max-h-0"
                }`}
              >
                {expandedContent}
              </div>
            </>
          )}
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
  topSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  phaseDistribution?: Record<string, number>;
  phaseRanges?: { phase: string; startDate: string; endDate: string | null; days: number }[];
}

function CyclePhaseCard({
  currentPhase,
  daysLogged,
  topSymptoms,
  phaseDistribution = {},
  phaseRanges = [],
}: CyclePhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 768;

  const showContent = isDesktop
    ? isExpanded || isHovered
    : isExpanded;

  // Calculate unique phases logged
  const uniquePhases = Object.keys(phaseDistribution).filter(
    (phase) => (phaseDistribution[phase] || 0) > 0
  );
  const isMultiPhase = uniquePhases.length > 1;

  // Format date as "Mon D"
  const formatDateCompact = (dateStr: string): string => {
    const [, month, day] = dateStr.split("-").map(Number);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[month - 1]} ${day}`;
  };

  // Get display info for multi-phase or single phase
  const getDisplayInfo = () => {
    if (isMultiPhase) {
      return {
        phase: `${uniquePhases.length} Phases`,
        dateRange: `${daysLogged} day${daysLogged !== 1 ? "s" : ""} logged`,
      };
    }
    
    // Single phase - show most recent range if available
    if (phaseRanges.length > 0) {
      const mostRecent = phaseRanges[phaseRanges.length - 1];
      const startStr = formatDateCompact(mostRecent.startDate);
      const endStr = mostRecent.endDate ? formatDateCompact(mostRecent.endDate) : "present";
      return {
        phase: formatPhase(mostRecent.phase),
        dateRange: `${startStr} - ${endStr}`,
      };
    }
    
    return {
      phase: formatPhase(currentPhase),
      dateRange: daysLogged > 0 ? `${daysLogged} day${daysLogged !== 1 ? "s" : ""} logged` : "No data this week",
    };
  };

  const displayInfo = getDisplayInfo();

  // Find highest intensity symptom (with isPeriodRelated info)
  const highestIntensity = topSymptoms
    .filter((s) => s.avgIntensity !== null)
    .sort((a, b) => (b.avgIntensity ?? 0) - (a.avgIntensity ?? 0))[0] as 
    { name: string; avgIntensity: number; count: number; isPeriodRelated: boolean } | undefined;

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

          {/* Main Value */}
          <p className={`text-xl font-bold mt-1 ${
            isMultiPhase 
              ? "text-app-charcoal" 
              : currentPhase === "menstrual"
                ? "text-app-red"
                : "text-app-charcoal"
          }`}>
            {displayInfo.phase}
          </p>

          <p className="text-xs text-app-red mt-1">
            {displayInfo.dateRange}
          </p>

          {/* Expanded Content */}
          {/* Mobile */}
          <div className="block md:hidden">
            {showContent && (
              <div className="mt-3 pt-3 border-t border-app-border space-y-3">
                {/* Phase Breakdown - show when multiple phases */}
                {isMultiPhase && Object.keys(phaseDistribution).length > 0 && (
                  <div>
                    <p className="text-xs text-app-gray mb-2">Phase Breakdown</p>
                    <div className="space-y-1">
                      {["menstrual", "follicular", "ovulation", "luteal", "not_sure"]
                        .filter((phase) => (phaseDistribution[phase] || 0) > 0)
                        .map((phase) => {
                          const days = phaseDistribution[phase] || 0;
                          const isMenstrual = phase === "menstrual";
                          const phaseLabels: Record<string, string> = {
                            menstrual: "Period",
                            follicular: "Follicular",
                            ovulation: "Ovulation",
                            luteal: "Luteal",
                            not_sure: "Unsure",
                          };
                          
                          return (
                            <div 
                              key={phase} 
                              className={`flex justify-between items-center p-2 rounded-lg ${
                                isMenstrual ? "bg-app-red/10" : "bg-app-teal/10"
                              }`}
                            >
                              <span className={`text-sm font-medium ${isMenstrual ? "text-app-red" : "text-app-charcoal"}`}>
                                {phaseLabels[phase]}
                              </span>
                              <span className={`text-sm font-medium ${isMenstrual ? "text-app-red" : "text-app-teal"}`}>
                                {days}d
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Highest Intensity Symptom */}
                {highestIntensity && (
                  <div className={`p-2 rounded-lg ${highestIntensity.isPeriodRelated ? "bg-app-red/10" : "bg-app-teal/10"}`}>
                    <p className="text-xs text-app-gray">Most Intense</p>
                    <p className={`text-sm font-medium ${highestIntensity.isPeriodRelated ? "text-app-red" : "text-app-teal"}`}>
                      {highestIntensity.name}{" "}
                      <span className="text-app-charcoal">
                        (avg {highestIntensity.avgIntensity}/10)
                      </span>
                    </p>
                  </div>
                )}

                {/* Symptoms by Intensity */}
                {topSymptoms.filter(s => s.avgIntensity !== null).length > 0 && (
                  <div>
                    <p className="text-xs text-app-gray mb-1">By Intensity</p>
                    <div className="bg-app-cream rounded-md overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-app-border/50">
                            <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                            <th className="py-1.5 px-2 text-right text-app-gray font-medium">Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topSymptoms
                            .filter(s => s.avgIntensity !== null)
                            .sort((a, b) => (b.avgIntensity ?? 0) - (a.avgIntensity ?? 0))
                            .slice(0, 3)
                            .map((symptom) => (
                              <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                                <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[100px]">
                                  {symptom.name}
                                </td>
                                <td className={`py-1.5 px-2 text-right font-medium ${symptom.isPeriodRelated ? "text-app-red" : "text-app-teal"}`}>
                                  {symptom.avgIntensity}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* No symptoms */}
                {topSymptoms.filter(s => s.avgIntensity !== null).length === 0 && (
                  <p className="text-xs text-app-gray italic">No symptoms with intensity logged</p>
                )}
              </div>
            )}
          </div>
          {/* Desktop */}
          <div
            className={`hidden md:block overflow-hidden transition-all duration-200 ${
              showContent ? "max-h-[500px] mt-3 pt-3 border-t border-app-border" : "max-h-0"
            }`}
          >
            <div className="space-y-3">
              {/* Phase Breakdown - show when multiple phases */}
              {isMultiPhase && Object.keys(phaseDistribution).length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-2">Phase Breakdown</p>
                  <div className="space-y-1">
                    {["menstrual", "follicular", "ovulation", "luteal", "not_sure"]
                      .filter((phase) => (phaseDistribution[phase] || 0) > 0)
                      .map((phase) => {
                        const days = phaseDistribution[phase] || 0;
                        const isMenstrual = phase === "menstrual";
                        const phaseLabels: Record<string, string> = {
                          menstrual: "Period",
                          follicular: "Follicular",
                          ovulation: "Ovulation",
                          luteal: "Luteal",
                          not_sure: "Unsure",
                        };
                        
                        return (
                          <div 
                            key={phase} 
                            className={`flex justify-between items-center p-2 rounded-lg ${
                              isMenstrual ? "bg-app-red/10" : "bg-app-teal/10"
                            }`}
                          >
                            <span className={`text-sm font-medium ${isMenstrual ? "text-app-red" : "text-app-charcoal"}`}>
                              {phaseLabels[phase]}
                            </span>
                            <span className={`text-sm font-medium ${isMenstrual ? "text-app-red" : "text-app-teal"}`}>
                              {days}d
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Highest Intensity Symptom */}
              {highestIntensity && (
                <div className={`p-2 rounded-lg ${highestIntensity.isPeriodRelated ? "bg-app-red/10" : "bg-app-teal/10"}`}>
                  <p className="text-xs text-app-gray">Most Intense</p>
                  <p className={`text-sm font-medium ${highestIntensity.isPeriodRelated ? "text-app-red" : "text-app-teal"}`}>
                    {highestIntensity.name}{" "}
                    <span className="text-app-charcoal">
                      (avg {highestIntensity.avgIntensity}/10)
                    </span>
                  </p>
                </div>
              )}

              {/* Symptoms by Intensity */}
              {topSymptoms.filter(s => s.avgIntensity !== null).length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">By Intensity</p>
                  <div className="bg-app-cream rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-app-border/50">
                          <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                          <th className="py-1.5 px-2 text-right text-app-gray font-medium">Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSymptoms
                          .filter(s => s.avgIntensity !== null)
                          .sort((a, b) => (b.avgIntensity ?? 0) - (a.avgIntensity ?? 0))
                          .slice(0, 3)
                          .map((symptom) => (
                            <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                              <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[100px]">
                                {symptom.name}
                              </td>
                              <td className={`py-1.5 px-2 text-right font-medium ${symptom.isPeriodRelated ? "text-app-red" : "text-app-teal"}`}>
                                {symptom.avgIntensity}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* No symptoms */}
              {topSymptoms.filter(s => s.avgIntensity !== null).length === 0 && (
                <p className="text-xs text-app-gray italic">No symptoms with intensity logged</p>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ============================================
// NEW THIS WEEK CARD
// ============================================

interface NewThisWeekCardProps {
  comparison: WeekComparison | null;
  hasPreviousWeekData: boolean;
  topSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  lastWeekTopSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
}

function NewThisWeekCard({
  comparison,
  hasPreviousWeekData,
  topSymptoms,
  lastWeekTopSymptoms,
}: NewThisWeekCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 768;

  const showContent = isDesktop
    ? isExpanded || isHovered
    : isExpanded;

  // No comparison available
  if (!hasPreviousWeekData || !comparison) {
    return (
      <div className="bg-app-white rounded-xl border-2 border-app-border shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-app-teal via-app-plumb to-app-red" />
        <div className="p-4">
          <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
            New This Week
          </p>
          <p className="text-2xl font-bold text-app-gray mt-1">—</p>
          <p className="text-xs text-app-gray mt-1">
            {hasPreviousWeekData ? "No new symptoms" : "No data from last week"}
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
              New This Week
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
                  ? "From last week"
                  : "Patterns stable"}
          </p>
          {/* Expanded Content */}
          {/* Mobile */}
          <div className="block md:hidden">
            {showContent && (
              <div className="mt-3 pt-3 border-t border-app-border space-y-4">
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
                      <span className="text-app-gray/60 ml-1">(0 logs this week)</span>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comparison.symptoms.resolvedSymptoms.slice(0, 4).map((symptom) => (
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
                      {comparison.symptoms.resolvedSymptoms.length > 4 && (
                        <span className="px-2 py-0.5 text-xs text-app-gray">
                          +{comparison.symptoms.resolvedSymptoms.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Week's Top 3 Symptoms */}
                {lastWeekTopSymptoms.length > 0 && (
                  <div>
                    <p className="text-xs text-app-gray mb-1">Last Week&apos;s Top 3</p>
                    <div className="bg-app-cream rounded-md overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-app-border/50">
                            <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                            <th className="py-1.5 px-2 text-right text-app-gray font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastWeekTopSymptoms.slice(0, 3).map((symptom) => (
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

                {/* No symptoms either week */}
                {topSymptoms.length === 0 && lastWeekTopSymptoms.length === 0 && (
                  <p className="text-xs text-app-gray italic">No symptoms logged either week</p>
                )}
              </div>
            )}
          </div>

          {/* Desktop */}
          <div
            className={`hidden md:block overflow-hidden transition-all duration-200 ${
              showContent ? "max-h-[600px] mt-3 pt-3 border-t border-app-border" : "max-h-0"
            }`}
          >
            <div className="space-y-4">
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
                    <span className="text-app-gray/60 ml-1">(0 logs this week)</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {comparison.symptoms.resolvedSymptoms.slice(0, 4).map((symptom) => (
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
                    {comparison.symptoms.resolvedSymptoms.length > 4 && (
                      <span className="px-2 py-0.5 text-xs text-app-gray">
                        +{comparison.symptoms.resolvedSymptoms.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Last Week's Top 3 Symptoms */}
              {lastWeekTopSymptoms.length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">Last Week&apos;s Top 3</p>
                  <div className="bg-app-cream rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-app-border/50">
                          <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                          <th className="py-1.5 px-2 text-right text-app-gray font-medium">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastWeekTopSymptoms.slice(0, 3).map((symptom) => (
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

              {/* No symptoms either week */}
              {topSymptoms.length === 0 && lastWeekTopSymptoms.length === 0 && (
                <p className="text-xs text-app-gray italic">No symptoms logged either week</p>
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