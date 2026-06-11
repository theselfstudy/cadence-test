import { create } from "zustand";

interface SetupGuardState {
  isOpen: boolean;
  show: () => void;
  close: () => void;
}

/**
 * Tiny store for the setup guard modal.
 * Used by SafeLink and useSafeRouter to show a friendly modal
 * instead of a browser alert when navigation is blocked during setup.
 */
export const useSetupGuard = create<SetupGuardState>((set) => ({
  isOpen: false,
  show: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));