/**
 * All Insights Utility Functions
 *
 * Time-based insight calculations that work independently of cycle tracking.
 * Uses time windows instead of cycle-based aggregations.
 */

import { StoredEntry } from "@/types";

// ============================================
// TYPES
// ============================================

export interface SummaryStats {
  totalEntries: number;
  uniqueDaysLogged: number;
  dateRange: { start: Date | null; end: Date | null };
  uniqueSymptoms: number;
  uniqueMedications: number;
  averageEntriesPerDay: number;
}

export type ItemCategory = "symptom" | "bristol" | "medication";

export interface WeeklyBreakdown {
  weekLabel: string; // e.g., "Jan 27"
  count: number;
}

export interface ChangeDetectionResult {
  itemName: string;
  itemType: ItemCategory;
  recentCount: number;
  baselineCount: number;
  percentChange: number;
  direction: "increasing" | "decreasing";
  recentAvgIntensity?: number;
  baselineAvgIntensity?: number;
  weeklyHistory: WeeklyBreakdown[]; // 4 weeks of data, most recent first
}

export interface GroupedChangeDetection {
  symptom: ChangeDetectionResult[];
  bristol: ChangeDetectionResult[];
  medication: ChangeDetectionResult[];
}

export interface LoadContribution {
  name: string;
  count: number;
  totalIntensity: number;
}

export interface SymptomLoadResult {
  currentScore: number;
  previousScore: number;
  trend: "up" | "down" | "stable";
  topContributors: Array<{ name: string; contribution: number }>;
  category: "low" | "moderate" | "high";
  // New grouped breakdowns
  symptomContributions: LoadContribution[];
  bristolContributions: LoadContribution[];
  medicationContributions: LoadContribution[];
  totals: {
    symptom: number;
    bristol: number;
    medication: number;
  };
}

export interface WeeklyLoadStats {
  symptomLoad: {
    daysWithSymptoms: number;
    totalDays: number;
    percentage: number;
  };
  bristolLoad: {
    daysWithNonBaseline: number;
    totalDays: number;
    percentage: number;
    // New: movement-based stats
    nonBaselineMovements: number;
    totalMovements: number;
    movementPercentage: number;
  };
  medicineLoad: {
    daysWithMedicine: number;
    totalDays: number;
    ratio: string; // e.g., "5/7"
  };
}

export interface ConsistencyResult {
  itemName: string;
  itemType: ItemCategory;
  frequencyRatio: number;
  daysPerWeek: number;
  intensityStdDev?: number;
  category: "highly_consistent" | "moderate" | "variable";
  description: string;
  // Bristol-specific: movement-based stats
  bristolStats?: {
    totalMovements: number;
    nonBaselineMovements: number;
    percentage: number;
  };
}

export interface GroupedConsistency {
  highly_consistent: {
    symptom: ConsistencyResult[];
    bristol: ConsistencyResult[];
    medication: ConsistencyResult[];
  };
  moderate: {
    symptom: ConsistencyResult[];
    bristol: ConsistencyResult[];
    medication: ConsistencyResult[];
  };
  variable: {
    symptom: ConsistencyResult[];
    bristol: ConsistencyResult[];
    medication: ConsistencyResult[];
  };
}

export interface TimeBasedPattern {
  itemName: string;
  itemType: ItemCategory;
  patternType: "occasional" | "recent" | "trending";
  description: string;
  trendDirection?: "up" | "down";
  daysPerWeek?: number;
  firstSeen?: Date;
}

export interface GroupedPatterns {
  symptom: TimeBasedPattern[];
  bristol: TimeBasedPattern[];
  medication: TimeBasedPattern[];
}

// ============================================
// HELPER: Extract symptoms and medications from StoredEntry
// ============================================

interface ExtractedSymptom {
  name: string;
  intensity: number | null;
}

interface ExtractedMedication {
  name: string;
}

interface ExtractedBristol {
  name: string;
  type: number;
}

