"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

/**
 * Root page - handles routing based on user state
 * - New users (no setup/tutorial complete) → /welcome
 * - Existing users → /dashboard
 */
export default function RootPage() {
  const router = useRouter();
  const { setupComplete, tutorialComplete } = useSettings();
  const [isClient, setIsClient] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect based on user state
  useEffect(() => {
    if (!isClient) return;

    if (!setupComplete && !tutorialComplete) {
      // New user - send to welcome page
      router.replace("/welcome");
    } else {
      // Existing user - send to dashboard
      router.replace("/dashboard");
    }
  }, [isClient, setupComplete, tutorialComplete, router]);

  // Show loading while determining redirect
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <AnimatedLogo size="md" className="mb-4" spinning />
        <p className="text-app-gray">Loading Cadence...</p>
      </div>
    </div>
  );
}