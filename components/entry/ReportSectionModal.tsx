"use client";

import { useState, useMemo } from "react";
import { useEntries, useEntriesRevision } from "@/stores/useEntries";
import { useFreshData } from "@/hooks/useFreshData";
import type { LogSection } from "@/types";

interface ReportSectionModalProps {
  /** Which sections are enabled in user settings */
  availableSections: {
    symptoms: boolean;
    bowel: boolean;
    period: boolean;
    medicine: boolean;
  };
  /** Callback when user confirms selection */
  onConfirm: (config: ReportConfig) => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

export interface ReportConfig {
  sections: LogSection[];
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
}

interface SectionOption {
  id: LogSection;
  label: string;
  icon: string;
  description: string;
  settingsKey: keyof ReportSectionModalProps["availableSections"];
}

const SECTION_OPTIONS: SectionOption[] = [
  {
    id: "period",
    label: "Cycle data",
    icon: "🌸",
    description: "Cycle phases, flow levels, and period tracking",
    settingsKey: "period",
  },
  {
    id: "bowel",
    label: "Stool logs",
    icon: "🧻",
    description: "Bristol Stool Scale types and bowel movements",
    settingsKey: "bowel",
  },
  {
    id: "symptoms",
    label: "Symptoms",
    icon: "🏷️",
    description: "General and period-related symptoms with intensity",
    settingsKey: "symptoms",
  },
  {
    id: "medicine",
    label: "Medications",
    icon: "💊",
    description: "Medicine logs with dosage and timing",
    settingsKey: "medicine",
  },
];

type QuickSelectOption = "last30" | "last90" | "alltime" | "custom";

export function ReportSectionModal({
  availableSections,
  onConfirm,
  onCancel,
}: ReportSectionModalProps) {
  // Get entries to find earliest date
  const { entries } = useEntries();
  const revision = useEntriesRevision();
  const renderKey = useFreshData();

  // Find the earliest entry date
  const earliestEntryDate = useMemo(() => {
    if (entries.length === 0) return "2000-01-01";

    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sortedEntries[0].date;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision, renderKey]);

  // Filter to only show sections enabled in settings
  const enabledSections = SECTION_OPTIONS.filter(
    (section) => availableSections[section.settingsKey]
  );

  // Track selected sections - default to none selected
  const [selected, setSelected] = useState<LogSection[]>([]);

  // Date range state
  const [quickSelect, setQuickSelect] = useState<QuickSelectOption>("last30");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Calculate date range based on quick select
  const getDateRange = (): { start: string; end: string } | null => {
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];

    if (quickSelect === "last30") {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      return {
        start: startDate.toISOString().split("T")[0],
        end: endDate,
      };
    } else if (quickSelect === "last90") {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 90);
      return {
        start: startDate.toISOString().split("T")[0],
        end: endDate,
      };
    } else if (quickSelect === "alltime") {
      // Use the earliest entry date to capture all user data
      return {
        start: earliestEntryDate,
        end: endDate,
      };
    } else if (quickSelect === "custom") {
      if (!customStartDate || !customEndDate) {
        return null;
      }
      // Validate that start is before end
      if (new Date(customStartDate) > new Date(customEndDate)) {
        return null;
      }
      return {
        start: customStartDate,
        end: customEndDate,
      };
    }
    return null;
  };

  // Toggle individual section
  const toggleSection = (sectionId: LogSection) => {
    setSelected((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Check if all categories are selected
  const allSelected = selected.length === enabledSections.length;

  // Toggle all categories
  const selectAllCategories = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(enabledSections.map((s) => s.id));
    }
  };

  // Handle confirm - must have at least one selection and valid date range
  const handleConfirm = () => {
    const dateRange = getDateRange();
    if (selected.length > 0 && dateRange) {
      onConfirm({
        sections: selected,
        dateRange,
      });
    }
  };

  const dateRange = getDateRange();
  const hasEntries = entries.length > 0;

  // Check if custom dates are in wrong order
  const hasDateOrderError =
    quickSelect === "custom" &&
    customStartDate &&
    customEndDate &&
    new Date(customStartDate) > new Date(customEndDate);

  // Check if either custom date is in the future (iOS Safari ignores max attribute)
  const today = new Date().toISOString().split("T")[0];
  const hasFutureDateError =
    quickSelect === "custom" &&
    ((customStartDate && customStartDate > today) ||
     (customEndDate && customEndDate > today));

  const isValid = selected.length > 0 && dateRange !== null && hasEntries && !hasFutureDateError;

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
            <button
              onClick={onCancel}
              className="inline-block px-6 py-3 rounded-lg bg-app-green text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-app-charcoal/40 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[calc(100vh-4rem)] bg-app-white rounded-2xl shadow-xl my-8 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-app-border flex-shrink-0">
          <h2 className="text-xl font-bold text-app-charcoal">
            Generate Health Report
          </h2>
          <p className="text-sm text-app-gray mt-1">
            Configure your health report. Select a report period and categories
          </p>
          {/* No entries warning */}
          {!hasEntries && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 text-center">
                ⚠️ Please submit at least one entry before generating a report.
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Date Range Picker */}
          <div>
            <h3 className="text-sm font-semibold text-app-charcoal mb-3">
              Report Period
            </h3>

            {/* Quick Select Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setQuickSelect("last30")}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  quickSelect === "last30"
                    ? "bg-app-teal text-white"
                    : "bg-app-cream text-app-charcoal hover:bg-app-border"
                }`}
              >
                Last 30 days
              </button>
              <button
                type="button"
                onClick={() => setQuickSelect("last90")}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  quickSelect === "last90"
                    ? "bg-app-teal text-white"
                    : "bg-app-cream text-app-charcoal hover:bg-app-border"
                }`}
              >
                Last 3 months
              </button>
              <button
                type="button"
                onClick={() => setQuickSelect("alltime")}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  quickSelect === "alltime"
                    ? "bg-app-teal text-white"
                    : "bg-app-cream text-app-charcoal hover:bg-app-border"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setQuickSelect("custom")}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  quickSelect === "custom"
                    ? "bg-app-teal text-white"
                    : "bg-app-cream text-app-charcoal hover:bg-app-border"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Date Inputs */}
            {quickSelect === "custom" && (
              <div className="grid grid-cols-2 gap-x-4 sm:gap-x-2 mt-3">
                <div className="min-w-0">
                  <label className="block text-xs text-app-gray mb-1 text-center">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`w-full min-w-0 py-2 px-1 sm:px-3 rounded-lg border bg-app-white text-app-charcoal text-sm text-center focus:outline-none focus:ring-2 ${
                      hasDateOrderError
                        ? "border-red-400 focus:ring-red-300"
                        : "border-app-border focus:ring-app-teal"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs text-app-gray mb-1 text-center">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`w-full min-w-0 py-2 px-1 sm:px-3 rounded-lg border bg-app-white text-app-charcoal text-sm text-center focus:outline-none focus:ring-2 ${
                      hasDateOrderError
                        ? "border-red-400 focus:ring-red-300"
                        : "border-app-border focus:ring-app-teal"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Date order error message */}
            {hasDateOrderError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 text-center">
                  End date must be after start date
                </p>
              </div>
            )}

            {/* Future date error message */}
            {!hasDateOrderError && hasFutureDateError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 text-center">
                  Dates cannot be in the future
                </p>
              </div>
            )}

            {/* Date Range Display - only show if there are entries */}
            {dateRange && hasEntries && (
              <div className="mt-3 p-3 bg-app-cream/50 rounded-lg">
                <p className="text-xs text-app-gray">
                  Report will include data from{" "}
                  <span className="font-medium text-app-charcoal">
                    {new Date(dateRange.start).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-app-charcoal">
                    {new Date(dateRange.end).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Data Categories - 2x2 Grid */}
          <div>
            <h3 className="text-sm font-semibold text-app-charcoal mb-3">
              Data Categories
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {enabledSections.map((section) => {
                const isSelected = selected.includes(section.id);
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`p-3 rounded-lg text-center transition-all relative ${
                      isSelected
                        ? "bg-app-teal/10 border-2 border-app-teal"
                        : "bg-app-cream/50 border-2 border-transparent hover:border-app-border"
                    }`}
                  >
                    {/* Checkmark indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-app-teal flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-white"
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
                      </div>
                    )}

                    {/* Icon and Label */}
                    <span className="text-2xl block mb-1">{section.icon}</span>
                    <span className="font-medium text-app-charcoal text-sm block">
                      {section.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* All Categories Toggle */}
        {enabledSections.length > 1 && (
          <div className="px-6 pb-4 flex-shrink-0">
            <button
              type="button"
              onClick={selectAllCategories}
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
                  All Selected
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
        <div className="p-6 pt-4 space-y-3 flex-shrink-0 border-t border-app-border">
          {/* Validation message */}
          {hasEntries && !isValid && (
            <p className="text-xs text-app-gray text-center">
              {selected.length === 0
                ? "Select at least one category to continue"
                : hasDateOrderError
                  ? "Fix the date range to continue"
                  : hasFutureDateError
                    ? "Dates cannot be in the future"
                    : "Please select a valid date range"}
            </p>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
              !isValid
                ? "bg-app-gray/50 cursor-not-allowed"
                : "bg-app-teal hover:opacity-90"
            }`}
          >
            Generate PDF
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="block w-full py-3 rounded-xl text-center font-medium text-app-gray hover:text-app-charcoal hover:bg-app-cream transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