function extractSymptoms(entry: StoredEntry): ExtractedSymptom[] {
  const symptoms: ExtractedSymptom[] = [];

  // Extract from symptomIntensities
  if (entry.symptomIntensities) {
    for (const [name, intensity] of Object.entries(entry.symptomIntensities)) {
      symptoms.push({ name, intensity });
    }
  }

  // Extract from periodSymptomIntensities
  if (entry.periodSymptomIntensities) {
    for (const [name, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      symptoms.push({ name, intensity });
    }
  }

  return symptoms;
}

function extractMedications(entry: StoredEntry): ExtractedMedication[] {
  const medications: ExtractedMedication[] = [];

  if (entry.medicineLog) {
    for (const med of entry.medicineLog) {
      medications.push({ name: med.medicineName });
    }
  }

  return medications;
}

function extractBristol(entry: StoredEntry): ExtractedBristol | null {
  if (entry.stoolType) {
    return {
      name: `Type ${entry.stoolType}`,
      type: entry.stoolType,
    };
  }
  return null;
}

// ============================================
// SUMMARY STATS
// ============================================

/**
 * Calculate summary statistics for all entries
 */
export function calculateSummaryStats(entries: StoredEntry[]): SummaryStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      uniqueDaysLogged: 0,
      dateRange: { start: null, end: null },
      uniqueSymptoms: 0,
      uniqueMedications: 0,
      averageEntriesPerDay: 0,
    };
  }

  // Get unique dates
  const uniqueDates = new Set<string>();
  const allSymptoms = new Set<string>();
  const allMedications = new Set<string>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const entry of entries) {
    const entryDate = new Date(entry.date);
    const dateStr = entryDate.toISOString().split("T")[0];
    uniqueDates.add(dateStr);

    // Track date range
    if (!minDate || entryDate < minDate) minDate = entryDate;
    if (!maxDate || entryDate > maxDate) maxDate = entryDate;

    // Track unique symptoms
    for (const symptom of extractSymptoms(entry)) {
      allSymptoms.add(symptom.name);
    }

    // Track unique medications
    for (const med of extractMedications(entry)) {
      allMedications.add(med.name);
    }
  }

  return {
    totalEntries: entries.length,
    uniqueDaysLogged: uniqueDates.size,
    dateRange: { start: minDate, end: maxDate },
    uniqueSymptoms: allSymptoms.size,
    uniqueMedications: allMedications.size,
    averageEntriesPerDay: uniqueDates.size > 0 ? entries.length / uniqueDates.size : 0,
  };
}

// ============================================
// CHANGE DETECTION
// ============================================

/**
 * Compare last 14 days vs previous 14 days
 * Flag items with >=30% change in frequency
 * Require item to appear 3+ times in recent window
 * Include 4-week history breakdown
 */
