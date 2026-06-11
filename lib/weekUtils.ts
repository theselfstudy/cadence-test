// ============================================
// Week Utilities
// ============================================

import type { 
  StoredEntry, 
  WeekStartDay, 
  CyclePhase, 
  PostBowelFeeling,
  FlowLevel,
  MedicineCategory
} from "@/types";
import { getLocalDateString } from "./dateUtils";

// ============================================
// TYPES
// ============================================

export interface DayBreakdown {
  date: string;
  dayName: string;
  entryCount: number;
  entries: StoredEntry[];
}

export interface EntryBreakdown {
  withSymptoms: number;
  withBowel: number;
  withPeriod: number;
  withMedicine: number;
}

export interface SymptomStat {
  name: string;
  count: number;
  avgIntensity: number | null;
  days: string[];
}

// CHANGED: Co-occurring symptom now includes intensity
export interface CoOccurringSymptom {
  name: string;
  count: number;
  avgIntensity: number | null;
}

export interface PeriodStats {
  hasData: boolean;
  latestPhase: CyclePhase | null;
  latestFlow: FlowLevel | null;
  phaseProgression: { phase: CyclePhase; days: string[] }[];
  flowDistribution: { flow: FlowLevel; count: number }[]; // CHANGED: Now an array for easier sorting
  productUsage: { product: string; count: number }[];
  periodSymptoms: SymptomStat[];
  periodGeneralCoOccurrences: { periodSymptom: string; generalSymptoms: string[] }[];
}

// CHANGED: Extended medicine stats
export interface MedicineStats {
  hasData: boolean;
  mostUsedMedicine: {
    id: string;
    name: string;
    count: number;
    dosages: string[];
    categories: MedicineCategory[];
    daysUsed: string[];
    timeOfDay: { period: string; count: number }[];
  } | null;
  otherMedicines: { id: string; name: string; count: number }[];
  coOccurringSymptoms: CoOccurringSymptom[];
}

export interface ExtendedWeekStats {
  // Basic stats
  totalEntries: number;
  daysWithEntries: number;
  
  // Entry breakdown
  entryBreakdown: EntryBreakdown;
  
  // Top symptom with extras
  topSymptom: SymptomStat | null;
  runnerUpSymptoms: SymptomStat[];
  topSymptomCoOccurrences: CoOccurringSymptom[]; // CHANGED: Now includes intensity
  
  // Bristol stats
  mostCommonBristol: number | null;
  bristolDistribution: Record<number, number>;
  bristolDays: string[];
  mostCommonFeeling: PostBowelFeeling | null;
  feelingDistribution: Record<PostBowelFeeling, number>;
  
  // Period stats
  periodStats: PeriodStats;

  // Medicine stats
  medicineStats: MedicineStats;
  
  // Legacy (for compatibility)
  avgSymptomsPerEntry: number;
  symptomCounts: Record<string, number>;
}

// ============================================
// DATE/WEEK HELPERS
// ============================================

/**
 * Gets the start and end dates of the current week based on user preference
 */
export function getCurrentWeekRange(weekStartDay: WeekStartDay): {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
} {
  const today = new Date();
  const currentDay = today.getDay();
  
  let daysToSubtract: number;
  if (weekStartDay === "sunday") {
    daysToSubtract = currentDay;
  } else {
    daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
  }
  
  const start = new Date(today);
  start.setDate(today.getDate() - daysToSubtract);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return {
    start,
    end,
    startStr: getLocalDateString(start),
    endStr: getLocalDateString(end),
  };
}

/**
 * Filters entries to current week
 */
export function getEntriesForCurrentWeek(
  entries: StoredEntry[],
  weekStartDay: WeekStartDay
): StoredEntry[] {
  const { startStr, endStr } = getCurrentWeekRange(weekStartDay);
  
  return entries
    .filter((entry) => entry.date >= startStr && entry.date <= endStr)
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : b.startTime.localeCompare(a.startTime);
    });
}

/**
 * Gets day-by-day breakdown for the week
 */
