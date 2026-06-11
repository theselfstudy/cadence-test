"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoredEntry } from "@/types";
import type { DetectedCycle, CycleComparison } from "@/lib/monthlyUtils";
import { formatPhase } from "@/lib/insightUtils";
import { getLocalDateString } from "@/lib/dateUtils";
import { useSettings } from "@/stores/useSettings";

// ============================================
// TYPES
// ============================================

interface DetailedViewsSectionProps {
  cycles: DetectedCycle[];
  entries: StoredEntry[];
  cycleComparison: CycleComparison | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DetailedViewsSection({
  cycles,
  entries,
  cycleComparison,
}: DetailedViewsSectionProps) {
  
  // Get settings for custom products
  const periodTracking = useSettings((state) => state.periodTracking);
  
  const customProducts = useMemo(() => {
    return periodTracking?.productTracking?.customProducts || {};
  }, [periodTracking]);

  // Get entries for a specific cycle
  const getEntriesForCycle = (cycle: DetectedCycle): StoredEntry[] => {
    const endDate = cycle.endDate || getLocalDateString();
    return entries.filter((e) => e.date >= cycle.startDate && e.date <= endDate);
  };

  // No data state
  if (entries.length === 0) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">📊</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          No data yet
        </p>
        <p className="text-xs text-app-gray">
          Start logging entries to see detailed cycle breakdowns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Intro text */}
      <p className="text-sm text-app-gray">
        Comprehensive breakdown of your cycle history.
      </p>

      {/* Cycle History Content */}
      <CycleHistoryTab 
        cycles={cycles} 
        entries={entries}
        cycleComparison={cycleComparison}
        customProducts={customProducts}
        getEntriesForCycle={getEntriesForCycle}
      />
    </div>
  );
}

// ============================================
// CYCLE HISTORY TAB
// ============================================

interface CycleHistoryTabProps {
  cycles: DetectedCycle[];
  entries: StoredEntry[];
  cycleComparison: CycleComparison | null;
  customProducts: Record<string, { id: string; name: string }[]>;
  getEntriesForCycle: (cycle: DetectedCycle) => StoredEntry[];
}

