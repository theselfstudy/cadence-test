// ============================================
// Weekly Filters Hook
// Adapted from useHistoryFilters for weekly view
// ============================================

import { useState, useMemo, useCallback } from "react";
import type {
  StoredEntry,
  HistoryFilters,
  AvailableFilterOptions,
  CyclePhase,
  FlowLevel,
  BristolScaleType,
  PostBowelFeeling,
} from "@/types";

// ============================================
// DEFAULT FILTERS
// ============================================

const DEFAULT_FILTERS: HistoryFilters = {
  selectedSymptoms: [],
  selectedCyclePhases: [],
  selectedFlowLevels: [],
  selectedBristolTypes: [],
  selectedFeelings: [],
  selectedMedicines: [],
};

// ============================================
// HOOK
// ============================================

export function useWeeklyFilters(entries: StoredEntry[]) {
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);

  // ===== EXTRACT AVAILABLE OPTIONS FROM ENTRIES =====
  const availableOptions = useMemo((): AvailableFilterOptions => {
    const symptoms = new Set<string>();
    const cyclePhases = new Set<CyclePhase>();
    const flowLevels = new Set<FlowLevel>();
    const bristolTypes = new Set<BristolScaleType>();
    const feelings = new Set<PostBowelFeeling>();
    const medicines = new Set<string>();

    for (const entry of entries) {
      // Symptoms (general + period)
      for (const symptom of Object.keys(entry.symptomIntensities)) {
        symptoms.add(symptom);
      }
      for (const symptom of Object.keys(entry.periodSymptomIntensities)) {
        symptoms.add(symptom);
      }

      // Cycle data
      if (entry.cyclePhase) {
        cyclePhases.add(entry.cyclePhase);
      }
      if (entry.periodFlow) {
        flowLevels.add(entry.periodFlow as FlowLevel);
      }

      // Bowel data
      if (entry.stoolType) {
        bristolTypes.add(entry.stoolType);
      }
      if (entry.stoolFeeling) {
        feelings.add(entry.stoolFeeling);
      }

      // Medicines
      for (const log of entry.medicineLog) {
        medicines.add(log.medicineName);
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
  }, [entries]);

  // ===== FILTER ENTRIES =====
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Symptom filter
      if (filters.selectedSymptoms.length > 0) {
        const entrySymptoms = [
          ...Object.keys(entry.symptomIntensities),
          ...Object.keys(entry.periodSymptomIntensities),
        ];
        const hasMatchingSymptom = filters.selectedSymptoms.some((s) =>
          entrySymptoms.includes(s)
        );
        if (!hasMatchingSymptom) return false;
      }

      // Cycle phase filter
      if (filters.selectedCyclePhases.length > 0) {
        if (!entry.cyclePhase || !filters.selectedCyclePhases.includes(entry.cyclePhase)) {
          return false;
        }
      }

      // Flow level filter
      if (filters.selectedFlowLevels.length > 0) {
        if (!entry.periodFlow || !filters.selectedFlowLevels.includes(entry.periodFlow as FlowLevel)) {
          return false;
        }
      }

      // Bristol type filter
      if (filters.selectedBristolTypes.length > 0) {
        if (!entry.stoolType || !filters.selectedBristolTypes.includes(entry.stoolType)) {
          return false;
        }
      }

      // Feeling filter
      if (filters.selectedFeelings.length > 0) {
        if (!entry.stoolFeeling || !filters.selectedFeelings.includes(entry.stoolFeeling)) {
          return false;
        }
      }

      // Medicine filter
      if (filters.selectedMedicines.length > 0) {
        const entryMedicines = entry.medicineLog.map((m) => m.medicineName);
        const hasMatchingMedicine = filters.selectedMedicines.some((m) =>
          entryMedicines.includes(m)
        );
        if (!hasMatchingMedicine) return false;
      }

      return true;
    });
  }, [entries, filters]);

  // ===== ACTIVE FILTER COUNT =====
  const activeFilterCount = useMemo(() => {
    return (
      filters.selectedSymptoms.length +
      filters.selectedCyclePhases.length +
      filters.selectedFlowLevels.length +
      filters.selectedBristolTypes.length +
      filters.selectedFeelings.length +
      filters.selectedMedicines.length
    );
  }, [filters]);

  // ===== CATEGORY FILTER COUNTS =====
  const categoryFilterCounts = useMemo(() => {
    return {
      symptoms: filters.selectedSymptoms.length,
      cycle: filters.selectedCyclePhases.length + filters.selectedFlowLevels.length,
      bowel: filters.selectedBristolTypes.length + filters.selectedFeelings.length,
      medicine: filters.selectedMedicines.length,
    };
  }, [filters]);

  // ===== HAS FILTERS =====
  const hasFilters = activeFilterCount > 0;

  // ===== TOGGLE FUNCTIONS =====
  const toggleSymptom = useCallback((symptom: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedSymptoms: prev.selectedSymptoms.includes(symptom)
        ? prev.selectedSymptoms.filter((s) => s !== symptom)
        : [...prev.selectedSymptoms, symptom],
    }));
  }, []);

  const toggleCyclePhase = useCallback((phase: CyclePhase) => {
    setFilters((prev) => ({
      ...prev,
      selectedCyclePhases: prev.selectedCyclePhases.includes(phase)
        ? prev.selectedCyclePhases.filter((p) => p !== phase)
        : [...prev.selectedCyclePhases, phase],
    }));
  }, []);

  const toggleFlowLevel = useCallback((flow: FlowLevel) => {
    setFilters((prev) => ({
      ...prev,
      selectedFlowLevels: prev.selectedFlowLevels.includes(flow)
        ? prev.selectedFlowLevels.filter((f) => f !== flow)
        : [...prev.selectedFlowLevels, flow],
    }));
  }, []);

  const toggleBristolType = useCallback((type: BristolScaleType) => {
    setFilters((prev) => ({
      ...prev,
      selectedBristolTypes: prev.selectedBristolTypes.includes(type)
        ? prev.selectedBristolTypes.filter((t) => t !== type)
        : [...prev.selectedBristolTypes, type],
    }));
  }, []);

  const toggleFeeling = useCallback((feeling: PostBowelFeeling) => {
    setFilters((prev) => ({
      ...prev,
      selectedFeelings: prev.selectedFeelings.includes(feeling)
        ? prev.selectedFeelings.filter((f) => f !== feeling)
        : [...prev.selectedFeelings, feeling],
    }));
  }, []);

  const toggleMedicine = useCallback((medicine: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedMedicines: prev.selectedMedicines.includes(medicine)
        ? prev.selectedMedicines.filter((m) => m !== medicine)
        : [...prev.selectedMedicines, medicine],
    }));
  }, []);

  // ===== SELECT ALL FUNCTIONS =====
  const selectAllSymptoms = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      selectedSymptoms: [...availableOptions.symptoms],
    }));
  }, [availableOptions.symptoms]);

  const selectAllCycle = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      selectedCyclePhases: [...availableOptions.cyclePhases],
      selectedFlowLevels: [...availableOptions.flowLevels],
    }));
  }, [availableOptions.cyclePhases, availableOptions.flowLevels]);

  const selectAllBowel = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      selectedBristolTypes: [...availableOptions.bristolTypes],
      selectedFeelings: [...availableOptions.feelings],
    }));
  }, [availableOptions.bristolTypes, availableOptions.feelings]);

  const selectAllMedicine = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      selectedMedicines: [...availableOptions.medicines],
    }));
  }, [availableOptions.medicines]);

  // ===== CLEAR FUNCTIONS =====
  const clearCategory = useCallback((category: string) => {
    setFilters((prev) => {
      switch (category) {
        case "symptoms":
          return { ...prev, selectedSymptoms: [] };
        case "cycle":
          return { ...prev, selectedCyclePhases: [], selectedFlowLevels: [] };
        case "bowel":
          return { ...prev, selectedBristolTypes: [], selectedFeelings: [] };
        case "medicine":
          return { ...prev, selectedMedicines: [] };
        default:
          return prev;
      }
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    filteredEntries,
    activeFilterCount,
    categoryFilterCounts,
    availableOptions,
    hasFilters,
    toggleSymptom,
    toggleCyclePhase,
    toggleFlowLevel,
    toggleBristolType,
    toggleFeeling,
    toggleMedicine,
    selectAllSymptoms,
    selectAllCycle,
    selectAllBowel,
    selectAllMedicine,
    clearCategory,
    setFilters,
    clearAllFilters,
  };
}