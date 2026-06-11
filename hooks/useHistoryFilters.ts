// ============================================
// History Filters Hook
// ============================================

import { useState, useMemo, useCallback } from "react";

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

import {
  createEmptyFilters,
  entryMatchesFilters,
  hasActiveFilters,
  getActiveFilterCount,
  getCategoryFilterCounts,
  getActiveFilters,
  getAvailableFilterOptions,
} from "@/lib/filterUtils";

// ============================================
// HOOK DEFINITION
// ============================================

interface UseHistoryFiltersReturn {
  // Filter state
  filters: HistoryFilters;
  
  // Derived data
  filteredEntries: StoredEntry[];
  activeFilters: ActiveFilter[];
  activeFilterCount: number;
  categoryFilterCounts: Record<string, number>;
  availableOptions: AvailableFilterOptions;
  hasFilters: boolean;
  
  // Toggle actions (add if not present, remove if present)
  toggleSymptom: (symptom: string) => void;
  toggleCyclePhase: (phase: CyclePhase) => void;
  toggleFlowLevel: (flow: FlowLevel) => void;
  toggleBristolType: (type: BristolScaleType) => void;
  toggleFeeling: (feeling: PostBowelFeeling) => void;
  toggleMedicine: (medicine: string) => void;
  
  // Select all actions
  selectAllSymptoms: () => void;
  selectAllCycle: () => void;
  selectAllBowel: () => void;
  selectAllMedicine: () => void;
  
  // Removal actions
  removeFilter: (filter: ActiveFilter) => void;
  clearCategory: (category: string) => void;
  clearAllFilters: () => void;
  
  // Bulk set (for loading saved filters)
  setFilters: (filters: HistoryFilters) => void;
}

/**
 * Hook for managing history page filters.
 * 
 * @param entries - The date-filtered entries to apply advanced filters to
 * @returns Filter state and actions
 */
export function useHistoryFilters(entries: StoredEntry[]): UseHistoryFiltersReturn {
  const [filters, setFilters] = useState<HistoryFilters>(createEmptyFilters);

  // ═══════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════

  // Get available options from current entries
  const availableOptions = useMemo(
    () => getAvailableFilterOptions(entries),
    [entries]
  );

  // Apply filters to entries
  const filteredEntries = useMemo(
    () => entries.filter(entry => entryMatchesFilters(entry, filters)),
    [entries, filters]
  );

  // Get active filter chips
  const activeFilters = useMemo(
    () => getActiveFilters(filters),
    [filters]
  );

  // Count active filters
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters]
  );

  // Count per category
  const categoryFilterCounts = useMemo(
    () => getCategoryFilterCounts(filters),
    [filters]
  );

  // Check if any filters active
  const hasFilters = useMemo(
    () => hasActiveFilters(filters),
    [filters]
  );

  // ═══════════════════════════════════════
  // TOGGLE ACTIONS
  // ═══════════════════════════════════════

  const toggleSymptom = useCallback((symptom: string) => {
    setFilters(prev => ({
      ...prev,
      selectedSymptoms: prev.selectedSymptoms.includes(symptom)
        ? prev.selectedSymptoms.filter(s => s !== symptom)
        : [...prev.selectedSymptoms, symptom],
    }));
  }, []);

  const toggleCyclePhase = useCallback((phase: CyclePhase) => {
    setFilters(prev => ({
      ...prev,
      selectedCyclePhases: prev.selectedCyclePhases.includes(phase)
        ? prev.selectedCyclePhases.filter(p => p !== phase)
        : [...prev.selectedCyclePhases, phase],
    }));
  }, []);

  const toggleFlowLevel = useCallback((flow: FlowLevel) => {
    setFilters(prev => ({
      ...prev,
      selectedFlowLevels: prev.selectedFlowLevels.includes(flow)
        ? prev.selectedFlowLevels.filter(f => f !== flow)
        : [...prev.selectedFlowLevels, flow],
    }));
  }, []);

  const toggleBristolType = useCallback((type: BristolScaleType) => {
    setFilters(prev => ({
      ...prev,
      selectedBristolTypes: prev.selectedBristolTypes.includes(type)
        ? prev.selectedBristolTypes.filter(t => t !== type)
        : [...prev.selectedBristolTypes, type],
    }));
  }, []);

  const toggleFeeling = useCallback((feeling: PostBowelFeeling) => {
    setFilters(prev => ({
      ...prev,
      selectedFeelings: prev.selectedFeelings.includes(feeling)
        ? prev.selectedFeelings.filter(f => f !== feeling)
        : [...prev.selectedFeelings, feeling],
    }));
  }, []);

  const toggleMedicine = useCallback((medicine: string) => {
    setFilters(prev => ({
      ...prev,
      selectedMedicines: prev.selectedMedicines.includes(medicine)
        ? prev.selectedMedicines.filter(m => m !== medicine)
        : [...prev.selectedMedicines, medicine],
    }));
  }, []);

  // ═══════════════════════════════════════
  // SELECT ALL ACTIONS
  // ═══════════════════════════════════════

  const selectAllSymptoms = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      selectedSymptoms: [...availableOptions.symptoms],
    }));
  }, [availableOptions.symptoms]);

  const selectAllCycle = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      selectedCyclePhases: [...availableOptions.cyclePhases],
      selectedFlowLevels: [...availableOptions.flowLevels],
    }));
  }, [availableOptions.cyclePhases, availableOptions.flowLevels]);

  const selectAllBowel = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      selectedBristolTypes: [...availableOptions.bristolTypes],
      selectedFeelings: [...availableOptions.feelings],
    }));
  }, [availableOptions.bristolTypes, availableOptions.feelings]);

  const selectAllMedicine = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      selectedMedicines: [...availableOptions.medicines],
    }));
  }, [availableOptions.medicines]);

  // ═══════════════════════════════════════
  // REMOVAL ACTIONS
  // ═══════════════════════════════════════

  const removeFilter = useCallback((filter: ActiveFilter) => {
    setFilters(prev => {
      switch (filter.type) {
        case "symptom":
          return {
            ...prev,
            selectedSymptoms: prev.selectedSymptoms.filter(s => s !== filter.value),
          };
        case "phase":
          return {
            ...prev,
            selectedCyclePhases: prev.selectedCyclePhases.filter(
              p => p !== filter.value
            ),
          };
        case "flow":
          return {
            ...prev,
            selectedFlowLevels: prev.selectedFlowLevels.filter(
              f => f !== filter.value
            ),
          };
        case "bristol":
          return {
            ...prev,
            selectedBristolTypes: prev.selectedBristolTypes.filter(
              t => String(t) !== filter.value
            ),
          };
        case "feeling":
          return {
            ...prev,
            selectedFeelings: prev.selectedFeelings.filter(
              f => f !== filter.value
            ),
          };
        case "medicine":
          return {
            ...prev,
            selectedMedicines: prev.selectedMedicines.filter(
              m => m !== filter.value
            ),
          };
        default:
          return prev;
      }
    });
  }, []);

  const clearCategory = useCallback((category: string) => {
    setFilters(prev => {
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
    setFilters(createEmptyFilters());
  }, []);

  // ═══════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════

  return {
    filters,
    filteredEntries,
    activeFilters,
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
    removeFilter,
    clearCategory,
    clearAllFilters,
    setFilters,
  };
}