export function calculateChangeDetection(entries: StoredEntry[]): ChangeDetectionResult[] {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Calculate week boundaries for history (4 weeks, most recent first)
  const weekBoundaries: { start: Date; end: Date; label: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;
    weekBoundaries.push({ start: weekStart, end: weekEnd, label });
  }

  // Split entries into recent and baseline windows
  const recentEntries = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= fourteenDaysAgo && d <= now;
  });

  const baselineEntries = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= twentyEightDaysAgo && d < fourteenDaysAgo;
  });

  // Count items per week for history
  const weeklyItemCounts: Record<string, number[]> = {};
  for (const entry of entries) {
    const entryDate = new Date(entry.date);

    // Check which week this entry belongs to
    for (let weekIdx = 0; weekIdx < weekBoundaries.length; weekIdx++) {
      const { start, end } = weekBoundaries[weekIdx];
      if (entryDate >= start && entryDate < end) {
        // Count symptoms
        for (const symptom of extractSymptoms(entry)) {
          const key = `symptom:${symptom.name}`;
          if (!weeklyItemCounts[key]) weeklyItemCounts[key] = [0, 0, 0, 0];
          weeklyItemCounts[key][weekIdx]++;
        }
        // Count bristol
        const bristol = extractBristol(entry);
        if (bristol) {
          const key = `bristol:${bristol.name}`;
          if (!weeklyItemCounts[key]) weeklyItemCounts[key] = [0, 0, 0, 0];
          weeklyItemCounts[key][weekIdx]++;
        }
        // Count medications
        for (const med of extractMedications(entry)) {
          const key = `medication:${med.name}`;
          if (!weeklyItemCounts[key]) weeklyItemCounts[key] = [0, 0, 0, 0];
          weeklyItemCounts[key][weekIdx]++;
        }
        break;
      }
    }
  }

  // Count symptoms and medications in each window
  const recentCounts = countItems(recentEntries);
  const baselineCounts = countItems(baselineEntries);

  const results: ChangeDetectionResult[] = [];

  // Check all items that appear in recent window
  for (const [key, recentData] of Object.entries(recentCounts)) {
    // Require 3+ appearances in recent window
    if (recentData.count < 3) continue;

    const baselineData = baselineCounts[key] || { count: 0, intensities: [] };

    // Calculate percent change
    const baselineCount = baselineData.count || 0.5; // Avoid division by zero
    const percentChange = ((recentData.count - baselineCount) / baselineCount) * 100;

    // Only flag significant changes (>=30%)
    if (Math.abs(percentChange) >= 30) {
      const [type, name] = key.split(":") as [ItemCategory, string];

      // Build weekly history
      const weeklyCounts = weeklyItemCounts[key] || [0, 0, 0, 0];
      const weeklyHistory: WeeklyBreakdown[] = weekBoundaries.map((week, idx) => ({
        weekLabel: week.label,
        count: weeklyCounts[idx],
      }));

      results.push({
        itemName: name,
        itemType: type,
        recentCount: recentData.count,
        baselineCount: baselineData.count,
        percentChange: Math.round(percentChange),
        direction: percentChange > 0 ? "increasing" : "decreasing",
        recentAvgIntensity: recentData.intensities.length > 0
          ? average(recentData.intensities)
          : undefined,
        baselineAvgIntensity: baselineData.intensities.length > 0
          ? average(baselineData.intensities)
          : undefined,
        weeklyHistory,
      });
    }
  }

  // Sort by absolute percent change (most significant first)
  return results.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
}

function countItems(entries: StoredEntry[]): Record<string, { count: number; intensities: number[] }> {
  const counts: Record<string, { count: number; intensities: number[] }> = {};

  for (const entry of entries) {
    for (const symptom of extractSymptoms(entry)) {
      const key = `symptom:${symptom.name}`;
      if (!counts[key]) counts[key] = { count: 0, intensities: [] };
      counts[key].count++;
      if (symptom.intensity !== undefined && symptom.intensity !== null) {
        counts[key].intensities.push(symptom.intensity);
      }
    }

    const bristol = extractBristol(entry);
    if (bristol) {
      const key = `bristol:${bristol.name}`;
      if (!counts[key]) counts[key] = { count: 0, intensities: [] };
      counts[key].count++;
      counts[key].intensities.push(bristol.type);
    }

    for (const med of extractMedications(entry)) {
      const key = `medication:${med.name}`;
      if (!counts[key]) counts[key] = { count: 0, intensities: [] };
      counts[key].count++;
    }
  }

  return counts;
}

// ============================================
// SYMPTOM LOAD INDEX
// ============================================

/**
 * Calculate composite symptom burden metric
 * dailyLoad = sum of symptom intensities
 * Normalized to 0-100 scale
 */
