"use client";

import { useState } from 'react';
import { useSyncState, SyncPhase } from '@/stores/useSyncState';
import { resumeSync } from '@/lib/syncEngine';

interface ResumeSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const phaseDisplayNames: Record<SyncPhase, string> = {
  'idle': 'Idle',
  'verify': 'Verifying sheet connection',
  'push-entries': 'Pushing entries to sheet',
  'push-settings': 'Pushing settings to sheet',
  'push-filters': 'Pushing filters to sheet',
  'pull-entries': 'Pulling entries from sheet',
  'pull-settings': 'Pulling settings from sheet',
  'pull-filters': 'Pulling filters from sheet',
  'finalize': 'Finalizing sync',
  'complete': 'Complete',
  'error': 'Error occurred',
};

export function ResumeSyncModal({ isOpen, onClose }: ResumeSyncModalProps) {
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentPhase, clearSyncState } = useSyncState();

  if (!isOpen) return null;

  const handleResume = async () => {
    setIsResuming(true);
    setError(null);

    try {
      await resumeSync();
      onClose();
    } catch (err) {
      console.error('Resume sync error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resume sync');
      setIsResuming(false);
    }
  };

  const handleCancel = () => {
    clearSyncState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔄</div>
          <h2 className="text-xl font-semibold text-app-charcoal mb-2">
            Resume Sync?
          </h2>
          <p className="text-sm text-app-gray mb-2">
            Your previous sync was interrupted during:
          </p>
          <p className="text-base font-medium text-app-teal mb-3">
            {phaseDisplayNames[currentPhase.phase]}
          </p>
          <p className="text-sm text-app-gray">
            Would you like to continue from where you left off?
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleResume}
            disabled={isResuming}
            className="w-full px-6 py-3 rounded-lg bg-app-green text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResuming ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Resuming...</span>
              </span>
            ) : (
              'Resume Sync'
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={isResuming}
            className="w-full px-6 py-3 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel & Clear
          </button>
        </div>
      </div>
    </div>
  );
}
