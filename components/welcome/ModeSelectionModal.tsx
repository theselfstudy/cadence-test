"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingMode } from "@/types";

// =============================================================================
// ICONS
// =============================================================================

const CloudIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

// =============================================================================
// COMPONENT
// =============================================================================

type SelectedOption = "google-sheet" | "restore" | "anonymous";

interface ModeSelectionModalProps {
  onSelect: (mode: OnboardingMode) => void;
  onCancel: () => void;
}

export function ModeSelectionModal({ onSelect, onCancel }: ModeSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<SelectedOption | null>(null);
  const [showAnonymousWarning, setShowAnonymousWarning] = useState(false);
  const router = useRouter();

  const handleContinue = () => {
    if (!selectedOption) return;

    if (selectedOption === "restore") {
      router.push("/recover");
    } else if (selectedOption === "anonymous") {
      setShowAnonymousWarning(true);
    } else {
      onSelect(selectedOption);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-app-white p-6 rounded-xl shadow-xl max-w-lg w-full space-y-6 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {showAnonymousWarning ? (
          /* ── Anonymous mode warning ── */
          <>
            <div className="text-center space-y-1">
              <span className="text-3xl block">⚠️</span>
              <h2 className="text-xl font-bold text-app-charcoal">
                Before you continue
              </h2>
              <p className="text-sm text-app-gray">
                Keeping data on this device only comes with real limitations.
              </p>
            </div>

            <div className="rounded-xl bg-app-cream border border-app-border p-4 space-y-3">
              <ul className="space-y-3">
                {[
                  "Using incognito or private browsing? Your health data will be permanently gone when the session ends with no way to recover it.",
                  "Clearing your browser history, site data, or cache can silently delete all your entries and settings.",
                  "Your data won't follow you to another browser or device.",
                  "If you lose access to this device or browser, there is no backup and no recovery path.",
                  "You can connect a Google Sheet in Settings at any time. Your existing entries will sync up when you do. But until then, there is no backup.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 text-app-plumb">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                    </span>
                    <p className="text-xs text-app-gray leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-app-gray/70 text-center leading-relaxed">
              If any of this gives you pause, go back and choose{" "}
              <span className="font-medium text-app-charcoal">Signed In &amp; Synced Mode</span>{" "}
              to keep your health data safe.
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onSelect("anonymous")}
                className="w-full py-3 px-4 rounded-lg font-semibold bg-app-gray/80 text-white hover:bg-app-gray transition-colors"
              >
                I understand, continue without backup
              </button>
              <button
                type="button"
                onClick={() => setShowAnonymousWarning(false)}
                className="w-full py-2 px-4 text-sm text-app-gray hover:text-app-charcoal transition-colors"
              >
                Go back
              </button>
            </div>
          </>
        ) : (
          /* ── Main selection view ── */
          <>
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-app-charcoal">
            How would you like to use Cadence?
          </h2>
          <p className="text-sm text-app-gray mt-2">
            Choose how you want to store your health data
          </p>
          <a
            href="https://the-self-study.com/cadence-privacy/faq.html#what-are-these-modes"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-app-teal underline hover:text-app-green mt-1 inline-block"
          >
            Learn about the modes here
          </a>
        </div>

        {/* Mode Options */}
        <div className="space-y-3">
          {/* New User - Google Sheet Option */}
          <label
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedOption === "google-sheet"
                ? "border-app-green bg-app-green/5"
                : "border-app-border hover:border-app-green/50"
            }`}
          >
            <div className="flex items-center gap-4">
              <input
                type="radio"
                name="onboarding-mode"
                value="google-sheet"
                checked={selectedOption === "google-sheet"}
                onChange={() => setSelectedOption("google-sheet")}
                className="w-4 h-4 text-app-green focus:ring-app-green"
              />
              <div className="flex items-center gap-2">
                <span className="text-app-green">
                  <CloudIcon />
                </span>
                <span className="font-semibold text-app-charcoal leading-tight">
                  New User<br />
                  <span className="text-sm font-semibold text-app-gray">Signed In & Synced Mode</span>
                </span>
              </div>
            </div>
            {selectedOption === "google-sheet" && (
              <p className="text-sm text-app-gray mt-3 ml-8">
                Connect a Google Sheet to backup and sync your data across devices.
                Your settings and entries are saved securely to your own spreadsheet.
              </p>
            )}
          </label>

          {/* Existing User - Restore Option */}
          <label
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedOption === "restore"
                ? "border-app-teal bg-app-teal/5"
                : "border-app-border hover:border-app-teal/50"
            }`}
          >
            <div className="flex items-center gap-4">
              <input
                type="radio"
                name="onboarding-mode"
                value="restore"
                checked={selectedOption === "restore"}
                onChange={() => setSelectedOption("restore")}
                className="w-4 h-4 text-app-teal focus:ring-app-teal"
              />
              <div className="flex items-center gap-2">
                <span className="text-app-teal">
                  <RefreshIcon />
                </span>
                <span className="font-semibold text-app-charcoal leading-tight">
                  Existing User<br />
                  <span className="text-sm font-semibold text-app-gray">Restore Data & Settings</span>
                </span>
              </div>
            </div>
            {selectedOption === "restore" && (
              <div className="mt-3 ml-8">
                <p className="text-sm text-app-gray">
                  Already set up? If you&apos;re connecting a sheet with existing
                  Cadence data, restore your settings and entries here.
                </p>
                <a
                  href="https://the-self-study.com/cadence-privacy/faq.html#how-do-i-restore-my-stuff"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-app-teal underline hover:text-app-green mt-1 inline-block"
                  onClick={(e) => e.stopPropagation()}
                >
                  Learn how to here
                </a>
              </div>
            )}
          </label>

          {/* Anonymous Option */}
          <label
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedOption === "anonymous"
                ? "border-app-gray bg-app-gray/5"
                : "border-app-border hover:border-app-gray/50"
            }`}
          >
            <div className="flex items-center gap-4">
              <input
                type="radio"
                name="onboarding-mode"
                value="anonymous"
                checked={selectedOption === "anonymous"}
                onChange={() => setSelectedOption("anonymous")}
                className="w-4 h-4 text-app-gray focus:ring-app-gray"
              />
              <div className="flex items-center gap-2">
                <span className="text-app-gray">
                  <UserIcon />
                </span>
                <span className="font-semibold text-app-charcoal">
                  Anonymous Mode
                </span>
              </div>
            </div>
            {selectedOption === "anonymous" && (
              <div className="mt-3 ml-8">
                <p className="text-sm text-app-gray">
                  Keep your data stored locally on this device only.
                  No sign-in required. Get started quickly and privately.
                </p>
                <p className="text-xs text-app-gray/70 mt-2 italic">
                  You can connect a Google Sheet later anytime.
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-app-cream rounded-lg border border-app-border">
          <p className="text-xs text-app-gray">
            💡 You can change this later in Settings. All modes let you log the same health data.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleContinue}
            disabled={!selectedOption}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              selectedOption
                ? "bg-app-green text-white hover:bg-app-green-dark"
                : "bg-app-gray/30 text-app-gray cursor-not-allowed"
            }`}
          >
            Continue
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 text-sm text-app-gray hover:text-app-charcoal transition-colors"
          >
            Go Back
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ModeSelectionModal;
