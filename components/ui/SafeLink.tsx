'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';
import { useSetupGuard } from '@/stores/useSetupGuard';
import { validateSettings } from '@/lib/settingsValidation';
import { ComponentProps } from 'react';

/** Paths that are always accessible, even during setup */
const ALWAYS_ALLOWED_PATHS = ['/welcome', '/tutorial', '/contact', '/faq'];

/**
 * A Link component that enforces settings validation when leaving settings page
 * or during initial setup. Local changes are always allowed; syncing is explicit.
 */
export function SafeLink({ href, onClick, children, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const setupComplete = useSettings((state) => state.setupComplete);
  const showGuard = useSetupGuard((state) => state.show);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const hrefString = typeof href === 'string' ? href : href.pathname ?? '';

    // Always allow external URLs (FAQ, Privacy, etc.)
    if (hrefString.startsWith('http://') || hrefString.startsWith('https://')) {
      onClick?.(e);
      return;
    }

    // Always allow navigation to safe paths
    if (ALWAYS_ALLOWED_PATHS.some((path) => hrefString.startsWith(path))) {
      onClick?.(e);
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
        symptoms: state.symptoms,
        periodTracking: state.periodTracking,
        medicineTracking: state.medicineTracking,
        stoolTracking: state.stoolTracking,
      });

      if (!validation.isValid) {
        e.preventDefault();
        e.stopPropagation();
        showGuard();
        return; // Block navigation
      }
    }

    onClick?.(e);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}