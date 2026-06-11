// ============================================
// Monthly View Utilities
// ============================================

import type { StoredEntry, WeekStartDay, CyclePhase } from "@/types";
import { getLocalDateString } from "./dateUtils";

// ============================================
// HELPERS
// ============================================

/** Parse "heavy @ 4:44 PM" into { level: "heavy", startTime: "4:44 PM" } */
export function parseFlowValue(flow: string | null): { level: string; startTime: string | null } {
  if (!flow) return { level: '', startTime: null };
  const match = flow.match(/^(.+?)\s*@\s*(.+)$/);
  if (match) return { level: match[1].trim(), startTime: match[2].trim() };
  return { level: flow, startTime: null };
}

// ============================================
// TYPES
// ============================================

export interface MonthRange {
  /** First day of the month */
  start: Date;
  /** Last day of the month */
  end: Date;
  /** Start date as YYYY-MM-DD string */
  startStr: string;
  /** End date as YYYY-MM-DD string */
  endStr: string;
  /** Display label (e.g., "January 2025") */
  label: string;
  /** Short label (e.g., "Jan 2025") */
  shortLabel: string;
  /** Year */
  year: number;
  /** Month (0-11) */
  month: number;
}

export interface WeekWithinMonth {
  /** Week number within month (1-based) */
  weekNumber: number;
  /** Start date of the week */
  start: Date;
  /** End date of the week */
  end: Date;
  /** Label like "Jan 1-7" or "Jan 29 - Feb 4" */
  label: string;
  /** Start date as YYYY-MM-DD */
  startStr: string;
  /** End date as YYYY-MM-DD */
  endStr: string;
}

export interface MonthlyStats {
  totalEntries: number;
  uniqueSymptoms: number;
  totalSymptomOccurrences: number;
  highestIntensity: { symptom: string; intensity: number } | null;
  mostActiveDay: string | null;
  entriesByDay: Record<string, number>;
  timeOfDayDistribution: Record<string, number>;
  /** Average entries per day (for days with data) */
  avgEntriesPerDay: number;
  /** Days in month that have at least one entry */
  daysWithEntries: number;
}

export interface MonthlySymptomHeatMapData {
  symptom: string;
  /** Day number (1-31) -> intensity data */
  days: { 
    day: number; 
    dateStr: string;
    intensity: number | null; 
    logged: boolean;
    dayOfWeek: string;
  }[];
  totalLogged: number;
}

export interface BristolWeekData {
  week: WeekWithinMonth;
  /** Bristol types logged this week */
  types: number[];
  /** Average type for the week */
  avgType: number | null;
  /** Most common type */
  mostCommonType: number | null;
  /** Count of each type */
  typeCounts: Record<number, number>;
  /** Total BMs */
  totalBMs: number;
  /** Normal range count (types 3-4) */
  normalRangeCount: number;
}

export interface CyclePhaseSymptomData {
  symptom: string;
  /** Phase -> average intensity */
  phases: Record<string, { avgIntensity: number | null; count: number }>;
  isPeriodRelated: boolean;
}

export interface DetectedCycle {
  /** Start date of the cycle (first day of period) */
  startDate: string;
  /** End date of the cycle (day before next period starts, or ongoing) */
  endDate: string | null;
  /** Length in days (null if ongoing) */
  length: number | null;
  /** Whether this cycle is still ongoing */
  isOngoing: boolean;
  /** Flow data for this cycle */
  flowDays: { date: string; flow: string }[];
  /** Phases logged during this cycle */
  phasesLogged: Record<string, number>;
}

export interface CycleComparison {
  currentCycle: DetectedCycle | null;
  previousCycle: DetectedCycle | null;
  lengthChange: number | null;
  /** Symptom comparison between cycles */
  symptoms: {
    current: { name: string; count: number; avgIntensity: number | null }[];
    previous: { name: string; count: number; avgIntensity: number | null }[];
    newInCurrent: string[];
    resolvedFromPrevious: string[];
  };
  /** Flow pattern comparison */
  flowPattern: {
    current: Record<string, number>;
    previous: Record<string, number>;
  };
}

// ============================================
// MONTH NAVIGATION
// ============================================

/**
 * Get a specific month range (0 = current month, -1 = last month, etc.)
 * Uses calendar months, not rolling 30-day periods.
 */
export function getMonthRange(monthOffset: number = 0): MonthRange {
  const today = new Date();
  
  // Get the first day of the target month
  const start = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  start.setHours(0, 0, 0, 0);
  
  // Get the last day of the target month
  const end = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const shortMonthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  return {
    start,
    end,
    startStr: getLocalDateString(start),
    endStr: getLocalDateString(end),
    label: `${monthNames[start.getMonth()]} ${start.getFullYear()}`,
    shortLabel: `${shortMonthNames[start.getMonth()]} ${start.getFullYear()}`,
    year: start.getFullYear(),
    month: start.getMonth(),
  };
}

/**
 * Get entries for a specific month
 */
export function getEntriesForMonth(
  entries: StoredEntry[],
  monthOffset: number = 0
): StoredEntry[] {
  const { startStr, endStr } = getMonthRange(monthOffset);
  
  return entries
    .filter((entry) => entry.date >= startStr && entry.date <= endStr)
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : b.startTime.localeCompare(a.startTime);
    });
}

/**
 * Find the earliest and latest months with data
 * Returns month offsets (0 = current month, -1 = last month, etc.)
 */
