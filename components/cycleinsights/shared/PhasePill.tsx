// /components/cycleinsights/shared/PhasePill.tsx
"use client";

import type { CyclePhase } from "@/types";
import { formatPhase } from "@/lib/insightUtils";

// ============================================
// PHASE PILL
// Small badge showing cycle phase name
// Color-coded: Period = red, others = teal
// ============================================

interface PhasePillProps {
  /** The cycle phase to display */
  phase: CyclePhase | string;
  
  /** Size variant */
  size?: "sm" | "md";
  
  /** Optional additional classes */
  className?: string;
}

export function PhasePill({ 
  phase, 
  size = "sm", 
  className = "" 
}: PhasePillProps) {
  const isPeriod = phase === "menstrual";
  
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs" 
    : "px-2.5 py-1 text-sm";
  
  const colorClasses = isPeriod
    ? "bg-app-red/10 text-app-red border-app-red/20"
    : "bg-app-teal/10 text-app-teal border-app-teal/20";
  
  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${sizeClasses}
        ${colorClasses}
        ${className}
      `}
    >
      {formatPhase(phase)}
    </span>
  );
}