// ============================================
// Weekly View Utilities
// ============================================

import type { StoredEntry, WeekStartDay } from "@/types";
import { getLocalDateString } from "./dateUtils";

// ============================================
// TYPES
// ============================================

export interface WeekRange {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  label: string;
}

export interface SymptomHeatMapData {
  symptom: string;
  days: { day: string; intensity: number | null; logged: boolean }[];
}

export interface WeeklyStats {
  totalEntries: number;
  uniqueSymptoms: number;
  totalSymptomOccurrences: number;
  highestIntensity: { symptom: string; intensity: number } | null;
  mostActiveDay: string | null;
  entriesByDay: Record<string, number>;
  timeOfDayDistribution: Record<string, number>;
}

// ============================================
// WEEK NAVIGATION
// ============================================

/**
 * Get a specific week range (0 = current week, -1 = last week, etc.)
 */
export function getWeekRange(weekStartDay: WeekStartDay, weekOffset: number = 0): WeekRange {
  const today = new Date();
  const currentDay = today.getDay();
  
  let daysToSubtract: number;
  if (weekStartDay === "sunday") {
    daysToSubtract = currentDay;
  } else {
    daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
  }
  
  const start = new Date(today);
  start.setDate(today.getDate() - daysToSubtract + (weekOffset * 7));
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  const formatOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startFormatted = start.toLocaleDateString("en-US", formatOptions);
  const endFormatted = end.toLocaleDateString("en-US", formatOptions);
  
  let label = `${startFormatted} - ${endFormatted}`;
  if (start.getFullYear() !== end.getFullYear()) {
    label = `${startFormatted}, ${start.getFullYear()} - ${endFormatted}, ${end.getFullYear()}`;
  }
  
  return {
    start,
    end,
    startStr: getLocalDateString(start),
    endStr: getLocalDateString(end),
    label,
  };
}

/**
 * Get entries for a specific week
 */
export function getEntriesForWeek(
  entries: StoredEntry[],
  weekStartDay: WeekStartDay,
  weekOffset: number = 0
): StoredEntry[] {
  const { startStr, endStr } = getWeekRange(weekStartDay, weekOffset);
  
  return entries
    .filter((entry) => entry.date >= startStr && entry.date <= endStr)
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : b.startTime.localeCompare(a.startTime);
    });
}

/**
 * Find the earliest and latest weeks with data
 */
export function getDataWeekBounds(
  entries: StoredEntry[],
  weekStartDay: WeekStartDay
): { earliest: number; latest: number } {
  if (entries.length === 0) {
    return { earliest: 0, latest: 0 };
  }
  
  const sortedDates = entries.map(e => e.date).sort();
  const earliestDate = sortedDates[0];
  
  // Find earliest week offset
  let earliestOffset = 0;
  while (getWeekRange(weekStartDay, earliestOffset).startStr > earliestDate) {
    earliestOffset--;
  }
  
  // Latest is always 0 (current week)
  return { earliest: earliestOffset, latest: 0 };
}

// ============================================
// WEEKLY STATS
// ============================================

export function calculateWeeklyStats(entries: StoredEntry[]): WeeklyStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      uniqueSymptoms: 0,
      totalSymptomOccurrences: 0,
      highestIntensity: null,
      mostActiveDay: null,
      entriesByDay: {},
      timeOfDayDistribution: {},
    };
  }
  
  const symptomSet = new Set<string>();
  let totalOccurrences = 0;
  let highestIntensity: { symptom: string; intensity: number } | null = null;
  const entriesByDay: Record<string, number> = {};
  const timeOfDayDist: Record<string, number> = {};
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  for (const entry of entries) {
    // Count by day
    const date = new Date(entry.date + "T12:00:00");
    const dayName = dayNames[date.getDay()];
    entriesByDay[dayName] = (entriesByDay[dayName] || 0) + 1;
    
    // Time of day
    const [hourStr] = entry.startTime.split(":");
    const hour = parseInt(hourStr, 10);
    let period: string;
    if (hour >= 5 && hour < 12) period = "Morning";
    else if (hour >= 12 && hour < 17) period = "Afternoon";
    else if (hour >= 17 && hour < 21) period = "Evening";
    else period = "Night";
    timeOfDayDist[period] = (timeOfDayDist[period] || 0) + 1;
    
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
  
  // Find most active day
  let mostActiveDay: string | null = null;
  let maxEntries = 0;
  for (const [day, count] of Object.entries(entriesByDay)) {
    if (count > maxEntries) {
      mostActiveDay = day;
      maxEntries = count;
    }
  }
  
  return {
    totalEntries: entries.length,
    uniqueSymptoms: symptomSet.size,
    totalSymptomOccurrences: totalOccurrences,
    highestIntensity,
    mostActiveDay,
    entriesByDay,
    timeOfDayDistribution: timeOfDayDist,
  };
}

