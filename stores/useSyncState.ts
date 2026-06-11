import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SyncPhase =
  | 'idle'
  | 'verify'
  | 'push-entries'
  | 'push-settings'
  | 'push-filters'
  | 'pull-entries'
  | 'pull-settings'
  | 'pull-filters'
  | 'finalize'
  | 'complete'
  | 'error';

interface SyncProgress {
  entriesTotal: number;
  entriesSynced: number;
  currentEntryIndex: number;
  lastSyncedEntryId: string | null;
}

interface CurrentPhase {
  phase: SyncPhase;
  progress: SyncProgress;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface SyncStateStore {
  // Core state
  syncInProgress: boolean;
  currentPhase: CurrentPhase;
  lastSyncAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;

  // OAuth redirect tracking
  pendingOAuthRedirect: boolean;
  oauthReturnUrl: string | null;

  // Actions
  startSync: () => void;
  updatePhase: (phase: SyncPhase, progress?: Partial<SyncProgress>) => void;
  completeSync: (success: boolean) => void;
  clearSyncState: () => void;
  shouldResumeSync: () => boolean;
  setPendingOAuthRedirect: (pending: boolean, returnUrl?: string) => void;
}

const initialProgress: SyncProgress = {
  entriesTotal: 0,
  entriesSynced: 0,
  currentEntryIndex: 0,
  lastSyncedEntryId: null,
};

const initialPhase: CurrentPhase = {
  phase: 'idle',
  progress: initialProgress,
  error: null,
  startedAt: null,
  completedAt: null,
};

export const useSyncState = create<SyncStateStore>()(
  persist(
    (set, get) => ({
      // Initial state
      syncInProgress: false,
      currentPhase: initialPhase,
      lastSyncAttemptAt: null,
      lastSuccessfulSyncAt: null,
      pendingOAuthRedirect: false,
      oauthReturnUrl: null,

      // Actions
      startSync: () => {
        const now = new Date().toISOString();
        set({
          syncInProgress: true,
          currentPhase: {
            phase: 'verify',
            progress: { ...initialProgress },
            error: null,
            startedAt: now,
            completedAt: null,
          },
          lastSyncAttemptAt: now,
        });
      },

      updatePhase: (phase: SyncPhase, progress?: Partial<SyncProgress>) => {
        set((state) => ({
          currentPhase: {
            ...state.currentPhase,
            phase,
            progress: progress
              ? { ...state.currentPhase.progress, ...progress }
              : state.currentPhase.progress,
          },
        }));
      },

      completeSync: (success: boolean) => {
        const now = new Date().toISOString();
        const currentPhase = get().currentPhase;

        set({
          syncInProgress: false,
          currentPhase: {
            phase: success ? 'complete' : 'error',
            progress: { ...initialProgress },
            error: success ? null : currentPhase.error,
            startedAt: currentPhase.startedAt,
            completedAt: now,
          },
          lastSuccessfulSyncAt: success ? now : get().lastSuccessfulSyncAt,
        });
      },

      clearSyncState: () => {
        set({
          syncInProgress: false,
          currentPhase: initialPhase,
        });
      },

      shouldResumeSync: () => {
        const { syncInProgress, currentPhase } = get();
        return syncInProgress &&
               currentPhase.phase !== 'idle' &&
               currentPhase.phase !== 'complete' &&
               currentPhase.phase !== 'error';
      },

      setPendingOAuthRedirect: (pending: boolean, returnUrl?: string) => {
        set({
          pendingOAuthRedirect: pending,
          oauthReturnUrl: returnUrl || null
        });
      },
    }),
    {
      name: 'cadence-sync-state',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
