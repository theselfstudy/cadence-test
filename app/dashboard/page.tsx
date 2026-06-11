"use client";

import Link from "next/link";
import { useSettings } from "@/stores/useSettings";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThisWeekGlance } from "@/components/dashboard";
import { SyncWithGoogleSheetsButton, SyncStatusBadge } from "@/components/sync";
import {
  WeeklyIcon,
  MonthlyIcon,
  AllInsightsIcon,
  CycleInsightsIcon,
  HistoryIcon,
} from "@/components/dashboard/QuickNavIcons";

// =============================================================================
// DASHBOARD LANDING PAGE
// =============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const { setupComplete, tutorialComplete, periodTracking } = useSettings();
  const [isClient, setIsClient] = useState(false);
  
  // Check if period tracking is enabled
  const isPeriodTrackingEnabled = periodTracking?.enabled ?? false;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect new users to welcome
  useEffect(() => {
    if (isClient && !setupComplete && !tutorialComplete) {
      router.replace("/welcome");
    }
  }, [isClient, setupComplete, tutorialComplete, router]);

  if (!isClient) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Sync Button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-charcoal">Dashboard</h1>
          <p className="text-app-gray">Your health at a glance and quick navigation</p>
          <div className="mt-2">
            <SyncStatusBadge />
          </div>
        </div>
        {/* Sync with Google Sheets - Positioned next to header */}
        <SyncWithGoogleSheetsButton variant="secondary" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/entry"
          className="card p-6 hover:border-app-green hover:bg-app-green/5 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-app-green flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-app-charcoal">New Entry</h3>
              <p className="text-sm text-app-gray">Log your health data</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings"
          className="card p-6 hover:border-app-teal hover:bg-app-teal/5 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-app-teal flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-app-charcoal">Settings</h3>
              <p className="text-sm text-app-gray">Customize your tracking</p>
            </div>
          </div>
        </Link>
      </div>

      {/* This Week at a Glance */}
      <ThisWeekGlance />
      {/* Quick Navigation */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-app-gray uppercase tracking-wide">
          Quick Navigation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DashboardCard
            href="/dashboard/weekly"
            iconComponent={WeeklyIcon}
            title="Weekly View"
            description="7-day trends & charts"
            color="teal"
          />
          <DashboardCard
            href="/dashboard/monthly"
            iconComponent={MonthlyIcon}
            title="Monthly View"
            description="Monthly patterns & insights"
            color="green"
          />
          <DashboardCard
            href="/dashboard/allinsights"
            iconComponent={AllInsightsIcon}
            title="All Insights"
            description="Patterns & trends for all your data"
            color="plumb"
          />
          {isPeriodTrackingEnabled ? (
            <DashboardCard
              href="/dashboard/cycleinsights"
              iconComponent={CycleInsightsIcon}
              title="Cycle Insights"
              description="Menstrual cycle patterns & insights"
              color="red"
            />
          ) : (
            <DashboardCard
              href="/dashboard/history"
              iconComponent={HistoryIcon}
              title="History"
              description="All entries, filters & export"
              color="charcoal"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface IconComponentProps {
  className?: string;
  isHovered?: boolean;
}

interface DashboardCardProps {
  href: string;
  iconComponent: React.ComponentType<IconComponentProps>;
  title: string;
  description: string;
  color: "green" | "teal" | "plumb" | "taupe" | "charcoal" | "red";
  comingSoon?: boolean;
}

function DashboardCard({ href, iconComponent: IconComponent, title, description, color, comingSoon }: DashboardCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const colorClasses = {
    green: "hover:border-app-green hover:bg-app-green/5",
    teal: "hover:border-app-teal hover:bg-app-teal/5",
    plumb: "hover:border-app-plumb hover:bg-app-plumb/5",
    taupe: "hover:border-app-taupe hover:bg-app-taupe/5",
    charcoal: "hover:border-app-charcoal hover:bg-app-charcoal/5",
    red: "hover:border-app-red hover:bg-app-red/5",
  };

  const content = (
    <div className={`card p-5 transition-all relative ${comingSoon ? "opacity-60" : colorClasses[color]}`}>
      {comingSoon && (
        <span className="absolute top-2 right-2 text-xs bg-app-gray/20 text-app-gray px-2 py-0.5 rounded-full">
          Coming Soon
        </span>
      )}
      <div className="flex items-center gap-3">
        <IconComponent isHovered={isHovered} />
        <div>
          <h3 className="font-semibold text-app-charcoal">{title}</h3>
          <p className="text-sm text-app-gray">{description}</p>
        </div>
      </div>
    </div>
  );

  if (comingSoon) {
    return <div className="cursor-not-allowed">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 bg-app-border rounded animate-pulse" />
        <div className="h-4 w-56 bg-app-border rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-12 w-12 bg-app-border rounded-full animate-pulse" />
          </div>
        ))}
      </div>
      {/* Week glance skeleton */}
      <div className="card p-4">
        <div className="h-6 w-48 bg-app-border rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-app-cream rounded-lg p-4">
              <div className="h-4 w-20 bg-app-border rounded animate-pulse mb-2" />
              <div className="h-8 w-12 bg-app-border rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className="h-8 w-8 bg-app-border rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-app-border rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}