// ============================================
// WEEK COMPARISON TYPES
// ============================================

/** Symptom with period-related flag for new/resolved tracking */
export interface SymptomWithFlag {
  name: string;
  isPeriodRelated: boolean;
}

/** Symptom comparison data for a single week */
export interface SymptomWeekData {
  uniqueCount: number;
  totalOccurrences: number;
  avgIntensity: number | null;
  /** Map of symptom name -> isPeriodRelated (internal use) */
  symptoms: Map<string, boolean>;
  /** Top symptoms sorted by average intensity (for expanded view) */
  topByIntensity: { name: string; avgIntensity: number; count: number }[];
}

/** Bowel comparison data for a single week */
export interface BowelWeekData {
  totalBMs: number;
  mostCommonType: number | null;
  avgType: number | null;
  normalRangeCount: number | null;
  /** Feeling distribution for expanded view */
  feelingDistribution: Record<string, number>;
  /** Time of day distribution */
  timeDistribution: Record<string, number>;
}

/** Cycle comparison data for a single week */
export interface CycleWeekData {
  hasData: boolean;
  phase: string | null;
  flow: string | null;
  daysLogged: number;
}

/** Medicine comparison data for a single week */
export interface MedicineWeekData {
  totalDoses: number;
  topMedicine: string | null;
  daysWithMedicine: number;
  medicines: Set<string>;
  /** Detailed breakdown for expanded view */
  medicineDetails: {
    name: string;
    count: number;
    dosages: string[];
    daysUsed: string[];
    timeDistribution: Record<string, number>;
  }[];
  /** Overall time distribution */
  timeDistribution: Record<string, number>;
}

/** Full week-over-week comparison result */
export interface WeekComparison {
  symptoms: {
    thisWeek: Omit<SymptomWeekData, "symptoms">;
    lastWeek: Omit<SymptomWeekData, "symptoms">;
    newSymptoms: SymptomWithFlag[];
    resolvedSymptoms: SymptomWithFlag[];
    intensityChange: number | null;
  };
  bowel: {
    thisWeek: BowelWeekData;
    lastWeek: BowelWeekData;
    typeShift: { from: number | null; to: number | null } | null;
    trendTowardNormal: boolean | null;
  };
  cycle: {
    thisWeek: CycleWeekData;
    lastWeek: CycleWeekData;
    phaseChanged: boolean;
    flowChanged: boolean;
  };
  medicine: {
    thisWeek: Omit<MedicineWeekData, "medicines">;
    lastWeek: Omit<MedicineWeekData, "medicines">;
    newMedicines: string[];
    stoppedMedicines: string[];
    doseChange: number;
  };
}

// Keep legacy type for backwards compatibility if needed elsewhere
export interface WeekComparisonStats {
  newSymptoms: string[];
  resolvedSymptoms: string[];
  symptomCountChange: number;
  avgIntensity: number | null;
  bristolCountChange: number;
  mostCommonBristolChange: { prev: number | null; current: number | null };
}

// ============================================
// WEEK COMPARISON
// ============================================

/**
 * Compare two weeks of entries across all 4 categories
 */
