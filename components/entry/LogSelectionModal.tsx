"use client";

import { useState } from "react";
import Link from "next/link";
import type { LogSection } from "@/types";

interface LogSelectionModalProps {
  /** Which sections are enabled in user settings */
  availableSections: {
    symptoms: boolean;
    bowel: boolean;
    period: boolean;
    medicine: boolean;
  };
  /** Callback when user confirms selection */
  onConfirm: (sections: LogSection[]) => void;
}

interface SectionOption {
  id: LogSection;
  label: string;
  icon: string;
  description: string;
  settingsKey: keyof LogSelectionModalProps["availableSections"];
}

const SECTION_OPTIONS: SectionOption[] = [
  {
    id: "symptoms",
    label: "General Symptoms",
    icon: "🏷️",
    description: "Log symptoms and intensity levels",
    settingsKey: "symptoms",
  },
  {
    id: "bowel",
    label: "Bowel Movement",
    icon: "🧻",
    description: "Bristol Stool Scale tracking",
    settingsKey: "bowel",
  },
  {
    id: "period",
    label: "Period / Cycle",
    icon: "🌸",
    description: "Cycle phase, flow, and products",
    settingsKey: "period",
  },
  {
    id: "medicine",
    label: "Medicine",
    icon: "💊",
    description: "Log medications taken",
    settingsKey: "medicine",
  },
];

export function LogSelectionModal({
  availableSections,
  onConfirm,
}: LogSelectionModalProps) {
  // Filter to only show sections enabled in settings
  const enabledSections = SECTION_OPTIONS.filter(
    (section) => availableSections[section.settingsKey]
  );

  // Track selected sections
  const [selected, setSelected] = useState<LogSection[]>([]);

  // Check if "Log Everything" should be shown (more than one section available)
  const showLogEverything = enabledSections.length > 1;

  // Check if all available sections are selected
  const allSelected =
    enabledSections.length > 0 &&
    enabledSections.every((section) => selected.includes(section.id));

  // Toggle individual section
  const toggleSection = (sectionId: LogSection) => {
    setSelected((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Toggle all sections
  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(enabledSections.map((s) => s.id));
    }
  };

  // Handle confirm - must have at least one selection
  const handleConfirm = () => {
    if (selected.length > 0) {
      onConfirm(selected);
    }
  };

  // If no sections are enabled, show a message
  if (enabledSections.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-app-charcoal/50 backdrop-blur-sm" />

        {/* Modal */}
        <div className="relative w-full max-w-md bg-app-white rounded-2xl shadow-xl p-6">
          <div className="text-center">
            <span className="text-4xl mb-4 block">⚙️</span>
            <h2 className="text-xl font-bold text-app-charcoal mb-2">
              No Tracking Enabled
            </h2>
            <p className="text-app-gray mb-6">
              You haven&apos;t enabled any tracking features yet. Head to Settings to
              configure what you&apos;d like to track.
            </p>
            <Link
              href="/settings"
              className="inline-block px-6 py-3 rounded-lg bg-app-green text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Go to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - slightly blurred to show form behind */}
      <div className="absolute inset-0 bg-app-charcoal/40 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-app-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-xl font-bold text-app-charcoal text-center">
            What would you like to log?
          </h2>
          <p className="text-sm text-app-gray text-center mt-1">
            Select categories to log for this entry
          </p>
        </div>

        {/* Section Options */}
        <div className="px-6 space-y-2">
          {enabledSections.map((section) => {
            const isSelected = selected.includes(section.id);
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`w-full p-4 rounded-xl text-left transition-all flex items-start gap-4 ${
                  isSelected
                    ? "bg-app-green/10 border-2 border-app-green"
                    : "bg-app-cream border-2 border-transparent hover:border-app-border"
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? "bg-app-green text-white"
                      : "bg-app-white border-2 border-app-border"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{section.icon}</span>
                    <span className="font-semibold text-app-charcoal">
                      {section.label}
                    </span>
                  </div>
                  <p className="text-sm text-app-gray mt-0.5">
                    {section.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Log Everything Toggle */}
        {showLogEverything && (
          <div className="px-6 pt-4">
            <button
              type="button"
              onClick={toggleAll}
              className={`w-full p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                allSelected
                  ? "bg-app-green text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green"
              }`}
            >
              {allSelected ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Logging Everything
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  Select All Categories
                </>
              )}
            </button>
          </div>
        )}

                {/* Footer */}
        <div className="p-6 pt-4 space-y-3">
          {/* Validation message */}
          {selected.length === 0 && (
            <p className="text-xs text-app-gray text-center">
              Select at least one category to continue
            </p>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.length === 0}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
              selected.length === 0
                ? "bg-app-gray/50 cursor-not-allowed"
                : "bg-app-teal hover:opacity-90"
            }`}
          >
            Start Logging
          </button>

          {/* Cancel / Back to Home */}
          <Link
            href="/dashboard"
            className="block w-full py-3 rounded-xl text-center font-medium text-app-gray hover:text-app-charcoal hover:bg-app-cream transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}