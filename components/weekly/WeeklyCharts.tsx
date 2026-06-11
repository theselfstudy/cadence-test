"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { StoredEntry } from "@/types";
import { CYCLE_PHASES } from "@/lib/constants";

// ============================================
// WEEKLY CHARTS
// Tabs: Symptom Frequency | Bowel Types | Cycle Logs | Medicine Logs
// ============================================

interface WeeklyChartsProps {
  /** Entries for the current week */
  entries: StoredEntry[];
  /** Ordered day names based on user's week start preference */
  orderedDays: string[];
  /** Which tracking sections are enabled */
  enabledSections: {
    symptoms: boolean;
    bowel: boolean;
    cycle: boolean;
    medicine: boolean;
  };
  /** Callback when a day is clicked in Bristol chart */
  onDayClick?: (day: string) => void;
  /** Currently selected days for filtering */
  selectedDays?: string[];
  /** Callback to clear all selected days */
  onClearFilter?: () => void;
  /** Custom products from settings for name lookup */
  customProducts?: Record<string, { id: string; name: string }[]>;
  /** Medicines from settings to check period category */
  medicines?: { id: string; name: string; categories: string[] }[];
  /** Week label showing the date range, e.g., "February 2-8" */
  weekLabel?: string;
}


export function WeeklyCharts({
  entries,
  orderedDays,
  enabledSections,
  selectedDays = [],
  customProducts = {},
  medicines = [],
  onDayClick,
  onClearFilter,
  weekLabel,
}: WeeklyChartsProps) {
  const [activeChart, setActiveChart] = useState<"symptoms" | "bowel" | "cycle" | "medicine">("symptoms");

  // Build chart data
  const { symptomData, bristolData, cycleData, medicineData, symptomHeatMapData, oneOffSymptomData } = useMemo(() => {
    return buildChartData(entries, orderedDays, medicines);
  }, [entries, orderedDays, medicines]);

  // Determine which charts are available based on data and settings
  const hasSymptomData = symptomData.length > 0 || oneOffSymptomData.length > 0;
  const hasBristolData = bristolData.days.some(d => d.entries.length > 0);
  const hasCycleData = cycleData.phases.length > 0 || cycleData.flows.length > 0;
  const hasMedicineData = medicineData.medicines.length > 0;

  // Available chart tabs (in specified order)
  const availableTabs: { id: "symptoms" | "bowel" | "cycle" | "medicine"; label: string; icon: string; hasData: boolean }[] = [];

  if (enabledSections.symptoms) {
    availableTabs.push({ id: "symptoms", label: "Symptom Frequency", icon: "🏷️", hasData: hasSymptomData });
  }
  if (enabledSections.bowel) {
    availableTabs.push({ id: "bowel", label: "Bowel Types", icon: "🧻", hasData: hasBristolData });
  }
  if (enabledSections.cycle) {
    availableTabs.push({ id: "cycle", label: "Cycle Logs", icon: "🌸", hasData: hasCycleData });
  }
  if (enabledSections.medicine) {
    availableTabs.push({ id: "medicine", label: "Medicine Logs", icon: "💊", hasData: hasMedicineData });
  }

  // If no tabs available, don't render
  if (availableTabs.length === 0) {
    return null;
  }

  // Ensure active chart is valid
  const validActiveChart = availableTabs.some((t) => t.id === activeChart)
    ? activeChart
    : availableTabs[0].id;

  return (
    <div className="bg-app-white rounded-xl border border-app-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-app-border bg-app-cream/50">
        <h3 className="text-sm font-semibold text-app-charcoal flex items-center gap-2">
          <span>📅</span>
          Weekly Charts
          {selectedDays.length > 0 && (
            <>
              <span className="text-xs font-normal text-app-teal">
                ({selectedDays.length} day{selectedDays.length !== 1 ? "s" : ""} selected)
              </span>
              <button
                type="button"
                onClick={onClearFilter}
                className="text-xs font-medium text-app-gray hover:text-app-charcoal transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </h3>
        <p className="text-xs text-app-gray mt-0.5">
          {selectedDays.length > 0
            ? "Showing data for selected days"
            : "Click on the tabs to view each section's data"}
        </p>
      </div>
      {/* Tab Navigation */}
      <div className="flex border-b border-app-border overflow-x-auto">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              validActiveChart === tab.id
                ? "text-app-charcoal border-b-2 border-app-teal bg-app-cream/30"
                : "text-app-gray hover:text-app-charcoal hover:bg-app-cream/20"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <div className="p-4">
        {validActiveChart === "symptoms" && (
          <SymptomFrequencyChart
            data={symptomData}
            heatMapData={symptomHeatMapData}
            oneOffData={oneOffSymptomData}
            selectedDays={selectedDays}
            onDayClick={onDayClick}
            weekLabel={weekLabel}
            entries={entries}
            cycleEnabled={enabledSections.cycle}
          />
        )}      
        {validActiveChart === "bowel" && (
          <BristolTimelineChart 
            data={bristolData} 
            onDayClick={onDayClick}
            selectedDays={selectedDays}
        />
        )}        
        {validActiveChart === "cycle" && <CycleLogsChart data={cycleData} customProducts={customProducts} />}
        {validActiveChart === "medicine" && <MedicineLogsChart data={medicineData} />}
      </div>
    </div>
  );
}

// ============================================
// SYMPTOM FREQUENCY CHART (Table)
// ============================================

interface SymptomFrequencyData {
  name: string;
  totalCount: number;
  highestCount: number;
  highestDay: string;
  lowestCount: number;
  lowestDay: string;
}

interface SymptomHeatMapData {
  symptom: string;
  days: { day: string; intensity: number | null; logged: boolean }[];
}

interface OneOffSymptomData {
  name: string;        // Original casing for display
  count: number;       // Frequency count
}

interface SymptomFrequencyChartProps {
  data: SymptomFrequencyData[];
  heatMapData: SymptomHeatMapData[];
  oneOffData: OneOffSymptomData[];
  selectedDays?: string[];
  onDayClick?: (day: string) => void;
  weekLabel?: string;
  entries?: StoredEntry[];
  cycleEnabled?: boolean;
}

function SymptomFrequencyChart({
  data,
  heatMapData,
  oneOffData,
  selectedDays = [],
  onDayClick,
  weekLabel,
  entries = [],
  cycleEnabled = false,
}: SymptomFrequencyChartProps) {
  const [viewMode, setViewMode] = useState<"table" | "heatmap">("heatmap");

  if (data.length === 0 && oneOffData.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🏷️</span>
        <p className="text-app-charcoal font-medium">None to show this week</p>
        <p className="text-sm text-app-gray mt-1">Log symptoms to see frequency data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-app-charcoal">Symptom Frequency</h4>
          <p className="text-xs text-app-gray mt-0.5">
            {viewMode === "table" ? "How often each symptom was logged" : "Daily symptom intensity"}
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-app-border">
          <button
            onClick={() => setViewMode("heatmap")}
            className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              viewMode === "heatmap"
                ? "bg-app-teal text-white"
                : "bg-white text-app-charcoal hover:bg-app-cream"
            }`}
          >
            Heat Map
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              viewMode === "table"
                ? "bg-app-teal text-white"
                : "bg-white text-app-charcoal hover:bg-app-cream"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="max-h-64 overflow-y-auto border border-app-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-app-cream sticky top-0">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-app-charcoal">Symptom</th>
                <th className="text-center py-2 px-3 font-medium text-app-charcoal whitespace-nowrap">
                  <span className="block text-xs">Highest</span>
                  <span className="text-app-gray font-normal text-[10px]">Count / Day</span>
                </th>
                <th className="text-center py-2 px-3 font-medium text-app-charcoal whitespace-nowrap">
                  <span className="block text-xs">Lowest</span>
                  <span className="text-app-gray font-normal text-[10px]">Count / Day</span>
                </th>
                <th className="text-right py-2 px-3 font-medium text-app-charcoal w-16">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {data.map((item) => (
                <tr key={item.name} className="hover:bg-app-cream/30">
                  <td className="py-2 px-3 text-app-charcoal">{item.name}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-app-teal font-medium">{item.highestCount}</span>
                    <span className="text-app-gray text-xs ml-1">/ {item.highestDay}</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-app-gray font-medium">{item.lowestCount}</span>
                    <span className="text-app-gray text-xs ml-1">/ {item.lowestDay}</span>
                  </td>
                  <td className="py-2 px-3 text-app-teal font-medium text-right">{item.totalCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <WeeklySymptomHeatMap
          data={heatMapData}
          selectedDays={selectedDays}
          onDayClick={onDayClick}
          weekLabel={weekLabel}
          entries={entries}
          cycleEnabled={cycleEnabled}
        />
      )}

      <p className="text-xs text-app-gray mt-2 text-center">
        {data.length} symptom{data.length !== 1 ? "s" : ""} tracked this week
      </p>

      {/* One-Off Symptoms Section - hidden on mobile (shown in drill-down instead) */}
      {oneOffData.length > 0 && (
        <div className="hidden md:block mt-6 pt-4 border-t border-app-border">
          <h4 className="text-sm font-medium text-app-charcoal mb-2 flex items-center gap-1.5">
            <span>❖</span>
            One-Off Symptoms
          </h4>
          <p className="text-xs text-app-gray mb-3">
            Custom symptoms logged this week
          </p>
          <div className="flex flex-wrap gap-2">
            {oneOffData.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-xs font-medium border-app-plumb/30 bg-app-plumb/10 border-2 text-app-plumb"
              >
                {item.name}
                <span className="bg-app-plumb/30 px-1.5 py-0.5 rounded-full text-xs">
                  {item.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MOBILE WEEK DAY DRILL-DOWN
// ============================================

interface MobileWeekDayDrillDownProps {
  phase?: string;
  symptoms: {
    name: string;
    intensity: number | null;
  }[];
  oneOffSymptoms: string[];
  dateLabel: string;
  onClose: () => void;
}

function MobileWeekDayDrillDown({
  phase,
  symptoms,
  oneOffSymptoms,
  dateLabel,
  onClose,
}: MobileWeekDayDrillDownProps) {
  const isMenstrual = phase === "menstrual";
  const hasAnySymptoms = symptoms.length > 0 || oneOffSymptoms.length > 0;

  return (
    <div
      className={`mt-3 p-3 rounded-lg border ${
        isMenstrual
          ? "bg-app-red/5 border-app-red/20"
          : "bg-app-teal/5 border-app-teal/20"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-app-charcoal">
          {dateLabel}
        </p>
        <button
          onClick={onClose}
          className="text-app-gray hover:text-app-charcoal p-1"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {!hasAnySymptoms ? (
        <p className="text-xs text-app-gray">No symptoms logged</p>
      ) : (
        <>
          {/* Regular symptoms */}
          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map((s, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 text-xs rounded ${
                    isMenstrual
                      ? "bg-app-red/10 text-app-red"
                      : "bg-app-teal/10 text-app-teal"
                  }`}
                >
                  {s.name}
                  {s.intensity !== null ? ` (${s.intensity})` : ""}
                </span>
              ))}
            </div>
          )}

          {/* One-off symptoms section */}
          {oneOffSymptoms.length > 0 && (
            <div
              className={`${symptoms.length > 0 ? "mt-3 pt-2 border-t" : ""} ${
                isMenstrual ? "border-app-red/20" : "border-app-teal/20"
              }`}
            >
              <p className="text-xs text-app-gray mb-1.5 flex items-center gap-1">
                <span>❖</span>
                One-Off Symptoms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {oneOffSymptoms.map((symptom, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded bg-app-plumb/10 text-app-plumb"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// MOBILE WEEK STRIP
// ============================================

interface MobileWeekStripProps {
  allSymptomData: SymptomHeatMapData[];
  weekLabel: string;
  selectedDays?: string[];
  onDayDrillDown?: (day: string) => void;
  mobileDrillDownDay?: string | null;
  entries?: StoredEntry[];
}

function MobileWeekStrip({
  allSymptomData,
  weekLabel,
  selectedDays = [],
  onDayDrillDown,
  mobileDrillDownDay,
  entries = [],
}: MobileWeekStripProps) {
  // Get day labels from first symptom's data
  const dayLabels = allSymptomData[0]?.days.map((d) => d.day) || [];

  // Build a map of dayName -> phase for menstrual highlighting
  const dayPhaseMap = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map: Record<string, string | undefined> = {};
    for (const entry of entries) {
      const entryDate = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[entryDate.getDay()];
      if (entry.cyclePhase) {
        map[dayName] = entry.cyclePhase;
      }
    }
    return map;
  }, [entries]);

  // Aggregate: check if ANY symptom was logged for each day
  const aggregatedDays = useMemo(() => {
    if (allSymptomData.length === 0 || dayLabels.length === 0) return [];

    return dayLabels.map((dayName) => {
      // Check if ANY symptom was logged on this day
      const anyLogged = allSymptomData.some((symptomRow) => {
        const dayData = symptomRow.days.find((d) => d.day === dayName);
        return dayData?.logged === true;
      });

      return {
        day: dayName,
        logged: anyLogged,
      };
    });
  }, [allSymptomData, dayLabels]);

  return (
    <div className="md:hidden">
      {/* Week label */}
      <p className="text-xs font-medium text-app-gray px-3 pt-2">
        {weekLabel}
      </p>

      {/* Strip */}
      <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
        <div className="flex gap-2 px-3 pt-5 pb-3 justify-center">
          {aggregatedDays.map((day) => {
            const isMenstrual = dayPhaseMap[day.day] === "menstrual";
            const bgStyle = day.logged
              ? isMenstrual
                ? "bg-app-red/20"
                : "bg-app-teal/50"
              : "bg-app-border";

            const isSelected = selectedDays.includes(day.day);
            const isDrillDown = mobileDrillDownDay === day.day;

            return (
              <div
                key={day.day}
                className="relative flex flex-col items-center"
              >
                {/* Day name label */}
                <span className="absolute -top-5 text-[0.6rem] text-app-gray/50 select-none">
                  {day.day}
                </span>

                <button
                  type="button"
                  onClick={() => onDayDrillDown?.(day.day)}
                  className={`
                    w-9 h-9 rounded-md
                    flex items-center justify-center
                    ${bgStyle}
                    ${isMenstrual ? "border border-app-red" : ""}
                    ${isSelected ? "ring-1 ring-app-teal" : ""}
                    ${isDrillDown ? "ring-2 shadow-md scale-95" : ""}
                    ${isDrillDown && isMenstrual ? "ring-app-red" : ""}
                    ${isDrillDown && !isMenstrual ? "ring-app-teal" : ""}
                    transition-colors active:scale-95
                  `}
                >
                  {/* Show checkmark if any symptom logged */}
                  {day.logged && (
                    <svg
                      className={`w-4 h-4 ${isMenstrual ? "text-app-red" : "text-app-cream"}`}
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
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// WEEKLY SYMPTOM HEAT MAP (moved from separate file)
// ============================================

interface WeeklySymptomHeatMapProps {
  data: SymptomHeatMapData[];
  maxHeight?: number;
  onDayClick?: (day: string) => void;
  selectedDays?: string[];
  weekLabel?: string;
  entries?: StoredEntry[];
  cycleEnabled?: boolean;
}

function WeeklySymptomHeatMap({
  data,
  maxHeight = 320,
  onDayClick,
  selectedDays = [],
  weekLabel = "",
  entries = [],
  cycleEnabled = false,
}: WeeklySymptomHeatMapProps) {
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [mobileSelectedDay, setMobileSelectedDay] = useState<string | null>(null);

  // Handle mobile day tap - toggle selection
  const handleMobileDayTap = (day: string) => {
    setMobileSelectedDay((prev) => (prev === day ? null : day));
  };

  // Aggregate symptoms for the mobile-selected day
  const mobileSelectedSymptoms = useMemo(() => {
    if (mobileSelectedDay === null) return [];

    const symptoms: { name: string; intensity: number | null }[] = [];
    for (const symptomRow of data) {
      const dayData = symptomRow.days.find((d) => d.day === mobileSelectedDay);
      if (dayData?.logged) {
        symptoms.push({
          name: symptomRow.symptom,
          intensity: dayData.intensity,
        });
      }
    }
    return symptoms;
  }, [mobileSelectedDay, data]);

  // Get phase for the mobile-selected day from entries
  const mobileSelectedPhase = useMemo(() => {
    if (mobileSelectedDay === null || entries.length === 0) return undefined;

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (const entry of entries) {
      const entryDate = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[entryDate.getDay()];
      if (dayName === mobileSelectedDay && entry.cyclePhase) {
        return entry.cyclePhase;
      }
    }
    return undefined;
  }, [mobileSelectedDay, entries]);

  // Get one-off symptoms for the mobile-selected day from entries
  const mobileSelectedOneOffSymptoms = useMemo(() => {
    if (mobileSelectedDay === null || entries.length === 0) return [];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const oneOffs: string[] = [];
    for (const entry of entries) {
      const entryDate = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[entryDate.getDay()];
      if (dayName === mobileSelectedDay && entry.oneOffSymptoms) {
        oneOffs.push(...entry.oneOffSymptoms);
      }
    }
    return oneOffs;
  }, [mobileSelectedDay, entries]);

  // Get formatted date label for the mobile-selected day (e.g., "February 3")
  const mobileSelectedDateLabel = useMemo(() => {
    if (mobileSelectedDay === null || entries.length === 0) return "";

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (const entry of entries) {
      const entryDate = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[entryDate.getDay()];
      if (dayName === mobileSelectedDay) {
        return `${monthNames[entryDate.getMonth()]} ${entryDate.getDate()}`;
      }
    }
    return "";
  }, [mobileSelectedDay, entries]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🏷️</span>
        <p className="text-app-charcoal font-medium">No symptoms this week</p>
        <p className="text-sm text-app-gray mt-1">Log symptoms to see the heat map</p>
      </div>
    );
  }

  // Get day labels from first symptom's data
  const dayLabels = data[0]?.days.map((d) => d.day) || [];

  return (
    <div className="border border-app-border rounded-lg overflow-visible">
      {/* ================= MOBILE ================= */}
      <MobileWeekStrip
        allSymptomData={data}
        weekLabel={weekLabel}
        selectedDays={selectedDays}
        onDayDrillDown={handleMobileDayTap}
        mobileDrillDownDay={mobileSelectedDay}
        entries={entries}
      />

      {/* Mobile drill-down details */}
      {mobileSelectedDay !== null && (
        <div className="md:hidden px-3 pb-3">
          <MobileWeekDayDrillDown
            phase={mobileSelectedPhase}
            symptoms={mobileSelectedSymptoms}
            oneOffSymptoms={mobileSelectedOneOffSymptoms}
            dateLabel={mobileSelectedDateLabel}
            onClose={() => setMobileSelectedDay(null)}
          />
        </div>
      )}

      {/* ================= DESKTOP (UNCHANGED) ================= */}
      <div className="hidden md:block p-3">
        {/* Day Headers - Clickable */}
        <div className="flex mb-2">
          <div className="w-28 sm:w-36 shrink-0" />
          {dayLabels.map((day) => {
            const isSelected = selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => onDayClick?.(day)}
                disabled={!onDayClick}
                className={`flex-1 min-w-[40px] text-center text-xs font-medium transition-colors rounded py-1 ${
                  isSelected
                    ? "bg-app-teal text-white"
                    : onDayClick
                      ? "text-app-gray hover:bg-app-cream hover:text-app-charcoal cursor-pointer"
                      : "text-app-gray"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Symptom Rows - Scrollable */}
        <div
          className="space-y-1 overflow-y-auto pr-1"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {data.map((symptom) => (
            <div key={symptom.symptom} className="flex items-center">
              {/* Symptom Name */}
              <div className="w-28 sm:w-36 shrink-0 pr-2">
                <p className="text-sm text-app-charcoal truncate" title={symptom.symptom}>
                  {symptom.symptom}
                </p>
              </div>

              {/* Day Cells */}
              {symptom.days.map((day) => {
                const isSelected = selectedDays.includes(day.day);
                const cellKey = `${symptom.symptom}-${day.day}`;
                const isActive = activeCell === cellKey;

                return (
                  <div key={day.day} className="flex-1 min-w-[40px] px-0.5">
                    <button
                      type="button"
                      onClick={() => onDayClick?.(day.day)}
                      onMouseEnter={() => setActiveCell(cellKey)}
                      onMouseLeave={() => setActiveCell(null)}
                      className={`w-full h-8 rounded transition-all ${getHeatMapIntensityStyle(
                        day.intensity,
                        day.logged
                      )} ${isActive ? "ring-2 ring-app-charcoal ring-offset-1" : ""} ${
                        isSelected ? "ring-2 ring-app-teal" : ""
                      }`}
                      title={getHeatMapCellTitle(symptom.symptom, day.day, day.intensity, day.logged)}
                    >
                      {isActive && day.logged && (
                        <span className="text-xs font-medium">
                          {day.intensity !== null ? day.intensity : "✓"}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Scroll indicator for many symptoms */}
        {data.length > 8 && (
          <div className="flex justify-center mt-2 text-app-gray/50">
            <svg
              className="w-4 h-4 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Mobile Legend */}
      <div className="md:hidden mt-3 mb-2 flex flex-wrap items-center justify-center gap-3 text-xs text-app-gray">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-border" />
          <span>No logs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-teal/50 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-app-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>Logged</span>
        </div>
        {cycleEnabled && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-app-red/20 border border-app-red flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-app-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Logged (Period)</span>
          </div>
        )}
      </div>

      {/* Desktop Legend */}
      <div className="hidden md:flex mt-3 mb-2 flex-wrap items-center justify-center gap-3 text-xs text-app-gray">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-border" />
          <span>Not logged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-teal/50" />
          <span>Low Intensity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-teal/75" />
          <span>Medium Intensity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-teal" />
          <span>High Intensity</span>
        </div>
      </div>
    </div>
  );
}

// Heat map helper functions
function getHeatMapIntensityStyle(intensity: number | null, logged: boolean): string {
  if (!logged) {
    return "bg-app-border";
  }
  if (intensity === null) {
    return "bg-app-teal/30 text-app-teal";
  }
  if (intensity <= 3) return "bg-app-teal/50 text-app-teal";
  if (intensity <= 6) return "bg-app-teal/75 text-white";
  return "bg-app-teal text-white";
}

function getHeatMapCellTitle(
  symptom: string,
  day: string,
  intensity: number | null,
  logged: boolean
): string {
  if (!logged) {
    return `${symptom} - ${day}: Not logged`;
  }
  if (intensity === null) {
    return `${symptom} - ${day}: Logged (no intensity)`;
  }
  return `${symptom} - ${day}: Intensity ${intensity}/10`;
}

// ============================================
// BRISTOL TIMELINE HEAT MAP
// Shows Bristol types by day with color intensity = entry count
// ============================================

interface BristolDayData {
  day: string;
  entries: { type: number; count: number }[];
  totalCount: number;
}

interface BristolTimelineData {
  days: BristolDayData[];
  maxEntriesInDay: number;
}

interface BristolTimelineChartProps {
  data: BristolTimelineData;
  onDayClick?: (day: string) => void;
  selectedDays?: string[];
}

const BRISTOL_DESCRIPTIONS: Record<number, string> = {
  1: "Hard lumps (Constipation)",
  2: "Lumpy sausage (Mild constipation)",
  3: "Cracked sausage (Normal)",
  4: "Smooth snake (Normal)",
  5: "Soft blobs (Lacking fiber)",
  6: "Mushy (Mild diarrhea)",
  7: "Watery (Diarrhea)",
};

function BristolTimelineChart({ data, onDayClick, selectedDays = [] }: BristolTimelineChartProps) {
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const hasData = data.days.some((d) => d.entries.length > 0);

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🧻</span>
        <p className="text-app-charcoal font-medium">None to show this week</p>
        <p className="text-sm text-app-gray mt-1">Log bowel movements to see patterns</p>
      </div>
    );
  }

  // Calculate totals
  const totalBMs = data.days.reduce((sum, d) => sum + d.totalCount, 0);
  const allTypes = data.days.flatMap((d) => d.entries.flatMap((e) => Array(e.count).fill(e.type)));
  const avgType = allTypes.length > 0 
    ? (allTypes.reduce((a, b) => a + b, 0) / allTypes.length).toFixed(1) 
    : "—";

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-app-charcoal">Bristol Timeline</h4>
        <p className="text-xs text-app-gray mt-0.5">
          Bowel movements by day • Click a day column to filter
        </p>
      </div>
      {/* Summary stats */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-app-gray">Total:</span>
          <span className="font-medium text-DEFAULT">{totalBMs} BMs</span>
        </div>
      </div>
      {/* Timeline Grid - Days on X-axis, Bristol Types on Y-axis */}
      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          {/* Day header row */}
          <div className="flex mb-1">
            <div className="w-16 shrink-0" /> {/* Space for type labels */}
            {data.days.map((dayData) => {
              const isSelected = selectedDays.includes(dayData.day);
              return (
                <button
                  key={dayData.day}
                  type="button"
                  onClick={() => onDayClick?.(dayData.day)}
                  className={`flex-1 min-w-[36px] text-center text-xs font-medium py-1 rounded-t transition-colors ${
                    isSelected
                      ? "bg-app-teal text-white"
                      : "text-app-charcoal hover:bg-app-cream"
                  }`}
                >
                  {dayData.day}
                </button>
              );
            })}
          </div>

          {/* Bristol type rows (1-7) */}
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7].map((type) => {
              const isNormal = type === 3 || type === 4;
              return (
                <div 
                  key={type} 
                  className={`flex items-center ${
                    isNormal ? "border-2 border-app-plumb rounded-lg" : ""
                  }`}
                >
                  {/* Type label - with tooltip */}
                  <div
                    className={`w-16 shrink-0 text-xs font-medium pr-2 text-right cursor-help ${
                      isNormal ? "text-DEFAULT" : "text-app-gray"
                    }`}
                    title={`Type ${type}: ${BRISTOL_DESCRIPTIONS[type]}`}
                    onMouseEnter={() => setActiveCell(`label-${type}`)}
                    onMouseLeave={() => setActiveCell(null)}
                  >
                    Type {type}
                  </div>

                  {/* Day cells for this Bristol type */}
                  {data.days.map((dayData) => {
                    const entry = dayData.entries.find((e) => e.type === type);
                    const count = entry?.count || 0;
                    const cellKey = `${dayData.day}-${type}`;
                    const isActive = activeCell === cellKey;
                    const isSelected = selectedDays.includes(dayData.day);

                    return (
                      <div key={dayData.day} className="flex-1 min-w-[36px] px-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (count > 0) {
                              setActiveCell(isActive ? null : cellKey);
                            }
                            // Always allow day filtering on click
                            onDayClick?.(dayData.day);
                          }}
                          onMouseEnter={() => count > 0 && setActiveCell(cellKey)}
                          onMouseLeave={() => setActiveCell(null)}
                          className={`w-full h-7 rounded transition-all flex items-center justify-center ${
                            count === 0
                              ? `bg-app-border/30 ${isSelected ? "ring-2 ring-app-plumb ring-offset-1" : ""}`
                              : `${getBristolCellStyle(count)} ${
                                  isActive ? "ring-2 ring-app-charcoal ring-offset-1" : ""
                                } ${isSelected ? "ring-2 ring-app-plumb ring-offset-1" : ""}`
                          }`}
                          title={
                            count > 0
                              ? `${dayData.day} - Type ${type}: ${count} ${count === 1 ? "entry" : "entries"}`
                              : `${dayData.day} - No Type ${type} entries`
                          }
                        >
                          {isActive && count > 0 && (
                            <span className={`text-xs font-medium ${
                                count > 1 ? "text-white" : ""
                            }`}>
                                {count}
                            </span>
                            )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Type descriptions on hover */}
      {activeCell && (
        <div className="mt-3 p-2 bg-app-cream rounded-lg text-center">
          <p className="text-xs text-app-charcoal">
            <span className="font-medium">Type {activeCell.split("-")[1]}:</span>{" "}
            {BRISTOL_DESCRIPTIONS[Number(activeCell.split("-")[1])]}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper to get cell style based on count
function getBristolCellStyle(count: number): string {
  // All cells use the same green color, opacity based on count
  if (count >= 1) return "bg-app-plumb/50 text-white";
  return "bg-app-50 text-white";
}

// ============================================
// CYCLE DAY CARD (Expandable)
// ============================================

interface CycleDayCardProps {
  day: {
    day: string;
    phase: string | null;
    flow: string | null;
    products: { type: string; size?: string }[];
    periodMedicines: { name: string; dosage?: string }[];
    periodSymptoms: { name: string; intensity: number | null }[];
  };
  isExpanded: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
}

// ============================================
// CYCLE DAY BREAKDOWN (with detail panel)
// ============================================

interface CycleDayBreakdownProps {
  dayBreakdown: CycleData["dayBreakdown"];
  customProducts?: Record<string, { id: string; name: string }[]>;
}

function CycleDayBreakdown({ dayBreakdown, customProducts = {} }: CycleDayBreakdownProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const selectedDayData = selectedDay 
    ? dayBreakdown.find(d => d.day === selectedDay) 
    : null;

  // Check if day is in menstrual phase
  const isMenstrualPhase = (phase: string | null) => phase === "menstrual";

  // Format product name - use custom name if available, otherwise capitalize standard types
  const formatProductName = (product: { type: string; customProductId?: string; size?: string }) => {
    // Standard product types
    const standardTypes: Record<string, string> = {
      pad: "Pad",
      tampon: "Tampon",
      cup: "Cup",
      disc: "Disc",
      liner: "Liner",
      "period-underwear": "Period Underwear",
      other: "Other",
    };

    // If there's a custom product ID, look up the name
    if (product.customProductId) {
      // First try the specific product type category
      if (customProducts[product.type]) {
        const customProduct = customProducts[product.type].find(cp => cp.id === product.customProductId);
        if (customProduct) {
          return customProduct.name;
        }
      }
      
      // If not found, search ALL categories (in case type doesn't match)
      for (const products of Object.values(customProducts)) {
        const found = products.find(cp => cp.id === product.customProductId);
        if (found) {
          return found.name;
        }
      }
    }

    // Check if the type itself might be a standard type
    if (standardTypes[product.type]) {
      return standardTypes[product.type];
    }

    // Fallback: clean up the type string and capitalize
    return product.type
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Get color classes based on phase
  const getColorClasses = (phase: string | null) => {
    if (isMenstrualPhase(phase)) {
      return {
        bg: "bg-app-red/20",
        ring: "ring-app-red",
        dot: "bg-app-red",
        text: "text-app-red",
        panelBg: "bg-app-red/5",
        panelBorder: "border-app-red/20",
        hoverBorder: "hover:border-app-red",
      };
    }
    return {
      bg: "bg-app-teal/10",
      ring: "ring-app-teal",
      dot: "bg-app-teal",
      text: "text-app-teal",
      panelBg: "bg-app-teal/5",
      panelBorder: "border-app-teal/20",
      hoverBorder: "hover:border-app-teal",
    };
  };

  const selectedColors = selectedDayData ? getColorClasses(selectedDayData.phase) : null;

  return (
    <div className="mt-4 pt-4 border-t border-app-border">
      <p className="text-xs font-medium text-app-gray mb-2">By Day</p>
      
      {/* Day Cards Row */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {dayBreakdown.map((day) => {
          const hasData = day.phase || day.flow;
          const hasDetails = day.products.length > 0 || day.periodMedicines.length > 0 || day.periodSymptoms.length > 0;
          const isSelected = selectedDay === day.day;
          const colors = getColorClasses(day.phase);

          return (
            <button
              key={day.day}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : day.day)}
              className={`flex-1 min-w-[50px] p-2 rounded-lg text-center transition-all border-2 border-transparent ${
                hasData 
                  ? `${colors.bg} ${colors.text} ${colors.hoverBorder}` 
                  : "bg-app-cream/50 text-app-gray"
              } ${isSelected 
                  ? `ring-2 ${colors.ring} shadow-md scale-95` 
                  : "hover:scale-95"
              }`}
            >
              <p className="text-xs font-medium text-app-charcoal">{day.day}</p>
              {day.phase && (
                <p className={`text-xs ${colors.text} truncate`} title={formatCyclePhase(day.phase)}>
                  {formatCyclePhase(day.phase)}
                </p>
              )}
              {day.flow && (
                <p className="text-xs text-app-gray capitalize truncate">{day.flow}</p>
              )}
              {!hasData && <p className="text-xs text-app-gray">—</p>}
              
              {/* Indicator dot if has details */}
              {hasDetails && (
                <div className="flex justify-center mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDayData && selectedColors && (
        <div className={`mt-3 p-3 ${selectedColors.panelBg} rounded-lg border ${selectedColors.panelBorder}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-app-charcoal">{selectedDayData.day}</p>
              <div className="flex items-center gap-2 text-xs">
                {selectedDayData.phase && (
                  <span className={selectedColors.text}>{formatCyclePhase(selectedDayData.phase)}</span>
                )}
                {selectedDayData.phase && selectedDayData.flow && (
                  <span className="text-app-gray">•</span>
                )}
                {selectedDayData.flow && (
                  <span className="text-app-gray capitalize">{selectedDayData.flow} flow</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="p-1 text-app-gray hover:text-app-charcoal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Products */}
            <div>
              <p className="text-xs font-medium text-app-gray mb-1.5">Products Used</p>
              {selectedDayData.products.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                {selectedDayData.products.map((p, idx) => {
                  // Filter out boolean-like or invalid size values
                  const validSize = p.size && !["yes", "true", "false", "no"].includes(p.size.toLowerCase()) 
                    ? p.size 
                    : null;
                  
                  return (
                    <span key={idx} className={`px-2 py-1 text-xs ${selectedColors.bg} ${selectedColors.text} rounded`}>
                      {formatProductName(p)}{validSize ? ` (${validSize})` : ""}
                    </span>
                  );
                })}
                </div>
              ) : (
                <p className="text-xs text-app-gray italic">None logged</p>
              )}
            </div>

            {/* Period Medicines */}
            <div>
              <p className="text-xs font-medium text-app-gray mb-1.5">Medicines</p>
              {selectedDayData.periodMedicines.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedDayData.periodMedicines.map((m, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-app-green/10 text-app-charcoal rounded">
                      {m.name}{m.dosage ? ` (${m.dosage})` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-app-gray italic">None logged</p>
              )}
            </div>

            {/* Period Symptoms - red only if menstrual phase, otherwise teal */}
            <div>
              <p className="text-xs font-medium text-app-gray mb-1.5">Period Symptoms</p>
              {selectedDayData.periodSymptoms.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedDayData.periodSymptoms.map((s, idx) => (
                    <span 
                      key={idx} 
                      className={`px-2 py-1 text-xs rounded ${
                        isMenstrualPhase(selectedDayData.phase)
                          ? "bg-app-red/10 text-app-red"
                          : "bg-app-teal/10 text-app-teal"
                      }`}
                    >
                      {s.name}{s.intensity !== null ? ` (${s.intensity}/10)` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-app-gray italic">None logged</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend for day strip */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-app-gray">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-app-red/20 border border-app-red" />
          <span>Period</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-app-teal/10 border border-app-teal" />
          <span>Other phases</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-app-green" />
          <span>Has details</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CYCLE LOGS CHART
// ============================================

interface CycleData {
  phases: { phase: string; label: string; count: number }[];
  flows: { flow: string; count: number; dates: string[] }[];
  dayBreakdown: {
    day: string; 
    phase: string | null; 
    flow: string | null;
    products: { type: string; customProductId?: string; size?: string }[];
    periodMedicines: { name: string; dosage?: string }[];
    periodSymptoms: { name: string; intensity: number | null }[];
  }[];
}
interface CycleLogsChartProps {
  data: CycleData;
  customProducts?: Record<string, { id: string; name: string }[]>;
}

function CycleLogsChart({ data, customProducts = {} }: CycleLogsChartProps) {
  const hasData = data.phases.length > 0 || data.flows.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🌸</span>
        <p className="text-app-charcoal font-medium">None to show this week</p>
        <p className="text-sm text-app-gray mt-1">Log cycle data to see patterns</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-app-charcoal">Cycle Logs</h4>
        <p className="text-xs text-app-gray mt-0.5">
          Cycle phases and flow levels this week
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Phases */}
        {data.phases.length > 0 && (
          <div>
            <p className="text-xs font-medium text-app-gray mb-2">Phases Logged</p>
            <div className="space-y-2">
              {[...data.phases]
                .sort((a, b) => {
                  const order = ["menstrual", "follicular", "ovulation", "luteal", "not_sure"];
                  return order.indexOf(a.phase) - order.indexOf(b.phase);
                })
                .map((item) => {
                const isMenstrual = item.phase === "menstrual";
                return (
                  <div
                    key={item.phase}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isMenstrual ? "bg-app-red/10" : "bg-app-teal/10"
                    }`}
                  >
                    <span className="text-sm text-app-charcoal">{item.label}</span>
                    <span className={`text-sm font-medium ${isMenstrual ? "text-app-red" : "text-app-teal"}`}>
                      {item.count} day{item.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Flow Levels */}
        {data.flows.length > 0 && (
          <div>
            <p className="text-xs font-medium text-app-gray mb-2">Flow Levels</p>
            <div className="space-y-2">
              {data.flows.map((item) => {
                // Format dates for display
                const formatFlowDates = (dates: string[]): string => {
                  if (dates.length === 0) return "";
                  const sortedDates = [...dates].sort();
                  const formatted = sortedDates.map(d => {
                    const [, month, day] = d.split("-").map(Number);
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    return `${monthNames[month - 1]} ${day}`;
                  });
                  
                  if (formatted.length <= 3) {
                    return formatted.join(", ");
                  }
                  return `${formatted[0]}, ${formatted[1]}, +${formatted.length - 2} more`;
                };
                
                return (
                  <div
                    key={item.flow}
                    className="p-2 bg-app-red/5 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-charcoal capitalize">{item.flow}</span>
                      <span className="text-sm text-app-red font-medium">{item.count} day{item.count !== 1 ? "s" : ""}</span>
                    </div>
                    {item.dates && item.dates.length > 0 && (
                      <p className="text-xs text-app-gray mt-1">
                        {formatFlowDates(item.dates)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day breakdown if we have data */}
      {data.dayBreakdown.some((d) => d.phase || d.flow) && (
        <CycleDayBreakdown dayBreakdown={data.dayBreakdown} customProducts={customProducts} />
      )}
    </div>
  );
}

// ============================================
// ENHANCED MEDICINE LOGS CHART
// ============================================

interface MedicineItem {
  name: string;
  count: number;
  dosages: string[];
  daysUsed: string[];
  timeOfDay: { period: string; count: number }[];
}

interface MedicineChartData {
  medicines: MedicineItem[];
  totalDoses: number;
  daysWithMedicine: number;
  timeDistribution: { period: string; count: number }[];
  coOccurringSymptoms: { symptom: string; count: number }[];
}

interface MedicineLogsChartProps {
  data: MedicineChartData;
}

function MedicineLogsChart({ data }: MedicineLogsChartProps) {
  const [expandedMedicine, setExpandedMedicine] = useState<string | null>(null);

  if (data.medicines.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">💊</span>
        <p className="text-app-charcoal font-medium">None to show this week</p>
        <p className="text-sm text-app-gray mt-1">Log medicines to see usage patterns</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-app-charcoal">Medicine Logs</h4>
        <p className="text-xs text-app-gray mt-0.5">
          Medicine usage patterns this week
        </p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-app-green/10 rounded-lg text-center">
          <p className="text-xl font-bold text-app-green/50">{data.totalDoses}</p>
          <p className="text-xs text-app-gray">Total doses</p>
        </div>
        <div className="p-3 bg-app-green/10 rounded-lg text-center">
          <p className="text-xl font-bold text-app-green/50">{data.medicines.length}</p>
          <p className="text-xs text-app-gray">Medicines</p>
        </div>
        <div className="p-3 bg-app-green/10 rounded-lg text-center">
          <p className="text-xl font-bold text-app-green/50">{data.daysWithMedicine}/7</p>
          <p className="text-xs text-app-gray">Days taken</p>
        </div>
      </div>

      {/* Time of Day Distribution */}
      {data.timeDistribution.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-app-gray mb-2">Time of Day</p>
          <div className="flex gap-2">
            {["Morning", "Afternoon", "Evening", "Night"].map((period) => {
              const periodData = data.timeDistribution.find((t) => t.period === period);
              const count = periodData?.count || 0;
              const maxCount = Math.max(...data.timeDistribution.map((t) => t.count));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

              return (
                <div key={period} className="flex-1 text-center">
                  <div className="h-16 bg-app-border/50 rounded-lg relative overflow-hidden mb-1">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-app-green/30 transition-all"
                      style={{ height: `${percentage}%` }}
                    />
                    {count > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-app-charcoal">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-app-gray">{period}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Medicine List */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-app-gray">Medicines Taken • Click card to expand</p>
        {data.medicines.map((medicine) => {
          const isExpanded = expandedMedicine === medicine.name;

          return (
            <div
              key={medicine.name}
              className="bg-app-cream/50 rounded-lg border border-app-border overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedMedicine(isExpanded ? null : medicine.name)}
                className="w-full p-3 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-medium text-app-charcoal">{medicine.name}</p>
                  <p className="text-xs text-app-gray">
                    {medicine.count}× · {medicine.daysUsed.length} day{medicine.daysUsed.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-app-gray transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-app-border pt-2">
                  {/* Days used */}
                  <div>
                    <p className="text-xs text-app-gray mb-1">Days</p>
                    <div className="flex flex-wrap gap-1">
                      {medicine.daysUsed.map((day) => (
                        <span
                          key={day}
                          className="px-2 py-0.5 text-xs bg-app-green/10 text-app-charcoal rounded"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Dosages */}
                  {medicine.dosages.length > 0 && (
                    <div>
                      <p className="text-xs text-app-gray mb-1">Dosages</p>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(medicine.dosages)].map((dosage, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-app-green/10 text-app-charcoal rounded"
                          >
                            {dosage}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Co-occurring Symptoms */}
      {data.coOccurringSymptoms.length > 0 && (
        <div className="mt-4 pt-4 border-t border-app-border">
          <p className="text-xs font-medium text-app-gray mb-2">Often taken with these symptoms</p>
          <div className="flex flex-wrap gap-1">
            {data.coOccurringSymptoms.slice(0, 5).map((symptom) => (
              <span
                key={symptom.symptom}
                className="px-2 py-1 text-xs bg-app-teal/10 text-app-teal rounded-full"
              >
                {symptom.symptom} ({symptom.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// BUILD CHART DATA HELPER
// ============================================

function buildChartData(
  entries: StoredEntry[],
  orderedDays: string[],
  medicines: { id: string; name: string; categories: string[] }[] = []
): {
  symptomData: SymptomFrequencyData[];
  bristolData: BristolTimelineData;
  cycleData: CycleData;
  medicineData: MedicineChartData;
  symptomHeatMapData: SymptomHeatMapData[];
  oneOffSymptomData: OneOffSymptomData[];
} {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ===== SYMPTOM FREQUENCY =====
  const symptomByDay: Record<string, Record<string, number>> = {};

  for (const entry of entries) {
    const date = new Date(entry.date + "T12:00:00");
    const dayName = dayNames[date.getDay()];
    
    for (const symptom of Object.keys(entry.symptomIntensities)) {
      if (!symptomByDay[symptom]) symptomByDay[symptom] = {};
      symptomByDay[symptom][dayName] = (symptomByDay[symptom][dayName] || 0) + 1;
    }
    for (const symptom of Object.keys(entry.periodSymptomIntensities)) {
      if (!symptomByDay[symptom]) symptomByDay[symptom] = {};
      symptomByDay[symptom][dayName] = (symptomByDay[symptom][dayName] || 0) + 1;
    }
  }

  const symptomData: SymptomFrequencyData[] = Object.entries(symptomByDay)
    .map(([name, dayCounts]) => {
      const entries = Object.entries(dayCounts);
      const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);
      
      // Find highest and lowest days
      let highestCount = 0, highestDay = "—";
      let lowestCount = Infinity, lowestDay = "—";
      
      for (const [day, count] of entries) {
        if (count > highestCount) {
          highestCount = count;
          highestDay = day;
        }
        if (count < lowestCount) {
          lowestCount = count;
          lowestDay = day;
        }
      }
      
      // Handle case where symptom only logged once
      if (lowestCount === Infinity) lowestCount = 0;
      if (entries.length === 1) {
        lowestCount = highestCount;
        lowestDay = highestDay;
      }
      
      return { name, totalCount, highestCount, highestDay, lowestCount, lowestDay };
    })
    .sort((a, b) => b.totalCount - a.totalCount);

  // ===== ONE-OFF SYMPTOM FREQUENCY =====
  // Case-normalized counting but display original casing
  const oneOffCounts: Map<string, { displayName: string; count: number }> = new Map();

  for (const entry of entries) {
    const symptoms = entry.oneOffSymptoms ?? [];
    for (const symptom of symptoms) {
      const normalizedKey = symptom.toLowerCase();
      const existing = oneOffCounts.get(normalizedKey);
      if (existing) {
        existing.count++;
      } else {
        // Use original casing for display
        oneOffCounts.set(normalizedKey, { displayName: symptom, count: 1 });
      }
    }
  }

  const oneOffSymptomData: OneOffSymptomData[] = Array.from(oneOffCounts.values())
    .map(({ displayName, count }) => ({ name: displayName, count }))
    .sort((a, b) => b.count - a.count);

  // ===== BRISTOL TIMELINE DATA =====
  const bristolByDay: Record<string, Record<number, number>> = {};
  for (const day of orderedDays) {
    bristolByDay[day] = {};
  }

  for (const entry of entries) {
    if (entry.stoolType) {
      const date = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[date.getDay()];
      if (bristolByDay[dayName]) {
        bristolByDay[dayName][entry.stoolType] = (bristolByDay[dayName][entry.stoolType] || 0) + 1;
      }
    }
  }

  const bristolDays: BristolDayData[] = orderedDays.map((day) => {
    const dayData = bristolByDay[day] || {};
    const entries = Object.entries(dayData).map(([type, count]) => ({
      type: Number(type),
      count,
    }));
    const totalCount = entries.reduce((sum, e) => sum + e.count, 0);
    return { day, entries, totalCount };
  });

  const maxEntriesInDay = Math.max(...bristolDays.map((d) => d.totalCount), 1);

  const bristolData: BristolTimelineData = {
    days: bristolDays,
    maxEntriesInDay,
  };

  // ===== CYCLE DATA =====
  const phaseDates: Record<string, Set<string>> = {};  // Track unique dates per phase
  const flowData: Record<string, { count: number; dates: string[] }> = {};

  const dayPhaseMap: Record<string, { 
    phase: string | null; 
    flow: string | null;
    products: { type: string; customProductId?: string; size?: string }[];
    periodMedicines: { name: string; dosage?: string }[];
    periodSymptoms: { name: string; intensity: number | null }[];
  }> = {};

  for (const day of orderedDays) {
    dayPhaseMap[day] = { 
      phase: null, 
      flow: null, 
      products: [] as { type: string; size?: string }[],
      periodMedicines: [] as { name: string; dosage?: string }[],
      periodSymptoms: [] as { name: string; intensity: number | null }[],
    };
  }

  for (const entry of entries) {
    if (entry.cyclePhase) {
      if (!phaseDates[entry.cyclePhase]) {
        phaseDates[entry.cyclePhase] = new Set();
      }
      phaseDates[entry.cyclePhase].add(entry.date);

      const date = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[date.getDay()];
      if (dayPhaseMap[dayName]) {
        dayPhaseMap[dayName].phase = entry.cyclePhase;
      }
    }
    if (entry.periodFlow) {
      if (!flowData[entry.periodFlow]) {
        flowData[entry.periodFlow] = { count: 0, dates: [] };
      }
      flowData[entry.periodFlow].count++;
      if (!flowData[entry.periodFlow].dates.includes(entry.date)) {
        flowData[entry.periodFlow].dates.push(entry.date);
      }

      const date = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[date.getDay()];
      if (dayPhaseMap[dayName]) {
        dayPhaseMap[dayName].flow = entry.periodFlow;
      }
    }
    // Add product usage (deduplicated)
    if (entry.productUsage && entry.productUsage.length > 0) {
      const date = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[date.getDay()];
      if (dayPhaseMap[dayName]) {
        for (const product of entry.productUsage) {
          // Check for duplicates before adding
          const existing = dayPhaseMap[dayName].products.find(
            p => p.type === product.productType && 
                p.customProductId === product.customProductId && 
                p.size === product.size
          );
          if (!existing) {
            dayPhaseMap[dayName].products.push({
              type: product.productType,
              customProductId: product.customProductId,
              size: product.size,
            });
          }
        }
      }
    }

    // Add period-related medicines only (must have "period" category)
    for (const med of entry.medicineLog) {
      const medicineSettings = medicines.find(m => m.id === med.medicineId || m.name === med.medicineName);
      const isPeriodMedicine = medicineSettings?.categories.includes("period") ?? false;
      
      if (isPeriodMedicine) {
        const date = new Date(entry.date + "T12:00:00");
        const dayName = dayNames[date.getDay()];
        if (dayPhaseMap[dayName]) {
          // Check for duplicates before adding
          const existing = dayPhaseMap[dayName].periodMedicines.find(
            m => m.name === med.medicineName && m.dosage === med.dosage
          );
          if (!existing) {
            dayPhaseMap[dayName].periodMedicines.push({
              name: med.medicineName,
              dosage: med.dosage,
            });
          }
        }
      }
    }
    // Add period symptoms (deduplicated)
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      const date = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[date.getDay()];
      if (dayPhaseMap[dayName]) {
        // Check for duplicates before adding
        const existing = dayPhaseMap[dayName].periodSymptoms.find(s => s.name === symptom);
        if (!existing) {
          dayPhaseMap[dayName].periodSymptoms.push({
            name: symptom,
            intensity,
          });
        }
      }
    }
  }

  const cycleData: CycleData = {
  phases: Object.entries(phaseDates).map(([phase, dates]) => ({
    phase,
    label: CYCLE_PHASES.find((p) => p.value === phase)?.label || phase,
    count: dates.size,
  })),
  flows: Object.entries(flowData)
    .map(([flow, data]) => ({ flow, count: data.count, dates: data.dates.sort() }))
    .sort((a, b) => b.count - a.count),
  dayBreakdown: orderedDays.map((day) => ({
    day,
    phase: dayPhaseMap[day]?.phase || null,
    flow: dayPhaseMap[day]?.flow || null,
    products: dayPhaseMap[day]?.products || [],
    periodMedicines: dayPhaseMap[day]?.periodMedicines || [],
    periodSymptoms: dayPhaseMap[day]?.periodSymptoms || [],
  })),
};

  // ===== ENHANCED MEDICINE DATA =====
  const medicineMap: Record<string, {
    count: number;
    dosages: string[];
    daysUsed: Set<string>;
    timeOfDay: Record<string, number>;
  }> = {};

  const overallTimeDistribution: Record<string, number> = {};
  const daysWithMedicine = new Set<string>();
  const symptomCoOccurrence: Record<string, number> = {};

  for (const entry of entries) {
    for (const log of entry.medicineLog) {
      if (!medicineMap[log.medicineName]) {
        medicineMap[log.medicineName] = {
          count: 0,
          dosages: [],
          daysUsed: new Set(),
          timeOfDay: {},
        };
      }

      medicineMap[log.medicineName].count += 1;

      if (log.dosage) {
        medicineMap[log.medicineName].dosages.push(log.dosage);
      }

      const date = new Date(entry.date + "T12:00:00");
      const dayName = dayNames[date.getDay()];
      medicineMap[log.medicineName].daysUsed.add(dayName);
      daysWithMedicine.add(entry.date);

      // Time of day - use medicine time if available, otherwise fall back to entry startTime
      let period = "Unknown";
      let hour: number | null = null;
      
      if (log.time) {
        // Medicine has its own time logged
        hour = log.time.period === "PM" && log.time.hour !== 12 
          ? log.time.hour + 12 
          : log.time.period === "AM" && log.time.hour === 12 
            ? 0 
            : log.time.hour;
      } else if (entry.startTime) {
        // Fall back to entry start time
        const [hourStr] = entry.startTime.split(":");
        hour = parseInt(hourStr, 10);
      }
      
      if (hour !== null) {
        if (hour >= 5 && hour < 12) period = "Morning";
        else if (hour >= 12 && hour < 17) period = "Afternoon";
        else if (hour >= 17 && hour < 21) period = "Evening";
        else period = "Night";
      }

      medicineMap[log.medicineName].timeOfDay[period] = 
        (medicineMap[log.medicineName].timeOfDay[period] || 0) + 1;
      overallTimeDistribution[period] = (overallTimeDistribution[period] || 0) + 1;

      // Track co-occurring symptoms
      for (const symptom of Object.keys(entry.symptomIntensities)) {
        symptomCoOccurrence[symptom] = (symptomCoOccurrence[symptom] || 0) + 1;
      }
    }
  }

  const medicineData: MedicineChartData = {
    medicines: Object.entries(medicineMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        dosages: data.dosages,
        daysUsed: Array.from(data.daysUsed),
        timeOfDay: Object.entries(data.timeOfDay)
          .map(([period, count]) => ({ period, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count),
    totalDoses: Object.values(medicineMap).reduce((sum, m) => sum + m.count, 0),
    daysWithMedicine: daysWithMedicine.size,
    timeDistribution: Object.entries(overallTimeDistribution)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => {
        const order = ["Morning", "Afternoon", "Evening", "Night"];
        return order.indexOf(a.period) - order.indexOf(b.period);
      }),
    coOccurringSymptoms: Object.entries(symptomCoOccurrence)
      .map(([symptom, count]) => ({ symptom, count }))
      .sort((a, b) => b.count - a.count),
  };

  // ===== SYMPTOM HEAT MAP DATA =====
  const symptomHeatMap: Record<string, Record<string, { intensity: number | null; logged: boolean }>> = {};
  
  for (const entry of entries) {
    const date = new Date(entry.date + "T12:00:00");
    const dayName = dayNames[date.getDay()];
    
    // General symptoms
    for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
      if (!symptomHeatMap[symptom]) {
        symptomHeatMap[symptom] = {};
        for (const d of orderedDays) {
          symptomHeatMap[symptom][d] = { intensity: null, logged: false };
        }
      }
      // Keep highest intensity if multiple entries on same day
      const existing = symptomHeatMap[symptom][dayName];
      if (!existing.logged || (intensity !== null && (existing.intensity === null || intensity > existing.intensity))) {
        symptomHeatMap[symptom][dayName] = { 
          intensity: intensity ?? existing.intensity, 
          logged: true 
        };
      }
    }
    
    // Period symptoms
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      if (!symptomHeatMap[symptom]) {
        symptomHeatMap[symptom] = {};
        for (const d of orderedDays) {
          symptomHeatMap[symptom][d] = { intensity: null, logged: false };
        }
      }
      const existing = symptomHeatMap[symptom][dayName];
      if (!existing.logged || (intensity !== null && (existing.intensity === null || intensity > existing.intensity))) {
        symptomHeatMap[symptom][dayName] = { 
          intensity: intensity ?? existing.intensity, 
          logged: true 
        };
      }
    }
  }
  
  // Convert to array format, sorted by total occurrences
  const symptomHeatMapData: SymptomHeatMapData[] = Object.entries(symptomHeatMap)
    .map(([symptom, dayData]) => ({
      symptom,
      days: orderedDays.map(day => ({ day, ...dayData[day] })),
      totalLogged: Object.values(dayData).filter(d => d.logged).length,
    }))
    .sort((a, b) => b.totalLogged - a.totalLogged)
    .map(({ symptom, days }) => ({ symptom, days }));

  return { symptomData, bristolData, cycleData, medicineData, symptomHeatMapData, oneOffSymptomData };
}

// ============================================
// HELPER: Format cycle phase for display
// ============================================

function formatCyclePhase(phase: string): string {
  const phaseMap: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
    not_sure: "Unsure",
  };
  return phaseMap[phase] || phase.charAt(0).toUpperCase() + phase.slice(1).replace("_", " ");
}