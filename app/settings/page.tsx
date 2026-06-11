"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkForExistingSettings, checkForExistingEntries, deleteSettingsSheet, deleteSavedFiltersSheet, getSpreadsheetTitle } from "@/lib/googleSheets";
import { useSettings } from "@/stores/useSettings";
import { validateSettings } from "@/lib/settingsValidation";
import { OAuthErrorModal } from "@/components/ui/OAuthErrorModal";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { AdvancedOptionsModal, DoubleConfirmModal } from "@/components/ui/AdvancedOptionsModal";
import { useButtonRateLimit } from "@/hooks/useRateLimit";
import { SecureTextInput, SecureSheetURLInput } from '@/components/ui/SecureInput';
import { containsFormulaInjection } from '@/lib/inputSecurity';

import {
  DEFAULT_SYMPTOMS,
  GOOGLE_SHEET_URL_PATTERN,
  PRODUCT_OPTIONS,
  MEDICINE_CATEGORIES,
  withBasePath,
} from "@/lib/constants";

import type { PainScaleType, Medicine } from "@/types";

import { useSavedFilters } from "@/stores/useSavedFilters";
import { useEntries } from "@/stores/useEntries";
import { useSyncState } from "@/stores/useSyncState";
import { useSyncTracker } from "@/stores/useSyncTracker";
import { startSync } from "@/lib/syncEngine";

import {
  SymptomChip,
  ToggleRow,
  PainScaleOption,
  CustomProductSection,
  MedicineItem,
  AddMedicineForm,
  RecoveryPromptModal,
  SavePromptModal,
  ImportEntriesModal,
} from "@/components/settings";
import { SyncWithGoogleSheetsButton, SyncStatusBadge } from "@/components/sync";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";


// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_CUSTOM_SYMPTOMS = 30;
const MAX_CUSTOM_PERIOD_SYMPTOMS = 30;
const MAX_MEDICINES = 15;

// =============================================================================
// LOCALSTORAGE UTILITY
// =============================================================================

/**
 * Clears all Cadence-related localStorage keys.
 * @param includeEntries - If true, also clears the entries cache (default: false)
 */
