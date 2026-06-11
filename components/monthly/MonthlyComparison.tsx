"use client";

import { useState } from "react";
import Link from "next/link";
import type { MonthComparison } from "@/lib/monthlyUtils";

// ============================================
// MONTH OVER MONTH COMPARISON
// 2x2 grid showing all 4 categories with this month vs last month
// ============================================

interface MonthlyComparisonProps {
  /** Comparison data from compareMonths() */
  comparison: MonthComparison;
  /** Whether there's data from the previous month */
  hasPreviousMonthData: boolean;
  /** Current month label for display */
  currentMonthLabel?: string;
  /** Previous month label for display */
  previousMonthLabel?: string;
  /** Enabled sections config */
  enabledSections: {
    symptoms: boolean;
    bowel: boolean;
    cycle: boolean;
    medicine: boolean;
  };
}

export function MonthlyComparison({
  comparison,
  hasPreviousMonthData,
  currentMonthLabel = "This Month",
  previousMonthLabel = "Last Month",
  enabledSections,
}: MonthlyComparisonProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // If no previous month data, show message but keep navigation
    // If no previous month data, show message
  if (!hasPreviousMonthData) {
    return (
      <div className="bg-app-white rounded-xl border border-app-border overflow-hidden">
        <div className="px-4 py-3 bg-app-cream/50">
          <h3 className="text-sm font-semibold text-app-charcoal flex items-center gap-2">
            <span>📈</span>
            Month over Month
          </h3>
          <p className="text-xs text-app-gray mt-0.5">
            No data for {previousMonthLabel} to compare with {currentMonthLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-app-white rounded-xl border border-app-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 border-b border-app-border bg-app-cream/50 flex items-center justify-between text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-app-charcoal flex items-center gap-2">
            <span>📈</span>
            Month over Month
          </h3>
          <p className="text-xs text-app-gray mt-0.5">
            Comparing {currentMonthLabel} to {previousMonthLabel}
          </p>
        </div>
        <span className="text-app-gray text-lg">{isCollapsed ? "+" : "−"}</span>
      </button>

      {/* Content - Dynamic Grid */}
      {!isCollapsed && (
        <div className="p-4">
          <div className={(() => {
            // Calculate number of visible cards to adjust grid layout
            const visibleCards = [
              enabledSections.symptoms,
              enabledSections.bowel,
              enabledSections.cycle,
              enabledSections.medicine,
            ].filter(Boolean).length;

            // Determine grid class based on number of visible cards
            if (visibleCards === 0) return "grid grid-cols-1";
            if (visibleCards === 1) return "grid grid-cols-1";
            if (visibleCards === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
            if (visibleCards === 3) return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4";
            return "grid grid-cols-1 sm:grid-cols-2 gap-4"; // 4 cards
          })()}>
            {/* Symptoms Card - only if symptom tracking enabled */}
            {enabledSections.symptoms && (
              <ComparisonCard
              icon="🏷️"
              title="Symptoms"
              accentColor="teal"
              thisMonthLabel={currentMonthLabel}
              lastMonthLabel={previousMonthLabel}
              thisMonth={
                <div className="space-y-1">
                  <StatRow label="Unique" value={comparison.symptoms.thisMonth.uniqueCount} />
                  <StatRow
                    label="Avg intensity"
                    value={comparison.symptoms.thisMonth.avgIntensity?.toFixed(1) ?? "—"}
                  />
                  <StatRow label="Occurrences" value={comparison.symptoms.thisMonth.totalOccurrences} />
                </div>
              }
              lastMonth={
                <div className="space-y-1">
                  <StatRow label="Unique" value={comparison.symptoms.lastMonth.uniqueCount} />
                  <StatRow
                    label="Avg intensity"
                    value={comparison.symptoms.lastMonth.avgIntensity?.toFixed(1) ?? "—"}
                  />
                  <StatRow label="Occurrences" value={comparison.symptoms.lastMonth.totalOccurrences} />
                </div>
              }
              change={
                <div className="space-y-1">
                  {/* Show intensity change if present */}
                  {comparison.symptoms.intensityChange !== null && comparison.symptoms.intensityChange !== 0 && (
                    <p className="text-xs">
                      <span className={comparison.symptoms.intensityChange < 0 ? "text-app-teal" : "text-app-red"}>
                        Intensity {comparison.symptoms.intensityChange < 0 ? "↓" : "↑"}{" "}
                        {Math.abs(comparison.symptoms.intensityChange).toFixed(1)}
                      </span>
                    </p>
                  )}
                  {/* Show new/resolved count if no intensity change but symptoms changed */}
                  {(comparison.symptoms.intensityChange === null || comparison.symptoms.intensityChange === 0) &&
                    (comparison.symptoms.newSymptoms.length > 0 || comparison.symptoms.resolvedSymptoms.length > 0) && (
                      <p className="text-xs">
                        {comparison.symptoms.newSymptoms.length > 0 && (
                          <span className="text-app-red">
                            +{comparison.symptoms.newSymptoms.length} new
                          </span>
                        )}
                        {comparison.symptoms.newSymptoms.length > 0 && comparison.symptoms.resolvedSymptoms.length > 0 && (
                          <span className="text-app-gray">, </span>
                        )}
                        {comparison.symptoms.resolvedSymptoms.length > 0 && (
                          <span className="text-app-teal">
                            {comparison.symptoms.resolvedSymptoms.length} resolved
                          </span>
                        )}
                      </p>
                    )}
                  {/* Show "no significant changes" only when nothing changed */}
                  {comparison.symptoms.newSymptoms.length === 0 &&
                    comparison.symptoms.resolvedSymptoms.length === 0 &&
                    (comparison.symptoms.intensityChange === null || comparison.symptoms.intensityChange === 0) && (
                      <p className="text-xs text-app-gray">No significant changes</p>
                    )}
                </div>
              }
              expandedContent={
                (comparison.symptoms.thisMonth.topByIntensity.length > 0 ||
                  comparison.symptoms.lastMonth.topByIntensity.length > 0 ||
                  comparison.symptoms.newSymptoms.length > 0 ||
                  comparison.symptoms.resolvedSymptoms.length > 0) ? (
                  <div className="space-y-3">
                    {/* Side-by-side intensity tables */}
                    {(comparison.symptoms.thisMonth.topByIntensity.length > 0 ||
                      comparison.symptoms.lastMonth.topByIntensity.length > 0) && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* This Month */}
                        <div>
                          <p className="text-xs text-app-teal font-medium mb-1">{currentMonthLabel}</p>
                          {comparison.symptoms.thisMonth.topByIntensity.length > 0 ? (
                            <div className="bg-app-cream rounded-md overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-app-border/50">
                                    <th className="py-1 px-1.5 text-left text-app-gray font-medium">Symptom</th>
                                    <th className="py-1 px-1.5 text-right text-app-gray font-medium">Avg</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {comparison.symptoms.thisMonth.topByIntensity.slice(0, 5).map((symptom) => (
                                    <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                                      <td className="py-1 px-1.5 text-app-charcoal truncate max-w-[70px]" title={symptom.name}>
                                        {symptom.name}
                                      </td>
                                      <td className="py-1 px-1.5 text-app-teal text-right font-medium">
                                        {symptom.avgIntensity}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-app-gray italic">No intensity data</p>
                          )}
                        </div>

                        {/* Last Month */}
                        <div>
                          <p className="text-xs text-app-gray font-medium mb-1">{previousMonthLabel}</p>
                          {comparison.symptoms.lastMonth.topByIntensity.length > 0 ? (
                            <div className="bg-app-cream rounded-md overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-app-border/50">
                                    <th className="py-1 px-1.5 text-left text-app-gray font-medium">Symptom</th>
                                    <th className="py-1 px-1.5 text-right text-app-gray font-medium">Avg</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {comparison.symptoms.lastMonth.topByIntensity.slice(0, 5).map((symptom) => (
                                    <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                                      <td className="py-1 px-1.5 text-app-charcoal truncate max-w-[70px]" title={symptom.name}>
                                        {symptom.name}
                                      </td>
                                      <td className="py-1 px-1.5 text-app-gray text-right font-medium">
                                        {symptom.avgIntensity}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-app-gray italic">No intensity data</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* New/Resolved symptoms */}
                    {(comparison.symptoms.newSymptoms.length > 0 || comparison.symptoms.resolvedSymptoms.length > 0) && (
                      <div className="pt-2 border-t border-app-border space-y-2">
                        {comparison.symptoms.newSymptoms.length > 0 && (
                          <div>
                            <p className="text-xs text-app-gray mb-1">New {currentMonthLabel}</p>
                            <div className="flex flex-wrap gap-1">
                              {comparison.symptoms.newSymptoms.slice(0, 5).map((s) => (
                                <span
                                  key={s.name}
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    s.isPeriodRelated
                                      ? "bg-app-red/10 text-app-red"
                                      : "bg-app-teal/10 text-app-teal"
                                  }`}
                                >
                                  {s.name}
                                </span>
                              ))}
                              {comparison.symptoms.newSymptoms.length > 5 && (
                                <span className="px-2 py-0.5 text-xs text-app-gray">
                                  +{comparison.symptoms.newSymptoms.length - 5}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {comparison.symptoms.resolvedSymptoms.length > 0 && (
                          <div>
                            <p className="text-xs text-app-gray mb-1">Resolved from {previousMonthLabel}</p>
                            <div className="flex flex-wrap gap-1">
                              {comparison.symptoms.resolvedSymptoms.slice(0, 5).map((s) => (
                                <span
                                  key={s.name}
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    s.isPeriodRelated
                                      ? "bg-app-red/10 text-app-red"
                                      : "bg-app-teal/10 text-app-teal"
                                  }`}
                                >
                                  {s.name}
                                </span>
                              ))}
                              {comparison.symptoms.resolvedSymptoms.length > 5 && (
                                <span className="px-2 py-0.5 text-xs text-app-gray">
                                  +{comparison.symptoms.resolvedSymptoms.length - 5}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : undefined
              }
              />
            )}

            {/* Bowel Card - only if bowel tracking enabled */}
            {enabledSections.bowel && (
              <ComparisonCard
              icon="🧻"
              title="Bowel"
              accentColor="plumb"
              thisMonthLabel={currentMonthLabel}
              lastMonthLabel={previousMonthLabel}
              thisMonth={
                <div className="space-y-1">
                  <StatRow label="Total BMs" value={comparison.bowel.thisMonth.totalBMs} />
                  <StatRow
                    label="Most common"
                    value={
                      comparison.bowel.thisMonth.mostCommonType
                        ? `Type ${comparison.bowel.thisMonth.mostCommonType}`
                        : "—"
                    }
                  />
                </div>
              }
              lastMonth={
                <div className="space-y-1">
                  <StatRow label="Total BMs" value={comparison.bowel.lastMonth.totalBMs} />
                  <StatRow
                    label="Most common"
                    value={
                      comparison.bowel.lastMonth.mostCommonType
                        ? `Type ${comparison.bowel.lastMonth.mostCommonType}`
                        : "—"
                    }
                  />
                </div>
              }
              change={
                <div className="space-y-1">
                  {/* Always show type comparison when both months have data */}
                  {(comparison.bowel.lastMonth.mostCommonType !== null || comparison.bowel.thisMonth.mostCommonType !== null) && (
                    <p className="text-xs">
                      <span className="text-app-gray">Type: </span>
                      <span className="text-app-plumb font-medium">
                        {comparison.bowel.lastMonth.mostCommonType ?? "—"}
                      </span>
                      <span className="text-app-gray"> → </span>
                      <span className="text-app-gray font-medium">
                        {comparison.bowel.thisMonth.mostCommonType ?? "—"}
                      </span>
                      {comparison.bowel.typeShift && (
                        <span className={`ml-1 ${
                          // Closer to 3.5 is better
                          Math.abs((comparison.bowel.thisMonth.mostCommonType ?? 0) - 3.5) < 
                          Math.abs((comparison.bowel.lastMonth.mostCommonType ?? 0) - 3.5)
                            ? "text-app-teal"
                            : "text-app-gray"
                        }`}>
                          {Math.abs((comparison.bowel.thisMonth.mostCommonType ?? 0) - 3.5) < 
                           Math.abs((comparison.bowel.lastMonth.mostCommonType ?? 0) - 3.5)}
                        </span>
                      )}
                    </p>
                  )}
                  {/* Feeling comparison */}
                  {(comparison.bowel.lastMonth.mostCommonFeeling || comparison.bowel.thisMonth.mostCommonFeeling) ? (
                    <p className="text-xs">
                      <span className="text-app-gray">Feeling: </span>
                      <span className="text-app-teal font-medium">
                        {formatFeeling(comparison.bowel.thisMonth.mostCommonFeeling)}
                      </span>
                      <span className="text-app-gray"> → </span>
                      <span className="text-app-gray font-medium">
                        {formatFeeling(comparison.bowel.lastMonth.mostCommonFeeling)}
                      </span>
                      {(() => {
                        const currScore = getFeelingScore(comparison.bowel.thisMonth.mostCommonFeeling);
                        const prevScore = getFeelingScore(comparison.bowel.lastMonth.mostCommonFeeling);
                        const diff = currScore - prevScore;
                        if (diff === 0) {
                          return null;
                        }
                      })()}
                    </p>
                  ) : (
                    comparison.bowel.lastMonth.mostCommonType === null && 
                    comparison.bowel.thisMonth.mostCommonType === null && (
                      <p className="text-xs text-app-gray">No data to compare</p>
                    )
                  )}
                </div>
              }

              expandedContent={
                (comparison.bowel.thisMonth.totalBMs > 0 || comparison.bowel.lastMonth.totalBMs > 0) ? (
                  <div className="space-y-3">
                    {/* Normal Range % - Side by Side */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-app-plumb/10 rounded-lg">
                        <p className="text-xs text-app-teal font-medium">{currentMonthLabel}</p>
                        <p className="text-sm font-medium text-app-plumb">
                          {comparison.bowel.thisMonth.normalRangePercent !== null
                            ? `${comparison.bowel.thisMonth.normalRangePercent}%`
                            : "—"}
                          <span className="text-app-gray text-xs ml-1">normal</span>
                        </p>
                      </div>
                      <div className="p-2 bg-app-gray/10 rounded-lg">
                        <p className="text-xs text-app-gray font-medium">{previousMonthLabel}</p>
                        <p className="text-sm font-medium text-app-gray">
                          {comparison.bowel.lastMonth.normalRangePercent !== null
                            ? `${comparison.bowel.lastMonth.normalRangePercent}%`
                            : "—"}
                          <span className="text-app-gray text-xs ml-1">normal</span>
                        </p>
                      </div>
                    </div>

                    {/* Time of Day - Morning/Evening only */}
                    {(Object.keys(comparison.bowel.thisMonth.timeDistribution).length > 0 ||
                      Object.keys(comparison.bowel.lastMonth.timeDistribution).length > 0) && (
                      <div>
                        <p className="text-xs text-app-gray mb-2">Time of Day</p>
                        <div className="grid grid-cols-2 gap-2">
                          {/* This Month Time */}
                          <div>
                            <p className="text-xs text-app-teal font-medium mb-1">{currentMonthLabel}</p>
                            <div className="flex gap-1">
                              {[
                                { label: "Morning", keys: ["Morning", "Afternoon"] },
                                { label: "Evening", keys: ["Evening", "Night"] },
                              ].map(({ label, keys }) => {
                                const count = keys.reduce(
                                  (sum, k) => sum + (comparison.bowel.thisMonth.timeDistribution[k] || 0),
                                  0
                                );
                                const totalCount = Object.values(comparison.bowel.thisMonth.timeDistribution).reduce(
                                  (sum, v) => sum + v,
                                  0
                                );
                                const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

                                return (
                                  <div key={label} className="flex-1 text-center">
                                    <div className="h-8 bg-app-border/30 rounded relative overflow-hidden mb-1">
                                      <div
                                        className="absolute bottom-0 left-0 right-0 bg-app-plumb/60 transition-all"
                                        style={{ height: `${percentage}%` }}
                                      />
                                      {count > 0 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-app-charcoal">
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-app-gray">{label}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Last Month Time */}
                          <div>
                            <p className="text-xs text-app-gray font-medium mb-1">{previousMonthLabel}</p>
                            <div className="flex gap-1">
                              {[
                                { label: "Morning", keys: ["Morning", "Afternoon"] },
                                { label: "Evening", keys: ["Evening", "Night"] },
                              ].map(({ label, keys }) => {
                                const count = keys.reduce(
                                  (sum, k) => sum + (comparison.bowel.lastMonth.timeDistribution[k] || 0),
                                  0
                                );
                                const totalCount = Object.values(comparison.bowel.lastMonth.timeDistribution).reduce(
                                  (sum, v) => sum + v,
                                  0
                                );
                                const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

                                return (
                                  <div key={label} className="flex-1 text-center">
                                    <div className="h-8 bg-app-border/30 rounded relative overflow-hidden mb-1">
                                      <div
                                        className="absolute bottom-0 left-0 right-0 bg-app-gray/40 transition-all"
                                        style={{ height: `${percentage}%` }}
                                      />
                                      {count > 0 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-app-charcoal">
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-app-gray">{label}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Trend explanation */}
                    {comparison.bowel.trendTowardNormal !== null && (
                      <p className="text-xs text-app-gray italic pt-2 border-t border-app-border">
                        {comparison.bowel.trendTowardNormal
                          ? `Your average Bristol type is trending closer to Type 3-4 (normal) as compared to ${previousMonthLabel}.`
                          : `Your average Bristol type is trending away from Type 3-4 (normal) as compared to ${previousMonthLabel}.`}
                      </p>
                    )}
                  </div>
                ) : undefined
              }
              />
            )}

            {/* Cycle Card - only if cycle tracking enabled */}
            {enabledSections.cycle && (
              <ComparisonCard
              icon="🌸"
              title="Cycle"
              accentColor="red"
              thisMonthLabel={currentMonthLabel}
              lastMonthLabel={previousMonthLabel}
              thisMonth={
                <div className="space-y-1">
                  {/* <StatRow label="Phase" value={formatPhase(comparison.cycle.thisMonth.dominantPhase)} /> */}
                  {/* <StatRow label="Period days" value={comparison.cycle.thisMonth.daysLogged} /> */}
                  <StatRow label="Flow days" value={comparison.cycle.thisMonth.flowDays} />
                  {(comparison.cycle.thisMonth.flowStartTime || comparison.cycle.lastMonth.flowStartTime) && (
                    <StatRow label="Flow start" value={comparison.cycle.thisMonth.flowStartTime ?? "—"} />
                  )}
                </div>
              }
              lastMonth={
                <div className="space-y-1">
                  {/* <StatRow label="Phase" value={formatPhase(comparison.cycle.lastMonth.dominantPhase)} /> */}
                  {/* <StatRow label="Period days" value={comparison.cycle.lastMonth.daysLogged} /> */}
                  <StatRow label="Flow days" value={comparison.cycle.lastMonth.flowDays} />
                  {(comparison.cycle.thisMonth.flowStartTime || comparison.cycle.lastMonth.flowStartTime) && (
                    <StatRow label="Flow start" value={comparison.cycle.lastMonth.flowStartTime ?? "—"} />
                  )}
                </div>
              }
                            change={
                <p className="text-xs text-app-gray">
                  Want more insights? Visit {" "}
                  <Link 
                    href="/dashboard/cycleinsights" 
                    className="text-app-red hover:text-app-red/80 underline underline-offset-2"
                  >
                    Cycle Insights
                  </Link>
                </p>
              }
              expandedContent={
                (comparison.cycle.thisMonth.hasData || comparison.cycle.lastMonth.hasData) ? (
                  <div className="space-y-3">
                    {/* Phase Distribution */}
                    {(Object.keys(comparison.cycle.thisMonth.phaseDistribution).length > 0 ||
                      Object.keys(comparison.cycle.lastMonth.phaseDistribution).length > 0) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-app-teal font-medium mb-1">{currentMonthLabel}</p>
                          {Object.keys(comparison.cycle.thisMonth.phaseDistribution).length > 0 ? (
                            <div className="space-y-1">
                              {(() => {
                                const phaseOrder = ["menstrual", "follicular", "ovulation", "luteal", "not_sure"];
                                return phaseOrder
                                  .filter(phase => comparison.cycle.thisMonth.phaseDistribution[phase] !== undefined)
                                  .map(phase => {
                                    const count = comparison.cycle.thisMonth.phaseDistribution[phase];
                                    const isMenstrual = phase === "menstrual";
                                    return (
                                      <div key={phase} className="flex justify-between text-xs">
                                        <span className="text-app-charcoal">{formatPhase(phase)}</span>
                                        <span className={`font-medium ${isMenstrual ? "text-app-red" : "text-app-teal"}`}>{count}d</span>
                                      </div>
                                    );
                                  });
                              })()}
                            </div>
                          ) : (
                            <p className="text-xs text-app-gray italic">No data</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-app-gray font-medium mb-1">{previousMonthLabel}</p>
                          {Object.keys(comparison.cycle.lastMonth.phaseDistribution).length > 0 ? (
                            <div className="space-y-1">
                              {(() => {
                                const phaseOrder = ["menstrual", "follicular", "ovulation", "luteal", "not_sure"];
                                return phaseOrder
                                  .filter(phase => comparison.cycle.lastMonth.phaseDistribution[phase] !== undefined)
                                  .map(phase => {
                                    const count = comparison.cycle.lastMonth.phaseDistribution[phase];
                                    const isMenstrual = phase === "menstrual";
                                    return (
                                      <div key={phase} className="flex justify-between text-xs">
                                        <span className="text-app-charcoal">{formatPhase(phase)}</span>
                                        <span className={`font-medium ${isMenstrual ? "text-app-red" : "text-app-gray"}`}>{count}d</span>
                                      </div>
                                    );
                                  });
                              })()}
                            </div>
                          ) : (
                            <p className="text-xs text-app-gray italic">No data</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Flow Distribution */}
                    {(Object.keys(comparison.cycle.thisMonth.flowDistribution).length > 0 ||
                      Object.keys(comparison.cycle.lastMonth.flowDistribution).length > 0) && (
                      <div className="pt-2 border-t border-app-border">
                        <p className="text-xs text-app-gray mb-2">Flow Levels</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-app-teal font-medium mb-1">{currentMonthLabel}</p>
                            {Object.keys(comparison.cycle.thisMonth.flowDistribution).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(comparison.cycle.thisMonth.flowDistribution).map(([flow, count]) => (
                                  <span key={flow} className="px-2 py-0.5 text-xs bg-app-red/10 text-app-red rounded capitalize">
                                    {flow}: {count}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-app-gray italic">No flow data</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-app-gray font-medium mb-1">{previousMonthLabel}</p>
                            {Object.keys(comparison.cycle.lastMonth.flowDistribution).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(comparison.cycle.lastMonth.flowDistribution).map(([flow, count]) => (
                                  <span key={flow} className="px-2 py-0.5 text-xs bg-app-gray/10 text-app-gray rounded capitalize">
                                    {flow}: {count}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-app-gray italic">No flow data</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : undefined
              }
              />
            )}

            {/* Medicine Card - only if medicine tracking enabled */}
            {enabledSections.medicine && (
              <ComparisonCard
              icon="💊"
              title="Medicine"
              accentColor="lightgreen"
              thisMonthLabel={currentMonthLabel}
              lastMonthLabel={previousMonthLabel}
              thisMonth={
                <div className="space-y-1">
                  {/* <StatRow label="Total doses" value={comparison.medicine.thisMonth.totalDoses} /> */}
                  <StatRow
                    label="Top medicine"
                    value={comparison.medicine.thisMonth.topMedicine ?? "—"}
                    small
                  />
                  <StatRow
                    label="Days taken"
                    value={comparison.medicine.thisMonth.daysWithMedicine}
                  />
                </div>
              }
              lastMonth={
                <div className="space-y-1">
                  {/* <StatRow label="Total doses" value={comparison.medicine.lastMonth.totalDoses} /> */}
                  <StatRow
                    label="Top medicine"
                    value={comparison.medicine.lastMonth.topMedicine ?? "—"}
                    small
                  />
                  <StatRow
                    label="Days taken"
                    value={comparison.medicine.lastMonth.daysWithMedicine}
                  />
                </div>
              }
              change={
                <div className="space-y-1">
                  {comparison.medicine.newMedicines.length > 0 && (
                    <p className="text-xs">
                      <span className="text-app-green/70">
                        New: {comparison.medicine.newMedicines.slice(0, 2).join(", ")}
                        {comparison.medicine.newMedicines.length > 2 && "..."}
                      </span>
                    </p>
                  )}
                  {comparison.medicine.stoppedMedicines.length > 0 && (
                    <p className="text-xs">
                      <span className="text-app-gray">
                        Stopped: {comparison.medicine.stoppedMedicines.slice(0, 2).join(", ")}
                        {comparison.medicine.stoppedMedicines.length > 2 && "..."}
                      </span>
                    </p>
                  )}
                  {comparison.medicine.newMedicines.length === 0 &&
                    comparison.medicine.stoppedMedicines.length === 0 && (
                      <p className="text-xs text-app-gray">
                        {comparison.medicine.thisMonth.totalDoses > 0 || comparison.medicine.lastMonth.totalDoses > 0
                          ? `No new/stopped medicine from ${previousMonthLabel}`
                          : `No data available for ${currentMonthLabel} or ${[previousMonthLabel]}`}
                      </p>
                    )}
                </div>
              }
              expandedContent={
                (comparison.medicine.thisMonth.totalDoses > 0 ||
                  comparison.medicine.lastMonth.totalDoses > 0 ||
                  comparison.medicine.newMedicines.length > 0 ||
                  comparison.medicine.stoppedMedicines.length > 0) ? (
                  <div className="space-y-3">
                    {/* Time of Day - Morning/Evening only */}
                    {(Object.keys(comparison.medicine.thisMonth.timeDistribution).length > 0 ||
                      Object.keys(comparison.medicine.lastMonth.timeDistribution).length > 0) && (
                      <div>
                        <p className="text-xs text-app-gray mb-2">Time of Day</p>
                        <div className="grid grid-cols-2 gap-2">
                          {/* This Month Time */}
                          <div>
                            <p className="text-xs text-app-teal font-medium mb-1">{currentMonthLabel}</p>
                            <div className="flex gap-1">
                              {[
                                { label: "Morning", keys: ["Morning", "Afternoon"] },
                                { label: "Evening", keys: ["Evening", "Night"] },
                              ].map(({ label, keys }) => {
                                const count = keys.reduce(
                                  (sum, k) => sum + (comparison.medicine.thisMonth.timeDistribution[k] || 0),
                                  0
                                );
                                const totalCount = Object.values(comparison.medicine.thisMonth.timeDistribution).reduce(
                                  (sum, v) => sum + v,
                                  0
                                );
                                const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

                                return (
                                  <div key={label} className="flex-1 text-center">
                                    <div className="h-8 bg-app-border/30 rounded relative overflow-hidden mb-1">
                                      <div
                                        className="absolute bottom-0 left-0 right-0 bg-app-green/30 transition-all"
                                        style={{ height: `${percentage}%` }}
                                      />
                                      {count > 0 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-app-charcoal">
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-app-gray">{label}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Last Month Time */}
                          <div>
                            <p className="text-xs text-app-gray font-medium mb-1">{previousMonthLabel}</p>
                            <div className="flex gap-1">
                              {[
                                { label: "Morning", keys: ["Morning", "Afternoon"] },
                                { label: "Evening", keys: ["Evening", "Night"] },
                              ].map(({ label, keys }) => {
                                const count = keys.reduce(
                                  (sum, k) => sum + (comparison.medicine.lastMonth.timeDistribution[k] || 0),
                                  0
                                );
                                const totalCount = Object.values(comparison.medicine.lastMonth.timeDistribution).reduce(
                                  (sum, v) => sum + v,
                                  0
                                );
                                const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

                                return (
                                  <div key={label} className="flex-1 text-center">
                                    <div className="h-8 bg-app-border/30 rounded relative overflow-hidden mb-1">
                                      <div
                                        className="absolute bottom-0 left-0 right-0 bg-app-gray/40 transition-all"
                                        style={{ height: `${percentage}%` }}
                                      />
                                      {count > 0 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-app-charcoal">
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-app-gray">{label}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* New/Stopped medicines */}
                    {(comparison.medicine.newMedicines.length > 0 || comparison.medicine.stoppedMedicines.length > 0) && (
                      <div className="pt-2 border-t border-app-border space-y-2">
                        {comparison.medicine.newMedicines.length > 0 && (
                          <div>
                            <p className="text-xs text-app-gray mb-1">New {currentMonthLabel}</p>
                            <div className="flex flex-wrap gap-1">
                              {comparison.medicine.newMedicines.map((m) => (
                                <span key={m} className="px-2 py-0.5 text-xs bg-app-green/20 text-app-charcoal rounded-full">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {comparison.medicine.stoppedMedicines.length > 0 && (
                          <div>
                            <p className="text-xs text-app-gray mb-1">Stopped {currentMonthLabel}</p>
                            <div className="flex flex-wrap gap-1">
                              {comparison.medicine.stoppedMedicines.map((m) => (
                                <span key={m} className="px-2 py-0.5 text-xs bg-app-gray/10 text-app-gray rounded-full">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : undefined
              }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPARISON CARD COMPONENT
// ============================================

interface ComparisonCardProps {
  icon: string;
  title: string;
  accentColor: "teal" | "plumb" | "red" | "lightgreen";
  thisMonth: React.ReactNode;
  lastMonth: React.ReactNode;
  change: React.ReactNode;
  expandedContent?: React.ReactNode;
  thisMonthLabel?: string;
  lastMonthLabel?: string;
}

function ComparisonCard({
  icon,
  title,
  accentColor,
  thisMonth,
  lastMonth,
  change,
  expandedContent,
  thisMonthLabel = "This Month",
  lastMonthLabel = "Last Month",
}: ComparisonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 768;

  // On mobile: single click only (no hover), on desktop: click or hover
  const showExpanded = isDesktop
    ? (isExpanded || isHovered) && expandedContent
    : isExpanded && expandedContent;

  const accentClasses: Record<string, string> = {
    teal: "border-l-app-teal",
    plumb: "border-l-app-plumb",
    red: "border-l-app-red",
    lightgreen: "border-l-app-green/40",
  };

  const borderClasses: Record<string, string> = {
    teal: "border-app-teal",
    plumb: "border-app-plumb",
    red: "border-app-red",
    lightgreen: "border-app-green/40",
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
        className={`w-full text-left bg-app-cream/30 rounded-lg border border-l-4 ${accentClasses[accentColor]} p-3 transition-all duration-200 ${
          showExpanded
            ? `${borderClasses[accentColor]} shadow-md`
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <h4 className="text-sm font-semibold text-app-charcoal">{title}</h4>
          </div>
          {expandedContent && (
            <svg
              className={`w-3.5 h-3.5 text-app-gray transition-transform flex-shrink-0 ${
                showExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
        
        {/* Two columns: This Month | Last Month */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs font-medium text-app-teal mb-1">{thisMonthLabel}</p>
            {thisMonth}
          </div>
          <div>
            <p className="text-xs font-medium text-app-gray mb-1">{lastMonthLabel}</p>
            {lastMonth}
          </div>
        </div>

        {/* Change Summary */}
        <div className="pt-2 border-t border-app-border">{change}</div>

        {/* Expanded Content - Mobile: conditional mount */}
        {expandedContent && (
          <div className="block md:hidden">
            {showExpanded && (
              <div className="mt-3 pt-3 border-t border-app-border">
                {expandedContent}
              </div>
            )}
          </div>
        )}

        {/* Expanded Content - Desktop: max-height transition */}
        {expandedContent && (
          <div
            className={`hidden md:block overflow-hidden transition-all duration-200 ${
              showExpanded ? "max-h-[400px] mt-3 pt-3 border-t border-app-border" : "max-h-0"
            }`}
          >
            {expandedContent}
          </div>
        )}
      </button>
    </div>
  );
}

// ============================================
// STAT ROW COMPONENT
// ============================================

interface StatRowProps {
  label: string;
  value: string | number;
  small?: boolean;
  capitalize?: boolean;
}

function StatRow({ label, value, small = false, capitalize = false }: StatRowProps) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-app-gray">{label}</span>
      <span
        className={`text-app-charcoal font-medium ${small ? "truncate max-w-[60px]" : ""} ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatFeeling(feeling: string | null): string {
  if (!feeling) return "—";
  const feelingMap: Record<string, string> = {
    complete_relief: "Complete Relief",
    partial_relief: "Partial Relief",
    incomplete: "Incomplete",
    discomfort: "Discomfort",
    pain: "Pain",
    urgency_remains: "Urgency Remains",
  };
  return feelingMap[feeling] || feeling.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Feeling quality score (higher = better)
function getFeelingScore(feeling: string | null): number {
  if (!feeling) return 0;
  const scores: Record<string, number> = {
    complete_relief: 6,
    partial_relief: 5,
    incomplete: 4,
    discomfort: 3,
    urgency_remains: 2,
    pain: 1,
  };
  return scores[feeling] || 0;
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
  return phaseMap[phase] || phase.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}