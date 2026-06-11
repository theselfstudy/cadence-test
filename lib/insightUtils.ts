// /lib/insightUtils.ts
// ============================================
// Cycle Insights Calculation Utilities
// Phase 2: This Cycle + Consistent Patterns
// ============================================

import type { StoredEntry, CyclePhase } from "@/types";
import type { DetectedCycle } from "./monthlyUtils";

// ============================================
// TYPES
// ============================================

export interface ThisCycleData {
  cycleDay: number;
  phase: CyclePhase | null;
  phaseIsKnown: boolean;
  periodTypicallyStarts: { dayRange: [number, number]; confidence: number } | null;
  symptomsLoggedThisCycle: { name: string; isPeriodRelated: boolean }[];
  daysUntilPeriodEstimate: [number, number] | null;
  cycleStartDate: string;
}

export interface ConsistentPattern {
  id: string;
  type: "symptom" | "medicine" | "stool";
  name: string;
  timing: {
    phase?: CyclePhase;
    daysBeforePeriod?: [number, number];
    daysAfterPeriod?: [number, number];
  };
  cyclesPresent: number;
  totalCycles: number;
  consistency: number;
  avgIntensity?: number;
  description: string;
  isPeriodRelated?: boolean;
  /** Estimated phase based on timing (for display) */
  estimatedPhase?: CyclePhase;
}

export interface SymptomTiming {
  phase?: CyclePhase;
  daysBeforePeriod?: [number, number];
  daysAfterPeriod?: [number, number];
}

// ============================================
// PHASE 3 TYPES
// ============================================

export interface EmergingPattern {
  id: string;
  type: 'occasional' | 'new' | 'increasing' | 'decreasing';
  name: string;
  itemType: 'symptom' | 'medicine' | 'stool';
  cyclesPresent: number;
  totalCycles: number;
  firstAppeared?: { cycleIndex: number; monthLabel: string };
  trend?: { direction: 'up' | 'down'; startValue: number; endValue: number };
  description: string;
  isPeriodRelated?: boolean;
  /** Additional metadata for expanded view */
  metadata?: {
    firstLoggedDate: string;
    lastLoggedDate: string;
    cyclesAppearedIn: { cycleIndex: number; monthLabel: string }[];
    avgIntensity?: number;
  };
}

export interface CoOccurrence {
  id: string;
  item1: { type: 'symptom' | 'medicine'; name: string };
  item2: { type: 'symptom' | 'medicine'; name: string };
  coOccurrenceCount: number;
  item1TotalCount: number;
  item2TotalCount: number;
  coOccurrenceRate: number;
  description: string;
  /** Additional metadata for expanded view */
  metadata?: {
    firstCoOccurrenceDate: string;
    lastCoOccurrenceDate: string;
    coOccurrenceDates: string[];
  };
}
export interface NotableCycle {
  cycleIndex: number;
  monthLabel: string;
  startDate: string;
  reasons: NotableReason[];
}

export interface NotableReason {
  type: 'length_long' | 'length_short' | 'missing_symptom' | 'new_symptom' | 'intensity_change';
  description: string;
  detail?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Returns number of days between two YYYY-MM-DD dates
 */
export function daysBetween(date1: string, date2: string): number {
  const [y1, m1, d1] = date1.split("-").map(Number);
  const [y2, m2, d2] = date2.split("-").map(Number);

  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);

  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Converts phase key to display name
 * "menstrual" → "Period", "follicular" → "Follicular", etc.
 */
export function formatPhase(phase: CyclePhase | string): string {
  const phaseLabels: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
    not_sure: "Not Sure",
    other: "Other Days",
  };
  return phaseLabels[phase] || phase;
}

/**
 * Returns consistency wording based on ratio
 * 0.8+ → "tends to", 0.6-0.79 → "often", 0.4-0.59 → "sometimes"
 */
export function getConsistencyWord(ratio: number): string {
  if (ratio >= 0.8) return "tends to";
  if (ratio >= 0.6) return "often";
  if (ratio >= 0.4) return "sometimes";
  return "occasionally";
}

/**
 * Estimate cycle phase from days relative to period
 * Based on typical 28-day cycle with ~5-day period
 */
export function estimatePhaseFromDays(
  daysBeforePeriod?: [number, number],
  daysAfterPeriod?: [number, number]
): CyclePhase | null {
  // Days before period (counting backward from next period start)
  if (daysBeforePeriod) {
    const avgDaysBefore = (daysBeforePeriod[0] + daysBeforePeriod[1]) / 2;
    
    // 1-2 days before = late Luteal
    // 3-7 days before = mid Luteal
    // 8-14 days before = early Luteal / Ovulation
    // 15+ days before = Follicular
    if (avgDaysBefore <= 14) return "luteal";
    if (avgDaysBefore <= 16) return "ovulation";
    return "follicular";
  }
  
  // Days after period ends (counting forward from period end, ~day 5-6)
  if (daysAfterPeriod) {
    const avgDaysAfter = (daysAfterPeriod[0] + daysAfterPeriod[1]) / 2;
    
    // 1-7 days after period = Follicular (days 6-12)
    // 8-10 days after period = Ovulation (days 13-15)
    // 11+ days after period = Luteal (days 16+)
    if (avgDaysAfter <= 7) return "follicular";
    if (avgDaysAfter <= 10) return "ovulation";
    return "luteal";
  }
  
  return null;
}

/**
 * Get today's date as YYYY-MM-DD string (in user's local timezone)
 */
function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert number to ordinal string (1 → "1st", 2 → "2nd", etc.)
 */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Get month label from date string (e.g., "January 2024")
 */
function getMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Simple linear regression to detect trend direction
 * Returns null if not enough data points or no clear trend
 */
export function detectTrend(
  values: number[]
): { slope: number; direction: 'up' | 'down' } | null {
  if (values.length < 4) return null;

  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Only report trend if slope is meaningful (at least 0.3 per cycle)
  if (Math.abs(slope) < 0.3) return null;

  return {
    slope,
    direction: slope > 0 ? 'up' : 'down',
  };
}

/**
 * Merge intensity records, keeping highest intensity per key
 */