export function getWeekDayBreakdown(
  entries: StoredEntry[],
  weekStartDay: WeekStartDay
): DayBreakdown[] {
  const { start } = getCurrentWeekRange(weekStartDay);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const breakdown: DayBreakdown[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = getLocalDateString(date);
    const dayEntries = entries.filter((e) => e.date === dateStr);
    
    breakdown.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      entryCount: dayEntries.length,
      entries: dayEntries,
    });
  }
  
  return breakdown;
}

/**
 * Formats week range for display
 */
export function formatWeekRange(weekStartDay: WeekStartDay): string {
  const { start, end } = getCurrentWeekRange(weekStartDay);
  
  const formatOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startFormatted = start.toLocaleDateString("en-US", formatOptions);
  const endFormatted = end.toLocaleDateString("en-US", formatOptions);
  
  if (start.getFullYear() !== end.getFullYear()) {
    return `${startFormatted}, ${start.getFullYear()} - ${endFormatted}, ${end.getFullYear()}`;
  }
  
  return `${startFormatted} - ${endFormatted}`;
}

// ============================================
// EXTENDED STATS CALCULATION
// ============================================

/**
 * Helper to get day name from date string
 */
function getDayName(dateStr: string): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const date = new Date(dateStr + "T12:00:00");
  return dayNames[date.getDay()];
}

/**
 * Helper to get time of day period from TimeValue
 */
function getTimeOfDayPeriod(time: { hour: number; minute: number; period: "AM" | "PM" } | undefined): string | null {
  if (!time) return null;
  
  let hour24 = time.hour;
  if (time.period === "PM" && time.hour !== 12) {
    hour24 = time.hour + 12;
  } else if (time.period === "AM" && time.hour === 12) {
    hour24 = 0;
  }
  
  if (hour24 >= 5 && hour24 < 12) return "Morning";
  if (hour24 >= 12 && hour24 < 17) return "Afternoon";
  if (hour24 >= 17 && hour24 < 21) return "Evening";
  return "Night";
}

/**
 * Calculates comprehensive weekly statistics
 */
