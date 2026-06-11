"use client";

import { useMemo, useState } from "react";
import type { StoredEntry } from "@/types";
import type { DetectedCycle, CyclePhaseSymptomData } from "@/lib/monthlyUtils";
import { PhasePill } from "../shared/PhasePill";
import { MobilePhaseSymptomCards } from "./MobilePhaseSymptomCards";
import { MobilePhaseBowelCards } from "./MobilePhaseBowelCards";
import { MobilePhaseMedicineCards } from "./MobilePhaseMedicineCards";

// ============================================
// CONSISTENT PATTERNS SECTION
// Shows Phase × Symptoms, Phase × Bowel, Phase × Medicines heat maps
// Organized in tabs: Symptoms (teal) > Bowel (plumb) > Medicines (green)
// ============================================

interface ConsistentPatternsSectionProps {
  entries: StoredEntry[];
  cycles: DetectedCycle[];
  cyclePhaseHeatMapData: CyclePhaseSymptomData[];
}

type PatternTab = "symptoms" | "bowel" | "medicines";

// Phase configuration with day ranges
const phases = ["menstrual", "follicular", "ovulation", "luteal"] as const;
const simplifiedPhases = ["menstrual", "other"] as const;

export const phaseConfig: Record<string, {
  label: string;
  description: string;
  dayRange: string;
}> = {
  menstrual: { 
    label: "Period", 
    description: "During period",
    dayRange: "Active bleeding",
  },
  follicular: { 
    label: "Follicular", 
    description: "Post-period",
    dayRange: "After period ends",
  },
  ovulation: { 
    label: "Ovulation", 
    description: "Mid-cycle",
    dayRange: "Mid-cycle",
  },
  luteal: { 
    label: "Luteal", 
    description: "Pre-period",
    dayRange: "Before period starts",
  },
  other: {
    label: "Other Days",
    description: "Outside of period",
    dayRange: "Outside of period",
  },
};

