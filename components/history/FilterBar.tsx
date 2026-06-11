"use client";

import { useState, useRef } from "react";

import { FilterCategoryButton } from "./FilterCategoryButton";
import { SavedFiltersSection } from "./SavedFiltersSection";
import { FilterDropdown } from "./FilterDropdown";
import { FilterBottomSheet } from "./FilterBottomSheet";

import { useIsMobile } from "@/hooks/useMediaQuery";
import { CYCLE_PHASES, BRISTOL_TYPES, POST_BOWEL_FEELINGS } from "@/lib/constants";

import type {
  HistoryFilters,
  AvailableFilterOptions,
  CyclePhase,
  BristolScaleType,
  PostBowelFeeling,
  FlowLevel,
  UserSettings,
} from "@/types";

// ============================================
// TYPES
// ============================================

type CategoryKey = "symptoms" | "cycle" | "bowel" | "medicine";

interface FilterBarProps {
  filters: HistoryFilters;
  availableOptions: AvailableFilterOptions;
  categoryFilterCounts: Record<string, number>;
  hasFilters: boolean;
  hideSavedFilters?: boolean;
  settings: UserSettings;
  // Saved filter action
  onLoadSavedFilter: (filters: HistoryFilters) => void;

  // Toggle actions
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

  // Clear actions
  clearCategory: (category: string) => void;
  clearAllFilters: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const FLOW_LEVELS: { value: FlowLevel; label: string }[] = [
  { value: "spotting", label: "Spotting" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];

const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: "symptoms", label: "Symptoms", icon: "🏷️" },
  { key: "cycle", label: "Cycle", icon: "🌸" },
  { key: "bowel", label: "Bowel", icon: "🧻" },
  { key: "medicine", label: "Medicine", icon: "💊" },
];

// ============================================
// COMPONENT
// ============================================

