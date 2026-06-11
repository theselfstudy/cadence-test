// /components/cycleinsights/sections/TrustBanner.tsx
"use client";

import { useMemo } from "react";
import type { StoredEntry } from "@/types";
import type { DetectedCycle } from "@/lib/monthlyUtils";

// ============================================
// TRUST BANNER
// Establishes transparency and privacy context
// Always visible at top of Cycle Insights page
// ============================================

interface TrustBannerProps {
  /** All detected cycles */
  cycles: DetectedCycle[];
  
  /** All stored entries */
  entries: StoredEntry[];
  
  /** Whether user has connected a Google Sheet */
  isGoogleSheetConnected: boolean; 
}

export function TrustBanner({
  cycles,
  entries,
  isGoogleSheetConnected,
}: TrustBannerProps) {
  // ============================================
  // CALCULATIONS
  // ============================================
  
  const bannerData = useMemo(() => {
    // Count complete vs ongoing cycles
    const completeCycles = cycles.filter(c => !c.isOngoing);
    const ongoingCycle = cycles.find(c => c.isOngoing);

    // Count unique days logged
    const uniqueDaysLogged = new Set(entries.map(e => e.date)).size;

    // Determine if there is enough data for deep insights
    const hasEnoughData = completeCycles.length >= 2;

    return {
      completeCycleCount: completeCycles.length,
      hasOngoingCycle: !!ongoingCycle,
      entryCount: entries.length,
      uniqueDaysLogged,
      hasEnoughData,
    };
  }, [cycles, entries]);

  // ============================================
  // CYCLE COUNT TEXT
  // ============================================
  
  const getCycleCountText = (): string => {
    const { completeCycleCount, hasOngoingCycle } = bannerData;
    
    if (completeCycleCount === 0 && hasOngoingCycle) {
      return "1 ongoing cycle";
    }
    
    if (completeCycleCount === 0 && !hasOngoingCycle) {
      return "No cycles detected yet";
    }
    
    const completeText = `${completeCycleCount} complete cycle${completeCycleCount !== 1 ? "s" : ""}`;
    
    if (hasOngoingCycle) {
      return `${completeText} + 1 ongoing`;
    }
    
    return completeText;
  };

  // ============================================
  // STORAGE LOCATION TEXT
  // ============================================
  
  const getStorageText = (): string => {
    if (isGoogleSheetConnected) {
      return "Everything stays on your Google Sheet.";
    }
    return "Everything stays on your device.";
  };

  // ============================================
  // RENDER: EARLY DATA VARIANT
  // Shown when < 2 complete cycles
  // ============================================
  
  if (!bannerData.hasEnoughData) {
    return (
      <div className="bg-app-white rounded-xl border border-app-border p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <GrowingTreeIcon className="w-6 h-6 text-app-teal" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-app-charcoal">
              Building your patterns
            </h2>
            <p className="text-sm text-app-gray mt-0.5">
              {getCycleCountText()}
              {bannerData.entryCount > 0 && (
                <> · {bannerData.entryCount} {bannerData.entryCount === 1 ? "entry" : "entries"}</>
              )}
            </p>
          </div>
        </div>

        {/* Progress message */}
        <div className="bg-app-white/70 rounded-lg p-4 mb-4">
          <p className="text-sm text-app-charcoal leading-relaxed">
            You'll see basic summaries once a period has been logged. After{" "}
            <span className="font-medium text-app-teal">2+ complete cycles</span>, 
            deeper patterns will emerge.
          </p>
          
          {/* Visual progress indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-1">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < bannerData.completeCycleCount
                      ? "bg-app-teal"
                      : "bg-app-border"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-app-gray">
              {bannerData.completeCycleCount} of 2 cycles for deeper insights
            </span>
          </div>
        </div>

        {/* Privacy footer */}
        <PrivacyFooter 
          storageText={getStorageText()} 
          variant="compact" 
        />
      </div>
    );
  }

  // ============================================
  // RENDER: STANDARD VARIANT
  // Shown when >= 2 complete cycles
  // ============================================

  return (
    <div className="bg-app-white rounded-xl border border-app-border p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 relative">
          <svg className="w-7 h-7 text-app-teal absolute" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="11" strokeWidth={0.5} />
          </svg>
          <LockIcon className="w-5 h-5 text-app-teal" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-app-charcoal">
            Your data, your patterns
          </h2>
          <p className="text-sm text-app-gray mt-0.5">
            {bannerData.entryCount > 0
              ? `${bannerData.entryCount} ${bannerData.entryCount === 1 ? "entry" : "entries"} across ${bannerData.uniqueDaysLogged} day${bannerData.uniqueDaysLogged !== 1 ? "s" : ""}`
              : "Start logging to see insights"}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {bannerData.entryCount > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-app-charcoal">{bannerData.entryCount}</p>
            <p className="text-xs text-app-gray">Total Entries</p>
          </div>
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-app-charcoal">
              {bannerData.completeCycleCount}
              {bannerData.hasOngoingCycle && <span className="text-base font-normal text-app-gray"> + 1</span>}
            </p>
            <p className="text-xs text-app-gray">
              {bannerData.hasOngoingCycle ? "Complete + Ongoing" : "Complete Cycles"}
            </p>
          </div>
        </div>
      )}

      {/* Privacy footer */}
      <div className="mt-4">
        <PrivacyFooter
          storageText={getStorageText()}
          variant="full"
        />
      </div>
    </div>
  );
}