export function ConsistentPatternsSection({
  entries,
  cycles,
  cyclePhaseHeatMapData,
}: ConsistentPatternsSectionProps) {
  const [activeTab, setActiveTab] = useState<PatternTab>("symptoms");

  const completeCycles = useMemo(() => {
    return cycles.filter((c) => !c.isOngoing && c.length !== null);
  }, [cycles]);

  // Detect if user tracks phases beyond just "menstrual"
  // If >80% of phase entries are "menstrual" or "not_sure", use simplified 2-column view
  const isPhaseAware = useMemo(() => {
    let menstrualOrUnsure = 0;
    let otherPhases = 0;

    for (const entry of entries) {
      if (!entry.cyclePhase) continue;
      if (entry.cyclePhase === "menstrual" || entry.cyclePhase === "not_sure") {
        menstrualOrUnsure++;
      } else {
        otherPhases++;
      }
    }

    const total = menstrualOrUnsure + otherPhases;
    if (total === 0) return false;

    // User is phase-aware if >20% of entries have specific phase data
    return otherPhases / total > 0.2;
  }, [entries]);

  // Tab configuration
  const tabs: { id: PatternTab; label: string; shortLabel: string; activeColor: string; inactiveColor: string }[] = [
    { 
      id: "symptoms", 
      label: "Symptoms", 
      shortLabel: "Symptoms",
      activeColor: "bg-app-teal text-white",
      inactiveColor: "text-app-teal hover:bg-app-teal/10",
    },
    { 
      id: "bowel", 
      label: "Bowel", 
      shortLabel: "Bowel",
      activeColor: "bg-app-plumb text-white",
      inactiveColor: "text-app-plumb hover:bg-app-plumb/10",
    },
    { 
      id: "medicines", 
      label: "Medicines", 
      shortLabel: "Meds",
      activeColor: "bg-app-green/70 text-white",
      inactiveColor: "text-app-green hover:bg-app-green/10",
    },
  ];

  // Early data state - need 2+ complete cycles
  if (completeCycles.length < 2) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">📊</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          More data needed
        </p>
        <p className="text-xs text-app-gray">
          Keep logging! Consistent patterns will appear after 2+ complete cycles
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1 mt-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < completeCycles.length ? "bg-app-teal" : "bg-app-border"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Intro text */}
      <p className="text-sm text-app-gray">
        See how your symptoms, bowel movements, and medicines correlate with each part of your cycle.
      </p>

      {/* Tab Navigation */}
      <div className="flex rounded-lg overflow-hidden border border-app-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? tab.activeColor
                : `bg-white ${tab.inactiveColor}`
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === "symptoms" && (
          <PhaseSymptomView 
            entries={entries}
            cyclePhaseHeatMapData={cyclePhaseHeatMapData}
            cycleCount={cycles.length}
            isPhaseAware={isPhaseAware}
          />
        )}
        {activeTab === "bowel" && (
          <PhaseStoolView 
            entries={entries} 
            cycleCount={cycles.length}
            isPhaseAware={isPhaseAware}
          />
        )}
        {activeTab === "medicines" && (
          <PhaseMedicineView 
            entries={entries} 
            cycleCount={cycles.length}
            isPhaseAware={isPhaseAware}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// SELECTED CELL INFO PANEL
// Shows details for clicked cell below heat map
// ============================================

export interface SelectedCellInfo {
  name: string;
  phase: string;
  count: number;
  avgIntensity?: number | null;
  isPeriodRelated?: boolean;
  feelings?: string[];
  dosages?: string[];
}

interface InfoPanelProps {
  info: SelectedCellInfo | null;
  onClose: () => void;
  colorScheme: "teal" | "plumb" | "green";
}

export function InfoPanel({ info, onClose, colorScheme }: InfoPanelProps) {
  if (!info) return null;

  const colorClasses = {
    teal: {
      bg: info.phase === "menstrual" ? "bg-app-red/10" : "bg-app-teal/10",
      text: info.phase === "menstrual" ? "text-app-red" : "text-app-teal",
      border: info.phase === "menstrual" ? "border-app-red/20" : "border-app-teal/20",
    },
    plumb: {
      bg: info.phase === "menstrual" ? "bg-app-red/10" : "bg-app-plumb/10",
      text: info.phase === "menstrual" ? "text-app-red" : "text-app-plumb",
      border: info.phase === "menstrual" ? "border-app-red/20" : "border-app-plumb/20",
    },
    green: {
      bg: info.phase === "menstrual" ? "bg-app-red/10" : "bg-app-green/10",
      text: info.phase === "menstrual" ? "text-app-red" : "text-app-green",
      border: info.phase === "menstrual" ? "border-app-red/20" : "border-app-green/20",
    },
  };

  const colors = colorClasses[colorScheme];

  const formatFeeling = (feeling: string): string => {
    const feelingLabels: Record<string, string> = {
      complete_relief: "Complete relief",
      partial_relief: "Partial relief",
      incomplete: "Incomplete",
      discomfort: "Discomfort",
      pain: "Pain",
      urgency_remains: "Urgency remains",
    };
    return feelingLabels[feeling] || feeling;
  };

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3 mt-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${colors.text}`}>
              {info.name}
            </span>
            <span className="text-xs text-app-gray">•</span>
            <PhasePill phase={info.phase} size="sm" />
            <span className="text-xs text-app-gray">
              ({phaseConfig[info.phase]?.dayRange})
            </span>
          </div>
          
          <div className="flex items-center gap-4 mt-2">
            <div>
              <span className="text-xs text-app-gray">Times logged: </span>
              <span className="text-sm font-medium text-app-charcoal">{info.count}</span>
            </div>
            {info.avgIntensity !== null && info.avgIntensity !== undefined && (
              <div>
                <span className="text-xs text-app-gray">Avg intensity: </span>
                <span className={`text-sm font-medium ${colors.text}`}>
                  {info.avgIntensity.toFixed(1)}/10
                </span>
              </div>
            )}
          </div>

          {/* Feelings for bowel */}
          {info.feelings && info.feelings.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-app-gray">How you felt: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {[...new Set(info.feelings)].slice(0, 4).map((feeling, i) => (
                  <span 
                    key={i}
                    className={`px-2 py-0.5 text-xs rounded ${colors.bg} ${colors.text}`}
                  >
                    {formatFeeling(feeling)}
                  </span>
                ))}
                {[...new Set(info.feelings)].length > 4 && (
                  <span className="text-xs text-app-gray">
                    +{[...new Set(info.feelings)].length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}

        </div>
        
        <button
          onClick={onClose}
          className="p-1 hover:bg-app-charcoal/10 rounded transition-colors"
          aria-label="Close details"
        >
          <svg className="w-4 h-4 text-app-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// PHASE × SYMPTOM VIEW
// ============================================

interface PhaseSymptomViewProps {
  entries: StoredEntry[];
  cyclePhaseHeatMapData: CyclePhaseSymptomData[];
  cycleCount: number;
  isPhaseAware: boolean;
}

function PhaseSymptomView({ entries, cyclePhaseHeatMapData, cycleCount, isPhaseAware }: PhaseSymptomViewProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCellInfo | null>(null);

  // For simplified view: aggregate into "menstrual" vs "other"
  const simplifiedData = useMemo(() => {
    if (isPhaseAware) return null;

    const symptomMap = new Map<string, {
      symptom: string;
      isPeriodRelated: boolean;
      phases: Record<string, { avgIntensity: number | null; count: number; totalIntensity: number }>;
    }>();

    for (const entry of entries) {
      if (!entry.cyclePhase) continue;

      const phaseKey = entry.cyclePhase === "menstrual" ? "menstrual" : "other";

      // Process general symptoms
      for (const [symptom, intensity] of Object.entries(entry.symptomIntensities || {})) {
        if (!symptomMap.has(symptom)) {
          symptomMap.set(symptom, {
            symptom,
            isPeriodRelated: false,
            phases: {
              menstrual: { avgIntensity: null, count: 0, totalIntensity: 0 },
              other: { avgIntensity: null, count: 0, totalIntensity: 0 },
            },
          });
        }
        const data = symptomMap.get(symptom)!;
        data.phases[phaseKey].count++;
        if (intensity !== null) {
          data.phases[phaseKey].totalIntensity += intensity;
        }
      }

      // Process period symptoms
      for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities || {})) {
        if (!symptomMap.has(symptom)) {
          symptomMap.set(symptom, {
            symptom,
            isPeriodRelated: true,
            phases: {
              menstrual: { avgIntensity: null, count: 0, totalIntensity: 0 },
              other: { avgIntensity: null, count: 0, totalIntensity: 0 },
            },
          });
        }
        const data = symptomMap.get(symptom)!;
        data.isPeriodRelated = true;
        data.phases[phaseKey].count++;
        if (intensity !== null) {
          data.phases[phaseKey].totalIntensity += intensity;
        }
      }
    }

    // Calculate averages
    const result = Array.from(symptomMap.values()).map((item) => {
      for (const phase of ["menstrual", "other"]) {
        const p = item.phases[phase];
        if (p.count > 0 && p.totalIntensity > 0) {
          p.avgIntensity = p.totalIntensity / p.count;
        }
      }
      return item;
    });

    return result.sort((a, b) => {
      const aAvg = calculateOverallAvgIntensity(a.phases);
      const bAvg = calculateOverallAvgIntensity(b.phases);
      return bAvg - aAvg;
    });
  }, [entries, isPhaseAware]);

  // Sort by highest average intensity across all phases
  const sortedData = useMemo(() => {
    return [...cyclePhaseHeatMapData].sort((a, b) => {
      const aAvg = calculateOverallAvgIntensity(a.phases);
      const bAvg = calculateOverallAvgIntensity(b.phases);
      return bAvg - aAvg;
    });
  }, [cyclePhaseHeatMapData]);

  if (sortedData.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">📊</span>
        <p className="text-app-charcoal font-medium">No symptom patterns yet</p>
        <p className="text-sm text-app-gray mt-1">
          Log symptoms with cycle phases to see correlations
        </p>
      </div>
    );
  }

  const maxIntensity = Math.max(
    ...sortedData.flatMap(s =>
      Object.values(s.phases).map(p => p.avgIntensity ?? 0)
    ),
    1
  );

  const handleCellClick = (symptom: CyclePhaseSymptomData, phase: string) => {
    const data = symptom.phases[phase];
    if (!data || data.count === 0) return;

    const cellKey = `${symptom.symptom}-${phase}`;
    const currentKey = selectedCell ? `${selectedCell.name}-${selectedCell.phase}` : null;

    if (cellKey === currentKey) {
      setSelectedCell(null);
    } else {
      setSelectedCell({
        name: symptom.symptom,
        phase,
        count: data.count,
        avgIntensity: data.avgIntensity,
        isPeriodRelated: symptom.isPeriodRelated,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-app-charcoal">Symptoms by Phase</h4>
          <span className="text-xs text-app-gray bg-app-cream/50 px-2 py-0.5 rounded-full">
            {cycleCount > 0 
              ? `${cycleCount} cycle${cycleCount !== 1 ? "s analyzed" : " analyzed"}`
              // ? `Includes data from ${cycleCount} cycle${cycleCount !== 1 ? "s" : ""}`
              : "Based on all logged data"
            }
          </span>
        </div>
        <p className="text-xs text-app-gray mt-0.5">
          Tap any cell to see details.
        </p>
      </div>

      {/* Desktop Heat Map */}
      <div className="hidden min-[500px]:block">
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* Phase Headers */}
            <div className="flex mb-2">
              <div className="w-32 shrink-0 sticky left-0 bg-app-white z-10" />
              {(isPhaseAware ? phases : simplifiedPhases).map((phase) => (
                <div
                  key={phase}
                  className={`flex-1 min-w-[70px] text-center ${
                    phase === "menstrual" ? "border-x border-t border-app-red/20 rounded-t-lg bg-app-red/5" : ""
                  }`}
                >
                  <p className={`text-xs font-medium ${
                    phase === "menstrual" ? "text-app-red" : "text-app-teal"
                  }`}>
                    {phaseConfig[phase].label}
                  </p>
                  <p className="text-[10px] text-app-gray">
                    {phaseConfig[phase].dayRange}
                  </p>
                </div>
              ))}
            </div>

            {/* Symptom Rows */}
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {(isPhaseAware ? sortedData : simplifiedData || []).slice(0, 15).map((symptom) => {
                const isSelected = selectedCell?.name === symptom.symptom;
                const activePhases = isPhaseAware ? phases : simplifiedPhases;

                return (
                  <div key={symptom.symptom} className="flex items-center">
                    {/* Sticky symptom name column */}
                    <div className="w-32 shrink-0 pr-2 sticky left-0 bg-app-white z-10">
                      <p
                        className={`text-xs truncate ${
                          symptom.isPeriodRelated ? "text-app-red" : "text-app-charcoal"
                        } ${isSelected ? "font-semibold" : ""}`}
                        title={symptom.symptom}
                      >
                        {symptom.symptom}
                      </p>
                    </div>

                    {activePhases.map((phase) => {
                      const data = symptom.phases[phase];
                      const hasData = data && data.count > 0;
                      const intensity = data?.avgIntensity ?? 0;
                      const isCellSelected = selectedCell?.name === symptom.symptom && selectedCell?.phase === phase;

                      return (
                        <div
                          key={phase}
                          className={`flex-1 min-w-[70px] px-1 ${
                            phase === "menstrual" ? "border-x border-app-red/20 bg-app-red/5" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(symptom, phase)}
                            disabled={!hasData}
                            className={`w-full h-10 rounded-lg transition-all flex items-center justify-center ${
                              hasData
                                ? getPhaseIntensityStyle(intensity, maxIntensity, symptom.isPeriodRelated, phase)
                                : "bg-app-border/30"
                            } ${isCellSelected ? "ring-2 ring-app-charcoal ring-offset-1" : ""} ${
                              hasData ? "cursor-pointer" : "cursor-default"
                            }`}
                          >
                            {hasData && (
                              <span className="text-xs font-medium">
                                {data.avgIntensity !== null ? data.avgIntensity.toFixed(1) : data.count}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom border for period column */}
            <div className="flex">
              <div className="w-32 shrink-0 sticky left-0 bg-app-white z-10" />
              {(isPhaseAware ? phases : simplifiedPhases).map((phase) => (
                <div
                  key={phase}
                  className={`flex-1 min-w-[70px] ${
                    phase === "menstrual" ? "border-x border-b border-app-red/20 rounded-b-lg h-1" : ""
                  }`}
                />
              ))}
            </div>

            {(isPhaseAware ? sortedData : simplifiedData || []).length > 15 && (
              <p className="text-xs text-app-gray text-center mt-2">
                Showing top 15 of {(isPhaseAware ? sortedData : simplifiedData || []).length} symptoms
              </p>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-app-gray mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-app-red" />
            <span>Period symptoms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-app-teal" />
            <span>Other symptoms</span>
          </div>
        </div>

        {/* Selected Cell Info Panel */}
        <InfoPanel
          info={selectedCell}
          onClose={() => setSelectedCell(null)}
          colorScheme="teal"
        />
      </div>

      {/* Mobile Cards */}
      <div className="min-[500px]:hidden">
        <MobilePhaseSymptomCards
          data={isPhaseAware ? sortedData : simplifiedData || []}
          isPhaseAware={isPhaseAware}
        />
      </div>

      {/* Key Patterns */}
      <SymptomInsights data={sortedData} />
    </div>
  );
}

// ============================================
// SYMPTOM INSIGHTS (Key Patterns)
// ============================================

interface SymptomInsightsProps {
  data: CyclePhaseSymptomData[];
}

function SymptomInsights({ data }: SymptomInsightsProps) {
  const insights = useMemo(() => {
    const results: { symptom: string; phase: string; intensity: number; isPeriodRelated: boolean }[] = [];

    for (const symptom of data) {
      let maxPhase: string | null = null;
      let maxIntensity = 0;
      let totalCount = 0;

      for (const [phase, phaseData] of Object.entries(symptom.phases)) {
        totalCount += phaseData.count;
        if (phaseData.avgIntensity !== null && phaseData.avgIntensity > maxIntensity) {
          maxIntensity = phaseData.avgIntensity;
          maxPhase = phase;
        }
      }

      if (maxPhase && maxIntensity >= 4 && totalCount >= 3) {
        results.push({
          symptom: symptom.symptom,
          phase: maxPhase,
          intensity: maxIntensity,
          isPeriodRelated: symptom.isPeriodRelated,
        });
      }
    }

    return results
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 5);
  }, [data]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-app-cream/50 rounded-lg p-4">
      <h5 className="text-sm font-medium text-app-charcoal mb-2">Key Patterns</h5>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-center gap-2 text-sm flex-wrap">
            <span className={insight.isPeriodRelated ? "text-app-red font-medium" : "text-app-teal font-medium"}>
              {insight.symptom}
            </span>
            <span className="text-app-gray">peaks</span>
            <span className={`font-medium ${
              insight.phase === "menstrual" ? "text-app-red" : "text-app-teal"
            }`}>
              {insight.phase === "menstrual" 
                ? "during period" 
                : insight.phase === "other"
                  ? "outside of your period"
                  : `in ${phaseConfig[insight.phase]?.label.toLowerCase()}`}
            </span>
            {insight.phase !== "menstrual" && insight.phase !== "other" && (
              <span className="text-xs text-app-gray">
                ({phaseConfig[insight.phase]?.description.toLowerCase()})
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-app-gray mt-3">
        💡 These patterns can help you anticipate symptoms and plan accordingly.
      </p>
    </div>
  );
}

// ============================================
// PHASE × STOOL VIEW
// ============================================

interface PhaseStoolViewProps {
  entries: StoredEntry[];
  cycleCount: number;
  isPhaseAware: boolean;
}

function PhaseStoolView({ entries, cycleCount, isPhaseAware }: PhaseStoolViewProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCellInfo | null>(null);

  const { phaseStoolData, bristolTypes, maxCount } = useMemo(() => {
    const phaseKeys = isPhaseAware 
      ? ["menstrual", "follicular", "ovulation", "luteal"]
      : ["menstrual", "other"];
    
    const data: Record<string, Record<number, { count: number; feelings: string[] }>> = {};
    phaseKeys.forEach(key => { data[key] = {}; });

    const typeSet = new Set<number>();
    let max = 0;

    for (const entry of entries) {
      if (!entry.cyclePhase) continue;
      if (!entry.stoolType) continue;

      // For simplified view, group non-menstrual as "other"
      // For phase-aware view, skip "not_sure" entries
      let phaseKey: string;
      if (isPhaseAware) {
        if (entry.cyclePhase === "not_sure") continue;
        phaseKey = entry.cyclePhase;
      } else {
        phaseKey = entry.cyclePhase === "menstrual" ? "menstrual" : "other";
      }

      typeSet.add(entry.stoolType);

      if (!data[phaseKey][entry.stoolType]) {
        data[phaseKey][entry.stoolType] = { count: 0, feelings: [] };
      }
      data[phaseKey][entry.stoolType].count++;
      if (entry.stoolFeeling) {
        data[phaseKey][entry.stoolType].feelings.push(entry.stoolFeeling);
      }
      if (data[phaseKey][entry.stoolType].count > max) {
        max = data[phaseKey][entry.stoolType].count;
      }
    }

    // Sort by Bristol type number (Type 1 first, Type 7 last)
    const types = Array.from(typeSet).sort((a, b) => a - b);

    return { phaseStoolData: data, bristolTypes: types, maxCount: max };
  }, [entries, isPhaseAware]);

  if (bristolTypes.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">💩</span>
        <p className="text-app-charcoal font-medium">No bowel patterns yet</p>
        <p className="text-sm text-app-gray mt-1">
          Log bowel movements while tracking your cycle phase to see patterns
        </p>
      </div>
    );
  }

  const bristolLabels: Record<number, string> = {
    1: "Type 1", 2: "Type 2", 3: "Type 3", 4: "Type 4",
    5: "Type 5", 6: "Type 6", 7: "Type 7",
  };

  const bristolDescriptions: Record<number, string> = {
    1: "Hard lumps", 2: "Lumpy sausage", 3: "Cracked sausage",
    4: "Smooth snake", 5: "Soft blobs", 6: "Mushy", 7: "Watery",
  };

  const handleCellClick = (type: number, phase: string) => {
    const data = phaseStoolData[phase]?.[type];
    if (!data || data.count === 0) return;

    const formattedName = `${bristolLabels[type]} (${bristolDescriptions[type]})`;
    const cellKey = `${formattedName}-${phase}`;
    const currentKey = selectedCell ? `${selectedCell.name}-${selectedCell.phase}` : null;

    if (cellKey === currentKey) {
      setSelectedCell(null);
    } else {
      setSelectedCell({
        name: formattedName,
        phase,
        count: data.count,
        feelings: data.feelings,
      });
    }
  };


  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-app-charcoal">Bowel by Phase</h4>
          <span className="text-xs text-app-gray bg-app-cream/50 px-2 py-0.5 rounded-full">
            {cycleCount > 0 
              // ? `Includes data from ${cycleCount} cycle${cycleCount !== 1 ? "s" : ""}`
              ? `${cycleCount} cycle${cycleCount !== 1 ? "s analyzed" : " analyzed"}`
              : "Based on all logged data"
            }
          </span>
        </div>
        <p className="text-xs text-app-gray mt-0.5">
          Tap any cell to see details.
        </p>
      </div>

      {/* Desktop Heat Map */}
      <div className="hidden min-[500px]:block">
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* Phase Headers */}
            <div className="flex mb-2">
              <div className="w-32 shrink-0 sticky left-0 bg-app-white z-10" />
              {(isPhaseAware ? phases : simplifiedPhases).map((phase) => (
                <div
                  key={phase}
                  className={`flex-1 min-w-[70px] text-center ${
                    phase === "menstrual" ? "border-x border-t border-app-red/20 rounded-t-lg bg-app-red/5" : ""
                  }`}
                >
                  <p className={`text-xs font-medium ${
                    phase === "menstrual" ? "text-app-red" : "text-app-plumb"
                  }`}>
                    {phaseConfig[phase].label}
                  </p>
                  <p className="text-[10px] text-app-gray">
                    {phaseConfig[phase].dayRange}
                  </p>
                </div>
              ))}
            </div>

            {/* Bristol Type Rows */}
            <div className="space-y-1">
              {bristolTypes.map((type) => {
                const isSelected = selectedCell?.name.includes(bristolLabels[type]);
                const activePhases = isPhaseAware ? phases : simplifiedPhases;

                return (
                  <div key={type} className="flex items-center">
                    {/* Sticky Bristol type column */}
                    <div className="w-32 shrink-0 pr-2 sticky left-0 bg-app-white z-10">
                      <p className={`text-xs text-app-charcoal font-medium ${isSelected ? "text-app-plumb" : ""}`}>
                        {bristolLabels[type]}
                      </p>
                      <p className="text-xs text-app-gray truncate" title={bristolDescriptions[type]}>
                        {bristolDescriptions[type]}
                      </p>
                    </div>

                    {activePhases.map((phase) => {
                      const data = phaseStoolData[phase]?.[type];
                      const hasData = data && data.count > 0;
                      const count = data?.count || 0;
                      const isCellSelected = selectedCell?.name.includes(bristolLabels[type]) && selectedCell?.phase === phase;

                      return (
                        <div
                          key={phase}
                          className={`flex-1 min-w-[70px] px-1 ${
                            phase === "menstrual" ? "border-x border-app-red/20 bg-app-red/5" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(type, phase)}
                            disabled={!hasData}
                            className={`w-full h-10 rounded-lg transition-all flex items-center justify-center ${
                              hasData
                                ? getStoolIntensityStyle(count, maxCount, phase)
                                : "bg-app-border/30"
                            } ${isCellSelected ? "ring-2 ring-app-charcoal ring-offset-1" : ""} ${
                              hasData ? "cursor-pointer" : "cursor-default"
                            }`}
                          >
                            {hasData && (
                              <span className="text-xs font-medium">{count}</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom border for period column */}
            <div className="flex">
              <div className="w-32 shrink-0 sticky left-0 bg-app-white z-10" />
              {(isPhaseAware ? phases : simplifiedPhases).map((phase) => (
                <div
                  key={phase}
                  className={`flex-1 min-w-[70px] ${
                    phase === "menstrual" ? "border-x border-b border-app-red/20 rounded-b-lg h-1" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-app-gray mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-app-red" />
            <span>During period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-app-plumb" />
            <span>Other phases</span>
          </div>
        </div>

        {/* Selected Cell Info Panel */}
        <InfoPanel
          info={selectedCell}
          onClose={() => setSelectedCell(null)}
          colorScheme="plumb"
        />
      </div>

      {/* Mobile Cards */}
      <div className="min-[500px]:hidden">
        <MobilePhaseBowelCards
          phaseStoolData={phaseStoolData}
          bristolTypes={bristolTypes}
          isPhaseAware={isPhaseAware}
        />
      </div>

      {/* Key Patterns */}
      <StoolInsights phaseStoolData={phaseStoolData} bristolTypes={bristolTypes} isPhaseAware={isPhaseAware} />
    </div>
  );
}

// ============================================
// STOOL INSIGHTS (Key Patterns)
// ============================================

interface StoolInsightsProps {
  phaseStoolData: Record<string, Record<number, { count: number; feelings: string[] }>>;
  bristolTypes: number[];
  isPhaseAware: boolean;
}

function StoolInsights({ phaseStoolData, bristolTypes, isPhaseAware }: StoolInsightsProps) {
  const bristolLabels: Record<number, string> = {
    1: "Type 1", 2: "Type 2", 3: "Type 3", 4: "Type 4",
    5: "Type 5", 6: "Type 6", 7: "Type 7",
  };

  const bristolDescriptions: Record<number, string> = {
    1: "Hard lumps", 2: "Lumpy sausage", 3: "Cracked sausage",
    4: "Smooth snake", 5: "Soft blobs", 6: "Mushy", 7: "Watery",
  };

  const insights = useMemo(() => {
    const results: { type: number; phase: string; count: number; percentage: number }[] = [];
    const activePhases = isPhaseAware ? phases : simplifiedPhases;

    for (const type of bristolTypes) {
      let maxPhase: string | null = null;
      let maxCount = 0;
      let totalCount = 0;

      for (const phase of activePhases) {
        const count = phaseStoolData[phase]?.[type]?.count || 0;
        totalCount += count;
        if (count > maxCount) {
          maxCount = count;
          maxPhase = phase;
        }
      }

      if (maxPhase && maxCount >= 2 && totalCount >= 3) {
        const percentage = Math.round((maxCount / totalCount) * 100);
        if (percentage >= 40) {
          results.push({ type, phase: maxPhase, count: maxCount, percentage });
        }
      }
    }

    return results.sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  }, [phaseStoolData, bristolTypes, isPhaseAware]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-app-cream/50 rounded-lg p-4">
      <h5 className="text-sm font-medium text-app-charcoal mb-2">Key Patterns</h5>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-app-plumb font-medium">
              {bristolLabels[insight.type]}
            </span>
            <span className="text-app-gray">peaks</span>
            <span className={`font-medium ${
              insight.phase === "menstrual" ? "text-app-red" : "text-app-plumb"
            }`}>
              {insight.phase === "menstrual" 
                ? "during period" 
                : insight.phase === "other"
                  ? "outside of your period"
                  : `in ${phaseConfig[insight.phase]?.label.toLowerCase()}`}
            </span>
            {insight.phase !== "menstrual" && insight.phase !== "other" && (
              <span className="text-xs text-app-gray">
                ({phaseConfig[insight.phase]?.description.toLowerCase()})
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-app-gray mt-3">
        💡 These patterns can help you understand how your cycle affects digestion.
      </p>
    </div>
  );
}

// ============================================
// PHASE × MEDICINE VIEW
// ============================================

interface PhaseMedicineViewProps {
  entries: StoredEntry[];
  cycleCount: number;
  isPhaseAware: boolean;
}

function PhaseMedicineView({ entries, cycleCount, isPhaseAware }: PhaseMedicineViewProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCellInfo | null>(null);

  const { phaseMedicineData, allMedicines, maxCount } = useMemo(() => {
    const phaseKeys = isPhaseAware 
      ? ["menstrual", "follicular", "ovulation", "luteal"]
      : ["menstrual", "other"];
    
    const data: Record<string, Record<string, { count: number; dosages: string[] }>> = {};
    phaseKeys.forEach(key => { data[key] = {}; });

    const medicineSet = new Set<string>();
    let max = 0;

        for (const entry of entries) {
      if (!entry.cyclePhase) continue;

      // For simplified view, group non-menstrual as "other"
      // For phase-aware view, skip "not_sure" entries
      let phaseKey: string;
      if (isPhaseAware) {
        if (entry.cyclePhase === "not_sure") continue;
        phaseKey = entry.cyclePhase;
      } else {
        phaseKey = entry.cyclePhase === "menstrual" ? "menstrual" : "other";
      }

      for (const med of entry.medicineLog) {
        medicineSet.add(med.medicineName);

        if (!data[phaseKey][med.medicineName]) {
          data[phaseKey][med.medicineName] = { count: 0, dosages: [] };
        }
        data[phaseKey][med.medicineName].count++;
        if (med.dosage) {
          data[phaseKey][med.medicineName].dosages.push(med.dosage);
        }
        if (data[phaseKey][med.medicineName].count > max) {
          max = data[phaseKey][med.medicineName].count;
        }
      }
    }

    // Sort by total count across all phases (highest first)
    const medicines = Array.from(medicineSet).sort((a, b) => {
      const aTotal = Object.values(data).reduce((sum, phase) => sum + (phase[a]?.count || 0), 0);
      const bTotal = Object.values(data).reduce((sum, phase) => sum + (phase[b]?.count || 0), 0);
      return bTotal - aTotal;
    });

    return { phaseMedicineData: data, allMedicines: medicines, maxCount: max };
  }, [entries, isPhaseAware]);

  if (allMedicines.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">💊</span>
        <p className="text-app-charcoal font-medium">No medicine patterns yet</p>
        <p className="text-sm text-app-gray mt-1">
          Log medicines while tracking your cycle phase to see patterns
        </p>
      </div>
    );
  }

  const getAverageCount = (medicine: string, phase: string): number | null => {
    const data = phaseMedicineData[phase][medicine];
    if (!data || data.count === 0 || cycleCount === 0) return null;
    return Math.round((data.count / cycleCount) * 10) / 10;
  };

  const activePhases = isPhaseAware ? phases : simplifiedPhases;
  const phaseTotals = activePhases.map(phase => ({
    phase,
    total: Object.values(phaseMedicineData[phase] || {}).reduce((sum, m) => sum + m.count, 0),
  }));

  const handleCellClick = (medicine: string, phase: string) => {
    const data = phaseMedicineData[phase]?.[medicine];
    if (!data || data.count === 0) return;

    const cellKey = `${medicine}-${phase}`;
    const currentKey = selectedCell ? `${selectedCell.name}-${selectedCell.phase}` : null;

    if (cellKey === currentKey) {
      setSelectedCell(null);
    } else {
      setSelectedCell({
        name: medicine,
        phase,
        count: data.count,
        dosages: data.dosages,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-app-charcoal">Medicine by Phase</h4>
          <span className="text-xs text-app-gray bg-app-cream/50 px-2 py-0.5 rounded-full">
            {cycleCount > 0 
              // ? `Includes data from ${cycleCount} cycle${cycleCount !== 1 ? "s" : ""}`
              ? `${cycleCount} cycle${cycleCount !== 1 ? "s analyzed" : " analyzed"}`
              : "Based on all logged data"
            }
          </span>
        </div>
        <p className="text-xs text-app-gray mt-0.5">
          Tap any cell to see details.
        </p>
      </div>

      {/* Phase Summary Cards */}
      {/* <div className={`grid gap-2 ${isPhaseAware ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        {phaseTotals.map(({ phase, total }) => {
          const avgPerCycle = cycleCount > 0 ? Math.round((total / cycleCount) * 10) / 10 : null;
          return (
            <div
              key={phase}
              className={`p-3 rounded-lg text-center ${
                phase === "menstrual" ? "bg-app-red/10" : "bg-app-green/10"
              }`}
            >
              <p className={`text-lg font-bold ${
                phase === "menstrual" ? "text-app-red" : "text-app-green"
              }`}>
                {total}
              </p>
              <div className="flex justify-center mt-1">
                <PhasePill phase={phase} size="sm" />
              </div>
              {avgPerCycle !== null && cycleCount > 1 && (
                <p className={`text-xs mt-1 ${
                  phase === "menstrual" ? "text-app-red/70" : "text-app-green/70"
                }`}>
                  ~{avgPerCycle}× per cycle
                </p>
              )}
            </div>
          );
        })}
      </div> */}

      {/* Desktop Heat Map */}
      <div className="hidden min-[500px]:block">
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="flex mb-2">
              <div className="w-32 shrink-0 sticky left-0 bg-app-white z-10" />
              {activePhases.map((phase) => (
                <div
                  key={phase}
                  className={`flex-1 min-w-[70px] text-center ${
                    phase === "menstrual" ? "border-x border-t border-app-red/20 rounded-t-lg bg-app-red/5" : ""
                  }`}
                >
                  <p className={`text-xs font-medium ${
                    phase === "menstrual" ? "text-app-red" : "text-app-green"
                  }`}>
                    {phaseConfig[phase].label}
                  </p>
                  <p className="text-[10px] text-app-gray">
                    {phaseConfig[phase].dayRange}
                  </p>
                </div>
              ))}
            </div>

            {/* Medicine Rows */}
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {allMedicines.slice(0, 10).map((medicine) => {
                const isSelected = selectedCell?.name === medicine;

                return (
                  <div key={medicine} className="flex items-center">
                    {/* Sticky medicine name column */}
                    <div className="w-32 shrink-0 pr-2 sticky left-0 bg-app-white z-10">
                      <p
                        className={`text-xs text-app-charcoal truncate ${isSelected ? "font-semibold text-app-green" : ""}`}
                        title={medicine}
                      >
                        {medicine}
                      </p>
                    </div>

                    {activePhases.map((phase) => {
                      const data = phaseMedicineData[phase]?.[medicine];
                      const hasData = data && data.count > 0;
                      const count = data?.count || 0;
                      const avgPerCycle = getAverageCount(medicine, phase);
                      const isCellSelected = selectedCell?.name === medicine && selectedCell?.phase === phase;

                      return (
                        <div
                          key={phase}
                          className={`flex-1 min-w-[70px] px-1 ${
                            phase === "menstrual" ? "border-x border-app-red/20 bg-app-red/5" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(medicine, phase)}
                            disabled={!hasData}
                            className={`w-full h-10 rounded-lg transition-all flex flex-col items-center justify-center ${
                              hasData
                                ? getMedicineIntensityStyle(count, maxCount, phase)
                                : "bg-app-green/5"
                            } ${isCellSelected ? "ring-2 ring-app-charcoal ring-offset-1" : ""} ${
                              hasData ? "cursor-pointer" : "cursor-default"
                            }`}
                          >
                            {hasData && avgPerCycle !== null && cycleCount > 1 && (
                              <span className="text-[10px] opacity-75 leading-none">
                                ~{avgPerCycle}×/cycle
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom border for period column */}
            <div className="flex">
              <div className="w-32 shrink-0 sticky left-0 bg-app-white z-10" />
              {activePhases.map((phase) => (
                <div
                  key={phase}
                  className={`flex-1 min-w-[70px] ${
                    phase === "menstrual" ? "border-x border-b border-app-red/20 rounded-b-lg h-1" : ""
                  }`}
                />
              ))}
            </div>

            {allMedicines.length > 10 && (
              <p className="text-xs text-app-gray text-center mt-2">
                Showing top 10 of {allMedicines.length} medicines
              </p>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-app-gray mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-app-red" />
            <span>During period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-app-green/50" />
            <span>Other phases</span>
          </div>
        </div>

        {/* Selected Cell Info Panel */}
        <InfoPanel
          info={selectedCell}
          onClose={() => setSelectedCell(null)}
          colorScheme="green"
        />
      </div>

      {/* Mobile Cards */}
      <div className="min-[500px]:hidden">
        <MobilePhaseMedicineCards
          phaseMedicineData={phaseMedicineData}
          allMedicines={allMedicines}
          isPhaseAware={isPhaseAware}
          cycleCount={cycleCount}
        />
      </div>

      {/* Key Patterns */}
      <MedicineInsights phaseMedicineData={phaseMedicineData} allMedicines={allMedicines} isPhaseAware={isPhaseAware} />
    </div>
  );
}

// ============================================
// MEDICINE INSIGHTS (Key Patterns)
// ============================================

interface MedicineInsightsProps {
  phaseMedicineData: Record<string, Record<string, { count: number; dosages: string[] }>>;
  allMedicines: string[];
  isPhaseAware: boolean;
}

function MedicineInsights({ phaseMedicineData, allMedicines, isPhaseAware }: MedicineInsightsProps) {
  const insights = useMemo(() => {
    const results: { medicine: string; phase: string; count: number; percentage: number }[] = [];
    const activePhases = isPhaseAware ? phases : simplifiedPhases;

    for (const medicine of allMedicines) {
      let maxPhase: string | null = null;
      let maxCount = 0;
      let totalCount = 0;

      for (const phase of activePhases) {
        const count = phaseMedicineData[phase]?.[medicine]?.count || 0;
        totalCount += count;
        if (count > maxCount) {
          maxCount = count;
          maxPhase = phase;
        }
      }

      if (maxPhase && maxCount >= 2 && totalCount >= 3) {
        const percentage = Math.round((maxCount / totalCount) * 100);
        if (percentage >= 40) {
          results.push({ medicine, phase: maxPhase, count: maxCount, percentage });
        }
      }
    }

    return results.sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  }, [phaseMedicineData, allMedicines, isPhaseAware]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-app-cream/50 rounded-lg p-4">
      <h5 className="text-sm font-medium text-app-charcoal mb-2">Key Patterns</h5>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-app-green font-medium">
              {insight.medicine}
            </span>
            <span className="text-app-gray">mostly taken</span>
            <span className={`font-medium ${
              insight.phase === "menstrual" ? "text-app-red" : "text-app-green"
            }`}>
              {insight.phase === "menstrual" 
                ? "during period" 
                : insight.phase === "other"
                  ? "outside of your period"
                  : `in ${phaseConfig[insight.phase]?.label.toLowerCase()}`}
            </span>
            {insight.phase !== "menstrual" && insight.phase !== "other" && (
              <span className="text-xs text-app-gray">
                ({phaseConfig[insight.phase]?.description.toLowerCase()})
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-app-gray mt-3">
        💡 These patterns can help you anticipate medication needs during your cycle.
      </p>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateOverallAvgIntensity(phases: Record<string, { avgIntensity: number | null; count: number }>): number {
  let totalIntensity = 0;
  let totalCount = 0;
  
  for (const phaseData of Object.values(phases)) {
    if (phaseData.avgIntensity !== null && phaseData.count > 0) {
      totalIntensity += phaseData.avgIntensity * phaseData.count;
      totalCount += phaseData.count;
    }
  }
  
  return totalCount > 0 ? totalIntensity / totalCount : 0;
}

export function getPhaseIntensityStyle(
  intensity: number,
  maxIntensity: number,
  isPeriodRelated: boolean,
  phase: string
): string {
  const useRed = phase === "menstrual" || isPeriodRelated;
  const ratio = intensity / maxIntensity;

  if (useRed) {
    if (ratio <= 0.33) return "bg-app-red/30 text-app-red";
    if (ratio <= 0.66) return "bg-app-red/60 text-white";
    return "bg-app-red text-white";
  } else {
    if (ratio <= 0.33) return "bg-app-teal/30 text-app-teal";
    if (ratio <= 0.66) return "bg-app-teal/60 text-white";
    return "bg-app-teal text-white";
  }
}

export function getStoolIntensityStyle(count: number, maxCount: number, phase: string): string {
  const ratio = count / maxCount;
  const isPeriod = phase === "menstrual";

  if (isPeriod) {
    if (ratio <= 0.33) return "bg-app-red/30 text-app-red";
    if (ratio <= 0.66) return "bg-app-red/60 text-white";
    return "bg-app-red text-white";
  } else {
    if (ratio <= 0.33) return "bg-app-plumb/30 text-app-plumb";
    if (ratio <= 0.66) return "bg-app-plumb/60 text-white";
    return "bg-app-plumb text-white";
  }
}

export function getMedicineIntensityStyle(count: number, maxCount: number, phase: string): string {
  const ratio = count / maxCount;
  const isPeriod = phase === "menstrual";

  if (isPeriod) {
    if (ratio <= 0.33) return "bg-app-red/30 text-app-red";
    if (ratio <= 0.66) return "bg-app-red/60 text-white";
    return "bg-app-red text-white";
  } else {
    if (ratio <= 0.33) return "bg-app-green/15 text-app-charcoal";
    if (ratio <= 0.66) return "bg-app-green/40 text-app-charcoal";
    return "bg-app-green/55 text-white";
  }
}