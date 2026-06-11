"use client";

import { SafeLink } from "@/components/ui/SafeLink";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useCallback, lazy, Suspense } from "react";
import { useSettings } from "@/stores/useSettings";
import { useSetupGuard } from "@/stores/useSetupGuard";
import { validateSettings } from "@/lib/settingsValidation";
import { APP_CONFIG } from "@/lib/constants";
import {
  WeeklyIcon,
  MonthlyIcon,
  AllInsightsIcon,
  CycleInsightsIcon,
  HistoryIcon,
  PdfExportsIcon,
  SettingsIcon,
  DashboardIcon,
  NewEntryIcon,
  ContactIcon,
} from "@/components/dashboard/QuickNavIcons";

const BrickBreaker = lazy(() => import("@/components/ui/BrickBreaker"));

// Easter egg: multi-tap logo to reveal hidden game
const TAP_TARGET = 7;
const TAP_WINDOW_MS = 3000;

/**
 * Header component with hamburger menu and navigation
 */
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);

  // Handle touch navigation - ensures single tap works on mobile
  // Trigger animation and navigate with tiny delay for animation to start
  const handleSettingsTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent the delayed click event

    // Block navigation to settings if setup isn't complete
    const state = useSettings.getState();
    if (!state.setupComplete) {
      const validation = validateSettings({
        symptoms: state.symptoms,
        periodTracking: state.periodTracking,
        medicineTracking: state.medicineTracking,
        stoolTracking: state.stoolTracking,
      });
      if (!validation.isValid) {
        useSetupGuard.getState().show();
        return;
      }
    }

    setIsSettingsHovered(true); // Ensure animation triggers
    // Small delay lets animation start before navigation
    setTimeout(() => router.push("/settings"), 50);
  };

  const handleLogoTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-app-white border-b border-app-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left side: Hamburger + Logo */}
            <div className="flex items-center gap-3">
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-app-gray hover:text-app-charcoal hover:bg-app-cream transition-colors"
                aria-label="Open menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Logo / Brand */}
              <SafeLink
                href="/dashboard"
                className="flex items-center gap-2 group"
                onTouchEnd={handleLogoTouchEnd}
              >
                <AnimatedLogo size="sm" hoverEffect />
                <span className="text-xl font-semibold text-app-charcoal">
                  {APP_CONFIG.name}
                </span>
              </SafeLink>
            </div>

            {/* Right side: Settings Link */}
            <SafeLink
              href="/settings"
              className={`p-2 rounded-lg transition-colors ${
                pathname === "/settings"
                  ? "text-app-green bg-app-green/10"
                  : "text-app-gray hover:text-app-charcoal hover:bg-app-cream"
              }`}
              aria-label="Settings"
              onMouseEnter={() => setIsSettingsHovered(true)}
              onMouseLeave={() => setIsSettingsHovered(false)}
              onTouchStart={() => setIsSettingsHovered(true)}
              onTouchEnd={handleSettingsTouchEnd}
            >
              <SettingsIcon isHovered={isSettingsHovered} className="!w-6 !h-6" />
            </SafeLink>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}

