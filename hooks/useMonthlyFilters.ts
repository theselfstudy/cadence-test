// ============================================
// useMonthlyFilters Hook
// Manages month navigation and filter state for monthly views
// ============================================

import { useState, useMemo, useCallback } from "react";
import type { StoredEntry, HistoryFilters, CyclePhase, BristolScaleType, PostBowelFeeling, FlowLevel } from "@/types";
import { 
  getMonthRange, 
  getDataMonthBounds, 
  getEntriesForMonth 
} from "@/lib/monthlyUtils";

// ============================================
// TYPES
// ============================================

export interface MonthlyFilterState {
  /** Selected day numbers within the month (1-31) */
  selectedDays: number[];
  /** Advanced filters (symptoms, cycle, bowel, medicine) */
  filters: HistoryFilters;
}

export interface AvailableMonthlyOptions {
  symptoms: string[];
  cyclePhases: CyclePhase[];
  flowLevels: FlowLevel[];
  bristolTypes: BristolScaleType[];
  feelings: PostBowelFeeling[];
  medicines: string[];
}

export interface UseMonthlyFiltersReturn {
  // Navigation
  monthOffset: number;
  monthRange: ReturnType<typeof getMonthRange>;
  canGoNext: boolean;
  canGoPrev: boolean;
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  goToCurrentMonth: () => void;
  goToMonth: (offset: number) => void;
  
  // Entries
  monthEntries: StoredEntry[];
  prevMonthEntries: StoredEntry[];
  filteredEntries: StoredEntry[];
  
  // Day selection
  selectedDays: number[];
  toggleDay: (day: number) => void;
  selectRange: (days: number[]) => void;
  selectAllDays: () => void;
  clearDaySelection: () => void;
  
  // Advanced filters
  filters: HistoryFilters;
  activeFilterCount: number;
  categoryFilterCounts: Record<string, number>;
  availableOptions: AvailableMonthlyOptions;
  hasAdvancedFilters: boolean;
  
  // Filter actions
  toggleSymptom: (symptom: string) => void;
  toggleCyclePhase: (phase: CyclePhase) => void;
  toggleFlowLevel: (flow: FlowLevel) => void;
  toggleBristolType: (type: BristolScaleType) => void;
  toggleFeeling: (feeling: PostBowelFeeling) => void;
  toggleMedicine: (medicine: string) => void;
  selectAllSymptoms: () => void;
  selectAllCycle: () => void;
  selectAllBowel: () => void;
  selectAllMedicine: () => void;
  // clearCategory: (category: "symptoms" | "cycle" | "bowel" | "medicine") => void;
  clearCategory: (category: string) => void;
  setFilters: (filters: HistoryFilters) => void;
  clearAllFilters: () => void;
  
  // Combined
  totalFilterCount: number;
  clearAllFiltersAndDays: () => void;
}

// ============================================
// DEFAULT FILTER STATE
// ============================================

