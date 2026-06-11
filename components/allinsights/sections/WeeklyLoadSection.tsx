"use client";

import { CollapsibleSection } from "@/components/cycleinsights/shared/CollapsibleSection";
import { WeeklyLoadStats } from "@/lib/allInsightsUtils";
import { BuildingInsightPlaceholder } from "./BuildingInsightPlaceholder";

// ============================================
// WEEKLY LOAD SECTION
// 3 rings showing load percentages:
// - Symptom Load: % of days with ≥1 symptom
// - Bristol Load: % of days with non-baseline stool (outside 3-4)
// - Medicine Load: x/7 of days with any medication
// ============================================

interface WeeklyLoadSectionProps {
  loadStats: WeeklyLoadStats;
  uniqueDaysLogged: number;
  defaultExpanded?: boolean;
  symptomsEnabled?: boolean;
  stoolTrackingEnabled?: boolean;
  medicineTrackingEnabled?: boolean;
}

const RING_COLORS = {
  symptom: {
    stroke: "stroke-app-teal/80",
    bg: "bg-app-teal/50",
    text: "text-app-teal",
  },
  bristol: {
    stroke: "stroke-app-plumb/80",
    bg: "bg-app-plumb/50",
    text: "text-app-plumb",
  },
  medicine: {
    stroke: "stroke-app-green/60",
    bg: "bg-app-green/40",
    text: "text-app-green/70",
  },
};

export function WeeklyLoadSection({
  loadStats,
  uniqueDaysLogged,
  defaultExpanded = true,
  symptomsEnabled = true,
  stoolTrackingEnabled = true,
  medicineTrackingEnabled = true,
}: WeeklyLoadSectionProps) {
  const needsMoreData = uniqueDaysLogged < 14;

  // Count enabled categories to determine grid columns
  const enabledCount = (symptomsEnabled ? 1 : 0) + (stoolTrackingEnabled ? 1 : 0) + (medicineTrackingEnabled ? 1 : 0);
  const gridCols = enabledCount === 1 ? "grid-cols-1" : enabledCount === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <CollapsibleSection
      title="Weekly Summary"
      helpText="Shows the proportion of days in the last 7 days with symptoms and medication use, plus the proportion of Bristol movements within the normal range (types 3-4)."
      defaultExpanded={defaultExpanded}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
    >
      {needsMoreData ? (
        <BuildingInsightPlaceholder
          uniqueDaysLogged={uniqueDaysLogged}
          title="Your weekly patterns are growing"
          subtitle="See how your symptoms, Bristol types, and medications balance out each week."
        />
      ) : (
        <>
          <div className={`grid ${gridCols} gap-4`}>
            {/* Symptom Load Ring - only if symptoms enabled */}
            {symptomsEnabled && (
              <LoadRing
                label="Symptoms"
                value={loadStats.symptomLoad.percentage}
                subtext={`${loadStats.symptomLoad.daysWithSymptoms}/7 days`}
                colorKey="symptom"
              />
            )}

            {/* Bristol Load Ring - only if stool tracking enabled */}
            {stoolTrackingEnabled && (
              <LoadRing
                label="Bristol"
                value={loadStats.bristolLoad.totalMovements > 0
                  ? Math.round(((loadStats.bristolLoad.totalMovements - loadStats.bristolLoad.nonBaselineMovements) / loadStats.bristolLoad.totalMovements) * 100)
                  : 0}
                subtext={`${loadStats.bristolLoad.totalMovements - loadStats.bristolLoad.nonBaselineMovements}/${loadStats.bristolLoad.totalMovements} movements`}
                colorKey="bristol"
              />
            )}

            {/* Medicine Load Ring - only if medicine tracking enabled */}
            {medicineTrackingEnabled && (
              <LoadRing
                label="Medicine"
                value={Math.round((loadStats.medicineLoad.daysWithMedicine / 7) * 100)}
                subtext={loadStats.medicineLoad.ratio}
                colorKey="medicine"
              />
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-app-border">
            <div className="grid grid-cols-1 gap-2 text-xs text-app-gray">
              {symptomsEnabled && (
                <div className="flex items-start gap-2">
                  <div className={`w-3 h-3 rounded-full ${RING_COLORS.symptom.bg} flex-shrink-0 mt-0.5`} />
                  <span>Days with at least 1 symptom logged</span>
                </div>
              )}
              {stoolTrackingEnabled && (
                <div className="flex items-start gap-2">
                  <div className={`w-3 h-3 rounded-full ${RING_COLORS.bristol.bg} flex-shrink-0 mt-0.5`} />
                  <span>Movements with normal Bristol types (3-4)</span>
                </div>
              )}
              {medicineTrackingEnabled && (
                <div className="flex items-start gap-2">
                  <div className={`w-3 h-3 rounded-full ${RING_COLORS.medicine.bg} flex-shrink-0 mt-0.5`} />
                  <span>Days with any medication logged</span>
                </div>
              )}
            </div>
          </div>

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

interface LoadRingProps {
  label: string;
  value: number;
  subtext: string;
  colorKey: "symptom" | "bristol" | "medicine";
}

function LoadRing({ label, value, subtext, colorKey }: LoadRingProps) {
  const colors = RING_COLORS[colorKey];

  // SVG ring calculations
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      {/* Ring */}
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-app-cream"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={colors.stroke}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${colors.text}`}>{value}%</span>
        </div>
      </div>

      {/* Label */}
      <p className="text-sm font-medium text-app-charcoal mt-2">{label}</p>
      <p className="text-xs text-app-gray">{subtext}</p>
    </div>
  );
}

// Re-export for backwards compatibility
export { WeeklyLoadSection as SymptomLoadSection };
