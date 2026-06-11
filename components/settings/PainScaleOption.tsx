"use client";

import { PAIN_SCALE_INFO } from "@/lib/constants";
import type { PainScaleType } from "@/types";

interface PainScaleOptionProps {
  type: PainScaleType;
  selected: boolean;
  onSelect: () => void;
  activeColor?: string;
}

export function PainScaleOption({
  type,
  selected,
  onSelect,
  activeColor = "app-green",
}: PainScaleOptionProps) {
  const info = PAIN_SCALE_INFO[type];
  
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full p-4 rounded-lg text-left transition-all ${
        selected
          ? `bg-${activeColor}/10 border-2 border-${activeColor}`
          : `bg-app-white border border-app-border hover:border-${activeColor}/50`
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none ${
            selected ? `border-${activeColor}` : "border-app-gray"
          }`}
        >
          {selected && <div className={`w-2.5 h-2.5 rounded-full bg-${activeColor}`} />}
        </div>
        <div>
          <p className={`font-medium ${selected ? `text-${activeColor}` : "text-app-charcoal"}`}>
            {info.name}
          </p>
          <p className="text-sm text-app-gray mt-0.5">{info.shortDescription}</p>
        </div>
      </div>
    </button>
  );
}