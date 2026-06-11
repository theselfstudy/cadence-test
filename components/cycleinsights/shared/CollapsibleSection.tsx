"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

// ============================================
// COLLAPSIBLE SECTION
// Reusable wrapper for all Cycle Insights sections
// Features: expand/collapse, help tooltip, badge display
// ============================================

interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: string;
  
  /** Optional icon component to display before the title */
  icon?: React.ReactNode;
  
  /** Optional badge text shown after title (e.g., "5 patterns", "2 noted") */
  badge?: string;
  
  /** Help text shown on "?" hover - explains what this section shows */
  helpText: string;
  
  /** Whether section starts expanded (default: true) */
  defaultExpanded?: boolean;
  
  /** Callback when section is toggled - use for persisting state */
  onToggle?: (isExpanded: boolean) => void;
  
  /** Section content */
  children: ReactNode;
  
  /** Optional: control expanded state externally */
  isExpanded?: boolean;
  
  /** Optional: additional CSS classes for the container */
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  helpText,
  defaultExpanded = true,
  onToggle,
  children,
  isExpanded: controlledExpanded,
  className = "",
}: CollapsibleSectionProps) {

  // ============================================
  // STATE & REFS
  // ============================================

  // Support both controlled and uncontrolled modes
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded ?? internalExpanded;

  // Track if user has manually toggled - once toggled, don't auto-sync
  const hasUserToggledRef = useRef(false);

  // For smooth height animation
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | "auto">("auto");

  // For tooltip visibility
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with defaultExpanded changes (handles hydration & responsive changes)
  // Only sync if user hasn't manually toggled
  useEffect(() => {
    if (!hasUserToggledRef.current && controlledExpanded === undefined) {
      setInternalExpanded(defaultExpanded);
    }
  }, [defaultExpanded, controlledExpanded]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          // Only update height when expanded to enable smooth collapse
          if (isExpanded) {
            setContentHeight(entry.contentRect.height);
          }
        }
      });
      
      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [isExpanded]);

  // Set initial height on mount
  useEffect(() => {
    if (contentRef.current && isExpanded) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, []);

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleToggle = () => {
    const newExpanded = !isExpanded;

    // Mark that user has manually toggled - stop auto-syncing
    hasUserToggledRef.current = true;

    // Update internal state if uncontrolled
    if (controlledExpanded === undefined) {
      setInternalExpanded(newExpanded);
    }

    // Notify parent for persistence
    onToggle?.(newExpanded);
  };

  const handleTooltipEnter = () => {
    // Small delay before showing tooltip to prevent flicker
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 150);
  };

  const handleTooltipLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div 
      className={`bg-app-white rounded-xl border border-app-border shadow-sm overflow-hidden ${className}`}
    >
      {/* Header - Always visible, clickable to toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-app-cream/30 transition-colors focus:outline-none focus:ring-2 focus:ring-app-teal/30 focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls={`section-content-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {/* Left side: chevron + icon + title + badge */}
        <div className="flex items-center gap-3">
          {/* Chevron - rotates when expanded */}
          <svg
            className={`w-5 h-5 text-app-charcoal transition-transform duration-200 ${
              isExpanded ? "rotate-0" : "-rotate-90"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </svg>
          
          {/* Optional Icon */}
          {icon && (
            <div className="w-5 h-5 text-app-teal flex-shrink-0">
              {icon}
            </div>
          )}
          
          {/* Title */}
          <h3 className="text-base font-semibold text-app-charcoal">
            {title}
          </h3>
          
          {/* Badge - subtle indicator of content count */}
          {badge && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-app-gray bg-app-cream rounded-full whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>

        {/* Right side: help icon with tooltip */}
        <div 
          className="relative"
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
          // Prevent click from toggling section
          onClick={(e) => e.stopPropagation()}
        >
          {/* Help icon */}
          <div
            className="w-6 h-6 rounded-full bg-app-cream flex items-center justify-center text-app-gray hover:bg-app-taupe/30 hover:text-app-charcoal transition-colors cursor-help"
            role="button"
            aria-label={`Help: ${helpText}`}
            tabIndex={0}
            onFocus={handleTooltipEnter}
            onBlur={handleTooltipLeave}
          >
            <span className="text-sm font-medium">?</span>
          </div>
          
          {/* Tooltip */}
          {showTooltip && (
            <div 
              className="absolute right-0 top-full mt-2 z-50 w-64 p-3 bg-app-charcoal text-app-white text-sm rounded-lg shadow-lg"
              role="tooltip"
            >
              {/* Tooltip arrow */}
              <div className="absolute -top-1.5 right-3 w-3 h-3 bg-app-charcoal rotate-45" />
              
              {/* Tooltip content */}
              <p className="relative z-10 leading-relaxed">
                {helpText}
              </p>
            </div>
          )}
        </div>
      </button>

      {/* Content - animated expand/collapse */}
      <div
        id={`section-content-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        aria-hidden={!isExpanded}
      >
        {/* Inner wrapper for measuring true content height */}
        <div ref={contentRef}>
          {/* Content padding - separate from animated container */}
          <div className="px-4 pb-4 pt-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// VARIANT: Section with "Don't show" option
// Used specifically for the Reflect section
// ============================================

interface DismissibleSectionProps extends CollapsibleSectionProps {
  /** Whether this section has been dismissed by user */
  isDismissed?: boolean;
  
  /** Callback when user clicks "Don't show this section" */
  onDismiss?: () => void;
  
  /** Callback when user wants to restore the section */
  onRestore?: () => void;
  
  /** Optional icon component to display before the title */
  icon?: React.ReactNode;
}

export function DismissibleSection({
  isDismissed = false,
  onDismiss,
  onRestore,
  children,
  icon,
  ...props
}: DismissibleSectionProps) {
  // If dismissed, show a minimal collapsed version with restore option
  if (isDismissed) {
    return (
      <div className="bg-app-white rounded-xl border border-app-border shadow-sm overflow-hidden opacity-60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {/* Collapsed chevron */}
            <svg
              className="w-5 h-5 text-app-gray -rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
            
            {/* Icon (grayed out) */}
            {icon && (
              <div className="w-5 h-5 text-app-gray flex-shrink-0">
                {icon}
              </div>
            )}
            
            <h3 className="text-base font-medium text-app-gray">
              {props.title}
            </h3>
            
            <span className="text-xs text-app-gray italic">
              (hidden)
            </span>
          </div>
          
          {/* Restore button */}
          <button
            type="button"
            onClick={onRestore}
            className="text-xs text-app-teal hover:text-app-teal/80 hover:underline transition-colors"
          >
            Show this section
          </button>
        </div>
      </div>
    );
  }

  // Normal view with dismiss option at bottom
  return (
    <CollapsibleSection icon={icon} {...props}>
      {children}
      
      {/* Dismiss option at bottom of section */}
      {onDismiss && (
        <div className="mt-4 pt-3 border-t border-app-border">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-app-gray hover:text-app-charcoal transition-colors"
          >
            Don&apos;t show this section
          </button>
        </div>
      )}
    </CollapsibleSection>
  );
}