export function calculateSymptomLoadIndex(entries: StoredEntry[]): SymptomLoadResult {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get entries for current and previous week
  const currentWeek = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= sevenDaysAgo && d <= now;
  });

  const previousWeek = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  });

  // Calculate daily loads
  const currentLoad = calculateDailyLoad(currentWeek);
  const previousLoad = calculateDailyLoad(previousWeek);

  // Track contributions by category
  const symptomMap: Record<string, { count: number; totalIntensity: number }> = {};
  const bristolMap: Record<string, { count: number; totalIntensity: number }> = {};
  const medicationMap: Record<string, { count: number; totalIntensity: number }> = {};

  let symptomTotal = 0;
  let bristolTotal = 0;
  let medicationTotal = 0;

  for (const entry of currentWeek) {
    // Symptoms
    for (const symptom of extractSymptoms(entry)) {
      const intensity = symptom.intensity ?? 2;
      if (!symptomMap[symptom.name]) symptomMap[symptom.name] = { count: 0, totalIntensity: 0 };
      symptomMap[symptom.name].count++;
      symptomMap[symptom.name].totalIntensity += intensity;
      symptomTotal += intensity;
    }

    // Bristol
    const bristol = extractBristol(entry);
    if (bristol) {
      // Bristol contribution: types 1-2 and 6-7 are more "problematic", 3-5 are normal
      const bristolScore = [1, 2, 6, 7].includes(bristol.type) ? 2 : 1;
      if (!bristolMap[bristol.name]) bristolMap[bristol.name] = { count: 0, totalIntensity: 0 };
      bristolMap[bristol.name].count++;
      bristolMap[bristol.name].totalIntensity += bristolScore;
      bristolTotal += bristolScore;
    }

    // Medications (count as 1 each for load purposes)
    for (const med of extractMedications(entry)) {
      if (!medicationMap[med.name]) medicationMap[med.name] = { count: 0, totalIntensity: 0 };
      medicationMap[med.name].count++;
      medicationMap[med.name].totalIntensity += 1;
      medicationTotal += 1;
    }
  }

  // Convert maps to sorted arrays
  const symptomContributions: LoadContribution[] = Object.entries(symptomMap)
    .map(([name, data]) => ({ name, count: data.count, totalIntensity: data.totalIntensity }))
    .sort((a, b) => b.totalIntensity - a.totalIntensity);

  const bristolContributions: LoadContribution[] = Object.entries(bristolMap)
    .map(([name, data]) => ({ name, count: data.count, totalIntensity: data.totalIntensity }))
    .sort((a, b) => b.count - a.count);

  const medicationContributions: LoadContribution[] = Object.entries(medicationMap)
    .map(([name, data]) => ({ name, count: data.count, totalIntensity: data.totalIntensity }))
    .sort((a, b) => b.count - a.count);

  // Legacy top contributors (symptoms only, for backwards compat)
  const topContributors = symptomContributions
    .slice(0, 3)
    .map(({ name, totalIntensity }) => ({ name, contribution: totalIntensity }));

  // Determine trend
  let trend: "up" | "down" | "stable" = "stable";
  if (previousLoad > 0) {
    const change = (currentLoad - previousLoad) / previousLoad;
    if (change > 0.1) trend = "up";
    else if (change < -0.1) trend = "down";
  }

  // Determine category
  let category: "low" | "moderate" | "high" = "low";
  if (currentLoad > 60) category = "high";
  else if (currentLoad > 30) category = "moderate";

  return {
    currentScore: Math.round(currentLoad),
    previousScore: Math.round(previousLoad),
    trend,
    topContributors,
    category,
    symptomContributions,
    bristolContributions,
    medicationContributions,
    totals: {
      symptom: symptomTotal,
      bristol: bristolTotal,
      medication: medicationTotal,
    },
  };
}

function calculateDailyLoad(entries: StoredEntry[]): number {
  if (entries.length === 0) return 0;

  // Group by date
  const dailyLoads: Record<string, number> = {};

  for (const entry of entries) {
    const dateStr = new Date(entry.date).toISOString().split("T")[0];
    if (!dailyLoads[dateStr]) dailyLoads[dateStr] = 0;

    for (const symptom of extractSymptoms(entry)) {
      dailyLoads[dateStr] += symptom.intensity ?? 2;
    }
  }

  const loads = Object.values(dailyLoads);
  if (loads.length === 0) return 0;

  const avgLoad = average(loads);

  // Normalize to 0-100 (assuming max reasonable daily load is ~20)
  return Math.min(100, (avgLoad / 20) * 100);
}

// ============================================
// WEEKLY LOAD STATS (Ring-based display)
// ============================================

