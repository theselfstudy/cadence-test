"use client";

import { useState, useEffect } from "react";
import { useSyncTracker } from "@/stores/useSyncTracker";
import { useSettings } from "@/stores/useSettings";
import { useSyncState } from "@/stores/useSyncState";
import { getOAuthToken } from "@/lib/oauthHelpers";

/**
 * Hook to manage the 48-hour sync reminder modal
 *
 * This hook:
 * - Checks if the modal should be shown on page load
 * - Resets the dismissal flag each time the page loads
 * - Only shows the modal if a Google Sheet is connected
 * - Dismisses the modal when a sync starts (e.g. after mobile OAuth return)
 */
export function useSyncReminder() {
  const [showModal, setShowModal] = useState(false);
  const { shouldShowModal, resetDismissal } = useSyncTracker();
  const { isGoogleSheetConnected } = useSettings();
  const { syncInProgress } = useSyncState();

  useEffect(() => {
    // Reset dismissal flag on page load
    resetDismissal();

    // Check if modal should appear
    // Only show if:
    // 1. Google Sheet is connected
    // 2. 48 hours have passed since last sync (or never synced)
    // 3. User hasn't just returned from OAuth (token present means sync is imminent)
    if (isGoogleSheetConnected && shouldShowModal() && !getOAuthToken()) {
      setShowModal(true);
    }
  }, [isGoogleSheetConnected, shouldShowModal, resetDismissal]);

  // Auto-dismiss the modal when a sync starts (covers mobile OAuth return)
  useEffect(() => {
    if (syncInProgress) {
      setShowModal(false);
    }
  }, [syncInProgress]);

  const closeModal = () => {
    setShowModal(false);
  };

  return {
    showModal,
    closeModal,
  };
}
