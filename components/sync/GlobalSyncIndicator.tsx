"use client";

import { useSyncState, SyncPhase } from '@/stores/useSyncState';

const phaseLabels: Record<SyncPhase, string> = {
  'idle': 'Idle',
  'verify': 'Verifying sheet connection',
  'push-entries': 'Pushing entries',
  'push-settings': 'Pushing settings',
  'push-filters': 'Pushing filters',
  'pull-entries': 'Pulling entries',
  'pull-settings': 'Pulling settings',
  'pull-filters': 'Pulling filters',
  'finalize': 'Finalizing',
  'complete': 'Complete',
  'error': 'Error',
};

export function GlobalSyncIndicator() {
  const { syncInProgress, currentPhase } = useSyncState();

  if (!syncInProgress) return null;

  const formatPhaseLabel = (phase: SyncPhase, progress: typeof currentPhase.progress): string => {
    if (phase === 'push-entries' && progress.entriesTotal > 0) {
      return `Pushing entries (${progress.entriesSynced}/${progress.entriesTotal})`;
    }
    return phaseLabels[phase] || 'Syncing...';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-app-teal text-white px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <svg
          className="animate-spin h-5 w-5"
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
        <span className="font-medium">
          {formatPhaseLabel(currentPhase.phase, currentPhase.progress)}
        </span>
        <span className="text-sm opacity-90">
          Please do not close this window or navigate away from this page
        </span>
      </div>
    </div>
  );
}
