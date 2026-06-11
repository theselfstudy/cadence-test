"use client";

// ============================================
// OAuth Error Modal
// Reusable modal for when OAuth fails/is cancelled
// ============================================

interface OAuthErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  /** What action failed (e.g., "save your filter", "sync your entry") */
  actionDescription: string;
  /** Optional custom title */
  title?: string;
}

export function OAuthErrorModal({
  isOpen,
  onClose,
  onRetry,
  actionDescription,
  title = "Action Not Completed",
}: OAuthErrorModalProps) {
  if (!isOpen) return null;

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
        aria-labelledby="oauth-error-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-app-red/10 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-app-red"
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
                  id="oauth-error-title"
                  className="text-xl font-semibold text-app-charcoal"
                >
                  {title}
                </h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            <p className="text-app-gray">
              We couldn&apos;t {actionDescription} because Google sign-in was cancelled or failed.
            </p>
            <p className="text-app-gray mt-2">
              Your data has <strong className="text-app-charcoal">not</strong> been changed. Please try again when you&apos;re ready.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-app-border 
                       text-app-charcoal font-medium hover:bg-app-cream transition-colors"
            >
              Close
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-[#3F592E] text-white 
                         font-medium hover:bg-[#3F592E]/90 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}