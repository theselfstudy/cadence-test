"use client";

import { Header } from "./Header";
import React from "react";
import { SyncReminderModal } from "@/components/sync/SyncReminderModal";
import { useSyncReminder } from "@/hooks/useSyncReminder";
import { useSetupGuard } from "@/stores/useSetupGuard";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { useDemoExpiry } from "@/hooks/useDemoExpiry";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Main application shell component
 * Wraps all pages with consistent header and layout structure
 */
export function AppShell({ children }: AppShellProps) {
  const { showModal, closeModal } = useSyncReminder();
  const { isOpen: setupGuardOpen, close: closeSetupGuard } = useSetupGuard();
  const isDemoExpired = useDemoExpiry();

  return (
    <>
      <div className={`min-h-screen flex flex-col bg-app-cream${isDemoExpired ? " pointer-events-none select-none" : ""}`}>
        {/* Header */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-app-border bg-app-white">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <p className="text-center text-sm text-app-gray">
              Learn your Cadence • The Self Study
            </p>
          </div>
        </footer>
      </div>

      {isDemoExpired && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl border border-app-border">
            <div className="flex justify-center mb-4">
              <AnimatedLogo size="sm" />
            </div>
            <h2 className="text-2xl font-bold text-app-charcoal mb-3">
              Your 3-day demo has ended.
            </h2>
            <p className="text-app-gray text-sm mb-6">
              Ready to start tracking your own health data?
            </p>
            <a
              href="https://cadence.the-self-study.com"
              className="inline-block px-6 py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green/90 transition-colors"
            >
              Get full access →
            </a>
          </div>
        </div>
      )}

      {/* Global 48-hour sync reminder modal */}
      <SyncReminderModal isOpen={showModal} onClose={closeModal} />

      {/* Setup guard modal — shown when users try to navigate before completing setup */}
      {setupGuardOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
            onClick={closeSetupGuard}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-8 pb-4 flex justify-center">
                <AnimatedLogo size="md" />
              </div>
              <div className="px-6 pb-4 text-center">
                <h2 className="text-xl font-semibold text-app-charcoal mb-2">
                  Almost there!
                </h2>
                <p className="text-app-gray">
                  Eager to get started? Head back to the welcome page and click "Get Started" to begin setting up your experience.
                </p>
              </div>
              <div className="px-6 pb-6">
                <button
                  type="button"
                  onClick={closeSetupGuard}
                  className="w-full px-4 py-3 rounded-xl bg-app-green text-white font-medium hover:bg-app-green/90 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AppShell;