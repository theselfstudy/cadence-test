// /components/cycleinsights/shared/PatternCard.tsx
"use client";

import type { ConsistentPattern } from "@/lib/insightUtils";
import { ConsistencyRing } from "./RingIndicator";
import { PhasePill } from "./PhasePill";

// ============================================
// PATTERN CARD
// Displays a single consistent pattern with
// ring indicator, name, description, and estimated phase
// ============================================

interface PatternCardProps {
  /** The pattern data to display */
  pattern: ConsistentPattern;
  
  /** Whether to show the estimated phase pill */
  showPhase?: boolean;
  
  /** Optional additional classes */
  className?: string;
}

export function PatternCard({ 
  pattern, 
  showPhase = true, 
  className = "" 
}: PatternCardProps) {
  const { 
    name, 
    type, 
    cyclesPresent, 
    totalCycles, 
    description, 
    avgIntensity,
    isPeriodRelated,
    estimatedPhase,
  } = pattern;
  
  // Determine icon based on type
  const typeIcon = {
    symptom: "🏷️",
    medicine: "💊",
    stool: "🧻",
  }[type];
  
  // Show phase pill if we have an estimated phase
  const hasPhase = showPhase && estimatedPhase;
  
  return (
    <div 
      className={`
        bg-app-cream/30 rounded-lg p-3 
        border border-app-border/50
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Consistency Ring */}
        <div className="flex-shrink-0 pt-0.5">
          <ConsistencyRing
            cyclesPresent={cyclesPresent}
            totalCycles={totalCycles}
            isPeriodRelated={isPeriodRelated}
            size="sm"
            labelPosition="bottom"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Name + Phase Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-app-charcoal">
              {typeIcon} {name}
            </span>
            
            {hasPhase && estimatedPhase && (
              <PhasePill phase={estimatedPhase} size="sm" />
            )}
          </div>
          
          {/* Description - uses "days before/after period" language */}
          <p className="text-xs text-app-gray mt-1">
            {description}
          </p>
          
          {/* Average intensity (for symptoms only) */}
          {type === "symptom" && avgIntensity !== undefined && (
            <p className="text-xs text-app-gray/80 mt-1">
              Average intensity: {avgIntensity}/10
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PATTERN CARD LIST
// Helper component for rendering grouped patterns
// ============================================

interface PatternCardListProps {
  /** Array of patterns to display */
  patterns: ConsistentPattern[];
  
  /** Whether to show phase pills */
  showPhase?: boolean;
  
  /** Optional empty state message */
  emptyMessage?: string;
}

export function PatternCardList({ 
  patterns, 
  showPhase = true,
  emptyMessage = "No patterns found"
}: PatternCardListProps) {
  if (patterns.length === 0) {
    return (
      <p className="text-sm text-app-gray text-center py-4">
        {emptyMessage}
      </p>
    );
  }
  
  return (
    <div className="space-y-2">
      {patterns.map((pattern) => (
        <PatternCard 
          key={pattern.id} 
          pattern={pattern} 
          showPhase={showPhase}
        />
      ))}
    </div>
  );
}