export function FilterBar({
  filters,
  availableOptions,
  categoryFilterCounts,
  hasFilters,
  hideSavedFilters,
  settings,
  onLoadSavedFilter,
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
  clearAllFilters,
}: FilterBarProps) {
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);
  const isMobile = useIsMobile();

  // Filter categories based on enabled settings
  const enabledCategories = CATEGORIES.filter(category => {
    switch (category.key) {
      case "symptoms":
        return settings.symptoms.enabled;
      case "cycle":
        return settings.periodTracking.enabled;
      case "bowel":
        return settings.stoolTracking.enabled;
      case "medicine":
        return settings.medicineTracking.enabled;
      default:
        return true;
    }
  });

  // Refs for each category button (for focus management on desktop)
  const buttonRefs = {
    symptoms: useRef<HTMLButtonElement>(null),
    cycle: useRef<HTMLButtonElement>(null),
    bowel: useRef<HTMLButtonElement>(null),
    medicine: useRef<HTMLButtonElement>(null),
  };

  const handleCategoryClick = (category: CategoryKey) => {
    setOpenCategory(prev => (prev === category ? null : category));
  };

  const handleCloseDropdown = () => {
    setOpenCategory(null);
  };

  // Get select all function for a category
  const getSelectAllForCategory = (category: CategoryKey): (() => void) => {
    switch (category) {
      case "symptoms":
        return selectAllSymptoms;
      case "cycle":
        return selectAllCycle;
      case "bowel":
        return selectAllBowel;
      case "medicine":
        return selectAllMedicine;
      default:
        return () => {};
    }
  };

  // Build dropdown/sheet sections for each category
  const getFilterSections = (category: CategoryKey) => {
    switch (category) {
      case "symptoms":
        return [
          {
            title: "Symptoms",
            options: availableOptions.symptoms.map(symptom => ({
              value: symptom,
              label: symptom,
              selected: filters.selectedSymptoms.includes(symptom),
            })),
            onToggle: toggleSymptom,
          },
        ];

      case "cycle":
        return [
          {
            title: "Phase",
            options: availableOptions.cyclePhases.map(phase => {
              const phaseInfo = CYCLE_PHASES.find(p => p.value === phase);
              return {
                value: phase,
                label: phaseInfo?.label || phase,
                selected: filters.selectedCyclePhases.includes(phase),
              };
            }),
            onToggle: (value: string) => toggleCyclePhase(value as CyclePhase),
          },
          {
            title: "Flow",
            options: FLOW_LEVELS.filter(flow =>
              availableOptions.flowLevels.includes(flow.value)
            ).map(flow => ({
              value: flow.value,
              label: flow.label,
              selected: filters.selectedFlowLevels.includes(flow.value),
            })),
            onToggle: (value: string) => toggleFlowLevel(value as FlowLevel),
          },
        ];

      case "bowel":
        return [
          {
            title: "Bristol Type",
            options: availableOptions.bristolTypes.map(type => {
              const bristolInfo = BRISTOL_TYPES.find(b => b.type === type);
              return {
                value: String(type),
                label: `Type ${type}${bristolInfo ? ` - ${bristolInfo.name}` : ""}`,
                selected: filters.selectedBristolTypes.includes(type),
              };
            }),
            onToggle: (value: string) =>
              toggleBristolType(Number(value) as BristolScaleType),
          },
          {
            title: "Feeling",
            options: availableOptions.feelings.map(feeling => {
              const feelingInfo = POST_BOWEL_FEELINGS.find(f => f.value === feeling);
              return {
                value: feeling,
                label: feelingInfo?.label || feeling,
                selected: filters.selectedFeelings.includes(feeling),
              };
            }),
            onToggle: (value: string) =>
              toggleFeeling(value as PostBowelFeeling),
          },
        ];

      case "medicine":
        return [
          {
            title: "Medicine",
            options: availableOptions.medicines.map(medicine => ({
              value: medicine,
              label: medicine,
              selected: filters.selectedMedicines.includes(medicine),
            })),
            onToggle: toggleMedicine,
          },
        ];

      default:
        return [];
    }
  };

  // Check if a category has any available options
  const categoryHasOptions = (category: CategoryKey): boolean => {
    switch (category) {
      case "symptoms":
        return availableOptions.symptoms.length > 0;
      case "cycle":
        return (
          availableOptions.cyclePhases.length > 0 ||
          availableOptions.flowLevels.length > 0
        );
      case "bowel":
        return (
          availableOptions.bristolTypes.length > 0 ||
          availableOptions.feelings.length > 0
        );
      case "medicine":
        return availableOptions.medicines.length > 0;
      default:
        return false;
    }
  };

  // Get current open category info
  const openCategoryInfo = openCategory
    ? enabledCategories.find(c => c.key === openCategory)
    : null;

  return (
    <div className="space-y-3">
      {/* Category Buttons Row */}
      <div
        className="
          flex items-center gap-2
          overflow-x-auto
          snap-x snap-mandatory
          pb-1 -mx-2 px-2
          sm:flex-wrap sm:overflow-visible sm:snap-none"
      >
        <span className="text-sm text-app-gray shrink-0">Filter by:</span>
        {enabledCategories.map(category => (
          <div key={category.key} className="relative">
            <FilterCategoryButton
              ref={buttonRefs[category.key]}
              label={category.label}
              icon={category.icon}
              count={categoryFilterCounts[category.key] || 0}
              isOpen={openCategory === category.key}
              onClick={() => handleCategoryClick(category.key)}
              disabled={!categoryHasOptions(category.key)}
            />
            
            {/* Desktop: Dropdown */}
            {!isMobile && (
              <FilterDropdown
                isOpen={openCategory === category.key}
                onClose={handleCloseDropdown}
                sections={getFilterSections(category.key)}
                triggerRef={buttonRefs[category.key]}
                onClearCategory={() => clearCategory(category.key)}
                onSelectAll={getSelectAllForCategory(category.key)}
                categoryCount={categoryFilterCounts[category.key] || 0}
              />
            )}
          </div>
        ))}

        {/* Clear All button - shown when any filters are active */}
        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="
              px-3 py-2 text-sm
              text-app-red hover:text-app-red/80
              hover:bg-app-red/10
              rounded-lg transition-colors
              shrink-0
            "
          >
            Clear
          </button>
        )}
      </div>      
      {/* Saved Filters Section - hidden in Weekly/Monthly views */}
      {!hideSavedFilters && (
        <SavedFiltersSection
          currentFilters={filters}
          onLoadFilter={onLoadSavedFilter}
          hasActiveFilters={hasFilters}
        />
      )}

      {/* Mobile: Bottom Sheet (rendered once, content changes based on category) */}
      {isMobile && openCategory && openCategoryInfo && (
        <FilterBottomSheet
          isOpen={true}
          onClose={handleCloseDropdown}
          title={openCategoryInfo.label}
          icon={openCategoryInfo.icon}
          sections={getFilterSections(openCategory)}
          onClearCategory={() => clearCategory(openCategory)}
          onSelectAll={getSelectAllForCategory(openCategory)}
          categoryCount={categoryFilterCounts[openCategory] || 0}
        />
      )}
    </div>
  );
}