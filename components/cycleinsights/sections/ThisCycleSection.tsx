// /components/cycleinsights/sections/ThisCycleSection.tsx
"use client";

import { useMemo } from "react";
import { useState } from "react";
import type { StoredEntry } from "@/types";
import type { DetectedCycle } from "@/lib/monthlyUtils";
import { calculateThisCycleData, formatPhase } from "@/lib/insightUtils";
import { CycleProgressRing } from "../shared/RingIndicator";
import { PhasePill } from "../shared/PhasePill";

// ============================================
// THIS CYCLE SECTION
// Shows current cycle day, phase, time-to-event context
// ============================================

interface ThisCycleSectionProps {
  /** Current ongoing cycle (if any) */
  currentCycle: DetectedCycle | null;
  
  /** All detected cycles (for calculating estimates) */
  allCycles: DetectedCycle[];
  
  /** All entries (for symptom collection) */
  entries: StoredEntry[];
}

export function ThisCycleSection({
  currentCycle,
  allCycles,
  entries,
}: ThisCycleSectionProps) {
  // Calculate all "This Cycle" data
  const cycleData = useMemo(() => {
    return calculateThisCycleData(currentCycle, allCycles, entries);
  }, [currentCycle, allCycles, entries]);

  const completeCycles = useMemo(() => {
    return allCycles.filter((c) => !c.isOngoing && c.length !== null);
  }, [allCycles]);

  // No current cycle
  if (!cycleData) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">📅</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          No active cycle detected
        </p>
        <p className="text-xs text-app-gray">
          Log a period flow to start tracking a new cycle
        </p>
      </div>
    );
  }

  // Calculate estimated cycle length for the ring
  const estimatedLength =
    completeCycles.length > 0
      ? Math.round(
          completeCycles.reduce((sum, c) => sum + (c.length || 0), 0) /
            completeCycles.length
        )
      : 28;

  // Calculate estimated period length from flow days in completed cycles
  const estimatedPeriodLength = useMemo(() => {
    if (completeCycles.length === 0) return 5; // Default to 5 days

    const cyclesWithFlow = completeCycles.filter((c) => c.flowDays.length > 0);
    if (cyclesWithFlow.length === 0) return 5;

    const totalFlowDays = cyclesWithFlow.reduce(
      (sum, c) => sum + c.flowDays.length,
      0
    );
    return Math.round(totalFlowDays / cyclesWithFlow.length);
  }, [completeCycles]);

  // Format cycle start date
  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const {
    cycleDay,
    phase,
    phaseIsKnown,
    periodTypicallyStarts,
    symptomsLoggedThisCycle,
  } = cycleData;

  // Only show phase if user has logged phases beyond just "menstrual"
  const showPhase = phaseIsKnown && phase && phase !== "not_sure";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Main cycle info */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Cycle progress ring */}
        <div className="flex justify-center sm:block">
          <CycleProgressRing
            currentDay={cycleDay}
            estimatedLength={estimatedLength}
            estimatedPeriodLength={estimatedPeriodLength}
            size="lg"
          />
        </div>
        {/* Cycle details */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          {/* Cycle start date */}
          <div>
            <span className="text-xs text-app-gray">Cycle Started</span>
            <p className="text-lg font-semibold text-app-charcoal">
              {formatDate(cycleData.cycleStartDate)}
            </p>
          </div>

          {/* Current phase - only for phase-aware users */}
          {showPhase && phase && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-app-gray">Current Phase:</span>
              <PhasePill phase={phase} size="sm" />
            </div>
          )}

          {/* Time-to-event estimate */}
          {periodTypicallyStarts && completeCycles.length >= 2 && (
            <p className="text-sm text-app-charcoal mt-2 text-balance">
              Based on your last {completeCycles.length} cycles, your cycle length is{" "}
              <span className="font-medium text-app-teal">
                {periodTypicallyStarts.dayRange[0]}–{periodTypicallyStarts.dayRange[1]} days
              </span>
              .
            </p>

          )}

          {/* Early data message */}
          {completeCycles.length < 2 && (
            <p className="text-sm text-app-gray mt-2">
              After 2+ complete cycles, you&apos;ll see when your period
              typically starts.
            </p>
          )}
        </div>
      </div>

      {/* Symptoms logged this cycle */}
      {symptomsLoggedThisCycle.length > 0 && (
        <SymptomsLoggedDisplay symptoms={symptomsLoggedThisCycle} />
      )}
    </div>
  );
}

// ============================================
// SYMPTOMS LOGGED DISPLAY
// Shows symptoms logged in current cycle
// ============================================

interface SymptomsLoggedDisplayProps {
  symptoms: { name: string; isPeriodRelated: boolean }[];
}

function SymptomsLoggedDisplay({ symptoms }: SymptomsLoggedDisplayProps) {
  const DEFAULT_VISIBLE = 3;
  const [expanded, setExpanded] = useState(false);

  const visibleCount = expanded ? symptoms.length : DEFAULT_VISIBLE;
  const visibleSymptoms = symptoms.slice(0, visibleCount);
  const overflow = symptoms.length - DEFAULT_VISIBLE;

  return (
    <div className="bg-app-cream/30 rounded-lg p-3">
      <p className="text-xs text-app-gray mb-2">Logged this cycle:</p>

      <div className="flex flex-wrap gap-1.5">
        {visibleSymptoms.map((symptom) => (
          <span
            key={symptom.name}
            className={`px-2 py-0.5 text-xs rounded-full border
              ${
                symptom.isPeriodRelated
                  ? "bg-app-red/10 text-app-red border-app-red/20"
                  : "bg-app-teal/10 text-app-teal border-app-teal/20"
              }`}
          >
            {symptom.name}
          </span>
        ))}

        {!expanded && overflow > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="px-2 py-0.5 text-xs text-app-teal hover:underline"
          >
            +{overflow} more
          </button>
        )}

        {expanded && symptoms.length > DEFAULT_VISIBLE && (
          <button
            onClick={() => setExpanded(false)}
            className="px-2 py-0.5 text-xs text-app-gray hover:underline"
          >
            hide
          </button>
        )}
      </div>
    </div>
  );
}
