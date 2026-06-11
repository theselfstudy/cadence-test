// ============================================
// Media Query Hook
// ============================================

import { useState, useEffect } from "react";

/**
 * Hook to detect if screen matches a media query.
 * Returns false during SSR, then updates on client.
 * 
 * @param query - Media query string (e.g., "(max-width: 768px)")
 * @returns Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener("change", handler);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

/**
 * Hook to detect if we're on a mobile device (< 768px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * Hook to detect if we're on a tablet or smaller (< 1024px)
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}