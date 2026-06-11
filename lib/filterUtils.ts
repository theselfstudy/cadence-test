// ============================================
// History Filter Utilities
// ============================================

import type {
  StoredEntry,
  HistoryFilters,
  ActiveFilter,
  AvailableFilterOptions,
  CyclePhase,
  BristolScaleType,
  PostBowelFeeling,
  FlowLevel,
} from "@/types";

import { CYCLE_PHASES, BRISTOL_TYPES, POST_BOWEL_FEELINGS } from "@/lib/constants";

// ============================================
// DEFAULT/EMPTY FILTERS
// ============================================

/**
 * Creates an empty filter state (no filters active)
 */
export function createEmptyFilters(): HistoryFilters {
  return {
    selectedSymptoms: [],
    selectedCyclePhases: [],
    selectedFlowLevels: [],
    selectedBristolTypes: [],
    selectedFeelings: [],
    selectedMedicines: [],
  };
}

// ============================================
// FILTER MATCHING LOGIC
// ============================================

/**
 * Checks if an entry matches the current filters.
 * 
 * Logic:
 * - OR within same category (entry matches if it has ANY of the selected symptoms)
 * - AND across categories (entry must match ALL categories that have selections)
 */
export function entryMatchesFilters(
  entry: StoredEntry,
  filters: HistoryFilters
): boolean {
  // If no filters are active, entry matches
  if (!hasActiveFilters(filters)) {
    return true;
  }

  // Check each category - must pass ALL categories that have selections
  
  // Symptoms: entry must have at least one of the selected symptoms
  if (filters.selectedSymptoms.length > 0) {
    const entrySymptoms = [
      ...Object.keys(entry.symptomIntensities),
      ...Object.keys(entry.periodSymptomIntensities),
    ];
    const hasMatchingSymptom = filters.selectedSymptoms.some(
      symptom => entrySymptoms.includes(symptom)
    );
    if (!hasMatchingSymptom) return false;
  }

  // Cycle Phase: entry must have one of the selected phases
  if (filters.selectedCyclePhases.length > 0) {
    if (!entry.cyclePhase || !filters.selectedCyclePhases.includes(entry.cyclePhase)) {
      return false;
    }
  }

  // Flow Level: entry must have one of the selected flow levels
  if (filters.selectedFlowLevels.length > 0) {
    if (!entry.periodFlow || !filters.selectedFlowLevels.includes(entry.periodFlow as FlowLevel)) {
      return false;
    }
  }

  // Bristol Type: entry must have one of the selected types
  if (filters.selectedBristolTypes.length > 0) {
    if (!entry.stoolType || !filters.selectedBristolTypes.includes(entry.stoolType)) {
      return false;
    }
  }

  // Post-Bowel Feeling: entry must have one of the selected feelings
  if (filters.selectedFeelings.length > 0) {
    if (!entry.stoolFeeling || !filters.selectedFeelings.includes(entry.stoolFeeling)) {
      return false;
    }
  }

  // Medicine: entry must have at least one of the selected medicines
  if (filters.selectedMedicines.length > 0) {
    const entryMedicines = entry.medicineLog.map(m => m.medicineName);
    const hasMatchingMedicine = filters.selectedMedicines.some(
      medicine => entryMedicines.includes(medicine)
    );
    if (!hasMatchingMedicine) return false;
  }

  return true;
}

/**
 * Checks if any filters are currently active
 */
export function hasActiveFilters(filters: HistoryFilters): boolean {
  return (
    filters.selectedSymptoms.length > 0 ||
    filters.selectedCyclePhases.length > 0 ||
    filters.selectedFlowLevels.length > 0 ||
    filters.selectedBristolTypes.length > 0 ||
    filters.selectedFeelings.length > 0 ||
    filters.selectedMedicines.length > 0
  );
}

/**
 * Counts total number of active filter selections
 */
export function getActiveFilterCount(filters: HistoryFilters): number {
  return (
    filters.selectedSymptoms.length +
    filters.selectedCyclePhases.length +
    filters.selectedFlowLevels.length +
    filters.selectedBristolTypes.length +
    filters.selectedFeelings.length +
    filters.selectedMedicines.length
  );
}

/**
 * Gets count of active filters per category (for badge display)
 */
