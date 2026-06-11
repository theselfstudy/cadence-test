// lib/csvExport.ts
// ============================================
// CSV Export Utilities for Cadence
// ============================================

import type { StoredEntry, TimeFormat, PainScaleType } from "@/types";
import { BRISTOL_TYPES, POST_BOWEL_FEELINGS, CYCLE_PHASES, FLOW_LEVELS } from "@/lib/constants";

// ============================================
// Helper Functions
// ============================================

/**
 * Escapes a value for CSV format
 * Wraps in quotes if contains comma, quote, or newline
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  const stringValue = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Converts 24h time string to 12h format
 */
function formatTime(timeString: string, format: TimeFormat): string {
  if (!timeString) return "";
  
  // If already in correct format, return as-is
  if (format === "24h") {
    // Ensure HH:MM format
    const [hour, minute] = timeString.split(":");
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  
  // Convert to 12h
  const [hourStr, minuteStr] = timeString.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  
  if (hour === 0) return `12:${minute} AM`;
  if (hour === 12) return `12:${minute} PM`;
  if (hour > 12) return `${hour - 12}:${minute} PM`;
  return `${hour}:${minute} AM`;
}

/**
 * Parses a time string (12h or 24h) to total minutes for sorting
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();
  if (meridian === "PM" && hour < 12) hour += 12;
  if (meridian === "AM" && hour === 12) hour = 0;
  return hour * 60 + min;
}

/**
 * Calculates duration between two time strings in minutes
 */
function calculateDurationMinutes(startTime: string, endTime: string): number | null {
  if (!startTime || !endTime) return null;
  
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  let startTotalMinutes = startHour * 60 + startMin;
  let endTotalMinutes = endHour * 60 + endMin;
  
  // Handle crossing midnight
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }
  
  return endTotalMinutes - startTotalMinutes;
}

/**
 * Formats duration in human-readable format
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return "";
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMins}m`;
}

/**
 * Gets the day of week from a date string
 */
