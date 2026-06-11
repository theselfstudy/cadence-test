"use client";

import { useState, useMemo } from "react";
import type { StoredEntry, TimeFormat } from "@/types";
import { BRISTOL_TYPES, POST_BOWEL_FEELINGS, CYCLE_PHASES } from "@/lib/constants";

// ============================================
// TYPES
// ============================================

export interface EntryCardProps {
  entries: StoredEntry[];
  timeFormat: TimeFormat;
  customProducts?: Record<string, { id: string; name: string }[]>;
}

interface EntryDetailSectionsProps {
  entry: StoredEntry;
  timeFormat: TimeFormat;
  customProducts?: Record<string, { id: string; name: string }[]>;
}

interface DayCardProps {
  date: string;
  entries: StoredEntry[];
  timeFormat: TimeFormat;
  customProducts?: Record<string, { id: string; name: string }[]>;
}

interface SingleEntryRowProps {
  entry: StoredEntry;
  timeFormat: TimeFormat;
  customProducts?: Record<string, { id: string; name: string }[]>;
}

// ============================================
// CONSTANTS
// ============================================

const CYCLE_PHASE_LABELS: Record<string, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
  not_sure: "Not Sure",
};

// ============================================
// ENTRY CARD — main export
// Accepts an array of entries, groups by date.
// Single-entry day: shows date + time inline, expands to detail sections.
// Multi-entry day: shows date + aggregate pills, expands to per-entry rows.
// ============================================

