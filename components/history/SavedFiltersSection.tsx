"use client";

import { useState } from "react";
import { SaveFilterModal } from "./SaveFilterModal";
import {
  useSavedFilters,
  MAX_SAVED_FILTERS,
} from "@/stores/useSavedFilters";
import { useSettings } from "@/stores/useSettings";

import type { HistoryFilters, SavedFilter } from "@/types";

// ============================================
// TYPES
// ============================================

interface SavedFiltersSectionProps {
  currentFilters: HistoryFilters;
  onLoadFilter: (filters: HistoryFilters) => void;
  hasActiveFilters: boolean;
  resetFilters?: () => void; // optional reset method
}

// ============================================
// COMPONENT
// ============================================

export function SavedFiltersSection({
  currentFilters,
  onLoadFilter,
  hasActiveFilters,
  resetFilters,
}: SavedFiltersSectionProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const {
    savedFilters,
    saveFilter,
    deleteFilter,
    canSaveMore,
  } = useSavedFilters();

  const isGoogleSheetConnected = useSettings((state) => state.isGoogleSheetConnected);
  const usedSlots = savedFilters.length;

  // ============================================
  // HANDLERS
  // ============================================

  const handleSave = (name: string) => {
    const result = saveFilter(name, currentFilters);
    if (result) {
      console.log("Filter saved locally:", result.name);
    }
  };

  const handleLoad = (filter: SavedFilter) => {
    const isAlreadyApplied =
      JSON.stringify(filter.filters) === JSON.stringify(currentFilters);

    if (isAlreadyApplied) {
      if (resetFilters) {
        resetFilters();
      } else {
        onLoadFilter(EMPTY_FILTERS); // ✅ use proper empty object
      }
    } else {
      onLoadFilter(filter.filters);
    }
  };

  const handleDeleteClick = (filterId: string) => {
    setShowDeleteConfirm(filterId);
  };

  const handleConfirmDelete = (filterId: string) => {
    deleteFilter(filterId);
    setShowDeleteConfirm(null);
  };

  const getSaveButtonTooltip = (): string | undefined => {
    if (!hasActiveFilters) return "Select some filters first";
    if (!canSaveMore()) return "Delete a saved filter to save a new one";
    return undefined;
  };

  const EMPTY_FILTERS: HistoryFilters = {
    selectedSymptoms: [],
    selectedCyclePhases: [],
    selectedFlowLevels: [],
    selectedBristolTypes: [],
    selectedFeelings: [],
    selectedMedicines: [],
  };


  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-3">
      {/* Header row with save button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#3F592E]">Saved Filters</span>
          <span className="text-xs text-app-gray bg-app-cream px-2 py-0.5 rounded-full">
            {usedSlots}/{MAX_SAVED_FILTERS}
          </span>
          {isGoogleSheetConnected && (
            <span className="text-xs text-app-gray">· Syncs to Sheet</span>
          )}
        </div>

        {/* Save button */}
        <div className="relative group">
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!hasActiveFilters || !canSaveMore()}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors
              ${hasActiveFilters && canSaveMore()
                ? "bg-[#3F592E] text-white hover:bg-[#3F592E]/90"
                : "bg-app-border text-app-gray cursor-not-allowed"
              }
            `}
            aria-label="Save current filters"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Save
          </button>

          {/* Tooltip */}
          {(!hasActiveFilters || !canSaveMore()) && (
            <div
              className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-app-charcoal
                         text-white text-xs rounded-lg whitespace-nowrap opacity-0
                         group-hover:opacity-100 transition-opacity pointer-events-none
                         shadow-lg z-10"
            >
              {getSaveButtonTooltip()}
              <div
                className="absolute top-full right-4 w-0 h-0
                           border-l-4 border-r-4 border-t-4
                           border-l-transparent border-r-transparent
                           border-t-app-charcoal"
              />
            </div>
          )}
        </div>
      </div>

      {/* Saved filters list */}
      {savedFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {savedFilters.map((filter) => (
            <div key={filter.id} className="relative group">
              {/* Filter chip */}
              <button
                onClick={() => handleLoad(filter)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border
                  ${JSON.stringify(filter.filters) === JSON.stringify(currentFilters)
                    ? "bg-app-teal/20 border-app-teal text-app-teal"
                    : "bg-app-cream hover:bg-app-taupe/30 border-app-border text-app-charcoal"
                  }
                `}
              >
                <svg
                  className="w-4 h-4 text-[#3F592E]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="text-sm font-medium max-w-[150px] truncate">{filter.name}</span>
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(filter.id);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-app-red text-white
                           rounded-full flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-opacity
                           hover:bg-app-red/80 shadow-sm"
                aria-label={`Delete ${filter.name}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Delete confirmation popover */}
              {showDeleteConfirm === filter.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDeleteConfirm(null)} />
                  <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-lg 
                                 shadow-lg border border-app-border z-50 min-w-[200px]">
                    <p className="text-sm text-[#3F592E] mb-3">
                      Delete &quot;{filter.name}&quot;?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 px-3 py-1.5 text-sm border border-app-border rounded-lg hover:bg-app-cream transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleConfirmDelete(filter.id)}
                        className="flex-1 px-3 py-1.5 text-sm bg-app-red text-white rounded-lg hover:bg-app-red/90 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-app-gray italic">
          0 filters set. Apply and save filters for quick access.
        </p>
      )}

      {/* Save Filter Modal */}
      <SaveFilterModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        currentSlot={usedSlots + 1}
        totalSlots={MAX_SAVED_FILTERS}
      />
    </div>
  );
}
