"use client";

import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useEntries } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";
import { useSavedFilters } from "@/stores/useSavedFilters";
import { useSyncTracker } from "@/stores/useSyncTracker";
import { startSync } from "@/lib/syncEngine";
import { isMobileDevice, triggerOAuthRedirect, setMobileSyncPending } from "@/lib/oauthHelpers";
import { stripBasePath } from "@/lib/constants";

// ============================================
// Types
// ============================================

interface SyncReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function SyncReminderModal({ isOpen, onClose }: SyncReminderModalProps) {
  const [isStarting, setIsStarting] = useState(false);

  // Store hooks
  const { entries } = useEntries();
  const { hasUnsavedChanges } = useSettings();
  const { savedFilters } = useSavedFilters();
  const { dismissModalTemporarily } = useSyncTracker();

  // Calculate counts
  const pendingEntries = entries.filter(
    (e) => e.syncStatus === "pending" || e.syncStatus === "error"
  );
  const pendingEntriesCount = pendingEntries.length;
  const hasUnsavedSettings = hasUnsavedChanges;
  const hasFiltersToSync = savedFilters.length > 0;

  // OAuth login handler (for desktop popup flow)
  const googleLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      // Store token temporarily in sessionStorage
      sessionStorage.setItem('google_oauth_token', tokenResponse.access_token);
      sessionStorage.setItem('google_oauth_timestamp', Date.now().toString());

      // Start sync using new sync engine
      try {
        setIsStarting(true);
        await startSync();
        onClose(); // Close modal when sync starts
      } catch (error) {
        console.error("Sync error:", error);
        setIsStarting(false);
      }
    },
    onError: (error) => {
      console.error("OAuth error:", error);
      setIsStarting(false);
    },
  });

  // Handle sync now - use hybrid OAuth approach
  const handleSyncNow = () => {
    if (isMobileDevice()) {
      // Mobile: use redirect OAuth
      // Store sync intent before redirecting (avoids Zustand hydration race condition)
      setMobileSyncPending(stripBasePath(window.location.pathname), 'sync');
      triggerOAuthRedirect(stripBasePath(window.location.pathname));
    } else {
      // Desktop: use popup OAuth
      googleLogin();
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    dismissModalTemporarily();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🔄</div>
          <h2 className="text-xl font-semibold text-app-charcoal mb-2">
            Time to Sync Your Data
          </h2>
          <p className="text-sm text-app-gray">
            It&apos;s been a while since your last sync. Let&apos;s back up your data to
            Google Sheets.
          </p>
        </div>

        {/* Show what needs syncing */}
        <div className="bg-app-cream rounded-lg p-4 space-y-2 text-sm">
          {pendingEntriesCount > 0 && (
            <div className="flex justify-between">
              <span className="text-app-gray">Entries to sync:</span>
              <span className="font-medium text-app-charcoal">
                {pendingEntriesCount}
              </span>
            </div>
          )}
          {hasUnsavedSettings && (
            <div className="flex justify-between">
              <span className="text-app-gray">Settings changes:</span>
              <span className="font-medium text-app-charcoal">Yes</span>
            </div>
          )}
          {hasFiltersToSync && (
            <div className="flex justify-between">
              <span className="text-app-gray">Saved filters:</span>
              <span className="font-medium text-app-charcoal">
                {savedFilters.length}
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleSyncNow}
            disabled={isStarting}
            className="w-full px-6 py-3 rounded-lg bg-app-green text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStarting ? "Starting sync..." : "Sync Now"}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isStarting}
            className="w-full px-6 py-3 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Dismiss for Now
          </button>
        </div>
      </div>
    </div>
  );
}
