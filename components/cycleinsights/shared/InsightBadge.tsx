// /components/cycleinsights/shared/InsightBadge.tsx
"use client";

import { ReactNode } from "react";

// ============================================
// TYPES
// ============================================

type BadgeVariant = "default" | "teal" | "plumb" | "green" | "red" | "neutral";
type BadgeSize = "sm" | "md";

interface InsightBadgeProps {
  /** Badge text content */
  children: ReactNode;
  /** Color variant */
  variant?: BadgeVariant;
  /** Size variant */
  size?: BadgeSize;
  /** Optional icon to show before text */
  icon?: ReactNode;
  /** Optional click handler (makes badge interactive) */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * InsightBadge - Small pill/badge for displaying counts, labels, or status
 * Used throughout Cycle Insights for trust indicators and pattern counts
 * 
 * Examples:
 * - "Based on 7 cycles"
 * - "5 patterns"
 * - "3 noted"
 * - "Full details"
 */
export function InsightBadge({
  children,
  variant = "default",
  size = "sm",
  icon,
  onClick,
  className = "",
}: InsightBadgeProps) {
  // ============================================
  // STYLES
  // ============================================

  const baseStyles = "inline-flex items-center gap-1 rounded-full font-medium transition-colors";

  const sizeStyles: Record<BadgeSize, string> = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-app-cream/50 text-app-gray",
    teal: "bg-app-teal/10 text-app-teal",
    plumb: "bg-app-plumb/10 text-app-plumb",
    green: "bg-app-green/10 text-app-green",
    red: "bg-app-red/10 text-app-red",
    neutral: "bg-app-border/50 text-app-charcoal",
  };

  const interactiveStyles = onClick
    ? "cursor-pointer hover:opacity-80 active:opacity-60"
    : "";

  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${interactiveStyles} ${className}`;

  // ============================================
  // RENDER
  // ============================================

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={combinedStyles}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }

  return (
    <span className={combinedStyles}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

// ============================================
// PRESET BADGES
// Common badge configurations for Cycle Insights
// ============================================

interface TrustBadgeProps {
  cycleCount: number;
  className?: string;
}

/**
 * Trust badge showing "Based on X cycles"
 */
export function TrustBadge({ cycleCount, className }: TrustBadgeProps) {
  return (
    <InsightBadge variant="default" size="sm" className={className}>
      Based on {cycleCount} cycle{cycleCount !== 1 ? "s" : ""}
    </InsightBadge>
  );
}

interface CountBadgeProps {
  count: number;
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

/**
 * Count badge showing "X items"
 */
export function CountBadge({ count, label, variant = "default", className }: CountBadgeProps) {
  return (
    <InsightBadge variant={variant} size="sm" className={className}>
      {count} {label}
    </InsightBadge>
  );
}

interface StatusBadgeProps {
  status: "new" | "increasing" | "decreasing" | "occasional" | "consistent";
  className?: string;
}

/**
 * Status badge for pattern types
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<typeof status, { label: string; variant: BadgeVariant; icon: string }> = {
    new: { label: "New", variant: "teal", icon: "🌱" },
    increasing: { label: "Increasing", variant: "red", icon: "↑" },
    decreasing: { label: "Decreasing", variant: "green", icon: "↓" },
    occasional: { label: "Occasional", variant: "neutral", icon: "○" },
    consistent: { label: "Consistent", variant: "teal", icon: "●" },
  };

  const { label, variant, icon } = config[status];

  return (
    <InsightBadge 
      variant={variant} 
      size="sm" 
      icon={<span className="text-[10px]">{icon}</span>}
      className={className}
    >
      {label}
    </InsightBadge>
  );
}