/**
 * Sidebar component for navigation
 */
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { periodTracking } = useSettings();

  // Check if period tracking is enabled
  const isPeriodTrackingEnabled = periodTracking?.enabled ?? false;

  // Easter egg: multi-tap logo to launch brick breaker
  const [showGame, setShowGame] = useState(false);
  const [tapHint, setTapHint] = useState<string | null>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TAP_HINTS: Record<number, string> = {
    3: "Hmm? 🤔",
    4: "Keep going...",
    5: "Almost there! 🎮",
    6: "One more!",
  };

  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    const count = tapCountRef.current;

    // Reset idle timer on each tap
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      setTapHint(null);
    }, TAP_WINDOW_MS);

    // Show countdown hints
    if (TAP_HINTS[count]) {
      setTapHint(TAP_HINTS[count]);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setTapHint(null), 1200);
    }

    if (count >= TAP_TARGET) {
      tapCountRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      // Flash launch message, then open game
      setTapHint("Game time! 🎉");
      setTimeout(() => {
        setTapHint(null);
        setShowGame(true);
      }, 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation groups
  const primaryItems = [
    { href: "/entry", label: "New Entry" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  const viewsAndInsightsItems = [
    { href: "/dashboard/weekly", label: "Weekly View" },
    { href: "/dashboard/monthly", label: "Monthly View" },
    { href: "/dashboard/history", label: "History View" },
    { href: "/dashboard/allinsights", label: "All Insights" },
    ...(isPeriodTrackingEnabled ? [{ href: "/dashboard/cycleinsights", label: "Cycle Insights" }] : []),
  ];

  const toolsItems = [
    { href: "/dashboard/reports", label: "PDF Exports" },
    { href: "/settings", label: "Settings" },
    { href: "/contact", label: "Contact Us" },
  ];

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <SafeLink
        href={href}
        onClick={onClose}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
          pathname === href
            ? "bg-app-green text-white"
            : "text-app-charcoal hover:bg-app-cream"
        }`}
      >
        <NavIcon label={label} isHovered={isHovered} isActive={pathname === href} />
        {label}
      </SafeLink>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-app-charcoal/30 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-app-white border-r border-app-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-app-border flex-shrink-0 relative">
          <button
            className="flex items-center gap-2 select-none"
            onClick={handleLogoTap}
            aria-label="Cadence logo"
            type="button"
          >
            <AnimatedLogo size="sm" hoverEffect />
            <span className="text-xl font-semibold text-app-charcoal">
              {APP_CONFIG.name}
            </span>
          </button>
          {/* Easter egg tap hint */}
          {tapHint && (
            <span className="absolute left-4 top-[52px] text-xs font-medium text-app-teal animate-slideUp whitespace-nowrap pointer-events-none">
              {tapHint}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-app-gray hover:text-app-charcoal hover:bg-app-cream transition-colors"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Primary: New Entry + Dashboard */}
          <ul className="space-y-1">
            {primaryItems.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} />
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="my-3 border-t border-app-border" />

          {/* Views & Insights */}
          <p className="px-4 py-2 text-xs font-medium text-app-gray uppercase tracking-wider">
            Views & Insights
          </p>
          <ul className="space-y-1">
            {viewsAndInsightsItems.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} />
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="my-3 border-t border-app-border" />

          {/* Tools */}
          <p className="px-4 py-2 text-xs font-medium text-app-gray uppercase tracking-wider">
            Tools
          </p>
          <ul className="space-y-1">
            {toolsItems.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer Links */}
        <div className="p-4 border-t border-app-border flex-shrink-0">
          <div className="flex items-center justify-center gap-2 px-4 py-1.5">
            <SafeLink
              href="https://the-self-study.com/cadence-privacy/faq.html"
              onClick={onClose}
              className="text-sm text-app-charcoal/70 hover:text-app-charcoal hover:underline transition-colors"
            >
              FAQ
            </SafeLink>
            <span className="text-app-charcoal/40">&bull;</span>
            <SafeLink
              href="https://the-self-study.com/cadence-privacy/terms.html"
              onClick={onClose}
              className="text-sm text-app-charcoal/70 hover:text-app-charcoal hover:underline transition-colors"
            >
              Terms
            </SafeLink>
            <span className="text-app-charcoal/40">&bull;</span>
            <SafeLink
              href="https://the-self-study.com/cadence-privacy/privacy.html"
              onClick={onClose}
              className="text-sm text-app-charcoal/70 hover:text-app-charcoal hover:underline transition-colors"
            >
              Privacy
            </SafeLink>
          </div>
        </div>
      </div>

      {/* Easter egg: Brick Breaker game */}
      {showGame && (
        <Suspense fallback={null}>
          <BrickBreaker onClose={() => setShowGame(false)} />
        </Suspense>
      )}
    </>
  );
}

/**
 * Icon component for navigation items
 */
function NavIcon({ label, isHovered = false, isActive = false }: { label: string; isHovered?: boolean; isActive?: boolean }) {
  const iconClass = "w-5 h-5";
  // For active state, we want white icons, so override the color
  const activeClass = isActive ? "text-white" : "";

  switch (label) {
    case "Dashboard":
      return <DashboardIcon isHovered={isHovered} className={activeClass} />;
    case "New Entry":
      return <NewEntryIcon isHovered={isHovered} className={activeClass} />;
    case "Weekly View":
      return <WeeklyIcon isHovered={isHovered} className={activeClass} />;
    case "Monthly View":
      return <MonthlyIcon isHovered={isHovered} className={activeClass} />;
    case "History View":
      return <HistoryIcon isHovered={isHovered} className={activeClass} />;
    case "All Insights":
      return <AllInsightsIcon isHovered={isHovered} className={activeClass} />;
    case "Cycle Insights":
      return <CycleInsightsIcon isHovered={isHovered} className={activeClass} />;
    case "PDF Exports":
      return <PdfExportsIcon isHovered={isHovered} className={activeClass} />;
    case "At a Glance":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case "Settings":
      return <SettingsIcon isHovered={isHovered} className={activeClass} />;
    case "Contact Us":
      return <ContactIcon isHovered={isHovered} className={activeClass} />;
    default:
      return null;
  }
}

export default Header;