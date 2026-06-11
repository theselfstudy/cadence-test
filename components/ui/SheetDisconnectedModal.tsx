"use client";

import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";

// ============================================
// Sheet Disconnected Modal
// Shown when sheet verification fails (deleted/access removed)
// ============================================

interface SheetDisconnectedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SheetDisconnectedModal({
  isOpen,
  onClose,
}: SheetDisconnectedModalProps) {
  const router = useRouter();
  const { clearGoogleSheet } = useSettings();

  if (!isOpen) return null;

  const handleContinueLocally = () => {
    clearGoogleSheet();
    onClose();
  };

  const handleAddGoogleSheet = () => {
    onClose();
    // Navigate to settings with highlight parameter
    router.push("/settings?highlight=google-sheet-integration");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-disconnected-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h2
                  id="sheet-disconnected-title"
                  className="text-xl font-semibold text-app-charcoal"
                >
                  Switched to Local Mode
                </h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            <p className="text-app-gray">
              Your Google Sheet connection is no longer valid. This can happen if the sheet was deleted or you no longer have access to it.
            </p>
            <p className="text-app-gray mt-3">
              Your data is safe and has been switched to <strong className="text-app-charcoal">Local Mode</strong>. You can continue using Cadence, or connect a new Google Sheet to sync your data.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            {/* Continue Locally - Primary action */}
            <button
              type="button"
              onClick={handleContinueLocally}
              className="w-full px-4 py-3 rounded-xl bg-app-green text-white
                       font-medium hover:bg-app-green/70 transition-colors"
            >
              Continue Locally
            </button>
            <p className="text-xs text-app-gray text-center -mt-1">
              Data will be stored only on this device
            </p>

            {/* Add Google Sheet - Secondary action */}
            <button
              type="button"
              onClick={handleAddGoogleSheet}
              className="w-full px-4 py-3 rounded-xl bg-app-teal border-2 border-app-teal
                       text-app-cream font-medium hover:bg-app-teal/70 transition-colors
                       flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add a Google Sheet and Sync
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