export function getCategoryFilterCounts(filters: HistoryFilters): Record<string, number> {
  return {
    symptoms: filters.selectedSymptoms.length,
    cycle: filters.selectedCyclePhases.length + filters.selectedFlowLevels.length,
    bowel: filters.selectedBristolTypes.length + filters.selectedFeelings.length,
    medicine: filters.selectedMedicines.length,
  };
}

// ============================================
// ACTIVE FILTER CHIPS
// ============================================

/**
 * Converts current filter state into an array of ActiveFilter objects
 * for displaying as removable chips
 */
export function getActiveFilters(filters: HistoryFilters): ActiveFilter[] {
  const active: ActiveFilter[] = [];

  // Symptoms
  for (const symptom of filters.selectedSymptoms) {
    active.push({
      category: "symptoms",
      type: "symptom",
      value: symptom,
      label: symptom,
    });
  }

  // Cycle Phases
  for (const phase of filters.selectedCyclePhases) {
    const phaseInfo = CYCLE_PHASES.find(p => p.value === phase);
    active.push({
      category: "cycle",
      type: "phase",
      value: phase,
      label: phaseInfo?.label || phase,
    });
  }

  // Flow Levels
  for (const flow of filters.selectedFlowLevels) {
    active.push({
      category: "cycle",
      type: "flow",
      value: flow,
      label: capitalizeFirst(flow),
    });
  }

  // Bristol Types
  for (const bristol of filters.selectedBristolTypes) {
    const bristolInfo = BRISTOL_TYPES.find(b => b.type === bristol);
    active.push({
      category: "bowel",
      type: "bristol",
      value: String(bristol),
      label: `Type ${bristol}${bristolInfo ? ` - ${bristolInfo.name}` : ""}`,
    });
  }

  // Feelings
  for (const feeling of filters.selectedFeelings) {
    const feelingInfo = POST_BOWEL_FEELINGS.find(f => f.value === feeling);
    active.push({
      category: "bowel",
      type: "feeling",
      value: feeling,
      label: feelingInfo?.label || feeling,
    });
  }

  // Medicines
  for (const medicine of filters.selectedMedicines) {
    active.push({
      category: "medicine",
      type: "medicine",
      value: medicine,
      label: medicine,
    });
  }

  return active;
}

// ============================================
// AVAILABLE OPTIONS EXTRACTION
// ============================================

/**
 * Extracts all unique filter options from a set of entries.
 * Used to populate filter dropdowns with only relevant options.
 */
export function getAvailableFilterOptions(entries: StoredEntry[]): AvailableFilterOptions {
  const symptoms = new Set<string>();
  const cyclePhases = new Set<CyclePhase>();
  const flowLevels = new Set<FlowLevel>();
  const bristolTypes = new Set<BristolScaleType>();
  const feelings = new Set<PostBowelFeeling>();
  const medicines = new Set<string>();

  for (const entry of entries) {
    // Collect symptoms (both general and period)
    for (const symptom of Object.keys(entry.symptomIntensities)) {
      symptoms.add(symptom);
    }
    for (const symptom of Object.keys(entry.periodSymptomIntensities)) {
      symptoms.add(symptom);
    }

    // Collect cycle data
    if (entry.cyclePhase) {
      cyclePhases.add(entry.cyclePhase);
    }
    if (entry.periodFlow) {
      flowLevels.add(entry.periodFlow as FlowLevel);
    }

    // Collect bowel data
    if (entry.stoolType) {
      bristolTypes.add(entry.stoolType);
    }
    if (entry.stoolFeeling) {
      feelings.add(entry.stoolFeeling);
    }

    // Collect medicines
    for (const med of entry.medicineLog) {
      medicines.add(med.medicineName);
    }
  }

  return {
    symptoms: Array.from(symptoms).sort(),
    cyclePhases: Array.from(cyclePhases),
    flowLevels: Array.from(flowLevels),
    bristolTypes: Array.from(bristolTypes).sort((a, b) => a - b),
    feelings: Array.from(feelings),
    medicines: Array.from(medicines).sort(),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Gets a human-readable label for a filter category
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    symptoms: "Symptoms",
    cycle: "Cycle",
    bowel: "Bowel",
    medicine: "Medicine",
  };
  return labels[category] || category;
}

/**
 * Gets the icon/emoji for a filter category
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    symptoms: "🏷️",
    cycle: "🌸",
    bowel: "🧻",
    medicine: "💊",
  };
  return icons[category] || "📋";
}