export function EntryCard({ entries, timeFormat, customProducts }: EntryCardProps) {
  const groups = useMemo(() => {
    const map: Record<string, StoredEntry[]> = {};
    for (const entry of entries) {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  return (
    <div className="space-y-3">
      {groups.map(([date, dayEntries]) => (
        <DayCard
          key={date}
          date={date}
          entries={dayEntries}
          timeFormat={timeFormat}
          customProducts={customProducts}
        />
      ))}
    </div>
  );
}

// ============================================
// DAY CARD — one collapsible card per date
// ============================================

function DayCard({ date, entries, timeFormat, customProducts = {} }: DayCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSingle = entries.length === 1;

  const totalSymptoms = entries.reduce(
    (sum, e) =>
      sum +
      Object.keys(e.symptomIntensities).length +
      Object.keys(e.periodSymptomIntensities).length +
      (e.oneOffSymptoms?.length || 0),
    0
  );
  const bristolCount = entries.filter((e) => e.stoolType).length;
  const medicineTaken = entries.reduce((sum, e) => sum + e.medicineLog.length, 0);

  const cyclePhase = [...entries]
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .find((e) => e.cyclePhase)?.cyclePhase ?? null;
  const cyclePhaseLabel = cyclePhase ? (CYCLE_PHASE_LABELS[cyclePhase] ?? cyclePhase) : null;

  const hasPills = totalSymptoms > 0 || bristolCount > 0 || cyclePhaseLabel || medicineTaken > 0;

  const singleEntry = isSingle ? entries[0] : null;
  const singleEntryTime = singleEntry
    ? singleEntry.startTime === singleEntry.endTime
      ? formatTimeForDisplay(singleEntry.startTime, timeFormat)
      : `${formatTimeForDisplay(singleEntry.startTime, timeFormat)} → ${formatTimeForDisplay(singleEntry.endTime, timeFormat)} · ${calculateDuration(singleEntry.startTime, singleEntry.endTime)}`
    : null;

  const pills = hasPills && (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      {totalSymptoms > 0 && (
        <span className="text-xs bg-app-teal/10 text-app-teal px-2 py-0.5 rounded-full whitespace-nowrap">
          {totalSymptoms} symptom{totalSymptoms !== 1 ? "s" : ""}
        </span>
      )}
      {bristolCount > 0 && (
        <span className="text-xs bg-app-plumb/10 text-app-plumb px-2 py-0.5 rounded-full whitespace-nowrap">
          Bristol ×{bristolCount}
        </span>
      )}
      {cyclePhaseLabel && (
        <span className="text-xs bg-app-red/10 text-app-red px-2 py-0.5 rounded-full whitespace-nowrap">
          {cyclePhaseLabel}
        </span>
      )}
      {medicineTaken > 0 && (
        <span className="text-xs bg-app-green/10 text-app-green px-2 py-0.5 rounded-full whitespace-nowrap">
          {medicineTaken} med{medicineTaken !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );

  return (
    <div className="bg-app-cream/50 rounded-lg border border-app-border">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-4 text-left">
        <div className="flex items-start justify-between">
          <div>
            {isSingle ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="font-semibold text-app-charcoal">{formatDate(date)}</p>
                {singleEntryTime && (
                  <span className="text-sm text-app-gray">{singleEntryTime}</span>
                )}
              </div>
            ) : (
              <p className="font-semibold text-app-charcoal">{formatDate(date)}</p>
            )}
            {pills}
            {!isSingle && (
              <p className="text-xs text-app-gray mt-1.5">
                {entries.length} entries
              </p>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-app-gray transition-transform flex-shrink-0 mt-0.5 ml-2 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        isSingle ? (
          <div className="px-4 pb-4 pt-4 border-t border-app-border">
            <EntryDetailSections
              entry={entries[0]}
              timeFormat={timeFormat}
              customProducts={customProducts}
            />
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-3 border-t border-app-border pt-3">
            {entries.map((entry) => (
              <SingleEntryRow
                key={entry.id}
                entry={entry}
                timeFormat={timeFormat}
                customProducts={customProducts}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ============================================
// SINGLE ENTRY ROW — individual entry within a multi-entry day
// ============================================

function SingleEntryRow({ entry, timeFormat, customProducts = {} }: SingleEntryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const generalSymptomCount = Object.keys(entry.symptomIntensities).length;
  const periodSymptomCount = Object.keys(entry.periodSymptomIntensities).length;
  const oneOffSymptomCount = entry.oneOffSymptoms?.length || 0;
  const medicineCount = entry.medicineLog.length;
  const isMenstrualPhase = entry.cyclePhase === "menstrual";

  return (
    <div className="bg-app-cream/50 rounded-lg border border-app-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left"
        aria-label={isExpanded ? "Collapse entry" : "Expand entry"}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-app-charcoal text-sm">
              {entry.startTime === entry.endTime
                ? formatTimeForDisplay(entry.startTime, timeFormat)
                : `${formatTimeForDisplay(entry.startTime, timeFormat)} → ${formatTimeForDisplay(entry.endTime, timeFormat)} · ${calculateDuration(entry.startTime, entry.endTime)}`}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-app-gray transition-transform flex-shrink-0 mt-0.5 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {periodSymptomCount > 0 && (
            <span className="text-xs bg-app-red/10 text-app-red px-2 py-0.5 rounded-full">
              {periodSymptomCount} period symptom{periodSymptomCount !== 1 ? "s" : ""}
            </span>
          )}
          {generalSymptomCount > 0 && (
            <span className="text-xs bg-app-teal/10 text-app-teal px-2 py-0.5 rounded-full">
              {generalSymptomCount} symptom{generalSymptomCount !== 1 ? "s" : ""}
            </span>
          )}
          {oneOffSymptomCount > 0 && (
            <span className="text-xs border-app-plumb/30 bg-app-plumb/10 border-2 text-app-plumb px-2 py-0.5 rounded-full">
              {oneOffSymptomCount} custom
            </span>
          )}
          {entry.stoolType && (
            <span className="text-xs bg-app-plumb/10 text-app-plumb px-2 py-0.5 rounded-full">
              Bristol {entry.stoolType}
            </span>
          )}
          {entry.cyclePhase && (
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
              isMenstrualPhase ? "bg-app-red/10 text-app-red" : "bg-app-teal/10 text-app-teal"
            }`}>
              {entry.cyclePhase.replace("_", " ")}
            </span>
          )}
          {medicineCount > 0 && (
            <span className="text-xs bg-app-green/10 text-app-green px-2 py-0.5 rounded-full">
              {medicineCount} medicine{medicineCount !== 1 ? "s" : ""}
            </span>
          )}
          {entry.notes && (
            <span className="text-xs bg-app-gray/10 text-app-gray px-2 py-0.5 rounded-full">
              Has notes
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-3 border-t border-app-border">
          <EntryDetailSections entry={entry} timeFormat={timeFormat} customProducts={customProducts} />
        </div>
      )}
    </div>
  );
}

// ============================================
// ENTRY DETAIL SECTIONS
// Exported for use in other contexts (e.g. detail modals)
// ============================================

export function EntryDetailSections({ entry, timeFormat, customProducts = {} }: EntryDetailSectionsProps) {
  const generalSymptomCount = Object.keys(entry.symptomIntensities).length;
  const periodSymptomCount = Object.keys(entry.periodSymptomIntensities).length;
  const oneOffSymptomCount = entry.oneOffSymptoms?.length || 0;
  const medicineCount = entry.medicineLog.length;
  const productCount = entry.productUsage?.length || 0;

  return (
    <div className="space-y-4">
      {(generalSymptomCount > 0 || periodSymptomCount > 0) && (
        <Section title="Symptoms" icon="🏷️">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(entry.periodSymptomIntensities).map(([symptom, intensity]) => (
              <span key={`period-${symptom}`} className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded">
                {symptom}{intensity !== null ? ` (${intensity})` : ""}
              </span>
            ))}
            {Object.entries(entry.symptomIntensities).map(([symptom, intensity]) => (
              <span key={`general-${symptom}`} className="text-xs bg-app-teal/10 text-app-teal px-2 py-1 rounded">
                {symptom}{intensity !== null ? ` (${intensity})` : ""}
              </span>
            ))}
          </div>
        </Section>
      )}

      {oneOffSymptomCount > 0 && (
        <Section title="One-Off Symptoms" icon="❖">
          <div className="flex flex-wrap gap-1.5">
            {entry.oneOffSymptoms?.map((symptom, idx) => (
              <span key={`oneoff-${idx}`} className="text-xs border-app-plumb/30 bg-app-plumb/10 border-2 text-app-plumb px-2 py-1 rounded">
                {symptom}
              </span>
            ))}
          </div>
        </Section>
      )}

      {(entry.stoolType || entry.stoolFeeling) && (
        <Section title="Bowel Movement" icon="🧻">
          <p className="text-sm text-app-charcoal">
            {entry.stoolType && (
              <>Type {entry.stoolType} - {BRISTOL_TYPES.find((b) => b.type === entry.stoolType)?.name || "Unknown"}</>
            )}
            {entry.stoolType && entry.stoolFeeling && <span className="text-app-gray"> · </span>}
            {entry.stoolFeeling && (
              <span className="text-app-gray">
                {POST_BOWEL_FEELINGS.find((f) => f.value === entry.stoolFeeling)?.label || entry.stoolFeeling}
              </span>
            )}
          </p>
        </Section>
      )}

      {(entry.cyclePhase || entry.periodFlow || productCount > 0) && (
        <Section title="Cycle" icon="🌸">
          {(entry.cyclePhase || entry.periodFlow) && (
            <p className="text-sm text-app-charcoal">
              {entry.cyclePhase && CYCLE_PHASES.find((p) => p.value === entry.cyclePhase)?.label}
              {entry.cyclePhase && entry.periodFlow && <span className="text-app-gray"> · </span>}
              {entry.periodFlow && (() => {
                const parsed = parseFlowValue(entry.periodFlow);
                return (
                  <span className="text-app-gray capitalize">
                    {parsed.level} flow
                    {parsed.startTime && <span> @ {formatTimeForDisplay(parsed.startTime, timeFormat)}</span>}
                  </span>
                );
              })()}
            </p>
          )}
          {productCount > 0 && (
            <div className="mt-2">
              <p className="text-xs text-app-gray mb-1.5">Products Used</p>
              <div className="flex flex-wrap gap-1.5">
                {entry.productUsage.map((product, idx) => (
                  <span key={idx} className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded">
                    {formatProductName(product, customProducts)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {medicineCount > 0 && (
        <Section title="Medicines" icon="💊">
          <div className="flex flex-wrap gap-1.5">
            {entry.medicineLog.map((log, idx) => (
              <span key={idx} className="text-xs bg-app-green/10 text-app-charcoal px-2 py-1 rounded">
                {log.medicineName}{log.dosage ? ` (${log.dosage})` : ""}{log.time ? ` @ ${formatTimeForDisplay(`${log.time.hour}:${log.time.minute.toString().padStart(2, "0")}${log.time.period ? ` ${log.time.period}` : ""}`, timeFormat)}` : ""}
              </span>
            ))}
          </div>
        </Section>
      )}

      {entry.notes && (
        <Section title="Notes" icon="📝">
          <p className="text-sm text-app-charcoal whitespace-pre-wrap">{entry.notes}</p>
        </Section>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-app-gray mb-1.5 flex items-center gap-1">
        <span>{icon}</span>
        {title}
      </p>
      <div className="pl-0.5">{children}</div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseFlowValue(flow: string | null): { level: string; startTime: string | null } {
  if (!flow) return { level: "", startTime: null };
  const match = flow.match(/^(.+?)\s*@\s*(.+)$/);
  if (match) return { level: match[1].trim(), startTime: match[2].trim() };
  return { level: flow, startTime: null };
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeForDisplay(timeStr: string, format: TimeFormat): string {
  if (!timeStr) return "";
  const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!ampmMatch) return "";
  let hour = parseInt(ampmMatch[1], 10);
  const minute = parseInt(ampmMatch[2], 10);
  const meridian = ampmMatch[3]?.toUpperCase();
  if (meridian === "PM" && hour < 12) hour += 12;
  if (meridian === "AM" && hour === 12) hour = 0;
  if (format === "24h") {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }
  const displayMeridian = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${displayMeridian}`;
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "—";
  const parseToMinutes = (t: string) => {
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return NaN;
    let hour = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (m[3]?.toUpperCase() === "PM" && hour < 12) hour += 12;
    if (m[3]?.toUpperCase() === "AM" && hour === 12) hour = 0;
    return hour * 60 + min;
  };
  let startTotal = parseToMinutes(startTime);
  let endTotal = parseToMinutes(endTime);
  if (isNaN(startTotal) || isNaN(endTotal)) return "—";
  if (endTotal < startTotal) endTotal += 24 * 60;
  const duration = endTotal - startTotal;
  if (duration < 60) return `${duration}m`;
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatProductName(
  product: { productType: string; customProductId?: string; size?: string },
  customProducts: Record<string, { id: string; name: string }[]>
): string {
  const typeLabels: Record<string, string> = {
    pad: "Pad",
    tampon: "Tampon",
    cup: "Cup",
    disc: "Disc",
    liner: "Liner",
    "period-underwear": "Period Underwear",
    other: "Other",
  };
  let customProduct: { id: string; name: string } | undefined;
  if (product.customProductId) {
    if (customProducts[product.productType]) {
      customProduct = customProducts[product.productType].find(
        (cp) => cp.id === product.customProductId
      );
    }
    if (!customProduct) {
      for (const products of Object.values(customProducts)) {
        const found = products.find((cp) => cp.id === product.customProductId);
        if (found) { customProduct = found; break; }
      }
    }
  }
  const validSize =
    product.size && !["yes", "true", "false", "no"].includes(product.size.toLowerCase())
      ? product.size
      : null;
  if (customProduct) {
    const typeLabel =
      typeLabels[product.productType] ||
      product.productType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${customProduct.name} (${typeLabel})`;
  }
  const formattedType =
    typeLabels[product.productType] ||
    product.productType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return validSize ? `${formattedType} (${validSize})` : formattedType;
}
