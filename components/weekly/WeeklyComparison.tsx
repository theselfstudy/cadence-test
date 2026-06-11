"use client";

import { useState } from "react";
import Link from "next/link";
import type { WeekComparison } from "@/lib/weeklyUtils";

// ============================================
// WEEK OVER WEEK COMPARISON
// 2x2 grid showing all 4 categories with this week vs last week
// ============================================

interface WeeklyComparisonProps {
  /** Comparison data from compareWeeks() */
  comparison: WeekComparison;
  /** Whether there's data from the previous week */
  hasPreviousWeekData: boolean;
  /** Label for current week (e.g., "Mar 10-16") */
  thisWeekLabel?: string;
  /** Label for previous week (e.g., "Mar 3-9") */
  lastWeekLabel?: string;
  /** Short label for current week start (e.g., "Mar 10") - used in cards */
  thisWeekStartLabel?: string;
  /** Short label for previous week start (e.g., "Mar 3") - used in cards */
  lastWeekStartLabel?: string;
  /** Which tracking categories are enabled */
  enabledSections?: {
    symptoms: boolean;
    bowel: boolean;
    cycle: boolean;
    medicine: boolean;
  };
}

export function WeeklyComparison({
  comparison,
  hasPreviousWeekData,
  thisWeekLabel = "This Week",
  lastWeekLabel = "Last Week",
  thisWeekStartLabel,
  lastWeekStartLabel,
  enabledSections = { symptoms: true, bowel: true, cycle: true, medicine: true },
}: WeeklyComparisonProps) {
  // Use short labels for cards, fall back to full labels if not provided
  const cardThisWeekLabel = thisWeekStartLabel || thisWeekLabel;
  const cardLastWeekLabel = lastWeekStartLabel || lastWeekLabel;

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate number of visible cards
  const visibleCardCount =
    (enabledSections.symptoms ? 1 : 0) +
    (enabledSections.bowel ? 1 : 0) +
    (enabledSections.cycle ? 1 : 0) +
    (enabledSections.medicine ? 1 : 0);

  // Determine grid column classes based on visible card count
  const getGridClasses = () => {
    if (visibleCardCount === 1) {
      return "grid grid-cols-1 gap-4";
    } else if (visibleCardCount === 2) {
      return "grid grid-cols-1 sm:grid-cols-2 gap-4";
    } else if (visibleCardCount === 3) {
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
    } else {
      return "grid grid-cols-1 sm:grid-cols-2 gap-4";
    }
  };

  // If no previous week data, show a different message
  if (!hasPreviousWeekData) {
    return (
      <div className="bg-app-white rounded-xl border border-app-border overflow-hidden">
        <div className="px-4 py-3 bg-app-cream/50">
          <h3 className="text-sm font-semibold text-app-charcoal flex items-center gap-2">
            <span>📈</span>
            Week over Week
          </h3>
          <p className="text-xs text-app-gray mt-0.5">
            Comparing week starting {thisWeekStartLabel} to week starting {lastWeekStartLabel}
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
        className="w-full px-4 py-3 border-b border-app-border bg-app-cream/50 flex items-center justify-between"
      >
        <div className="text-left">
          <h3 className="text-sm font-semibold text-app-charcoal flex items-center gap-2">
            <span>📈</span>
            Week over Week
          </h3>
          <p className="text-xs text-app-gray mt-0.5">
            Comparing week starting {thisWeekStartLabel} to week starting {lastWeekStartLabel}
          </p>
        </div>
        <span className="text-app-gray text-lg">{isCollapsed ? "+" : "−"}</span>
      </button>

      {/* Content - Dynamic Grid */}
      {!isCollapsed && (
        <div className="p-4">
          <div className={getGridClasses()}>
            {/* Symptoms Card - only if symptoms enabled */}
            {enabledSections.symptoms && (
              <ComparisonCard
              icon="🏷️"
              title="Symptoms"
              accentColor="teal"
              columnLabels={{ thisWeek: cardThisWeekLabel, lastWeek: cardLastWeekLabel }}
              thisWeek={
                <div className="space-y-1">
                  <StatRow label="Unique" value={comparison.symptoms.thisWeek.uniqueCount} />
                  <StatRow 
                    label="Avg intensity" 
                    value={comparison.symptoms.thisWeek.avgIntensity?.toFixed(1) ?? "—"} 
                  />
                  <StatRow label="Occurrences" value={comparison.symptoms.thisWeek.totalOccurrences} />
                </div>
              }
              lastWeek={
                <div className="space-y-1">
                  <StatRow label="Unique" value={comparison.symptoms.lastWeek.uniqueCount} />
                  <StatRow 
                    label="Avg intensity" 
                    value={comparison.symptoms.lastWeek.avgIntensity?.toFixed(1) ?? "—"} 
                  />
                  <StatRow label="Occurrences" value={comparison.symptoms.lastWeek.totalOccurrences} />
                </div>
              }
              change={
                <div className="space-y-1">
                  {comparison.symptoms.newSymptoms.length > 0 && (
                    <p className="text-xs">
                      <span className="text-app-red">
                        +{comparison.symptoms.newSymptoms.length} new
                      </span>
                    </p>
                  )}
                  {comparison.symptoms.resolvedSymptoms.length > 0 && (
                    <p className="text-xs">
                      <span className="text-app-teal">
                        {comparison.symptoms.resolvedSymptoms.length} resolved
                      </span>
                    </p>
                  )}
                  {comparison.symptoms.intensityChange !== null && comparison.symptoms.intensityChange !== 0 && (
                    <p className="text-xs">
                      <span className={comparison.symptoms.intensityChange < 0 ? "text-app-teal" : "text-app-red"}>
                        Intensity {comparison.symptoms.intensityChange < 0 ? "↓" : "↑"}{" "}
                        {Math.abs(comparison.symptoms.intensityChange).toFixed(1)}
                      </span>
                    </p>
                  )}
                  {comparison.symptoms.newSymptoms.length === 0 && 
                   comparison.symptoms.resolvedSymptoms.length === 0 && 
                   (comparison.symptoms.intensityChange === null || comparison.symptoms.intensityChange === 0) && (
                    <p className="text-xs text-app-gray">No significant changes</p>
                  )}
                </div>
              }
              expandedContent={
                (comparison.symptoms.thisWeek.topByIntensity.length > 0 || 
                 comparison.symptoms.lastWeek.topByIntensity.length > 0 ||
                 comparison.symptoms.newSymptoms.length > 0 ||
                 comparison.symptoms.resolvedSymptoms.length > 0) ? (
                  <div className="space-y-3">
                    {/* Side-by-side intensity tables */}
                    {(comparison.symptoms.thisWeek.topByIntensity.length > 0 || 
                      comparison.symptoms.lastWeek.topByIntensity.length > 0) && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* This Week */}
                        <div>
                          <p className="text-xs text-app-teal font-medium mb-1">{thisWeekLabel}</p>
                          {comparison.symptoms.thisWeek.topByIntensity.length > 0 ? (
                            <div className="bg-app-cream rounded-md overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-app-border/50">
                                    <th className="py-1 px-1.5 text-left text-app-gray font-medium">Symptom</th>
                                    <th className="py-1 px-1.5 text-right text-app-gray font-medium">Avg</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {comparison.symptoms.thisWeek.topByIntensity.slice(0, 5).map((symptom) => (
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

                        {/* Last Week */}
                        <div>
                          <p className="text-xs text-app-gray font-medium mb-1">{lastWeekLabel}</p>
                          {comparison.symptoms.lastWeek.topByIntensity.length > 0 ? (
                            <div className="bg-app-cream rounded-md overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-app-border/50">
                                    <th className="py-1 px-1.5 text-left text-app-gray font-medium">Symptom</th>
                                    <th className="py-1 px-1.5 text-right text-app-gray font-medium">Avg</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {comparison.symptoms.lastWeek.topByIntensity.slice(0, 5).map((symptom) => (
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
                          <p className="text-xs text-app-gray mb-1">New this week</p>
                          <div className="flex flex-wrap gap-1">
                            {comparison.symptoms.newSymptoms.slice(0, 5).map((s) => {
                              // Only show red if user is on their period AND symptom is period-related
                              const isOnPeriod = comparison.cycle.thisWeek.phase === "menstrual";
                              const showAsRed = isOnPeriod && s.isPeriodRelated;
                              
                              return (
                                <span 
                                  key={s.name} 
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    showAsRed 
                                      ? "bg-app-red/10 text-app-red" 
                                      : "bg-app-teal/10 text-app-teal"
                                  }`}
                                >
                                  {s.name}
                                </span>
                              );
                            })}
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
                          <p className="text-xs text-app-gray mb-1">Resolved</p>
                          <div className="flex flex-wrap gap-1">
                            {comparison.symptoms.resolvedSymptoms.slice(0, 5).map((s) => {
                              // For resolved, check last week's phase since that's when they had the symptom
                              const wasOnPeriod = comparison.cycle.lastWeek.phase === "menstrual";
                              const showAsRed = wasOnPeriod && s.isPeriodRelated;
                              
                              return (
                                <span 
                                  key={s.name} 
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    showAsRed 
                                      ? "bg-app-red/10 text-app-red" 
                                      : "bg-app-teal/10 text-app-teal"
                                  }`}
                                >
                                  {s.name}
                                </span>
                              );
                            })}
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

            {/* Bowel Card - only if bowel enabled */}
            {enabledSections.bowel && (
              <ComparisonCard
              icon="🧻"
              title="Bowel"
              accentColor="plumb"
              columnLabels={{ thisWeek: cardThisWeekLabel, lastWeek: cardLastWeekLabel }}
              thisWeek={
                <div className="space-y-1">
                  <StatRow label="Total BMs" value={comparison.bowel.thisWeek.totalBMs} />
                  <StatRow 
                    label="Most common" 
                    value={comparison.bowel.thisWeek.mostCommonType 
                      ? `Type ${comparison.bowel.thisWeek.mostCommonType}` 
                      : "—"
                    } 
                  />
                </div>
              }
              lastWeek={
                <div className="space-y-1">
                  <StatRow label="Total BMs" value={comparison.bowel.lastWeek.totalBMs} />
                  <StatRow 
                    label="Most common" 
                    value={comparison.bowel.lastWeek.mostCommonType 
                      ? `Type ${comparison.bowel.lastWeek.mostCommonType}` 
                      : "—"
                    } 
                  />
                </div>
              }
              change={
                <div className="space-y-1">
                  {/* Type comparison */}
                  {(comparison.bowel.lastWeek.mostCommonType !== null || comparison.bowel.thisWeek.mostCommonType !== null) && (
                    <p className="text-xs">
                      <span className="text-app-gray">Type: </span>
                      <span className="text-app-plumb font-medium">
                        {comparison.bowel.lastWeek.mostCommonType ?? "—"}
                      </span>
                      <span className="text-app-gray"> → </span>
                      <span className="text-app-gray font-medium">
                        {comparison.bowel.thisWeek.mostCommonType ?? "—"}
                      </span>
                    </p>
                  )}
                  {/* Feeling comparison */}
                  {(() => {
                    const lastWeekFeeling = getMostCommonFeeling(comparison.bowel.lastWeek.feelingDistribution);
                    const thisWeekFeeling = getMostCommonFeeling(comparison.bowel.thisWeek.feelingDistribution);
                    if (lastWeekFeeling || thisWeekFeeling) {
                      return (
                        <p className="text-xs">
                          <span className="text-app-gray">Feeling: </span>
                          <span className="text-app-plumb font-medium">
                            {formatFeeling(lastWeekFeeling ?? "—")}
                          </span>
                          <span className="text-app-gray"> → </span>
                          <span className="text-app-gray font-medium">
                            {formatFeeling(thisWeekFeeling ?? "—")}
                          </span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {comparison.bowel.lastWeek.mostCommonType === null && 
                   comparison.bowel.thisWeek.mostCommonType === null && (
                    <p className="text-xs text-app-gray">No data to compare</p>
                  )}
                </div>
              }
                            expandedContent={
                (comparison.bowel.thisWeek.totalBMs > 0 || comparison.bowel.lastWeek.totalBMs > 0) ? (
                  <div className="space-y-3">
                    {/* Normal Range % - Side by Side */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-app-plumb/10 rounded-lg">
                        <p className="text-xs text-app-teal font-medium">This Week</p>
                        <p className="text-sm font-medium text-app-plumb">
                          {comparison.bowel.thisWeek.normalRangeCount !== null && comparison.bowel.thisWeek.totalBMs > 0
                            ? `${Math.round((comparison.bowel.thisWeek.normalRangeCount / comparison.bowel.thisWeek.totalBMs) * 100)}%`
                            : "—"
                          }
                          <span className="text-app-gray text-xs ml-1">
                            normal
                          </span>
                        </p>
                      </div>
                      <div className="p-2 bg-app-gray/10 rounded-lg">
                        <p className="text-xs text-app-gray font-medium">Last Week</p>
                        <p className="text-sm font-medium text-app-gray">
                          {comparison.bowel.lastWeek.normalRangeCount !== null && comparison.bowel.lastWeek.totalBMs > 0
                            ? `${Math.round((comparison.bowel.lastWeek.normalRangeCount / comparison.bowel.lastWeek.totalBMs) * 100)}%`
                            : "—"
                          }
                          <span className="text-app-gray text-xs ml-1">
                            normal
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Post-BM Feelings - Side by Side */}
                    {(Object.keys(comparison.bowel.thisWeek.feelingDistribution).length > 0 ||
                      Object.keys(comparison.bowel.lastWeek.feelingDistribution).length > 0) && (
                      <div>
                        <p className="text-xs text-app-gray mb-2">Post-BM Feelings</p>
                        <div className="grid grid-cols-2 gap-2">
                          {/* This Week Feelings */}
                          <div>
                            <p className="text-xs text-app-teal font-medium mb-1">{lastWeekLabel}</p>
                            {Object.keys(comparison.bowel.thisWeek.feelingDistribution).length > 0 ? (
                              <div className="bg-app-cream rounded-md overflow-hidden">
                                <table className="w-full text-xs">
                                  <tbody>
                                    {Object.entries(comparison.bowel.thisWeek.feelingDistribution)
                                      .sort((a, b) => b[1] - a[1])
                                      .slice(0, 3)
                                      .map(([feeling, count]) => (
                                        <tr key={feeling} className="border-b border-app-border/50 last:border-0">
                                          <td className="py-1 px-1.5 text-app-charcoal capitalize truncate max-w-[70px]" title={feeling.replace(/_/g, " ")}>
                                            {formatFeeling(feeling)}
                                          </td>
                                          <td className="py-1 px-1.5 text-app-plumb text-right font-medium">
                                            {count}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-app-gray italic">No data</p>
                            )}
                          </div>

                          {/* Last Week Feelings */}
                          <div>
                            <p className="text-xs text-app-gray font-medium mb-1">Last Week</p>
                            {Object.keys(comparison.bowel.lastWeek.feelingDistribution).length > 0 ? (
                              <div className="bg-app-cream rounded-md overflow-hidden">
                                <table className="w-full text-xs">
                                  <tbody>
                                    {Object.entries(comparison.bowel.lastWeek.feelingDistribution)
                                      .sort((a, b) => b[1] - a[1])
                                      .slice(0, 3)
                                      .map(([feeling, count]) => (
                                        <tr key={feeling} className="border-b border-app-border/50 last:border-0">
                                          <td className="py-1 px-1.5 text-app-charcoal capitalize truncate max-w-[70px]" title={feeling.replace(/_/g, " ")}>
                                            {formatFeeling(feeling)}
                                          </td>
                                          <td className="py-1 px-1.5 text-app-gray text-right font-medium">
                                            {count}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-app-gray italic">No data</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Time of Day - Side by Side (Morning/Evening only) */}
                    {(Object.keys(comparison.bowel.thisWeek.timeDistribution).length > 0 ||
                      Object.keys(comparison.bowel.lastWeek.timeDistribution).length > 0) && (
                      <div>
                        <p className="text-xs text-app-gray mb-2">Time of Day</p>
                        <div className="grid grid-cols-2 gap-2">
                          {/* This Week Time */}
                          <div>
                            <p className="text-xs text-app-teal font-medium mb-1">{thisWeekLabel}</p>
                            <div className="flex gap-1">
                              {[
                                { label: "Morning", keys: ["Morning", "Afternoon"] },
                                { label: "Evening", keys: ["Evening", "Night"] },
                              ].map(({ label, keys }) => {
                                const count = keys.reduce(
                                  (sum, k) => sum + (comparison.bowel.thisWeek.timeDistribution[k] || 0),
                                  0
                                );
                                const totalCount = Object.values(comparison.bowel.thisWeek.timeDistribution).reduce(
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
                          
                          {/* Last Week Time */}
                          <div>
                            <p className="text-xs text-app-gray font-medium mb-1">{lastWeekLabel}</p>
                            <div className="flex gap-1">
                              {[
                                { label: "Morning", keys: ["Morning", "Afternoon"] },
                                { label: "Evening", keys: ["Evening", "Night"] },
                              ].map(({ label, keys }) => {
                                const count = keys.reduce(
                                  (sum, k) => sum + (comparison.bowel.lastWeek.timeDistribution[k] || 0),
                                  0
                                );
                                const totalCount = Object.values(comparison.bowel.lastWeek.timeDistribution).reduce(
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
                          ? "Your average Bristol type is trending closer to Type 3-4 (normal) as compared to last week."
                          : "Your average Bristol type is trending away from  Type 3-4 (normal) as compared to last week."}
                      </p>
                    )}
                  </div>
                ) : undefined
              }
            />
            )}

            {/* Cycle Card - only if cycle enabled */}
            {enabledSections.cycle && (
              <ComparisonCard
              icon="🌸"
              title="Cycle"
              accentColor="red"
              columnLabels={{ thisWeek: cardThisWeekLabel, lastWeek: cardLastWeekLabel }}
              thisWeek={
                <div className="space-y-1">
                  <StatRow label="Phase" value={formatPhase(comparison.cycle.thisWeek.phase)} />
                  <StatRow label="Flow" value={comparison.cycle.thisWeek.flow ?? "—"} capitalize />
                  <StatRow label="Days logged" value={comparison.cycle.thisWeek.daysLogged} />
                </div>
              }
              lastWeek={
                <div className="space-y-1">
                  <StatRow label="Phase" value={formatPhase(comparison.cycle.lastWeek.phase)} />
                  <StatRow label="Flow" value={comparison.cycle.lastWeek.flow ?? "—"} capitalize />
                  <StatRow label="Days logged" value={comparison.cycle.lastWeek.daysLogged} />
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
            />
            )}

            {/* Medicine Card - only if medicine enabled */}
            {enabledSections.medicine && (
              <ComparisonCard
              icon="💊"
              title="Medicine"
              accentColor="lightgreen"
              columnLabels={{ thisWeek: cardThisWeekLabel, lastWeek: cardLastWeekLabel }}
              thisWeek={
                <div className="space-y-1">
                  <StatRow label="Total doses" value={comparison.medicine.thisWeek.totalDoses} />
                  <StatRow 
                    label="Top medicine" 
                    value={comparison.medicine.thisWeek.topMedicine ?? "—"} 
                    small 
                  />
                  <StatRow 
                    label="Days taken" 
                    value={`${comparison.medicine.thisWeek.daysWithMedicine}/7`} 
                  />
                </div>
              }
              lastWeek={
                <div className="space-y-1">
                  <StatRow label="Total doses" value={comparison.medicine.lastWeek.totalDoses} />
                  <StatRow 
                    label="Top medicine" 
                    value={comparison.medicine.lastWeek.topMedicine ?? "—"} 
                    small 
                  />
                  <StatRow 
                    label="Days taken" 
                    value={`${comparison.medicine.lastWeek.daysWithMedicine}/7`} 
                  />
                </div>
              }
              change={
                <div className="space-y-1">
                  {comparison.medicine.newMedicines.length > 0 && (
                    <p className="text-xs">
                      <span className="text-app-taupe">
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
                      {comparison.medicine.thisWeek.totalDoses > 0 || comparison.medicine.lastWeek.totalDoses > 0
                        ? "No new/stopped medicine from last week"
                        : "No medicine data to compare"}
                    </p>
                  )}
                </div>
              }
              expandedContent={
                (comparison.medicine.thisWeek.totalDoses > 0 || 
                comparison.medicine.lastWeek.totalDoses > 0 ||
                comparison.medicine.newMedicines.length > 0 || 
                comparison.medicine.stoppedMedicines.length > 0) ? (
                  <div className="space-y-3">
                    {/* Time of Day Comparison (Morning/Evening only) */}
                    {(Object.keys(comparison.medicine.thisWeek.timeDistribution).length > 0 ||
                      Object.keys(comparison.medicine.lastWeek.timeDistribution).length > 0) && (
                      <div>
                        <p className="text-xs text-app-gray mb-2">Time of Day</p>
                        <div className="grid grid-cols-2 gap-2">
                          {/* This Week Time */}
                          <div>
                            <p className="text-xs text-app-teal font-medium mb-1">{thisWeekLabel}</p>
                            <div className="flex gap-1">
                              {[
                                { label: "Morning", keys: ["Morning", "Afternoon"] },
                                { label: "Evening", keys: ["Evening", "Night"] },
                              ].map(({ label, keys }) => {
                                const count = keys.reduce(
                                  (sum, k) => sum + (comparison.medicine.thisWeek.timeDistribution[k] || 0),
                                  0
                                );
                                const totalCount = Object.values(comparison.medicine.thisWeek.timeDistribution).reduce(
                                  (sum, v) => sum + v,
                                  0
                                );
                                const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                                
                                return (
                                  <div key={label} className="flex-1 text-center">
                                    <div className="h-8 bg-app-border/30 rounded relative overflow-hidden mb-1">
                                      <div
                                        className="absolute bottom-0 left-0 right-0 bg-app-taupe/60 transition-all"
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
                          
                          {/* Last Week Time */}
                          <div>
                            <p className="text-xs text-app-gray font-medium mb-1">{lastWeekLabel}</p>
                            <div className="flex gap-1">
                              {[
                                { label: "Morning", keys: ["Morning", "Afternoon"] },
                                { label: "Evening", keys: ["Evening", "Night"] },
                              ].map(({ label, keys }) => {
                                const count = keys.reduce(
                                  (sum, k) => sum + (comparison.medicine.lastWeek.timeDistribution[k] || 0),
                                  0
                                );
                                const totalCount = Object.values(comparison.medicine.lastWeek.timeDistribution).reduce(
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
                            <p className="text-xs text-app-gray mb-1">New this week</p>
                            <div className="flex flex-wrap gap-1">
                              {comparison.medicine.newMedicines.map((m) => (
                                <span key={m} className="px-2 py-0.5 text-xs bg-app-taupe/20 text-app-charcoal rounded-full">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {comparison.medicine.stoppedMedicines.length > 0 && (
                          <div>
                            <p className="text-xs text-app-gray mb-1">Stopped this week</p>
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
  thisWeek: React.ReactNode;
  lastWeek: React.ReactNode;
  change?: React.ReactNode;
  expandedContent?: React.ReactNode;
  columnLabels?: { thisWeek: string; lastWeek: string };
}

function ComparisonCard({
  icon,
  title,
  accentColor,
  thisWeek,
  lastWeek,
  change,
  expandedContent,
  columnLabels = { thisWeek: "This Week", lastWeek: "Last Week" },
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

        {/* Two columns: This Week | Last Week */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs font-medium text-app-teal mb-1">{columnLabels.thisWeek}</p>
            {thisWeek}
          </div>
          <div>
            <p className="text-xs font-medium text-app-gray mb-1">{columnLabels.lastWeek}</p>
            {lastWeek}
          </div>
        </div>

        {/* Change Summary */}
        {change && (
          <div className="pt-2 border-t border-app-border">
            {change}
          </div>
        )}

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

function formatPhase(phase: string | null): string {
  if (!phase) return "—";
  return phase.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getMostCommonFeeling(distribution: Record<string, number>): string | null {
  let maxCount = 0;
  let mostCommon: string | null = null;
  for (const [feeling, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = feeling;
    }
  }
  return mostCommon;
}

function formatFeeling(feeling: string): string {
  const feelingMap: Record<string, string> = {
    complete_relief: "Complete",
    partial_relief: "Partial",
    incomplete: "Incomplete",
    discomfort: "Discomfort",
    pain: "Pain",
    urgency_remains: "Urgency",
  };
  return feelingMap[feeling] || feeling.replace(/_/g, " ");
}