function CycleHistoryTab({ 
  cycles, 
  entries, 
  cycleComparison,
  customProducts,
  getEntriesForCycle,
}: CycleHistoryTabProps) {
  const [expandedCycleIndex, setExpandedCycleIndex] = useState<number | null>(null);

  const completeCycles = useMemo(() => {
    return cycles.filter((c) => !c.isOngoing && c.length !== null);
  }, [cycles]);

  const ongoingCycle = useMemo(() => {
    return cycles.find((c) => c.isOngoing) || null;
  }, [cycles]);

  // Calculate stats
  const stats = useMemo(() => {
    if (completeCycles.length === 0) return null;

    const lengths = completeCycles.map((c) => c.length!);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const min = Math.min(...lengths);
    const max = Math.max(...lengths);

    return {
      avgLength: Math.round(avg),
      minLength: min,
      maxLength: max,
      totalCycles: completeCycles.length,
    };
  }, [completeCycles]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Get month label
  const getMonthLabel = (dateStr: string): string => {
    const [year, month] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Get the first flow start time from raw entries for a cycle
  const getFlowStartTime = (cycle: DetectedCycle): string | null => {
    const cycleEntries = getEntriesForCycle(cycle);
    for (const entry of cycleEntries) {
      if (entry.periodFlow) {
        const parsed = parseFlowValue(entry.periodFlow);
        if (parsed.startTime) return parsed.startTime;
      }
    }
    return null;
  };

  if (cycles.length === 0) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">📅</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          No cycles detected yet
        </p>
        <p className="text-xs text-app-gray">
          To begin to see detailed data, enter period or flow data to start tracking your cycles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-app-teal/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-app-teal">{stats.totalCycles}</p>
            <p className="text-xs text-app-gray">Complete Cycles</p>
          </div>
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-app-charcoal">{stats.avgLength}</p>
            <p className="text-xs text-app-gray">Avg Length (days)</p>
          </div>
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-app-charcoal">{stats.minLength}</p>
            <p className="text-xs text-app-gray">Shortest</p>
          </div>
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-app-charcoal">{stats.maxLength}</p>
            <p className="text-xs text-app-gray">Longest</p>
          </div>
        </div>
      )}

      {/* Cycle Comparison (if available) */}
      {cycleComparison && cycleComparison.previousCycle && (
        <div className="bg-app-cream/50 rounded-lg p-4">
          {/* <h4 className="text-sm font-medium text-app-charcoal mb-2">Current vs Previous Cycle</h4> */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-sm font-medium text-app-charcoal mb-2">Current Cycle</h4>
              <p className="text-xs font-medium text-app-red">
                {cycleComparison.currentCycle?.isOngoing
                  ? "In progress"
                  : `${cycleComparison.currentCycle?.length} days`}
              </p>
              {cycleComparison.currentCycle && (
                <p className="text-xs text-app-gray">
                  <span className="text-app-gray/70">Started:</span>{" "}
                  {formatDate(cycleComparison.currentCycle.startDate)}
                  {(() => {
                    const startTime = getFlowStartTime(cycleComparison.currentCycle!);
                    return startTime ? ` @ ${startTime}` : null;
                  })()}
                </p>
              )}
              <p className="text-xs text-app-gray">
                <span className="text-app-gray/70">Flow Days Logged:</span>{" "}{cycleComparison.previousCycle.flowDays.length}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-app-charcoal mb-2">Previous Cycle</h4>
              <p className="text-xs font-medium text-app-charcoal/70">
                <span className="text-app-gray/70">Cycle Length:</span>{" "} {cycleComparison.previousCycle.length} days
              </p>
              <p className="text-xs text-app-gray flex flex-wrap gap-x-4">
                <span>
                  <span className="text-app-gray/70">Started:</span>{" "}
                  {formatDate(cycleComparison.previousCycle.startDate)}
                  {(() => {
                    const startTime = getFlowStartTime(cycleComparison.previousCycle!);
                    return startTime ? ` @ ${startTime}` : null;
                  })()}
                </span>
                {cycleComparison.previousCycle.endDate && (
                  <span>
                    <span className="text-app-gray/70">Ended:</span>{" "}
                    {formatDate(cycleComparison.previousCycle.endDate)}
                  </span>
                )}
              </p>
              <p className="text-xs text-app-gray">
                <span className="text-app-gray/70">Flow Days Logged:</span>{" "}{cycleComparison.previousCycle.flowDays.length}
              </p>
            </div>
          </div>
          {cycleComparison.lengthChange !== null && !cycleComparison.currentCycle?.isOngoing && (
            <p className="text-xs text-app-gray mt-2">
              {cycleComparison.lengthChange > 0 
                ? `${cycleComparison.lengthChange} days longer than previous`
                : cycleComparison.lengthChange < 0
                  ? `${Math.abs(cycleComparison.lengthChange)} days shorter than previous`
                  : "Same length as previous"}
            </p>
          )}
        </div>
      )}

      {/* Cycle List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-app-charcoal">All Cycles</h4>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {/* Ongoing cycle */}
          {ongoingCycle && (
            <CycleCard
              cycle={ongoingCycle}
              cycleNumber={cycles.length}
              entries={getEntriesForCycle(ongoingCycle)}
              isExpanded={expandedCycleIndex === cycles.length}
              onToggle={() => setExpandedCycleIndex(
                expandedCycleIndex === cycles.length ? null : cycles.length
              )}
              formatDate={formatDate}
              getMonthLabel={getMonthLabel}
              customProducts={customProducts}
            />
          )}

          {/* Complete cycles (most recent first) */}
          {[...completeCycles].reverse().map((cycle, reverseIndex) => {
            const cycleNumber = completeCycles.length - reverseIndex;
            return (
              <CycleCard
                key={cycle.startDate}
                cycle={cycle}
                cycleNumber={cycleNumber}
                entries={getEntriesForCycle(cycle)}
                isExpanded={expandedCycleIndex === cycleNumber}
                onToggle={() => setExpandedCycleIndex(
                  expandedCycleIndex === cycleNumber ? null : cycleNumber
                )}
                formatDate={formatDate}
                getMonthLabel={getMonthLabel}
                customProducts={customProducts}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// CYCLE CARD
// ============================================

interface CycleCardProps {
  cycle: DetectedCycle;
  cycleNumber: number;
  entries: StoredEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  formatDate: (dateStr: string) => string;
  getMonthLabel: (dateStr: string) => string;
  customProducts: Record<string, { id: string; name: string }[]>;
}

function CycleCard({ 
  cycle, 
  cycleNumber, 
  entries, 
  isExpanded, 
  onToggle,
  formatDate,
  getMonthLabel,
  customProducts,
}: CycleCardProps) {
  const router = useRouter();

  // Navigate to history with this cycle's date range pre-selected
  const handleExploreInHistory = () => {
    const endDate = cycle.endDate || getLocalDateString();
    const params = new URLSearchParams({
      startDate: cycle.startDate,
      endDate: endDate,
    });
    router.push(`/dashboard/history?${params.toString()}`);
  };
  // Collect symptoms for this cycle (deduplicated by date)
  const symptoms = useMemo(() => {
    const symptomsByDate: Record<string, Record<string, { intensity: number | null }>> = {};
    
    for (const entry of entries) {
      if (!symptomsByDate[entry.date]) {
        symptomsByDate[entry.date] = {};
      }
      
      for (const [symptom, intensity] of Object.entries(entry.symptomIntensities || {})) {
        const existing = symptomsByDate[entry.date][symptom];
        if (!existing || (intensity !== null && (existing.intensity === null || intensity > existing.intensity))) {
          symptomsByDate[entry.date][symptom] = { intensity };
        }
      }
      for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities || {})) {
        const existing = symptomsByDate[entry.date][symptom];
        if (!existing || (intensity !== null && (existing.intensity === null || intensity > existing.intensity))) {
          symptomsByDate[entry.date][symptom] = { intensity };
        }
      }
    }

    // Aggregate across dates
    const symptomCounts: Record<string, { count: number }> = {};
    for (const dateSymptoms of Object.values(symptomsByDate)) {
      for (const symptom of Object.keys(dateSymptoms)) {
        if (!symptomCounts[symptom]) {
          symptomCounts[symptom] = { count: 0 };
        }
        symptomCounts[symptom].count++;
      }
    }

    return Object.entries(symptomCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [entries]);

  // Collect ALL flow entries by date from raw entries (not deduplicated)
  // Parse out flow levels and extract flow start time
  const { flowByDate, firstFlowStartTime } = useMemo(() => {
    const flowMap = new Map<string, string[]>();
    let startTime: string | null = null;

    for (const entry of entries) {
      if (entry.periodFlow) {
        const parsed = parseFlowValue(entry.periodFlow);
        if (!flowMap.has(entry.date)) {
          flowMap.set(entry.date, []);
        }
        flowMap.get(entry.date)!.push(parsed.level);
        if (!startTime && parsed.startTime) {
          startTime = parsed.startTime;
        }
      }
    }

    // Sort each day's flows by intensity (heavy first)
    const flowOrder: Record<string, number> = { heavy: 0, medium: 1, light: 2, spotting: 3 };
    flowMap.forEach((flows) => {
      flows.sort((a, b) => (flowOrder[a] ?? 4) - (flowOrder[b] ?? 4));
    });

    // Convert to sorted array of [date, flows[]]
    const sorted = Array.from(flowMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));

    return { flowByDate: sorted, firstFlowStartTime: startTime };
  }, [entries]);

  // Collect product usage for this cycle (deduplicated)
  const productUsage = useMemo(() => {
    const productCounts: Record<string, { count: number; product: { productType: string; customProductId?: string; size?: string } }> = {};
    
    for (const entry of entries) {
      for (const product of entry.productUsage || []) {
        const key = `${product.productType}-${product.customProductId || ''}-${product.size || ''}`;
        if (!productCounts[key]) {
          productCounts[key] = { count: 0, product };
        }
        productCounts[key].count++;
      }
    }

    return Object.values(productCounts)
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Collect medicines for this cycle
  const medicines = useMemo(() => {
    const medicineCounts: Record<string, number> = {};
    
    for (const entry of entries) {
      for (const med of entry.medicineLog || []) {
        medicineCounts[med.medicineName] = (medicineCounts[med.medicineName] || 0) + 1;
      }
    }

    return Object.entries(medicineCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [entries]);

  // Format day for mini calendar (e.g., "20" or "Oct 20" if month changes)
  const formatDayForCalendar = (dateStr: string, index: number, allDates: [string, string[]][]): string => {
    const [, month, day] = dateStr.split("-").map(Number);
    const date = new Date(2024, month - 1, day); // Year doesn't matter for formatting
    const dayNum = date.getDate();
    
    // Check if this is first day or month changed from previous
    if (index === 0) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    
    const prevDate = allDates[index - 1][0];
    const [, prevMonth] = prevDate.split("-").map(Number);
    
    if (month !== prevMonth) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    
    return String(dayNum);
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      cycle.isOngoing ? "border-app-teal bg-app-teal/5" : "border-app-border bg-white"
    }`}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            cycle.isOngoing 
              ? "bg-app-red text-white" 
              : "bg-app-teal text-app-white"
          }`}>
            {cycleNumber}
          </div>
          <div>
            <p className="text-sm font-medium text-app-charcoal">
              {getMonthLabel(cycle.startDate)}
              {cycle.isOngoing && (
                <span className="ml-2 text-xs font-normal text-app-teal">(current)</span>
              )}
            </p>
            <p className="text-xs text-app-gray">
              {cycle.length !== null ? `${cycle.length} days` : "In progress"} 
              {" · "}
              {flowByDate.length} flow day{flowByDate.length !== 1 ? "s" : ""}
              {" · "}
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-app-gray transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-app-border/50 pt-3 space-y-3">
          {/* Date range */}
          <div className="text-sm flex flex-wrap gap-x-4">
            <span>
              <span className="text-app-gray">Started:</span>{" "}
              <span className="text-app-charcoal">
                {formatDate(cycle.startDate)}
                {firstFlowStartTime && ` @ ${firstFlowStartTime}`}
              </span>
            </span>
            {cycle.endDate && (
              <span>
                <span className="text-app-gray">Ended:</span>{" "}
                <span className="text-app-charcoal">{formatDate(cycle.endDate)}</span>
              </span>
            )}
          </div>

          {/* Mini Flow Calendar */}
          {flowByDate.length > 0 && (
            <div>
              <p className="text-xs font-medium text-app-gray mb-2">Flow by Day</p>
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="inline-flex gap-1 min-w-min">
                  {flowByDate.map(([date, flows], index) => (
                    <div 
                      key={date}
                      className="flex flex-col items-center min-w-[52px]"
                    >
                      {/* Date header */}
                      <div className="text-xs text-app-charcoal font-medium mb-1 whitespace-nowrap">
                        {formatDayForCalendar(date, index, flowByDate)}
                      </div>
                      
                      {/* Flow pills stacked */}
                      <div className="flex flex-col gap-0.5 w-full">
                        {flows.map((flow, flowIndex) => (
                          <div
                            key={flowIndex}
                            className={`px-1.5 py-0.5 text-[10px] rounded text-center font-medium ${
                              flow === "heavy" 
                                ? "bg-app-red text-white" 
                                : flow === "medium" 
                                  ? "bg-app-red/60 text-white" 
                                  : flow === "light" 
                                    ? "bg-app-red/30 text-app-red" 
                                    : "bg-app-red/10 text-app-red"
                            }`}
                          >
                            {flow}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Product Usage */}
          {productUsage.length > 0 && (
            <div>
              <p className="text-xs font-medium text-app-gray mb-1">Products Used</p>
              <div className="flex flex-wrap gap-1">
                {productUsage.map(({ product, count }, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 text-xs rounded bg-app-red/10 text-app-red"
                  >
                    {formatProductName(product, customProducts)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Phases logged */}
          {Object.keys(cycle.phasesLogged).length > 0 && (
            <div>
              <p className="text-xs font-medium text-app-gray mb-1">Phases Logged</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(cycle.phasesLogged).map(([phase, count]) => (
                  <span 
                    key={phase}
                    className={`px-2 py-0.5 text-xs rounded ${
                      phase === "menstrual" ? "bg-app-red/10 text-app-red" : "bg-app-teal/10 text-app-teal"
                    }`}
                  >
                    {formatPhase(phase)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top symptoms */}
          {symptoms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-app-gray mb-1">Top Symptoms</p>
              <div className="flex flex-wrap gap-1">
                {symptoms.map((s) => (
                  <span 
                    key={s.name}
                    className="px-2 py-0.5 text-xs rounded bg-app-teal/10 text-app-teal"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top medicines */}
          {medicines.length > 0 && (
            <div>
              <p className="text-xs font-medium text-app-gray mb-1">Medicines Taken</p>
              <div className="flex flex-wrap gap-1">
                {medicines.map((m) => (
                  <span 
                    key={m.name}
                    className="px-2 py-0.5 text-xs rounded bg-app-green/10 text-app-green"
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Explore in History button */}
          <div className="pt-3 border-t border-app-border/50">
            <button
              onClick={handleExploreInHistory}
              className="w-full py-2 px-4 rounded-lg bg-app-teal/10 text-app-teal text-sm font-medium hover:bg-app-teal/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Explore in History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Parse "heavy @ 4:44 PM" into { level: "heavy", startTime: "4:44 PM" } */
function parseFlowValue(flow: string | null): { level: string; startTime: string | null } {
  if (!flow) return { level: '', startTime: null };
  const match = flow.match(/^(.+?)\s*@\s*(.+)$/);
  if (match) return { level: match[1].trim(), startTime: match[2].trim() };
  return { level: flow, startTime: null };
}

/**
 * Format product name with custom product lookup
 */
function formatProductName(
  product: { productType: string; customProductId?: string; size?: string },
  customProducts: Record<string, { id: string; name: string }[]>
): string {
  const typeLabels: Record<string, string> = {
    pad: "Pad",
    tampon: "Tampon",
    cup: "Cup",
    disc: "Disc",
    liner: "Liner",
    "period-underwear": "Period Underwear",
    other: "Other",
  };

  let customProduct: { id: string; name: string } | undefined;

  // Look up custom product by ID
  if (product.customProductId) {
    // First try the specific product type category
    if (customProducts[product.productType]) {
      customProduct = customProducts[product.productType].find(
        (cp) => cp.id === product.customProductId
      );
    }

    // If not found, search ALL categories
    if (!customProduct) {
      for (const products of Object.values(customProducts)) {
        const found = products.find((cp) => cp.id === product.customProductId);
        if (found) {
          customProduct = found;
          break;
        }
      }
    }
  }

  // Filter out invalid size values
  const validSize =
    product.size && !["yes", "true", "false", "no"].includes(product.size.toLowerCase())
      ? product.size
      : null;

  // If we found a custom product, use its name with type label
  if (customProduct) {
    const typeLabel =
      typeLabels[product.productType] ||
      product.productType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${customProduct.name} (${typeLabel})`;
  }

  // Fallback to formatted product type
  const formattedType =
    typeLabels[product.productType] ||
    product.productType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return validSize ? `${formattedType} (${validSize})` : formattedType;
}