export function calculateWeekStats(entries: StoredEntry[]): ExtendedWeekStats {
  // Empty state
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      daysWithEntries: 0,
      entryBreakdown: { withSymptoms: 0, withBowel: 0, withPeriod: 0, withMedicine: 0 },
      topSymptom: null,
      runnerUpSymptoms: [],
      topSymptomCoOccurrences: [],
      mostCommonBristol: null,
      bristolDistribution: {},
      bristolDays: [],
      mostCommonFeeling: null,
      feelingDistribution: {} as Record<PostBowelFeeling, number>,
      periodStats: {
        hasData: false,
        latestPhase: null,
        latestFlow: null,
        phaseProgression: [],
        flowDistribution: [],
        productUsage: [],
        periodSymptoms: [],
        periodGeneralCoOccurrences: [],
      },
      medicineStats: {
        hasData: false,
        mostUsedMedicine: null,
        otherMedicines: [],
        coOccurringSymptoms: [],
      },
      avgSymptomsPerEntry: 0,
      symptomCounts: {},
    };
  }

  // Count unique days
  const uniqueDays = new Set(entries.map((e) => e.date));

  // ========== ENTRY BREAKDOWN ==========
  const entryBreakdown: EntryBreakdown = {
    withSymptoms: 0,
    withBowel: 0,
    withPeriod: 0,
    withMedicine: 0,
  };

  for (const entry of entries) {
    if (Object.keys(entry.symptomIntensities).length > 0) entryBreakdown.withSymptoms++;
    if (entry.stoolType !== null) entryBreakdown.withBowel++;
    if (entry.cyclePhase !== null || entry.periodFlow !== null) entryBreakdown.withPeriod++;
    if (entry.medicineLog.length > 0) entryBreakdown.withMedicine++;
  }

  // ========== SYMPTOM STATS ==========
  const symptomData: Record<string, { count: number; totalIntensity: number; intensityCount: number; days: Set<string> }> = {};
  
  // Track co-occurrences with intensity data
  const symptomCoOccurrenceMap: Record<string, Record<string, { count: number; totalIntensity: number; intensityCount: number }>> = {};

  for (const entry of entries) {
    const entrySymptoms = Object.keys(entry.symptomIntensities);
    const dayName = getDayName(entry.date);
    
    for (const symptom of entrySymptoms) {
      if (!symptomData[symptom]) {
        symptomData[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, days: new Set() };
      }
      symptomData[symptom].count++;
      symptomData[symptom].days.add(dayName);
      
      const intensity = entry.symptomIntensities[symptom];
      if (intensity !== null && intensity !== undefined) {
        symptomData[symptom].totalIntensity += intensity;
        symptomData[symptom].intensityCount++;
      }
      
      // Track co-occurrences with their intensities
      if (!symptomCoOccurrenceMap[symptom]) {
        symptomCoOccurrenceMap[symptom] = {};
      }
      for (const other of entrySymptoms) {
        if (other !== symptom) {
          if (!symptomCoOccurrenceMap[symptom][other]) {
            symptomCoOccurrenceMap[symptom][other] = { count: 0, totalIntensity: 0, intensityCount: 0 };
          }
          symptomCoOccurrenceMap[symptom][other].count++;
          const otherIntensity = entry.symptomIntensities[other];
          if (otherIntensity !== null && otherIntensity !== undefined) {
            symptomCoOccurrenceMap[symptom][other].totalIntensity += otherIntensity;
            symptomCoOccurrenceMap[symptom][other].intensityCount++;
          }
        }
      }
    }
  }

  const sortedSymptoms: SymptomStat[] = Object.entries(symptomData)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgIntensity: data.intensityCount > 0 
        ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10 
        : null,
      days: Array.from(data.days),
    }))
    .sort((a, b) => b.count - a.count);

  const topSymptom = sortedSymptoms[0] || null;
  const runnerUpSymptoms = sortedSymptoms.slice(1, 4);

  // Get co-occurrences for top symptom WITH intensity
  const topSymptomCoOccurrences: CoOccurringSymptom[] = topSymptom 
    ? Object.entries(symptomCoOccurrenceMap[topSymptom.name] || {})
        .map(([name, data]) => ({
          name,
          count: data.count,
          avgIntensity: data.intensityCount > 0
            ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10
            : null,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3) // Top 3
    : [];

  const symptomCounts: Record<string, number> = {};
  for (const s of sortedSymptoms) {
    symptomCounts[s.name] = s.count;
  }

  let totalSymptoms = 0;
  for (const entry of entries) {
    totalSymptoms += Object.keys(entry.symptomIntensities).length;
    totalSymptoms += Object.keys(entry.periodSymptomIntensities).length;
  }

  // ========== BRISTOL STATS ==========
  const bristolDistribution: Record<number, number> = {};
  const bristolDaysSet = new Set<string>();
  const feelingDistribution: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.stoolType !== null) {
      bristolDistribution[entry.stoolType] = (bristolDistribution[entry.stoolType] || 0) + 1;
      bristolDaysSet.add(getDayName(entry.date));
    }
    if (entry.stoolFeeling) {
      feelingDistribution[entry.stoolFeeling] = (feelingDistribution[entry.stoolFeeling] || 0) + 1;
    }
  }

  let mostCommonBristol: number | null = null;
  let maxBristolCount = 0;
  for (const [type, count] of Object.entries(bristolDistribution)) {
    if (count > maxBristolCount) {
      mostCommonBristol = parseInt(type, 10);
      maxBristolCount = count;
    }
  }

  let mostCommonFeeling: PostBowelFeeling | null = null;
  let maxFeelingCount = 0;
  for (const [feeling, count] of Object.entries(feelingDistribution)) {
    if (count > maxFeelingCount) {
      mostCommonFeeling = feeling as PostBowelFeeling;
      maxFeelingCount = count;
    }
  }

  // ========== PERIOD STATS ==========
  const periodStats = calculatePeriodStats(entries);

  // ========== MEDICINE STATS ==========
  const medicineStats = calculateMedicineStats(entries);

  return {
    totalEntries: entries.length,
    daysWithEntries: uniqueDays.size,
    entryBreakdown,
    topSymptom,
    runnerUpSymptoms,
    topSymptomCoOccurrences,
    mostCommonBristol,
    bristolDistribution,
    bristolDays: Array.from(bristolDaysSet),
    mostCommonFeeling,
    feelingDistribution: feelingDistribution as Record<PostBowelFeeling, number>,
    periodStats,
    medicineStats,
    avgSymptomsPerEntry: entries.length > 0 
      ? Math.round((totalSymptoms / entries.length) * 10) / 10 
      : 0,
    symptomCounts,
  };
}

