// ============================================
// PDF Export Utility - Clinician-Focused Reports
// ============================================

import type { StoredEntry, LogSection } from "@/types";
import { BRISTOL_TYPES } from "@/lib/constants";

// Static logo SVG string
const LOGO_SVG_STRING = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M78,22 A40,40 0 1 0 78,78" fill="none" stroke="#104B55" stroke-width="3" stroke-linecap="round"/>
  <path d="M30,30 A28,28 0 1 1 30,70" fill="none" stroke="#3F592E" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
  <path d="M61,39 A16,16 0 1 0 61,61" fill="none" stroke="#791D1E" stroke-width="3" stroke-linecap="round"/>
  <path d="M50,56 C50,56 44,50 44,47 C44,44 46,42 50,46 C54,42 56,44 56,47 C56,50 50,56 50,56 Z" fill="#C4B7A6" transform="scale(0.5)" transform-origin="50px 50px"/>
</svg>`;

// Convert SVG to PNG data URL using canvas
async function svgToPngDataUrl(svgString: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG"));
    };

    img.src = url;
  });
}

// ============================================
// Helper Functions
// ============================================

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return `${startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function calculateDaysDifference(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// Data Analysis Functions
// ============================================

interface CycleStats {
  cycleCount: number;
  averageLength: number | null;
  periodDetails: Array<{
    cycleNumber: number;
    startDate: string;
    endDate: string | null;
    lengthDays: number | null;
    averageFlow: string;
    flowStartTimes: string[];
  }>;
}

/** Parse "heavy @ 4:44 PM" into { level: "heavy", startTime: "4:44 PM" } */
function parseFlowValue(flow: string | null): { level: string; startTime: string | null } {
  if (!flow) return { level: '', startTime: null };
  const match = flow.match(/^(.+?)\s*@\s*(.+)$/);
  if (match) return { level: match[1].trim(), startTime: match[2].trim() };
  return { level: flow, startTime: null };
}

function analyzeCycleData(entries: StoredEntry[]): CycleStats {
  // Filter entries with menstrual phase
  const menstrualEntries = entries.filter(e => e.cyclePhase === "menstrual");

  if (menstrualEntries.length === 0) {
    return { cycleCount: 0, averageLength: null, periodDetails: [] };
  }

  // Group consecutive menstrual entries into cycles
  const sortedEntries = [...menstrualEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const cycles: Array<{ start: string; end: string; flows: string[]; flowStartTimes: string[] }> = [];
  let currentCycle: { start: string; end: string; flows: string[]; flowStartTimes: string[] } | null = null;

  sortedEntries.forEach((entry, index) => {
    const prevEntry = index > 0 ? sortedEntries[index - 1] : null;
    const daysDiff = prevEntry
      ? calculateDaysDifference(prevEntry.date, entry.date)
      : 0;

    const parsed = parseFlowValue(entry.periodFlow);

    // Start new cycle if no current cycle or if gap > 10 days
    if (!currentCycle || daysDiff > 10) {
      if (currentCycle) cycles.push(currentCycle);
      currentCycle = {
        start: entry.date,
        end: entry.date,
        flows: parsed.level ? [parsed.level] : [],
        flowStartTimes: parsed.startTime ? [parsed.startTime] : [],
      };
    } else {
      // Continue current cycle
      currentCycle.end = entry.date;
      if (parsed.level) currentCycle.flows.push(parsed.level);
      if (parsed.startTime) currentCycle.flowStartTimes.push(parsed.startTime);
    }
  });

  if (currentCycle) cycles.push(currentCycle);

  // Calculate cycle lengths (from start of one to start of next)
  const cycleLengths: number[] = [];
  for (let i = 0; i < cycles.length - 1; i++) {
    const length = calculateDaysDifference(cycles[i].start, cycles[i + 1].start);
    cycleLengths.push(length);
  }

  const averageLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null;

  const periodDetails = cycles.map((cycle, index) => {
    const avgFlow = getAverageFlow(cycle.flows);

    return {
      cycleNumber: index + 1,
      startDate: cycle.start,
      endDate: cycle.end,
      lengthDays: index < cycles.length - 1 ? cycleLengths[index] : null,
      averageFlow: avgFlow,
      flowStartTimes: cycle.flowStartTimes,
    };
  });

  return {
    cycleCount: cycles.length,
    averageLength,
    periodDetails,
  };
}

function getAverageFlow(flows: string[]): string {
  if (flows.length === 0) return "Not tracked";

  const flowWeights: Record<string, number> = {
    spotting: 1,
    light: 2,
    medium: 3,
    heavy: 4,
  };

  const avgWeight = flows.reduce((sum, flow) => sum + (flowWeights[flow] || 0), 0) / flows.length;

  if (avgWeight <= 1.5) return "Spotting/Light";
  if (avgWeight <= 2.5) return "Light/Medium";
  if (avgWeight <= 3.5) return "Medium/Heavy";
  return "Heavy";
}

interface StoolStats {
  totalEntries: number;
  mostCommonType: number | null;
  distribution: Record<number, number>;
}

function analyzeStoolLogs(entries: StoredEntry[]): StoolStats {
  const stoolEntries = entries.filter(e => e.stoolType !== null);

  if (stoolEntries.length === 0) {
    return { totalEntries: 0, mostCommonType: null, distribution: {} };
  }

  const distribution: Record<number, number> = {};
  stoolEntries.forEach(entry => {
    if (entry.stoolType) {
      distribution[entry.stoolType] = (distribution[entry.stoolType] || 0) + 1;
    }
  });

  const mostCommonType = Object.entries(distribution).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0];

  return {
    totalEntries: stoolEntries.length,
    mostCommonType: mostCommonType ? Number(mostCommonType) : null,
    distribution,
  };
}

interface SymptomStats {
  totalEntries: number;
  topSymptoms: Array<{ name: string; count: number; avgIntensity: number | null }>;
  severityBreakdown: {
    mild: number;
    moderate: number;
    severe: number;
  };
  oneOffSymptoms: string[];
}

function analyzeSymptoms(entries: StoredEntry[]): SymptomStats {
  const symptomCounts: Record<string, { count: number; intensities: number[] }> = {};
  const allOneOffSymptoms: Set<string> = new Set();

  entries.forEach(entry => {
    // General symptoms
    Object.entries(entry.symptomIntensities || {}).forEach(([symptom, intensity]) => {
      if (!symptomCounts[symptom]) {
        symptomCounts[symptom] = { count: 0, intensities: [] };
      }
      symptomCounts[symptom].count++;
      if (intensity !== null && intensity !== undefined) {
        symptomCounts[symptom].intensities.push(intensity);
      }
    });

    // Period symptoms
    Object.entries(entry.periodSymptomIntensities || {}).forEach(([symptom, intensity]) => {
      const label = `${symptom} (period)`;
      if (!symptomCounts[label]) {
        symptomCounts[label] = { count: 0, intensities: [] };
      }
      symptomCounts[label].count++;
      if (intensity !== null && intensity !== undefined) {
        symptomCounts[label].intensities.push(intensity);
      }
    });

    // One-off symptoms (collect unique values)
    (entry.oneOffSymptoms ?? []).forEach(symptom => {
      allOneOffSymptoms.add(symptom);
    });
  });

  const topSymptoms = Object.entries(symptomCounts)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgIntensity: data.intensities.length > 0
        ? Math.round((data.intensities.reduce((a, b) => a + b, 0) / data.intensities.length) * 10) / 10
        : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Severity breakdown (assuming 0-10 scale)
  const allIntensities = Object.values(symptomCounts).flatMap(d => d.intensities);
  const severityBreakdown = {
    mild: allIntensities.filter(i => i <= 3).length,
    moderate: allIntensities.filter(i => i > 3 && i <= 7).length,
    severe: allIntensities.filter(i => i > 7).length,
  };

  return {
    totalEntries: entries.filter(e =>
      Object.keys(e.symptomIntensities || {}).length > 0 ||
      Object.keys(e.periodSymptomIntensities || {}).length > 0 ||
      (e.oneOffSymptoms ?? []).length > 0
    ).length,
    topSymptoms,
    severityBreakdown,
    oneOffSymptoms: Array.from(allOneOffSymptoms).sort(),
  };
}

interface MedicationStats {
  medications: Array<{
    name: string;
    frequency: number;
    commonDosage: string;
  }>;
}

function analyzeMedications(entries: StoredEntry[]): MedicationStats {
  const medCounts: Record<string, { count: number; dosages: string[] }> = {};

  entries.forEach(entry => {
    entry.medicineLog?.forEach(med => {
      if (!medCounts[med.medicineName]) {
        medCounts[med.medicineName] = { count: 0, dosages: [] };
      }
      medCounts[med.medicineName].count++;
      if (med.dosage) {
        medCounts[med.medicineName].dosages.push(med.dosage);
      }
    });
  });

  const medications = Object.entries(medCounts)
    .map(([name, data]) => {
      // Find most common dosage
      const dosageCounts: Record<string, number> = {};
      data.dosages.forEach(d => {
        dosageCounts[d] = (dosageCounts[d] || 0) + 1;
      });
      const commonDosage = Object.entries(dosageCounts).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0] || "Not tracked";

      return {
        name,
        frequency: data.count,
        commonDosage,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  return { medications };
}

// ============================================
// Clinical Insights Generation
// ============================================

interface ClinicalInsights {
  adherence: {
    totalDays: number;
    daysLogged: number;
    adherenceRate: number;
  };
  topSymptoms: Array<{ name: string; count: number; avgIntensity: number | null }>;
  dominantStoolPattern: {
    type: number | null;
    name: string;
    percentage: number;
  };
  cycleRegularity: {
    status: string;
    averageLength: number | null;
    variability: string;
  };
  medicationOverview: {
    totalMedications: number;
    mostUsed: string | null;
  };
  notableCorrelations: string[];
  trends: {
    symptoms: {
      frequency: string;
      variability: string;
      direction: string;
    };
    bowel: {
      frequency: string;
      variability: string;
      direction: string;
    };
    cycle: {
      frequency: string;
      variability: string;
      direction: string;
    };
    medications: {
      frequency: string;
      variability: string;
      direction: string;
    };
  };
}

function generateClinicalInsights(
  entries: StoredEntry[],
  dateRange: { start: string; end: string }
): ClinicalInsights {
  const totalDays = calculateDaysDifference(dateRange.start, dateRange.end) + 1;
  const daysLogged = new Set(entries.map(e => e.date)).size;
  const adherenceRate = Math.round((daysLogged / totalDays) * 100);

  // Analyze symptoms
  const symptomStats = analyzeSymptoms(entries);
  const topSymptoms = symptomStats.topSymptoms.slice(0, 3);

  // Analyze stool patterns
  const stoolStats = analyzeStoolLogs(entries);
  let dominantStoolPattern = {
    type: null as number | null,
    name: "No data",
    percentage: 0,
  };
  if (stoolStats.mostCommonType) {
    const bristol = BRISTOL_TYPES.find(b => b.type === stoolStats.mostCommonType);
    const percentage = Math.round(
      (stoolStats.distribution[stoolStats.mostCommonType] / stoolStats.totalEntries) * 100
    );
    dominantStoolPattern = {
      type: stoolStats.mostCommonType,
      name: bristol?.name || "Unknown",
      percentage,
    };
  }

  // Analyze cycle regularity
  const cycleStats = analyzeCycleData(entries);
  let cycleRegularity = {
    status: "No data",
    averageLength: null as number | null,
    variability: "N/A",
  };
  if (cycleStats.cycleCount > 0) {
    const avgLength = cycleStats.averageLength;
    if (avgLength) {
      // Calculate variability from average
      const cycleLengths: number[] = [];
      for (let i = 0; i < cycleStats.periodDetails.length - 1; i++) {
        const length = cycleStats.periodDetails[i].lengthDays;
        if (length) cycleLengths.push(length);
      }

      let variability = "Consistent";
      if (cycleLengths.length > 1) {
        const stdDev = Math.sqrt(
          cycleLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / cycleLengths.length
        );
        if (stdDev > 7) variability = "Irregular";
        else if (stdDev > 3) variability = "Variable";
      }

      cycleRegularity = {
        status: avgLength >= 21 && avgLength <= 35 ? "Regular" : "Outside typical range",
        averageLength: avgLength,
        variability,
      };
    }
  }

  // Analyze medications
  const medStats = analyzeMedications(entries);
  const medicationOverview = {
    totalMedications: medStats.medications.length,
    mostUsed: medStats.medications[0]?.name || null,
  };

  // Detect notable correlations
  const notableCorrelations: string[] = [];

  // Check symptom-cycle correlation
  const menstrualEntries = entries.filter(e => e.cyclePhase === "menstrual");
  if (menstrualEntries.length > 0 && symptomStats.topSymptoms.length > 0) {
    menstrualEntries.forEach(entry => {
      const hasTopSymptoms = symptomStats.topSymptoms.some(
        s => entry.symptomIntensities?.[s.name] || entry.periodSymptomIntensities?.[s.name.replace(" (period)", "")]
      );
      if (hasTopSymptoms) {
        notableCorrelations.push("Top symptoms frequently occur during menstrual phase");
      }
    });
  }

  // Check medication-symptom correlation
  if (medStats.medications.length > 0 && symptomStats.topSymptoms.length > 0) {
    const medDates = new Set(
      entries.filter(e => e.medicineLog && e.medicineLog.length > 0).map(e => e.date)
    );
    const symptomDates = new Set(
      entries.filter(e =>
        Object.keys(e.symptomIntensities || {}).length > 0 ||
        Object.keys(e.periodSymptomIntensities || {}).length > 0
      ).map(e => e.date)
    );
    const overlap = [...medDates].filter(d => symptomDates.has(d)).length;
    const overlapRate = overlap / Math.max(medDates.size, 1);
    if (overlapRate > 0.7) {
      notableCorrelations.push("Medication usage often coincides with symptom reporting");
    }
  }

  // Generate trend analysis
  const trends = {
    symptoms: analyzeTrend(entries, "symptoms"),
    bowel: analyzeTrend(entries, "bowel"),
    cycle: analyzeTrend(entries, "cycle"),
    medications: analyzeTrend(entries, "medications"),
  };

  return {
    adherence: {
      totalDays,
      daysLogged,
      adherenceRate,
    },
    topSymptoms,
    dominantStoolPattern,
    cycleRegularity,
    medicationOverview,
    notableCorrelations: [...new Set(notableCorrelations)].slice(0, 3),
    trends,
  };
}

function analyzeTrend(
  entries: StoredEntry[],
  category: "symptoms" | "bowel" | "cycle" | "medications"
): { frequency: string; variability: string; direction: string } {
  let frequency = "Not tracked";
  let variability = "N/A";
  let direction = "Stable";

  if (category === "symptoms") {
    const symptomEntries = entries.filter(e =>
      Object.keys(e.symptomIntensities || {}).length > 0 ||
      Object.keys(e.periodSymptomIntensities || {}).length > 0
    );
    const rate = symptomEntries.length / Math.max(entries.length, 1);
    frequency = rate > 0.7 ? "High" : rate > 0.4 ? "Moderate" : rate > 0 ? "Low" : "None";

    // Check variability by looking at intensity changes
    const allIntensities: number[] = [];
    symptomEntries.forEach(e => {
      Object.values(e.symptomIntensities || {}).forEach(i => {
        if (i !== null && i !== undefined) allIntensities.push(i);
      });
      Object.values(e.periodSymptomIntensities || {}).forEach(i => {
        if (i !== null && i !== undefined) allIntensities.push(i);
      });
    });
    if (allIntensities.length > 1) {
      const avg = allIntensities.reduce((a, b) => a + b, 0) / allIntensities.length;
      const stdDev = Math.sqrt(
        allIntensities.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / allIntensities.length
      );
      variability = stdDev > 3 ? "High" : stdDev > 1.5 ? "Moderate" : "Low";

      // Direction: compare first half vs second half
      const midpoint = Math.floor(allIntensities.length / 2);
      const firstHalf = allIntensities.slice(0, midpoint);
      const secondHalf = allIntensities.slice(midpoint);
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = avgSecond - avgFirst;
      if (Math.abs(diff) > 1) {
        direction = diff > 0 ? "Increasing" : "Decreasing";
      }
    }
  } else if (category === "bowel") {
    const bowelEntries = entries.filter(e => e.stoolType !== null);
    const rate = bowelEntries.length / Math.max(entries.length, 1);
    frequency = rate > 0.7 ? "Daily" : rate > 0.4 ? "Frequent" : rate > 0 ? "Occasional" : "None";

    if (bowelEntries.length > 1) {
      const types = bowelEntries.map(e => e.stoolType!);
      const avg = types.reduce((a, b) => a + b, 0) / types.length;
      const stdDev = Math.sqrt(
        types.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / types.length
      );
      variability = stdDev > 1.5 ? "Variable" : stdDev > 0.7 ? "Moderate" : "Consistent";

      // Direction
      const midpoint = Math.floor(types.length / 2);
      const avgFirst = types.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
      const avgSecond = types.slice(midpoint).reduce((a, b) => a + b, 0) / (types.length - midpoint);
      const diff = avgSecond - avgFirst;
      if (Math.abs(diff) > 0.5) {
        direction = diff > 0 ? "Trending firmer" : "Trending softer";
      }
    }
  } else if (category === "cycle") {
    const cycleStats = analyzeCycleData(entries);
    if (cycleStats.cycleCount > 0) {
      frequency = cycleStats.cycleCount === 1 ? "One cycle" : `${cycleStats.cycleCount} cycles`;
      const avgLength = cycleStats.averageLength;
      if (avgLength) {
        const cycleLengths: number[] = [];
        for (let i = 0; i < cycleStats.periodDetails.length - 1; i++) {
          const length = cycleStats.periodDetails[i].lengthDays;
          if (length) cycleLengths.push(length);
        }
        if (cycleLengths.length > 1) {
          const stdDev = Math.sqrt(
            cycleLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / cycleLengths.length
          );
          variability = stdDev > 7 ? "Irregular" : stdDev > 3 ? "Variable" : "Regular";

          // Direction
          if (cycleLengths.length >= 2) {
            const trend = cycleLengths[cycleLengths.length - 1] - cycleLengths[0];
            if (Math.abs(trend) > 3) {
              direction = trend > 0 ? "Lengthening" : "Shortening";
            }
          }
        }
      }
    }
  } else if (category === "medications") {
    const medEntries = entries.filter(e => e.medicineLog && e.medicineLog.length > 0);
    const rate = medEntries.length / Math.max(entries.length, 1);
    frequency = rate > 0.7 ? "Daily" : rate > 0.4 ? "Frequent" : rate > 0 ? "Occasional" : "None";

    if (medEntries.length > 1) {
      const counts = medEntries.map(e => e.medicineLog!.length);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const stdDev = Math.sqrt(
        counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length
      );
      variability = stdDev > 1 ? "Variable" : stdDev > 0.5 ? "Moderate" : "Consistent";

      // Direction
      const midpoint = Math.floor(counts.length / 2);
      const avgFirst = counts.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
      const avgSecond = counts.slice(midpoint).reduce((a, b) => a + b, 0) / (counts.length - midpoint);
      const diff = avgSecond - avgFirst;
      if (Math.abs(diff) > 0.5) {
        direction = diff > 0 ? "Increasing usage" : "Decreasing usage";
      }
    }
  }

  return { frequency, variability, direction };
}

// ============================================
// PDF Generation
// ============================================

interface PDFOptions {
  sections: LogSection[];
  dateRange: {
    start: string;
    end: string;
  };
  entries: StoredEntry[];
}

export async function generatePDFReport(options: PDFOptions): Promise<void> {
  const { sections, dateRange, entries } = options;

  // Filter entries by date range
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return entryDate >= startDate && entryDate <= endDate;
  });

  // Determine if AVS mode should be used
  const totalDays = calculateDaysDifference(dateRange.start, dateRange.end) + 1;
  const allCategoriesSelected = sections.length === 4 &&
    sections.includes("symptoms") &&
    sections.includes("bowel") &&
    sections.includes("period") &&
    sections.includes("medicine");
  const isLongRange = totalDays > 180;
  const useAVSMode = allCategoriesSelected && isLongRange;

  // Generate clinical insights for AVS mode
  const insights = useAVSMode ? generateClinicalInsights(filteredEntries, dateRange) : null;

  // Dynamically import jsPDF (client-side only)
  const { default: jsPDF } = await import("jspdf");

  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colors (using RGB values)
  const colors = {
    primary: [16, 75, 85], // app-teal
    text: [89, 87, 46], // app-charcoal
    gray: [122, 122, 122], // app-gray
    accent: [63, 89, 46], // app-green
  };

  // Helper to add a new page if needed
  const checkPageBreak = (requiredSpace: number = 10) => {
    if (yPos + requiredSpace > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper to add text
  const addText = (
    text: string,
    fontSize: number,
    isBold: boolean = false,
    color: number[] = colors.text,
    indent: number = 0
  ) => {
    checkPageBreak(fontSize + 2);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont("helvetica", isBold ? "bold" : "normal");

    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      checkPageBreak(fontSize + 2);
      doc.text(line, margin + indent, yPos);
      yPos += fontSize * 0.5 + 2;
    });
  };

  // ============================================
  // HEADER
  // ============================================

  // Add logo and title
  const logoSize = 10;
  const logoPxSize = 420; // Render at higher res for quality
  let titleX = margin;

  try {
    // Convert SVG to PNG and add to PDF
    const logoPng = await svgToPngDataUrl(LOGO_SVG_STRING, logoPxSize);
    doc.addImage(logoPng, "PNG", margin, yPos - 6, logoSize, logoSize);
    titleX = margin + logoSize + 4;
  } catch {
    // Logo conversion failed, continue without logo
  }

  // Title
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const title = useAVSMode ? "Health Summary Report" : "Health Tracking Report";
  doc.text(title, titleX, yPos + (titleX > margin ? 4 : 0));
  yPos += titleX > margin ? 14 : 10;

  // Generation info
  doc.setFontSize(9);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Report Period: ${formatDateRange(dateRange.start, dateRange.end)}`, margin, yPos);
  yPos += 6;

  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })}`, margin, yPos);
  yPos += 6;

  // Disclaimer
  doc.setFont("helvetica", "italic");
  doc.text(`Disclaimer: All data is self-reported and should be used only to support clinical assessment.`, margin, yPos);
  yPos += 12;

  // ============================================
  // EXECUTIVE SUMMARY (AVS Mode Only)
  // ============================================

  if (useAVSMode && insights) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Executive Summary", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    // Days logged + adherence
    addText(
      `• Tracking adherence: ${insights.adherence.daysLogged} of ${insights.adherence.totalDays} days logged (${insights.adherence.adherenceRate}%)`,
      10,
      false,
      colors.text,
      5
    );

    // Top symptoms
    if (insights.topSymptoms.length > 0) {
      const symptomsList = insights.topSymptoms
        .map(s => {
          const intensity = s.avgIntensity ? ` (avg ${s.avgIntensity}/10)` : "";
          return `${s.name}${intensity}`;
        })
        .join(", ");
      addText(`• Top symptoms: ${symptomsList}`, 10, false, colors.text, 5);
    } else {
      addText(`• Top symptoms: None reported`, 10, false, colors.text, 5);
    }

    // Dominant stool pattern
    if (insights.dominantStoolPattern.type) {
      addText(
        `• Dominant stool pattern: Type ${insights.dominantStoolPattern.type} - ${insights.dominantStoolPattern.name} (${insights.dominantStoolPattern.percentage}% of logs)`,
        10,
        false,
        colors.text,
        5
      );
    } else {
      addText(`• Dominant stool pattern: No bowel movements logged`, 10, false, colors.text, 5);
    }

    // Cycle regularity
    if (insights.cycleRegularity.averageLength) {
      addText(
        `• Cycle regularity: ${insights.cycleRegularity.status}, avg ${insights.cycleRegularity.averageLength} days (${insights.cycleRegularity.variability})`,
        10,
        false,
        colors.text,
        5
      );
    } else {
      addText(`• Cycle regularity: No cycle data available`, 10, false, colors.text, 5);
    }

    // Medication usage
    if (insights.medicationOverview.totalMedications > 0) {
      const mostUsedText = insights.medicationOverview.mostUsed
        ? `, most frequent: ${insights.medicationOverview.mostUsed}`
        : "";
      addText(
        `• Medication usage: ${insights.medicationOverview.totalMedications} medication(s) tracked${mostUsedText}`,
        10,
        false,
        colors.text,
        5
      );
    } else {
      addText(`• Medication usage: No medications logged`, 10, false, colors.text, 5);
    }

    // Notable correlations
    if (insights.notableCorrelations.length > 0) {
      addText(`• Notable correlations:`, 10, false, colors.text, 5);
      insights.notableCorrelations.forEach(correlation => {
        addText(`  - ${correlation}`, 9, false, colors.gray, 10);
      });
    } else {
      addText(`• Notable correlations: None identified`, 10, false, colors.text, 5);
    }

    yPos += 8;

    // ============================================
    // PATTERNS & TRENDS (AVS Mode Only)
    // ============================================

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Patterns & Trends", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    // Symptoms trends
    const sympTrend = insights.trends.symptoms;
    if (sympTrend.frequency !== "Not tracked" && sympTrend.frequency !== "None") {
      doc.setFont("helvetica", "bold");
      addText("Symptoms:", 10, false, colors.text, 5);
      doc.setFont("helvetica", "normal");
      addText(
        `• Frequency: ${sympTrend.frequency} | Variability: ${sympTrend.variability} | Direction: ${sympTrend.direction}`,
        9,
        false,
        colors.gray,
        10
      );
    }

    // Bowel trends
    const bowelTrend = insights.trends.bowel;
    if (bowelTrend.frequency !== "Not tracked" && bowelTrend.frequency !== "None") {
      doc.setFont("helvetica", "bold");
      addText("Bowel:", 10, false, colors.text, 5);
      doc.setFont("helvetica", "normal");
      addText(
        `• Frequency: ${bowelTrend.frequency} | Variability: ${bowelTrend.variability} | Direction: ${bowelTrend.direction}`,
        9,
        false,
        colors.gray,
        10
      );
    }

    // Cycle trends
    const cycleTrend = insights.trends.cycle;
    if (cycleTrend.frequency !== "Not tracked") {
      doc.setFont("helvetica", "bold");
      addText("Cycle:", 10, false, colors.text, 5);
      doc.setFont("helvetica", "normal");
      addText(
        `• Frequency: ${cycleTrend.frequency} | Variability: ${cycleTrend.variability} | Direction: ${cycleTrend.direction}`,
        9,
        false,
        colors.gray,
        10
      );
    }

    // Medication trends
    const medTrend = insights.trends.medications;
    if (medTrend.frequency !== "Not tracked" && medTrend.frequency !== "None") {
      doc.setFont("helvetica", "bold");
      addText("Medications:", 10, false, colors.text, 5);
      doc.setFont("helvetica", "normal");
      addText(
        `• Frequency: ${medTrend.frequency} | Variability: ${medTrend.variability} | Direction: ${medTrend.direction}`,
        9,
        false,
        colors.gray,
        10
      );
    }

    yPos += 8;

    // ============================================
    // CATEGORY SUMMARIES (AVS Mode Only)
    // ============================================

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Category Summaries", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    // Symptoms summary
    const symptomStats = analyzeSymptoms(filteredEntries);
    doc.setFont("helvetica", "bold");
    addText("Symptoms Summary:", 10, false, colors.text, 5);
    doc.setFont("helvetica", "normal");
    if (symptomStats.totalEntries > 0) {
      addText(`• ${symptomStats.totalEntries} entries with symptoms logged`, 9, false, colors.gray, 10);
      if (symptomStats.topSymptoms.length > 0) {
        addText(
          `• Most frequent: ${symptomStats.topSymptoms[0].name} (${symptomStats.topSymptoms[0].count} occurrences)`,
          9,
          false,
          colors.gray,
          10
        );
      }
      const totalIntensities =
        symptomStats.severityBreakdown.mild +
        symptomStats.severityBreakdown.moderate +
        symptomStats.severityBreakdown.severe;
      if (totalIntensities > 0) {
        const severePercent = Math.round(
          (symptomStats.severityBreakdown.severe / totalIntensities) * 100
        );
        addText(
          `• Severity: ${severePercent}% severe, ${Math.round((symptomStats.severityBreakdown.moderate / totalIntensities) * 100)}% moderate, ${Math.round((symptomStats.severityBreakdown.mild / totalIntensities) * 100)}% mild`,
          9,
          false,
          colors.gray,
          10
        );
      }
    } else {
      addText(`• No symptoms logged`, 9, false, colors.gray, 10);
    }
    yPos += 2;

    // Bowel summary
    const stoolStats = analyzeStoolLogs(filteredEntries);
    doc.setFont("helvetica", "bold");
    addText("Bowel Summary:", 10, false, colors.text, 5);
    doc.setFont("helvetica", "normal");
    if (stoolStats.totalEntries > 0) {
      addText(`• ${stoolStats.totalEntries} bowel movements logged`, 9, false, colors.gray, 10);
      if (stoolStats.mostCommonType) {
        const bristol = BRISTOL_TYPES.find(b => b.type === stoolStats.mostCommonType);
        addText(`• Most common: Type ${stoolStats.mostCommonType} - ${bristol?.name}`, 9, false, colors.gray, 10);
      }
      // Count abnormal types (1, 2, 6, 7)
      const abnormal = (stoolStats.distribution[1] || 0) + (stoolStats.distribution[2] || 0) +
        (stoolStats.distribution[6] || 0) + (stoolStats.distribution[7] || 0);
      const abnormalPercent = Math.round((abnormal / stoolStats.totalEntries) * 100);
      addText(`• Abnormal patterns: ${abnormalPercent}% (Types 1, 2, 6, 7)`, 9, false, colors.gray, 10);
    } else {
      addText(`• No bowel movements logged`, 9, false, colors.gray, 10);
    }
    yPos += 2;

    // Cycle summary
    const cycleStats = analyzeCycleData(filteredEntries);
    doc.setFont("helvetica", "bold");
    addText("Cycle Summary:", 10, false, colors.text, 5);
    doc.setFont("helvetica", "normal");
    if (cycleStats.cycleCount > 0) {
      addText(`• ${cycleStats.cycleCount} cycle(s) tracked`, 9, false, colors.gray, 10);
      if (cycleStats.averageLength) {
        addText(`• Average length: ${cycleStats.averageLength} days`, 9, false, colors.gray, 10);
      }
      if (insights.cycleRegularity.variability !== "N/A") {
        addText(`• Pattern: ${insights.cycleRegularity.variability}`, 9, false, colors.gray, 10);
      }
    } else {
      addText(`• No cycle data logged`, 9, false, colors.gray, 10);
    }
    yPos += 2;

    // Medication summary
    const medStats = analyzeMedications(filteredEntries);
    doc.setFont("helvetica", "bold");
    addText("Medication Summary:", 10, false, colors.text, 5);
    doc.setFont("helvetica", "normal");
    if (medStats.medications.length > 0) {
      addText(`• ${medStats.medications.length} medication(s) tracked`, 9, false, colors.gray, 10);
      if (medStats.medications[0]) {
        addText(
          `• Most used: ${medStats.medications[0].name} (${medStats.medications[0].frequency} times)`,
          9,
          false,
          colors.gray,
          10
        );
      }
    } else {
      addText(`• No medications logged`, 9, false, colors.gray, 10);
    }

    yPos += 8;

    // Add page break before appendix
    doc.addPage();
    yPos = margin;

    // Add appendix header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Appendix: Detailed Logs", margin, yPos);
    yPos += 10;
  }

  // ============================================
  // OVERVIEW SECTION (Non-AVS Mode Only)
  // ============================================

  if (!useAVSMode) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text("Overview", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const periodDays = calculateDaysDifference(dateRange.start, dateRange.end) + 1;
    addText(`Report period: ${periodDays} days`, 10);
    addText(`Total entries: ${filteredEntries.length}`, 10);

    const sectionLabels: Record<LogSection, string> = {
      symptoms: "Symptoms",
      bowel: "Stool logs",
      period: "Cycle data",
      medicine: "Medications",
    };
    addText(`Categories included: ${sections.map(s => sectionLabels[s]).join(", ")}`, 10);

    yPos += 6;
  }

  // ============================================
  // CYCLE DATA SECTION
  // ============================================

  if (sections.includes("period")) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    const cycleTitle = useAVSMode ? "Appendix A: Cycle Data" : "Cycle Data";
    doc.text(cycleTitle, margin, yPos);
    yPos += 8;

    const cycleStats = analyzeCycleData(filteredEntries);

    if (cycleStats.cycleCount === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      addText("No cycle data logged in this period", 10);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      addText(`Cycles tracked: ${cycleStats.cycleCount}`, 10);
      if (cycleStats.averageLength) {
        addText(`Average cycle length: ${cycleStats.averageLength} days`, 10);
      }

      yPos += 4;
      doc.setFont("helvetica", "bold");
      addText("Period details:", 10);
      doc.setFont("helvetica", "normal");

      cycleStats.periodDetails.forEach(detail => {
        checkPageBreak(20);
        addText(`• Cycle ${detail.cycleNumber}: Started ${new Date(detail.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, 9, false, colors.text, 5);
        const flowInfo = detail.flowStartTimes.length > 0
          ? `Flow: ${detail.averageFlow} (started at ${detail.flowStartTimes[0]})`
          : `Flow: ${detail.averageFlow}`;
        if (detail.lengthDays) {
          addText(`  Length: ${detail.lengthDays} days, ${flowInfo}`, 9, false, colors.gray, 5);
        } else {
          addText(`  ${flowInfo} (ongoing or last cycle)`, 9, false, colors.gray, 5);
        }
      });
    }

    yPos += 6;
  }

  // ============================================
  // STOOL LOGS SECTION
  // ============================================

  if (sections.includes("bowel")) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    const stoolTitle = useAVSMode ? "Appendix B: Stool Logs" : "Stool Logs";
    doc.text(stoolTitle, margin, yPos);
    yPos += 8;

    const stoolStats = analyzeStoolLogs(filteredEntries);

    if (stoolStats.totalEntries === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      addText("No stool entries in this period", 10);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      addText(`Total bowel movements logged: ${stoolStats.totalEntries}`, 10);

      if (stoolStats.mostCommonType) {
        const bristol = BRISTOL_TYPES.find(b => b.type === stoolStats.mostCommonType);
        addText(`Most common type: Type ${stoolStats.mostCommonType} - ${bristol?.name || "Unknown"}`, 10);
      }

      yPos += 4;
      doc.setFont("helvetica", "bold");
      addText("Bristol Stool Scale distribution:", 10);
      doc.setFont("helvetica", "normal");

      Object.entries(stoolStats.distribution)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([type, count]) => {
          const bristol = BRISTOL_TYPES.find(b => b.type === Number(type));
          const percentage = Math.round((count / stoolStats.totalEntries) * 100);
          addText(`• Type ${type} (${bristol?.name}): ${count} entries (${percentage}%)`, 9, false, colors.text, 5);
        });
    }

    yPos += 6;
  }

  // ============================================
  // SYMPTOMS SECTION
  // ============================================

  if (sections.includes("symptoms")) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    const symptomsTitle = useAVSMode ? "Appendix C: Symptoms" : "Symptoms";
    doc.text(symptomsTitle, margin, yPos);
    yPos += 8;

    const symptomStats = analyzeSymptoms(filteredEntries);

    if (symptomStats.totalEntries === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      addText("No symptoms logged in this period", 10);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      addText(`Entries with symptoms: ${symptomStats.totalEntries}`, 10);

      if (symptomStats.topSymptoms.length > 0) {
        yPos += 4;
        doc.setFont("helvetica", "bold");
        addText("Most frequent symptoms:", 10);
        doc.setFont("helvetica", "normal");

        symptomStats.topSymptoms.forEach((symptom, index) => {
          const intensityStr = symptom.avgIntensity
            ? `, avg intensity: ${symptom.avgIntensity}/10`
            : "";
          addText(`${index + 1}. ${symptom.name}: ${symptom.count} occurrences${intensityStr}`, 9, false, colors.text, 5);
        });
      }

      // Severity breakdown
      const totalWithIntensity = symptomStats.severityBreakdown.mild +
        symptomStats.severityBreakdown.moderate +
        symptomStats.severityBreakdown.severe;

      if (totalWithIntensity > 0) {
        yPos += 4;
        doc.setFont("helvetica", "bold");
        addText("Severity distribution:", 10);
        doc.setFont("helvetica", "normal");

        addText(`• Mild (0-3): ${symptomStats.severityBreakdown.mild} reports`, 9, false, colors.text, 5);
        addText(`• Moderate (4-7): ${symptomStats.severityBreakdown.moderate} reports`, 9, false, colors.text, 5);
        addText(`• Severe (8-10): ${symptomStats.severityBreakdown.severe} reports`, 9, false, colors.text, 5);
      }

      // One-off symptoms
      if (symptomStats.oneOffSymptoms.length > 0) {
        yPos += 4;
        doc.setFont("helvetica", "bold");
        addText("One-off symptoms:", 10);
        doc.setFont("helvetica", "normal");

        addText(symptomStats.oneOffSymptoms.join(", "), 9, false, colors.text, 5);
      }
    }

    yPos += 6;
  }

  // ============================================
  // MEDICATIONS SECTION
  // ============================================

  if (sections.includes("medicine")) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    const medicationsTitle = useAVSMode ? "Appendix D: Medications" : "Medications";
    doc.text(medicationsTitle, margin, yPos);
    yPos += 8;

    const medStats = analyzeMedications(filteredEntries);

    if (medStats.medications.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      addText("No medications logged in this period", 10);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      addText("Active medications and usage:", 10);
      yPos += 2;

      medStats.medications.forEach(med => {
        addText(`• ${med.name}`, 9, true, colors.text, 5);
        addText(`  Frequency: ${med.frequency} times, Common dosage: ${med.commonDosage}`, 9, false, colors.gray, 5);
      });
    }

    yPos += 6;
  }

  // ============================================
  // FOOTER - Disclaimer
  // ============================================

  // Move to bottom of last page
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);

  // Add disclaimer at bottom
  const disclaimerY = pageHeight - margin - 15;
  doc.setFontSize(8);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.setFont("helvetica", "italic");

  const disclaimer = "This report contains self-reported data and is solely intended to support clinical conversations, not diagnose.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);

  let disclaimerYPos = disclaimerY;
  disclaimerLines.forEach((line: string) => {
    doc.text(line, margin, disclaimerYPos);
    disclaimerYPos += 4;
  });

  // Add page numbers to all pages
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - margin,
      { align: "right" }
    );
  }

  // Generate filename
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `health-report-${dateStr}.pdf`;

  // Save PDF
  doc.save(filename);
}