/**
 * Calculate weekly load stats for ring display
 * - Symptom Load: % of days with ≥1 symptom
 * - Bristol Load: % of days with non-baseline stool (outside 3-4)
 * - Medicine Load: x/7 days with any medication
 */
export function calculateWeeklyLoadStats(entries: StoredEntry[]): WeeklyLoadStats {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get entries for current week
  const currentWeek = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= sevenDaysAgo && d <= now;
  });

  // Track days with each category
  const daysWithSymptoms = new Set<string>();
  const daysWithNonBaselineBristol = new Set<string>();
  const daysWithMedicine = new Set<string>();
  const allDaysLogged = new Set<string>();

  // Track Bristol movements
  let totalBristolMovements = 0;
  let nonBaselineBristolMovements = 0;

  for (const entry of currentWeek) {
    const dateStr = new Date(entry.date).toISOString().split("T")[0];
    allDaysLogged.add(dateStr);

    // Check for symptoms
    if (extractSymptoms(entry).length > 0) {
      daysWithSymptoms.add(dateStr);
    }

    // Check for non-baseline Bristol (outside 3-4)
    const bristol = extractBristol(entry);
    if (bristol) {
      totalBristolMovements++;
      if (bristol.type < 3 || bristol.type > 4) {
        nonBaselineBristolMovements++;
        daysWithNonBaselineBristol.add(dateStr);
      }
    }

    // Check for medications
    if (extractMedications(entry).length > 0) {
      daysWithMedicine.add(dateStr);
    }
  }

  const totalDays = 7; // Always use 7 for the week
  const movementPercentage = totalBristolMovements > 0
    ? Math.round((nonBaselineBristolMovements / totalBristolMovements) * 100)
    : 0;

  return {
    symptomLoad: {
      daysWithSymptoms: daysWithSymptoms.size,
      totalDays,
      percentage: Math.round((daysWithSymptoms.size / totalDays) * 100),
    },
    bristolLoad: {
      daysWithNonBaseline: daysWithNonBaselineBristol.size,
      totalDays,
      percentage: Math.round((daysWithNonBaselineBristol.size / totalDays) * 100),
      nonBaselineMovements: nonBaselineBristolMovements,
      totalMovements: totalBristolMovements,
      movementPercentage,
    },
    medicineLoad: {
      daysWithMedicine: daysWithMedicine.size,
      totalDays,
      ratio: `${daysWithMedicine.size}/7`,
    },
  };
}

// ============================================
// CONSISTENCY METRICS
// ============================================

/**
 * Calculate how stable vs volatile each symptom is
 */