/**
 * Calculate period-specific statistics
 */
function calculatePeriodStats(entries: StoredEntry[]): PeriodStats {
  const periodEntries = entries.filter(
    (e) => e.cyclePhase !== null || e.periodFlow !== null || Object.keys(e.periodSymptomIntensities).length > 0
  );

  if (periodEntries.length === 0) {
    return {
      hasData: false,
      latestPhase: null,
      latestFlow: null,
      phaseProgression: [],
      flowDistribution: [],
      productUsage: [],
      periodSymptoms: [],
      periodGeneralCoOccurrences: [],
    };
  }

  const sorted = [...periodEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];

  const phaseProgression: { phase: CyclePhase; days: string[] }[] = [];
  let currentPhase: CyclePhase | null = null;
  let currentDays: string[] = [];

  for (const entry of sorted) {
    if (entry.cyclePhase) {
      if (entry.cyclePhase !== currentPhase) {
        if (currentPhase !== null) {
          phaseProgression.push({ phase: currentPhase, days: currentDays });
        }
        currentPhase = entry.cyclePhase;
        currentDays = [getDayName(entry.date)];
      } else {
        const dayName = getDayName(entry.date);
        if (!currentDays.includes(dayName)) {
          currentDays.push(dayName);
        }
      }
    }
  }
  if (currentPhase !== null) {
    phaseProgression.push({ phase: currentPhase, days: currentDays });
  }

  // Flow distribution as sorted array (top 3)
  const flowCounts: Record<string, number> = {};
  for (const entry of periodEntries) {
    if (entry.periodFlow) {
      flowCounts[entry.periodFlow] = (flowCounts[entry.periodFlow] || 0) + 1;
    }
  }
  const flowDistribution = Object.entries(flowCounts)
    .map(([flow, count]) => ({ flow: flow as FlowLevel, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Top 3

  const productCounts: Record<string, number> = {};
  for (const entry of periodEntries) {
    for (const product of entry.productUsage) {
      const key = product.customProductId || product.productType;
      productCounts[key] = (productCounts[key] || 0) + 1;
    }
  }
  const productUsage = Object.entries(productCounts)
    .map(([product, count]) => ({ product, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Top 3

  const periodSymptomData: Record<string, { count: number; totalIntensity: number; intensityCount: number; days: Set<string> }> = {};
  
  for (const entry of periodEntries) {
    const dayName = getDayName(entry.date);
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      if (!periodSymptomData[symptom]) {
        periodSymptomData[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, days: new Set() };
      }
      periodSymptomData[symptom].count++;
      periodSymptomData[symptom].days.add(dayName);
      if (intensity !== null && intensity !== undefined) {
        periodSymptomData[symptom].totalIntensity += intensity;
        periodSymptomData[symptom].intensityCount++;
      }
    }
  }

  const periodSymptoms: SymptomStat[] = Object.entries(periodSymptomData)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgIntensity: data.intensityCount > 0 
        ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10 
        : null,
      days: Array.from(data.days),
    }))
    .sort((a, b) => (b.avgIntensity ?? 0) - (a.avgIntensity ?? 0)) // Sort by intensity
    .slice(0, 3); // Top 3

  const periodGeneralCoOccurrences: { periodSymptom: string; generalSymptoms: string[] }[] = [];
  
  for (const pSymptom of Object.keys(periodSymptomData)) {
    const coOccurringGeneral = new Map<string, number>();
    
    for (const entry of periodEntries) {
      if (entry.periodSymptomIntensities[pSymptom] !== undefined) {
        for (const gSymptom of Object.keys(entry.symptomIntensities)) {
          coOccurringGeneral.set(gSymptom, (coOccurringGeneral.get(gSymptom) || 0) + 1);
        }
      }
    }
    
    const topCoOccurring = Array.from(coOccurringGeneral.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([symptom]) => symptom);
    
    if (topCoOccurring.length > 0) {
      periodGeneralCoOccurrences.push({
        periodSymptom: pSymptom,
        generalSymptoms: topCoOccurring,
      });
    }
  }

  return {
    hasData: true,
    latestPhase: latest.cyclePhase,
    latestFlow: latest.periodFlow as FlowLevel | null,
    phaseProgression,
    flowDistribution,
    productUsage,
    periodSymptoms,
    periodGeneralCoOccurrences,
  };
}

/**
 * Calculate medicine-specific statistics
 */
function calculateMedicineStats(entries: StoredEntry[]): MedicineStats {
  const entriesWithMeds = entries.filter((e) => e.medicineLog.length > 0);

  if (entriesWithMeds.length === 0) {
    return {
      hasData: false,
      mostUsedMedicine: null,
      otherMedicines: [],
      coOccurringSymptoms: [],
    };
  }

  // Track medicine usage with extended data
  const medicineCounts: Record<string, { 
    id: string; 
    name: string; 
    count: number; 
    dosages: Set<string>;
    categories: Set<MedicineCategory>;
    days: Set<string>;
    timeOfDay: Record<string, number>;
  }> = {};

  const coOccurringSymptomData: Record<string, { 
    count: number; 
    totalIntensity: number; 
    intensityCount: number;
  }> = {};

  for (const entry of entriesWithMeds) {
    const dayName = getDayName(entry.date);
    
    for (const med of entry.medicineLog) {
      const key = med.medicineId;
      if (!medicineCounts[key]) {
        medicineCounts[key] = {
          id: med.medicineId,
          name: med.medicineName,
          count: 0,
          dosages: new Set(),
          categories: new Set(),
          days: new Set(),
          timeOfDay: {},
        };
      }
      medicineCounts[key].count++;
      medicineCounts[key].days.add(dayName);
      
      if (med.dosage) {
        medicineCounts[key].dosages.add(med.dosage);
      }
      
      // Track time of day if available
      if (med.time) {
        const period = getTimeOfDayPeriod(med.time);
        if (period) {
          medicineCounts[key].timeOfDay[period] = (medicineCounts[key].timeOfDay[period] || 0) + 1;
        }
      }
    }

    // Track co-occurring symptoms
    for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
      if (!coOccurringSymptomData[symptom]) {
        coOccurringSymptomData[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0 };
      }
      coOccurringSymptomData[symptom].count++;
      if (intensity !== null && intensity !== undefined) {
        coOccurringSymptomData[symptom].totalIntensity += intensity;
        coOccurringSymptomData[symptom].intensityCount++;
      }
    }
  }

  // Sort medicines by count
  const sortedMedicines = Object.values(medicineCounts)
    .sort((a, b) => b.count - a.count);

  const topMedicine = sortedMedicines[0];
  
  // Get other medicines (top 3 excluding the top one)
  const otherMedicines = sortedMedicines
    .slice(1, 4) // Top 3 others
    .map((m) => ({
      id: m.id,
      name: m.name,
      count: m.count,
    }));

  // Format time of day as sorted array
  const timeOfDayArray = topMedicine 
    ? Object.entries(topMedicine.timeOfDay)
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3) // Top 3
    : [];

  const coOccurringSymptoms = Object.entries(coOccurringSymptomData)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgIntensity: data.intensityCount > 0
        ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10
        : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Top 3

  return {
    hasData: true,
    mostUsedMedicine: topMedicine ? {
      id: topMedicine.id,
      name: topMedicine.name,
      count: topMedicine.count,
      dosages: Array.from(topMedicine.dosages).slice(0, 3), // Top 3 dosages
      categories: Array.from(topMedicine.categories),
      daysUsed: Array.from(topMedicine.days),
      timeOfDay: timeOfDayArray,
    } : null,
    otherMedicines,
    coOccurringSymptoms,
  };
}