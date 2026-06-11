import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { existsCaseInsensitive } from "@/lib/stringUtils";

import {
  getSettingsFromSheet,
  saveSettingsToSheet as apiSaveSettings,
} from "@/lib/googleSheets";

import type {
  SettingsStore,
  TimeFormat,
  WeekStartDay,
  PeriodTrackingConfig,
  IntensityTrackingConfig,
  StoolTrackingConfig,
  MedicineTracking,
  HistoryNavigationContext,
} from "@/types";

import {
  DEFAULT_USER_SETTINGS,
  STORAGE_KEYS
} from "@/lib/constants";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // =======================================================================
      // INITIAL STATE
      // =======================================================================
      ...DEFAULT_USER_SETTINGS,
      isGoogleSheetConnected: false,
      isSyncing: false,
      hasUnsavedChanges: false,
      lastSavedSnapshot: null, // JSON snapshot of last saved state for reverting
      monthlyNavigationContext: { startDate: null, endDate: null, fromCycleInsights: false },
      historyNavigationContext: { startDate: null, endDate: null, fromCycleInsights: false },

      // =======================================================================
      // GOOGLE SHEET ACTIONS
      // =======================================================================

      setGoogleSheet: async (url: string, name?: string) => {
        const currentSheetUrl = get().googleSheet.url;
        const newSheetUrl = url.trim();

        // If connecting to a different sheet URL, reset all entries to pending
        if (currentSheetUrl !== newSheetUrl) {
          const { useEntries } = await import('./useEntries');
          const entriesState = useEntries.getState();

          // Mark all synced entries as pending so they'll be pushed to the new sheet
          const hasEntriesWithSyncedStatus = entriesState.entries.some(
            entry => entry.syncStatus === 'synced'
          );

          if (hasEntriesWithSyncedStatus) {
            useEntries.setState({
              entries: entriesState.entries.map(entry =>
                entry.syncStatus === 'synced'
                  ? { ...entry, syncStatus: 'pending' as const }
                  : entry
              )
            });
          }

          // Reset sync tracker so stale timestamps from a previous sheet
          // don't trigger the 48-hour sync reminder on a fresh connection
          const { useSyncTracker } = await import('./useSyncTracker');
          useSyncTracker.getState().reset();
        }

        set({
          isGoogleSheetConnected: true,
          googleSheet: {
            url: newSheetUrl,
            name: name?.trim() || null,
            addedAt: new Date().toISOString(),
          },
        });
      },

      clearGoogleSheet: () => {
        set({
          isGoogleSheetConnected: false,
          googleSheet: { url: null, name: null, addedAt: null },
        });
      },

      disconnectGoogleSheet: () => {
        get().clearGoogleSheet();
      },

      /**
       * Handles the case when sheet verification fails (deleted/access removed).
       * Clears the sheet connection and returns a user-friendly message.
       * Called when verifySheetConnection() returns failure.
       */
      handleSheetVerificationFailure: () => {
        set({
          isGoogleSheetConnected: false,
          googleSheet: { url: null, name: null, addedAt: null },
        });
      },

      saveSettingsToSheet: async (accessToken: string): Promise<boolean> => {
        const { googleSheet, ...allSettings } = get();

        if (!googleSheet.url) {
          console.error("No Google Sheet connected. Cannot save settings.");
          return false;
        }

        const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet.url);
        if (!spreadsheetId) {
          console.error("Could not extract spreadsheet ID from URL.");
          return false;
        }

        set({ isSyncing: true });
        console.log("Saving settings to sheet...");

        const settingsToSave = {
          timeFormat: allSettings.timeFormat,
          weekStartDay: allSettings.weekStartDay,
          symptoms: allSettings.symptoms,
          periodTracking: allSettings.periodTracking,
          stoolTracking: allSettings.stoolTracking,
          medicineTracking: allSettings.medicineTracking,
          setupComplete: allSettings.setupComplete,
          tutorialComplete: allSettings.tutorialComplete,
        };

        const success = await apiSaveSettings(
          JSON.stringify(settingsToSave),
          spreadsheetId,
          accessToken
        );

        console.log(success ? "Settings saved successfully!" : "Failed to save settings.");

        // Store snapshot on successful save for revert functionality
        if (success) {
          set({
            isSyncing: false,
            hasUnsavedChanges: false,
            lastSavedSnapshot: JSON.stringify(settingsToSave),
          });

          // Update sync tracker
          const { useSyncTracker } = await import('./useSyncTracker');
          useSyncTracker.getState().updateSettingsSyncTime(new Date().toISOString());
        } else {
          set({ isSyncing: false });
        }

        return success;
      }, // <-- This closing brace and comma was missing!

      loadSettingsFromSheet: async (
        spreadsheetId: string,
        accessToken: string,
        sheetName?: string
      ): Promise<boolean> => {
        set({ isSyncing: true });
        console.log("loadSettingsFromSheet: Starting restore for spreadsheet:", spreadsheetId);

        const settingsJson = await getSettingsFromSheet(spreadsheetId, accessToken);

        if (!settingsJson) {
          console.error("loadSettingsFromSheet: No settings found in sheet. The .cadence-settings sheet may not exist or is empty.");
          set({ isSyncing: false });
          return false;
        }

        console.log("loadSettingsFromSheet: Found settings JSON, parsing...");

        try {
          const loadedSettings = JSON.parse(settingsJson);
          console.log("loadSettingsFromSheet: Parsed settings keys:", Object.keys(loadedSettings));

          // If settings exist in a sheet with no flags (saved before these fields existed),
          // default to true so returning users aren't re-prompted for setup/tutorial.
          // If the flags are explicitly stored (e.g. false for a new user's first sync),
          // respect the stored value so the tutorial flow is not skipped prematurely.
          const recoveredSettings = {
            ...loadedSettings,
            setupComplete: loadedSettings.setupComplete ?? true,
            tutorialComplete: loadedSettings.tutorialComplete ?? true,
          };

          // Update the snapshot to reflect the resolved flags
          const correctedSnapshot = JSON.stringify({
            timeFormat: recoveredSettings.timeFormat,
            weekStartDay: recoveredSettings.weekStartDay,
            symptoms: recoveredSettings.symptoms,
            periodTracking: recoveredSettings.periodTracking,
            stoolTracking: recoveredSettings.stoolTracking,
            medicineTracking: recoveredSettings.medicineTracking,
            setupComplete: recoveredSettings.setupComplete,
            tutorialComplete: recoveredSettings.tutorialComplete,
          });

          set({
            ...recoveredSettings,
            isGoogleSheetConnected: true,
            googleSheet: {
              url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
              name: sheetName || "Restored Sheet",
              addedAt: new Date().toISOString(),
            },
            isSyncing: false,
            hasUnsavedChanges: false,
            lastSavedSnapshot: correctedSnapshot,
          });

          // Verify the state was set correctly
          const updatedState = get();
          console.log("loadSettingsFromSheet: Settings restored successfully. Google Sheet URL:", updatedState.googleSheet.url);
          console.log("loadSettingsFromSheet: Symptoms enabled:", updatedState.symptoms?.enabled, "Selected count:", updatedState.symptoms?.selected?.length);
          console.log("loadSettingsFromSheet: Period tracking enabled:", updatedState.periodTracking?.enabled);

          // Update sync tracker to reflect that we just synced settings from the sheet
          const { useSyncTracker } = await import('./useSyncTracker');
          useSyncTracker.getState().updateSettingsSyncTime(new Date().toISOString());

          return true;
        } catch (error) {
          console.error("Failed to parse settings from Google Sheet.", error);
          set({ isSyncing: false });
          return false;
        }
      },

      // =======================================================================
      // TIME FORMAT
      // =======================================================================

      setTimeFormat: (format: TimeFormat) => {
        set({ timeFormat: format, hasUnsavedChanges: true });
      },

      // =======================================================================
      // WEEK START DAY
      // =======================================================================

      setWeekStartDay: (day: WeekStartDay) => {
        set({ weekStartDay: day, hasUnsavedChanges: true });
      },


      // =======================================================================
      // SYMPTOM ACTIONS
      // =======================================================================

      toggleSymptom: (symptom: string) => {
        const { symptoms } = get();
        const isSelected = symptoms.selected.includes(symptom);

        set({
          symptoms: {
            ...symptoms,
            selected: isSelected
              ? symptoms.selected.filter((s) => s !== symptom)
              : [...symptoms.selected, symptom],
          },
          hasUnsavedChanges: true,
        });
      },

      addCustomSymptom: (symptom: string) => {
        const { symptoms } = get();
        const trimmedSymptom = symptom.trim();

        // Case-insensitive duplicate check
        if (
          existsCaseInsensitive(trimmedSymptom, symptoms.custom) ||
          existsCaseInsensitive(trimmedSymptom, symptoms.selected)
        ) {
          return;
        }

        set({
          symptoms: {
            ...symptoms,
            custom: [...symptoms.custom, trimmedSymptom],
            selected: [...symptoms.selected, trimmedSymptom],
          },
          hasUnsavedChanges: true,
        });
      },

      removeCustomSymptom: (symptom: string) => {
        const { symptoms, periodTracking } = get();

        set({
          symptoms: {
            ...symptoms,
            custom: symptoms.custom.filter((s) => s !== symptom),
            selected: symptoms.selected.filter((s) => s !== symptom),
          },
          periodTracking: {
            ...periodTracking,
            periodSymptoms: periodTracking.periodSymptoms.filter((s) => s !== symptom),
            customPeriodSymptoms: periodTracking.customPeriodSymptoms.filter((s) => s !== symptom),
          },
          hasUnsavedChanges: true,
        });
      },

      setIntensityTracking: (config: Partial<IntensityTrackingConfig>) => {
        const { symptoms } = get();

        set({
          symptoms: {
            ...symptoms,
            intensityTracking: { ...symptoms.intensityTracking, ...config },
          },
          hasUnsavedChanges: true,
        });
      },

      // =======================================================================
      // PERIOD TRACKING ACTIONS
      // =======================================================================

      setPeriodTracking: (
        config: Partial<Omit<PeriodTrackingConfig, "periodSymptoms" | "customPeriodSymptoms">>
      ) => {
        const { periodTracking } = get();

        set({
          periodTracking: { ...periodTracking, ...config },
          hasUnsavedChanges: true,
        });
      },

      togglePeriodSymptom: (symptom: string) => {
        const { periodTracking } = get();
        const isSelected = periodTracking.periodSymptoms.includes(symptom);

        set({
          periodTracking: {
            ...periodTracking,
            periodSymptoms: isSelected
              ? periodTracking.periodSymptoms.filter((s) => s !== symptom)
              : [...periodTracking.periodSymptoms, symptom],
          },
          hasUnsavedChanges: true,
        });
      },

      addCustomPeriodSymptom: (symptom: string) => {
        const { symptoms, periodTracking } = get();
        const trimmedSymptom = symptom.trim();

        // Case-insensitive duplicate check
        if (
          existsCaseInsensitive(trimmedSymptom, periodTracking.customPeriodSymptoms) ||
          existsCaseInsensitive(trimmedSymptom, periodTracking.periodSymptoms) ||
          existsCaseInsensitive(trimmedSymptom, symptoms.selected)
        ) {
          return;
        }

        set({
          symptoms: {
            ...symptoms,
            selected: [...symptoms.selected, trimmedSymptom],
          },
          periodTracking: {
            ...periodTracking,
            customPeriodSymptoms: [...periodTracking.customPeriodSymptoms, trimmedSymptom],
            periodSymptoms: [...periodTracking.periodSymptoms, trimmedSymptom],
          },
          hasUnsavedChanges: true,
        });
      },

      removeCustomPeriodSymptom: (symptom: string) => {
        const { symptoms, periodTracking } = get();

        set({
          symptoms: {
            ...symptoms,
            selected: symptoms.selected.filter((s) => s !== symptom),
          },
          periodTracking: {
            ...periodTracking,
            customPeriodSymptoms: periodTracking.customPeriodSymptoms.filter((s) => s !== symptom),
            periodSymptoms: periodTracking.periodSymptoms.filter((s) => s !== symptom),
          },
          hasUnsavedChanges: true,
        });
      },

      // =======================================================================
      // STOOL TRACKING
      // =======================================================================

      setStoolTracking: (config: Partial<StoolTrackingConfig>) => {
        const { stoolTracking } = get();

        set({
          stoolTracking: { ...stoolTracking, ...config },
          hasUnsavedChanges: true,
        });
      },

      // =======================================================================
      // MEDICINE TRACKING
      // =======================================================================

      setMedicineTracking: (config: Partial<MedicineTracking>) => {
        const { medicineTracking } = get();

        set({
          medicineTracking: { ...medicineTracking, ...config },
          hasUnsavedChanges: true,
        });
      },

      // =======================================================================
      // HISTORY NAVIGATION CONTEXT
      // =======================================================================

      setHistoryNavigationContext: (context: Partial<HistoryNavigationContext>) => {
        set({
          historyNavigationContext: {
            startDate: context.startDate ?? null,
            endDate: context.endDate ?? null,
            fromCycleInsights: context.fromCycleInsights ?? false,
          },
        });
      },

      clearHistoryNavigationContext: () => {
        set({
          historyNavigationContext: {
            startDate: null,
            endDate: null,
            fromCycleInsights: false,
          },
        });
      },

      // =======================================================================
      // UNSAVED CHANGES MANAGEMENT
      // =======================================================================

      setHasUnsavedChanges: (value: boolean) => {
        set({ hasUnsavedChanges: value });
      },

      // Reverts settings to the last saved snapshot (used when discarding changes)
      revertToLastSave: () => {
        const { lastSavedSnapshot } = get();
        if (lastSavedSnapshot) {
          const saved = JSON.parse(lastSavedSnapshot);
          set({ ...saved, hasUnsavedChanges: false });
        }
      },

      // =======================================================================
      // SETUP & RESET
      // =======================================================================

      completeSetup: () => {
        set({ setupComplete: true });
      },

      completeTutorial: () => {
        set({ tutorialComplete: true });
      },

      resetSettings: () => {
        set({
          ...DEFAULT_USER_SETTINGS,
          isGoogleSheetConnected: false,
          googleSheet: { url: null, name: null, addedAt: null },
          timeFormat: "12h",
          weekStartDay: "sunday",
          symptoms: {
            enabled: false,
            selected: [],
            custom: [],
            intensityTracking: { enabled: false, scaleType: "simple" },
          },
          periodTracking: {
            enabled: false,
            periodSymptoms: [],
            customPeriodSymptoms: [],
            trackFlow: false,
          },
          stoolTracking: { enabled: false },
          medicineTracking: { enabled: false, medicines: [] },
          setupComplete: false,
          tutorialComplete: false,
          hasUnsavedChanges: false,
          lastSavedSnapshot: null,
          monthlyNavigationContext: { startDate: null, endDate: null, fromCycleInsights: false },
          historyNavigationContext: { startDate: null, endDate: null, fromCycleInsights: false },

        });
      },
    }),

    // =========================================================================
    // PERSIST CONFIGURATION
    // =========================================================================
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => localStorage),

      // Only persist these fields to localStorage
      // Note: hasUnsavedChanges and lastSavedSnapshot are intentionally excluded
      partialize: (state) => ({
        timeFormat: state.timeFormat,
        weekStartDay: state.weekStartDay,
        symptoms: state.symptoms,
        periodTracking: state.periodTracking,
        stoolTracking: state.stoolTracking,
        medicineTracking: state.medicineTracking,
        googleSheet: state.googleSheet,
        setupComplete: state.setupComplete,
        tutorialComplete: state.tutorialComplete,
        isGoogleSheetConnected: state.isGoogleSheetConnected,
      }),
    }
  )
);

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

export const useTimeFormat = () => useSettings((state) => state.timeFormat);
export const useWeekStartDay = () => useSettings((state) => state.weekStartDay);
export const useSymptoms = () => useSettings((state) => state.symptoms);
export const usePeriodTracking = () => useSettings((state) => state.periodTracking);
export const useStoolTracking = () => useSettings((state) => state.stoolTracking);
export const useSetupComplete = () => useSettings((state) => state.setupComplete);
export const useIntensityTracking = () => useSettings((state) => state.symptoms.intensityTracking);
export const useGoogleSheet = () => useSettings((state) => state.googleSheet);
export const useMedicineTracking = () => useSettings((state) => state.medicineTracking);
export const useHasUnsavedChanges = () => useSettings((state) => state.hasUnsavedChanges);