export function calculateConsistencyMetrics(entries: StoredEntry[]): ConsistencyResult[] {
  const stats = calculateSummaryStats(entries);
  if (stats.uniqueDaysLogged < 7) return [];

  const results: ConsistencyResult[] = [];
  const itemStats: Record<string, { days: Set<string>; intensities: number[]; count: number }> = {};

  // Track total Bristol movements for percentage calculation
  let totalBristolMovements = 0;

  // Gather stats per item
  for (const entry of entries) {
    const dateStr = new Date(entry.date).toISOString().split("T")[0];

    for (const symptom of extractSymptoms(entry)) {
      const key = `symptom:${symptom.name}`;
      if (!itemStats[key]) itemStats[key] = { days: new Set(), intensities: [], count: 0 };
      itemStats[key].days.add(dateStr);
      itemStats[key].count++;
      if (symptom.intensity !== undefined && symptom.intensity !== null) {
        itemStats[key].intensities.push(symptom.intensity);
      }
    }

    // Bristol stool data
    const bristol = extractBristol(entry);
    if (bristol) {
      totalBristolMovements++;
      const key = `bristol:${bristol.name}`;
      if (!itemStats[key]) itemStats[key] = { days: new Set(), intensities: [], count: 0 };
      itemStats[key].days.add(dateStr);
      itemStats[key].count++;
      itemStats[key].intensities.push(bristol.type);
    }

    for (const med of extractMedications(entry)) {
      const key = `medication:${med.name}`;
      if (!itemStats[key]) itemStats[key] = { days: new Set(), intensities: [], count: 0 };
      itemStats[key].days.add(dateStr);
      itemStats[key].count++;
    }
  }

  // Calculate metrics for each item
  for (const [key, data] of Object.entries(itemStats)) {
    const [type, name] = key.split(":") as [ItemCategory, string];
    const frequencyRatio = data.days.size / stats.uniqueDaysLogged;
    const daysPerWeek = Math.round(frequencyRatio * 7);

    // Calculate intensity variability for symptoms
    let intensityStdDev: number | undefined;
    if (type === "symptom" && data.intensities.length >= 3) {
      intensityStdDev = standardDeviation(data.intensities);
    }

    // Categorize consistency
    let category: "highly_consistent" | "moderate" | "variable";
    let description: string;
    const dayLabel = daysPerWeek === 1 ? "day" : "days";

    if (frequencyRatio >= 0.6 && (intensityStdDev === undefined || intensityStdDev < 0.8)) {
      category = "highly_consistent";
      description = `Appears regularly (~${daysPerWeek} ${dayLabel}/week)${intensityStdDev !== undefined ? " with consistent intensity" : ""}`;
    } else if (frequencyRatio >= 0.3) {
      category = "moderate";
      description = `Appears occasionally (~${daysPerWeek} ${dayLabel}/week)`;
    } else {
      category = "variable";
      description = `Appears infrequently (~${daysPerWeek} ${dayLabel}/week)${intensityStdDev !== undefined && intensityStdDev > 1 ? " with variable intensity" : ""}`;
    }

    // Only include items that appear at least twice
    if (data.days.size >= 2) {
      const result: ConsistencyResult = {
        itemName: name,
        itemType: type,
        frequencyRatio,
        daysPerWeek,
        intensityStdDev,
        category,
        description,
      };

      // Add Bristol-specific stats
      if (type === "bristol" && totalBristolMovements > 0) {
        // Check if this is a non-baseline type (outside 3-4)
        const bristolType = parseInt(name.replace("Type ", ""), 10);
        const isNonBaseline = bristolType < 3 || bristolType > 4;
        result.bristolStats = {
          totalMovements: totalBristolMovements,
          nonBaselineMovements: isNonBaseline ? data.count : 0,
          percentage: Math.round((data.count / totalBristolMovements) * 100),
        };
      }

      results.push(result);
    }
  }

  // Sort by frequency
  return results.sort((a, b) => b.frequencyRatio - a.frequencyRatio);
}

// ============================================
// TIME-BASED PATTERNS
// ============================================

/**
 * Calculate occasional, recent, and trending patterns using time windows
 */
