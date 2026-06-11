// ============================================
// Entry Store - Zustand with localStorage persistence
// ============================================

import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { 
  appendEntryToSheet, 
  getSpreadsheetIdFromUrl,
  getExistingEntryKeys,
  groupEntriesByMonth,
  appendEntriesToSheet,
  fetchAllEntriesFromSheet,
} from '@/lib/googleSheets';

import type { 
  EntryStore, 
  StoredEntry, 
  UserSettings, 
  BatchSyncProgress, 
  BatchSyncResult, 
  ImportEntriesResult } from '@/types';


import { STORAGE_KEYS } from '@/lib/constants';

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateEntryId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// STORE DEFINITION
// ============================================

export const useEntries = create<EntryStore>()(
  persist(
    (set, get) => ({
      // ═══════════════════════════════════════
      // INITIAL STATE
      // ═══════════════════════════════════════
      entries: [],
      _revision: 0,
      isSyncing: false,
      lastSyncAt: null,
      batchSyncProgress: null as BatchSyncProgress | null,

      // ═══════════════════════════════════════
      // ACTIONS
      // ═══════════════════════════════════════

      /**
       * Adds a new entry to localStorage.
       * Returns the created entry with generated ID and timestamps.
       */
      addEntry: (entryData) => {
        const now = new Date().toISOString();
        const newEntry: StoredEntry = {
          ...entryData,
          id: generateEntryId(),
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        };

        set((state) => ({
          entries: [...state.entries, newEntry],
          _revision: state._revision + 1,
        }));

        return newEntry;
      },

      /**
       * Syncs a specific entry to Google Sheets.
       */
      syncEntryToSheet: async (entryId: string, accessToken: string) => {
        const { entries } = get();
        const entry = entries.find((e) => e.id === entryId);
        
        if (!entry) {
          console.error(`Entry ${entryId} not found`);
          return false;
        }

        // Get settings from the settings store
        // We need to import dynamically to avoid circular dependency
        const { useSettings } = await import('./useSettings');
        const settings = useSettings.getState();
        
        if (!settings.googleSheet.url) {
          console.error('No Google Sheet connected');
          get().markEntryFailed(entryId, 'No Google Sheet connected');
          return false;
        }

        const spreadsheetId = getSpreadsheetIdFromUrl(settings.googleSheet.url);
        if (!spreadsheetId) {
          console.error('Invalid spreadsheet URL');
          get().markEntryFailed(entryId, 'Invalid spreadsheet URL');
          return false;
        }

        set({ isSyncing: true });

        const result = await appendEntryToSheet(
          entry,
          settings as UserSettings,
          spreadsheetId,
          accessToken
        );

        if (result.success) {
          get().markEntrySynced(entryId);
          const now = new Date().toISOString();
          set({
            isSyncing: false,
            lastSyncAt: now
          });

          // Update sync tracker
          const { useSyncTracker } = await import('./useSyncTracker');
          useSyncTracker.getState().updateEntrySyncTime(now);

          return true;
        } else {
          get().markEntryFailed(entryId, result.error || 'Unknown error');
          set({ isSyncing: false });
          return false;
        }
      },

      /**
       * Marks an entry as successfully synced.
       */
      markEntrySynced: (entryId: string) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? { ...e, syncStatus: 'synced' as const, syncError: undefined, updatedAt: new Date().toISOString() }
              : e
          ),
          _revision: state._revision + 1,
        }));
      },

      /**
       * Marks an entry sync as failed.
       */
      markEntryFailed: (entryId: string, error: string) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? { ...e, syncStatus: 'error' as const, syncError: error, updatedAt: new Date().toISOString() }
              : e
          ),
          _revision: state._revision + 1,
        }));
      },

      /**
       * Gets all entries that haven't been synced yet.
       */
      getPendingEntries: () => {
        return get().entries.filter((e) => e.syncStatus === 'pending');
      },

      /**
       * Syncs all pending entries to Google Sheets.
       */
      syncAllPending: async (accessToken: string) => {
        const pendingEntries = get().getPendingEntries();
        
        for (const entry of pendingEntries) {
          await get().syncEntryToSheet(entry.id, accessToken);
        }
      },

      /**
       * Batch syncs all pending/error entries to Google Sheets.
       * Groups by month and syncs efficiently with progress tracking.
       * Skips duplicates already in the sheet.
       */
      batchSyncEntries: async (
        accessToken: string,
        onProgress?: (progress: BatchSyncProgress) => void
      ): Promise<BatchSyncResult> => {
        const { entries } = get();
        
        // Get entries that need syncing (pending or error)
        const entriesToSync = entries.filter(
          e => e.syncStatus === 'pending' || e.syncStatus === 'error'
        );
        
        if (entriesToSync.length === 0) {
          return { success: true, total: 0, succeeded: 0, failed: 0, failedEntryIds: [] };
        }

        // Get settings
        const { useSettings } = await import('./useSettings');
        const settings = useSettings.getState();
        
        if (!settings.googleSheet.url) {
          return { 
            success: false, 
            total: entriesToSync.length, 
            succeeded: 0, 
            failed: entriesToSync.length, 
            failedEntryIds: entriesToSync.map(e => e.id) 
          };
        }

        const spreadsheetId = getSpreadsheetIdFromUrl(settings.googleSheet.url);
        if (!spreadsheetId) {
          return { 
            success: false, 
            total: entriesToSync.length, 
            succeeded: 0, 
            failed: entriesToSync.length, 
            failedEntryIds: entriesToSync.map(e => e.id) 
          };
        }

        set({ isSyncing: true });
        
        // Initialize progress
        const progress: BatchSyncProgress = {
          total: entriesToSync.length,
          completed: 0,
          succeeded: 0,
          failed: 0,
          current: 0,
          failedEntryIds: [],
        };
        
        set({ batchSyncProgress: progress });
        onProgress?.(progress);

        // Group entries by month
        const entriesByMonth = groupEntriesByMonth(entriesToSync);
        const allSyncedIds: string[] = [];
        const allSkippedIds: string[] = [];
        const allFailedIds: string[] = [];

        // Process each month's entries
        let processedCount = 0;
        for (const [sheetName, monthEntries] of entriesByMonth) {
          // Update progress - starting this batch
          progress.current = processedCount + 1;
          set({ batchSyncProgress: { ...progress } });
          onProgress?.({ ...progress });

          // Get existing entry keys for duplicate detection
          const existingKeys = await getExistingEntryKeys(
            spreadsheetId, 
            accessToken, 
            sheetName
          );

          // Sync this month's entries
          const result = await appendEntriesToSheet(
            monthEntries,
            settings as UserSettings,
            spreadsheetId,
            accessToken,
            sheetName,
            existingKeys
          );

          // Update local state for synced entries
          result.syncedIds.forEach(id => {
            get().markEntrySynced(id);
            allSyncedIds.push(id);
          });

          // Mark skipped (duplicates) as synced too
          result.skippedIds.forEach(id => {
            get().markEntrySynced(id);
            allSkippedIds.push(id);
          });

          // Mark failed entries
          result.failedIds.forEach(id => {
            get().markEntryFailed(id, result.error || 'Sync failed');
            allFailedIds.push(id);
          });

          // Update progress
          processedCount += monthEntries.length;
          progress.completed = processedCount;
          progress.succeeded = allSyncedIds.length + allSkippedIds.length;
          progress.failed = allFailedIds.length;
          progress.failedEntryIds = allFailedIds;
          progress.current = processedCount;
          
          set({ batchSyncProgress: { ...progress } });
          onProgress?.({ ...progress });
        }

        // Final state update
        const now = new Date().toISOString();
        set({
          isSyncing: false,
          batchSyncProgress: null,
          lastSyncAt: now
        });

        // Update sync tracker if any entries succeeded
        if (allSyncedIds.length > 0 || allSkippedIds.length > 0) {
          const { useSyncTracker } = await import('./useSyncTracker');
          useSyncTracker.getState().updateEntrySyncTime(now);
        }

        return {
          success: allFailedIds.length === 0,
          total: entriesToSync.length,
          succeeded: allSyncedIds.length + allSkippedIds.length,
          failed: allFailedIds.length,
          failedEntryIds: allFailedIds,
        };
      },

      /**
       * Gets count of entries that can be synced (pending or error status).
       */
      getSyncableEntriesCount: () => {
        return get().entries.filter(
          e => e.syncStatus === 'pending' || e.syncStatus === 'error'
        ).length;
      },

      /**
       * Clears the batch sync progress state.
       */
      clearBatchSyncProgress: () => {
        set({ batchSyncProgress: null });
      },

            /**
       * Imports entries from the connected Google Sheet.
       * Merges with local entries, skipping duplicates based on date+time.
       */
      importEntriesFromSheet: async (accessToken: string): Promise<ImportEntriesResult> => {
        // Get settings to find the connected sheet
        const { useSettings } = await import('./useSettings');
        const settings = useSettings.getState();
        
        if (!settings.googleSheet.url) {
          return { 
            success: false, 
            imported: 0, 
            skipped: 0, 
            total: 0,
            error: 'No Google Sheet connected' 
          };
        }

        const spreadsheetId = getSpreadsheetIdFromUrl(settings.googleSheet.url);
        if (!spreadsheetId) {
          return { 
            success: false, 
            imported: 0, 
            skipped: 0, 
            total: 0,
            error: 'Invalid spreadsheet URL' 
          };
        }

        set({ isSyncing: true });

        try {
          // Fetch all entries from the sheet
          const result = await fetchAllEntriesFromSheet(spreadsheetId, accessToken);
          
          if (result.error) {
            set({ isSyncing: false });
            return { 
              success: false, 
              imported: 0, 
              skipped: 0, 
              total: 0,
              error: result.error 
            };
          }

          const sheetEntries = result.entries;
          const { entries: localEntries } = get();
          
          // Create a set of existing entry keys for duplicate detection
          // Key format: "date|startTime|endTime"
          const existingKeys = new Set(
            localEntries.map(e => `${e.date}|${e.startTime}|${e.endTime}`)
          );
          
          // Filter out duplicates
          const newEntries = sheetEntries.filter(entry => {
            const key = `${entry.date}|${entry.startTime}|${entry.endTime}`;
            return !existingKeys.has(key);
          });
          
          // Merge new entries with existing (prepend so newest first after sort)
          if (newEntries.length > 0) {
            set((state) => ({
              entries: [...state.entries, ...newEntries].sort((a, b) => {
                // Sort by date descending, then by startTime descending
                const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateCompare !== 0) return dateCompare;
                return b.startTime.localeCompare(a.startTime);
              }),
              _revision: state._revision + 1,
            }));
          }
          
          const now = new Date().toISOString();
          set({
            isSyncing: false,
            lastSyncAt: now,
          });

          // Update sync tracker to reflect that we just synced entries from the sheet
          const { useSyncTracker } = await import('./useSyncTracker');
          useSyncTracker.getState().updateEntrySyncTime(now);

          return {
            success: true,
            imported: newEntries.length,
            skipped: sheetEntries.length - newEntries.length,
            total: sheetEntries.length,
          };
        } catch (error) {
          set({ isSyncing: false });
          return {
            success: false,
            imported: 0,
            skipped: 0,
            total: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },

      /**
       * Clears all entries (for testing/reset).
       */
      clearEntries: () => {
        set((state) => ({ entries: [], lastSyncAt: null, _revision: state._revision + 1 }));
      },
    }),

    // ═══════════════════════════════════════
    // PERSIST CONFIGURATION
    // ═══════════════════════════════════════
    {
      name: STORAGE_KEYS.entries || 'cadence-entries',
      storage: createJSONStorage(() => localStorage),
      // Merge persisted state with current state, normalizing entries
      // This runs BEFORE set(), so subscribers always see normalized data
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as object) };
        // Normalize entries to ensure oneOffSymptoms defaults to empty array
        if (merged.entries) {
          merged.entries = (merged.entries as StoredEntry[]).map((entry) => ({
            ...entry,
            oneOffSymptoms: entry.oneOffSymptoms ?? [],
          }));
        }
        // Bump revision so consumers recompute after rehydration
        merged._revision = ((merged._revision as number) || 0) + 1;
        return merged as EntryStore;
      },
      // onRehydrateStorage: () => () => {
      //   // Hydration complete - no-op, normalization handled by merge()
      // },
    }
  )
);

