// =============================================================================
// CADENCE — Sample data loader for demo mode
//
// Called from app/welcome/page.tsx when NEXT_PUBLIC_IS_DEMO=true and the
// visitor clicks "or explore with sample data →".
//
// Writes directly to the Zustand stores (which auto-persist to localStorage).
// Guard: if entries already exist this is a no-op.
//
// Data generated:
//   - 90 days of entries, one per day
//   - Bristol types weighted toward 3–4 with occasional variation
//   - 29-day menstrual cycle (5 menstrual / 9 follicular / 3 ovulation / 12 luteal)
//   - Symptoms tied to cycle phase
// =============================================================================

import { useEntries } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";
import type {
  StoredEntry,
  BristolScaleType,
  PostBowelFeeling,
  CyclePhase,
} from "@/types";

// =============================================================================
// Helpers
// =============================================================================

function dateStr(today: Date, daysAgo: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoAt(today: Date, daysAgo: number, hour: number, minute = 0): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// 12h string format matching the app's formatTimeToString ("H:MM AM/PM")
function fmt12h(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:${String(minute).padStart(2, "0")} ${period}`;
}

// =============================================================================
// Cycle phase logic
//
// 29-day cycle anchored so today (daysAgo=0) falls on cycleDay 19 (luteal day 3),
// meaning the last period was ~19 days ago and the next is ~10 days away.
//
//   cycleDay 0–4:   menstrual  (5 days)
//   cycleDay 5–13:  follicular (9 days)
//   cycleDay 14–16: ovulation  (3 days)
//   cycleDay 17–28: luteal     (12 days)
// =============================================================================

function getCycleDay(daysAgo: number): number {
  return (89 - daysAgo + 17) % 29;
}

function getCyclePhase(daysAgo: number): CyclePhase {
  const d = getCycleDay(daysAgo);
  if (d <= 4)  return "menstrual";
  if (d <= 13) return "follicular";
  if (d <= 16) return "ovulation";
  return "luteal";
}

function getPeriodFlow(daysAgo: number): string | null {
  const d = getCycleDay(daysAgo);
  if (d === 0 || d === 1) return "heavy";
  if (d === 2 || d === 3) return "medium";
  if (d === 4)            return "light";
  return null;
}

// =============================================================================
// Stool pattern — weighted toward Bristol 3–4 with occasional variation
// gcd(7, 12) = 1 → full rotation across all 90 days
// =============================================================================

const STOOL_PATTERN = [3, 4, 3, 4, 4, 3, 4, 5, 3, 4, 2, 6] as const;

function getStoolType(daysAgo: number): BristolScaleType | null {
  if (daysAgo % 9 === 7) return null; // ~11% rest days
  return STOOL_PATTERN[(daysAgo * 7 + 3) % STOOL_PATTERN.length] as BristolScaleType;
}

function getStoolFeeling(stool: BristolScaleType | null, daysAgo: number): PostBowelFeeling | null {
  if (!stool) return null;
  if (stool === 3 || stool === 4) return "complete_relief";
  if (stool === 5) return daysAgo % 2 === 0 ? "complete_relief" : "partial_relief";
  if (stool === 6) return "partial_relief";
  if (stool === 2) return "incomplete";
  return "complete_relief";
}

// =============================================================================
// Symptom pattern — varies by cycle phase using modular offsets
// =============================================================================

function getSymptomIntensities(daysAgo: number): Record<string, number | null> {
  const phase = getCyclePhase(daysAgo);
  const s: Record<string, number | null> = {};

  if (phase === "menstrual") {
    s["Cramps"]  = null;
    if (daysAgo % 3 !== 2) s["Bloating"] = null;
    if (daysAgo % 2 === 0) s["Fatigue"]  = null;
  } else if (phase === "luteal") {
    if (daysAgo % 4 === 0) s["Bloating"]          = null;
    if (daysAgo % 5 === 0) s["Mood Changes"]       = null;
    if (daysAgo % 6 === 0) s["Fatigue"]            = null;
    if (daysAgo % 7 === 0) s["Appetite Changes"]   = null;
  }

  if (daysAgo % 11 === 0) s["Headache"] = null;
  if (daysAgo % 13 === 0) s["Nausea"]   = null;

  return s;
}

// =============================================================================
// Entry generator
// =============================================================================

function generateEntries(today: Date): StoredEntry[] {
  const entries: StoredEntry[] = [];

  for (let d = 89; d >= 0; d--) {
    const stoolType   = getStoolType(d);
    const stoolFeeling = getStoolFeeling(stoolType, d);
    const cyclePhase  = getCyclePhase(d);
    const periodFlow  = getPeriodFlow(d);
    const symptoms    = getSymptomIntensities(d);

    // Vary entry times slightly so the history looks lived-in
    const startHour = 7 + (d % 3);
    const startMin  = [0, 15, 30, 45][d % 4];
    const endMin    = startMin + 20;
    const endHour   = startHour + (endMin >= 60 ? 1 : 0);
    const normEndMin = endMin % 60;

    const ts = isoAt(today, d, startHour + 1, 0);

    entries.push({
      id:         `entry_seed_${d}`,
      createdAt:  ts,
      updatedAt:  ts,
      date:       dateStr(today, d),
      startTime:  fmt12h(startHour, startMin),
      endTime:    fmt12h(endHour, normEndMin),
      painScale:  "simple",
      stoolType,
      stoolFeeling,
      cyclePhase,
      periodFlow,
      symptomIntensities:       symptoms,
      periodSymptomIntensities: {},
      oneOffSymptoms:           [],
      productUsage:             [],
      medicineLog:              [],
      notes:                    "",
      syncStatus:               "synced",
    });
  }

  return entries;
}

// =============================================================================
// Public API
// =============================================================================

export function loadCadenceSampleData(): void {
  // Guard: don't overwrite existing data
  if (useEntries.getState().entries.length > 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries = generateEntries(today);
  useEntries.setState({ entries, _revision: 1 });

  useSettings.setState({
    setupComplete:    true,
    tutorialComplete: true,
    stoolTracking: { enabled: true },
    symptoms: {
      enabled: true,
      selected: ["Bloating", "Cramps", "Nausea", "Fatigue", "Headache", "Mood Changes", "Appetite Changes"],
      custom: [],
      intensityTracking: { enabled: false, scaleType: "simple" },
    },
    periodTracking: {
      enabled:               true,
      trackFlow:             false,
      periodSymptoms:        ["Cramps", "Bloating"],
      customPeriodSymptoms:  [],
    },
  });
}
