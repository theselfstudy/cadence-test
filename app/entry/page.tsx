"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/stores/useSettings";
import { useEntries } from "@/stores/useEntries";
import type { MedicineCategory, LogSection } from "@/types";
import { LogSelectionModal, SegmentedIntensityBar } from "@/components/entry";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { WarningModal } from "@/components/ui/WarningModal";
import { getLocalDateString } from '@/lib/dateUtils';
import { detectCycleBoundaries } from '@/lib/monthlyUtils';
import { calculateThisCycleData } from '@/lib/insightUtils';
import { useButtonRateLimit } from '@/hooks/useRateLimit';
import { SecureTextarea, SecureTextInput } from '@/components/ui/SecureInput';
import { sanitizeText, isTextSafe } from '@/lib/inputSecurity';


import {
  BRISTOL_TYPES,
  POST_BOWEL_FEELINGS,
  CYCLE_PHASES,
  FLOW_LEVELS,
  PAIN_SCALE_INFO,
  PRODUCT_OPTIONS,
  MEDICINE_CATEGORIES,
} from "@/lib/constants";

import type {
  TimeValue,
  BristolScaleType,
  PostBowelFeeling,
  CyclePhase,
  SymptomEntry,
  ProductUsageEntry,
  CustomProduct,
  ProductTracking,
  Medicine, 
  MedicineLogEntry,
  StoredEntry, 
  PainScaleType,
} from "@/types";

