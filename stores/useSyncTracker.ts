/**
 * Sync Tracker Store
 *
 * Tracks the last successful sync timestamps for entries, settings, and filters.
 * Used to determine when to show the 48-hour sync reminder modal.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SYNC_REMINDER_INTERVAL_MS } from "@/lib/constants";

// ============================================
// Type Definitions
// ============================================

interface SyncTrackerStore {
  // Individual sync timestamps (ISO format)
  lastEntrySyncAt: string | null;
  lastSettingsSyncAt: string | null;
  lastFiltersSyncAt: string | null;

  // Modal state
  isModalDismissedTemporarily: boolean;
  modalShownCount: number;

  // Actions
  updateEntrySyncTime: (timestamp: string) => void;
  updateSettingsSyncTime: (timestamp: string) => void;
  updateFiltersSyncTime: (timestamp: string) => void;
  dismissModalTemporarily: () => void;
  resetDismissal: () => void;
  reset: () => void;

  // Computed getters
  getLastSuccessfulSyncAt: () => string | null;
  shouldShowModal: () => boolean;
  getTimeSinceLastSync: () => number;
}

// ============================================
// Store Implementation
// ============================================

export const useSyncTracker = create<SyncTrackerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      lastEntrySyncAt: null,
      lastSettingsSyncAt: null,
      lastFiltersSyncAt: null,
      isModalDismissedTemporarily: false,
      modalShownCount: 0,

      // Update entry sync timestamp
      updateEntrySyncTime: (timestamp: string) => {
        set({ lastEntrySyncAt: timestamp });
      },

      // Update settings sync timestamp
      updateSettingsSyncTime: (timestamp: string) => {
        set({ lastSettingsSyncAt: timestamp });
      },

      // Update filters sync timestamp
      updateFiltersSyncTime: (timestamp: string) => {
        set({ lastFiltersSyncAt: timestamp });
      },

      // Dismiss modal temporarily (until page reload)
      dismissModalTemporarily: () => {
        set((state) => ({
          isModalDismissedTemporarily: true,
          modalShownCount: state.modalShownCount + 1
        }));
      },

      // Reset dismissal flag (called on page load)
      resetDismissal: () => {
        set({ isModalDismissedTemporarily: false });
      },

      // Reset all state to defaults (clears both in-memory and persisted state)
      reset: () => {
        set({
          lastEntrySyncAt: null,
          lastSettingsSyncAt: null,
          lastFiltersSyncAt: null,
          isModalDismissedTemporarily: false,
          modalShownCount: 0,
        });
      },

      // Get the most recent sync timestamp across all types
      getLastSuccessfulSyncAt: () => {
        const { lastEntrySyncAt, lastSettingsSyncAt, lastFiltersSyncAt } = get();

        const timestamps = [
          lastEntrySyncAt,
          lastSettingsSyncAt,
          lastFiltersSyncAt,
        ].filter((ts): ts is string => ts !== null);

        if (timestamps.length === 0) return null;

        // Return the most recent timestamp
        return timestamps.reduce((latest, current) => {
          return new Date(current) > new Date(latest) ? current : latest;
        });
      },

      // Check if modal should be shown
      shouldShowModal: () => {
        const { isModalDismissedTemporarily } = get();

        // Don't show if temporarily dismissed
        if (isModalDismissedTemporarily) return false;

        const lastSyncAt = get().getLastSuccessfulSyncAt();

        // Don't show modal if never synced before (new user)
        // The modal should only appear for returning users who haven't synced in 48 hours
        if (!lastSyncAt) return false;

        // Show modal if interval has passed
        const timeSinceSync = Date.now() - new Date(lastSyncAt).getTime();
        return timeSinceSync >= SYNC_REMINDER_INTERVAL_MS;
      },

      // Get time in milliseconds since last sync
      getTimeSinceLastSync: () => {
        const lastSyncAt = get().getLastSuccessfulSyncAt();
        if (!lastSyncAt) return Infinity;
        return Date.now() - new Date(lastSyncAt).getTime();
      },
    }),
    {
      name: "cadence-sync-tracker",
    }
  )
);
