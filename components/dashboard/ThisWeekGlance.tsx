"use client";

import { useMemo, useState } from "react";
import { useEntries, useEntriesRevision } from "@/stores/useEntries";
import { useFreshData } from "@/hooks/useFreshData";
import { useSettings } from "@/stores/useSettings";
import {
  getEntriesForCurrentWeek,
  calculateWeekStats,
  formatWeekRange,
  getWeekDayBreakdown,
  DayBreakdown,
} from "@/lib/weekUtils";
import { POST_BOWEL_FEELINGS, CYCLE_PHASES, FLOW_LEVELS, MEDICINE_CATEGORIES } from "@/lib/constants";
import type { PostBowelFeeling, MedicineCategory } from "@/types";

// ============================================
// THIS WEEK AT A GLANCE
// Collapsible section with expandable stat cards
// ============================================

export function ThisWeekGlance() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const entries = useEntries((state) => state.entries);
  const revision = useEntriesRevision();
  const renderKey = useFreshData();
  const weekStartDay = useSettings((state) => state.weekStartDay);
  const stoolTrackingEnabled = useSettings((state) => state.stoolTracking.enabled);
  const periodTrackingEnabled = useSettings((state) => state.periodTracking.enabled);
  const medicineTrackingEnabled = useSettings((state) => state.medicineTracking.enabled);
  const customProducts = useSettings((state) => state.periodTracking.productTracking?.customProducts);
  const medicines = useSettings((state) => state.medicineTracking.medicines);
  
  // Get this week's entries and stats
  const weekEntries = useMemo(
    () => getEntriesForCurrentWeek(entries, weekStartDay),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, weekStartDay, revision, renderKey]
  );
  
  const stats = useMemo(
    () => calculateWeekStats(weekEntries),
    [weekEntries]
  );
  
  const weekBreakdown = useMemo(
    () => getWeekDayBreakdown(weekEntries, weekStartDay),
    [weekEntries, weekStartDay]
  );
  
  const weekRangeLabel = useMemo(
    () => formatWeekRange(weekStartDay),
    [weekStartDay]
  );

  // Find max entries in a single day (for chart scaling)
  const maxDailyEntries = Math.max(...weekBreakdown.map((d) => d.entryCount), 1);

  // ========== HELPER FUNCTIONS ==========

  const getFeelingLabel = (feeling: string | null): string => {
    if (!feeling) return "—";
    const found = POST_BOWEL_FEELINGS.find((f) => f.value === feeling);
    return found?.label || feeling;
  };

  const getPhaseLabel = (phase: string | null): string => {
    if (!phase) return "—";
    const found = CYCLE_PHASES.find((p) => p.value === phase);
    return found?.label || phase;
  };

  const getFlowLabel = (flow: string | null): string => {
    if (!flow) return "";
    const found = FLOW_LEVELS.find((f) => f.value === flow);
    return found?.label || flow;
  };

  const getProductDisplayName = (productKey: string): string => {
    const standardTypes = ["pad", "tampon", "cup", "disc", "liner", "period-underwear", "other"];
    
    if (standardTypes.includes(productKey.toLowerCase())) {
      return productKey.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    
    if (customProducts) {
      for (const products of Object.values(customProducts)) {
        const found = products.find((p) => p.id === productKey);
        if (found) return found.name;
      }
    }
    
    return productKey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getMedicineDisplayName = (medicineId: string, fallbackName: string): string => {
    const found = medicines.find((m) => m.id === medicineId);
    return found?.name || fallbackName;
  };

  const getCategoryLabel = (category: MedicineCategory): string => {
    const found = MEDICINE_CATEGORIES.find((c) => c.value === category);
    return found?.label || category;
  };

  // Build Bristol day/feeling data
  const bristolDayFeelings = useMemo(() => {
    const dayFeelings: { day: string; feeling: PostBowelFeeling }[] = [];
    
    for (const day of weekBreakdown) {
      for (const entry of day.entries) {
        if (entry.stoolFeeling) {
          dayFeelings.push({
            day: day.dayName,
            feeling: entry.stoolFeeling,
          });
        }
      }
    }
    
    const uniqueDays = new Map<string, PostBowelFeeling>();
    for (const df of dayFeelings) {
      uniqueDays.set(df.day, df.feeling);
    }
    
    return Array.from(uniqueDays.entries())
      .map(([day, feeling]) => ({ day, feeling }))
      .slice(0, 3); // Top 3 days
  }, [weekBreakdown]);

  // Count active tracking sections for grid layout
  const activeCardCount = [
    true, // Top Symptom always shows if there's data
    stoolTrackingEnabled,
    periodTrackingEnabled,
    medicineTrackingEnabled,
  ].filter(Boolean).length;

  const gridCols = activeCardCount >= 4 
    ? "grid-cols-2 lg:grid-cols-4" 
    : activeCardCount === 3 
      ? "grid-cols-1 sm:grid-cols-3"
      : activeCardCount === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1";
  
  return (
    <section className="card">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex justify-between items-center"
      >
        <div className="text-left">
          <h2 className="text-lg font-semibold text-app-charcoal">Week at a Glance</h2>
          <p className="text-sm text-app-gray">{weekRangeLabel}</p>
        </div>
        <span className="text-app-gray text-xl">
          {isCollapsed ? "+" : "−"}
        </span>
      </button>
      
      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="mt-4 space-y-4">
          {/* Stats Cards Grid */}
          <div className={`grid gap-3 ${gridCols}`}>
            
            {/* ========== TOP SYMPTOM - TEAL ========== */}
            <StatCard
              label="Top Symptom"
              value={stats.topSymptom?.name || "—"}
              subtext={stats.topSymptom 
                ? `${stats.topSymptom.count}× this week` 
                : "No symptoms logged"
              }
              accentColor="teal"
              valueSize={stats.topSymptom ? "small" : "normal"}
              expandedContent={
                stats.topSymptom ? (
                  <div className="space-y-3">
                    {/* Intensity */}
                    {stats.topSymptom.avgIntensity !== null && (
                      <p className="text-xs">
                        <span className="text-app-gray">Avg intensity: </span>
                        <span className="text-app-charcoal font-medium">{stats.topSymptom.avgIntensity}/10</span>
                      </p>
                    )}
                    {/* Days appeared */}
                    <p className="text-xs">
                      <span className="text-app-gray">Logged on: </span>
                      <span className="text-app-charcoal font-medium">{stats.topSymptom.days.slice(0, 3).join(", ")}</span>
                    </p>
                    {/* Co-occurrences mini table with intensity */}
                    {stats.topSymptomCoOccurrences.length > 0 && (
                      <div>
                        <p className="text-xs text-app-gray mb-1">Often with</p>
                        <div className="bg-app-cream rounded-md overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-app-border/50">
                                <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                                <th className="py-1.5 px-2 text-right text-app-gray font-medium">Avg</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.topSymptomCoOccurrences.map((s) => (
                                <tr key={s.name} className="border-b border-app-border/50 last:border-0">
                                  <td className="py-1.5 px-2 text-app-charcoal">{s.name}</td>
                                  <td className="py-1.5 px-2 text-app-charcoal text-right">
                                    {s.avgIntensity !== null ? s.avgIntensity : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-app-gray">Start logging symptoms to see patterns.</p>
                )
              }
            />
            
            {/* ========== COMMON BRISTOL - PLUMB ========== */}
            {stoolTrackingEnabled && (
              <StatCard
                label="Common Bristol"
                value={stats.mostCommonBristol ? `Type ${stats.mostCommonBristol}` : "—"}
                subtext={stats.mostCommonBristol 
                  ? `${stats.bristolDistribution[stats.mostCommonBristol]}× this week`
                  : "No bowel entries"
                }
                accentColor="plumb"
                expandedContent={
                  stats.mostCommonBristol ? (
                    <div className="space-y-3">
                      {/* Distribution mini table - top 3 */}
                      {Object.keys(stats.bristolDistribution).length > 0 && (
                        <div>
                          <p className="text-xs text-app-gray mb-1">Distribution</p>
                          <div className="bg-app-cream rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <tbody>
                                {Object.entries(stats.bristolDistribution)
                                  .sort(([, a], [, b]) => b - a)
                                  .slice(0, 3)
                                  .map(([type, count]) => (
                                    <tr key={type} className="border-b border-app-border/50 last:border-0">
                                      <td className="py-1.5 px-2 text-app-charcoal">Type {type}</td>
                                      <td className="py-1.5 px-2 text-app-gray text-right">{count}×</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {/* Day/Feeling mini table - top 3 */}
                      {bristolDayFeelings.length > 0 && (
                        <div>
                          <p className="text-xs text-app-gray mb-1">How you felt</p>
                          <div className="bg-app-cream rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <tbody>
                                {bristolDayFeelings.map(({ day, feeling }) => (
                                  <tr key={day} className="border-b border-app-border/50 last:border-0">
                                    <td className="py-1.5 px-2 text-app-charcoal font-medium">{day}</td>
                                    <td className="py-1.5 px-2 text-app-gray text-right">{getFeelingLabel(feeling)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-app-gray">Log bowel movements to track patterns.</p>
                  )
                }
              />
            )}
            
            {/* ========== CYCLE - RED ========== */}
            {periodTrackingEnabled && (
              <StatCard
                label="Cycle"
                value={stats.periodStats.hasData 
                  ? getPhaseLabel(stats.periodStats.latestPhase)
                  : "—"
                }
                subtext={stats.periodStats.hasData 
                  ? (stats.periodStats.latestFlow 
                      ? `${getFlowLabel(stats.periodStats.latestFlow)} flow`
                      : "Current phase")
                  : "No period data"
                }
                accentColor="red"
                valueSize="small"
                expandedContent={
                  stats.periodStats.hasData ? (
                    <div className="space-y-3">
                      {/* Flow mini table - top 3 */}
                      {stats.periodStats.flowDistribution.length > 0 && (
                        <div>
                          <p className="text-xs text-app-gray mb-1">Flow</p>
                          <div className="bg-app-cream rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <tbody>
                                {stats.periodStats.flowDistribution.map(({ flow, count }) => (
                                  <tr key={flow} className="border-b border-app-border/50 last:border-0">
                                    <td className="py-1.5 px-2 text-app-charcoal">{getFlowLabel(flow)}</td>
                                    <td className="py-1.5 px-2 text-app-gray text-right">{count}×</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* Products mini table - top 3 */}
                      {stats.periodStats.productUsage.length > 0 && (
                        <div>
                          <p className="text-xs text-app-gray mb-1">Products</p>
                          <div className="bg-app-cream rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <tbody>
                                {stats.periodStats.productUsage.map((p) => (
                                  <tr key={p.product} className="border-b border-app-border/50 last:border-0">
                                    <td className="py-1.5 px-2 text-app-charcoal">
                                      {getProductDisplayName(p.product)}
                                    </td>
                                    <td className="py-1.5 px-2 text-app-gray text-right">{p.count}×</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* Period symptoms mini table - top 3 by intensity */}
                      {stats.periodStats.periodSymptoms.length > 0 && (
                        <div>
                          <p className="text-xs text-app-gray mb-1">Period Symptoms</p>
                          <div className="bg-app-cream rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-app-border/50">
                                  <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                                  <th className="py-1.5 px-2 text-right text-app-gray font-medium">Avg</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.periodStats.periodSymptoms.map((s) => (
                                  <tr key={s.name} className="border-b border-app-border/50 last:border-0">
                                    <td className="py-1.5 px-2 text-app-charcoal">{s.name}</td>
                                    <td className="py-1.5 px-2 text-app-charcoal text-right">
                                      {s.avgIntensity !== null ? s.avgIntensity : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-app-gray">Log period data to see cycle insights.</p>
                  )
                }
              />
            )}
            
            {/* ========== MEDICINE - TAUPE ========== */}
            {medicineTrackingEnabled && (
              <StatCard
                label="Top Medicine"
                value={stats.medicineStats.mostUsedMedicine 
                  ? getMedicineDisplayName(
                      stats.medicineStats.mostUsedMedicine.id, 
                      stats.medicineStats.mostUsedMedicine.name
                    )
                  : "—"
                }
                subtext={stats.medicineStats.mostUsedMedicine 
                  ? `${stats.medicineStats.mostUsedMedicine.count}× this week`
                  : "No medicines logged"
                }
                accentColor="lightgreen"
                valueSize="small"
                expandedContent={
                  stats.medicineStats.hasData && stats.medicineStats.mostUsedMedicine ? (
                    <div className="space-y-3">
                      {/* Days used */}
                      {stats.medicineStats.mostUsedMedicine.daysUsed.length > 0 && (
                        <p className="text-xs">
                          <span className="text-app-gray">Taken on: </span>
                          <span className="text-app-charcoal font-medium">
                            {stats.medicineStats.mostUsedMedicine.daysUsed.slice(0, 3).join(", ")}
                          </span>
                        </p>
                      )}
                      
                      {/* Time of day mini table - top 3 */}
                      {stats.medicineStats.mostUsedMedicine.timeOfDay.length > 0 && (
                        <div>
                          <p className="text-xs text-app-gray mb-1">Time of day</p>
                          <div className="bg-app-cream rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <tbody>
                                {stats.medicineStats.mostUsedMedicine.timeOfDay.map(({ period, count }) => (
                                  <tr key={period} className="border-b border-app-border/50 last:border-0">
                                    <td className="py-1.5 px-2 text-app-charcoal">{period}</td>
                                    <td className="py-1.5 px-2 text-app-gray text-right">{count}×</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* Other medicines mini table - top 3 */}
                      {stats.medicineStats.otherMedicines.length > 0 && (
                        <div>
                          <p className="text-xs text-app-gray mb-1">Also taken</p>
                          <div className="bg-app-cream rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <tbody>
                                {stats.medicineStats.otherMedicines.map((m) => (
                                  <tr key={m.id} className="border-b border-app-border/50 last:border-0">
                                    <td className="py-1.5 px-2 text-app-charcoal">
                                      {getMedicineDisplayName(m.id, m.name)}
                                    </td>
                                    <td className="py-1.5 px-2 text-app-gray text-right">{m.count}×</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* Co-occurring symptoms mini table - top 3 */}
                      {stats.medicineStats.coOccurringSymptoms.length > 0 && (
                        <div>
                          <p className="text-xs text-app-gray mb-1">Often with symptoms</p>
                          <div className="bg-app-cream rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-app-border/50">
                                  <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                                  <th className="py-1.5 px-2 text-right text-app-gray font-medium">Avg</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.medicineStats.coOccurringSymptoms.map((s) => (
                                  <tr key={s.name} className="border-b border-app-border/50 last:border-0">
                                    <td className="py-1.5 px-2 text-app-charcoal">{s.name}</td>
                                    <td className="py-1.5 px-2 text-app-charcoal text-right">
                                      {s.avgIntensity !== null ? s.avgIntensity : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-app-gray">Log medicines to see patterns.</p>
                  )
                }
              />
            )}
          </div>
          
          {/* Daily Activity Chart */}
          {weekEntries.length > 0 && (
            <DailyActivityChart 
              weekBreakdown={weekBreakdown} 
              maxEntries={maxDailyEntries}
            />
          )}
          
          {/* Empty State */}
          {weekEntries.length === 0 && (
            <div className="bg-app-cream rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-app-white mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-app-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-app-charcoal font-medium">No entries this week</p>
              <p className="text-sm text-app-gray mt-1">
                Start tracking to see your weekly overview
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accentColor: "green" | "teal" | "plumb" | "charcoal" | "taupe" | "red" | "lightgreen";
  valueSize?: "normal" | "small";
  expandedContent?: React.ReactNode;
  children?: React.ReactNode;
}

function StatCard({
  label,
  value,
  subtext,
  accentColor,
  valueSize = "normal",
  expandedContent,
  children
}: StatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 768;

  const showContent = isDesktop
    ? isExpanded || isHovered
    : isExpanded;

  const accentClasses: Record<string, string> = {
    green: "bg-app-green",
    teal: "bg-app-teal",
    plumb: "bg-app-plumb",
    charcoal: "bg-app-charcoal",
    taupe: "bg-app-taupe",
    red: "bg-app-red",
    lightgreen: "bg-app-green/50",
  };

  const borderClasses: Record<string, string> = {
    green: "border-app-green",
    teal: "border-app-teal",
    plumb: "border-app-plumb",
    charcoal: "border-app-charcoal",
    taupe: "border-app-taupe",
    red: "border-app-red",
    lightgreen: "border-app-green/70",
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
        <div className={`h-1 ${accentClasses[accentColor]}`} />
        
        <div className="p-4">
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
          
          <p className={`font-bold text-app-charcoal mt-1 ${
            valueSize === "small" ? "text-lg truncate" : "text-2xl"
          }`}>
            {value}
          </p>
          
          {subtext && !children && (
            <p className="text-xs text-app-gray mt-1">{subtext}</p>
          )}
          {children}

          {/* Mobile: conditional mount */}
          {expandedContent && (
            <div className="block md:hidden">
              {showContent && (
                <div className="mt-3 pt-3 border-t border-app-border">
                  {expandedContent}
                </div>
              )}
            </div>
          )}

          {/* Desktop: preserve existing behavior */}
          {expandedContent && (
            <div
              className={`
                hidden md:block overflow-hidden
                transition-[max-height,margin,padding] duration-300 ease-in-out
                ${showContent
                  ? "max-h-[500px] mt-3 pt-3 border-t border-app-border"
                  : "max-h-0 mt-0 pt-0 border-t-0"}
              `}
            >
              {expandedContent}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// ============================================
// DAILY ACTIVITY CHART
// Hover/click to reveal counts
// ============================================

interface DailyActivityChartProps {
  weekBreakdown: DayBreakdown[];
  maxEntries: number;
}

function DailyActivityChart({ weekBreakdown, maxEntries }: DailyActivityChartProps) {
  const [activeDay, setActiveDay] = useState<string | null>(null);
  
  const hasActivity = weekBreakdown.some((d) => d.entryCount > 0);
  if (!hasActivity) return null;

  const visualMax = Math.min(maxEntries, 10);

  return (
    <div className="bg-app-white rounded-xl border border-app-border p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-app-charcoal">Daily Activity</p>
          <p className="text-xs text-app-gray">Tap a day to see entry count</p>
        </div>
        {activeDay !== null && (
          <div className="bg-app-green text-white text-xs font-medium px-2 py-1 rounded">
            {weekBreakdown.find((d) => d.dayName === activeDay)?.entryCount ?? 0} entries
          </div>
        )}
      </div>
      
      {/* Chart */}
      <div className="flex items-end justify-between gap-2 h-20">
        {weekBreakdown.map((day) => {
          const heightPercent = visualMax > 0 
            ? Math.min((day.entryCount / visualMax) * 100, 100)
            : 0;
          
          const hasEntries = day.entryCount > 0;
          const isActive = activeDay === day.dayName;
          
          return (
            <button
              key={day.dayName}
              type="button"
              onClick={() => setActiveDay(isActive ? null : day.dayName)}
              onMouseEnter={() => setActiveDay(day.dayName)}
              onMouseLeave={() => setActiveDay(null)}
              className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="w-full h-14 flex items-end">
                <div 
                  className={`w-full rounded-t-md transition-all duration-200 ${
                    hasEntries 
                      ? isActive 
                        ? "bg-app-green/70" 
                        : "bg-app-green group-hover:bg-app-green"
                      : isActive
                        ? "bg-app-gray/30"
                        : "bg-app-border group-hover:bg-app-gray/20"
                  }`}
                  style={{ 
                    height: hasEntries 
                      ? `${Math.max(heightPercent, 15)}%`
                      : "4px"
                  }}
                />
              </div>
              
              <span className={`text-xs font-medium transition-colors ${
                isActive 
                  ? "text-app-charcoal" 
                  : hasEntries 
                    ? "text-app-charcoal" 
                    : "text-app-gray"
              }`}>
                {day.dayName.charAt(0)}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-app-border flex items-center justify-center gap-4 text-xs text-app-gray">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-app-green" />
          <span>Has entries</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-app-border" />
          <span>No entries</span>
        </div>
      </div>
    </div>
  );
}