function mergeIntensities(
  a: Record<string, number | null>,
  b: Record<string, number | null>
): Record<string, number | null> {
  const merged = { ...a };

  for (const [key, value] of Object.entries(b)) {
    const existing = merged[key];
    if (existing === undefined || existing === null) {
      merged[key] = value;
    } else if (value !== null && value > existing) {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Deduplicate entries by date, merging data for same-day entries
 */
function deduplicateEntriesByDate(
  entries: StoredEntry[]
): Map<string, StoredEntry> {
  const dateMap = new Map<string, StoredEntry>();

  const phasePriority: Record<string, number> = {
    menstrual: 5,
    ovulation: 4,
    follicular: 3,
    luteal: 2,
    not_sure: 1,
  };

  for (const entry of entries) {
    const existing = dateMap.get(entry.date);

    if (!existing) {
      dateMap.set(entry.date, entry);
    } else {
      const existingPriority = existing.cyclePhase
        ? phasePriority[existing.cyclePhase] || 0
        : 0;
      const newPriority = entry.cyclePhase
        ? phasePriority[entry.cyclePhase] || 0
        : 0;

      const mergedEntry: StoredEntry = {
        ...existing,
        cyclePhase:
          newPriority > existingPriority
            ? entry.cyclePhase
            : existing.cyclePhase,
        symptomIntensities: mergeIntensities(
          existing.symptomIntensities,
          entry.symptomIntensities
        ),
        periodSymptomIntensities: mergeIntensities(
          existing.periodSymptomIntensities,
          entry.periodSymptomIntensities
        ),
        stoolType: existing.stoolType ?? entry.stoolType,
        periodFlow: existing.periodFlow ?? entry.periodFlow,
        medicineLog: [...existing.medicineLog, ...entry.medicineLog],
        productUsage: [...existing.productUsage, ...entry.productUsage],
      };

      dateMap.set(entry.date, mergedEntry);
    }
  }

  return dateMap;
}

// ============================================
// THIS CYCLE CALCULATIONS
// ============================================

/**
 * Calculate data for the "This Cycle" section
 */
export function calculateThisCycleData(
  currentCycle: DetectedCycle | null,
  allCycles: DetectedCycle[],
  entries: StoredEntry[]
): ThisCycleData | null {
  if (!currentCycle) return null;

  const today = getToday();
  const cycleDay = daysBetween(currentCycle.startDate, today) + 1;

  // ============================================
  // STALENESS CHECK
  // If cycle has been "ongoing" for more than 60 days,
  // treat as no active cycle. A typical cycle is 21-45 days,
  // so 60 days is a generous buffer for irregular cycles.
  // ============================================
  const MAX_REASONABLE_CYCLE_LENGTH = 60;
  
  if (cycleDay > MAX_REASONABLE_CYCLE_LENGTH) {
    // Cycle is stale - user needs to log a new period to restart tracking
    return null;
  }

  // ============================================
  // FUTURE DATE CHECK
  // If cycle start date is in the future (negative cycle day),
  // don't show current cycle data
  // ============================================
  if (cycleDay < 1) {
    return null;
  }

  // ... rest of the function stays exactly the same ...
  
  // Get entries for this cycle
  const cycleEntries = entries.filter((e) => e.date >= currentCycle.startDate);
  const deduplicatedEntries = deduplicateEntriesByDate(cycleEntries);

  // Get current phase from most recent entry with a phase
  let currentPhase: CyclePhase | null = null;
  const sortedDates = Array.from(deduplicatedEntries.keys()).sort().reverse();
  for (const date of sortedDates) {
    const entry = deduplicatedEntries.get(date);
    if (entry?.cyclePhase && entry.cyclePhase !== "not_sure") {
      currentPhase = entry.cyclePhase;
      break;
    }
  }

  // Check if user knows phases (uses more than just "menstrual" and "not_sure")
  const phasesUsed = new Set<string>();
  entries.forEach((entry) => {
    if (entry.cyclePhase && entry.cyclePhase !== "not_sure") {
      phasesUsed.add(entry.cyclePhase);
    }
  });
  const phaseIsKnown =
    phasesUsed.size > 1 ||
    (phasesUsed.size === 1 && !phasesUsed.has("menstrual"));

  // Calculate typical period start range from completed cycles
  const completeCycles = allCycles.filter(
    (c) => !c.isOngoing && c.length !== null
  );
  let periodTypicallyStarts: ThisCycleData["periodTypicallyStarts"] = null;
  let daysUntilPeriodEstimate: [number, number] | null = null;

  if (completeCycles.length >= 2) {
    const lengths = completeCycles
      .map((c) => c.length!)
      .sort((a, b) => a - b);
    const minLength = lengths[0];
    const maxLength = lengths[lengths.length - 1];

    // Confidence based on consistency of cycle lengths
    const range = maxLength - minLength;
    const confidence = range <= 3 ? 0.9 : range <= 7 ? 0.7 : 0.5;

    periodTypicallyStarts = {
      dayRange: [minLength, maxLength],
      confidence,
    };

    // Calculate days until period estimate
    const daysUntilMin = Math.max(0, minLength - cycleDay);
    const daysUntilMax = Math.max(0, maxLength - cycleDay);
    daysUntilPeriodEstimate = [daysUntilMin, daysUntilMax];
  }

  // Collect symptoms logged this cycle (deduplicated, with period-related flag)
  const symptomsMap = new Map<string, boolean>();
  deduplicatedEntries.forEach((entry) => {
    Object.keys(entry.symptomIntensities || {}).forEach((s) => {
      if (!symptomsMap.has(s)) {
        symptomsMap.set(s, false);
      }
    });
    Object.keys(entry.periodSymptomIntensities || {}).forEach((s) => {
      symptomsMap.set(s, true); // Period-related overrides
    });
  });

  const symptomsLoggedThisCycle = Array.from(symptomsMap.entries())
    .map(([name, isPeriodRelated]) => ({ name, isPeriodRelated }))
    .sort((a, b) => {
      // Period-related first, then alphabetical
      if (a.isPeriodRelated !== b.isPeriodRelated) {
        return a.isPeriodRelated ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  return {
    cycleDay,
    phase: currentPhase,
    phaseIsKnown,
    periodTypicallyStarts,
    symptomsLoggedThisCycle,
    daysUntilPeriodEstimate,
    cycleStartDate: currentCycle.startDate,
  };
}

// ============================================
// CONSISTENT PATTERNS CALCULATIONS
// ============================================

interface SymptomCycleData {
  cyclesPresent: number;
  totalIntensity: number;
  intensityCount: number;
  isPeriodRelated: boolean;
  phaseOccurrences: Record<string, number>;
  daysBeforePeriod: number[];
  daysAfterPeriodEnd: number[];
}

interface ItemCycleData {
  cyclesPresent: number;
  phaseOccurrences: Record<string, number>;
}

/**
 * Calculate patterns appearing in 60%+ of cycles
 */
export function calculateConsistentPatterns(
  entries: StoredEntry[],
  cycles: DetectedCycle[]
): ConsistentPattern[] {
  const completeCycles = cycles.filter(
    (c) => !c.isOngoing && c.length !== null
  );

  if (completeCycles.length < 2) return [];

  const patterns: ConsistentPattern[] = [];

  // Track data per cycle
  const symptomCycleData = new Map<string, SymptomCycleData>();
  const medicineCycleData = new Map<string, ItemCycleData>();
  const stoolCycleData = new Map<number, ItemCycleData>();

  // Process each completed cycle
  for (const cycle of completeCycles) {
    const cycleEntries = entries.filter(
      (e) =>
        e.date >= cycle.startDate &&
        (cycle.endDate === null || e.date <= cycle.endDate)
    );

    const deduplicatedEntries = deduplicateEntriesByDate(cycleEntries);
    const cycleSymptoms = new Set<string>();
    const cycleMedicines = new Set<string>();
    const cycleStoolTypes = new Set<number>();

    // Estimate period end day (typically flow days + 1)
    const periodEndDay = cycle.flowDays.length > 0 
      ? Math.max(...cycle.flowDays.map(fd => daysBetween(cycle.startDate, fd.date))) + 1
      : 5; // Default to day 5 if no flow data

    deduplicatedEntries.forEach((entry, date) => {
      const daysFromStart = daysBetween(cycle.startDate, date);
      
      // Days before next period (how close to cycle end)
      const daysBeforePeriod = cycle.length
        ? cycle.length - daysFromStart
        : null;
      
      // Days after period ended (early/mid cycle timing)
      const daysAfterPeriodEnd = daysFromStart - periodEndDay;

      // Track general symptoms
      for (const [symptom, intensity] of Object.entries(
        entry.symptomIntensities || {}
      )) {
        cycleSymptoms.add(symptom);

        if (!symptomCycleData.has(symptom)) {
          symptomCycleData.set(symptom, {
            cyclesPresent: 0,
            totalIntensity: 0,
            intensityCount: 0,
            isPeriodRelated: false,
            phaseOccurrences: {},
            daysBeforePeriod: [],
            daysAfterPeriodEnd: [],
          });
        }

        const data = symptomCycleData.get(symptom)!;
        if (intensity !== null) {
          data.totalIntensity += intensity;
          data.intensityCount++;
        }
        if (entry.cyclePhase && entry.cyclePhase !== "not_sure") {
          data.phaseOccurrences[entry.cyclePhase] =
            (data.phaseOccurrences[entry.cyclePhase] || 0) + 1;
        }
        // Track days before period (for late cycle patterns)
        if (daysBeforePeriod !== null && daysBeforePeriod >= 0 && daysBeforePeriod <= 14) {
          data.daysBeforePeriod.push(daysBeforePeriod);
        }
        // Track days after period end (for early/mid cycle patterns)
        if (daysAfterPeriodEnd >= 1 && daysAfterPeriodEnd <= 14) {
          data.daysAfterPeriodEnd.push(daysAfterPeriodEnd);
        }
      }

      // Track period symptoms
      for (const [symptom, intensity] of Object.entries(
        entry.periodSymptomIntensities || {}
      )) {
        cycleSymptoms.add(symptom);

        if (!symptomCycleData.has(symptom)) {
          symptomCycleData.set(symptom, {
            cyclesPresent: 0,
            totalIntensity: 0,
            intensityCount: 0,
            isPeriodRelated: true,
            phaseOccurrences: {},
            daysBeforePeriod: [],
            daysAfterPeriodEnd: [],
          });
        }

        const data = symptomCycleData.get(symptom)!;
        data.isPeriodRelated = true;
        if (intensity !== null) {
          data.totalIntensity += intensity;
          data.intensityCount++;
        }
        if (entry.cyclePhase && entry.cyclePhase !== "not_sure") {
          data.phaseOccurrences[entry.cyclePhase] =
            (data.phaseOccurrences[entry.cyclePhase] || 0) + 1;
        }
        // Track days before period (for late cycle patterns)
        if (daysBeforePeriod !== null && daysBeforePeriod >= 0 && daysBeforePeriod <= 14) {
          data.daysBeforePeriod.push(daysBeforePeriod);
        }
        // Track days after period end (for early/mid cycle patterns)
        if (daysAfterPeriodEnd >= 1 && daysAfterPeriodEnd <= 14) {
          data.daysAfterPeriodEnd.push(daysAfterPeriodEnd);
        }
      }

      // Track medicines
      for (const med of entry.medicineLog || []) {
        cycleMedicines.add(med.medicineName);

        if (!medicineCycleData.has(med.medicineName)) {
          medicineCycleData.set(med.medicineName, {
            cyclesPresent: 0,
            phaseOccurrences: {},
          });
        }

        const data = medicineCycleData.get(med.medicineName)!;
        if (entry.cyclePhase && entry.cyclePhase !== "not_sure") {
          data.phaseOccurrences[entry.cyclePhase] =
            (data.phaseOccurrences[entry.cyclePhase] || 0) + 1;
        }
      }

      // Track stool types
      if (entry.stoolType) {
        cycleStoolTypes.add(entry.stoolType);

        if (!stoolCycleData.has(entry.stoolType)) {
          stoolCycleData.set(entry.stoolType, {
            cyclesPresent: 0,
            phaseOccurrences: {},
          });
        }

        const data = stoolCycleData.get(entry.stoolType)!;
        if (entry.cyclePhase && entry.cyclePhase !== "not_sure") {
          data.phaseOccurrences[entry.cyclePhase] =
            (data.phaseOccurrences[entry.cyclePhase] || 0) + 1;
        }
      }
    });

    // Increment cycle presence counts
    cycleSymptoms.forEach((symptom) => {
      symptomCycleData.get(symptom)!.cyclesPresent++;
    });

    cycleMedicines.forEach((medicine) => {
      medicineCycleData.get(medicine)!.cyclesPresent++;
    });

    cycleStoolTypes.forEach((stoolType) => {
      stoolCycleData.get(stoolType)!.cyclesPresent++;
    });
  }

  const totalCycles = completeCycles.length;

  // Build symptom patterns (60%+ consistency)
  symptomCycleData.forEach((data, symptom) => {
    const consistency = data.cyclesPresent / totalCycles;

    if (consistency >= 0.6) {
      const timing = calculateTimingFromSymptomData(data);
      const avgIntensity =
        data.intensityCount > 0
          ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10
          : undefined;

      // Estimate phase from timing for display
      let estimatedPhase: CyclePhase | undefined;
      if (timing.phase === "menstrual") {
        estimatedPhase = "menstrual";
      } else if (timing.daysBeforePeriod || timing.daysAfterPeriod) {
        estimatedPhase = estimatePhaseFromDays(timing.daysBeforePeriod, timing.daysAfterPeriod) || undefined;
      } else if (timing.phase) {
        estimatedPhase = timing.phase;
      }

      patterns.push({
        id: `symptom-${symptom}`,
        type: "symptom",
        name: symptom,
        timing,
        cyclesPresent: data.cyclesPresent,
        totalCycles,
        consistency,
        avgIntensity,
        description: buildPatternDescription(symptom, consistency, timing),
        isPeriodRelated: data.isPeriodRelated,
        estimatedPhase,
      });
    }
  });

  // Build medicine patterns (60%+ consistency)
  medicineCycleData.forEach((data, medicine) => {
    const consistency = data.cyclesPresent / totalCycles;

    if (consistency >= 0.6) {
      const timing = calculateTimingFromPhases(data.phaseOccurrences);

      patterns.push({
        id: `medicine-${medicine}`,
        type: "medicine",
        name: medicine,
        timing,
        cyclesPresent: data.cyclesPresent,
        totalCycles,
        consistency,
        description: buildPatternDescription(medicine, consistency, timing),
        estimatedPhase: timing.phase,
      });
    }
  });

  // Build stool patterns (60%+ consistency)
  const bristolLabels: Record<number, string> = {
    1: "Type 1 (hard lumps)",
    2: "Type 2 (lumpy sausage)",
    3: "Type 3 (cracked sausage)",
    4: "Type 4 (smooth snake)",
    5: "Type 5 (soft blobs)",
    6: "Type 6 (mushy)",
    7: "Type 7 (watery)",
  };

  stoolCycleData.forEach((data, stoolType) => {
    const consistency = data.cyclesPresent / totalCycles;

    if (consistency >= 0.6) {
      const timing = calculateTimingFromPhases(data.phaseOccurrences);

      patterns.push({
        id: `stool-${stoolType}`,
        type: "stool",
        name: bristolLabels[stoolType] || `Bristol Type ${stoolType}`,
        timing,
        cyclesPresent: data.cyclesPresent,
        totalCycles,
        consistency,
        description: buildPatternDescription(
          bristolLabels[stoolType] || `Type ${stoolType}`,
          consistency,
          timing
        ),
        estimatedPhase: timing.phase,
      });
    }
  });

  // Sort: highest consistency first, then group by type
  return patterns.sort((a, b) => {
    if (b.consistency !== a.consistency) {
      return b.consistency - a.consistency;
    }
    const typeOrder = { symptom: 0, medicine: 1, stool: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
}

/**
 * Calculate timing from symptom cycle data
 * Prioritizes days-based timing over phase-based for clearer descriptions
 */
function calculateTimingFromSymptomData(data: SymptomCycleData): SymptomTiming {
  const timing: SymptomTiming = {};

  // Check for dominant phase (>50% of occurrences) - but only use as fallback
  const totalPhaseOccurrences = Object.values(data.phaseOccurrences).reduce(
    (a, b) => a + b,
    0
  );
  let dominantPhase: CyclePhase | null = null;
  if (totalPhaseOccurrences > 0) {
    let maxPhase: string | null = null;
    let maxCount = 0;

    for (const [phase, count] of Object.entries(data.phaseOccurrences)) {
      if (count > maxCount) {
        maxCount = count;
        maxPhase = phase;
      }
    }

    if (maxPhase && maxCount / totalPhaseOccurrences > 0.5) {
      dominantPhase = maxPhase as CyclePhase;
    }
  }

  // If symptom appears during period (menstrual phase dominant), use phase-based description
  if (dominantPhase === "menstrual") {
    timing.phase = "menstrual";
    return timing;
  }

  // Check for days-before-period pattern (late cycle, 1-14 days before period)
  if (data.daysBeforePeriod.length >= 3) {
    const sorted = [...data.daysBeforePeriod].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Only report if range is reasonable (within 7 days spread)
    if (max - min <= 7) {
      timing.daysBeforePeriod = [min, max];
      return timing; // Prefer days-before for late cycle patterns
    }
  }

  // Check for days-after-period pattern (early/mid cycle)
  if (data.daysAfterPeriodEnd.length >= 3) {
    const sorted = [...data.daysAfterPeriodEnd].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Only report if range is reasonable (within 7 days spread)
    if (max - min <= 7) {
      timing.daysAfterPeriod = [min, max];
      return timing;
    }
  }

  // Fall back to dominant phase if no clear days-based pattern
  if (dominantPhase) {
    timing.phase = dominantPhase;
  }

  return timing;
}

/**
 * Determine timing pattern for a symptom (standalone function for external use)
 */
export function calculateSymptomTiming(
  symptom: string,
  entries: StoredEntry[],
  cycles: DetectedCycle[]
): SymptomTiming {
  const completeCycles = cycles.filter(
    (c) => !c.isOngoing && c.length !== null
  );
  const phaseOccurrences: Record<string, number> = {};
  const daysBeforePeriod: number[] = [];
  const daysAfterPeriodEnd: number[] = [];

  for (const cycle of completeCycles) {
    const cycleEntries = entries.filter(
      (e) =>
        e.date >= cycle.startDate &&
        (cycle.endDate === null || e.date <= cycle.endDate)
    );

    const deduplicatedEntries = deduplicateEntriesByDate(cycleEntries);
    
    // Estimate period end day
    const periodEndDay = cycle.flowDays.length > 0 
      ? Math.max(...cycle.flowDays.map(fd => daysBetween(cycle.startDate, fd.date))) + 1
      : 5;

    deduplicatedEntries.forEach((entry, date) => {
      const hasSymptom =
        symptom in (entry.symptomIntensities || {}) ||
        symptom in (entry.periodSymptomIntensities || {});

      if (hasSymptom) {
        if (entry.cyclePhase && entry.cyclePhase !== "not_sure") {
          phaseOccurrences[entry.cyclePhase] =
            (phaseOccurrences[entry.cyclePhase] || 0) + 1;
        }

        const daysFromStart = daysBetween(cycle.startDate, date);
        
        if (cycle.length) {
          const daysBefore = cycle.length - daysFromStart;
          if (daysBefore >= 0 && daysBefore <= 14) {
            daysBeforePeriod.push(daysBefore);
          }
        }
        
        const daysAfter = daysFromStart - periodEndDay;
        if (daysAfter >= 1 && daysAfter <= 14) {
          daysAfterPeriodEnd.push(daysAfter);
        }
      }
    });
  }

  // Build timing from collected data
  const syntheticData: SymptomCycleData = {
    cyclesPresent: 0,
    totalIntensity: 0,
    intensityCount: 0,
    isPeriodRelated: false,
    phaseOccurrences,
    daysBeforePeriod,
    daysAfterPeriodEnd,
  };

  return calculateTimingFromSymptomData(syntheticData);
}

/**
 * Calculate timing based only on phase occurrences
 */
function calculateTimingFromPhases(
  phaseOccurrences: Record<string, number>
): SymptomTiming {
  const timing: SymptomTiming = {};

  const totalOccurrences = Object.values(phaseOccurrences).reduce(
    (a, b) => a + b,
    0
  );
  if (totalOccurrences > 0) {
    let maxPhase: string | null = null;
    let maxCount = 0;

    for (const [phase, count] of Object.entries(phaseOccurrences)) {
      if (count > maxCount) {
        maxCount = count;
        maxPhase = phase;
      }
    }

    if (maxPhase && maxCount / totalOccurrences > 0.5) {
      timing.phase = maxPhase as CyclePhase;
    }
  }

  return timing;
}

/**
 * Build human-readable description for a pattern
 * Uses "days before/after period" language for better user understanding
 */
function buildPatternDescription(
  name: string,
  consistency: number,
  timing: SymptomTiming
): string {
  const word = getConsistencyWord(consistency);

  // Check for "during period" first
  if (timing.phase === "menstrual") {
    return `${word} appear during your period`;
  }

  // Days before period (late cycle patterns)
  if (timing.daysBeforePeriod) {
    const [min, max] = timing.daysBeforePeriod;
    if (min === max) {
      return `${word} appear ${min} day${min !== 1 ? "s" : ""} before your period`;
    }
    return `${word} appear ${min}–${max} days before your period`;
  }

  // Days after period (early/mid cycle patterns)
  if (timing.daysAfterPeriod) {
    const [min, max] = timing.daysAfterPeriod;
    if (min === max) {
      return `${word} appear ${min} day${min !== 1 ? "s" : ""} after your period`;
    }
    return `${word} appear ${min}–${max} days after your period`;
  }

  // Fallback to phase name if we only have phase data
  if (timing.phase) {
    const phaseLabel = formatPhase(timing.phase).toLowerCase();
    return `${word} appear during ${phaseLabel} phase`;
  }

  return `${word} appear across your cycles`;
}

// ============================================
// PHASE 3: EMERGING PATTERNS
// ============================================

interface ItemCycleTracking {
  cyclesPresent: Set<number>;
  firstCycleIndex: number;
  intensityByCycle: Map<number, number[]>;
  isPeriodRelated: boolean;
}

/**
 * Calculate emerging patterns: occasional (30-59%), new appearances, and trends
 */
export function calculateEmergingPatterns(
  entries: StoredEntry[],
  cycles: DetectedCycle[]
): EmergingPattern[] {
  const completeCycles = cycles.filter((c) => !c.isOngoing && c.length !== null);
  
  if (completeCycles.length < 2) return [];

  const patterns: EmergingPattern[] = [];
  const totalCycles = completeCycles.length;

  // Track items across cycles
  const symptomTracking = new Map<string, ItemCycleTracking>();
  const medicineTracking = new Map<string, ItemCycleTracking>();
  const stoolTracking = new Map<number, ItemCycleTracking>();

  // Process each cycle
  completeCycles.forEach((cycle, cycleIndex) => {
    const cycleEntries = entries.filter(
      (e) => e.date >= cycle.startDate && 
             (cycle.endDate === null || e.date <= cycle.endDate)
    );
    
    const deduped = deduplicateEntriesByDate(cycleEntries);

    deduped.forEach((entry) => {
      // Track general symptoms
      for (const [symptom, intensity] of Object.entries(entry.symptomIntensities || {})) {
        if (!symptomTracking.has(symptom)) {
          symptomTracking.set(symptom, {
            cyclesPresent: new Set(),
            firstCycleIndex: cycleIndex,
            intensityByCycle: new Map(),
            isPeriodRelated: false,
          });
        }
        const data = symptomTracking.get(symptom)!;
        data.cyclesPresent.add(cycleIndex);
        
        if (intensity !== null) {
          if (!data.intensityByCycle.has(cycleIndex)) {
            data.intensityByCycle.set(cycleIndex, []);
          }
          data.intensityByCycle.get(cycleIndex)!.push(intensity);
        }
      }

      // Track period symptoms
      for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities || {})) {
        if (!symptomTracking.has(symptom)) {
          symptomTracking.set(symptom, {
            cyclesPresent: new Set(),
            firstCycleIndex: cycleIndex,
            intensityByCycle: new Map(),
            isPeriodRelated: true,
          });
        }
        const data = symptomTracking.get(symptom)!;
        data.cyclesPresent.add(cycleIndex);
        data.isPeriodRelated = true;
        
        if (intensity !== null) {
          if (!data.intensityByCycle.has(cycleIndex)) {
            data.intensityByCycle.set(cycleIndex, []);
          }
          data.intensityByCycle.get(cycleIndex)!.push(intensity);
        }
      }

      // Track medicines
      for (const med of entry.medicineLog || []) {
        const name = med.medicineName;
        if (!medicineTracking.has(name)) {
          medicineTracking.set(name, {
            cyclesPresent: new Set(),
            firstCycleIndex: cycleIndex,
            intensityByCycle: new Map(),
            isPeriodRelated: false,
          });
        }
        medicineTracking.get(name)!.cyclesPresent.add(cycleIndex);
      }

      // Track stool types
      if (entry.stoolType) {
        if (!stoolTracking.has(entry.stoolType)) {
          stoolTracking.set(entry.stoolType, {
            cyclesPresent: new Set(),
            firstCycleIndex: cycleIndex,
            intensityByCycle: new Map(),
            isPeriodRelated: false,
          });
        }
        stoolTracking.get(entry.stoolType)!.cyclesPresent.add(cycleIndex);
      }
    });
  });

  const bristolLabels: Record<number, string> = {
    1: "Type 1 (hard lumps)",
    2: "Type 2 (lumpy sausage)",
    3: "Type 3 (cracked sausage)",
    4: "Type 4 (smooth snake)",
    5: "Type 5 (soft blobs)",
    6: "Type 6 (mushy)",
    7: "Type 7 (watery)",
  };

  // ==========================================
  // PROCESS SYMPTOMS
  // ==========================================
  symptomTracking.forEach((data, symptom) => {
    const cyclesPresent = data.cyclesPresent.size;
    const consistency = cyclesPresent / totalCycles;

    // Build common metadata
    const buildSymptomMetadata = () => {
      const cyclesAppearedIn = Array.from(data.cyclesPresent)
        .sort((a, b) => a - b)
        .map((idx) => ({
          cycleIndex: idx + 1,
          monthLabel: getMonthLabel(completeCycles[idx].startDate),
        }));

      let avgIntensity: number | undefined;
      if (data.intensityByCycle.size > 0) {
        let totalIntensity = 0;
        let totalCount = 0;
        data.intensityByCycle.forEach((values) => {
          values.forEach((v) => {
            totalIntensity += v;
            totalCount++;
          });
        });
        if (totalCount > 0) {
          avgIntensity = Math.round((totalIntensity / totalCount) * 10) / 10;
        }
      }

      const firstCycleIdx = Math.min(...Array.from(data.cyclesPresent));
      const lastCycleIdx = Math.max(...Array.from(data.cyclesPresent));

      return {
        firstLoggedDate: completeCycles[firstCycleIdx].startDate,
        lastLoggedDate: completeCycles[lastCycleIdx].endDate || completeCycles[lastCycleIdx].startDate,
        cyclesAppearedIn,
        avgIntensity,
      };
    };

    // Occasional patterns (30-59%)
    if (consistency >= 0.3 && consistency < 0.6) {
      patterns.push({
        id: `occasional-symptom-${symptom}`,
        type: 'occasional',
        name: symptom,
        itemType: 'symptom',
        cyclesPresent,
        totalCycles,
        description: `has appeared in ${cyclesPresent} of ${totalCycles} cycles`,
        isPeriodRelated: data.isPeriodRelated,
        metadata: buildSymptomMetadata(),
      });
    }

    // Recently appeared (first in last 2 cycles)
    if (data.firstCycleIndex >= totalCycles - 2 && cyclesPresent <= 2) {
      const mostRecentCycleIndex = Math.max(...data.cyclesPresent);
      const monthLabel = getMonthLabel(completeCycles[mostRecentCycleIndex].startDate);
      patterns.push({
        id: `new-symptom-${symptom}`,
        type: 'new',
        name: symptom,
        itemType: 'symptom',
        cyclesPresent,
        totalCycles,
        firstAppeared: { cycleIndex: data.firstCycleIndex + 1, monthLabel },
        description: `last logged in your ${ordinal(mostRecentCycleIndex + 1)} cycle (${monthLabel})`,
        isPeriodRelated: data.isPeriodRelated,
        metadata: buildSymptomMetadata(),
      });
    }

    // Trends (need 4+ cycles with intensity data)
    if (data.intensityByCycle.size >= 4) {
      const cycleIndices = Array.from(data.intensityByCycle.keys()).sort((a, b) => a - b);
      const avgIntensities = cycleIndices.map((idx) => {
        const values = data.intensityByCycle.get(idx)!;
        return values.reduce((a, b) => a + b, 0) / values.length;
      });

      const trend = detectTrend(avgIntensities);
      if (trend) {
        const startValue = Math.round(avgIntensities[0] * 10) / 10;
        const endValue = Math.round(avgIntensities[avgIntensities.length - 1] * 10) / 10;

        // Use actual start/end comparison for display consistency
        const displayDirection = endValue > startValue ? 'up' : 'down';

        const cyclesAppearedIn = cycleIndices.map((idx) => ({
          cycleIndex: idx + 1,
          monthLabel: getMonthLabel(completeCycles[idx].startDate),
        }));

        const overallAvg = Math.round(
          (avgIntensities.reduce((a, b) => a + b, 0) / avgIntensities.length) * 10
        ) / 10;

        const firstCycleIdx = cycleIndices[0];
        const lastCycleIdx = cycleIndices[cycleIndices.length - 1];

        patterns.push({
          id: `trend-symptom-${symptom}`,
          type: displayDirection === 'up' ? 'increasing' : 'decreasing',
          name: symptom,
          itemType: 'symptom',
          cyclesPresent,
          totalCycles,
          trend: { direction: displayDirection, startValue, endValue },
          description: `intensity has been ${displayDirection === 'up' ? 'increasing' : 'decreasing'} over your last ${cycleIndices.length} cycles`,
          isPeriodRelated: data.isPeriodRelated,
          metadata: {
            firstLoggedDate: completeCycles[firstCycleIdx].startDate,
            lastLoggedDate: completeCycles[lastCycleIdx].endDate || completeCycles[lastCycleIdx].startDate,
            cyclesAppearedIn,
            avgIntensity: overallAvg,
          },
        });
      }
    }
  });

  // ==========================================
  // PROCESS MEDICINES
  // ==========================================
  medicineTracking.forEach((data, medicine) => {
    const cyclesPresent = data.cyclesPresent.size;
    const consistency = cyclesPresent / totalCycles;

    // Build common metadata for medicines
    const buildMedicineMetadata = () => {
      const cyclesAppearedIn = Array.from(data.cyclesPresent)
        .sort((a, b) => a - b)
        .map((idx) => ({
          cycleIndex: idx + 1,
          monthLabel: getMonthLabel(completeCycles[idx].startDate),
        }));

      const firstCycleIdx = Math.min(...Array.from(data.cyclesPresent));
      const lastCycleIdx = Math.max(...Array.from(data.cyclesPresent));

      return {
        firstLoggedDate: completeCycles[firstCycleIdx].startDate,
        lastLoggedDate: completeCycles[lastCycleIdx].endDate || completeCycles[lastCycleIdx].startDate,
        cyclesAppearedIn,
      };
    };

    // Occasional patterns (30-59%)
    if (consistency >= 0.3 && consistency < 0.6) {
      patterns.push({
        id: `occasional-medicine-${medicine}`,
        type: 'occasional',
        name: medicine,
        itemType: 'medicine',
        cyclesPresent,
        totalCycles,
        description: `has appeared in ${cyclesPresent} of ${totalCycles} cycles`,
        metadata: buildMedicineMetadata(),
      });
    }

    // Recently appeared (first in last 2 cycles)
    if (data.firstCycleIndex >= totalCycles - 2 && cyclesPresent <= 2) {
      const mostRecentCycleIndex = Math.max(...data.cyclesPresent);
      const monthLabel = getMonthLabel(completeCycles[mostRecentCycleIndex].startDate);
      patterns.push({
        id: `new-medicine-${medicine}`,
        type: 'new',
        name: medicine,
        itemType: 'medicine',
        cyclesPresent,
        totalCycles,
        firstAppeared: { cycleIndex: data.firstCycleIndex + 1, monthLabel },
        description: `last logged in your ${ordinal(mostRecentCycleIndex + 1)} cycle (${monthLabel})`,
        metadata: buildMedicineMetadata(),
      });
    }
  });

  // ==========================================
  // PROCESS STOOL TYPES
  // ==========================================
  stoolTracking.forEach((data, stoolType) => {
    const cyclesPresent = data.cyclesPresent.size;
    const consistency = cyclesPresent / totalCycles;
    const name = bristolLabels[stoolType] || `Bristol Type ${stoolType}`;

    // Build common metadata for stool
    const buildStoolMetadata = () => {
      const cyclesAppearedIn = Array.from(data.cyclesPresent)
        .sort((a, b) => a - b)
        .map((idx) => ({
          cycleIndex: idx + 1,
          monthLabel: getMonthLabel(completeCycles[idx].startDate),
        }));

      const firstCycleIdx = Math.min(...Array.from(data.cyclesPresent));
      const lastCycleIdx = Math.max(...Array.from(data.cyclesPresent));

      return {
        firstLoggedDate: completeCycles[firstCycleIdx].startDate,
        lastLoggedDate: completeCycles[lastCycleIdx].endDate || completeCycles[lastCycleIdx].startDate,
        cyclesAppearedIn,
      };
    };

    // Occasional patterns (30-59%)
    if (consistency >= 0.3 && consistency < 0.6) {
      patterns.push({
        id: `occasional-stool-${stoolType}`,
        type: 'occasional',
        name,
        itemType: 'stool',
        cyclesPresent,
        totalCycles,
        description: `has appeared in ${cyclesPresent} of ${totalCycles} cycles`,
        metadata: buildStoolMetadata(),
      });
    }

    // Recently appeared (first in last 2 cycles)
    if (data.firstCycleIndex >= totalCycles - 2 && cyclesPresent <= 2) {
      const mostRecentCycleIndex = Math.max(...data.cyclesPresent);
      const monthLabel = getMonthLabel(completeCycles[mostRecentCycleIndex].startDate);
      patterns.push({
        id: `new-stool-${stoolType}`,
        type: 'new',
        name,
        itemType: 'stool',
        cyclesPresent,
        totalCycles,
        firstAppeared: { cycleIndex: data.firstCycleIndex + 1, monthLabel },
        description: `last logged in your ${ordinal(mostRecentCycleIndex + 1)} cycle (${monthLabel})`,
        metadata: buildStoolMetadata(),
      });
    }
  });

  // Sort: new first, then trends, then occasional by consistency
  return patterns.sort((a, b) => {
    const typeOrder = { new: 0, increasing: 1, decreasing: 1, occasional: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return b.cyclesPresent - a.cyclesPresent;
  });
}


// ============================================
// PHASE 3: CO-OCCURRENCE
// ============================================

/**
 * Calculate symptom/medicine pairs that frequently appear on the same day
 */
export function calculateCoOccurrences(
  entries: StoredEntry[]
): CoOccurrence[] {
  if (entries.length < 3) return [];

  // Deduplicate entries by date
  const dateMap = deduplicateEntriesByDate(entries);
  
  // Track item occurrences and co-occurrences
  const itemCounts = new Map<string, { type: 'symptom' | 'medicine'; count: number }>();
  const pairCounts = new Map<string, number>();
  const pairDates = new Map<string, string[]>(); // Track dates for each pair

  dateMap.forEach((entry, date) => {
    const dayItems: { type: 'symptom' | 'medicine'; name: string }[] = [];

    // Collect symptoms
    for (const symptom of Object.keys(entry.symptomIntensities || {})) {
      dayItems.push({ type: 'symptom', name: symptom });
      const key = `symptom:${symptom}`;
      itemCounts.set(key, {
        type: 'symptom',
        count: (itemCounts.get(key)?.count || 0) + 1,
      });
    }

    for (const symptom of Object.keys(entry.periodSymptomIntensities || {})) {
      // Avoid duplicates if symptom is in both
      if (!dayItems.some(i => i.type === 'symptom' && i.name === symptom)) {
        dayItems.push({ type: 'symptom', name: symptom });
        const key = `symptom:${symptom}`;
        itemCounts.set(key, {
          type: 'symptom',
          count: (itemCounts.get(key)?.count || 0) + 1,
        });
      }
    }

    // Collect medicines
    const uniqueMeds = new Set<string>();
    for (const med of entry.medicineLog || []) {
      if (!uniqueMeds.has(med.medicineName)) {
        uniqueMeds.add(med.medicineName);
        dayItems.push({ type: 'medicine', name: med.medicineName });
        const key = `medicine:${med.medicineName}`;
        itemCounts.set(key, {
          type: 'medicine',
          count: (itemCounts.get(key)?.count || 0) + 1,
        });
      }
    }

    // Count co-occurrences (pairs on same day)
    for (let i = 0; i < dayItems.length; i++) {
      for (let j = i + 1; j < dayItems.length; j++) {
        const item1 = dayItems[i];
        const item2 = dayItems[j];
        
        // Create consistent pair key (alphabetically sorted)
        const key1 = `${item1.type}:${item1.name}`;
        const key2 = `${item2.type}:${item2.name}`;
        const pairKey = [key1, key2].sort().join('|');
        
        pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
        
        // Track the date for this co-occurrence
        if (!pairDates.has(pairKey)) {
          pairDates.set(pairKey, []);
        }
        pairDates.get(pairKey)!.push(entry.date);
      }
    }
  });

  // Build co-occurrence results
  const coOccurrences: CoOccurrence[] = [];

  pairCounts.forEach((count, pairKey) => {
    if (count < 3) return; // Minimum 3 co-occurrences

    const [key1, key2] = pairKey.split('|');
    const [type1, name1] = key1.split(':') as ['symptom' | 'medicine', string];
    const [type2, name2] = key2.split(':') as ['symptom' | 'medicine', string];

    const item1Count = itemCounts.get(key1)?.count || 0;
    const item2Count = itemCounts.get(key2)?.count || 0;

    // Calculate co-occurrence rate based on the less frequent item
    const minCount = Math.min(item1Count, item2Count);
    const rate = count / minCount;

    if (rate < 0.4) return; // Minimum 40% rate

    // Build description based on types
    let description: string;
    if (type1 === 'symptom' && type2 === 'medicine') {
      description = `When you log ${name1}, you often also take ${name2}`;
    } else if (type1 === 'medicine' && type2 === 'symptom') {
      description = `When you log ${name2}, you often also take ${name1}`;
    } else if (type1 === 'symptom' && type2 === 'symptom') {
      description = `${name1} and ${name2} often occur on the same day`;
    } else {
      description = `${name1} and ${name2} are often taken together`;
    }

    // Get dates for this pair and sort them
    const dates = (pairDates.get(pairKey) || []).sort();
    
    coOccurrences.push({
      id: `cooccur-${name1}-${name2}`.replace(/\s+/g, '-').toLowerCase(),
      item1: { type: type1, name: name1 },
      item2: { type: type2, name: name2 },
      coOccurrenceCount: count,
      item1TotalCount: item1Count,
      item2TotalCount: item2Count,
      coOccurrenceRate: Math.round(rate * 100) / 100,
      description,
      metadata: {
        firstCoOccurrenceDate: dates[0],
        lastCoOccurrenceDate: dates[dates.length - 1],
        coOccurrenceDates: dates,
      },
    });
  });

  // Sort by co-occurrence rate, limit to 5
  return coOccurrences
    .sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate)
    .slice(0, 5);
}

// ============================================
// PHASE 3: NOTABLE CYCLES
// ============================================

/**
 * Identify cycles that differ from the user's norm
 */
export function calculateNotableCycles(
  cycles: DetectedCycle[],
  entries: StoredEntry[],
  consistentPatterns: ConsistentPattern[]
): NotableCycle[] {
  const completeCycles = cycles.filter((c) => !c.isOngoing && c.length !== null);
  
  if (completeCycles.length < 2) return [];

  // Calculate average cycle length
  const lengths = completeCycles.map((c) => c.length!);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const stdDev = Math.sqrt(
    lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length
  );

  // Get consistent symptom names for comparison
  const consistentSymptoms = new Set(
    consistentPatterns
      .filter((p) => p.type === 'symptom' && p.consistency >= 0.6)
      .map((p) => p.name)
  );

  const notableCycles: NotableCycle[] = [];

  completeCycles.forEach((cycle, index) => {
    const reasons: NotableReason[] = [];

    // Check cycle length deviation
    if (cycle.length !== null) {
      const deviation = cycle.length - avgLength;
      
      // Flag if more than 1.5 std deviations or more than 5 days different
      if (Math.abs(deviation) > Math.max(stdDev * 1.5, 5)) {
        if (deviation > 0) {
          reasons.push({
            type: 'length_long',
            description: `${Math.round(deviation)} days longer than your average`,
            detail: `${cycle.length} days vs. ~${Math.round(avgLength)} day average`,
          });
        } else {
          reasons.push({
            type: 'length_short',
            description: `${Math.round(Math.abs(deviation))} days shorter than your average`,
            detail: `${cycle.length} days vs. ~${Math.round(avgLength)} day average`,
          });
        }
      }
    }

    // Get entries for this cycle
    const cycleEntries = entries.filter(
      (e) => e.date >= cycle.startDate && 
             (cycle.endDate === null || e.date <= cycle.endDate)
    );
    const deduped = deduplicateEntriesByDate(cycleEntries);

    // Collect symptoms logged this cycle
    const cycleSymptoms = new Set<string>();
    deduped.forEach((entry) => {
      Object.keys(entry.symptomIntensities || {}).forEach((s) => cycleSymptoms.add(s));
      Object.keys(entry.periodSymptomIntensities || {}).forEach((s) => cycleSymptoms.add(s));
    });

    // Check for missing consistent symptoms (only if we have enough history)
    if (index >= 2) {
      consistentSymptoms.forEach((symptom) => {
        if (!cycleSymptoms.has(symptom)) {
          reasons.push({
            type: 'missing_symptom',
            description: `${symptom} was not logged this cycle`,
            // detail: `Usually appears in your cycles`,
          });
        }
      });
    }

    // Check for new symptoms not seen before this cycle
    if (index >= 2) {
      const previousSymptoms = new Set<string>();
      completeCycles.slice(0, index).forEach((prevCycle) => {
        const prevEntries = entries.filter(
          (e) => e.date >= prevCycle.startDate && 
                 (prevCycle.endDate === null || e.date <= prevCycle.endDate)
        );
        prevEntries.forEach((e) => {
          Object.keys(e.symptomIntensities || {}).forEach((s) => previousSymptoms.add(s));
          Object.keys(e.periodSymptomIntensities || {}).forEach((s) => previousSymptoms.add(s));
        });
      });

      cycleSymptoms.forEach((symptom) => {
        if (!previousSymptoms.has(symptom)) {
          reasons.push({
            type: 'new_symptom',
            description: `${symptom} appeared for the first time`,
          });
        }
      });
    }

    // Only add if there are notable reasons
    if (reasons.length > 0) {
      notableCycles.push({
        cycleIndex: index + 1,
        monthLabel: getMonthLabel(cycle.startDate),
        startDate: cycle.startDate,
        reasons: reasons.slice(0, 3), // Max 3 reasons per cycle
      });
    }
  });

  // Return most recent 3 notable cycles
  return notableCycles.reverse().slice(0, 3);
}

// ============================================
// PHASE 4: REFLECTION PROMPTS
// ============================================

export interface ReflectionPrompt {
  id: string;
  category: 'pattern_check' | 'recent_change' | 'co_occurrence' | 'general_awareness';
  prompt: string;
  basedOn: string;
  answerType: 'yes_no' | 'accuracy' | 'choice' | 'acknowledge';
  choices?: string[];
}

/**
 * Generate reflection prompts based on user's data
 * Returns 1-2 prompts, excluding dismissed ones
 * 
 * Rules:
 * - NEVER use "in your body" phrasing
 * - Questions must logically match answer options
 * - Maximum 2 prompts returned
 */
export function generateReflectionPrompts(
  consistentPatterns: ConsistentPattern[],
  emergingPatterns: EmergingPattern[],
  coOccurrences: CoOccurrence[],
  dismissedPromptIds: string[],
  cycleCount: number
): ReflectionPrompt[] {
  const prompts: ReflectionPrompt[] = [];
  
  // Early data - show encouraging message
  if (cycleCount < 2) {
    const earlyPromptId = 'early-data-encouragement';
    if (!dismissedPromptIds.includes(earlyPromptId)) {
      prompts.push({
        id: earlyPromptId,
        category: 'general_awareness',
        prompt: "You're building your personal pattern library. After 2+ complete cycles, you'll start seeing deeper insights here.",
        basedOn: 'Early tracking stage',
        answerType: 'acknowledge',
      });
    }
    return prompts.slice(0, 2);
  }

  // ==========================================
  // PATTERN CHECK PROMPTS
  // Based on consistent patterns (60%+ cycles)
  // ==========================================
  
  // Find a high-consistency symptom pattern
  const highConsistencySymptom = consistentPatterns.find(
    (p) => p.type === 'symptom' && p.consistency >= 0.7 && !dismissedPromptIds.includes(`pattern-${p.id}`)
  );
  
  if (highConsistencySymptom) {
    const cyclesText = `${highConsistencySymptom.cyclesPresent} of ${highConsistencySymptom.totalCycles}`;
    prompts.push({
      id: `pattern-${highConsistencySymptom.id}`,
      category: 'pattern_check',
      prompt: `You've logged ${highConsistencySymptom.name} in ${cyclesText} cycles. Have you noticed this pattern yourself?`,
      basedOn: `${highConsistencySymptom.name} appears in ${Math.round(highConsistencySymptom.consistency * 100)}% of cycles`,
      answerType: 'yes_no',
    });
  }

  // ==========================================
  // RECENT CHANGE PROMPTS
  // Based on new/emerging patterns
  // ==========================================
  
  const newPattern = emergingPatterns.find(
    (p) => p.type === 'new' && !dismissedPromptIds.includes(`new-${p.id}`)
  );
  
  if (newPattern && prompts.length < 2) {
    prompts.push({
      id: `new-${newPattern.id}`,
      category: 'recent_change',
      prompt: `${newPattern.name} is something you started logging recently. Is this new for you, or just new to tracking?`,
      basedOn: newPattern.description,
      answerType: 'choice',
      choices: ['New for me', 'Just started tracking it', 'Not sure'],
    });
  }

  // ==========================================
  // TREND PROMPTS
  // Based on increasing/decreasing patterns
  // ==========================================
  
  const trendPattern = emergingPatterns.find(
    (p) => (p.type === 'increasing' || p.type === 'decreasing') && 
           !dismissedPromptIds.includes(`trend-${p.id}`)
  );
  
  if (trendPattern && trendPattern.trend && prompts.length < 2) {
    const direction = trendPattern.trend.direction === 'up' ? 'increasing' : 'decreasing';
    prompts.push({
      id: `trend-${trendPattern.id}`,
      category: 'pattern_check',
      prompt: `Your ${trendPattern.name} intensity has been ${direction} over recent cycles. Does this feel accurate to you?`,
      basedOn: `Trend from ${trendPattern.trend.startValue.toFixed(1)} to ${trendPattern.trend.endValue.toFixed(1)}`,
      answerType: 'accuracy',
    });
  }

  // ==========================================
  // CO-OCCURRENCE PROMPTS
  // Based on things that happen together
  // ==========================================
  
  const coOccurrence = coOccurrences.find(
    (co) => co.coOccurrenceRate >= 0.6 && !dismissedPromptIds.includes(`cooccur-${co.id}`)
  );
  
  if (coOccurrence && prompts.length < 2) {
    const item1 = coOccurrence.item1.name;
    const item2 = coOccurrence.item2.name;
    const isMedicinePair = coOccurrence.item1.type === 'medicine' || coOccurrence.item2.type === 'medicine';
    
    if (isMedicinePair) {
      // One is medicine, one is symptom
      const medicine = coOccurrence.item1.type === 'medicine' ? item1 : item2;
      const symptom = coOccurrence.item1.type === 'symptom' ? item1 : item2;
      
      prompts.push({
        id: `cooccur-${coOccurrence.id}`,
        category: 'co_occurrence',
        prompt: `${symptom} and ${medicine} often appear together in your logs. Do you typically take ${medicine} when you notice ${symptom}?`,
        basedOn: `${coOccurrence.coOccurrenceCount} co-occurrences`,
        answerType: 'choice',
        choices: ['Yes, usually', 'Sometimes', 'It varies'],
      });
    } else {
      // Both are symptoms
      prompts.push({
        id: `cooccur-${coOccurrence.id}`,
        category: 'co_occurrence',
        prompt: `${item1} and ${item2} often show up on the same day. Have you noticed a connection between them?`,
        basedOn: `${coOccurrence.coOccurrenceCount} co-occurrences`,
        answerType: 'yes_no',
      });
    }
  }

  // ==========================================
  // GENERAL AWARENESS (fallback)
  // ==========================================
  
  if (prompts.length === 0) {
    const generalPromptId = 'general-tracking-reflection';
    if (!dismissedPromptIds.includes(generalPromptId)) {
      prompts.push({
        id: generalPromptId,
        category: 'general_awareness',
        prompt: `You've tracked ${cycleCount} complete cycles. Is there anything you've started noticing about your patterns?`,
        basedOn: `${cycleCount} cycles of data`,
        answerType: 'acknowledge',
      });
    }
  }

  // Return max 2 prompts
  return prompts.slice(0, 2);
}