export function getDataMonthBounds(
  entries: StoredEntry[]
): { earliest: number; latest: number } {
  if (entries.length === 0) {
    return { earliest: 0, latest: 0 };
  }
  
  const sortedDates = entries.map(e => e.date).sort();
  const earliestDate = sortedDates[0];
  const latestDate = sortedDates[sortedDates.length - 1];
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Parse earliest date
  const [earliestYear, earliestMonth] = earliestDate.split("-").map(Number);
  const earliestOffset = (earliestYear - currentYear) * 12 + (earliestMonth - 1 - currentMonth);
  
  // Parse latest date to find the latest month with data
  const [latestYear, latestMonth] = latestDate.split("-").map(Number);
  const latestOffset = (latestYear - currentYear) * 12 + (latestMonth - 1 - currentMonth);
  
  // Latest should not exceed 0 (current month)
  return { 
    earliest: earliestOffset, 
    latest: Math.min(latestOffset, 0) 
  };
}

/**
 * Get weeks within a month for Bristol trend chart
 * Weeks are based on user's week start preference
 * Includes partial weeks at start/end of month
 */
export function getWeeksInMonth(
  monthOffset: number = 0,
  weekStartDay: WeekStartDay = "sunday"
): WeekWithinMonth[] {
  const { start, end } = getMonthRange(monthOffset);
  const weeks: WeekWithinMonth[] = [];
  
  const weekStartIndex = weekStartDay === "sunday" ? 0 : 1;
  const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Find the first day of the first week that includes any day of the month
  let weekStart = new Date(start);
  const startDayOfWeek = weekStart.getDay();
  const daysToSubtract = weekStartDay === "sunday" 
    ? startDayOfWeek 
    : (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1);
  weekStart.setDate(weekStart.getDate() - daysToSubtract);
  weekStart.setHours(0, 0, 0, 0);
  
  let weekNumber = 1;
  
  while (weekStart <= end) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Format the label
    const startMonth = shortMonthNames[weekStart.getMonth()];
    const endMonth = shortMonthNames[weekEnd.getMonth()];
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    
    let label: string;
    if (startMonth === endMonth) {
      label = `${startMonth} ${startDay}-${endDay}`;
    } else {
      label = `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
    
    weeks.push({
      weekNumber,
      start: new Date(weekStart),
      end: new Date(weekEnd),
      label,
      startStr: getLocalDateString(weekStart),
      endStr: getLocalDateString(weekEnd),
    });
    
    // Move to next week
    weekStart.setDate(weekStart.getDate() + 7);
    weekNumber++;
    
    // Safety check to prevent infinite loops
    if (weekNumber > 6) break;
  }
  
  return weeks;
}

// ============================================
// MONTHLY STATS
// ============================================

/**
 * Calculate aggregate statistics for a month
 */
export function calculateMonthlyStats(entries: StoredEntry[]): MonthlyStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      uniqueSymptoms: 0,
      totalSymptomOccurrences: 0,
      highestIntensity: null,
      mostActiveDay: null,
      entriesByDay: {},
      timeOfDayDistribution: {},
      avgEntriesPerDay: 0,
      daysWithEntries: 0,
    };
  }
  
  const symptomSet = new Set<string>();
  let totalOccurrences = 0;
  let highestIntensity: { symptom: string; intensity: number } | null = null;
  const entriesByDay: Record<string, number> = {};
  const timeOfDayDist: Record<string, number> = {};
  const datesWithEntries = new Set<string>();
  
  for (const entry of entries) {
    // Track unique dates
    datesWithEntries.add(entry.date);
    
    // Count by day of week
    const date = new Date(entry.date + "T12:00:00");
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    entriesByDay[dayName] = (entriesByDay[dayName] || 0) + 1;
    
    // Time of day distribution
    if (entry.startTime) {
      const [hourStr] = entry.startTime.split(":");
      const hour = parseInt(hourStr, 10);
      let period: string;
      if (hour >= 5 && hour < 12) period = "Morning";
      else if (hour >= 12 && hour < 17) period = "Afternoon";
      else if (hour >= 17 && hour < 21) period = "Evening";
      else period = "Night";
      timeOfDayDist[period] = (timeOfDayDist[period] || 0) + 1;
    }
    
    // Symptoms
    for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
      symptomSet.add(symptom);
      totalOccurrences++;
      if (intensity !== null && (!highestIntensity || intensity > highestIntensity.intensity)) {
        highestIntensity = { symptom, intensity };
      }
    }
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      symptomSet.add(symptom);
      totalOccurrences++;
      if (intensity !== null && (!highestIntensity || intensity > highestIntensity.intensity)) {
        highestIntensity = { symptom, intensity };
      }
    }
  }
  
  // Find most active day of week
  let mostActiveDay: string | null = null;
  let maxEntries = 0;
  for (const [day, count] of Object.entries(entriesByDay)) {
    if (count > maxEntries) {
      mostActiveDay = day;
      maxEntries = count;
    }
  }
  
  const daysWithEntries = datesWithEntries.size;
  
  return {
    totalEntries: entries.length,
    uniqueSymptoms: symptomSet.size,
    totalSymptomOccurrences: totalOccurrences,
    highestIntensity,
    mostActiveDay,
    entriesByDay,
    timeOfDayDistribution: timeOfDayDist,
    avgEntriesPerDay: daysWithEntries > 0 ? Math.round((entries.length / daysWithEntries) * 10) / 10 : 0,
    daysWithEntries,
  };
}

// ============================================
// MONTH COMPARISON TYPES
// ============================================

export interface SymptomMonthData {
  uniqueCount: number;
  totalOccurrences: number;
  avgIntensity: number | null;
  topByCount: { name: string; count: number; avgIntensity: number | null }[];
  topByIntensity: { name: string; avgIntensity: number; count: number }[];
}

export interface BowelMonthData {
  totalBMs: number;
  mostCommonType: number | null;
  avgType: number | null;
  normalRangeCount: number | null;
  normalRangePercent: number | null;
  timeDistribution: Record<string, number>;
  mostCommonFeeling: string | null;
  feelingDistribution: Record<string, number>;
}

export interface CycleMonthData {
  hasData: boolean;
  dominantPhase: string | null;
  daysLogged: number;
  flowDays: number;
  phaseDistribution: Record<string, number>;
  flowDistribution: Record<string, number>;
  /** First flow start time found in the month (parsed from "heavy @ time") */
  flowStartTime: string | null;
}

export interface MedicineMonthData {
  totalDoses: number;
  topMedicine: string | null;
  daysWithMedicine: number;
  uniqueMedicines: number;
  timeDistribution: Record<string, number>;
}

export interface MonthComparison {
  symptoms: {
    thisMonth: SymptomMonthData;
    lastMonth: SymptomMonthData;
    newSymptoms: { name: string; isPeriodRelated: boolean }[];
    resolvedSymptoms: { name: string; isPeriodRelated: boolean }[];
    intensityChange: number | null;
  };
  bowel: {
    thisMonth: BowelMonthData;
    lastMonth: BowelMonthData;
    typeShift: { from: number | null; to: number | null } | null;
    trendTowardNormal: boolean | null;
    trendIsSignificant: boolean;

  };
  cycle: {
    thisMonth: CycleMonthData;
    lastMonth: CycleMonthData;
    phaseChanged: boolean;
  };
  medicine: {
    thisMonth: MedicineMonthData;
    lastMonth: MedicineMonthData;
    newMedicines: string[];
    stoppedMedicines: string[];
    doseChange: number;
  };
}

// ============================================
// MONTH COMPARISON
// ============================================

/**
 * Compare two months of entries across all 4 categories
 */
export function compareMonths(
  currentEntries: StoredEntry[],
  previousEntries: StoredEntry[]
): MonthComparison {
  // ===== SYMPTOMS =====
  const buildSymptomData = (entries: StoredEntry[]): SymptomMonthData & { symptoms: Map<string, boolean> } => {
    const symptoms = new Map<string, boolean>();
    let totalIntensity = 0;
    let intensityCount = 0;
    let totalOccurrences = 0;
    
    const symptomStats: Record<string, { totalIntensity: number; intensityCount: number; count: number }> = {};

    for (const entry of entries) {
      for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
        if (!symptoms.has(symptom)) symptoms.set(symptom, false);
        totalOccurrences++;
        
        if (!symptomStats[symptom]) {
          symptomStats[symptom] = { totalIntensity: 0, intensityCount: 0, count: 0 };
        }
        symptomStats[symptom].count++;
        
        if (intensity !== null) {
          totalIntensity += intensity;
          intensityCount++;
          symptomStats[symptom].totalIntensity += intensity;
          symptomStats[symptom].intensityCount++;
        }
      }
      
      for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
        symptoms.set(symptom, true);
        totalOccurrences++;
        
        if (!symptomStats[symptom]) {
          symptomStats[symptom] = { totalIntensity: 0, intensityCount: 0, count: 0 };
        }
        symptomStats[symptom].count++;
        
        if (intensity !== null) {
          totalIntensity += intensity;
          intensityCount++;
          symptomStats[symptom].totalIntensity += intensity;
          symptomStats[symptom].intensityCount++;
        }
      }
    }

    const topByCount = Object.entries(symptomStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgIntensity: data.intensityCount > 0 
          ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10 
          : null,
      }))
      .sort((a, b) => b.count - a.count);

    const topByIntensity = Object.entries(symptomStats)
      .filter(([, data]) => data.intensityCount > 0)
      .map(([name, data]) => ({
        name,
        avgIntensity: Math.round((data.totalIntensity / data.intensityCount) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => b.avgIntensity - a.avgIntensity);

    return {
      uniqueCount: symptoms.size,
      totalOccurrences,
      avgIntensity: intensityCount > 0 
        ? Math.round((totalIntensity / intensityCount) * 10) / 10 
        : null,
      symptoms,
      topByCount,
      topByIntensity,
    };
  };

  const thisMonthSymptoms = buildSymptomData(currentEntries);
  const lastMonthSymptoms = buildSymptomData(previousEntries);

  const newSymptoms: { name: string; isPeriodRelated: boolean }[] = [];
  const resolvedSymptoms: { name: string; isPeriodRelated: boolean }[] = [];

  for (const [symptom, isPeriodRelated] of thisMonthSymptoms.symptoms) {
    if (!lastMonthSymptoms.symptoms.has(symptom)) {
      newSymptoms.push({ name: symptom, isPeriodRelated });
    }
  }

  for (const [symptom, isPeriodRelated] of lastMonthSymptoms.symptoms) {
    if (!thisMonthSymptoms.symptoms.has(symptom)) {
      resolvedSymptoms.push({ name: symptom, isPeriodRelated });
    }
  }

  const intensityChange = 
    thisMonthSymptoms.avgIntensity !== null && lastMonthSymptoms.avgIntensity !== null
      ? Math.round((thisMonthSymptoms.avgIntensity - lastMonthSymptoms.avgIntensity) * 10) / 10
      : null;

  // ===== BOWEL =====
  const buildBowelData = (entries: StoredEntry[]): BowelMonthData => {
    const types: number[] = [];
    const typeCounts: Record<number, number> = {};
    const timeDistribution: Record<string, number> = {};
    const feelingCounts: Record<string, number> = {};
    let normalRangeCount = 0;

    for (const entry of entries) {
      if (entry.stoolType) {
        types.push(entry.stoolType);
        typeCounts[entry.stoolType] = (typeCounts[entry.stoolType] || 0) + 1;
        
        if (entry.stoolType === 3 || entry.stoolType === 4) {
          normalRangeCount++;
        }
        
        if (entry.startTime) {
          const [hourStr] = entry.startTime.split(":");
          const hour = parseInt(hourStr, 10);
          let period: string;
          if (hour >= 5 && hour < 12) period = "Morning";
          else if (hour >= 12 && hour < 17) period = "Afternoon";
          else if (hour >= 17 && hour < 21) period = "Evening";
          else period = "Night";
          timeDistribution[period] = (timeDistribution[period] || 0) + 1;
        }
        
        // Track feelings
        if (entry.stoolFeeling) {
          feelingCounts[entry.stoolFeeling] = (feelingCounts[entry.stoolFeeling] || 0) + 1;
        }
      }
    }

    let mostCommonType: number | null = null;
    let maxTypeCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxTypeCount) {
        maxTypeCount = count;
        mostCommonType = Number(type);
      }
    }

    let mostCommonFeeling: string | null = null;
    let maxFeelingCount = 0;
    for (const [feeling, count] of Object.entries(feelingCounts)) {
      if (count > maxFeelingCount) {
        maxFeelingCount = count;
        mostCommonFeeling = feeling;
      }
    }

    const avgType = types.length > 0
      ? Math.round((types.reduce((a, b) => a + b, 0) / types.length) * 10) / 10
      : null;

    return { 
      totalBMs: types.length, 
      mostCommonType, 
      avgType,
      normalRangeCount: types.length > 0 ? normalRangeCount : null,
      normalRangePercent: types.length > 0 ? Math.round((normalRangeCount / types.length) * 100) : null,
      timeDistribution,
      mostCommonFeeling,
      feelingDistribution: feelingCounts,
    };
  };

  const thisMonthBowel = buildBowelData(currentEntries);
  const lastMonthBowel = buildBowelData(previousEntries);

  // Calculate trend based on normal range percentage with significance threshold
  let trendTowardNormal: boolean | null = null;
  let bowelTrendIsSignificant: boolean = false;
  
  if (thisMonthBowel.normalRangePercent !== null && lastMonthBowel.normalRangePercent !== null) {
    const percentChange = thisMonthBowel.normalRangePercent - lastMonthBowel.normalRangePercent;
    // Only consider it significant if there's at least a 10% change in normal range percentage
    if (Math.abs(percentChange) >= 10) {
      trendTowardNormal = percentChange > 0; // Higher % normal = trending toward normal
      bowelTrendIsSignificant = true;
    }
  } else if (thisMonthBowel.avgType !== null && lastMonthBowel.avgType !== null) {
    // Fallback to avgType if normalRangePercent not available
    const thisDistance = Math.abs(thisMonthBowel.avgType - 3.5);
    const lastDistance = Math.abs(lastMonthBowel.avgType - 3.5);
    const distanceChange = lastDistance - thisDistance;
    // Only significant if distance changed by at least 0.5
    if (Math.abs(distanceChange) >= 0.5) {
      trendTowardNormal = distanceChange > 0;
      bowelTrendIsSignificant = true;
    }
  }

  const typeShift =
    thisMonthBowel.mostCommonType !== lastMonthBowel.mostCommonType &&
    (thisMonthBowel.mostCommonType !== null || lastMonthBowel.mostCommonType !== null)
      ? { from: lastMonthBowel.mostCommonType, to: thisMonthBowel.mostCommonType }
      : null;

  // ===== CYCLE =====
  const buildCycleData = (entries: StoredEntry[]): CycleMonthData => {
    const daysWithData = new Set<string>();

    // Track unique dates per phase (for accurate day counting)
    const dateToPhase: Record<string, string> = {};
    const dateToFlow: Record<string, string> = {};
    let firstFlowStartTime: string | null = null;

    // Priority order for phases when multiple logged on same day
    // Menstrual > Ovulation > Follicular > Luteal > Not Sure
    const phasePriority: Record<string, number> = {
      menstrual: 5,
      ovulation: 4,
      follicular: 3,
      luteal: 2,
      not_sure: 1,
    };

    for (const entry of entries) {
      if (entry.cyclePhase) {
        daysWithData.add(entry.date);
        // Use priority-based selection if multiple phases on same day
        const existingPhase = dateToPhase[entry.date];
        const existingPriority = existingPhase ? (phasePriority[existingPhase] || 0) : 0;
        const newPriority = phasePriority[entry.cyclePhase] || 0;
        if (newPriority > existingPriority) {
          dateToPhase[entry.date] = entry.cyclePhase;
        }
      }
      if (entry.periodFlow) {
        daysWithData.add(entry.date);
        const parsed = parseFlowValue(entry.periodFlow);
        // Keep the first flow logged for the day (or could use heaviest)
        if (!dateToFlow[entry.date]) {
          dateToFlow[entry.date] = parsed.level;
        }
        // Capture first flow start time found
        if (!firstFlowStartTime && parsed.startTime) {
          firstFlowStartTime = parsed.startTime;
        }
      }
    }

    // Count phases by unique dates
    const phaseDistribution: Record<string, number> = {};
    for (const phase of Object.values(dateToPhase)) {
      phaseDistribution[phase] = (phaseDistribution[phase] || 0) + 1;
    }

    // Count flows by unique dates (uses parsed level, not raw value)
    const flowDistribution: Record<string, number> = {};
    for (const flow of Object.values(dateToFlow)) {
      flowDistribution[flow] = (flowDistribution[flow] || 0) + 1;
    }

    // Count period days as unique dates with menstrual phase
    const periodDays = Object.values(dateToPhase).filter(phase => phase === "menstrual").length;

    let dominantPhase: string | null = null;
    let maxPhaseCount = 0;
    for (const [phase, count] of Object.entries(phaseDistribution)) {
      if (count > maxPhaseCount) {
        maxPhaseCount = count;
        dominantPhase = phase;
      }
    }

    return {
      hasData: daysWithData.size > 0,
      dominantPhase,
      daysLogged: periodDays, // Changed: now represents period days, not total days with any cycle data
      flowDays: Object.keys(dateToFlow).length, // Unique days with flow logged
      phaseDistribution,
      flowDistribution,
      flowStartTime: firstFlowStartTime,
    };
  };

  const thisMonthCycle = buildCycleData(currentEntries);
  const lastMonthCycle = buildCycleData(previousEntries);

  const phaseChanged = 
    thisMonthCycle.dominantPhase !== lastMonthCycle.dominantPhase &&
    (thisMonthCycle.dominantPhase !== null || lastMonthCycle.dominantPhase !== null);

  // ===== MEDICINE =====
  const buildMedicineData = (entries: StoredEntry[]): MedicineMonthData & { medicines: Set<string> } => {
    const medicineCounts: Record<string, number> = {};
    const daysWithMedicine = new Set<string>();
    const medicines = new Set<string>();
    const timeDistribution: Record<string, number> = {};

    for (const entry of entries) {
      for (const log of entry.medicineLog) {
        medicines.add(log.medicineName);
        medicineCounts[log.medicineName] = (medicineCounts[log.medicineName] || 0) + 1;
        daysWithMedicine.add(entry.date);
        
        let hour: number | null = null;
        
        if (log.time) {
          hour = log.time.period === "PM" && log.time.hour !== 12 
            ? log.time.hour + 12 
            : log.time.period === "AM" && log.time.hour === 12 
              ? 0 
              : log.time.hour;
        } else if (entry.startTime) {
          const [hourStr] = entry.startTime.split(":");
          hour = parseInt(hourStr, 10);
        }
        
        if (hour !== null) {
          let period: string;
          if (hour >= 5 && hour < 12) period = "Morning";
          else if (hour >= 12 && hour < 17) period = "Afternoon";
          else if (hour >= 17 && hour < 21) period = "Evening";
          else period = "Night";
          timeDistribution[period] = (timeDistribution[period] || 0) + 1;
        }
      }
    }

    let topMedicine: string | null = null;
    let maxCount = 0;
    for (const [name, count] of Object.entries(medicineCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topMedicine = name;
      }
    }

    const totalDoses = Object.values(medicineCounts).reduce((sum, c) => sum + c, 0);

    return {
      totalDoses,
      topMedicine,
      daysWithMedicine: daysWithMedicine.size,
      uniqueMedicines: medicines.size,
      medicines,
      timeDistribution,
    };
  };

  const thisMonthMedicine = buildMedicineData(currentEntries);
  const lastMonthMedicine = buildMedicineData(previousEntries);

  const newMedicines = Array.from(thisMonthMedicine.medicines)
    .filter(m => !lastMonthMedicine.medicines.has(m));
  const stoppedMedicines = Array.from(lastMonthMedicine.medicines)
    .filter(m => !thisMonthMedicine.medicines.has(m));
  const doseChange = thisMonthMedicine.totalDoses - lastMonthMedicine.totalDoses;

  // ===== RETURN =====
  return {
    symptoms: {
      thisMonth: {
        uniqueCount: thisMonthSymptoms.uniqueCount,
        totalOccurrences: thisMonthSymptoms.totalOccurrences,
        avgIntensity: thisMonthSymptoms.avgIntensity,
        topByCount: thisMonthSymptoms.topByCount,
        topByIntensity: thisMonthSymptoms.topByIntensity,
      },
      lastMonth: {
        uniqueCount: lastMonthSymptoms.uniqueCount,
        totalOccurrences: lastMonthSymptoms.totalOccurrences,
        avgIntensity: lastMonthSymptoms.avgIntensity,
        topByCount: lastMonthSymptoms.topByCount,
        topByIntensity: lastMonthSymptoms.topByIntensity,
      },
      newSymptoms,
      resolvedSymptoms,
      intensityChange,
    },
    bowel: {
      thisMonth: thisMonthBowel,
      lastMonth: lastMonthBowel,
      typeShift,
      trendTowardNormal,
      trendIsSignificant: bowelTrendIsSignificant,
    },
    cycle: {
      thisMonth: thisMonthCycle,
      lastMonth: lastMonthCycle,
      phaseChanged,
    },
    medicine: {
      thisMonth: {
        totalDoses: thisMonthMedicine.totalDoses,
        topMedicine: thisMonthMedicine.topMedicine,
        daysWithMedicine: thisMonthMedicine.daysWithMedicine,
        uniqueMedicines: thisMonthMedicine.uniqueMedicines,
        timeDistribution: thisMonthMedicine.timeDistribution,
      },
      lastMonth: {
        totalDoses: lastMonthMedicine.totalDoses,
        topMedicine: lastMonthMedicine.topMedicine,
        daysWithMedicine: lastMonthMedicine.daysWithMedicine,
        uniqueMedicines: lastMonthMedicine.uniqueMedicines,
        timeDistribution: lastMonthMedicine.timeDistribution,
      },
      newMedicines,
      stoppedMedicines,
      doseChange,
    },
  };
}

// ============================================
// BRISTOL WEEKLY TREND DATA
// ============================================

/**
 * Build Bristol trend data grouped by weeks within a month
 * X-axis: weeks (e.g., "Jan 1-7", "Jan 8-14")
 * Y-axis: Bristol types or averages
 */
export function buildBristolWeeklyTrend(
  entries: StoredEntry[],
  monthOffset: number = 0,
  weekStartDay: WeekStartDay = "sunday"
): BristolWeekData[] {
  const weeks = getWeeksInMonth(monthOffset, weekStartDay);
  
  return weeks.map(week => {
    const weekEntries = entries.filter(entry => {
      return entry.date >= week.startStr && entry.date <= week.endStr;
    });
    
    const types: number[] = [];
    const typeCounts: Record<number, number> = {};
    let normalRangeCount = 0;
    
    for (const entry of weekEntries) {
      if (entry.stoolType) {
        types.push(entry.stoolType);
        typeCounts[entry.stoolType] = (typeCounts[entry.stoolType] || 0) + 1;
        if (entry.stoolType === 3 || entry.stoolType === 4) {
          normalRangeCount++;
        }
      }
    }
    
    let mostCommonType: number | null = null;
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = Number(type);
      }
    }
    
    const avgType = types.length > 0
      ? Math.round((types.reduce((a, b) => a + b, 0) / types.length) * 10) / 10
      : null;
    
    return {
      week,
      types,
      avgType,
      mostCommonType,
      typeCounts,
      totalBMs: types.length,
      normalRangeCount,
    };
  });
}

// ============================================
// SYMPTOM HEAT MAP FOR MONTH
// ============================================

/**
 * Build symptom heat map data for an entire month
 * Shows intensity by day of month
 */
export function buildMonthlySymptomHeatMap(
  entries: StoredEntry[],
  monthOffset: number = 0
): MonthlySymptomHeatMapData[] {
  const { start, end } = getMonthRange(monthOffset);
  const daysInMonth = end.getDate();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Build day info for each day of month
  const dayInfo: { day: number; dateStr: string; dayOfWeek: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(start.getFullYear(), start.getMonth(), d);
    dayInfo.push({
      day: d,
      dateStr: getLocalDateString(date),
      dayOfWeek: dayNames[date.getDay()],
    });
  }
  
  // Collect all symptoms and their daily data
  const symptomMap: Record<string, Record<number, { intensity: number | null; logged: boolean }>> = {};
  
  for (const entry of entries) {
    const entryDate = new Date(entry.date + "T12:00:00");
    const dayOfMonth = entryDate.getDate();
    
    // General symptoms
    for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
      if (!symptomMap[symptom]) {
        symptomMap[symptom] = {};
        for (let d = 1; d <= daysInMonth; d++) {
          symptomMap[symptom][d] = { intensity: null, logged: false };
        }
      }
      symptomMap[symptom][dayOfMonth] = { 
        intensity: intensity ?? symptomMap[symptom][dayOfMonth].intensity, 
        logged: true 
      };
    }
    
    // Period symptoms
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      if (!symptomMap[symptom]) {
        symptomMap[symptom] = {};
        for (let d = 1; d <= daysInMonth; d++) {
          symptomMap[symptom][d] = { intensity: null, logged: false };
        }
      }
      symptomMap[symptom][dayOfMonth] = { 
        intensity: intensity ?? symptomMap[symptom][dayOfMonth].intensity, 
        logged: true 
      };
    }
  }
  
  // Convert to array format
  return Object.entries(symptomMap)
    .map(([symptom, dayData]) => ({
      symptom,
      days: dayInfo.map(info => ({
        ...info,
        intensity: dayData[info.day]?.intensity ?? null,
        logged: dayData[info.day]?.logged ?? false,
      })),
      totalLogged: Object.values(dayData).filter(d => d.logged).length,
    }))
    .sort((a, b) => b.totalLogged - a.totalLogged);
}

// ============================================
// CYCLE PHASE × SYMPTOM HEAT MAP
// ============================================

/**
 * Build heat map showing average symptom intensity by cycle phase
 * Helps users identify patterns like "headaches during luteal phase"
 */
export function buildCyclePhaseSymptomHeatMap(
  entries: StoredEntry[]
): CyclePhaseSymptomData[] {
  const phases: CyclePhase[] = ["menstrual", "follicular", "ovulation", "luteal"];
  
  // Track symptom data per phase
  const symptomPhaseData: Record<string, {
    isPeriodRelated: boolean;
    phases: Record<string, { totalIntensity: number; intensityCount: number; count: number }>;
  }> = {};
  
  for (const entry of entries) {
    if (!entry.cyclePhase || entry.cyclePhase === "not_sure") continue;
    
    const phase = entry.cyclePhase;
    
    // General symptoms
    for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
      if (!symptomPhaseData[symptom]) {
        symptomPhaseData[symptom] = {
          isPeriodRelated: false,
          phases: {},
        };
        for (const p of phases) {
          symptomPhaseData[symptom].phases[p] = { totalIntensity: 0, intensityCount: 0, count: 0 };
        }
      }
      
      symptomPhaseData[symptom].phases[phase].count++;
      if (intensity !== null) {
        symptomPhaseData[symptom].phases[phase].totalIntensity += intensity;
        symptomPhaseData[symptom].phases[phase].intensityCount++;
      }
    }
    
    // Period symptoms
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      if (!symptomPhaseData[symptom]) {
        symptomPhaseData[symptom] = {
          isPeriodRelated: true,
          phases: {},
        };
        for (const p of phases) {
          symptomPhaseData[symptom].phases[p] = { totalIntensity: 0, intensityCount: 0, count: 0 };
        }
      }
      symptomPhaseData[symptom].isPeriodRelated = true;
      
      symptomPhaseData[symptom].phases[phase].count++;
      if (intensity !== null) {
        symptomPhaseData[symptom].phases[phase].totalIntensity += intensity;
        symptomPhaseData[symptom].phases[phase].intensityCount++;
      }
    }
  }
  
  // Convert to output format
  return Object.entries(symptomPhaseData)
    .map(([symptom, data]) => ({
      symptom,
      isPeriodRelated: data.isPeriodRelated,
      phases: Object.fromEntries(
        Object.entries(data.phases).map(([phase, stats]) => [
          phase,
          {
            avgIntensity: stats.intensityCount > 0
              ? Math.round((stats.totalIntensity / stats.intensityCount) * 10) / 10
              : null,
            count: stats.count,
          },
        ])
      ),
    }))
    .filter(s => Object.values(s.phases).some(p => p.count > 0))
    .sort((a, b) => {
      // Sort by total count across all phases
      const aTotal = Object.values(a.phases).reduce((sum, p) => sum + p.count, 0);
      const bTotal = Object.values(b.phases).reduce((sum, p) => sum + p.count, 0);
      return bTotal - aTotal;
    });
}

// ============================================
// CYCLE DETECTION & COMPARISON
// ============================================

/**
 * Detect cycle boundaries from period flow data
 * A new cycle starts when periodFlow is logged after 5+ days without flow
 */
// /lib/monthlyUtils.ts

/**
 * Detect cycle boundaries from period data
 * A new cycle starts when:
 * - periodFlow is logged after 5+ days without flow/menstrual phase, OR
 * - cyclePhase === "menstrual" is logged after 5+ days without flow/menstrual phase
 */
export function detectCycleBoundaries(entries: StoredEntry[]): DetectedCycle[] {
  // Phase priority for when multiple phases logged on same day
  const phasePriority: Record<string, number> = {
    menstrual: 5,
    ovulation: 4,
    follicular: 3,
    luteal: 2,
    not_sure: 1,
  };

  // Flow priority (use heaviest flow if multiple on same day)
  const flowPriority: Record<string, number> = {
    heavy: 4,
    medium: 3,
    light: 2,
    spotting: 1,
  };

  // First, deduplicate entries by date - one flow and one phase per day
  const dateToFlow: Record<string, string> = {};
  const dateToPhase: Record<string, string> = {};
  
  // NEW: Track ALL period days (either flow logged OR menstrual phase)
  const periodDates = new Set<string>();
  
  for (const entry of entries) {
    if (entry.periodFlow) {
      const parsed = parseFlowValue(entry.periodFlow);
      const existingFlow = dateToFlow[entry.date];
      const existingPriority = existingFlow ? (flowPriority[existingFlow] || 0) : 0;
      const newPriority = flowPriority[parsed.level] || 0;
      if (newPriority > existingPriority) {
        dateToFlow[entry.date] = parsed.level;
      }
      // Mark as period day
      periodDates.add(entry.date);
    }
    if (entry.cyclePhase) {
      const existingPhase = dateToPhase[entry.date];
      const existingPriority = existingPhase ? (phasePriority[existingPhase] || 0) : 0;
      const newPriority = phasePriority[entry.cyclePhase] || 0;
      if (newPriority > existingPriority) {
        dateToPhase[entry.date] = entry.cyclePhase;
      }
      // NEW: If phase is menstrual, also treat as period day for cycle detection
      if (entry.cyclePhase === "menstrual") {
        periodDates.add(entry.date);
      }
    }
  }

  // NEW: Get unique period dates sorted (includes both flow AND menstrual phase entries)
  const sortedPeriodDates = Array.from(periodDates).sort();
  
  if (sortedPeriodDates.length === 0) return [];
  
  const cycles: DetectedCycle[] = [];
  let currentCycleStart: string | null = null;
  let lastPeriodDate: string | null = null;
  let currentFlowDays: { date: string; flow: string }[] = [];
  let currentPhasesLogged: Record<string, number> = {};
  
  for (const entryDate of sortedPeriodDates) {
    
    // Check if this is a new cycle (5+ day gap from last period day)
    if (lastPeriodDate) {
      const lastDate = new Date(lastPeriodDate + "T12:00:00");
      const currentDate = new Date(entryDate + "T12:00:00");
      const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 5) {
        // Close previous cycle and start new one
        if (currentCycleStart) {
          const startDate = new Date(currentCycleStart + "T12:00:00");
          // End date is the day before new cycle starts
          const cycleEndDate = new Date(entryDate + "T12:00:00");
          cycleEndDate.setDate(cycleEndDate.getDate() - 1);
          
          cycles.push({
            startDate: currentCycleStart,
            endDate: getLocalDateString(cycleEndDate),
            length: Math.floor((cycleEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
            isOngoing: false,
            flowDays: [...currentFlowDays],
            phasesLogged: { ...currentPhasesLogged },
          });
        }
        
        // Start new cycle
        currentCycleStart = entryDate;
        currentFlowDays = [];
        currentPhasesLogged = {};
      }
    } else {
      // First period entry = start of first cycle
      currentCycleStart = entryDate;
    }
    
    // Track flow data (if flow was logged for this date)
    if (dateToFlow[entryDate]) {
      currentFlowDays.push({ date: entryDate, flow: dateToFlow[entryDate] });
    }
    
    // Track phase data (if phase was logged for this date)
    const phase = dateToPhase[entryDate];
    if (phase) {
      currentPhasesLogged[phase] = (currentPhasesLogged[phase] || 0) + 1;
    }
    
    lastPeriodDate = entryDate;
  }
  
  // Close the last cycle (ongoing)
  if (currentCycleStart) {
    cycles.push({
      startDate: currentCycleStart,
      endDate: null,
      length: null,
      isOngoing: true,
      flowDays: currentFlowDays,
      phasesLogged: currentPhasesLogged,
    });
  }
  
  return cycles;
}

/**
 * Compare current cycle to previous cycle
 * Returns null if not enough data
 */
export function compareCycles(
  entries: StoredEntry[],
  cycles: DetectedCycle[]
): CycleComparison | null {
  if (cycles.length < 1) return null;
  
  const currentCycle = cycles[cycles.length - 1];
  const previousCycle = cycles.length >= 2 ? cycles[cycles.length - 2] : null;
  
  // Get entries for each cycle
  const getEntriesForCycle = (cycle: DetectedCycle): StoredEntry[] => {
    const endDate = cycle.endDate || getLocalDateString(new Date());
    return entries.filter(e => e.date >= cycle.startDate && e.date <= endDate);
  };
  
  const currentEntries = getEntriesForCycle(currentCycle);
  const previousEntries = previousCycle ? getEntriesForCycle(previousCycle) : [];
  
    // Build symptom data for each cycle - deduplicate by date
  // Count unique days a symptom was logged, use highest intensity per day
  const buildCycleSymptomData = (cycleEntries: StoredEntry[]) => {
    // First pass: collect max intensity per symptom per date
    const symptomDateIntensity: Record<string, Record<string, number | null>> = {};
    
    for (const entry of cycleEntries) {
      for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
        if (!symptomDateIntensity[symptom]) {
          symptomDateIntensity[symptom] = {};
        }
        const existing = symptomDateIntensity[symptom][entry.date];
        if (existing === undefined || (intensity !== null && (existing === null || intensity > existing))) {
          symptomDateIntensity[symptom][entry.date] = intensity;
        }
      }
      for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
        if (!symptomDateIntensity[symptom]) {
          symptomDateIntensity[symptom] = {};
        }
        const existing = symptomDateIntensity[symptom][entry.date];
        if (existing === undefined || (intensity !== null && (existing === null || intensity > existing))) {
          symptomDateIntensity[symptom][entry.date] = intensity;
        }
      }
    }
    
    // Second pass: build stats from deduplicated data
    const symptomStats: Record<string, { count: number; totalIntensity: number; intensityCount: number }> = {};
    
    for (const [symptom, dateMap] of Object.entries(symptomDateIntensity)) {
      symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0 };
      for (const intensity of Object.values(dateMap)) {
        symptomStats[symptom].count++;
        if (intensity !== null) {
          symptomStats[symptom].totalIntensity += intensity;
          symptomStats[symptom].intensityCount++;
        }
      }
    }
    
    return Object.entries(symptomStats)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgIntensity: stats.intensityCount > 0
          ? Math.round((stats.totalIntensity / stats.intensityCount) * 10) / 10
          : null,
      }))
      .sort((a, b) => b.count - a.count);
  };
  
  const currentSymptoms = buildCycleSymptomData(currentEntries);
  const previousSymptoms = buildCycleSymptomData(previousEntries);
  
  const currentSymptomNames = new Set(currentSymptoms.map(s => s.name));
  const previousSymptomNames = new Set(previousSymptoms.map(s => s.name));
  
  const newInCurrent = Array.from(currentSymptomNames).filter(s => !previousSymptomNames.has(s));
  const resolvedFromPrevious = Array.from(previousSymptomNames).filter(s => !currentSymptomNames.has(s));
  
  // Flow pattern comparison - deduplicate by date
  const buildFlowPattern = (flowDays: { date: string; flow: string }[]): Record<string, number> => {
    const pattern: Record<string, number> = {};
    const seenDates = new Set<string>();
    for (const day of flowDays) {
      if (!seenDates.has(day.date)) {
        seenDates.add(day.date);
        pattern[day.flow] = (pattern[day.flow] || 0) + 1;
      }
    }
    return pattern;
  };
  
  return {
    currentCycle,
    previousCycle,
    lengthChange: previousCycle?.length && currentCycle.length
      ? currentCycle.length - previousCycle.length
      : null,
    symptoms: {
      current: currentSymptoms,
      previous: previousSymptoms,
      newInCurrent,
      resolvedFromPrevious,
    },
    flowPattern: {
      current: buildFlowPattern(currentCycle.flowDays),
      previous: previousCycle ? buildFlowPattern(previousCycle.flowDays) : {},
    },
  };
}