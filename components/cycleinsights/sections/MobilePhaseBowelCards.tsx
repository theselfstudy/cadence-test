"use client";

import { useState } from "react";
import {
  InfoPanel,
  type SelectedCellInfo,
  getStoolIntensityStyle,
  phaseConfig,
} from "./ConsistentPatternsSection";

const bristolLabels: Record<number, string> = {
  1: "Type 1", 2: "Type 2", 3: "Type 3", 4: "Type 4",
  5: "Type 5", 6: "Type 6", 7: "Type 7",
};

const bristolDescriptions: Record<number, string> = {
  1: "Hard lumps", 2: "Lumpy sausage", 3: "Cracked sausage",
  4: "Smooth snake", 5: "Soft blobs", 6: "Mushy", 7: "Watery",
};

interface MobilePhaseBowelCardsProps {
  phaseStoolData: Record<string, Record<number, { count: number; feelings: string[] }>>;
  bristolTypes: number[];
  isPhaseAware: boolean;
}

export function MobilePhaseBowelCards({ phaseStoolData, bristolTypes, isPhaseAware }: MobilePhaseBowelCardsProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCellInfo | null>(null);

  const phases = isPhaseAware
    ? ["menstrual", "follicular", "ovulation", "luteal"]
    : ["menstrual", "other"];

  if (bristolTypes.length === 0) return null;

  const maxCount = Math.max(
    ...bristolTypes.flatMap((type) =>
      phases.map((p) => phaseStoolData[p]?.[type]?.count ?? 0)
    ),
    1
  );

  const handleDotTap = (type: number, phase: string) => {
    const d = phaseStoolData[phase]?.[type];
    if (!d || d.count === 0) return;

    const name = `${bristolLabels[type]} — ${bristolDescriptions[type]}`;
    const cellKey = `${name}-${phase}`;
    const currentKey = selectedCell ? `${selectedCell.name}-${selectedCell.phase}` : null;

    if (cellKey === currentKey) {
      setSelectedCell(null);
    } else {
      setSelectedCell({
        name: `${bristolLabels[type]} — ${bristolDescriptions[type]}`,
        phase,
        count: d.count,
        feelings: d.feelings,
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
        {bristolTypes.map((type) => {
          const hasAnyData = phases.some((p) => (phaseStoolData[p]?.[type]?.count ?? 0) > 0);
          if (!hasAnyData) return null;

          return (
            <div key={type} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-app-charcoal truncate block">
                  {bristolLabels[type]}
                </span>
                <span className="text-[10px] text-app-gray truncate block">
                  {bristolDescriptions[type]}
                </span>
              </div>

              {phases.map((phase) => {
                const d = phaseStoolData[phase]?.[type];
                const hasData = d && d.count > 0;

                return (
                  <button
                    key={phase}
                    onClick={() => hasData && handleDotTap(type, phase)}
                    disabled={!hasData}
                    className="w-8 flex items-center justify-center"
                  >
                    {hasData ? (
                      <span
                        className={`inline-block w-5 h-5 rounded-full text-[9px] font-semibold leading-5 text-center ${getStoolIntensityStyle(
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
        colorScheme="plumb"
      />
    </div>
  );
}
