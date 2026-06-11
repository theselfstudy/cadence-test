"use client";

import { useSyncState } from '@/stores/useSyncState';
import { useSettings } from '@/stores/useSettings';

function formatTimeSinceSync(lastSyncAt: string | null): string | null {
  if (!lastSyncAt) return null;

  const ms = Date.now() - new Date(lastSyncAt).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export function SyncStatusBadge() {
  const { lastSuccessfulSyncAt, syncInProgress } = useSyncState();
  const { isGoogleSheetConnected } = useSettings();

  // Don't show anything if no sheet is connected
  if (!isGoogleSheetConnected) {
    return null;
  }

  if (syncInProgress) {
    return (
      <div className="flex items-center gap-2 text-sm text-app-teal">
        <svg
          className="animate-spin h-3 w-3"
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
        <span className="font-medium">Syncing...</span>
      </div>
    );
  }

  const timeAgo = formatTimeSinceSync(lastSuccessfulSyncAt);

  return (
    <div className="text-sm text-app-gray">
      <span className="font-medium">Google Sheets:</span>{' '}
      {timeAgo ? `Last synced ${timeAgo}` : 'Sheet connected and is not yet synced'}
    </div>
  );
}
