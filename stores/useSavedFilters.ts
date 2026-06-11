// ============================================
// Saved Filters Store
// ============================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  getSavedFiltersFromSheet,
  saveSavedFiltersToSheet,
  getSpreadsheetIdFromUrl,
} from "@/lib/googleSheets";

import type { SavedFiltersStore, SavedFilter, HistoryFilters } from "@/types";

// ============================================
// CONSTANTS
// ============================================

const MAX_SAVED_FILTERS = 3;
const MAX_FILTER_NAME_LENGTH = 20;
const STORAGE_KEY = "cadence-saved-filters";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generates a unique ID for a saved filter
 */
function generateFilterId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validates and truncates filter name
 */
function sanitizeFilterName(name: string): string {
  return name.trim().substring(0, MAX_FILTER_NAME_LENGTH);
}

// ============================================
// STORE DEFINITION
// ============================================

export const useSavedFilters = create<SavedFiltersStore>()(
  persist(
    (set, get) => ({
      // =======================================================================
      // INITIAL STATE
      // =======================================================================
      savedFilters: [],
      isSyncing: false,

      // =======================================================================
      // ACTIONS
      // =======================================================================

      /**
       * Save current filters with a name.
       * Returns the saved filter or null if at max capacity.
       */
      saveFilter: (name: string, filters: HistoryFilters): SavedFilter | null => {
        const { savedFilters } = get();
        
        // Check capacity
        if (savedFilters.length >= MAX_SAVED_FILTERS) {
          return null;
        }

        const sanitizedName = sanitizeFilterName(name);
        if (!sanitizedName) {
          return null;
        }

        const now = new Date().toISOString();
        const newFilter: SavedFilter = {
          id: generateFilterId(),
          name: sanitizedName,
          filters: { ...filters }, // Deep copy to avoid reference issues
          createdAt: now,
          updatedAt: now,
        };

        set({
          savedFilters: [...savedFilters, newFilter],
        });

        return newFilter;
      },

      /**
       * Delete a saved filter by ID
       */
      deleteFilter: (id: string) => {
        const { savedFilters } = get();
        set({
          savedFilters: savedFilters.filter((f) => f.id !== id),
        });
      },

      /**
       * Update an existing filter's configuration
       */
      updateFilter: (id: string, filters: HistoryFilters) => {
        const { savedFilters } = get();
        set({
          savedFilters: savedFilters.map((f) =>
            f.id === id
              ? { ...f, filters: { ...filters }, updatedAt: new Date().toISOString() }
              : f
          ),
        });
      },

      /**
       * Rename an existing filter
       */
      renameFilter: (id: string, newName: string) => {
        const sanitizedName = sanitizeFilterName(newName);
        if (!sanitizedName) return;

        const { savedFilters } = get();
        set({
          savedFilters: savedFilters.map((f) =>
            f.id === id
              ? { ...f, name: sanitizedName, updatedAt: new Date().toISOString() }
              : f
          ),
        });
      },

      /**
       * Check if we can save more filters
       */
      canSaveMore: (): boolean => {
        return get().savedFilters.length < MAX_SAVED_FILTERS;
      },

      /**
       * Get remaining slot count
       */
      getRemainingSlots: (): number => {
        return MAX_SAVED_FILTERS - get().savedFilters.length;
      },

      /**
       * Sync saved filters to Google Sheet
       */
      syncToSheet: async (accessToken: string): Promise<boolean> => {
        const { savedFilters } = get();

        // Get spreadsheet ID from settings (we need to import useSettings or pass it)
        // For now, we'll need the URL passed in - we'll handle this in the component
        const settingsStr = localStorage.getItem("cadence-settings");
        if (!settingsStr) return false;

        try {
          const settings = JSON.parse(settingsStr);
          const sheetUrl = settings?.state?.googleSheet?.url;
          if (!sheetUrl) return false;

          const spreadsheetId = getSpreadsheetIdFromUrl(sheetUrl);
          if (!spreadsheetId) return false;

          set({ isSyncing: true });

          const success = await saveSavedFiltersToSheet(
            JSON.stringify(savedFilters),
            spreadsheetId,
            accessToken
          );

          set({ isSyncing: false });

          // Update sync tracker if successful
          if (success) {
            const { useSyncTracker } = await import('./useSyncTracker');
            useSyncTracker.getState().updateFiltersSyncTime(new Date().toISOString());
          }

          return success;
        } catch (error) {
          console.error("Error syncing saved filters:", error);
          set({ isSyncing: false });
          return false;
        }
      },

      /**
       * Load saved filters from Google Sheet
       */
      loadFromSheet: async (
        spreadsheetId: string,
        accessToken: string
      ): Promise<boolean> => {
        set({ isSyncing: true });
        console.log("loadFromSheet: Starting filters restore for spreadsheet:", spreadsheetId);

        try {
          const filtersJson = await getSavedFiltersFromSheet(spreadsheetId, accessToken);

          if (!filtersJson) {
            // No filters saved yet - this is normal, not an error
            console.log("loadFromSheet: No saved filters found (this is OK if user hasn't saved any filters yet)");
            set({ isSyncing: false });
            return false;
          }

          const loadedFilters = JSON.parse(filtersJson) as SavedFilter[];

          // Validate the loaded data
          if (!Array.isArray(loadedFilters)) {
            console.error("loadFromSheet: Invalid filters data - not an array");
            set({ isSyncing: false });
            return false;
          }

          // Ensure we don't exceed max (in case of data corruption)
          const validFilters = loadedFilters
            .filter((f) => f.id && f.name && f.filters)
            .slice(0, MAX_SAVED_FILTERS);

          console.log("loadFromSheet: Restored", validFilters.length, "saved filters");

          set({
            savedFilters: validFilters,
            isSyncing: false,
          });

          // Update sync tracker to reflect that we just synced filters from the sheet
          const { useSyncTracker } = await import('./useSyncTracker');
          useSyncTracker.getState().updateFiltersSyncTime(new Date().toISOString());

          return true;
        } catch (error) {
          console.error("Error loading saved filters from sheet:", error);
          set({ isSyncing: false });
          return false;
        }
      },

      /**
       * Clear all saved filters
       */
      clearAll: () => {
        set({ savedFilters: [] });
      },
    }),

    // =========================================================================
    // PERSIST CONFIGURATION
    // =========================================================================
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedFilters: state.savedFilters,
      }),
    }
  )
);

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

export const useSavedFiltersList = () =>
  useSavedFilters((state) => state.savedFilters);

export const useCanSaveMoreFilters = () =>
  useSavedFilters((state) => state.savedFilters.length < MAX_SAVED_FILTERS);

export const useSavedFiltersCount = () =>
  useSavedFilters((state) => state.savedFilters.length);

// Export constants for use in components
export { MAX_SAVED_FILTERS, MAX_FILTER_NAME_LENGTH };