// ============================================
// PRIVACY FOOTER SUB-COMPONENT
// Shows privacy assurances
// ============================================

interface PrivacyFooterProps {
  storageText: string;
  variant: "compact" | "full";
}

// In TrustBanner.tsx, find and replace the PrivacyFooter component:

function PrivacyFooter({ storageText, variant }: PrivacyFooterProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-xs text-app-gray">
        <LockIcon className="w-3.5 h-3.5 text-app-teal" />
        <span>{storageText}</span>
      </div>
    );
  }

  // Full variant with all privacy points - UPDATED: centered and evenly spaced
  return (
    <div className="flex items-center justify-center gap-8 sm:gap-12">
      <PrivacyPoint
        icon={<ServerOffIcon className="w-4 h-4" />}
        text="No server storage"
      />
      <PrivacyPoint
        icon={<ShieldIcon className="w-4 h-4" />}
        text="No data sharing"
      />
      <PrivacyPoint
        icon={<EyeOffIcon className="w-4 h-4" />}
        text="No tracking"
      />
    </div>
  );
}

// ============================================
// PRIVACY POINT SUB-COMPONENT
// Individual privacy assurance item
// ============================================

interface PrivacyPointProps {
  icon: React.ReactNode;
  text: string;
}

function PrivacyPoint({ icon, text }: PrivacyPointProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-app-gray">
      <div className="text-app-teal">
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}

// ============================================
// ICON COMPONENTS
// Simple inline SVG icons
// ============================================

function GrowingTreeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.0634 4.04209C15.0604 3.67514 17.7997 5.75557 18.2824 8.73058C18.3336 9.04602 18.5325 9.318 18.8175 9.46244C19.9616 10.0421 20.8036 11.1654 20.9703 12.5386C21.2358 14.726 19.6855 16.7084 17.5177 16.9739C17.2126 17.0112 16.8395 17.0109 16.4999 16.9575C16.1384 16.9006 15.9345 16.8027 15.8588 16.7401C15.4331 16.3883 14.8028 16.4483 14.451 16.874C14.0992 17.2997 14.1591 17.9301 14.5848 18.2819C15.0603 18.6748 15.6749 18.8523 16.1892 18.9332C16.7254 19.0176 17.2854 19.0172 17.7608 18.959C21.032 18.5585 23.3533 15.5728 22.9558 12.2976C22.7275 10.4174 21.6524 8.84696 20.162 7.9256C19.3016 4.16205 15.7296 1.57827 11.8203 2.05692C9.22789 2.37434 7.10232 3.96441 5.98423 6.12144C2.75534 6.63544 0.999995 9.6056 1 12.6317C1 13.6058 1.33367 15.1324 2.49103 16.4288C3.67726 17.7576 5.6216 18.7256 8.60781 18.7256C9.1601 18.7256 9.60781 18.2779 9.60781 17.7256C9.60781 17.1733 9.1601 16.7256 8.60781 16.7256C6.08233 16.7256 4.72277 15.9256 3.98302 15.0969C3.2144 14.2359 3 13.2155 3 12.6317C3 10.7371 3.84959 9.16206 5.21959 8.45213C5.11229 9.13669 5.09664 9.84705 5.18413 10.5678C5.25068 11.1161 5.74908 11.5066 6.29734 11.44C6.8456 11.3735 7.23611 10.8751 7.16956 10.3268C7.04587 9.30783 7.20007 8.32218 7.57135 7.44331C8.33213 5.64245 10.0002 4.29471 12.0634 4.04209ZM16.6585 12.7526C17.0741 12.3889 17.1163 11.7571 16.7526 11.3415C16.3889 10.9259 15.7571 10.8838 15.3415 11.2474L11.9842 14.1851L9.64018 12.2318C9.21591 11.8782 8.58534 11.9356 8.23178 12.3598C7.87821 12.7841 7.93554 13.4147 8.35982 13.7682L11 15.9684V22C11 22.5523 11.4477 23 12 23C12.5523 23 13 22.5523 13 22V15.9538L16.6585 12.7526Z" // oak tree SVG from svgrepo.com - https://www.svgrepo.com/svg/510090/oak-tree
        fill="currentColor"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
      />
    </svg>
  );
}

function ServerOffIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M3 3l18 18" 
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" 
      />
    </svg>
  );
}

// ============================================
// MINIMAL VARIANT (for compact spaces)
// Can be used as a one-liner if needed
// ============================================

interface TrustBannerMinimalProps {
  cycleCount: number;
  isGoogleSheetConnected: boolean;
}

export function TrustBannerMinimal({
  cycleCount,
  isGoogleSheetConnected,
}: TrustBannerMinimalProps) {
  const storageLocation = isGoogleSheetConnected ? "your Google Sheet" : "your device";
  
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-app-cream/50 rounded-lg text-xs text-app-gray">
      <div className="flex items-center gap-2">
        <LockIcon className="w-3.5 h-3.5 text-app-teal" />
        <span>
          Based on {cycleCount} cycle{cycleCount !== 1 ? "s" : ""} · 
          Stored on {storageLocation}
        </span>
      </div>
      <span className="text-app-teal font-medium">
        Your data only
      </span>
    </div>
  );
}