function getDayOfWeek(dateString: string): string {
  const date = new Date(dateString);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

/**
 * Gets time of day category from time string
 */
function getTimeOfDay(timeString: string): string {
  if (!timeString) return "";
  
  const [hourStr] = timeString.split(":");
  const hour = parseInt(hourStr, 10);
  
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

/**
 * Gets Bristol type label from number
 */
function getBristolLabel(type: number | null): string {
  if (type === null) return "";
  const bristol = BRISTOL_TYPES.find(b => b.type === type);
  return bristol ? `Type ${type}: ${bristol.name}` : "";
}

/**
 * Gets post-bowel feeling label from value
 */
function getPostFeelingLabel(feeling: string | null): string {
  if (!feeling) return "";
  const found = POST_BOWEL_FEELINGS.find(f => f.value === feeling);
  return found ? found.label : feeling;
}

/**
 * Gets cycle phase label from value
 */
function getCyclePhaseLabel(phase: string | null): string {
  if (!phase) return "";
  const found = CYCLE_PHASES.find(p => p.value === phase);
  return found ? found.label : phase;
}

/**
 * Gets flow level label from value
 */
function getFlowLabel(flow: string | null): string {
  if (!flow) return "";
  // Handle embedded time format: "heavy @ 4:44 PM"
  const atMatch = flow.match(/^(.+?)\s*@\s*(.+)$/);
  if (atMatch) {
    const level = atMatch[1].trim();
    const time = atMatch[2].trim();
    const found = FLOW_LEVELS.find(f => f.value === level);
    return `${found ? found.label : level} @ ${time}`;
  }
  const found = FLOW_LEVELS.find(f => f.value === flow);
  return found ? found.label : flow;
}

/**
 * Formats product usage for CSV using custom product name lookup
 */
function formatProductUsage(
  products: StoredEntry["productUsage"],
  customProducts: Record<string, { id: string; name: string }[]>
): string {
  if (!products || products.length === 0) return "";

  const typeLabels: Record<string, string> = {
    pad: "Pad",
    tampon: "Tampon",
    cup: "Cup",
    disc: "Disc",
    liner: "Liner",
    "period-underwear": "Period Underwear",
    other: "Other",
  };

  return products.map(p => {
    let customProduct: { id: string; name: string } | undefined;

    if (p.customProductId) {
      // Try the specific product type category first
      if (customProducts[p.productType]) {
        customProduct = customProducts[p.productType].find(
          cp => cp.id === p.customProductId
        );
      }
      // If not found, search all categories
      if (!customProduct) {
        for (const prods of Object.values(customProducts)) {
          const found = prods.find(cp => cp.id === p.customProductId);
          if (found) { customProduct = found; break; }
        }
      }
    }

    const formattedType = typeLabels[p.productType] ||
      p.productType.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    if (customProduct) {
      return `${customProduct.name} (${formattedType})`;
    }

    // Filter out invalid size values
    const validSize = p.size && !["yes", "true", "false", "no"].includes(p.size.toLowerCase())
      ? p.size : null;

    return validSize ? `${formattedType} (${validSize})` : formattedType;
  }).join("; ");
}

/**
 * Formats medicine log for CSV
 */
function formatMedicineLog(medicines: StoredEntry["medicineLog"]): string {
  if (!medicines || medicines.length === 0) return "";
  
  return medicines.map(m => {
    let label = m.medicineName;
    if (m.dosage) label += ` (${m.dosage})`;
    if (m.time) {
      const timeStr = `${m.time.hour}:${String(m.time.minute).padStart(2, "0")} ${m.time.period}`;
      label += ` @ ${timeStr}`;
    }
    return label;
  }).join("; ");
}

// ============================================
// Column Definitions
// ============================================

interface CSVColumn {
  header: string;
  getValue: (entry: StoredEntry, options: ExportOptions) => string | number;
}

interface ExportOptions {
  timeFormat: TimeFormat;
  painScale: PainScaleType;
  includeSymptoms: boolean;
  includePeriod: boolean;
  includeStool: boolean;
  includeMedicine: boolean;
  /** Custom products from settings for name lookup */
  customProducts: Record<string, { id: string; name: string }[]>;
}

/**
 * Gets all unique symptom names from entries
 */
function getUniqueSymptoms(entries: StoredEntry[]): string[] {
  const symptoms = new Set<string>();
  
  entries.forEach(entry => {
    Object.keys(entry.symptomIntensities || {}).forEach(s => symptoms.add(s));
  });
  
  return Array.from(symptoms).sort();
}

/**
 * Gets all unique period symptom names from entries
 */
function getUniquePeriodSymptoms(entries: StoredEntry[]): string[] {
  const symptoms = new Set<string>();
  
  entries.forEach(entry => {
    Object.keys(entry.periodSymptomIntensities || {}).forEach(s => symptoms.add(s));
  });
  
  return Array.from(symptoms).sort();
}

/**
 * Gets all unique medicine names from entries
 */
function getUniqueMedicines(entries: StoredEntry[]): string[] {
  const medicines = new Set<string>();
  
  entries.forEach(entry => {
    (entry.medicineLog || []).forEach(m => medicines.add(m.medicineName));
  });
  
  return Array.from(medicines).sort();
}

/**
 * Builds the complete column list based on entries and options
 */
function buildColumns(entries: StoredEntry[], options: ExportOptions): CSVColumn[] {
  const columns: CSVColumn[] = [];
  
  // ============================================
  // Metadata Columns (always included)
  // ============================================
  columns.push(
    { header: "Date", getValue: (e) => e.date },
    { header: "Day of Week", getValue: (e) => getDayOfWeek(e.date) },
    { header: "Start Time", getValue: (e, opts) => formatTime(e.startTime, opts.timeFormat) },
    { header: "End Time", getValue: (e, opts) => formatTime(e.endTime, opts.timeFormat) },
    { header: "Duration", getValue: (e) => formatDuration(calculateDurationMinutes(e.startTime, e.endTime)) },
    { header: "Time of Day", getValue: (e) => getTimeOfDay(e.startTime) },
  );
  
  // ============================================
  // Symptom Columns (dynamic)
  // ============================================
  if (options.includeSymptoms) {
    const symptoms = getUniqueSymptoms(entries);
    
    symptoms.forEach(symptom => {
        columns.push({
            header: symptom,
            getValue: (e) => {
            const intensity = e.symptomIntensities?.[symptom];
            // Not logged for this entry
            if (intensity === undefined) return "";
            // Logged but intensity tracking was disabled
            if (intensity === null) return "Yes";
            // Actual intensity value (including 0 and 1)
            return intensity;
            }
        });
    });

  }

  // ============================================
  // One-Off Symptoms (always included, per-entry custom symptoms)
  // Placed after general symptoms, before period columns
  // ============================================
  columns.push({
    header: "One-Off Symptoms",
    getValue: (e) => {
      const symptoms = e.oneOffSymptoms ?? [];
      return symptoms.length > 0 ? symptoms.join(", ") : "";
    }
  });

  // ============================================
  // Period Columns
  // ============================================
  if (options.includePeriod) {
    columns.push(
      { header: "Cycle Phase", getValue: (e) => getCyclePhaseLabel(e.cyclePhase) },
      { header: "Flow Level", getValue: (e) => getFlowLabel(e.periodFlow) },
      { header: "Products Used", getValue: (e, opts) => formatProductUsage(e.productUsage, opts.customProducts) },
    );
    
    // Period-specific symptoms (dynamic)
    const periodSymptoms = getUniquePeriodSymptoms(entries);
    
    // AFTER - Same fix for period symptoms
    periodSymptoms.forEach(symptom => {
    columns.push({
        header: `Period: ${symptom}`,
        getValue: (e) => {
        const intensity = e.periodSymptomIntensities?.[symptom];
        // Not logged for this entry
        if (intensity === undefined) return "";
        // Logged but intensity tracking was disabled
        if (intensity === null) return "Yes";
        // Actual intensity value (including 0 and 1)
        return intensity;
        }
    });
    });
  }
  
  // ============================================
  // Stool/Bowel Columns
  // ============================================
  if (options.includeStool) {
    columns.push(
      { header: "Bristol Type", getValue: (e) => e.stoolType || "" },
      { header: "Bristol Description", getValue: (e) => getBristolLabel(e.stoolType) },
      { header: "Post-Bowel Feeling", getValue: (e) => getPostFeelingLabel(e.stoolFeeling) },
    );
  }
  
  // ============================================
  // Medicine Columns
  // ============================================
  if (options.includeMedicine) {
    // Combined medicine log column
    columns.push({
      header: "Medicines Taken",
      getValue: (e) => formatMedicineLog(e.medicineLog)
    });
    
    // Individual medicine columns (Yes/No for each)
    const medicines = getUniqueMedicines(entries);
    
    medicines.forEach(medicine => {
      columns.push({
        header: `Med: ${medicine}`,
        getValue: (e) => {
          const logged = (e.medicineLog || []).some(m => m.medicineName === medicine);
          return logged ? "Yes" : "";
        }
      });
    });
  }
  
  // ============================================
  // Closing Columns
  // ============================================
  columns.push(
    { header: "Pain Scale Used", getValue: (e) => e.painScale || "" },
    { header: "Notes", getValue: (e) => e.notes || "" },
    { header: "Entry ID", getValue: (e) => e.id },
    { header: "Created At", getValue: (e) => e.createdAt },
  );
  
  return columns;
}

// ============================================
// Main Export Functions
// ============================================

/**
 * Converts entries to CSV string
 */
export function entriesToCSV(
  entries: StoredEntry[],
  options: Partial<ExportOptions> = {}
): string {
  // Default options
  const fullOptions: ExportOptions = {
    timeFormat: options.timeFormat || "12h",
    painScale: options.painScale || "simple",
    includeSymptoms: options.includeSymptoms ?? true,
    includePeriod: options.includePeriod ?? true,
    includeStool: options.includeStool ?? true,
    includeMedicine: options.includeMedicine ?? true,
    customProducts: options.customProducts ?? {},
  };
  
  // Sort entries chronologically: by date (oldest first), then by start time
  const sortedEntries = [...entries].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });
  
  // Build columns based on what's actually in the data
  const columns = buildColumns(sortedEntries, fullOptions);
  
  // Build header row
  const headerRow = columns.map(col => escapeCSVValue(col.header)).join(",");
  
  // Build data rows
  const dataRows = sortedEntries.map(entry => {
    return columns.map(col => escapeCSVValue(col.getValue(entry, fullOptions))).join(",");
  });
  
  // Combine header and data
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Downloads entries as a CSV file
 */
export function downloadEntriesAsCSV(
  entries: StoredEntry[],
  options: Partial<ExportOptions> = {},
  filename?: string
): void {
  const csv = entriesToCSV(entries, options);
  
  // Generate filename with date range if not provided
  const defaultFilename = generateFilename(entries);
  const finalFilename = filename || defaultFilename;
  
  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = finalFilename;
  link.style.display = "none";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Generates a descriptive filename based on entries
 */
function generateFilename(entries: StoredEntry[]): string {
  if (entries.length === 0) {
    return `cadence-export-${new Date().toISOString().split("T")[0]}.csv`;
  }
  
  // Sort to get date range
  const sorted = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;
  
  if (startDate === endDate) {
    return `cadence-${startDate}.csv`;
  }
  
  return `cadence-${startDate}-to-${endDate}.csv`;
}

// ============================================
// Summary Statistics for Export
// ============================================

export interface EntrySummaryStats {
  totalEntries: number;
  dateRange: { start: string; end: string } | null;
  avgDurationMinutes: number | null;
  symptomCounts: Record<string, number>;
  bristolTypeCounts: Record<number, number>;
  cyclePhaseDistribution: Record<string, number>;
  medicineUsageCounts: Record<string, number>;
  entriesByDayOfWeek: Record<string, number>;
  entriesByTimeOfDay: Record<string, number>;
}

/**
 * Calculates summary statistics for a set of entries
 * Useful for displaying alongside exports or in summary views
 */
export function calculateSummaryStats(entries: StoredEntry[]): EntrySummaryStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      dateRange: null,
      avgDurationMinutes: null,
      symptomCounts: {},
      bristolTypeCounts: {},
      cyclePhaseDistribution: {},
      medicineUsageCounts: {},
      entriesByDayOfWeek: {},
      entriesByTimeOfDay: {},
    };
  }
  
  const sorted = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate average duration
  const durations = entries
    .map(e => calculateDurationMinutes(e.startTime, e.endTime))
    .filter((d): d is number => d !== null);
  
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;
  
  // Count symptoms
  const symptomCounts: Record<string, number> = {};
  entries.forEach(entry => {
    Object.keys(entry.symptomIntensities || {}).forEach(symptom => {
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
    });
  });
  
  // Count Bristol types
  const bristolTypeCounts: Record<number, number> = {};
  entries.forEach(entry => {
    if (entry.stoolType) {
      bristolTypeCounts[entry.stoolType] = (bristolTypeCounts[entry.stoolType] || 0) + 1;
    }
  });
  
  // Count cycle phases
  const cyclePhaseDistribution: Record<string, number> = {};
  entries.forEach(entry => {
    if (entry.cyclePhase) {
      cyclePhaseDistribution[entry.cyclePhase] = (cyclePhaseDistribution[entry.cyclePhase] || 0) + 1;
    }
  });
  
  // Count medicine usage
  const medicineUsageCounts: Record<string, number> = {};
  entries.forEach(entry => {
    (entry.medicineLog || []).forEach(med => {
      medicineUsageCounts[med.medicineName] = (medicineUsageCounts[med.medicineName] || 0) + 1;
    });
  });
  
  // Count by day of week
  const entriesByDayOfWeek: Record<string, number> = {};
  entries.forEach(entry => {
    const day = getDayOfWeek(entry.date);
    entriesByDayOfWeek[day] = (entriesByDayOfWeek[day] || 0) + 1;
  });
  
  // Count by time of day
  const entriesByTimeOfDay: Record<string, number> = {};
  entries.forEach(entry => {
    const tod = getTimeOfDay(entry.startTime);
    if (tod) {
      entriesByTimeOfDay[tod] = (entriesByTimeOfDay[tod] || 0) + 1;
    }
  });
  
  return {
    totalEntries: entries.length,
    dateRange: {
      start: sorted[0].date,
      end: sorted[sorted.length - 1].date,
    },
    avgDurationMinutes: avgDuration,
    symptomCounts,
    bristolTypeCounts,
    cyclePhaseDistribution,
    medicineUsageCounts,
    entriesByDayOfWeek,
    entriesByTimeOfDay,
  };
}