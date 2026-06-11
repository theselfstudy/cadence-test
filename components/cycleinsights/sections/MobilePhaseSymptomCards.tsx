"use client";

import { useState } from "react";
import type { CyclePhaseSymptomData } from "@/lib/monthlyUtils";
import {
  InfoPanel,
  type SelectedCellInfo,
  getPhaseIntensityStyle,
  phaseConfig,
} from "./ConsistentPatternsSection";

interface MobilePhaseSymptomCardsProps {
  data: CyclePhaseSymptomData[];
  isPhaseAware: boolean;
}

export function MobilePhaseSymptomCards({ data, isPhaseAware }: MobilePhaseSymptomCardsProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCellInfo | null>(null);

  const phases = isPhaseAware
    ? ["menstrual", "follicular", "ovulation", "luteal"]
    : ["menstrual", "other"];

  if (data.length === 0) return null;

  const maxIntensity = Math.max(
    ...data.flatMap((s) =>
      Object.values(s.phases).map((p) => p.avgIntensity ?? 0)
    ),
    1
  );

  const handleDotTap = (symptom: CyclePhaseSymptomData, phase: string) => {
    const d = symptom.phases[phase];
    if (!d || d.count === 0) return;

    const cellKey = `${symptom.symptom}-${phase}`;
    const currentKey = selectedCell ? `${selectedCell.name}-${selectedCell.phase}` : null;

    if (cellKey === currentKey) {
      setSelectedCell(null);
    } else {
      setSelectedCell({
        name: symptom.symptom,
        phase,
        count: d.count,
        avgIntensity: d.avgIntensity,
        isPeriodRelated: symptom.isPeriodRelated,
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
        {data.map((symptom) => (
          <div
            key={symptom.symptom}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <span className="flex-1 text-sm truncate text-app-charcoal">
              {symptom.symptom}
            </span>

            {phases.map((phase) => {
              const d = symptom.phases[phase];
              const hasData = d && d.count > 0;
              const intensity = d?.avgIntensity ?? d?.count ?? 0;

              return (
                <button
                  key={phase}
                  onClick={() => hasData && handleDotTap(symptom, phase)}
                  disabled={!hasData}
                  className="w-8 flex items-center justify-center"
                >
                  {hasData ? (
                    <span
                      className={`inline-block w-5 h-5 rounded-full text-[9px] font-semibold leading-5 text-center ${getPhaseIntensityStyle(
                        intensity,
                        maxIntensity,
                        false,
                        phase
                      )}`}
                    >
                      {d.avgIntensity !== null ? d.avgIntensity.toFixed(0) : d.count}
                    </span>
                  ) : (
                    <span className="inline-block w-5 h-5 rounded-full bg-app-border/30" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <InfoPanel
        info={selectedCell}
        onClose={() => setSelectedCell(null)}
        colorScheme="teal"
      />

      {data.length > 10 && (
        <p className="text-xs text-app-gray text-center pt-1">
          Scroll for more ({data.length} symptoms)
        </p>
      )}
    </div>
  );
}
