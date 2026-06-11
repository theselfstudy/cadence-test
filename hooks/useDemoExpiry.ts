"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "demo-first-visit";
const THREE_DAYS_MS = 259_200_000;

// Re-checks on every route change so navigation attempts can't escape the modal.
export function useDemoExpiry(): boolean {
  const [expired, setExpired] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IS_DEMO !== "true") return;

    const stored = localStorage.getItem(KEY);
    if (!stored) {
      localStorage.setItem(KEY, String(Date.now()));
      setExpired(false);
      return;
    }
    setExpired(Date.now() - Number(stored) > THREE_DAYS_MS);
  }, [pathname]);

  return expired;
}