export function compareWeeks(
  currentEntries: StoredEntry[],
  previousEntries: StoredEntry[]
): WeekComparison {
  // ===== SYMPTOMS =====
  const buildSymptomData = (entries: StoredEntry[]): SymptomWeekData => {
    // Map: symptom name -> isPeriodRelated
    const symptoms = new Map<string, boolean>();
    let totalIntensity = 0;
    let intensityCount = 0;
    let totalOccurrences = 0;
    
    // Track per-symptom intensity data
    const symptomStats: Record<string, { totalIntensity: number; intensityCount: number; count: number }> = {};

    for (const entry of entries) {
      // Regular symptoms (NOT period-related)
      for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
        // Only set to false if not already marked as period-related
        if (!symptoms.has(symptom)) {
          symptoms.set(symptom, false);
        }
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
      
      // Period symptoms (period-related = true)
      for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
        // Mark as period-related (overrides false if previously set)
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

    // Build top symptoms by intensity
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
      topByIntensity,
    };
  };

  const thisWeekSymptoms = buildSymptomData(currentEntries);
  const lastWeekSymptoms = buildSymptomData(previousEntries);

  // Build new/resolved with isPeriodRelated flag
  const newSymptoms: SymptomWithFlag[] = [];
  const resolvedSymptoms: SymptomWithFlag[] = [];

  for (const [symptom, isPeriodRelated] of thisWeekSymptoms.symptoms) {
    if (!lastWeekSymptoms.symptoms.has(symptom)) {
      newSymptoms.push({ name: symptom, isPeriodRelated });
    }
  }

  for (const [symptom, isPeriodRelated] of lastWeekSymptoms.symptoms) {
    if (!thisWeekSymptoms.symptoms.has(symptom)) {
      resolvedSymptoms.push({ name: symptom, isPeriodRelated });
    }
  }

  const intensityChange = 
    thisWeekSymptoms.avgIntensity !== null && lastWeekSymptoms.avgIntensity !== null
      ? Math.round((thisWeekSymptoms.avgIntensity - lastWeekSymptoms.avgIntensity) * 10) / 10
      : null;

  // ===== BOWEL =====
  const buildBowelData = (entries: StoredEntry[]): BowelWeekData => {
    const types: number[] = [];
    const typeCounts: Record<number, number> = {};
    const feelingDistribution: Record<string, number> = {};
    const timeDistribution: Record<string, number> = {};
    let normalRangeCount = 0;

    for (const entry of entries) {
      if (entry.stoolType) {
        types.push(entry.stoolType);
        typeCounts[entry.stoolType] = (typeCounts[entry.stoolType] || 0) + 1;
        
        // Count types 3 and 4 as "normal range"
        if (entry.stoolType === 3 || entry.stoolType === 4) {
          normalRangeCount++;
        }
        
        // Track feelings
        if (entry.stoolFeeling) {
          feelingDistribution[entry.stoolFeeling] = (feelingDistribution[entry.stoolFeeling] || 0) + 1;
        }
        
        // Track time of day
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
      totalBMs: types.length, 
      mostCommonType, 
      avgType,
      normalRangeCount: types.length > 0 ? normalRangeCount : null,
      feelingDistribution,
      timeDistribution,
    };
  };

  const thisWeekBowel = buildBowelData(currentEntries);
  const lastWeekBowel = buildBowelData(previousEntries);

  // Calculate trend toward normal (types 3-4 are ideal)
  let trendTowardNormal: boolean | null = null;
  if (thisWeekBowel.avgType !== null && lastWeekBowel.avgType !== null) {
    const thisDistance = Math.abs(thisWeekBowel.avgType - 3.5);
    const lastDistance = Math.abs(lastWeekBowel.avgType - 3.5);
    trendTowardNormal = thisDistance < lastDistance;
  }

  const typeShift = 
    thisWeekBowel.mostCommonType !== lastWeekBowel.mostCommonType &&
    (thisWeekBowel.mostCommonType !== null || lastWeekBowel.mostCommonType !== null)
      ? { from: lastWeekBowel.mostCommonType, to: thisWeekBowel.mostCommonType }
      : null;

  // ===== CYCLE =====
  const buildCycleData = (entries: StoredEntry[]): CycleWeekData => {
    const phases: Record<string, number> = {};
    const flows: Record<string, number> = {};
    const daysWithData = new Set<string>();

    for (const entry of entries) {
      if (entry.cyclePhase) {
        phases[entry.cyclePhase] = (phases[entry.cyclePhase] || 0) + 1;
        daysWithData.add(entry.date);
      }
      if (entry.periodFlow) {
        flows[entry.periodFlow] = (flows[entry.periodFlow] || 0) + 1;
        daysWithData.add(entry.date);
      }
    }

    // Most common phase
    let mostCommonPhase: string | null = null;
    let maxPhaseCount = 0;
    for (const [phase, count] of Object.entries(phases)) {
      if (count > maxPhaseCount) {
        maxPhaseCount = count;
        mostCommonPhase = phase;
      }
    }

    // Most common flow
    let mostCommonFlow: string | null = null;
    let maxFlowCount = 0;
    for (const [flow, count] of Object.entries(flows)) {
      if (count > maxFlowCount) {
        maxFlowCount = count;
        mostCommonFlow = flow;
      }
    }

    return {
      hasData: daysWithData.size > 0,
      phase: mostCommonPhase,
      flow: mostCommonFlow,
      daysLogged: daysWithData.size,
    };
  };

  const thisWeekCycle = buildCycleData(currentEntries);
  const lastWeekCycle = buildCycleData(previousEntries);

  const phaseChanged = 
    thisWeekCycle.phase !== lastWeekCycle.phase &&
    (thisWeekCycle.phase !== null || lastWeekCycle.phase !== null);
  const flowChanged = 
    thisWeekCycle.flow !== lastWeekCycle.flow &&
    (thisWeekCycle.flow !== null || lastWeekCycle.flow !== null);

  // ===== MEDICINE =====
  const buildMedicineData = (entries: StoredEntry[]): MedicineWeekData => {
    const medicineCounts: Record<string, number> = {};
    const daysWithMedicine = new Set<string>();
    const medicines = new Set<string>();
    const overallTimeDistribution: Record<string, number> = {};
    
    // Detailed tracking per medicine
    const medicineDetailsMap: Record<string, {
      count: number;
      dosages: string[];
      daysUsed: Set<string>;
      timeDistribution: Record<string, number>;
    }> = {};

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const entry of entries) {
      for (const log of entry.medicineLog) {
        medicines.add(log.medicineName);
        medicineCounts[log.medicineName] = (medicineCounts[log.medicineName] || 0) + 1;
        daysWithMedicine.add(entry.date);
        
        // Initialize medicine details if needed
        if (!medicineDetailsMap[log.medicineName]) {
          medicineDetailsMap[log.medicineName] = {
            count: 0,
            dosages: [],
            daysUsed: new Set(),
            timeDistribution: {},
          };
        }
        
        const details = medicineDetailsMap[log.medicineName];
        details.count++;
        
        if (log.dosage) {
          details.dosages.push(log.dosage);
        }
        
        // Get day name
        const date = new Date(entry.date + "T12:00:00");
        const dayName = dayNames[date.getDay()];
        details.daysUsed.add(dayName);
        
        // Time of day - use medicine time if available, otherwise fall back to entry startTime
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
          
          details.timeDistribution[period] = (details.timeDistribution[period] || 0) + 1;
          overallTimeDistribution[period] = (overallTimeDistribution[period] || 0) + 1;
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
    
    // Convert medicine details to array format
    const medicineDetails = Object.entries(medicineDetailsMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        dosages: data.dosages,
        daysUsed: Array.from(data.daysUsed),
        timeDistribution: data.timeDistribution,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalDoses,
      topMedicine,
      daysWithMedicine: daysWithMedicine.size,
      medicines,
      medicineDetails,
      timeDistribution: overallTimeDistribution,
    };
  };

  const thisWeekMedicine = buildMedicineData(currentEntries);
  const lastWeekMedicine = buildMedicineData(previousEntries);

  const newMedicines = Array.from(thisWeekMedicine.medicines)
    .filter(m => !lastWeekMedicine.medicines.has(m));
  const stoppedMedicines = Array.from(lastWeekMedicine.medicines)
    .filter(m => !thisWeekMedicine.medicines.has(m));
  const doseChange = thisWeekMedicine.totalDoses - lastWeekMedicine.totalDoses;

  // ===== RETURN FULL COMPARISON =====
  return {
    symptoms: {
      thisWeek: {
        uniqueCount: thisWeekSymptoms.uniqueCount,
        totalOccurrences: thisWeekSymptoms.totalOccurrences,
        avgIntensity: thisWeekSymptoms.avgIntensity,
        topByIntensity: thisWeekSymptoms.topByIntensity,
      },
      lastWeek: {
        uniqueCount: lastWeekSymptoms.uniqueCount,
        totalOccurrences: lastWeekSymptoms.totalOccurrences,
        avgIntensity: lastWeekSymptoms.avgIntensity,
        topByIntensity: lastWeekSymptoms.topByIntensity,
      },
      newSymptoms,
      resolvedSymptoms,
      intensityChange,
    },
    bowel: {
      thisWeek: thisWeekBowel,
      lastWeek: lastWeekBowel,
      typeShift,
      trendTowardNormal,
    },
    cycle: {
      thisWeek: thisWeekCycle,
      lastWeek: lastWeekCycle,
      phaseChanged,
      flowChanged,
    },
    medicine: {
      thisWeek: {
        totalDoses: thisWeekMedicine.totalDoses,
        topMedicine: thisWeekMedicine.topMedicine,
        daysWithMedicine: thisWeekMedicine.daysWithMedicine,
        medicineDetails: thisWeekMedicine.medicineDetails,
        timeDistribution: thisWeekMedicine.timeDistribution,
      },
      lastWeek: {
        totalDoses: lastWeekMedicine.totalDoses,
        topMedicine: lastWeekMedicine.topMedicine,
        daysWithMedicine: lastWeekMedicine.daysWithMedicine,
        medicineDetails: lastWeekMedicine.medicineDetails,
        timeDistribution: lastWeekMedicine.timeDistribution,
      },
      newMedicines,
      stoppedMedicines,
      doseChange,
    },
  };
}

// ============================================
// HEAT MAP DATA
// ============================================

export function buildSymptomHeatMap(
  entries: StoredEntry[],
  weekStartDay: WeekStartDay,
  weekOffset: number = 0
): SymptomHeatMapData[] {
  const { start } = getWeekRange(weekStartDay, weekOffset);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Build ordered day list based on week start
  const orderedDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    orderedDays.push(dayNames[date.getDay()]);
  }
  
  // Collect all symptoms and their daily data
  const symptomMap: Record<string, Record<string, { intensity: number | null; logged: boolean }>> = {};
  
  for (const entry of entries) {
    const date = new Date(entry.date + "T12:00:00");
    const dayName = dayNames[date.getDay()];
    
    // General symptoms
    for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
      if (!symptomMap[symptom]) {
        symptomMap[symptom] = {};
        for (const d of orderedDays) {
          symptomMap[symptom][d] = { intensity: null, logged: false };
        }
      }
      symptomMap[symptom][dayName] = { 
        intensity: intensity ?? symptomMap[symptom][dayName].intensity, 
        logged: true 
      };
    }
    
    // Period symptoms
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      if (!symptomMap[symptom]) {
        symptomMap[symptom] = {};
        for (const d of orderedDays) {
          symptomMap[symptom][d] = { intensity: null, logged: false };
        }
      }
      symptomMap[symptom][dayName] = { 
        intensity: intensity ?? symptomMap[symptom][dayName].intensity, 
        logged: true 
      };
    }
  }
  
  // Convert to array format, sorted by total occurrences
  return Object.entries(symptomMap)
    .map(([symptom, dayData]) => ({
      symptom,
      days: orderedDays.map(day => ({ day, ...dayData[day] })),
      totalLogged: Object.values(dayData).filter(d => d.logged).length,
    }))
    .sort((a, b) => b.totalLogged - a.totalLogged)
    .map(({ symptom, days }) => ({ symptom, days }));
}