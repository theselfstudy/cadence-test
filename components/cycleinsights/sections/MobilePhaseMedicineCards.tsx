"use client";

import { useState } from "react";
import {
  InfoPanel,
  type SelectedCellInfo,
  getMedicineIntensityStyle,
  phaseConfig,
} from "./ConsistentPatternsSection";

interface MobilePhaseMedicineCardsProps {
  phaseMedicineData: Record<string, Record<string, { count: number; dosages: string[] }>>;
  allMedicines: string[];
  isPhaseAware: boolean;
  cycleCount: number;
}

export function MobilePhaseMedicineCards({ phaseMedicineData, allMedicines, isPhaseAware }: MobilePhaseMedicineCardsProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCellInfo | null>(null);

  const phases = isPhaseAware
    ? ["menstrual", "follicular", "ovulation", "luteal"]
    : ["menstrual", "other"];

  if (allMedicines.length === 0) return null;

  const maxCount = Math.max(
    ...allMedicines.flatMap((med) =>
      phases.map((p) => phaseMedicineData[p]?.[med]?.count ?? 0)
    ),
    1
  );

  const handleDotTap = (medicine: string, phase: string) => {
    const d = phaseMedicineData[phase]?.[medicine];
    if (!d || d.count === 0) return;

    const cellKey = `${medicine}-${phase}`;
    const currentKey = selectedCell ? `${selectedCell.name}-${selectedCell.phase}` : null;

    if (cellKey === currentKey) {
      setSelectedCell(null);
    } else {
      setSelectedCell({
        name: medicine,
        phase,
        count: d.count,
        dosages: d.dosages,
      });
    }
  };

  return (
    <div className="space-y-1">
      {/* Phase column headers */}
      <div className="flex items-center gap-2 px-2 pb-1">
        <span className="flex-1" />
        {phases.map((phase) => (
          <span key={phase} className="w-8 text-center text-[10px] text-app-gray truncate">
            {phaseConfig[phase]?.label.slice(0, 3)}
          </span>
        ))}
      </div>

      <div className="max-h-[340px] overflow-y-auto">
        {allMedicines.map((medicine) => {
          const hasAnyData = phases.some((p) => (phaseMedicineData[p]?.[medicine]?.count ?? 0) > 0);
          if (!hasAnyData) return null;

          return (
            <div key={medicine} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <span className="flex-1 text-sm text-app-charcoal truncate">
                {medicine}
              </span>

              {phases.map((phase) => {
                const d = phaseMedicineData[phase]?.[medicine];
                const hasData = d && d.count > 0;

                return (
                  <button
                    key={phase}
                    onClick={() => hasData && handleDotTap(medicine, phase)}
                    disabled={!hasData}
                    className="w-8 flex items-center justify-center"
                  >
                    {hasData ? (
                      <span
                        className={`inline-block w-5 h-5 rounded-full text-[9px] font-semibold leading-5 text-center ${getMedicineIntensityStyle(
                          d.count,
                          maxCount,
                          phase
                        )}`}
                      >
                        {d.count}
                      </span>
                    ) : (
                      <span className="inline-block w-5 h-5 rounded-full bg-app-border/30" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <InfoPanel
        info={selectedCell}
        onClose={() => setSelectedCell(null)}
        colorScheme="green"
      />

      {allMedicines.length > 10 && (
        <p className="text-xs text-app-gray text-center pt-1">
          Scroll for more ({allMedicines.length} medicines)
        </p>
      )}
    </div>
  );
}