// ============================================
// SELECTOR HOOKS
// ============================================

export const useEntriesList = () => useEntries((state) => state.entries);
export const useEntriesRevision = () => useEntries((state) => state._revision);
export const useIsSyncing = () => useEntries((state) => state.isSyncing);
export const usePendingEntries = () => useEntries((state) => state.getPendingEntries());
export const useBatchSyncProgress = () => useEntries((state) => state.batchSyncProgress);
export const useSyncableEntriesCount = () => useEntries((state) =>
  state.entries.filter(e => e.syncStatus === 'pending' || e.syncStatus === 'error').length
);

// ============================================
// HYDRATION HOOK
// ============================================

/**
 * Hook that returns true once the entries store has finished
 * rehydrating from localStorage. Use this to gate rendering
 * of components that depend on entries data, preventing stale
 * or empty state from being shown.
 */
// export function useEntriesHydrated(): boolean {
//   const [hydrated, setHydrated] = useState(false);

//   useEffect(() => {
//     // Check if already hydrated (persist API only available client-side)
//     if (useEntries.persist?.hasHydrated()) {
//       setHydrated(true);
//       return;
//     }
//     const unsub = useEntries.persist.onFinishHydration(() => {
//       setHydrated(true);
//     });
//     return () => { unsub(); };
//   }, []);

//   return hydrated;
// }