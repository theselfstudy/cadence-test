import { useEffect, useReducer } from "react";

/**
 * Forces a re-render when the page becomes visible again.
 * Handles mobile bfcache restoration and tab switching, which can
 * leave React useMemo caches stale while the Zustand store has
 * already been updated.
 *
 * Usage: add the returned `renderKey` to any useMemo dependency
 * array that derives data from the entries store.
 */
export function useFreshData(): number {
  const [renderKey, bump] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) bump();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") bump();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return renderKey;
}
