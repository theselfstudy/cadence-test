'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';
import { useSetupGuard } from '@/stores/useSetupGuard';
import { validateSettings } from '@/lib/settingsValidation';

/** Paths that are always accessible, even during setup */
const ALWAYS_ALLOWED_PATHS = ['/welcome', '/settings', '/tutorial', '/contact'];

/**
 * A router hook that enforces settings validation when leaving settings page
 * or during initial setup. Local changes are always allowed; syncing is explicit.
 */
export function useSafeRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const setupComplete = useSettings((state) => state.setupComplete);
  const showGuard = useSetupGuard((state) => state.show);

  const push = (href: string) => {
    // Always allow external URLs
    if (href.startsWith('http://') || href.startsWith('https://')) {
      router.push(href);
      return;
    }

    // Always allow navigation to safe paths
    if (ALWAYS_ALLOWED_PATHS.some((path) => href.startsWith(path))) {
      router.push(href);
      return;
    }

    const state = useSettings.getState();

    // ---------------------------------------------------------------------------
    // Enforce validation when leaving settings or during initial setup
    // ---------------------------------------------------------------------------
    const isOnSettingsPage = pathname === '/settings';
    const isInSetupFlow = !setupComplete;

    if (isOnSettingsPage || isInSetupFlow) {
      const validation = validateSettings({
        periodTracking: state.periodTracking,
        medicineTracking: state.medicineTracking,
      });

      if (!validation.isValid) {
        showGuard();
        return; // Block navigation
      }
    }

    router.push(href);
  };

  return { ...router, push };
}