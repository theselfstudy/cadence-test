"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { useSettings } from "@/stores/useSettings";
import { useSyncState } from "@/stores/useSyncState";
import { useSavedFilters } from "@/stores/useSavedFilters";
import { useEntries } from "@/stores/useEntries";
import { useButtonRateLimit } from "@/hooks/useRateLimit";
import { OAuthErrorModal } from "@/components/ui/OAuthErrorModal";
import { SheetDisconnectedModal } from "@/components/ui/SheetDisconnectedModal";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { startSync } from "@/lib/syncEngine";
import { getSpreadsheetTitle } from "@/lib/googleSheets";
import {
  isMobileDevice,
  triggerOAuthRedirect,
  getOAuthToken,
  clearOAuthToken,
  setMobileSyncPending,
  getMobileSyncPending,
  clearMobileSyncPending
} from "@/lib/oauthHelpers";
import { stripBasePath } from "@/lib/constants";

// ============================================
// Types
// ============================================

type ButtonVariant = "primary" | "secondary" | "subtle";
type ButtonMode = "sync" | "restore";

interface SyncWithGoogleSheetsButtonProps {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Mode: sync (default) or restore */
  mode?: ButtonMode;
  /** Show the sync status indicator below the button */
  showStatus?: boolean;
  /** Custom class names to apply */
  className?: string;
  /** Disable the button (e.g., when there are input security errors) */
  disabled?: boolean;
  /** Message to show when disabled due to input errors */
  disabledMessage?: string;
  /** Sheet URL for restore mode */
  sheetUrl?: string;
  /** Callback when restore completes successfully */
  onRestoreSuccess?: () => void;
  /** Callback when restore fails */
  onRestoreError?: (error: string) => void;
}

// ============================================
// Helper: Format time since last sync
// ============================================

function formatTimeSinceSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Not synced";

  const ms = Date.now() - new Date(lastSyncAt).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `Synced ${days}d ago`;
  if (hours > 0) return `Synced ${hours}h ago`;
  if (minutes > 0) return `Synced ${minutes}m ago`;
  return "Synced just now";
}

// ============================================
// Component
// ============================================