export function calculateTimeBasedPatterns(entries: StoredEntry[]): {
  occasional: TimeBasedPattern[];
  recent: TimeBasedPattern[];
  trending: TimeBasedPattern[];
} {
  const stats = calculateSummaryStats(entries);
  if (stats.uniqueDaysLogged < 7) {
    return { occasional: [], recent: [], trending: [] };
  }

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const itemData: Record<string, {
    type: ItemCategory;
    firstSeen: Date;
    lastSeen: Date;
    totalDays: number;
    weeklyOccurrences: number[];
  }> = {};

  // Gather data per item
  const entriesByDate: Record<string, Set<string>> = {};
  for (const entry of entries) {
    const dateStr = new Date(entry.date).toISOString().split("T")[0];
    const entryDate = new Date(entry.date);

    const addItem = (type: ItemCategory, name: string) => {
      const key = `${type}:${name}`;
      if (!itemData[key]) {
        itemData[key] = {
          type,
          firstSeen: entryDate,
          lastSeen: entryDate,
          totalDays: 0,
          weeklyOccurrences: [0, 0, 0, 0],
        };
      }

      if (!entriesByDate[`${key}:${dateStr}`]) {
        entriesByDate[`${key}:${dateStr}`] = new Set();
        itemData[key].totalDays++;
      }
      entriesByDate[`${key}:${dateStr}`].add(dateStr);

      if (entryDate < itemData[key].firstSeen) itemData[key].firstSeen = entryDate;
      if (entryDate > itemData[key].lastSeen) itemData[key].lastSeen = entryDate;

      // Track weekly occurrences for trend
      const weeksAgo = Math.floor((now.getTime() - entryDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo < 4) {
        itemData[key].weeklyOccurrences[weeksAgo]++;
      }
    };

    for (const symptom of extractSymptoms(entry)) {
      addItem("symptom", symptom.name);
    }

    // Bristol stool data
    const bristol = extractBristol(entry);
    if (bristol) {
      addItem("bristol", bristol.name);
    }

    for (const med of extractMedications(entry)) {
      addItem("medication", med.name);
    }
  }

  const occasional: TimeBasedPattern[] = [];
  const recent: TimeBasedPattern[] = [];
  const trending: TimeBasedPattern[] = [];

  for (const [key, data] of Object.entries(itemData)) {
    const [type, name] = key.split(":") as [ItemCategory, string];
    const frequencyRatio = data.totalDays / stats.uniqueDaysLogged;
    const daysPerWeek = Math.round(frequencyRatio * 7 * 10) / 10;

    // Occasional: 20-50% frequency
    if (frequencyRatio >= 0.2 && frequencyRatio < 0.5) {
      occasional.push({
        itemName: name,
        itemType: type,
        patternType: "occasional",
        description: `Appears ~${daysPerWeek} days per week`,
        daysPerWeek,
      });
    }

    // Recent: First appeared in last 14 days
    if (data.firstSeen >= fourteenDaysAgo) {
      recent.push({
        itemName: name,
        itemType: type,
        patternType: "recent",
        description: `First appeared in the last 14 days`,
        firstSeen: data.firstSeen,
      });
    }

    // Trending: Increasing or decreasing over 4 weeks
    if (stats.uniqueDaysLogged >= 28) {
      const occurrences = data.weeklyOccurrences.slice().reverse(); // Oldest to newest
      const trend = detectSimpleTrend(occurrences);

      if (trend !== "stable") {
        trending.push({
          itemName: name,
          itemType: type,
          patternType: "trending",
          description: trend === "up"
            ? `Trending up over the last 4 weeks`
            : `Trending down over the last 4 weeks`,
          trendDirection: trend,
        });
      }
    }
  }

  return { occasional, recent, trending };
}

function detectSimpleTrend(values: number[]): "up" | "down" | "stable" {
  if (values.length < 3) return "stable";

  // Simple linear regression
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope > 0.3) return "up";
  if (slope < -0.3) return "down";
  return "stable";
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = average(values);
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(average(squaredDiffs));
}

// ============================================
// GROUPING HELPERS
// ============================================

/**
 * Group change detection results by category
 */
export function groupChangeDetection(results: ChangeDetectionResult[]): GroupedChangeDetection {
  return {
    symptom: results.filter((r) => r.itemType === "symptom"),
    bristol: results.filter((r) => r.itemType === "bristol"),
    medication: results.filter((r) => r.itemType === "medication"),
  };
}

/**
 * Group consistency results by category and consistency level
 */
export function groupConsistencyResults(results: ConsistencyResult[]): GroupedConsistency {
  const grouped: GroupedConsistency = {
    highly_consistent: { symptom: [], bristol: [], medication: [] },
    moderate: { symptom: [], bristol: [], medication: [] },
    variable: { symptom: [], bristol: [], medication: [] },
  };

  for (const result of results) {
    grouped[result.category][result.itemType].push(result);
  }

  return grouped;
}

/**
 * Group time-based patterns by category
 */
export function groupPatterns(patterns: TimeBasedPattern[]): GroupedPatterns {
  return {
    symptom: patterns.filter((p) => p.itemType === "symptom"),
    bristol: patterns.filter((p) => p.itemType === "bristol"),
    medication: patterns.filter((p) => p.itemType === "medication"),
  };
}
