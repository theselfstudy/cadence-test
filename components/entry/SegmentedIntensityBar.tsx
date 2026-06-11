"use client";

import { useRef, useCallback, useState } from "react";

interface SegmentedIntensityBarProps {
  /** Current intensity value */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Minimum value (1 for Simple, 0 for Mankoski) */
  min: number;
  /** Maximum value (typically 10) */
  max: number;
  /** Accent color theme */
  accentColor: "red" | "teal";
  /** Optional: show numbers on segments */
  showNumbers?: boolean;
}

/**
 * Segmented intensity bar with tap and drag support.
 * Works for both Simple (1-10) and Mankoski (0-10) pain scales.
 */
export function SegmentedIntensityBar({
  value,
  onChange,
  min,
  max,
  accentColor,
  showNumbers = false,
}: SegmentedIntensityBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generate array of values
  const segments = Array.from(
    { length: max - min + 1 },
    (_, i) => min + i
  );

  // Color classes based on accent
  const colors = {
    red: {
      filled: "bg-app-red",
      empty: "bg-app-red/20",
      hover: "hover:bg-app-red/30",
    },
    teal: {
      filled: "bg-app-teal",
      empty: "bg-app-teal/20",
      hover: "hover:bg-app-teal/30",
    },
  };

  const colorClasses = colors[accentColor];

  /**
   * Calculate which segment value corresponds to a given X position
   */
  const getValueFromPosition = useCallback(
    (clientX: number): number => {
      if (!barRef.current) return value;

      const rect = barRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const segmentIndex = Math.floor(percentage * segments.length);
      const clampedIndex = Math.max(0, Math.min(segments.length - 1, segmentIndex));
      
      return segments[clampedIndex];
    },
    [segments, value]
  );

  /**
   * Handle tap/click on a specific segment
   */
  const handleSegmentClick = (segmentValue: number) => {
    onChange(segmentValue);
  };

  /**
   * Handle drag start (mouse)
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const newValue = getValueFromPosition(e.clientX);
    onChange(newValue);

    // Add listeners for drag
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newVal = getValueFromPosition(moveEvent.clientX);
      onChange(newVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  /**
   * Handle drag start (touch)
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const newValue = getValueFromPosition(touch.clientX);
    onChange(newValue);
  };

  /**
   * Handle touch move
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newValue = getValueFromPosition(touch.clientX);
    onChange(newValue);
  };

  /**
   * Handle touch end
   */
  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={barRef}
      className={`
        flex gap-1 w-full select-none touch-none
        ${isDragging ? "cursor-grabbing" : "cursor-pointer"}
      `}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Intensity level"
      tabIndex={0}
      onKeyDown={(e) => {
        // Keyboard accessibility
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(max, value + 1));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(min, value - 1));
        } else if (e.key === "Home") {
          e.preventDefault();
          onChange(min);
        } else if (e.key === "End") {
          e.preventDefault();
          onChange(max);
        }
      }}
    >
      {segments.map((segmentValue) => {
        const isFilled = segmentValue <= value;
        const isFirst = segmentValue === min;
        const isLast = segmentValue === max;

        return (
          <button
            key={segmentValue}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSegmentClick(segmentValue);
            }}
            className={`
              flex-1 h-3 transition-all duration-150
              ${isFirst ? "rounded-l-full" : ""}
              ${isLast ? "rounded-r-full" : ""}
              ${isFilled ? colorClasses.filled : `${colorClasses.empty} ${colorClasses.hover}`}
              ${isDragging && isFilled ? "scale-y-110" : ""}
            `}
            aria-label={`Set intensity to ${segmentValue}`}
            tabIndex={-1}
          >
            {showNumbers && (
              <span className={`
                text-[10px] font-medium leading-3
                ${isFilled ? "text-white/80" : "text-app-gray"}
              `}>
                {segmentValue}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}