// Helper function to extract spreadsheet ID from URL
function getSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function SyncWithGoogleSheetsButton({
  variant = "primary",
  mode = "sync",
  showStatus = false,
  className = "",
  disabled = false,
  disabledMessage,
  sheetUrl,
  onRestoreSuccess,
  onRestoreError,
}: SyncWithGoogleSheetsButtonProps) {
  const router = useRouter();
  const [showOAuthError, setShowOAuthError] = useState(false);
  const [showSheetDisconnected, setShowSheetDisconnected] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorePhase, setRestorePhase] = useState<'connecting' | 'settings' | 'filters' | 'entries' | 'finalizing'>('connecting');

  // Store hooks
  const { isGoogleSheetConnected, loadSettingsFromSheet, googleSheet, setGoogleSheet } = useSettings();
  const { syncInProgress, currentPhase, lastSuccessfulSyncAt } = useSyncState();
  const loadSavedFiltersFromSheet = useSavedFilters((state) => state.loadFromSheet);
  const importEntriesFromSheet = useEntries((state) => state.importEntriesFromSheet);

  // Rate limiting: 3 syncs per minute
  const rateLimit = useButtonRateLimit({
    maxRequests: 3,
    windowMs: 60000,
    key: mode === "restore" ? "restore-google-sheets" : "sync-google-sheets",
    storageType: "localStorage",
  });

  // Check for OAuth token on page load (for mobile redirect return)
  useEffect(() => {
    const token = getOAuthToken();
    const pendingSync = getMobileSyncPending();

    console.log("SyncButton useEffect: Checking for pending OAuth. Has token:", !!token, "Has pendingSync:", !!pendingSync);

    if (!token || !pendingSync) return;

    console.log("SyncButton useEffect: Found pending sync, mode:", pendingSync.mode);

    // We just returned from OAuth redirect on mobile
    if (pendingSync.mode === "restore") {
      // Restore mode: check for pending sheet URL
      const pendingSheetUrl = localStorage.getItem('restore_pending_sheet_url');
      console.log("SyncButton useEffect: Restore mode, pendingSheetUrl:", pendingSheetUrl ? "found" : "not found");
      if (pendingSheetUrl) {
        // Clear pending state first, then perform restore
        localStorage.removeItem('restore_pending_sheet_url');
        clearMobileSyncPending();
        performRestore(pendingSheetUrl, token);
      }
    } else if (pendingSync.mode === "sync" && mode === "sync") {
      // Sync mode: trigger the sync automatically
      clearMobileSyncPending();

      // Fetch and update sheet title for mobile flow
      const updateSheetTitle = async () => {
        if (googleSheet?.url) {
          const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet.url);
          if (spreadsheetId) {
            const title = await getSpreadsheetTitle(spreadsheetId, token);
            if (title && title !== googleSheet.name) {
              setGoogleSheet(googleSheet.url, title);
            }
          }
        }
      };

      updateSheetTitle().then(() => {
        startSync().catch((error) => {
          console.error("Mobile sync error:", error);
          if ((error as Error).message?.includes('deleted') || (error as Error).message?.includes('access')) {
            setShowSheetDisconnected(true);
          }
        });
      });
    }
  }, [mode, googleSheet, setGoogleSheet]);

  // Perform the actual restore operation
  const performRestore = async (url: string, token: string) => {
    setRestorePhase('connecting');
    setIsRestoring(true);

    const spreadsheetId = getSpreadsheetIdFromUrl(url);
    if (!spreadsheetId) {
      onRestoreError?.("That doesn't look like a valid Google Sheet URL.");
      setIsRestoring(false);
      clearOAuthToken();
      return;
    }

    // Fetch the sheet title so we don't default to "Restored Sheet"
    const sheetTitle = await getSpreadsheetTitle(spreadsheetId, token);

    setRestorePhase('settings');
    console.log("Restoring settings from sheet...");
    const settingsSuccess = await loadSettingsFromSheet(spreadsheetId, token, sheetTitle || undefined);

    if (settingsSuccess) {
      console.log("Settings restored successfully, loading filters and entries...");

      setRestorePhase('filters');
      // Load saved filters (may return false if no filters exist, which is OK)
      const filtersResult = await loadSavedFiltersFromSheet(spreadsheetId, token);
      console.log("Filters restore result:", filtersResult);

      setRestorePhase('entries');
      // Import entries from the sheet
      const entriesResult = await importEntriesFromSheet(token);
      console.log("Entries import result:", entriesResult);

      setRestorePhase('finalizing');
      // Mark the restore as a successful sync so the status badge shows "Synced just now"
      useSyncState.getState().completeSync(true);

      // Small delay to ensure localStorage writes are complete before navigation
      // This prevents race conditions where the page navigates before Zustand persist finishes
      await new Promise(resolve => setTimeout(resolve, 100));

      clearOAuthToken();
      setIsRestoring(false);
      onRestoreSuccess?.();
      // Redirect to dashboard after successful restore
      router.push('/dashboard');
    } else {
      const errorMsg = "Could not find or load settings from this sheet. Please ensure it's a valid Cadence sheet and that you have granted permission.";
      onRestoreError?.(errorMsg);
      setIsRestoring(false);
      clearOAuthToken();
    }
  };

  // OAuth login handler (for desktop popup flow)
  const googleLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      // Store token temporarily in sessionStorage
      sessionStorage.setItem('google_oauth_token', tokenResponse.access_token);
      sessionStorage.setItem('google_oauth_timestamp', Date.now().toString());

      // Fetch and update the sheet title if we have a connected sheet
      if (googleSheet?.url) {
        const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet.url);
        if (spreadsheetId) {
          const title = await getSpreadsheetTitle(spreadsheetId, tokenResponse.access_token);
          if (title && title !== googleSheet.name) {
            // Update the sheet name in settings
            await setGoogleSheet(googleSheet.url, title);
          }
        }
      }

      if (mode === "restore") {
        // Perform restore
        if (!sheetUrl) {
          onRestoreError?.("Please enter a Google Sheet URL first.");
          return;
        }
        await performRestore(sheetUrl, tokenResponse.access_token);
      } else {
        // Start sync using new sync engine
        try {
          await startSync();
        } catch (error) {
          console.error("Sync error:", error);
          if ((error as Error).message?.includes('deleted') || (error as Error).message?.includes('access')) {
            setShowSheetDisconnected(true);
          }
        }
      }
    },
    onError: (error) => {
      console.error("OAuth error:", error);
      setShowOAuthError(true);
    },
    onNonOAuthError: () => {
      setShowOAuthError(true);
    },
  });

  // Handle button click - use hybrid OAuth approach
  const handleClick = () => {
    if (syncInProgress || isRestoring || rateLimit.isRateLimited || disabled) return;

    // Restore mode validation
    if (mode === "restore") {
      if (!sheetUrl || !sheetUrl.trim()) {
        onRestoreError?.("Please enter your Google Sheet URL first.");
        return;
      }
    }

    if (!rateLimit.attempt()) return;

    if (isMobileDevice()) {
      // Mobile: use redirect OAuth
      // Store sync intent in localStorage (avoids Zustand hydration race condition)
      setMobileSyncPending(stripBasePath(window.location.pathname), mode);

      if (mode === "restore" && sheetUrl) {
        // Store sheet URL for after redirect
        localStorage.setItem('restore_pending_sheet_url', sheetUrl);
      }
      triggerOAuthRedirect(stripBasePath(window.location.pathname));
    } else {
      // Desktop: use popup OAuth
      googleLogin();
    }
  };

  // Don't render if Google Sheet is not connected
  // BUT still render if we need to show the disconnected modal
  // ALSO always render in restore mode
  if (mode !== "restore" && !isGoogleSheetConnected && !showSheetDisconnected) {
    return null;
  }

  // Button styles by variant
  const buttonStyles: Record<ButtonVariant, string> = {
    primary: `
      px-6 py-3 rounded-lg bg-app-green text-white font-medium
      hover:bg-app-plumb transition-opacity disabled:opacity-50 disabled:cursor-not-allowed
    `,
    secondary: `
      px-4 py-2 rounded-lg bg-app-teal text-white font-medium
      hover:bg-app-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed
    `,
    subtle: `
      flex items-center gap-1.5 px-3 py-1.5 text-sm bg-app-teal/10 text-app-teal
      rounded-lg hover:bg-app-teal/20 disabled:opacity-50 disabled:cursor-not-allowed
      transition-colors
    `,
  };

  // Icon (sync or restore)
  const Icon = mode === "restore" ? (
    <svg
      className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ) : (
    <svg
      className={`w-4 h-4 ${syncInProgress ? "animate-spin" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );

  // Format phase label for display
  const formatPhaseLabel = (): string => {
    const phase = currentPhase.phase;
    const progress = currentPhase.progress;

    switch (phase) {
      case 'verify':
        return 'Verifying connection...';
      case 'push-entries':
        return progress.entriesTotal > 0
          ? `Pushing entries (${progress.entriesSynced}/${progress.entriesTotal})`
          : 'Pushing entries...';
      case 'push-settings':
        return 'Pushing settings...';
      case 'push-filters':
        return 'Pushing filters...';
      case 'pull-entries':
        return 'Pulling entries...';
      case 'pull-settings':
        return 'Pulling settings...';
      case 'pull-filters':
        return 'Pulling filters...';
      case 'finalize':
        return 'Finalizing sync...';
      default:
        return 'Syncing...';
    }
  };

  const syncStatusText = formatTimeSinceSync(lastSuccessfulSyncAt);

  // Button text based on mode and state
  const getButtonText = () => {
    if (mode === "restore") {
      return isRestoring ? "Restoring..." : "Sign In with Google & Restore";
    }
    return syncInProgress ? formatPhaseLabel() : "Sync with Google Sheets";
  };

  const isButtonDisabled = mode === "restore"
    ? isRestoring || rateLimit.isRateLimited || disabled
    : syncInProgress || rateLimit.isRateLimited || disabled;

  return (
    <>
      {/* Show button when connected (sync mode) or always (restore mode) */}
      {(mode === "restore" || isGoogleSheetConnected) && (
        <div className={className}>
          <button
            onClick={handleClick}
            disabled={isButtonDisabled}
            className={buttonStyles[variant]}
            title={
              disabled && disabledMessage
                ? disabledMessage
                : mode === "restore"
                ? "Sign in with Google to restore your settings and entries"
                : "Push local changes and pull updates from Google Sheets"
            }
          >
            <span className="flex items-center justify-center gap-2">
              {Icon}
              {getButtonText()}
            </span>
          </button>

          {/* Input security warning */}
          {disabled && disabledMessage && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ {disabledMessage}
            </div>
          )}

          {/* Rate limit warning */}
          {rateLimit.isRateLimited && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Please wait <strong>{rateLimit.getFormattedTime()}</strong> before
              syncing again.
            </div>
          )}

          {/* Sync status indicator */}
          {showStatus && !syncInProgress && (
            <div className="mt-2 text-sm text-app-gray">
              Google Sheets: {syncStatusText}
            </div>
          )}

          {/* OAuth Error Modal */}
          <OAuthErrorModal
            isOpen={showOAuthError}
            onClose={() => setShowOAuthError(false)}
            onRetry={() => {
              setShowOAuthError(false);
              googleLogin();
            }}
            actionDescription="sync with Google Sheets"
          />
        </div>
      )}

      {/* Sheet Disconnected Modal - rendered outside the connected check */}
      <SheetDisconnectedModal
        isOpen={showSheetDisconnected}
        onClose={() => setShowSheetDisconnected(false)}
      />

      {/* Restore Loading Overlay */}
      {isRestoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-app-charcoal/60 backdrop-blur-sm" />
          <div className="relative bg-app-white rounded-2xl shadow-xl p-8 max-w-sm mx-4">
            <div className="text-center">
              <AnimatedLogo size="md" className="mb-4" spinning />
              <h2 className="text-xl font-bold text-app-charcoal mb-2">
                Restoring Your Data
              </h2>
              <div className="text-sm text-app-gray space-y-1">
                {(() => {
                  const done = (label: string) => (
                    <p className="text-app-green">&#10003; {label}</p>
                  );
                  const active = (label: string) => (
                    <p className="text-app-charcoal font-medium">{label}</p>
                  );
                  const pending = (label: string) => (
                    <p className="text-app-gray/50">{label}</p>
                  );

                  switch (restorePhase) {
                    case 'connecting':
                      return <p>Connecting to sheet...</p>;
                    case 'settings':
                      return <>{active("Restoring settings...")}{pending("Restoring filters...")}{pending("Restoring entries...")}</>;
                    case 'filters':
                      return <>{done("Settings restored")}{active("Restoring filters...")}{pending("Restoring entries...")}</>;
                    case 'entries':
                      return <>{done("Settings restored")}{done("Filters restored")}{active("Restoring entries...")}</>;
                    case 'finalizing':
                      return <>{done("Settings restored")}{done("Filters restored")}{done("Entries restored")}{active("Finalizing...")}</>;
                    default:
                      return <p>Starting restore...</p>;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