function getCurrentTime(is24Hour: boolean): TimeValue {
  const now = new Date();
  let hour = now.getHours();
  const minute = now.getMinutes();
  let period: "AM" | "PM" = "AM";

  if (!is24Hour) {
    period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
  }

  return { hour, minute, period };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Checks if a product usage entry is complete based on product requirements.
 * - Products with sizes (pad, tampon, liner): Must have a size selected
 * - Products with custom products (cup, disc, other): Must have a customProductId selected
 */
function isProductUsageComplete(
  usage: ProductUsageEntry,
  productOptions: typeof PRODUCT_OPTIONS,
  customProducts: Record<string, CustomProduct[]>
): { isComplete: boolean; missingField: 'size' | 'customProduct' | null } {
  const product = productOptions.find((p) => p.type === usage.productType);
  if (!product) return { isComplete: true, missingField: null };

  // Check if this product requires a custom product selection
  if (product.allowCustomProducts) {
    const productCustomItems = customProducts[usage.productType] ?? [];
    if (productCustomItems.length > 0 && !usage.customProductId) {
      return { isComplete: false, missingField: 'customProduct' };
    }
  }

  // Check if this product requires a size selection
  // Only require size if the product has predefined sizes
  if (product.hasSizes && product.sizes && product.sizes.length > 0 && !usage.size) {
    return { isComplete: false, missingField: 'size' };
  }

  return { isComplete: true, missingField: null };
}

// =============================================================================
// MEDICINE CATEGORY COLORS
// =============================================================================

const MEDICINE_CATEGORY_COLORS: Record<MedicineCategory, { bg: string; text: string }> = {
  bowel: { bg: "bg-app-plumb", text: "text-app-plumb" },
  period: { bg: "bg-app-red", text: "text-app-red" },
  symptom: { bg: "bg-app-teal", text: "text-app-teal" },
  other: { bg: "bg-app-gray", text: "text-app-gray" },
};


// =============================================================================
// CONSOLIDATED MEDICINE LOG COMPONENT
// =============================================================================

function ConsolidatedMedicineLog({
  medicines,
  loggedMedicines,
  onChange,
  is24Hour,
  onCustomInputValidation,
  onTimeValidation,
}: ConsolidatedMedicineLogProps) {
  const [customDosageInputs, setCustomDosageInputs] = useState<Record<string, string>>({});
  // Track editing state for time inputs: key is `${medicineId}-hour` or `${medicineId}-minute`
  const [editingTimeInputs, setEditingTimeInputs] = useState<Record<string, string>>({});
  // Track time validation errors: key is `${medicineId}-hour` or `${medicineId}-minute`
  const [timeErrors, setTimeErrors] = useState<Record<string, string | null>>({});

  // Valid hour range based on time format
  const minHour = 0;
  const maxHour = is24Hour ? 23 : 12;

  // Notify parent of validation state whenever custom inputs change
  useEffect(() => {
    if (onCustomInputValidation) {
      const hasError = Object.values(customDosageInputs).some((input) => input && input.length > 60);
      onCustomInputValidation(hasError);
    }
  }, [customDosageInputs, onCustomInputValidation]);

  // Notify parent of time validation state
  useEffect(() => {
    if (onTimeValidation) {
      const hasError = Object.values(timeErrors).some((error) => error !== null);
      onTimeValidation(hasError);
    }
  }, [timeErrors, onTimeValidation]);

  if (medicines.length === 0) {
    return (
      <p className="text-sm text-app-gray italic">
        No medicines configured. Add medicines in Settings → Medicine Log.
      </p>
    );
  }

  const toggleMedicine = (medicine: Medicine) => {
    const exists = loggedMedicines.find((l) => l.medicineId === medicine.id);
    if (exists) {
      onChange(loggedMedicines.filter((l) => l.medicineId !== medicine.id));
      // Clear custom dosage input when deselecting
      setCustomDosageInputs((prev) => {
        const { [medicine.id]: _, ...rest } = prev;
        return rest;
      });
    } else {
      // Default to first dosage if available
      const defaultDosage = medicine.dosages && medicine.dosages.length > 0 
        ? medicine.dosages[0] 
        : "";
      onChange([
        ...loggedMedicines,
        {
          medicineId: medicine.id,
          medicineName: medicine.name,
          dosage: defaultDosage,
          time: medicine.timeSensitive ? getCurrentTime(is24Hour) : undefined,
        },
      ]);
    }
  };

  const updateLogEntry = (medicineId: string, updates: Partial<MedicineLogEntry>) => {
    onChange(
      loggedMedicines.map((l) =>
        l.medicineId === medicineId ? { ...l, ...updates } : l
      )
    );
  };

  const handleCustomDosageAdd = (medicineId: string) => {
    const customDosage = customDosageInputs[medicineId]?.trim();
    if (!customDosage) return;
    
    updateLogEntry(medicineId, { dosage: customDosage });
    setCustomDosageInputs((prev) => ({ ...prev, [medicineId]: "" }));
  };

  return (
    <div className="space-y-4">
      {/* Category Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {MEDICINE_CATEGORIES.filter((cat) => 
          medicines.some((m) => m.categories.includes(cat.value))
        ).map((cat) => (
          <div key={cat.value} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${MEDICINE_CATEGORY_COLORS[cat.value]?.bg ?? 'bg-app-gray'}`} />
            <span className="text-app-gray">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Medicine Selection */}
      <div className="flex flex-wrap gap-2">
        {medicines.map((medicine) => {
          const isSelected = loggedMedicines.some((l) => l.medicineId === medicine.id);
          return (
            <button
              key={medicine.id}
              type="button"
              onClick={() => toggleMedicine(medicine)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-app-green/30 text-app-green"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green"
              }`}
            >
              {/* Category dots */}
              <span className="flex items-center gap-0.5">
                {medicine.categories.map((cat) => (
                  <span
                    key={cat}
                    className={`w-2 h-2 rounded-full ${MEDICINE_CATEGORY_COLORS[cat]?.bg ?? 'bg-app-gray'} ${
                      isSelected ? "opacity-70" : ""
                    }`}
                    title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  />
                ))}
              </span>
              {medicine.name}
              {medicine.timeSensitive && " ⏰"}
            </button>
          );
        })}
      </div>

      {/* Details for Selected Medicines */}
      {loggedMedicines.length > 0 && (
        <div className="space-y-2 pt-2">
          {loggedMedicines.map((entry) => {
            const medicine = medicines.find((m) => m.id === entry.medicineId);
            if (!medicine) return null;

            const hasPredefinedDosages = medicine.dosages && medicine.dosages.length > 0;
            const customInput = customDosageInputs[medicine.id] || "";

            return (
              <div
                key={entry.medicineId}
                className="p-3 bg-app-green/5 rounded-lg"
              >
                {/* Medicine Name with Category Dots */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-0.5">
                    {medicine.categories.map((cat) => (
                      <span
                        key={cat}
                        className={`w-2.5 h-2.5 rounded-full ${MEDICINE_CATEGORY_COLORS[cat]?.bg ?? 'bg-app-gray'}`}
                        title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                      />
                    ))}
                  </span>
                  <p className="text-sm font-medium text-app-charcoal">
                    {medicine.name}
                  </p>
                </div>

                {/* Dosage Selection - Chip Based */}
                <div className="mb-3">
                  <label className="block text-xs text-app-gray mb-2">Dosage:</label>
                  
                  {hasPredefinedDosages ? (
                    <div className="space-y-2">
                      {/* Predefined Dosage Chips */}
                      <div className="flex flex-wrap gap-2">
                        {medicine.dosages!.map((dosage) => (
                          <button
                            key={dosage}
                            type="button"
                            onClick={() => updateLogEntry(entry.medicineId, { dosage })}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              entry.dosage === dosage
                                ? "bg-app-green/30 text-app-green"
                                : "bg-app-white text-app-charcoal border border-app-border hover:border-app-green"
                            }`}
                          >
                            {dosage}
                          </button>
                        ))}
                        
                        {/* Custom option indicator */}
                        {entry.dosage && !medicine.dosages!.includes(entry.dosage) && (
                          <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-app-green/30 text-app-green">
                            {entry.dosage} (custom)
                          </span>
                        )}
                      </div>
                      
                      {/* Custom Dosage Input */}
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-app-gray">or custom:</span>
                        <div className="flex-1">
                          <SecureTextInput
                            value={customInput}
                            onChange={(value) => setCustomDosageInputs((prev) => ({
                              ...prev,
                              [medicine.id]: value,
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCustomDosageAdd(medicine.id);
                              }
                            }}
                            placeholder="Enter custom dosage"
                            showCharCount={true}
                            className="text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCustomDosageAdd(medicine.id)}
                          disabled={!customInput.trim() || customInput.length > 60}
                          className="px-3 py-1.5 rounded-lg bg-app-green/20 text-app-charcoal text-sm font-medium hover:bg-app-green/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          + Custom
                        </button>
                      </div>
                    </div>
                  ) : (
                    // No predefined dosages - just show input
                    <div className="flex gap-2">
                      <SecureTextInput
                        value={entry.dosage}
                        onChange={(value) =>
                          updateLogEntry(entry.medicineId, { dosage: value })
                        }
                        placeholder="e.g., 2 pills, 200mg"
                        showCharCount={true}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Time Input (if time-sensitive) */}
                {medicine.timeSensitive && (
                  <div>
                    <label className="block text-xs text-app-gray mb-1">Time taken: *</label>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={
                          `${entry.medicineId}-hour` in editingTimeInputs
                            ? editingTimeInputs[`${entry.medicineId}-hour`]
                            : (entry.time?.hour ?? 12).toString().padStart(2, "0")
                        }
                        onChange={(e) => {
                          const input = e.target.value;
                          const numericOnly = input.replace(/[^0-9]/g, "").slice(0, 2);
                          setEditingTimeInputs((prev) => ({ ...prev, [`${entry.medicineId}-hour`]: numericOnly }));
                          const numValue = numericOnly === "" ? 0 : Number(numericOnly);
                          updateLogEntry(entry.medicineId, {
                            time: { ...entry.time!, hour: numValue },
                          });
                          // Validate hour
                          if (numValue < minHour || numValue > maxHour) {
                            setTimeErrors((prev) => ({
                              ...prev,
                              [`${entry.medicineId}-hour`]: is24Hour
                                ? "Hour must be 0-23"
                                : "Hour must be 0-12",
                            }));
                          } else {
                            setTimeErrors((prev) => ({ ...prev, [`${entry.medicineId}-hour`]: null }));
                          }
                        }}
                        onFocus={(e) => {
                          setEditingTimeInputs((prev) => ({ ...prev, [`${entry.medicineId}-hour`]: (entry.time?.hour ?? 12).toString() }));
                          setTimeout(() => e.target.select(), 0);
                        }}
                        onBlur={() => {
                          setEditingTimeInputs((prev) => {
                            const { [`${entry.medicineId}-hour`]: _hour, ...rest } = prev;
                            void _hour;
                            return rest;
                          });
                        }}
                        className={`w-14 sm:w-16 px-2 py-2 rounded-lg border bg-app-white focus:outline-none focus:ring-2 text-center text-sm ${
                          timeErrors[`${entry.medicineId}-hour`]
                            ? "border-red-500 focus:ring-red-300"
                            : "border-app-border focus:ring-app-taupe"
                        }`}
                      />
                      <span className="text-app-gray font-bold">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={
                          `${entry.medicineId}-minute` in editingTimeInputs
                            ? editingTimeInputs[`${entry.medicineId}-minute`]
                            : (entry.time?.minute ?? 0).toString().padStart(2, "0")
                        }
                        onChange={(e) => {
                          const input = e.target.value;
                          const numericOnly = input.replace(/[^0-9]/g, "").slice(0, 2);
                          setEditingTimeInputs((prev) => ({ ...prev, [`${entry.medicineId}-minute`]: numericOnly }));
                          const numValue = numericOnly === "" ? 0 : Number(numericOnly);
                          updateLogEntry(entry.medicineId, {
                            time: { ...entry.time!, minute: numValue },
                          });
                          // Validate minute
                          if (numValue < 0 || numValue > 59) {
                            setTimeErrors((prev) => ({
                              ...prev,
                              [`${entry.medicineId}-minute`]: "Minutes must be 0-59",
                            }));
                          } else {
                            setTimeErrors((prev) => ({ ...prev, [`${entry.medicineId}-minute`]: null }));
                          }
                        }}
                        onFocus={(e) => {
                          setEditingTimeInputs((prev) => ({ ...prev, [`${entry.medicineId}-minute`]: (entry.time?.minute ?? 0).toString() }));
                          setTimeout(() => e.target.select(), 0);
                        }}
                        onBlur={() => {
                          setEditingTimeInputs((prev) => {
                            const { [`${entry.medicineId}-minute`]: _minute, ...rest } = prev;
                            void _minute;
                            return rest;
                          });
                        }}
                        className={`w-14 sm:w-16 px-2 py-2 rounded-lg border bg-app-white focus:outline-none focus:ring-2 text-center text-sm ${
                          timeErrors[`${entry.medicineId}-minute`]
                            ? "border-red-500 focus:ring-red-300"
                            : "border-app-border focus:ring-app-taupe"
                        }`}
                      />
                      {!is24Hour && (
                        <select
                          value={entry.time?.period ?? "AM"}
                          onChange={(e) =>
                            updateLogEntry(entry.medicineId, {
                              time: { ...entry.time!, period: e.target.value as "AM" | "PM" },
                            })
                          }
                          className="px-2 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe text-sm"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      )}
                    </div>
                    {/* Time validation error messages */}
                    {(timeErrors[`${entry.medicineId}-hour`] || timeErrors[`${entry.medicineId}-minute`]) && (
                      <div className="mt-1 text-center sm:text-left">
                        {timeErrors[`${entry.medicineId}-hour`] && (
                          <p className="text-xs text-red-500">{timeErrors[`${entry.medicineId}-hour`]}</p>
                        )}
                        {timeErrors[`${entry.medicineId}-minute`] && (
                          <p className="text-xs text-red-500">{timeErrors[`${entry.medicineId}-minute`]}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EntryPage() {
  const router = useRouter();
  const { timeFormat, symptoms, periodTracking, stoolTracking, medicineTracking, isGoogleSheetConnected } = useSettings();
  const { addEntry, entries } = useEntries();
  const is24Hour = timeFormat === "24h";

  // Rate limiting: Allow 5 submissions per minute
  const submitRateLimit = useButtonRateLimit({
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    key: 'entry-submit',
    storageType: 'localStorage'
  });

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalConfig, setSuccessModalConfig] = useState({
    title: "",
    description: "",
    secondaryText: "",
  });

  // Warning modal state for empty entries
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);

  // Warning modal state for end time earlier than start time
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // Safe access to settings
  const safeSymptoms = symptoms ?? {
    selected: [],
    custom: [],
    intensityTracking: { enabled: false, scaleType: "simple" },
  };
  const safePeriodTracking = periodTracking ?? {
    enabled: false,
    personalQuestions: false,
    periodSymptoms: [],
    customPeriodSymptoms: [],
  };

  const safeStoolTracking = stoolTracking ?? { enabled: false };
  const intensityEnabled = safeSymptoms.intensityTracking?.enabled ?? false;
  const painScaleType = safeSymptoms.intensityTracking?.scaleType ?? "simple";

  const PERIOD_NOTICE_DISMISS_KEY = 'cadence-period-notice-dismissed';
  const [isPeriodNoticeDismissed, setIsPeriodNoticeDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(PERIOD_NOTICE_DISMISS_KEY) === getLocalDateString();
  });
  const dismissPeriodNotice = () => {
    localStorage.setItem(PERIOD_NOTICE_DISMISS_KEY, getLocalDateString());
    setIsPeriodNoticeDismissed(true);
  };

  const periodPrediction = useMemo(() => {
    if (!safePeriodTracking.enabled) return null;
    const allCycles = detectCycleBoundaries(entries);
    const completeCycles = allCycles.filter(c => !c.isOngoing && c.length !== null);
    if (completeCycles.length < 6) return null;
    const currentCycle = allCycles.find(c => c.isOngoing) ?? null;
    if (!currentCycle) return null;
    const cycleData = calculateThisCycleData(currentCycle, allCycles, entries);
    if (!cycleData?.periodTypicallyStarts || !cycleData?.daysUntilPeriodEstimate) return null;
    const [daysUntilMin, daysUntilMax] = cycleData.daysUntilPeriodEstimate;
    const { dayRange, confidence } = cycleData.periodTypicallyStarts;
    if (confidence < 0.7) return null;
    const daysOverdue = Math.max(0, cycleData.cycleDay - dayRange[1]);
    if (daysOverdue > 7) return null; // too far past max, back off
    if (daysOverdue === 0 && daysUntilMin > 7) return null; // too far ahead
    return { daysUntilMin, daysUntilMax };
  }, [entries, safePeriodTracking.enabled]);

  const [loggedMedicines, setLoggedMedicines] = useState<MedicineLogEntry[]>([]);

  const [productUsage, setProductUsage] = useState<ProductUsageEntry[]>([]);

  // Date selection - "today" or "yesterday"
  const [selectedDateOption, setSelectedDateOption] = useState<"today" | "yesterday">("today");

  // Log section selection - null means modal is open, array means user has selected
  const [selectedLogSections, setSelectedLogSections] = useState<LogSection[] | null>(null);

// Safe access
const safeMedicineTracking = medicineTracking ?? { enabled: false, medicines: [] };

  // Combined list of all period-related symptoms (selected + custom)
  const periodSymptomsList = [
    ...(safePeriodTracking.periodSymptoms ?? []),
    ...(safePeriodTracking.customPeriodSymptoms ?? []),
  ];

  const [cyclePhase, setCyclePhase] = useState<CyclePhase | null>(null);
  // Check if menstrual phase is selected
  const isMenstrualPhase = cyclePhase === "menstrual";

  // Helper to check if a section should be displayed
  const shouldShowSection = (section: LogSection): boolean => {
    if (!selectedLogSections) return false;
    return selectedLogSections.includes(section);
  };

  // Compute available sections based on settings
  const availableSections = {
    symptoms: safeSymptoms.selected.length > 0,
    bowel: safeStoolTracking.enabled,
    period: safePeriodTracking.enabled,
    medicine: safeMedicineTracking.enabled && safeMedicineTracking.medicines.length > 0,
  };

  // Handle modal confirmation
  const handleLogSelectionConfirm = (sections: LogSection[]) => {
    setSelectedLogSections(sections);
  };

  const allSymptomsToShow = Array.from(
    new Set([
      // General symptoms - always show
      // BUT exclude custom period symptoms (they should ONLY show when menstrual)
      ...safeSymptoms.selected.filter(
        (symptom) => !(safePeriodTracking.customPeriodSymptoms ?? []).includes(symptom)
      ),
      
      // All period symptoms (default + custom) - only when menstrual
      ...(isMenstrualPhase ? periodSymptomsList : []),
    ])
  );

  // Form state
  const [startTime, setStartTime] = useState<TimeValue>(getCurrentTime(is24Hour));
  const [endTime, setEndTime] = useState<TimeValue>(getCurrentTime(is24Hour));
  const [bristolType, setBristolType] = useState<BristolScaleType | null>(null);
  const [postFeeling, setPostFeeling] = useState<PostBowelFeeling | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomEntry[]>([]);
  const [flowLevel, setFlowLevel] = useState<string | null>(null);
  const [periodPainLevel, setPeriodPainLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [notesWarning, setNotesWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCustomDosageInputError, setHasCustomDosageInputError] = useState(false);
  const [hasStartTimeError, setHasStartTimeError] = useState(false);
  const [hasEndTimeError, setHasEndTimeError] = useState(false);
  const [hasMedicineTimeError, setHasMedicineTimeError] = useState(false);
  const [logFlowStartTime, setLogFlowStartTime] = useState(false);
  const [flowStartTime, setFlowStartTime] = useState<TimeValue>(getCurrentTime(is24Hour));
  const [hasFlowStartTimeError, setHasFlowStartTimeError] = useState(false);
  const [showIncompleteSectionsWarning, setShowIncompleteSectionsWarning] = useState(false);
  const [showSectionBorders, setShowSectionBorders] = useState(false);

  // Easter egg: update end time when brick breaker game is closed
  useEffect(() => {
    const handleGameClosed = () => setEndTime(getCurrentTime(is24Hour));
    window.addEventListener("cadence-game-closed", handleGameClosed);
    return () => window.removeEventListener("cadence-game-closed", handleGameClosed);
  }, [is24Hour]);

  // One-off custom symptoms (per-entry only, not persisted globally)
  const [oneOffSymptoms, setOneOffSymptoms] = useState<string[]>([]);
  const [oneOffSymptomInput, setOneOffSymptomInput] = useState("");
  const [oneOffSymptomInputError, setOneOffSymptomInputError] = useState<string | null>(null);

  // Validation: Check if notes exceeds character limit
  const notesExceedsLimit = notes.length > 500;

  // Validation: Check if any medicine dosage exceeds character limit
  const hasMedicineDosageError = loggedMedicines.some((entry) => {
    return entry.dosage && entry.dosage.length > 60;
  });

  // Toggle symptom selection
  const toggleSymptom = (symptomName: string) => {
    const exists = selectedSymptoms.find((s) => s.name === symptomName);
    const isPeriodRelated = periodSymptomsList.includes(symptomName);

    if (exists) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s.name !== symptomName));
    } else {
      // Set initial intensity based on pain scale type:
      // - Mankoski scale starts at 0
      // - Simple scale starts at 1
      const initialIntensity = intensityEnabled 
        ? (painScaleType === "mankoski" ? 0 : 1)
        : undefined;
      
      setSelectedSymptoms([
        ...selectedSymptoms,
        {
          name: symptomName,
          intensity: initialIntensity,
          isPeriodRelated: isMenstrualPhase && isPeriodRelated,
        },
      ]);
    }
  };

  // Update symptom intensity
  const updateSymptomIntensity = (symptomName: string, intensity: number) => {
    setSelectedSymptoms(
      selectedSymptoms.map((s) =>
        s.name === symptomName ? { ...s, intensity } : s
      )
    );
  };

    // Handle notes change with security check
  const handleNotesChange = (value: string) => {
    setNotes(value);
    const safetyCheck = isTextSafe(value);
    if (!safetyCheck.isSafe) {
      setNotesWarning(safetyCheck.reason || "Some characters were detected that aren't allowed for security reasons.");
    } else {
      setNotesWarning(null);
    }
  };

  // Handle one-off symptom input change
  const handleOneOffSymptomInputChange = (value: string) => {
    setOneOffSymptomInput(value);
    // Clear error when user starts typing again
    if (oneOffSymptomInputError) {
      setOneOffSymptomInputError(null);
    }
  };

  // Check if the one-off symptom input is valid for adding
  const isOneOffInputValid = (): boolean => {
    const trimmed = oneOffSymptomInput.trim();
    if (!trimmed) return false;
    if (trimmed.length > 60) return false;
    const safetyCheck = isTextSafe(trimmed);
    if (!safetyCheck.isSafe) return false;
    return true;
  };

  // Add a one-off symptom
  const handleAddOneOffSymptom = () => {
    const trimmed = oneOffSymptomInput.trim();

    // Validation checks
    if (!trimmed) {
      setOneOffSymptomInputError("Please enter a symptom name");
      return;
    }

    if (trimmed.length > 60) {
      setOneOffSymptomInputError("Symptom name must be 60 characters or less");
      return;
    }

    const safetyCheck = isTextSafe(trimmed);
    if (!safetyCheck.isSafe) {
      setOneOffSymptomInputError(safetyCheck.reason || "Invalid characters detected");
      return;
    }

    // Optional de-dupe check (case-insensitive)
    const alreadyExists = oneOffSymptoms.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      setOneOffSymptomInputError("This symptom has already been added");
      return;
    }

    // Add the symptom
    setOneOffSymptoms([...oneOffSymptoms, trimmed]);
    setOneOffSymptomInput("");
    setOneOffSymptomInputError(null);
  };

  // Remove a one-off symptom
  const handleRemoveOneOffSymptom = (symptomToRemove: string) => {
    setOneOffSymptoms(oneOffSymptoms.filter((s) => s !== symptomToRemove));
  };

  // Handle Enter key for adding one-off symptom
  const handleOneOffSymptomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isOneOffInputValid()) {
        handleAddOneOffSymptom();
      }
    }
  };

  // Helper to convert TimeValue to minutes since midnight for comparison
  const timeToMinutes = (time: TimeValue): number => {
    let hour = time.hour;
    if (!is24Hour) {
      // Convert 12-hour format to 24-hour for comparison
      if (time.period === "AM" && hour === 12) {
        hour = 0;
      } else if (time.period === "PM" && hour !== 12) {
        hour += 12;
      }
    }
    return hour * 60 + time.minute;
  };

  // Helper to check if end time is earlier than start time
  const isEndTimeBeforeStartTime = (): boolean => {
    return timeToMinutes(endTime) < timeToMinutes(startTime);
  };

  // Helper to format TimeValue to string for storage
  const formatTimeToString = (time: TimeValue): string => {
    if (is24Hour) {
      return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
    }
    return `${time.hour}:${time.minute.toString().padStart(2, '0')} ${time.period}`;
  };

  // Helper to check if a selected section has no data filled in
  const isSectionIncomplete = (section: LogSection): boolean => {
    if (!selectedLogSections?.includes(section)) return false;
    switch (section) {
      case 'bowel':
        return bristolType === null || postFeeling === null;
      case 'period':
        return cyclePhase === null;
      case 'symptoms':
        return selectedSymptoms.length === 0;
      case 'medicine':
        return loggedMedicines.length === 0;
      default:
        return false;
    }
  };

  const hasIncompleteSections = (): boolean => {
    return (['bowel', 'period', 'symptoms', 'medicine'] as LogSection[]).some(s =>
      isSectionIncomplete(s)
    );
  };

  const getIncompleteSectionLabels = (): string[] => {
    const labels: Record<string, string> = {
      bowel: 'Bowel Movement',
      period: 'Cycle Log',
      symptoms: 'General Symptoms',
      medicine: 'Medicine Log',
    };
    return (['bowel', 'period', 'symptoms', 'medicine'] as LogSection[])
      .filter(s => isSectionIncomplete(s))
      .map(s => labels[s]);
  };

  // Helper to check if the entry is empty (no selections made)
  const isEntryEmpty = (): boolean => {
    const hasSymptoms = selectedSymptoms.length > 0;
    const hasOneOffSymptoms = oneOffSymptoms.length > 0;
    const hasBowelData = bristolType !== null || postFeeling !== null;
    const hasPeriodData = cyclePhase !== null || flowLevel !== null || productUsage.length > 0;
    const hasMedicineData = loggedMedicines.length > 0;
    const hasNotes = notes.trim().length > 0;

    return !hasSymptoms && !hasOneOffSymptoms && !hasBowelData && !hasPeriodData && !hasMedicineData && !hasNotes;
  };

  // Core submission logic (extracted to be reused from warning confirmation)
  const performSubmission = async () => {
    setIsSubmitting(true);

    // Build symptom intensities map (separating general vs period-related)
    const symptomIntensities: Record<string, number | null> = {};
    const periodSymptomIntensities: Record<string, number | null> = {};

    for (const symptom of selectedSymptoms) {
      const isPeriodRelated = periodSymptomsList.includes(symptom.name);
      if (isPeriodRelated && isMenstrualPhase) {
        periodSymptomIntensities[symptom.name] = symptom.intensity ?? null;
      } else {
        symptomIntensities[symptom.name] = symptom.intensity ?? null;
      }
    }

    // Medicine logs from consolidated section
    const allMedicineLogs = loggedMedicines;

    // Calculate the date based on selected option
    const entryDate = selectedDateOption === "today"
      ? getLocalDateString()
      : getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 1)));

    // Build the stored entry in the format expected by the entry store
    const entryData: Omit<StoredEntry, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
      date: entryDate, // YYYY-MM-DD format in local timezone
      startTime: formatTimeToString(startTime),
      endTime: formatTimeToString(endTime),
      painScale: painScaleType as PainScaleType,
      symptomIntensities,
      periodSymptomIntensities,
      cyclePhase: safePeriodTracking.enabled ? cyclePhase : null,
      periodFlow: isMenstrualPhase && flowLevel
        ? (logFlowStartTime ? `${flowLevel} @ ${formatTimeToString(flowStartTime)}` : flowLevel)
        : null,
      productUsage: isMenstrualPhase ? productUsage : [],
      stoolType: safeStoolTracking.enabled ? bristolType : null,
      stoolFeeling: safeStoolTracking.enabled ? postFeeling : null,
      medicineLog: allMedicineLogs,
      notes: notes ? sanitizeText(notes) : '',
      oneOffSymptoms: oneOffSymptoms,
    };

    // Always save locally - no OAuth flow
    const savedEntry = addEntry(entryData);
    console.log("Entry saved to localStorage:", savedEntry.id);

    setIsSubmitting(false);

    setSuccessModalConfig({
      title: "Entry Logged!",
      description: "Your entry has been saved to this device.",
      secondaryText: isGoogleSheetConnected
        ? "It will sync to your Google Sheet automatically."
        : "Connect a Google Sheet in Settings to back up your entries.",
    });
    setShowSuccessModal(true);
  };

  // Runs validations that happen after the incomplete-sections check, then submits
  const continueSubmission = async () => {
    const notesCheck = isTextSafe(notes);
    if (!notesCheck.isSafe) {
      alert(notesCheck.reason || "Please remove any dangerous content from the notes field.");
      return;
    }

    // Validate product usage completeness (only if period section selected and in menstrual phase)
    if (shouldShowSection("period") && isMenstrualPhase && safePeriodTracking.productTracking?.enabled && productUsage.length > 0) {
      const customProducts = safePeriodTracking.productTracking.customProducts ?? {};
      const incompleteProducts = productUsage.filter((usage) => {
        const validation = isProductUsageComplete(usage, PRODUCT_OPTIONS, customProducts);
        return !validation.isComplete;
      });

      if (incompleteProducts.length > 0) {
        const productNames = incompleteProducts
          .map((p) => {
            const product = PRODUCT_OPTIONS.find((opt) => opt.type === p.productType);
            return product?.label ?? p.productType;
          })
          .join(", ");
        alert(`Please complete the selection for: ${productNames}`);
        return;
      }
    }

    await performSubmission();
  };

  const handleSubmit = async () => {
    // Rate limit check first - attempt to record the click
    if (!submitRateLimit.attempt()) {
      alert(`Please wait ${submitRateLimit.getFormattedTime()} before submitting again.`);
      return;
    }

    // Check if end time is earlier than start time
    if (isEndTimeBeforeStartTime()) {
      setShowTimeWarning(true);
      return;
    }

    // Check if entry is empty
    if (isEntryEmpty()) {
      setShowEmptyWarning(true);
      return;
    }

    // Check if any selected sections are incomplete
    if (hasIncompleteSections()) {
      setShowSectionBorders(true);
      setShowIncompleteSectionsWarning(true);
      return;
    }

    await continueSubmission();
  };

  // Handle confirmation from empty warning modal
  const handleEmptyWarningConfirm = async () => {
    setShowEmptyWarning(false);
    await performSubmission();
  };

  // Handle "Continue Submission" from incomplete sections modal
  const handleIncompleteSectionsConfirm = async () => {
    setShowIncompleteSectionsWarning(false);
    await continueSubmission();
  };

  // Reset form
  const resetForm = () => {
    setStartTime(getCurrentTime(is24Hour));
    setEndTime(getCurrentTime(is24Hour));
    setLogFlowStartTime(false);
    setFlowStartTime(getCurrentTime(is24Hour));
    setBristolType(null);
    setPostFeeling(null);
    setSelectedSymptoms([]);
    setCyclePhase(null);
    setFlowLevel(null);
    setPeriodPainLevel(null);
    setNotes("");
    setNotesWarning(null);
    setProductUsage([]);
    setLoggedMedicines([]);
    // Reset one-off symptoms
    setOneOffSymptoms([]);
    setOneOffSymptomInput("");
    setOneOffSymptomInputError(null);
    // Reset to show modal again for next entry
    setSelectedLogSections(null);
    setShowSectionBorders(false);
    setShowIncompleteSectionsWarning(false);
  };

  return (
    <>
      {/* Log Selection Modal - shows when no sections selected yet */}
      {selectedLogSections === null && (
        <LogSelectionModal
          availableSections={availableSections}
          onConfirm={handleLogSelectionConfirm}
        />
      )}
      <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8 px-4 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-app-charcoal">New Entry</h1>
          <p className="text-sm sm:text-base text-app-gray">
            {selectedDateOption === "today"
              ? formatDate(new Date())
              : formatDate(new Date(new Date().setDate(new Date().getDate() - 1)))}
          </p>
        </div>
        {/* Date Selection Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedDateOption("today")}
            className={`flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium transition-all ${
              selectedDateOption === "today"
                ? "bg-app-teal text-white"
                : "bg-app-gray/20 text-app-charcoal border border-app-border hover:border-app-teal"
            }`}
          >
            📅 Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDateOption("yesterday")}
            className={`flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium transition-all ${
              selectedDateOption === "yesterday"
                ? "bg-app-teal text-white"
                : "bg-app-gray/20 text-app-charcoal border border-app-border hover:border-app-teal"
            }`}
          >
            📆 Yesterday
          </button>
        </div>
      </div>

      {/* Start Time Card */}
      <section className="card">
        <TimeInputSection
          label="Start Time"
          value={startTime}
          onChange={setStartTime}
          is24Hour={is24Hour}
          onValidationChange={setHasStartTimeError}
        />
      </section>

      {/* Bristol Stool Scale - Conditional */}
      {safeStoolTracking.enabled && shouldShowSection("bowel") && (
      <section className={`card ${showSectionBorders && isSectionIncomplete('bowel') ? 'ring-2 ring-app-plumb' : ''}`}>
        <h2 className="text-lg font-semibold text-app-charcoal mb-4">
          🧻 Bristol Stool Scale
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-app-gray mb-3">
          <span>💡</span>
          <span>
            <a
              href="https://www.webmd.com/digestive-disorders/poop-chart-bristol-stool-scale"
              target="_blank"
              rel="noopener noreferrer"
              className="text-app-teal hover:text-app-teal/80 underline"
            >
              Click here to learn more about the Bristol Scale →
            </a>
          </span>
        </div>

        {/* Bristol Type - Circular Buttons */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-app-charcoal mb-3">
            What does it look like?
          </label>

          {/* Single-row scrollable container */}
          <div className="flex gap-2 overflow-x-auto pb-1 pt-2 pb-2 justify-center">
          {BRISTOL_TYPES.map((type) => (
            <button
              key={type.type}
              type="button"
              onClick={() => setBristolType(type.type as BristolScaleType)}
              className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full text-base sm:text-lg font-semibold transition-all ${
                bristolType === type.type
                  ? "bg-app-plumb text-white scale-110"
                  : "bg-app-cream text-app-charcoal border-2 border-app-border hover:border-app-plumb"
              }`}
            >
              {type.type}
            </button>
          ))}
          </div>
          {bristolType && (
            <div className="mt-3 p-3 bg-app-cream rounded-lg">
              <p className="text-sm font-medium text-app-charcoal">
                Type {bristolType}: {BRISTOL_TYPES.find((t) => t.type === bristolType)?.name}
              </p>
              <p className="text-sm text-app-gray mt-1">
                {BRISTOL_TYPES.find((t) => t.type === bristolType)?.description}
              </p>
            </div>
          )}
        </div>

        {/* Post Feeling - Oval Chips */}
        <div>
          <label className="block text-sm font-medium text-app-charcoal mb-3">
            How do you feel after?
          </label>
          <div className="flex flex-wrap gap-2">
            {POST_BOWEL_FEELINGS.map((feeling) => (
              <button
                key={feeling.value}
                type="button"
                onClick={() => setPostFeeling(feeling.value)}
                className={`mb-2 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  postFeeling === feeling.value
                    ? "bg-app-plumb text-white"
                    : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-plumb"
                }`}
              >
                {feeling.label}
              </button>
            ))}
          </div>
          {postFeeling && (
            <p className="mt-3 text-sm text-app-gray">
              {POST_BOWEL_FEELINGS.find((f) => f.value === postFeeling)?.description}
            </p>
          )}
        </div>
      </section>
    )}


      {/* Period Tracking - Conditional */}
      {safePeriodTracking.enabled && shouldShowSection("period") && (
        <section className={`card ${showSectionBorders && isSectionIncomplete('period') ? 'ring-2 ring-app-red' : ''}`}>
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">
            🌸 Cycle Log
          </h2>

          {/* Cycle Phase Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-app-charcoal mb-2">
              Where are you in your cycle?
            </label>
            <div className="flex items-center gap-1.5 text-xs text-app-gray mb-3">
              <span>💡</span>
              <span>
                <a
                  href="https://www.healthline.com/health/womens-health/stages-of-menstrual-cycle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-app-teal hover:text-app-teal/80 underline"
                >
                  Click here to learn more about period cycles →
                </a>
              </span>
            </div>

            {/* Period prediction hint - only when confidence is high, period is within 7 days, not yet started, and not dismissed today */}
            {periodPrediction !== null && !isPeriodNoticeDismissed && cyclePhase !== "menstrual" && (
              <div className="flex items-start justify-between sm:justify-start gap-3 mb-3 border-l-2 border-app-red/40 pl-3 py-0.5">
                <p className="text-sm text-app-gray leading-snug">
                  {periodPrediction.daysUntilMin > 0 ? (
                    <>Your period may start in the next{" "}
                    <span className="font-medium text-app-charcoal">
                      {periodPrediction.daysUntilMin}–{periodPrediction.daysUntilMax} days
                    </span>.</>
                  ) : (
                    <>Your period could start{" "}
                    <span className="font-medium text-app-charcoal">any day now</span>.</>
                  )}
                </p>
                <button
                  type="button"
                  onClick={dismissPeriodNotice}
                  className="text-app-gray/40 hover:text-app-gray transition-colors flex-shrink-0 leading-none pt-0.5"
                  aria-label="Dismiss period prediction"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {CYCLE_PHASES.map((phase) => {
                const isSelected = cyclePhase === phase.value;
                const bgColor =
                  phase.value === "menstrual"
                    ? "#791D1E"
                    : phase.value === "follicular"
                    ? "#104B55"
                    : phase.value === "ovulation"
                    ? "#3F592E"
                    : phase.value === "luteal"
                    ? "#C4B7A6"
                    : "#7A7A7A";
                return (
                  <button
                    key={phase.value}
                    type="button"
                    onClick={() => setCyclePhase(phase.value)}
                    className={`px-3 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      isSelected
                        ? "text-white"
                        : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green"
                    }`}
                    style={isSelected ? { backgroundColor: bgColor } : {}}
                  >
                    {phase.label}
                  </button>
                );
              })}
            </div>
            {cyclePhase && (
              <p className="mt-2 text-sm text-app-gray">
                {CYCLE_PHASES.find((p) => p.value === cyclePhase)?.description}
              </p>
            )}
          </div>

          {/* Flow Level - Only during Menstrual phase when enabled */}
          {safePeriodTracking.trackFlow && isMenstrualPhase && (
            <div className="pt-4 pb-4 border-t border-app-border">
              <label className="block text-sm font-medium text-app-charcoal mb-2">
                Flow Level
              </label>
              <div className="flex flex-wrap gap-2">
                {FLOW_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFlowLevel(level.value)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                      flowLevel === level.value
                        ? "bg-app-red text-white"
                        : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-red"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flow Start Time - Only during Menstrual phase when flow level selected */}
          {isMenstrualPhase && flowLevel && (
            <div className="pt-4 pb-4 border-t border-app-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-app-charcoal">
                  Log flow start time?
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !logFlowStartTime;
                    setLogFlowStartTime(next);
                    if (!next) setHasFlowStartTimeError(false);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    logFlowStartTime ? "bg-app-red" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      logFlowStartTime ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {logFlowStartTime && (
                <FlowStartTimeInput
                  value={flowStartTime}
                  onChange={setFlowStartTime}
                  is24Hour={is24Hour}
                  onValidationChange={setHasFlowStartTimeError}
                />
              )}
            </div>
          )}

          {/* Product Usage - Only during Menstrual phase when enabled */}
          {safePeriodTracking.productTracking?.enabled && isMenstrualPhase && (
            <div className="pt-4 pb-4 border-t border-app-border">
              <label className="block text-sm font-medium text-app-charcoal mb-3">
                Products Used
              </label>
              <ProductUsageEntrySection
                productTracking={safePeriodTracking.productTracking}
                selectedProductUsage={productUsage}
                onChange={setProductUsage}
              />
            </div>
          )}
        </section>
      )}

      {/* Symptoms Section */}
      {allSymptomsToShow.length > 0 && shouldShowSection("symptoms") && (
        <section className={`card ${showSectionBorders && isSectionIncomplete('symptoms') ? 'ring-2 ring-app-teal' : ''}`}>
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">
            🏷️ General Symptoms
          </h2>
          <p className="text-sm text-app-gray mb-3">
            Select any symptoms you&apos;re experiencing:
          </p>

          {/* Legend - only show during menstrual phase when there are period symptoms */}
          {isMenstrualPhase && periodSymptomsList.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-app-red"></span>
                <span className="text-app-gray">Period-related</span>
              </div>
            </div>
          )}

          {/* Symptom Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {allSymptomsToShow.map((symptom) => {
              const selected = selectedSymptoms.find((s) => s.name === symptom);
              const isPeriodRelated = periodSymptomsList.includes(symptom);
              const accentColor = isMenstrualPhase && isPeriodRelated ? "red" : "teal";

              const colorClasses = {
                red: {
                  selected: "bg-app-red text-white",
                  unselected: "bg-app-cream text-app-charcoal border border-app-border hover:border-app-red",
                },
                teal: {
                  selected: "bg-app-teal text-white",
                  unselected: "bg-app-cream text-app-charcoal border border-app-border hover:border-app-teal",
                },
              };

              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    selected
                      ? colorClasses[accentColor].selected
                      : colorClasses[accentColor].unselected
                  }`}
                >
                  {symptom}
                  {isMenstrualPhase && isPeriodRelated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-app-red ml-1 inline-block"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Intensity Selection for Selected Symptoms */}
          {intensityEnabled && selectedSymptoms.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-app-border">
            <p className="text-sm font-medium text-app-charcoal">Intensity levels:</p>
            {selectedSymptoms.map((symptom) => {
              const isPeriodRelated = periodSymptomsList.includes(symptom.name);
              const accentColor = isMenstrualPhase && isPeriodRelated ? "red" : "teal";
              const scaleInfo = PAIN_SCALE_INFO[painScaleType];
              const minValue = painScaleType === "mankoski" ? 0 : 1;
              const maxValue = 10;
              const currentValue = symptom.intensity ?? minValue;

              // Get description for current value
              const currentLevel = scaleInfo.levels.find((l) => l.value === currentValue);

              return (
                <div
                  key={symptom.name}
                  className={`p-3 rounded-lg ${
                    accentColor === "red" ? "bg-app-red/5" : "bg-app-teal/5"
                  }`}
                >
                  {/* Symptom name and current value */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-app-charcoal">
                      {symptom.name}
                    </span>
                    <span
                      className={`text-sm font-semibold px-2 py-0.5 rounded ${
                        accentColor === "red"
                          ? "bg-app-red/20 text-app-red"
                          : "bg-app-teal/20 text-app-teal"
                      }`}
                    >
                      {currentValue}
                    </span>
                  </div>

                  {/* Segmented intensity bar */}
                  <SegmentedIntensityBar
                    value={currentValue}
                    onChange={(newValue) => updateSymptomIntensity(symptom.name, newValue)}
                    min={minValue}
                    max={maxValue}
                    accentColor={accentColor}
                  />

                  {/* Scale endpoints labels */}
                  <div className="flex justify-between text-xs text-app-gray mt-2 px-1">
                    <span>{scaleInfo.levels[0].label.split(" — ")[0]}</span>
                    <span>{scaleInfo.levels[scaleInfo.levels.length - 1].label.split(" — ")[0]}</span>
                  </div>

                  {/* Description for selected value */}
                  {currentLevel && (
                    <div
                      className={`mt-3 p-2 rounded-md text-xs ${
                        accentColor === "red"
                          ? "bg-app-red/10 text-app-red"
                          : "bg-app-teal/10 text-app-teal"
                      }`}
                    >
                      <span>
                        <strong>{currentValue}:</strong> {currentLevel.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Inline Custom (one-off) Symptoms Section */}
        <div className="pt-4">
            {/* Inline divider with label */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 border-t border-app-border"></div>
              <span className="text-xs text-app-gray font-medium whitespace-nowrap">One-Off Symptoms</span>
              <div className="flex-1 border-t border-app-border"></div>
            </div>
            <div  className="flex items-center gap-3 mb-3"> <span className="text-xs text-app-gray whitespace-nowrap">Use this area to track any non-recurring symptoms</span></div>
            
            {/* Input row with + Add button */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <SecureTextInput
                  value={oneOffSymptomInput}
                  onChange={handleOneOffSymptomInputChange}
                  onKeyDown={handleOneOffSymptomKeyDown}
                  placeholder="Enter a symptom..."
                  showCharCount={true}
                  className="text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleAddOneOffSymptom}
                disabled={!isOneOffInputValid()}
                className="px-4 py-2 rounded-lg bg-app-plumb/70 text-white text-sm font-medium hover:bg-app-plumb/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                + Add
              </button>
            </div>

            {/* Error message */}
            {oneOffSymptomInputError && (
              <p className="text-xs text-app-red mb-3">{oneOffSymptomInputError}</p>
            )}

            {/* Added symptoms as pills */}
            {oneOffSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {oneOffSymptoms.map((symptom, index) => (
                  <span
                    key={`${symptom}-${index}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border-app-plumb/30 bg-app-plumb/10 border-2 text-app-plumb"
                  >
                    {symptom}
                    <button
                      type="button"
                      onClick={() => handleRemoveOneOffSymptom(symptom)}
                      className="ml-1 text-app-charcoal/70 hover:text-app-charcoal transition-colors"
                      aria-label={`Remove ${symptom}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Medicine Log - Consolidated */}
      {safeMedicineTracking.enabled && safeMedicineTracking.medicines.length > 0 && shouldShowSection("medicine") && (
        <section className={`card ${showSectionBorders && isSectionIncomplete('medicine') ? 'ring-2 ring-app-green/50' : ''}`}>
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">
            💊 Medicine Log
          </h2>
          <p className="text-sm text-app-gray mb-4">
            Log any medications you&apos;re taking with this entry:
          </p>
          <ConsolidatedMedicineLog
            medicines={safeMedicineTracking.medicines}
            loggedMedicines={loggedMedicines}
            onChange={setLoggedMedicines}
            is24Hour={is24Hour}
            onCustomInputValidation={setHasCustomDosageInputError}
            onTimeValidation={setHasMedicineTimeError}
          />
        </section>
      )}

      {/* Notes Section */}
      <section className="card">
        <h2 className="text-lg font-semibold text-app-charcoal mb-4">📝 Additional Notes</h2>
        <p className="text-sm text-app-gray mb-3">
          Add any additional thoughts or observations (Optional) (max 500 characters)
        </p>
        <SecureTextarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="How are you feeling today? Any additional details..."
          rows={4}
          showCharCount={true}
          errorMessage={notesWarning || undefined}
        />
        <p className="mt-2 text-xs text-app-gray">
          🔒 For security, certain characters are disallowed and will be flagged.
        </p>
      </section>

      {/* End Time Card */}
      <section className="card">
        <TimeInputSection
          label="End Time"
          value={endTime}
          onChange={setEndTime}
          is24Hour={is24Hour}
          onValidationChange={setHasEndTimeError}
        />
      </section>

      {/* Submit Button */}
      <div className="pt-2 sm:pt-4">
        {submitRateLimit.isRateLimited && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              ⏱️ Rate limit reached. Please wait <strong>{submitRateLimit.getFormattedTime()}</strong> before submitting again.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !!notesWarning || notesExceedsLimit || hasMedicineDosageError || hasCustomDosageInputError || submitRateLimit.isRateLimited || hasStartTimeError || hasEndTimeError || hasMedicineTimeError || hasFlowStartTimeError}
          className={`w-full py-3 sm:py-4 rounded-lg font-semibold text-white transition-all text-sm sm:text-base ${
            isSubmitting
              ? "bg-app-teal/70 cursor-wait"
              : notesWarning || notesExceedsLimit || hasMedicineDosageError || hasCustomDosageInputError || submitRateLimit.isRateLimited || hasStartTimeError || hasEndTimeError || hasMedicineTimeError || hasFlowStartTimeError
              ? "bg-app-gray cursor-not-allowed"
              : "bg-app-teal hover:bg-app-teal"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-4 sm:w-5 h-4 sm:h-5"
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
              Submit Entry
            </span>
          )}
        </button>
      </div>
    </div>

    {/* Success Modal */}
    <SuccessModal
      isOpen={showSuccessModal}
      onClose={() => {
        setShowSuccessModal(false);
        resetForm();
      }}
      title="Entry Logged"
      description="Your entry has been saved successfully."
      buttonText="Log Another Entry"
      secondaryButtonText="Back to Dashboard"
      onSecondaryClick={() => {
        setShowSuccessModal(false);
        router.push("/dashboard");
      }}
    />

    {/* Empty Entry Warning Modal */}
    <WarningModal
      isOpen={showEmptyWarning}
      onClose={() => setShowEmptyWarning(false)}
      onConfirm={handleEmptyWarningConfirm}
      title="No Selections Made"
      description="We noticed you haven't made any selections on the entry form. Are you sure you'd like to submit an empty entry?"
      confirmButtonText="Submit Anyway"
      cancelButtonText="Go Back"
    />

    {/* Time Warning Modal - End time earlier than start time */}
    <WarningModal
      isOpen={showTimeWarning}
      onClose={() => setShowTimeWarning(false)}
      onConfirm={() => setShowTimeWarning(false)}
      title="End Time Before Start Time"
      description="The end time you entered is earlier than the start time. Please correct the times to avoid errors in your log."
      confirmButtonText="Fix Times"
      cancelButtonText="Go Back"
    />

    {/* Incomplete Sections Warning Modal */}
    <WarningModal
      isOpen={showIncompleteSectionsWarning}
      onClose={() => setShowIncompleteSectionsWarning(false)}
      onConfirm={handleIncompleteSectionsConfirm}
      title="Some Sections Look Incomplete"
      description="It looks like you may have skipped some selections. Would you like to go back and fill them in, or continue submitting anyway?"
      confirmButtonText="Continue Submission"
      cancelButtonText="Go Back"
      iconVariant="pause"
      iconColor="plumb"
      confirmButtonVariant="plumb-to-green"
    />
    </>
  );
}

// ============================================
// Helper Components
// ============================================

interface TimeInputSectionProps {
  label: string;
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  is24Hour: boolean;
  onValidationChange?: (hasError: boolean) => void;
}

function TimeInputSection({ label, value, onChange, is24Hour, onValidationChange }: TimeInputSectionProps) {
  // Validation error states
  const [hourError, setHourError] = useState<string | null>(null);
  const [minuteError, setMinuteError] = useState<string | null>(null);

  // Local editing state - don't pad while user is typing
  const [isEditingHour, setIsEditingHour] = useState(false);
  const [isEditingMinute, setIsEditingMinute] = useState(false);
  const [hourDisplay, setHourDisplay] = useState("");
  const [minuteDisplay, setMinuteDisplay] = useState("");

  // Valid ranges
  const minHour = is24Hour ? 0 : 0;
  const maxHour = is24Hour ? 23 : 12;

  // Notify parent when validation state changes
  useEffect(() => {
    if (onValidationChange) {
      const hasError = !!(hourError || minuteError);
      onValidationChange(hasError);
    }
  }, [hourError, minuteError, onValidationChange]);

  const setNow = () => {
    const now = new Date();
    let hour = now.getHours();
    const minute = now.getMinutes();
    let period: "AM" | "PM" = "AM";

    if (!is24Hour) {
      period = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
    }

    onChange({ hour, minute, period });
    setHourError(null);
    setMinuteError(null);
    setIsEditingHour(false);
    setIsEditingMinute(false);
  };

  // Handle hour focus - start editing mode
  const handleHourFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditingHour(true);
    setHourDisplay(value.hour.toString());
    // Select all after a brief delay to ensure the display value is set
    setTimeout(() => e.target.select(), 0);
  };

  // Handle hour blur - exit editing mode
  const handleHourBlur = () => {
    setIsEditingHour(false);
  };

  // Handle hour input - only allow numeric, 1-2 digits
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow numeric characters, limit to 2 digits
    const numericOnly = input.replace(/[^0-9]/g, "").slice(0, 2);
    setHourDisplay(numericOnly);

    const numValue = numericOnly === "" ? 0 : Number(numericOnly);
    onChange({ ...value, hour: numValue });

    // Validate and show error if out of range
    if (numValue < minHour || numValue > maxHour) {
      setHourError(
        is24Hour
          ? "Hour must be between 0 and 23"
          : "Hour must be between 0 and 12"
      );
    } else {
      setHourError(null);
    }
  };

  // Handle minute focus - start editing mode
  const handleMinuteFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditingMinute(true);
    setMinuteDisplay(value.minute.toString());
    // Select all after a brief delay to ensure the display value is set
    setTimeout(() => e.target.select(), 0);
  };

  // Handle minute blur - exit editing mode
  const handleMinuteBlur = () => {
    setIsEditingMinute(false);
  };

  // Handle minute input - only allow numeric, 1-2 digits
  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow numeric characters, limit to 2 digits
    const numericOnly = input.replace(/[^0-9]/g, "").slice(0, 2);
    setMinuteDisplay(numericOnly);

    const numValue = numericOnly === "" ? 0 : Number(numericOnly);
    onChange({ ...value, minute: numValue });

    // Validate and show error if out of range
    if (numValue < 0 || numValue > 59) {
      setMinuteError("Minutes must be between 0 and 59");
    } else {
      setMinuteError(null);
    }
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold text-app-charcoal">{label}</h2>
        <button
          type="button"
          onClick={setNow}
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-app-green text-white text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Now
        </button>
      </div>
      <div className="flex items-center justify-center gap-2">
        <div className="w-16 sm:w-20">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={isEditingHour ? hourDisplay : value.hour.toString().padStart(2, "0")}
            onChange={handleHourChange}
            onFocus={handleHourFocus}
            onBlur={handleHourBlur}
            className={`w-full px-2 sm:px-3 py-2 sm:py-3 rounded-lg border bg-app-white focus:outline-none focus:ring-2 text-center text-base sm:text-lg font-medium text-app-charcoal ${
              hourError
                ? "border-red-500 focus:ring-red-300"
                : "border-app-border focus:ring-app-green"
            }`}
          />
          <p className="text-xs text-app-gray text-center mt-1">Hour</p>
        </div>
        <span className="text-xl sm:text-2xl text-app-gray font-bold pb-5">:</span>
        <div className="w-16 sm:w-20">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={isEditingMinute ? minuteDisplay : value.minute.toString().padStart(2, "0")}
            onChange={handleMinuteChange}
            onFocus={handleMinuteFocus}
            onBlur={handleMinuteBlur}
            className={`w-full px-2 sm:px-3 py-2 sm:py-3 rounded-lg border bg-app-white focus:outline-none focus:ring-2 text-center text-base sm:text-lg font-medium text-app-charcoal ${
              minuteError
                ? "border-red-500 focus:ring-red-300"
                : "border-app-border focus:ring-app-green"
            }`}
          />
          <p className="text-xs text-app-gray text-center mt-1">Min</p>
        </div>
        {!is24Hour && (
          <div className="w-16 sm:w-20">
            <select
              value={value.period}
              onChange={(e) => onChange({ ...value, period: e.target.value as "AM" | "PM" })}
              className="w-full px-2 py-2 sm:py-3 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green text-center text-base sm:text-lg font-medium text-app-charcoal"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
            <p className="text-xs text-app-gray text-center mt-1 invisible">Period</p>
          </div>
        )}
      </div>
      {/* Inline validation error messages */}
      {(hourError || minuteError) && (
        <div className="mt-2 text-center">
          {hourError && (
            <p className="text-xs text-red-500">{hourError}</p>
          )}
          {minuteError && (
            <p className="text-xs text-red-500">{minuteError}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface FlowStartTimeInputProps {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  is24Hour: boolean;
  onValidationChange?: (hasError: boolean) => void;
}

function FlowStartTimeInput({ value, onChange, is24Hour, onValidationChange }: FlowStartTimeInputProps) {
  const [editingInputs, setEditingInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const minHour = 0;
  const maxHour = is24Hour ? 23 : 12;

  useEffect(() => {
    if (onValidationChange) {
      const hasError = Object.values(errors).some((e) => e !== null);
      onValidationChange(hasError);
    }
  }, [errors, onValidationChange]);

  return (
    <div>
      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={
            "hour" in editingInputs
              ? editingInputs["hour"]
              : value.hour.toString().padStart(2, "0")
          }
          onChange={(e) => {
            const numericOnly = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
            setEditingInputs((prev) => ({ ...prev, hour: numericOnly }));
            const numValue = numericOnly === "" ? 0 : Number(numericOnly);
            onChange({ ...value, hour: numValue });
            if (numValue < minHour || numValue > maxHour) {
              setErrors((prev) => ({ ...prev, hour: is24Hour ? "Hour must be 0-23" : "Hour must be 0-12" }));
            } else {
              setErrors((prev) => ({ ...prev, hour: null }));
            }
          }}
          onFocus={(e) => {
            setEditingInputs((prev) => ({ ...prev, hour: value.hour.toString() }));
            setTimeout(() => e.target.select(), 0);
          }}
          onBlur={() => {
            setEditingInputs((prev) => {
              const { hour: _, ...rest } = prev;
              void _;
              return rest;
            });
          }}
          className={`w-14 sm:w-16 px-2 py-2 rounded-lg border bg-app-white focus:outline-none focus:ring-2 text-center text-sm ${
            errors["hour"] ? "border-red-500 focus:ring-red-300" : "border-app-border focus:ring-app-taupe"
          }`}
        />
        <span className="text-app-gray font-bold">:</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={
            "minute" in editingInputs
              ? editingInputs["minute"]
              : value.minute.toString().padStart(2, "0")
          }
          onChange={(e) => {
            const numericOnly = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
            setEditingInputs((prev) => ({ ...prev, minute: numericOnly }));
            const numValue = numericOnly === "" ? 0 : Number(numericOnly);
            onChange({ ...value, minute: numValue });
            if (numValue < 0 || numValue > 59) {
              setErrors((prev) => ({ ...prev, minute: "Minutes must be 0-59" }));
            } else {
              setErrors((prev) => ({ ...prev, minute: null }));
            }
          }}
          onFocus={(e) => {
            setEditingInputs((prev) => ({ ...prev, minute: value.minute.toString() }));
            setTimeout(() => e.target.select(), 0);
          }}
          onBlur={() => {
            setEditingInputs((prev) => {
              const { minute: _, ...rest } = prev;
              void _;
              return rest;
            });
          }}
          className={`w-14 sm:w-16 px-2 py-2 rounded-lg border bg-app-white focus:outline-none focus:ring-2 text-center text-sm ${
            errors["minute"] ? "border-red-500 focus:ring-red-300" : "border-app-border focus:ring-app-taupe"
          }`}
        />
        {!is24Hour && (
          <select
            value={value.period}
            onChange={(e) => onChange({ ...value, period: e.target.value as "AM" | "PM" })}
            className="px-2 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe text-sm"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        )}
      </div>
      {(errors["hour"] || errors["minute"]) && (
        <div className="mt-1 text-center sm:text-left">
          {errors["hour"] && <p className="text-xs text-red-500">{errors["hour"]}</p>}
          {errors["minute"] && <p className="text-xs text-red-500">{errors["minute"]}</p>}
        </div>
      )}
    </div>
  );
}

interface ConsolidatedMedicineLogProps {
  medicines: Medicine[];
  loggedMedicines: MedicineLogEntry[];
  onChange: (entries: MedicineLogEntry[]) => void;
  is24Hour: boolean;
  onCustomInputValidation?: (hasError: boolean) => void;
  onTimeValidation?: (hasError: boolean) => void;
}

interface ProductUsageEntrySectionProps {
  productTracking: ProductTracking;
  selectedProductUsage: ProductUsageEntry[];
  onChange: (usage: ProductUsageEntry[]) => void;
}

function ProductUsageEntrySection({ 
  productTracking, 
  selectedProductUsage, 
  onChange 
}: ProductUsageEntrySectionProps) {
  // Use string[] instead of ProductType[]
  const selectedProducts = productTracking.selectedProducts ?? [];
  const customProducts = productTracking.customProducts ?? {};

  // Check which products have incomplete selections
  const getProductValidation = (productType: string) => {
    const usage = selectedProductUsage.find((p) => p.productType === productType);
    if (!usage) return null;
    return isProductUsageComplete(usage, PRODUCT_OPTIONS, customProducts);
  };

  // productType is now string
  const toggleProduct = (productType: string) => {
    const exists = selectedProductUsage.find((p) => p.productType === productType);
    if (exists) {
      onChange(selectedProductUsage.filter((p) => p.productType !== productType));
    } else {
      onChange([...selectedProductUsage, { productType }]);
    }
  };

  // productType is now string
  const updateProductDetails = (
    productType: string,
    updates: Partial<ProductUsageEntry>
  ) => {
    onChange(
      selectedProductUsage.map((p) =>
        p.productType === productType ? { ...p, ...updates } : p
      )
    );
  };

  if (selectedProducts.length === 0) {
    return (
      <p className="text-sm text-app-gray italic">
        No products configured. Add products in Settings → Period Tracking.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Product Selection Chips */}
      <div className="flex flex-wrap gap-2">
        {selectedProducts.map((productType) => {
          const product = PRODUCT_OPTIONS.find((p) => p.type === productType);
          const isSelected = selectedProductUsage.some((p) => p.productType === productType);

          if (!product) return null;

          return (
            <button
              key={productType}
              type="button"
              onClick={() => toggleProduct(productType)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                isSelected
                  ? "bg-app-red text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-red"
              }`}
            >
              {product.label}
            </button>
          );
        })}
      </div>

      {/* Details for Selected Products */}
      {selectedProductUsage.map((usage) => {
        const product = PRODUCT_OPTIONS.find((p) => p.type === usage.productType);
        if (!product) return null;

        // Access custom products using string key
        const productCustomItems = customProducts[usage.productType] ?? [];
        const hasCustomProducts = product.allowCustomProducts && productCustomItems.length > 0;
        
        // Check validation status
        const validation = isProductUsageComplete(usage, PRODUCT_OPTIONS, customProducts);
        const isIncomplete = !validation.isComplete;

        return (
          <div
            key={usage.productType}
            className={`p-3 rounded-lg border ${
              isIncomplete 
                ? "bg-app-red/10 border-app-red/40" 
                : "bg-app-red/5 border-app-red/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-app-charcoal">
                {product.label} details:
              </p>
              {isIncomplete && (
                <span className="text-xs text-app-red font-medium">
                  ⚠️ Selection required
                </span>
              )}
            </div>

            {/* Custom Product Selection (for cups, discs, etc.) */}
            {hasCustomProducts && (
              <div className="mb-3">
                <p className={`text-xs mb-2 ${
                  validation.missingField === 'customProduct' 
                    ? "text-app-red font-medium" 
                    : "text-app-gray"
                }`}>
                  Which one? {validation.missingField === 'customProduct' && "*"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {productCustomItems.map((cp: CustomProduct) => (
                    <button
                      key={cp.id}
                      type="button"
                      onClick={() =>
                        updateProductDetails(usage.productType, {
                          customProductId: usage.customProductId === cp.id ? undefined : cp.id,
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        usage.customProductId === cp.id
                          ? "bg-app-red opacity-85 text-white"
                          : "bg-app-white text-app-charcoal border border-app-border hover:border-app-red"
                      }`}
                    >
                      {cp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {product.hasSizes && product.sizes && product.sizes.length > 0 && (
              <div>
                <p className={`text-xs mb-2 ${
                  validation.missingField === 'size' 
                    ? "text-app-red font-medium" 
                    : "text-app-gray"
                }`}>
                  Size/Absorbency: {validation.missingField === 'size' && "*"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size: string) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        updateProductDetails(usage.productType, {
                          size: usage.size === size ? undefined : size,
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        usage.size === size
                          ? "bg-app-red opacity-85 text-white"
                          : "bg-app-white text-app-charcoal border border-app-border hover:border-app-red"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}