function clearAllCadenceStorage(includeEntries: boolean = false): void {
  // Reset sync tracker via Zustand (clears both in-memory and persisted state)
  useSyncTracker.getState().reset();

  // Known Cadence storage keys
  const keysToRemove = [
    "cadence-settings",
    "cadence-saved-filters",
    "cadence-backup-prompt-dismissed",
  ];

  if (includeEntries) {
    keysToRemove.push("cadence-entries");
  }

  // Remove known keys
  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Remove all rate limit keys (dynamic pattern: cadence-rateLimit_*)
  const allKeys = Object.keys(localStorage);
  allKeys.forEach((key) => {
    if (key.startsWith("cadence-rateLimit_")) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Clears settings and filters while preserving the Google Sheet connection.
 * Used for "Reset App Settings Only" for Google Sheet users.
 */
function clearSettingsPreserveGoogleSheet(): void {
  // Read the current settings to extract Google Sheet connection info
  const currentSettingsRaw = localStorage.getItem("cadence-settings");
  let googleSheetInfo: { url: string | null; name: string | null; addedAt: string | null } | null = null;
  let isConnected = false;

  if (currentSettingsRaw) {
    try {
      const parsed = JSON.parse(currentSettingsRaw);
      if (parsed.state?.isGoogleSheetConnected && parsed.state?.googleSheet?.url) {
        isConnected = true;
        googleSheetInfo = {
          url: parsed.state.googleSheet.url,
          name: parsed.state.googleSheet.name,
          addedAt: parsed.state.googleSheet.addedAt,
        };
      }
    } catch (e) {
      console.error("Failed to parse settings for Google Sheet preservation:", e);
    }
  }

  // Reset sync tracker via Zustand (clears both in-memory and persisted state)
  useSyncTracker.getState().reset();

  // Clear settings-related storage (but not entries)
  const keysToRemove = [
    "cadence-settings",
    "cadence-saved-filters",
    "cadence-backup-prompt-dismissed",
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Clear rate limit keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach((key) => {
    if (key.startsWith("cadence-rateLimit_")) {
      localStorage.removeItem(key);
    }
  });

  // Restore Google Sheet connection info if it existed
  if (isConnected && googleSheetInfo) {
    // Create a minimal settings object that just preserves the Google Sheet connection
    // The store will merge this with defaults on hydration
    const preservedSettings = {
      state: {
        isGoogleSheetConnected: true,
        googleSheet: googleSheetInfo,
      },
      version: 0, // Zustand persist version
    };
    localStorage.setItem("cadence-settings", JSON.stringify(preservedSettings));
  }
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <SettingsPageSkeleton />;
  }

  return <SettingsPageContent />;
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-64 bg-app-border rounded animate-pulse" />
        <div className="h-4 w-48 bg-app-border rounded animate-pulse mt-2" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card">
          <div className="h-6 w-40 bg-app-border rounded animate-pulse mb-4" />
          <div className="h-12 w-full bg-app-border rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN CONTENT
// =============================================================================

function SettingsPageContent() {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // RATE LIMITING
  // ---------------------------------------------------------------------------
  // Save to Sheet buttons: Allow 3 saves per minute
  const saveRateLimit = useButtonRateLimit({
    maxRequests: 3,
    windowMs: 60000, // 1 minute
    key: 'settings-save',
    storageType: 'localStorage'
  });

  // Edit button: Allow 5 edits per minute
  const editRateLimit = useButtonRateLimit({
    maxRequests: 5,
    windowMs: 60000,
    key: 'settings-edit',
    storageType: 'localStorage'
  });

  // Disconnect button: Consolidated with sync-google-sheets rate limit (3 per minute)
  const disconnectRateLimit = useButtonRateLimit({
    maxRequests: 3,
    windowMs: 60000, // 1 minute (matches sync-google-sheets)
    key: 'sync-google-sheets', // Shares rate limit with sync buttons
    storageType: 'localStorage'
  });


  // ---------------------------------------------------------------------------
  // STORE
  // ---------------------------------------------------------------------------
  const {
    setupComplete,
    tutorialComplete,
    timeFormat,
    symptoms,
    weekStartDay,
    periodTracking,
    stoolTracking,
    googleSheet,
    medicineTracking,
    // isSyncing,
    isGoogleSheetConnected,
    setTimeFormat,
    setWeekStartDay,
    toggleSymptom,
    addCustomSymptom,
    removeCustomSymptom,
    setIntensityTracking,
    setPeriodTracking,
    togglePeriodSymptom,
    addCustomPeriodSymptom,
    removeCustomPeriodSymptom,
    setStoolTracking,
    setGoogleSheet,
    saveSettingsToSheet,
    loadSettingsFromSheet,
    clearGoogleSheet,
    completeSetup,
    setMedicineTracking,
  } = useSettings();

  const hasUnsavedChanges = useSettings((state) => state.hasUnsavedChanges);

  const importEntriesFromSheet = useEntries((state) => state.importEntriesFromSheet);

  // Get sync state for disabling actions during sync and showing progress
  const { syncInProgress, currentPhase } = useSyncState();

  // Saved filters store
  const savedFiltersLoadFromSheet = useSavedFilters((state) => state.loadFromSheet);
  const savedFiltersSyncToSheet = useSavedFilters((state) => state.syncToSheet);

  // ---------------------------------------------------------------------------
  // LOCAL STATE
  // ---------------------------------------------------------------------------

  // Get onboarding mode from URL params (set by welcome page)
  const searchParams = useSearchParams();
  const onboardingMode = searchParams.get("onboardingMode") as "google-sheet" | "anonymous" | null;
  const highlightSection = searchParams.get("highlight");

  // Track if Google Sheet section is expanded (for Anonymous mode accordion)
  const [isGoogleSheetExpanded, setIsGoogleSheetExpanded] = useState(
    // Start expanded if mode is google-sheet, or if user already has a sheet connected
    onboardingMode === "google-sheet" || isGoogleSheetConnected
  );

  const [newSymptom, setNewSymptom] = useState("");
  const [newPeriodSymptom, setNewPeriodSymptom] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [isEditingSheet, setIsEditingSheet] = useState(false);

  // Validation: Check if any text inputs exceed character limits
  const [customProductInputErrors, setCustomProductInputErrors] = useState<Record<string, boolean>>({});
  const [medicineNameInputError, setMedicineNameInputError] = useState(false);
  const [dosageInputError, setDosageInputError] = useState(false);
  const [sheetUrlInputError, setSheetUrlInputError] = useState(false);

  // Formula injection detection state
  const [newSymptomHasFormulaInjection, setNewSymptomHasFormulaInjection] = useState(false);
  const [newPeriodSymptomHasFormulaInjection, setNewPeriodSymptomHasFormulaInjection] = useState(false);
  const [customProductFormulaInjection, setCustomProductFormulaInjection] = useState<Record<string, boolean>>({});
  const [medicineNameHasFormulaInjection, setMedicineNameHasFormulaInjection] = useState(false);
  const [dosageHasFormulaInjection, setDosageHasFormulaInjection] = useState(false);

  // Google Sheet validation errors
  const [sheetUrlError, setSheetUrlError] = useState<string | null>(null);

  const hasTextInputError =
    newSymptom.length > 60 ||
    newPeriodSymptom.length > 60 ||
    sheetUrl.length > 120 ||
    Object.values(customProductInputErrors).some(hasError => hasError) ||
    medicineNameInputError ||
    dosageInputError ||
    newSymptomHasFormulaInjection ||
    newPeriodSymptomHasFormulaInjection ||
    Object.values(customProductFormulaInjection).some(hasInjection => hasInjection) ||
    medicineNameHasFormulaInjection ||
    dosageHasFormulaInjection ||
    !!sheetUrlError;
  const [pendingSheetUrl, setPendingSheetUrl] = useState<string | null>(null);
  const [pendingSheetName, setPendingSheetName] = useState<string | null>(null);
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);  
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<"tutorial" | "entry" | null>(null);
  // OAuth error modal
  const [showOAuthError, setShowOAuthError] = useState(false);
  const [oauthErrorAction, setOauthErrorAction] = useState("");
  const [oauthRetryFn, setOauthRetryFn] = useState<(() => void) | null>(null);
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalConfig, setSuccessModalConfig] = useState<{
    title: string;
    description: string;
    secondaryText: string;
    showSyncButton?: boolean;
  }>({
    title: "",
    description: "",
    secondaryText: "",
  });
  const [navigateAfterSuccess, setNavigateAfterSuccess] = useState<string | null>(null);
  const [showSyncLoadingOverlay, setShowSyncLoadingOverlay] = useState(false);
  const [showImportEntriesModal, setShowImportEntriesModal] = useState(false);
  const [pendingImportAccessToken, setPendingImportAccessToken] = useState<string | null>(null);

  // Advanced Options modal states
  const [showResetSettingsModal, setShowResetSettingsModal] = useState(false);
  const [showDeleteAllDataModal, setShowDeleteAllDataModal] = useState(false);
  const [showDeleteMetadataModal, setShowDeleteMetadataModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // "Entries only" mode - sheet has entry data but no settings (user previously reset metadata)
  // In this mode, we just accept the sheet URL without OAuth, then OAuth on Continue/Skip Tutorial
  const [hasEntriesOnlySheet, setHasEntriesOnlySheet] = useState(false);
  const [pendingEntriesOnlySheetUrl, setPendingEntriesOnlySheetUrl] = useState<string | null>(null);
  const [pendingEntriesOnlySheetName, setPendingEntriesOnlySheetName] = useState<string | null>(null);

  // Validation error display - only show after user attempts to submit
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // ---------------------------------------------------------------------------
  // SAFE ACCESS DEFAULTS
  // ---------------------------------------------------------------------------

  const safeGoogleSheet = googleSheet ?? { url: null, name: null, addedAt: null };

  const safePeriodTracking = periodTracking ?? {
    enabled: false,
    trackFlow: false,
    periodSymptoms: [],
    customPeriodSymptoms: [],
    productTracking: { enabled: false, selectedProducts: [], customProducts: {} },
  };

  const safeStoolTracking = stoolTracking ?? { enabled: false };

  const safeMedicineTracking = medicineTracking ?? { enabled: false, medicines: [] };

  const intensityTracking = symptoms?.intensityTracking ?? {
    enabled: false,
    scaleType: "simple" as PainScaleType,
  };

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const canAddMoreCustomSymptoms = (symptoms?.custom?.length ?? 0) < MAX_CUSTOM_SYMPTOMS;
  const canAddMorePeriodSymptoms =
    (safePeriodTracking.customPeriodSymptoms?.length ?? 0) < MAX_CUSTOM_PERIOD_SYMPTOMS;

  const allAvailableSymptoms = [...DEFAULT_SYMPTOMS, ...(symptoms?.custom ?? [])].filter(
    (s) => s !== "Pain"
  );

  const periodSelectableSymptoms = allAvailableSymptoms.filter(
    (s) => !safePeriodTracking.customPeriodSymptoms?.includes(s)
  );

  const availableMedicineCategories = MEDICINE_CATEGORIES.filter((cat) => {
    if (cat.value === "bowel") return safeStoolTracking.enabled;
    if (cat.value === "period") return safePeriodTracking.enabled;
    if (cat.value === "symptom") return true;
    if (cat.value === "other") return true;
    return false;
  });

  // ---------------------------------------------------------------------------
  // VALIDATION (using shared utility)
  // ---------------------------------------------------------------------------
  
  const settingsValidation = validateSettings({
    symptoms,
    periodTracking: safePeriodTracking,
    medicineTracking: safeMedicineTracking,
    stoolTracking: safeStoolTracking,
  });

  const {
    // anySectionEnabled,
    // symptomsValid,
    productTrackingValid,
    // customProductsValid,
    medicineTrackingValid,
    productsMissingCustomItems,
  } = settingsValidation;

  const allOptionalFeaturesEnabled =
    (symptoms?.enabled ?? false) &&
    intensityTracking.enabled &&
    safeStoolTracking.enabled &&
    safePeriodTracking.enabled &&
    safePeriodTracking.trackFlow &&
    (safePeriodTracking.productTracking?.enabled ?? false) &&
    safeMedicineTracking.enabled;

  const allPeriodSymptomsSelected =
    periodSelectableSymptoms.length > 0 &&
    periodSelectableSymptoms.every((s) => safePeriodTracking.periodSymptoms?.includes(s));

  // Check if all default symptoms are selected (for Select All / Deselect All button)
  const allDefaultSymptomsSelected =
    DEFAULT_SYMPTOMS.length > 0 &&
    DEFAULT_SYMPTOMS.every((s) => symptoms?.selected?.includes(s));

  // Check if all custom general symptoms are selected
  const customGeneralSymptoms = symptoms?.custom ?? [];
  const allCustomSymptomsSelected =
    customGeneralSymptoms.length > 0 &&
    customGeneralSymptoms.every((s) => symptoms?.selected?.includes(s));

  // Check if all custom period symptoms are selected
  const customPeriodSymptomsList = safePeriodTracking.customPeriodSymptoms ?? [];
  const allCustomPeriodSymptomsSelected =
    customPeriodSymptomsList.length > 0 &&
    customPeriodSymptomsList.every((s) => safePeriodTracking.periodSymptoms?.includes(s));

  // ---------------------------------------------------------------------------
  // UNSAVED CHANGES WARNING
  // ---------------------------------------------------------------------------

  // Clear validation errors when the invalid sections become valid
  useEffect(() => {
    if (showValidationErrors && settingsValidation.isValid) {
      setShowValidationErrors(false);
    }
  }, [showValidationErrors, settingsValidation.isValid]);

  // Track sync progress when the sync-button success modal is open
  // Show loading overlay when sync starts, dismiss everything when sync completes
  useEffect(() => {
    if (!showSuccessModal || !successModalConfig.showSyncButton) return;

    if (syncInProgress) {
      setShowSyncLoadingOverlay(true);
    } else if (showSyncLoadingOverlay) {
      // Sync just finished — dismiss everything
      setShowSyncLoadingOverlay(false);
      setShowSuccessModal(false);
    }
  }, [syncInProgress, showSuccessModal, successModalConfig.showSyncButton, showSyncLoadingOverlay]);

  // Handle highlight query param - scroll to and highlight the section
  useEffect(() => {
    if (highlightSection) {
      // Small delay to ensure the DOM is ready
      const timer = setTimeout(() => {
        const element = document.getElementById(highlightSection);
        if (element) {
          // Scroll the element into view
          element.scrollIntoView({ behavior: "smooth", block: "start" });

          // Add a highlight animation class
          element.classList.add("highlight-pulse");

          // Remove the class after animation completes
          setTimeout(() => {
            element.classList.remove("highlight-pulse");
          }, 3000);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [highlightSection]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncInProgress) {
        e.preventDefault();
        e.returnValue = 'Sync in progress. Leaving will pause and resume later.';
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [syncInProgress]);

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  const getSpreadsheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  // ---------------------------------------------------------------------------
  // GOOGLE SHEET OAUTH HANDLERS
  // ---------------------------------------------------------------------------

    const connectSheetLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const spreadsheetId = getSpreadsheetIdFromUrl(sheetUrl);
      if (!spreadsheetId) {
        setSheetUrlError("Could not parse spreadsheet ID from URL");
        return;
      }

      // Fetch the sheet title from the API
      const fetchedSheetName = await getSpreadsheetTitle(spreadsheetId, tokenResponse.access_token);

      const existingSettings = await checkForExistingSettings(spreadsheetId, tokenResponse.access_token);

      if (existingSettings) {
        // Has settings - show recovery prompt
        setPendingSheetUrl(sheetUrl);
        setPendingSheetName(fetchedSheetName);
        setPendingAccessToken(tokenResponse.access_token);
        setShowRecoveryPrompt(true);
      } else {
        // No settings - check if there are entries (user previously reset metadata)
        const hasEntries = await checkForExistingEntries(spreadsheetId, tokenResponse.access_token);

        if (hasEntries) {
          // Has entries but no settings - store sheet info locally, defer full sync to Continue/Skip buttons
          // This enables the "entries only" passthrough mode
          setHasEntriesOnlySheet(true);
          setPendingEntriesOnlySheetUrl(sheetUrl);
          setPendingEntriesOnlySheetName(fetchedSheetName);
          setGoogleSheet(sheetUrl, fetchedSheetName ?? undefined);
          setSheetUrl("");
          setIsEditingSheet(false);

          // Show success modal with info about entries import
          setSuccessModalConfig({
            title: "Google Sheet Connected!",
            description: "We found existing entries in your sheet.",
            secondaryText: "Your entries will be imported when you click a \"Sync with Google Sheets\" button.",
          });
          setShowSuccessModal(true);
        } else {
          // Fresh sheet - connect and trigger full sync using sync engine
          setGoogleSheet(sheetUrl, fetchedSheetName ?? undefined);

          // Store token for sync engine
          sessionStorage.setItem('google_oauth_token', tokenResponse.access_token);
          sessionStorage.setItem('google_oauth_timestamp', Date.now().toString());

          // Get counts of what will be synced
          const entriesToSync = useEntries.getState().entries.filter(
            e => e.syncStatus === 'pending' || e.syncStatus === 'error'
          );
          const filtersToSync = useSavedFilters.getState().savedFilters.length;

          // Start full sync - will push all local data and pull any sheet data
          try {
            await startSync();

            // Show success modal with summary
            let description = "Your settings have been synced to your Google Sheet.";
            if (entriesToSync.length > 0 && filtersToSync > 0) {
              description = `Your settings, ${entriesToSync.length} ${entriesToSync.length === 1 ? 'entry' : 'entries'}, and ${filtersToSync} ${filtersToSync === 1 ? 'filter have' : 'filters have'} been synced.`;
            } else if (entriesToSync.length > 0) {
              description = `Your settings and ${entriesToSync.length} ${entriesToSync.length === 1 ? 'entry have' : 'entries have'} been synced.`;
            } else if (filtersToSync > 0) {
              description = `Your settings and ${filtersToSync} ${filtersToSync === 1 ? 'filter have' : 'filters have'} been synced.`;
            }

            setSuccessModalConfig({
              title: "Google Sheet Connected!",
              description,
              secondaryText: "Your data is now backed up and will sync across devices.",
            });
            setShowSuccessModal(true);
          } catch (error) {
            console.error("Sync error:", error);
            // Even if sync fails, sheet is still connected - user can retry sync manually
            setSuccessModalConfig({
              title: "Google Sheet Connected!",
              description: "Sheet connected successfully. Use the 'Sync with Google Sheets' button to sync your data.",
              secondaryText: "",
            });
            setShowSuccessModal(true);
          }

          setSheetUrl("");
          setIsEditingSheet(false);
        }
      }
    },
    onError: () => {
      setOauthErrorAction("connect your Google Sheet");
      setOauthRetryFn(() => () => connectSheetLogin());
      setShowOAuthError(true);
    },
    onNonOAuthError: () => {
      setOauthErrorAction("connect your Google Sheet");
      setOauthRetryFn(() => () => connectSheetLogin());
      setShowOAuthError(true);
    },
  });

  const saveLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const success = await saveSettingsToSheet(tokenResponse.access_token);
      
      // Also sync saved filters to sheet
      await savedFiltersSyncToSheet(tokenResponse.access_token);
      
      if (success) {
        setSuccessModalConfig({
          title: "Settings Saved!",
          description: "Your settings have been saved to your Google Sheet.",
          secondaryText: "Your preferences will sync across all your devices.",
        });
        setShowSuccessModal(true);
      } else {
        alert("Failed to save settings. Please check console for errors.");
      }
    },
    onError: () => {
      setOauthErrorAction("save your settings");
      setOauthRetryFn(() => () => saveLogin());
      setShowOAuthError(true);
    },
    onNonOAuthError: () => {
      setOauthErrorAction("save your settings");
      setOauthRetryFn(() => () => saveLogin());
      setShowOAuthError(true);
    },
  });

  const saveLoginThenNavigate = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const destination = pendingNavigation;
      setPendingNavigation(null);

      // Set setupComplete BEFORE saving so the sheet has accurate data
      // Also set tutorialComplete if skipping tutorial
      completeSetup();
      if (destination === "entry") {
        // User is skipping tutorial, mark it complete
        useSettings.getState().completeTutorial();
      }

      // Now save with the correct flags
      await saveSettingsToSheet(tokenResponse.access_token);

      // Also sync saved filters to sheet
      await savedFiltersSyncToSheet(tokenResponse.access_token);

      // If this is an "entries only" sheet (has entries but no settings), import the entries
      if (hasEntriesOnlySheet) {
        const importResult = await importEntriesFromSheet(tokenResponse.access_token);
        if (importResult.success && importResult.imported > 0) {
          console.log(`Imported ${importResult.imported} entries from sheet`);
        }
        // Clear the entries-only state
        setHasEntriesOnlySheet(false);
        setPendingEntriesOnlySheetUrl(null);
        setPendingEntriesOnlySheetName(null);
      }

      router.push(destination === "tutorial" ? "/tutorial" : "/entry");
    },
    onError: () => {
      // Don't clear pendingNavigation so retry works
      setOauthErrorAction("save your settings and continue");
      setOauthRetryFn(() => () => saveLoginThenNavigate());
      setShowOAuthError(true);
    },
    onNonOAuthError: () => {
      setOauthErrorAction("save your settings and continue");
      setOauthRetryFn(() => () => saveLoginThenNavigate());
      setShowOAuthError(true);
    },
  });

  // OAuth hook for resetting settings with sheet deletion
  const resetWithSheetDelete = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet?.url || "");

      if (spreadsheetId) {
        // Delete settings sheet
        const settingsDeleted = await deleteSettingsSheet(spreadsheetId, tokenResponse.access_token);
        if (settingsDeleted) {
          console.log("Settings sheet deleted from Google Sheet.");
        } else {
          console.warn("Failed to delete settings sheet, but proceeding with local reset.");
        }

        // Delete saved filters sheet
        const filtersDeleted = await deleteSavedFiltersSheet(spreadsheetId, tokenResponse.access_token);
        if (filtersDeleted) {
          console.log("Saved filters sheet deleted from Google Sheet.");
        } else {
          console.warn("Failed to delete saved filters sheet, but proceeding with local reset.");
        }
      }

      // Clear all local storage including entries cache
      clearAllCadenceStorage(true);
      window.location.href = withBasePath("/welcome"); // Redirect to welcome page
    },
    onError: () => {
      setOauthErrorAction("reset your settings");
      setOauthRetryFn(() => () => resetWithSheetDelete());
      setShowOAuthError(true);
    },
    onNonOAuthError: () => {
      setOauthErrorAction("reset your settings");
      setOauthRetryFn(() => () => resetWithSheetDelete());
      setShowOAuthError(true);
    },
  });

  // OAuth hook for resetting app settings only (preserves Google Sheet connection)
  const resetSettingsPreserveConnection = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet?.url || "");

      if (spreadsheetId) {
        // Delete settings sheet from Google Sheets
        const settingsDeleted = await deleteSettingsSheet(spreadsheetId, tokenResponse.access_token);
        if (settingsDeleted) {
          console.log("Settings sheet deleted from Google Sheet.");
        } else {
          console.warn("Failed to delete settings sheet, but proceeding with local reset.");
        }

        // Delete saved filters sheet from Google Sheets
        const filtersDeleted = await deleteSavedFiltersSheet(spreadsheetId, tokenResponse.access_token);
        if (filtersDeleted) {
          console.log("Saved filters sheet deleted from Google Sheet.");
        } else {
          console.warn("Failed to delete saved filters sheet, but proceeding with local reset.");
        }
      }

      // Clear local storage but preserve Google Sheet connection
      clearSettingsPreserveGoogleSheet();
      window.location.href = withBasePath("/settings"); // Reload settings page to reinitialize stores
    },
    onError: () => {
      setOauthErrorAction("reset your app settings");
      setOauthRetryFn(() => () => resetSettingsPreserveConnection());
      setShowOAuthError(true);
    },
    onNonOAuthError: () => {
      setOauthErrorAction("reset your app settings");
      setOauthRetryFn(() => () => resetSettingsPreserveConnection());
      setShowOAuthError(true);
    },
  });

  // ---------------------------------------------------------------------------
  // SHEET HANDLERS
  // ---------------------------------------------------------------------------

  const handleSaveGoogleSheet = () => {
    if (!sheetUrl.trim()) {
      setSheetUrlError("Please paste a Google Sheet URL");
      return;
    }
    if (!GOOGLE_SHEET_URL_PATTERN.test(sheetUrl.trim())) {
      setSheetUrlError("Please paste a valid Google Sheets URL");
      return;
    }
    setSheetUrlError(null);

    // Save sheet URL to localStorage without OAuth (name will be fetched on sync)
    setGoogleSheet(sheetUrl);

    // Clear form fields and edit mode
    setSheetUrl("");
    setIsEditingSheet(false);

    // Show success modal
    setSuccessModalConfig({
      title: "Google Sheet Connected!",
      description: "Sheet connected and is not yet synced.",
      secondaryText: "Click the button below to complete the process and push your data into your Google Sheet.",
      showSyncButton: true,
    });
    setShowSuccessModal(true);
  };

  const handleEditGoogleSheet = () => {
    if (editRateLimit.isRateLimited) {
      alert(`Please wait ${editRateLimit.getFormattedTime()} before editing again.`);
      return;
    }

    if (!editRateLimit.attempt()) {
      alert(`Rate limit reached. Please wait ${editRateLimit.getFormattedTime()} before editing again.`);
      return;
    }

    setSheetUrl(safeGoogleSheet.url || "");
    setIsEditingSheet(true);
    setSheetUrlError(null);
  };

  const handleCancelEdit = () => {
    setSheetUrl("");
    setIsEditingSheet(false);
    setSheetUrlError(null);
  };

  const handleRemoveGoogleSheet = () => {
    if (disconnectRateLimit.isRateLimited) {
      alert(`Please wait ${disconnectRateLimit.getFormattedTime()} before disconnecting again.`);
      return;
    }
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = () => {
    if (!disconnectRateLimit.attempt()) {
      alert(`Rate limit reached. Please wait ${disconnectRateLimit.getFormattedTime()}.`);
      setShowDisconnectModal(false);
      return;
    }

    clearGoogleSheet();
    // useSyncTracker.getState().reset();
    setSheetUrl("");
    setIsEditingSheet(false);
    setSheetUrlError(null);
    setShowDisconnectModal(false);
  };

  // ---------------------------------------------------------------------------
  // RECOVERY HANDLERS
  // ---------------------------------------------------------------------------

  const handleRestoreSettings = async () => {
    if (!pendingSheetUrl || !pendingAccessToken) return;

    const spreadsheetId = getSpreadsheetIdFromUrl(pendingSheetUrl);
    if (!spreadsheetId) return;

    const success = await loadSettingsFromSheet(spreadsheetId, pendingAccessToken, pendingSheetName || undefined );

    if (success) {
      // Also restore saved filters from the sheet
      await savedFiltersLoadFromSheet(spreadsheetId, pendingAccessToken);

      // Mark restore as a successful sync so the status badge shows "Synced just now"
      useSyncState.getState().completeSync(true);

      // Settings restored - now offer to import entries
      setPendingImportAccessToken(pendingAccessToken);
      setShowImportEntriesModal(true);
    } else {
      alert("Failed to restore settings. Starting fresh.");
      setGoogleSheet(pendingSheetUrl, pendingSheetName || undefined);
    }

    setShowRecoveryPrompt(false);
    setPendingSheetUrl(null);
    setPendingSheetName(null);
    setPendingAccessToken(null);
    setSheetUrl("");
    setIsEditingSheet(false);
  };

  const handleStartFresh = async () => {
    if (pendingSheetUrl && pendingAccessToken) {
      setGoogleSheet(pendingSheetUrl, pendingSheetName || undefined);
      const success = await saveSettingsToSheet(pendingAccessToken);
      if (success) {
        alert("Sheet connected and settings saved!");
      }
    }

    setShowRecoveryPrompt(false);
    setPendingSheetUrl(null);
    setPendingSheetName(null);
    setPendingAccessToken(null);
    setSheetUrl("");
    setIsEditingSheet(false);
  };

  // ---------------------------------------------------------------------------
  // IMPORT ENTRIES HANDLERS
  // ---------------------------------------------------------------------------

  const handleImportEntries = async () => {
    if (!pendingImportAccessToken) {
      return { 
        success: false, 
        imported: 0, 
        skipped: 0, 
        total: 0,
        error: 'No access token available' 
      };
    }
    
    return await importEntriesFromSheet(pendingImportAccessToken);
  };

  const handleImportSkip = () => {
    setShowImportEntriesModal(false);
    setPendingImportAccessToken(null);
    alert("Settings restored! You can import entries later from the History page.");
  };

  const handleImportComplete = () => {
    setShowImportEntriesModal(false);
    setPendingImportAccessToken(null);
    router.push("/settings");
  };
  const handleHistoryView = () => {
    setShowImportEntriesModal(false);
    setPendingImportAccessToken(null);
    router.push("/dashboard/history");
  };

  // ---------------------------------------------------------------------------
  // NAVIGATION HANDLERS
  // ---------------------------------------------------------------------------

  const handleContinueToTutorial = () => {
    // Validate and block navigation if invalid
    if (!settingsValidation.isValid) {
      setShowValidationErrors(true);
      return;
    }

    setShowValidationErrors(false);
    // Settings are auto-saved to localStorage, so just navigate directly
    completeSetup();
    router.push("/tutorial");
  };

  const handleSkipTutorial = () => {
    // Validate and block navigation if invalid
    if (!settingsValidation.isValid) {
      setShowValidationErrors(true);
      return;
    }

    setShowValidationErrors(false);
    // Settings are auto-saved to localStorage, so just navigate directly
    completeSetup();
    useSettings.getState().completeTutorial();
    router.push("/entry");
  };

  const handleSaveAndContinue = () => {
    setShowSavePrompt(false);
    saveLoginThenNavigate();
  };

  const handleContinueWithoutSaving = () => {
    const destination = pendingNavigation;
    setShowSavePrompt(false);
    setPendingNavigation(null);
    completeSetup();
    if (destination === "entry") {
      // User is skipping tutorial, mark it complete
      useSettings.getState().completeTutorial();
    }
    // Clear entries-only state if user chose not to save/sync
    if (hasEntriesOnlySheet) {
      setHasEntriesOnlySheet(false);
      setPendingEntriesOnlySheetUrl(null);
      setPendingEntriesOnlySheetName(null);
    }
    router.push(destination === "tutorial" ? "/tutorial" : "/entry");
  };

  // ---------------------------------------------------------------------------
  // LOCAL SAVE CONTINUE HANDLER (for anonymous users post-tutorial)
  // ---------------------------------------------------------------------------
  
  const handleLocalContinue = () => {
    if (!settingsValidation.isValid) {
      setShowValidationErrors(true);
      return;
    }
    setShowValidationErrors(false);
    // Show success modal directly with two button options
    setSuccessModalConfig({
      title: "Settings Saved!",
      description: "Your data is saved locally on this device.",
      secondaryText: "",
    });
    setNavigateAfterSuccess("/dashboard");
    setShowSuccessModal(true);
  };

  // ---------------------------------------------------------------------------
  // SYMPTOM HANDLERS
  // ---------------------------------------------------------------------------

  const handleAddSymptom = () => {
    if (newSymptom.trim() && canAddMoreCustomSymptoms) {
      addCustomSymptom(newSymptom);
      setNewSymptom("");
    }
  };

  const handleAddPeriodSymptom = () => {
    if (newPeriodSymptom.trim() && canAddMorePeriodSymptoms) {
      addCustomPeriodSymptom(newPeriodSymptom);
      setNewPeriodSymptom("");
    }
  };


  // Toggle all period symptoms on/off
  const handleToggleAllPeriodSymptoms = (selectAll: boolean) => {
    if (selectAll) {
      const allSymptoms = [...new Set([...safePeriodTracking.periodSymptoms, ...periodSelectableSymptoms])];
      setPeriodTracking({ periodSymptoms: allSymptoms });
    } else {
      setPeriodTracking({ periodSymptoms: [...safePeriodTracking.customPeriodSymptoms] });
    }
  };

  // ---------------------------------------------------------------------------
  // MASTER TOGGLE HANDLERS
  // ---------------------------------------------------------------------------

    const handleToggleAllOptionalFeatures = (enabled: boolean) => {
    // Toggle symptoms section and intensity
    useSettings.setState((state) => ({
      symptoms: {
        ...state.symptoms,
        enabled,
        selected: enabled ? state.symptoms.selected : [],
        intensityTracking: {
          ...state.symptoms.intensityTracking,
          enabled, // Quick Setup turns on/off intensity too
        },
      },
      hasUnsavedChanges: true,
    }));
    
    setStoolTracking({ enabled });
    setPeriodTracking({
      enabled,
      trackFlow: enabled, // Quick Setup turns on/off flow too
      productTracking: {
        ...safePeriodTracking.productTracking,
        enabled, // Quick Setup turns on/off product usage too
        selectedProducts: safePeriodTracking.productTracking?.selectedProducts ?? [],
        customProducts: safePeriodTracking.productTracking?.customProducts ?? {},
      },
    });
    setMedicineTracking({ ...safeMedicineTracking, enabled });
  };

  
  // Toggle all default symptoms on/off
  const handleToggleAllDefaultSymptoms = (selectAll: boolean) => {
    const currentCustom = symptoms?.custom ?? [];
    const currentSelected = symptoms?.selected ?? [];
    
    if (selectAll) {
      // Select all defaults + keep any custom that were selected
      const customThatWereSelected = currentSelected.filter(s => currentCustom.includes(s));
      const newSelected = [...new Set([...DEFAULT_SYMPTOMS, ...customThatWereSelected])];
      
      // Use the store's internal method to set all at once
      useSettings.setState((state) => ({
        symptoms: {
          ...state.symptoms,
          selected: newSelected,
        },
        hasUnsavedChanges: true,
      }));
    } else {
      // Deselect all defaults, keep custom symptoms selected
      const customThatWereSelected = currentSelected.filter(s => currentCustom.includes(s));
      
      useSettings.setState((state) => ({
        symptoms: {
          ...state.symptoms,
          selected: customThatWereSelected,
        },
        hasUnsavedChanges: true,
      }));
    }
  };

    // Toggle all custom general symptoms on/off
  const handleToggleAllCustomSymptoms = (selectAll: boolean) => {
    const currentSelected = symptoms?.selected ?? [];
    const customSymptoms = symptoms?.custom ?? [];
    
    if (selectAll) {
      // Add all custom symptoms to selected
      const newSelected = [...new Set([...currentSelected, ...customSymptoms])];
      useSettings.setState((state) => ({
        symptoms: {
          ...state.symptoms,
          selected: newSelected,
        },
        hasUnsavedChanges: true,
      }));
    } else {
      // Remove all custom symptoms from selected (keep defaults)
      const newSelected = currentSelected.filter(s => !customSymptoms.includes(s));
      useSettings.setState((state) => ({
        symptoms: {
          ...state.symptoms,
          selected: newSelected,
        },
        hasUnsavedChanges: true,
      }));
    }
  };

  // Toggle all custom period symptoms on/off
  const handleToggleAllCustomPeriodSymptoms = (selectAll: boolean) => {
    const currentPeriodSymptoms = safePeriodTracking.periodSymptoms ?? [];
    const customPeriodSymptoms = safePeriodTracking.customPeriodSymptoms ?? [];
    
    if (selectAll) {
      // Add all custom period symptoms to periodSymptoms
      const newPeriodSymptoms = [...new Set([...currentPeriodSymptoms, ...customPeriodSymptoms])];
      setPeriodTracking({ periodSymptoms: newPeriodSymptoms });
    } else {
      // Remove all custom period symptoms from periodSymptoms
      const newPeriodSymptoms = currentPeriodSymptoms.filter(s => !customPeriodSymptoms.includes(s));
      setPeriodTracking({ periodSymptoms: newPeriodSymptoms });
    }
  };

  // ---------------------------------------------------------------------------
  // MEDICINE HANDLERS
  // ---------------------------------------------------------------------------

  const addMedicine = (medicine: Medicine) => {
  if (safeMedicineTracking.medicines.length >= MAX_MEDICINES) return;

  // Check if this is an update to an existing medicine (same ID means merge)
  const existingIndex = safeMedicineTracking.medicines.findIndex((m) => m.id === medicine.id);

  if (existingIndex >= 0) {
    // Update existing medicine (merge categories)
    setMedicineTracking({
      ...safeMedicineTracking,
      medicines: safeMedicineTracking.medicines.map((m) =>
        m.id === medicine.id ? medicine : m
      ),
    });
  } else {
    // Add as new medicine
    setMedicineTracking({
      ...safeMedicineTracking,
      medicines: [...safeMedicineTracking.medicines, medicine],
    });
  }
};

  const removeMedicine = (id: string) => {
    setMedicineTracking({
      ...safeMedicineTracking,
      medicines: safeMedicineTracking.medicines.filter((m) => m.id !== id),
    });
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    setMedicineTracking({
      ...safeMedicineTracking,
      medicines: safeMedicineTracking.medicines.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Modals */}
      {showRecoveryPrompt && (
        <RecoveryPromptModal
          onRestore={handleRestoreSettings}
          onStartFresh={handleStartFresh}
          onCancel={() => {
            setShowRecoveryPrompt(false);
            setPendingSheetUrl(null);
            setPendingSheetName(null);
            setPendingAccessToken(null);
          }}
          sheetName={pendingSheetName}
        />
      )}

      {showSavePrompt && pendingNavigation && (
        <SavePromptModal
          onSave={handleSaveAndContinue}
          onContinueWithoutSaving={handleContinueWithoutSaving}
          onCancel={() => {
            setShowSavePrompt(false);
            setPendingNavigation(null);
          }}
          isGoogleSheetConnected={isGoogleSheetConnected}
          destination={pendingNavigation}
        />
      )}

      {showImportEntriesModal && pendingImportAccessToken && (
        <ImportEntriesModal
          onImport={handleImportEntries}
          onSkip={handleImportSkip}
          onClose={handleImportComplete}
          onHistoryView={handleHistoryView}
        />
      )}

      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-app-charcoal">
            {setupComplete ? "Settings" : "Let's Set Up Your Preferences"}
          </h1>
          <p className="text-app-gray">
            {setupComplete
              ? "Customize your Cadence experience"
              : "Configure how you want to keep a log of your health"}
          </p>
        </div>

        {/* Welcome Banner */}
        {!setupComplete && (
          <div className="p-4 bg-app-green/10 border border-app-green/20 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👋</span>
              <div>
                <p className="font-medium text-app-charcoal">Welcome to Cadence!</p>
                <p className="text-sm text-app-gray mt-1">
                  Take a moment to customize your preferences below. You can always change
                  these settings later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mode Indicator - Larger for returning users, compact for new users */}
        {setupComplete ? (
          <div className={`p-4 rounded-lg border-2 ${
            isGoogleSheetConnected 
              ? "bg-app-green/5 border-app-green/30" 
              : "bg-app-gray/5 border-app-gray/30"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isGoogleSheetConnected ? "bg-app-green" : "bg-app-gray"
              }`}>
                {isGoogleSheetConnected ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-semibold text-lg ${
                  isGoogleSheetConnected ? "text-app-green" : "text-app-gray"
                }`}>
                  {isGoogleSheetConnected ? "Signed In & Synced Mode" : "Anonymous Mode"}
                </p>
                <p className="text-sm text-app-gray">
                  {isGoogleSheetConnected
                    ? "Data syncs to your Google Sheet"
                    : "Data stored locally on this device only"}
                </p>
              </div>
            </div>
            {!isGoogleSheetConnected && (
              <p className="text-xs text-app-gray mt-3 pl-13">
                Want to backup your data? Connect a Google Sheet in the section below.
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 bg-app-cream rounded-lg border border-app-border">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isGoogleSheetConnected ? "bg-app-teal" : "bg-app-gray"}`} />
              <span className="text-sm font-medium text-app-charcoal">
                {isGoogleSheetConnected ? "Signed In Mode" : "Anonymous Mode"}
              </span>
              <span className="text-xs text-app-gray">
                {isGoogleSheetConnected
                  ? "—> Data syncs to your Google Sheet"
                  : "—> Data stored locally on this device only"}
              </span>
            </div>
          </div>
        )}

        {/* Google Sheet Integration */}
        <section
          id="google-sheet-integration"
          className={`card border-2 transition-colors ${
          onboardingMode === "google-sheet" && !setupComplete
            ? "border-app-green bg-app-green/5"
            : "border-app-teal/50 bg-app-teal/5"
        }`}>
          {/* Collapsible header for Anonymous mode during onboarding */}
          {onboardingMode === "anonymous" && !setupComplete && !isGoogleSheetConnected ? (
            <button
              onClick={() => setIsGoogleSheetExpanded(!isGoogleSheetExpanded)}
              className="w-full flex justify-between items-center"
            >
              <div>
                <h2 className="text-lg font-semibold text-app-charcoal text-left">
                  📊 Google Sheet Integration
                </h2>
                <p className="text-sm text-app-gray text-left">
                  Optional: Connect later to backup and sync your data
                </p>
              </div>
              <span className="text-app-gray text-xl ml-4">
                {isGoogleSheetExpanded ? "−" : "+"}
              </span>
            </button>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-app-charcoal mb-1">
                📊 Google Sheet Integration
              </h2>
              <p className="text-sm text-app-gray mb-4">
                {onboardingMode === "google-sheet" && !setupComplete
                  ? "🔗 Connect your Google Sheet to get started with Signed In & Synced Mode"
                  : "Link a sheet to sync your data across devices (Signed In Mode)"}
              </p>
            </>
          )}

          {/* Content - conditionally rendered based on collapsed state */}
          {(isGoogleSheetExpanded || setupComplete || onboardingMode !== "anonymous") && (
            <div className={onboardingMode === "anonymous" && !setupComplete && !isGoogleSheetConnected ? "mt-4" : ""}>
              {safeGoogleSheet.url && !isEditingSheet ? (
                // Connected state - show sheet info
                <div>
                  <div className="p-4 bg-app-cream rounded-lg border border-app-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {safeGoogleSheet.name && (
                          <p className="font-medium text-app-charcoal mb-1 truncate">
                            {safeGoogleSheet.name}
                          </p>
                        )}
                        <a
                          href={safeGoogleSheet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-app-green hover:text-app-green-dark font-medium transition-colors"
                        >
                          View your Google Sheet
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 17L17 7M17 7H7M17 7V17"
                            />
                          </svg>
                        </a>
                      </div>
                      <span className="w-2 h-2 bg-app-teal rounded-full flex-shrink-0 mt-1" title="Connected" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 items-center">
                    <button
                      type="button"
                      onClick={handleEditGoogleSheet}
                      disabled={editRateLimit.isRateLimited}
                      className="px-4 py-2 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveGoogleSheet}
                      disabled={syncInProgress || disconnectRateLimit.isRateLimited}
                      title={syncInProgress ? "Cannot disconnect during sync" : "Disconnect from Google Sheet"}
                      className="px-4 py-2 rounded-lg bg-app-red/10 text-app-red border border-app-red/20 hover:bg-app-red/20 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Sync status badge */}
                  <div className="mt-4">
                    <SyncStatusBadge />
                  </div>

                  {/* Auto-sync info banner for returning users */}
                  {setupComplete && (
                    <div className="mt-4 p-3 bg-app-green/10 border border-app-green/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">✓</span>
                        <div>
                          <p className="text-sm font-medium text-app-charcoal">
                            Google Sheet Connected!
                          </p>
                          <p className="text-xs text-app-gray mt-1 flex items-center gap-1 flex-wrap">
                            Changes are saved to your Google Sheet only when you click a "
                            <span className="inline-flex items-center gap-1 font-medium text-app-gray">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              Sync with Google Sheets"
                            </span>
                            button.
                          </p>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* Entries-only mode banner for onboarding users */}
                  {!setupComplete && hasEntriesOnlySheet && (
                    <div className="mt-4 p-3 bg-app-teal/10 border border-app-teal/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">📥</span>
                        <div>
                          <p className="text-sm font-medium text-app-charcoal">
                            Existing Entries Detected
                          </p>
                          <p className="text-xs text-app-gray mt-1">
                            Your entries will be imported when you click a "Sync with Google Sheets" button.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Not connected or editing - show form
                <div className="space-y-4">
                  <div>
                    <SecureSheetURLInput
                      value={sheetUrl}
                      onChange={(value) => {
                        setSheetUrl(value);
                        setSheetUrlError(null);
                      }}
                      label="Google Sheet URL"
                      placeholder="Paste your URL here, e.g.: https://docs.google.com/spreadsheets/d/..."
                      required={true}
                      errorMessage={sheetUrlError || undefined}
                      onValidationChange={(isValid) => setSheetUrlInputError(!isValid)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveGoogleSheet}
                      disabled={sheetUrlInputError || sheetUrl.length > 150}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEditingSheet ? "Update Sheet URL" : "📊 Connect a Google Sheet"}
                    </button>
                    {isEditingSheet && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="p-3 bg-app-cream rounded-lg border border-app-border">
                    <p className="text-xs text-app-gray">
                      💡 <strong>Tip:</strong> After connecting, click any &quot;🔄 Sync with Google Sheets&quot; button
                      to sign in with your Google account and sync your data.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Time Format */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🕐 Time Format</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTimeFormat("12h")}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                timeFormat === "12h"
                  ? "bg-app-green text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green hover:bg-app-green/10"
              }`}
            >
              12-hour (AM/PM)
            </button>
            <button
              type="button"
              onClick={() => setTimeFormat("24h")}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                timeFormat === "24h"
                  ? "bg-app-green text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green hover:bg-app-green/10"
              }`}
            >
              24-hour
            </button>
          </div>
        </section>

        {/* Week Start Day */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">📅 Week Starts On</h2>
          <p className="text-sm text-app-gray mb-4">
            Choose which day your week begins. This affects weekly views and statistics.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWeekStartDay("sunday")}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                weekStartDay === "sunday"
                  ? "bg-app-green text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green hover:bg-app-green/10"
              }`}
            >
              Sunday
            </button>
            <button
              type="button"
              onClick={() => setWeekStartDay("monday")}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                weekStartDay === "monday"
                  ? "bg-app-green text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green hover:bg-app-green/10"
              }`}
            >
              Monday
            </button>
          </div>
        </section>
        
        {/* Master Toggle */}
        <section className="card border-2 border-app-green/30">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">⚡ Quick Setup</h2>
          <ToggleRow
            label="Enable All Optional Features Below"
            description="Turns on all sections below: General Symptoms, Bowel Movement, Cycle Log, and Medicine Log"
            checked={allOptionalFeaturesEnabled}
            onChange={handleToggleAllOptionalFeatures}
            activeColor="bg-app-green"
          />
        </section>

        {/* General Symptoms */}
        <section className={`card transition-colors ${
          showValidationErrors && (symptoms?.enabled ?? false) && (symptoms?.selected?.length ?? 0) === 0
            ? "border-2 border-app-teal bg-app-teal/5"
            : "border-2 border-app-taupe/50"
        }`}>
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🏷️ General Symptoms</h2>
          <div className="space-y-4">
              <ToggleRow
              label="Enable Symptom Logging"
              description="Log symptoms you experience with each entry"
              checked={symptoms?.enabled ?? false}
              onChange={(enabled) => {
                useSettings.setState((state) => ({
                  symptoms: {
                    ...state.symptoms,
                    enabled,
                    // Clear selections and disable intensity when disabling
                    selected: enabled ? state.symptoms.selected : [],
                    intensityTracking: enabled 
                      ? state.symptoms.intensityTracking 
                      : { ...state.symptoms.intensityTracking, enabled: false },
                  },
                  hasUnsavedChanges: true,
                }));
              }}
              activeColor="bg-app-teal"
            />

            {(symptoms?.enabled ?? false) && (              
              <>
                {/* Symptom Selection */}
                <div className="pt-4 border-t border-app-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-app-charcoal">Symptoms to track</p>
                    {DEFAULT_SYMPTOMS.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleToggleAllDefaultSymptoms(!allDefaultSymptomsSelected)}
                        className="text-xs text-app-teal hover:text-app-teal/70 font-medium"
                      >
                        {allDefaultSymptomsSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  <p className={`text-sm mb-3 ${
                    showValidationErrors && (symptoms?.selected?.length ?? 0) === 0
                      ? "text-app-red font-medium"
                      : "text-app-gray"
                  }`}>
                    Select or add at least one symptom to log with your entries *
                    {showValidationErrors && (symptoms?.selected?.length ?? 0) === 0}
                  </p>

                  {/* Default symptoms */}
                  <div className="mb-4">
                    <p className="text-sm text-app-gray mb-2">Default symptoms:</p>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_SYMPTOMS.map((symptom) => (
                        <SymptomChip
                          key={symptom}
                          label={symptom}
                          selected={symptoms?.selected?.includes(symptom) ?? false}
                          onToggle={() => toggleSymptom(symptom)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Custom symptoms */}
                  {(symptoms?.custom?.length ?? 0) > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-app-gray">
                          Your custom symptoms ({symptoms.custom.length}/{MAX_CUSTOM_SYMPTOMS}):
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleAllCustomSymptoms(!allCustomSymptomsSelected)}
                          className="text-xs text-app-teal hover:text-app-teal/70 font-medium"
                        >
                          {allCustomSymptomsSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {symptoms.custom.map((symptom) => (
                          <SymptomChip
                            key={symptom}
                            label={symptom}
                            selected={symptoms.selected.includes(symptom)}
                            onToggle={() => toggleSymptom(symptom)}
                            onRemove={() => removeCustomSymptom(symptom)}
                            removable
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add custom symptom */}
                  {canAddMoreCustomSymptoms ? (
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <SecureTextInput
                          value={newSymptom}
                          onChange={(value) => {
                            setNewSymptom(value);
                            setNewSymptomHasFormulaInjection(containsFormulaInjection(value));
                          }}
                          placeholder="Add custom symptom"
                          showCharCount={true}
                          className="w-full"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newSymptom.trim() && newSymptom.length <= 60 && !containsFormulaInjection(newSymptom)) {
                              e.preventDefault();
                              handleAddSymptom();
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSymptom}
                        disabled={!newSymptom.trim() || newSymptom.length > 60 || containsFormulaInjection(newSymptom)}
                        className="px-6 py-2 rounded-lg bg-app-teal text-app-cream font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + Add
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-app-gray italic">
                      Maximum of {MAX_CUSTOM_SYMPTOMS} custom symptoms reached
                    </p>
                  )}
                </div>

                {/* Symptom Intensity */}
                <div className="pt-4 border-t border-app-border">
                  <ToggleRow
                    label="Symptom Intensity"
                    description="Choose a scale to record how severe each symptom feels"
                    checked={intensityTracking.enabled}
                    onChange={(enabled) => setIntensityTracking({ enabled })}
                    activeColor="bg-app-teal"
                  />
                  {intensityTracking.enabled && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-app-charcoal mb-3">Choose your preferred intensity scale:</p>
                      <div className="space-y-3">
                        <PainScaleOption
                          type="simple"
                          selected={intensityTracking.scaleType === "simple"}
                          onSelect={() => setIntensityTracking({ scaleType: "simple" })}
                          activeColor="app-teal"
                        />
                        <PainScaleOption
                          type="mankoski"
                          selected={intensityTracking.scaleType === "mankoski"}
                          onSelect={() => setIntensityTracking({ scaleType: "mankoski" })}
                          activeColor="app-teal"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Bowel Movement */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🧻 Bowel Movement</h2>
          <ToggleRow
            label="Enable Bowel Movement Logging"
            description="Log bowel movements using the Bristol Stool Scale"
            checked={safeStoolTracking.enabled}
            onChange={(enabled) => setStoolTracking({ enabled })}
            activeColor="bg-app-green-dark"
          />
        </section>

        {/* Period Tracking */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🌸 Cycle Log</h2>
          <div className="space-y-4">
              <ToggleRow
              label="Enable Period & Cycle Logging"
              description="Log your menstrual period or cycle"
              checked={safePeriodTracking.enabled}
              onChange={(enabled) => {
                if (enabled) {
                  setPeriodTracking({ enabled });
                } else {
                  // Disable all sub-sections when main toggle is turned off
                  setPeriodTracking({
                    enabled: false,
                    trackFlow: false,
                    productTracking: {
                      ...safePeriodTracking.productTracking,
                      enabled: false,
                      selectedProducts: safePeriodTracking.productTracking?.selectedProducts ?? [],
                      customProducts: safePeriodTracking.productTracking?.customProducts ?? {},
                    },
                  });
                }
              }}
              activeColor="bg-app-red"
            />

            {safePeriodTracking.enabled && (
              <>
                {/* Period Symptoms */}
                <div className="pt-4 border-t border-app-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-app-charcoal">Period and cycle-related symptoms</p>
                    {periodSelectableSymptoms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleToggleAllPeriodSymptoms(!allPeriodSymptomsSelected)}
                        className="text-xs text-app-red hover:text-app-red/70 font-medium"
                      >
                        {allPeriodSymptomsSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-app-gray mb-3">
                    Select or add symptoms typically related to your period or cycle
                  </p>

                  {periodSelectableSymptoms.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {periodSelectableSymptoms.map((symptom) => (
                        <button
                          key={`period-${symptom}`}
                          type="button"
                          onClick={() => togglePeriodSymptom(symptom)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            safePeriodTracking.periodSymptoms?.includes(symptom)
                              ? "bg-app-red text-white hover:opacity-70"
                              : "bg-app-red/15 text-app-gray/50 hover:bg-app-red hover:opacity-50 hover:text-white"
                          }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                  )}

                  {(safePeriodTracking.customPeriodSymptoms?.length ?? 0) > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-app-gray">
                          Your custom period or cycle symptoms ({safePeriodTracking.customPeriodSymptoms.length}/{MAX_CUSTOM_PERIOD_SYMPTOMS}):
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleAllCustomPeriodSymptoms(!allCustomPeriodSymptomsSelected)}
                          className="text-xs text-app-red hover:text-app-red/70 font-medium"
                        >
                          {allCustomPeriodSymptomsSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {safePeriodTracking.customPeriodSymptoms.map((symptom) => {
                          const isSelected = safePeriodTracking.periodSymptoms?.includes(symptom) ?? false;
                          
                          return (
                            <button
                              key={`custom-period-${symptom}`}
                              type="button"
                              onClick={() => togglePeriodSymptom(symptom)}
                              className={`group inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                isSelected
                                  ? "bg-app-red text-white hover:bg-app-red/80"
                                  : "bg-app-red/15 text-app-gray/50 hover:bg-app-red/30"
                              }`}
                            >
                              {symptom}
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCustomPeriodSymptom(symptom);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    removeCustomPeriodSymptom(symptom);
                                  }
                                }}
                                className={`ml-1 hover:scale-110 transition-transform ${
                                  isSelected 
                                    ? "text-white/70 hover:text-white" 
                                    : "text-app-gray/40 hover:text-app-gray"
                                }`}
                                title={`Remove "${symptom}"`}
                              >
                                ×
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {canAddMorePeriodSymptoms ? (
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <SecureTextInput
                          value={newPeriodSymptom}
                          onChange={(value) => {
                            setNewPeriodSymptom(value);
                            setNewPeriodSymptomHasFormulaInjection(containsFormulaInjection(value));
                          }}
                          placeholder="Add custom period or cycle symptom"
                          showCharCount={true}
                          className="w-full"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newPeriodSymptom.trim() && newPeriodSymptom.length <= 60 && !containsFormulaInjection(newPeriodSymptom)) {
                              e.preventDefault();
                              handleAddPeriodSymptom();
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={handleAddPeriodSymptom}
                        disabled={!newPeriodSymptom.trim() || newPeriodSymptom.length > 60 || containsFormulaInjection(newPeriodSymptom)}
                        className="px-6 py-2 rounded-lg bg-app-red text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + Add
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-app-gray italic">Maximum reached</p>
                  )}
                </div>

                {/* Track Flow */}
                <div className="pt-4 border-t border-app-border">
                  <ToggleRow
                    label="Flow Log"
                    description="Log flow during period"
                    checked={safePeriodTracking.trackFlow ?? false}
                    onChange={(trackFlow) => setPeriodTracking({ trackFlow })}
                    activeColor="bg-app-red"
                  />
                </div>

                {/* Product Usage */}
                <div className={`pt-4 border-t border-app-border transition-colors ${
                  showValidationErrors && !productTrackingValid
                    ? "bg-app-red/10 border-2 border-app-red rounded-lg p-4 -mx-4 mt-4"
                    : ""
                }`}>
                  <ToggleRow
                    label="Product Usage"
                    description="Log which period products you use"
                    checked={safePeriodTracking.productTracking?.enabled ?? false}
                    onChange={(enabled) =>
                      setPeriodTracking({
                        productTracking: {
                          ...safePeriodTracking.productTracking,
                          enabled,
                          selectedProducts: safePeriodTracking.productTracking?.selectedProducts ?? [],
                          customProducts: safePeriodTracking.productTracking?.customProducts ?? {},
                        },
                      })
                    }
                    activeColor="bg-app-red"
                  />

                  {safePeriodTracking.productTracking?.enabled && (
                    <div className="mt-4 space-y-6">
                      <div>
                        <p className={`text-sm mb-3 ${
                          showValidationErrors && !productTrackingValid
                            ? "text-app-red font-medium"
                            : "text-app-gray"
                        }`}>
                          Select at least one product you use *
                          {showValidationErrors && !productTrackingValid}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PRODUCT_OPTIONS.map((product) => {
                            const isSelected =
                              safePeriodTracking.productTracking?.selectedProducts?.includes(product.type) ?? false;
                            return (
                              <button
                                key={product.type}
                                type="button"
                                onClick={() => {
                                  const current = safePeriodTracking.productTracking?.selectedProducts ?? [];
                                  const productType = product.type as string;
                                  const updated = isSelected
                                    ? current.filter((p) => p !== productType)
                                    : [...current, productType];
                                  setPeriodTracking({
                                    productTracking: {
                                      ...safePeriodTracking.productTracking,
                                      enabled: true,
                                      selectedProducts: updated,
                                      customProducts: safePeriodTracking.productTracking?.customProducts ?? {},
                                    },
                                  });
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                  isSelected
                                    ? "bg-app-red text-white hover:opacity-70"
                                    : "bg-app-red/15 text-app-gray/50 hover:bg-app-red hover:opacity-50 hover:text-white"
                                }`}
                              >
                                {product.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {PRODUCT_OPTIONS.filter(
                        (p) =>
                          p.allowCustomProducts &&
                          safePeriodTracking.productTracking?.selectedProducts?.includes(p.type)
                      ).map((product) => (
                        <CustomProductSection
                          key={product.type}
                          product={product}
                          customProducts={safePeriodTracking.productTracking?.customProducts?.[product.type] ?? []}
                          hasError={showValidationErrors && productsMissingCustomItems.includes(product.label)}
                          onValidationChange={(isValid) => {
                            setCustomProductInputErrors(prev => ({
                              ...prev,
                              [product.type]: !isValid
                            }));
                          }}
                          onFormulaInjectionChange={(hasInjection) => {
                            setCustomProductFormulaInjection(prev => ({
                              ...prev,
                              [product.type]: hasInjection
                            }));
                          }}
                          onUpdate={(updated) => {
                            setPeriodTracking({
                              productTracking: {
                                ...safePeriodTracking.productTracking,
                                enabled: true,
                                selectedProducts: safePeriodTracking.productTracking?.selectedProducts ?? [],
                                customProducts: {
                                  ...safePeriodTracking.productTracking?.customProducts,
                                  [product.type]: updated,
                                },
                              },
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Medicine Tracking */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">💊 Medicine Log</h2>
          <div className="space-y-4">
            <ToggleRow
              label="Enable Medicine Logging"
              description="Log medications related to your health"
              checked={safeMedicineTracking.enabled}
              onChange={(enabled) => setMedicineTracking({ ...safeMedicineTracking, enabled })}
              activeColor="bg-app-green/60"
            />

            {safeMedicineTracking.enabled && (
              <div className={`transition-colors rounded-lg ${
                showValidationErrors && !medicineTrackingValid 
                  ? "bg-app-green/10 border-2 border-app-green p-4 -mx-4" 
                  : ""
              }`}>

                {safeMedicineTracking.medicines.length > 0 && (
                  <div className="pt-4 border-t border-app-border">
                    <p className="text-sm font-medium text-app-charcoal mb-3">
                      Your Medicines ({safeMedicineTracking.medicines.length}/{MAX_MEDICINES}):
                    </p>
                    <div className="space-y-2">
                      {safeMedicineTracking.medicines.map((medicine) => (
                        <MedicineItem
                          key={medicine.id}
                          medicine={medicine}
                          onRemove={() => removeMedicine(medicine.id)}
                          onUpdate={(updated) => updateMedicine(medicine.id, updated)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-app-border">
                  <p className="text-sm font-medium text-app-charcoal mb-3">Add New Medicine:</p>
                  <AddMedicineForm
                    onAdd={addMedicine}
                    availableCategories={availableMedicineCategories}
                    currentMedicineCount={safeMedicineTracking.medicines.length}
                    maxMedicines={MAX_MEDICINES}
                    existingMedicines={safeMedicineTracking.medicines}
                    showValidationError={showValidationErrors && !medicineTrackingValid}
                    onNameValidationChange={(isValid) => setMedicineNameInputError(!isValid)}
                    onDosageValidationChange={(isValid) => setDosageInputError(!isValid)}
                    onNameFormulaInjectionChange={(hasInjection) => setMedicineNameHasFormulaInjection(hasInjection)}
                    onDosageFormulaInjectionChange={(hasInjection) => setDosageHasFormulaInjection(hasInjection)}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Continue Button - Anonymous users who completed setup AND tutorial */}
        {!isGoogleSheetConnected && setupComplete && tutorialComplete && (
          <section className="card border-2 border-app-green/50 bg-app-green/5">
            <h2 className="text-lg font-semibold text-app-charcoal mb-2">💾 Save & Continue</h2>
            <p className="text-sm text-app-gray mb-4">
              Your settings are saved automatically to this device.
            </p>
            
            {showValidationErrors && !settingsValidation.isValid && (
              <div className="p-3 mb-4 bg-app-red/10 rounded-lg border border-app-red/30">
                <p className="text-sm text-app-red font-medium">
                  ⚠️ {settingsValidation.validationMessage}
                </p>
              </div>
            )}

            {/* Text input security warning */}
            {hasTextInputError && (
              <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  ⚠️ Please fix the highlighted fields before saving.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleLocalContinue}
              disabled={!hasUnsavedChanges || hasTextInputError}
              className="w-full py-3 px-6 rounded-lg bg-app-green text-white font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasTextInputError ? "Fix Input Errors to Continue" : !hasUnsavedChanges ? "No Changes to Save" : "Continue"}
            </button>
          </section>
        )}

        {/* Sync with Google Sheets */}
        {setupComplete && (
          <section className="card border-2 border-app-teal/30 bg-app-teal/5">
            {isGoogleSheetConnected ? (
              <>
                <h2 className="text-lg font-semibold text-app-charcoal mb-2">🔄 Sync with Google Sheet</h2>
                <p className="text-sm text-app-gray mb-4">
                  Push changes and pull data from your Google Sheet.
                </p>
                <SyncWithGoogleSheetsButton
                  variant="primary"
                  showStatus
                  disabled={hasTextInputError}
                  disabledMessage="Please fix the highlighted input fields before syncing."
                />
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-app-charcoal mb-2">
                  📊 Want to backup your data?{" "}
                  <a
                    href="#google-sheet-integration"
                    className="text-app-teal hover:text-app-teal/80 underline"
                  >
                    Connect to Google Sheets
                  </a>
                </h2>
                <p className="text-sm text-app-gray mb-4">
                  Link a Google Sheet to sync your data across devices.
                </p>
              </>
            )}
          </section>
        )}

        {/* Reset - Advanced Options */}
        {setupComplete && (
          <section className="pt-6 border-t border-app-border">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm text-app-gray hover:text-app-charcoal">
                <span>Advanced Options</span>
                <svg
                  className="w-4 h-4 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 p-4 bg-app-cream rounded-lg space-y-4">

                {/* Option 1: Reset Settings (for all users) */}
                <div className="p-3 border border-app-border rounded-lg">
                  <p className="text-sm font-medium text-app-charcoal">Reset App Settings</p>
                  <p className="text-xs text-app-gray mt-1 mb-2">
                    Clears all settings, filters, and app preferences. <span className="font-medium text-app-charcoal">Your entry data remains safe</span>
                    {isGoogleSheetConnected
                      ? " in your connected Google Sheet."
                      : " in this device's browser storage."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowResetSettingsModal(true)}
                    className="px-4 py-2 rounded-lg text-sm text-app-gray border border-app-border hover:bg-app-border"
                  >
                    Reset App Settings Only
                  </button>
                </div>

                {/* Option 2: Delete All Data (local users only) */}
                {!isGoogleSheetConnected && (
                  <div className="p-3 border border-red-200 rounded-lg bg-red-50/50">
                    <p className="text-sm font-medium text-app-red">Delete All Data</p>
                    <p className="text-xs text-app-gray mt-1 mb-1">
                      <span className="font-semibold text-app-red">⚠️ Warning: This will permanently delete ALL your data</span>, including all your entries, settings, and saved filters. This action cannot be undone.
                    </p>
                    <p className="text-xs text-app-gray mb-3">
                      You will start fresh as a new user with no history.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteAllDataModal(true)}
                      className="px-4 py-2 rounded-lg text-sm text-white bg-app-red hover:bg-red-700"
                    >
                      Delete All Data
                    </button>
                  </div>
                )}

                {/* Google Sheets users: Reset all local data including entries cache */}
                {isGoogleSheetConnected && (
                  <div className="p-3 border border-app-border rounded-lg">
                    <p className="text-sm font-medium text-app-charcoal">Delete Metadata</p>
                    <p className="text-xs text-app-gray mt-1 mb-2">
                      Deletes all settings and saved from both this device AND your Google Sheet. <span className="font-medium text-app-charcoal">Your entry data remains safe in your Google Sheet.</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteMetadataModal(true)}
                      className="px-4 py-2 rounded-lg text-sm text-app-red border border-app-red/30 hover:bg-app-red/10"
                    >
                      Delete Device and Sheet Metadata
                    </button>
                  </div>
                )}

              </div>
            </details>
          </section>
        )}

        {/* Continue / Tutorial */}
        {!setupComplete && (
          <section className="card border-2 border-app-green bg-app-green/5">
            <h2 className="text-lg font-semibold text-app-charcoal mb-2">▶️ Ready to Start?</h2>

            {/* Context-aware description */}
            {isGoogleSheetConnected ? (
              <p className="text-sm text-app-gray mb-4">
                Your settings will be saved to your Google Sheet when you continue.
              </p>
            ) : (
              <p className="text-sm text-app-gray mb-4">
                Your preferences are saved automatically to this device.
              </p>
            )}

            {/* Validation warning */}
            {showValidationErrors && !settingsValidation.isValid && (
              <div className="p-3 mb-4 bg-app-red/10 rounded-lg border border-app-red/30">
                <p className="text-sm text-app-red font-medium">
                  ⚠️ {settingsValidation.validationMessage}
                </p>
              </div>
            )}

            {/* Text input character limit warning */}
            {hasTextInputError && (
              <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  ⚠️ Please fix the highlighted fields to continue.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleContinueToTutorial}
                disabled={hasTextInputError}
                className="flex-1 py-3 px-6 rounded-lg bg-app-green text-white font-semibold hover:bg-app-green-dark flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGoogleSheetConnected ? "Save & Continue to Tutorial" : "Continue to Tutorial"}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSkipTutorial}
                disabled={hasTextInputError}
                className="py-3 px-6 rounded-lg bg-app-cream text-app-charcoal font-medium border border-app-border hover:bg-app-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGoogleSheetConnected ? "Save & Skip Tutorial" : "Skip Tutorial"}
              </button>
            </div>
          </section>
        )}

      </div>
      {/* OAuth Error Modal */}
      <OAuthErrorModal
        isOpen={showOAuthError}
        onClose={() => {
          setShowOAuthError(false);
          setOauthRetryFn(null);
        }}
        onRetry={oauthRetryFn || undefined}
        actionDescription={oauthErrorAction}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (navigateAfterSuccess) {
            router.push(navigateAfterSuccess);
            setNavigateAfterSuccess(null);
          }
        }}
        title={successModalConfig.title}
        description={successModalConfig.description}
        secondaryText={successModalConfig.secondaryText}
        buttonText={navigateAfterSuccess ? "Go to Dashboard" : "Continue"}
        secondaryButtonText={navigateAfterSuccess ? "Stay in Settings" : undefined}
        onSecondaryClick={navigateAfterSuccess ? () => {
          setShowSuccessModal(false);
          setNavigateAfterSuccess(null);
        } : undefined}
        customButton={successModalConfig.showSyncButton ? (
          <SyncWithGoogleSheetsButton
            variant="primary"
            className="w-full [&>button]:w-full"
          />
        ) : undefined}
      />

      {/* Sync loading overlay — shown when syncing from the success modal */}
      {showSyncLoadingOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-app-charcoal/60 backdrop-blur-sm" />
          <div className="relative bg-app-white rounded-2xl shadow-xl p-8 max-w-sm mx-4">
            <div className="text-center">
              <AnimatedLogo size="md" className="mb-4" spinning />
              <h2 className="text-xl font-bold text-app-charcoal mb-2">
                Syncing Your Data
              </h2>
              <div className="text-sm text-app-gray space-y-1">
                {(() => {
                  const phase = currentPhase.phase;
                  const progress = currentPhase.progress;
                  const done = (label: string) => (
                    <p className="text-app-green">&#10003; {label}</p>
                  );
                  const active = (label: string) => (
                    <p className="text-app-charcoal font-medium">{label}</p>
                  );
                  const pending = (label: string) => (
                    <p className="text-app-gray/50">{label}</p>
                  );

                  const entriesLabel = progress.entriesTotal > 0
                    ? `Pushing entries (${progress.entriesSynced}/${progress.entriesTotal})`
                    : "Pushing entries...";

                  switch (phase) {
                    case 'verify':
                      return <p>Verifying connection...</p>;
                    case 'push-entries':
                      return <>{active(entriesLabel)}{pending("Pushing settings...")}{pending("Pushing filters...")}</>;
                    case 'push-settings':
                      return <>{done(`Entries pushed (${progress.entriesTotal})`)}{active("Pushing settings...")}{pending("Pushing filters...")}</>;
                    case 'push-filters':
                      return <>{done(`Entries pushed (${progress.entriesTotal})`)}{done("Settings pushed")}{active("Pushing filters...")}</>;
                    case 'pull-entries':
                    case 'pull-settings':
                    case 'pull-filters':
                    case 'finalize':
                      return <>{done(`Entries pushed (${progress.entriesTotal})`)}{done("Settings pushed")}{done("Filters pushed")}{active("Finalizing...")}</>;
                    default:
                      return <p>Starting sync...</p>;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset App Settings Modal */}
      <AdvancedOptionsModal
        isOpen={showResetSettingsModal}
        onClose={() => setShowResetSettingsModal(false)}
        onConfirm={() => {
          setShowResetSettingsModal(false);
          if (isGoogleSheetConnected) {
            // For Google Sheet users: delete settings/filters sheets, preserve connection
            resetSettingsPreserveConnection();
          } else {
            // For local users: just clear localStorage
            clearAllCadenceStorage(false); // Keep entries cache
            window.location.href = withBasePath("/settings"); // Full reload to reinitialize stores
          }
        }}
        title="Reset App Settings?"
        description={
          <p className="text-center">
            This will reset all settings, filters, and preferences to their defaults.
            {isGoogleSheetConnected && " Your Google Sheet connection will be retained."}
          </p>
        }
        affectedItems={[
          "All app settings and preferences",
          "Saved filters",
          isGoogleSheetConnected ? "Settings stored in Google Sheet (.cadence-settings, .cadence-savedfilters)" : null,
        ].filter(Boolean) as string[]}
        preservedItems={[
          isGoogleSheetConnected
            ? "All entry data in your Google Sheet"
            : "All entry data stored on this device",
          isGoogleSheetConnected ? "Google Sheet connection" : null,
        ].filter(Boolean) as string[]}
        confirmButtonText="Reset Settings"
        cancelButtonText="Cancel"
        variant="warning"
      />

      {/* Delete All Data Modal (Local Users) */}
      <DoubleConfirmModal
        isOpen={showDeleteAllDataModal}
        onClose={() => setShowDeleteAllDataModal(false)}
        onConfirm={() => {
          setShowDeleteAllDataModal(false);
          clearAllCadenceStorage(true); // Include entries
          window.location.href = withBasePath("/welcome"); // Redirect to welcome page
        }}
        firstModal={{
          title: "Delete All Data?",
          description: (
            <p className="text-center">
              This will <span className="font-semibold text-app-red">permanently delete</span> all your data from this device. This action cannot be undone.
            </p>
          ),
          affectedItems: [
            "All your health entries",
            "All app settings and preferences",
            "All saved filters",
          ],
          confirmButtonText: "Continue",
        }}
        secondModal={{
          title: "Final Confirmation",
          description: (
            <p>
              Are you absolutely sure? All your data will be permanently deleted and you will start fresh as a new user.
            </p>
          ),
          confirmButtonText: "Yes, Delete Everything",
        }}
      />

      {/* Delete Metadata Modal (Google Sheets Users) */}
      <DoubleConfirmModal
        isOpen={showDeleteMetadataModal}
        onClose={() => setShowDeleteMetadataModal(false)}
        onConfirm={() => {
          setShowDeleteMetadataModal(false);
          resetWithSheetDelete();
        }}
        firstModal={{
          title: "Delete Device & Sheet Metadata?",
          description: (
            <p className="text-center">
              This will delete all settings and saved filters from both this device and your Google Sheet.
            </p>
          ),
          affectedItems: [
            "All app settings and preferences (device & sheet)",
            "All saved filters (device & sheet)",
            "Google Sheet connection",
          ],
          preservedItems: [
            "All your health entries in Google Sheets",
          ],
          confirmButtonText: "Continue",
        }}
        secondModal={{
          title: "Final Confirmation",
          description: (
            <p>
              Are you sure? Your settings and filters will be permanently deleted from both this device and your Google Sheet. Your entry data will remain safe.
            </p>
          ),
          confirmButtonText: "Yes, Delete Metadata",
        }}
      />

      {/* Disconnect Google Sheet Modal */}
      <DoubleConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={confirmDisconnect}
        firstModal={{
          title: "Disconnect Google Sheet?",
          description: (
            <p className="text-center">
              Are you sure you want to disconnect from your Google Sheet? You will switch to <span className="font-semibold">Anonymous Mode</span>.
            </p>
          ),
          affectedItems: [
            "Google Sheet connection will be removed",
            "Future entries will only be saved locally",
          ],
          preservedItems: [
            "All your existing entries on this device",
            "All your data in your Google Sheet",
            "Your app settings and preferences",
          ],
          confirmButtonText: "Continue",
        }}
        secondModal={{
          title: "Confirm Disconnect",
          description: (
            <p>
              This will disconnect your Google Sheet. Your local data will remain, but new entries will no longer sync to Google Sheets.
            </p>
          ),
          confirmButtonText: "Yes, Disconnect",
        }}
      />
    </>
  );
}