const defaultFilters: HistoryFilters = {
  selectedSymptoms: [],
  selectedCyclePhases: [],
  selectedFlowLevels: [],
  selectedBristolTypes: [],
  selectedFeelings: [],
  selectedMedicines: [],
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useMonthlyFilters(
  allEntries: StoredEntry[],
  initialMonthOffset: number = 0,
  renderKey: number = 0
): UseMonthlyFiltersReturn {
  // ===== NAVIGATION STATE =====
  const [monthOffset, setMonthOffset] = useState(initialMonthOffset);
  
  // ===== FILTER STATE =====
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters);
  
  // ===== COMPUTED: Month Range =====
  const monthRange = useMemo(
    () => getMonthRange(monthOffset),
    [monthOffset]
  );
  
  // ===== COMPUTED: Data Bounds =====
  const dataBounds = useMemo(
    () => getDataMonthBounds(allEntries),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allEntries, renderKey]
  );
  
  // ===== COMPUTED: Navigation Flags =====
  const canGoNext = monthOffset < 0; // Can't go past current month
  const canGoPrev = monthOffset > dataBounds.earliest;
  
  // ===== COMPUTED: Month Entries =====
  const monthEntries = useMemo(
    () => getEntriesForMonth(allEntries, monthOffset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allEntries, monthOffset, renderKey]
  );

  const prevMonthEntries = useMemo(
    () => getEntriesForMonth(allEntries, monthOffset - 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allEntries, monthOffset, renderKey]
  );
  
  // ===== COMPUTED: Day-Filtered Entries =====
  const dayFilteredEntries = useMemo(() => {
    if (selectedDays.length === 0) return monthEntries;
    
    return monthEntries.filter((entry) => {
      const entryDate = new Date(entry.date + "T12:00:00");
      const dayOfMonth = entryDate.getDate();
      return selectedDays.includes(dayOfMonth);
    });
  }, [monthEntries, selectedDays]);
  
  // ===== COMPUTED: Available Options (from day-filtered entries) =====
  const availableOptions = useMemo((): AvailableMonthlyOptions => {
    const symptoms = new Set<string>();
    const cyclePhases = new Set<CyclePhase>();
    const flowLevels = new Set<FlowLevel>();
    const bristolTypes = new Set<BristolScaleType>();
    const feelings = new Set<PostBowelFeeling>();
    const medicines = new Set<string>();
    
    for (const entry of dayFilteredEntries) {
      // Symptoms
      for (const symptom of Object.keys(entry.symptomIntensities)) {
        symptoms.add(symptom);
      }
      for (const symptom of Object.keys(entry.periodSymptomIntensities)) {
        symptoms.add(symptom);
      }
      
      // Cycle
      if (entry.cyclePhase && entry.cyclePhase !== "not_sure") {
        cyclePhases.add(entry.cyclePhase);
      }
      if (entry.periodFlow) {
        flowLevels.add(entry.periodFlow as FlowLevel);
      }
      
      // Bowel
      if (entry.stoolType) {
        bristolTypes.add(entry.stoolType);
      }
      if (entry.stoolFeeling) {
        feelings.add(entry.stoolFeeling);
      }
      
      // Medicine
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
  }, [dayFilteredEntries]);
  
  // ===== COMPUTED: Fully Filtered Entries =====
  const filteredEntries = useMemo(() => {
    return dayFilteredEntries.filter((entry) => {
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
  }, [dayFilteredEntries, filters]);
  
  // ===== COMPUTED: Filter Counts =====
  const categoryFilterCounts = useMemo(() => ({
    symptoms: filters.selectedSymptoms.length,
    cycle: filters.selectedCyclePhases.length + filters.selectedFlowLevels.length,
    bowel: filters.selectedBristolTypes.length + filters.selectedFeelings.length,
    medicine: filters.selectedMedicines.length,
  }), [filters]);
  
  const activeFilterCount = useMemo(() => 
    Object.values(categoryFilterCounts).reduce((sum, count) => sum + count, 0),
    [categoryFilterCounts]
  );
  
  const hasAdvancedFilters = activeFilterCount > 0;
  const totalFilterCount = selectedDays.length + activeFilterCount;
  
  // ===== NAVIGATION ACTIONS =====
  const goToNextMonth = useCallback(() => {
    if (canGoNext) {
      setMonthOffset((prev) => prev + 1);
      setSelectedDays([]); // Reset day selection when changing months
    }
  }, [canGoNext]);
  
  const goToPrevMonth = useCallback(() => {
    if (canGoPrev) {
      setMonthOffset((prev) => prev - 1);
      setSelectedDays([]);
    }
  }, [canGoPrev]);
  
  const goToCurrentMonth = useCallback(() => {
    setMonthOffset(0);
    setSelectedDays([]);
  }, []);
  
  const goToMonth = useCallback((offset: number) => {
    if (offset <= 0 && offset >= dataBounds.earliest) {
      setMonthOffset(offset);
      setSelectedDays([]);
    }
  }, [dataBounds.earliest]);
  
  // ===== DAY SELECTION ACTIONS =====
  const toggleDay = useCallback((day: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }, []);

  const selectRange = useCallback((days: number[]) => {
    setSelectedDays(days.sort((a, b) => a - b));
  }, []);

  const selectAllDays = useCallback(() => {
    setSelectedDays([]);
  }, []);

  const clearDaySelection = useCallback(() => {
    setSelectedDays([]);
  }, []);
  
  // ===== FILTER ACTIONS =====
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
    setFilters(defaultFilters);
  }, []);
  
  const clearAllFiltersAndDays = useCallback(() => {
    setSelectedDays([]);
    setFilters(defaultFilters);
  }, []);
  
  // ===== RETURN =====
  return {
    // Navigation
    monthOffset,
    monthRange,
    canGoNext,
    canGoPrev,
    goToNextMonth,
    goToPrevMonth,
    goToCurrentMonth,
    goToMonth,
    
    // Entries
    monthEntries,
    prevMonthEntries,
    filteredEntries,
    
    // Day selection
    selectedDays,
    toggleDay,
    selectRange,
    selectAllDays,
    clearDaySelection,
    
    // Advanced filters
    filters,
    activeFilterCount,
    categoryFilterCounts,
    availableOptions,
    hasAdvancedFilters,
    
    // Filter actions
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
    
    // Combined
    totalFilterCount,
    clearAllFiltersAndDays,
  };
}