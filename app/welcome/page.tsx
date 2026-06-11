"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";
import { ModeSelectionModal } from "@/components/welcome/ModeSelectionModal";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { loadCadenceSampleData } from "@/lib/sampleData";
import type { OnboardingMode } from "@/types";

// =============================================================================
// TYPES
// =============================================================================

interface FeatureInfo {
  icon: string;
  label: string;
  description: string;
  bullets: string[];
  accent: "teal" | "green" | "red" | "lightgreen";
}

interface PrivacyInfo {
  icon: string;
  label: string;
  description: string;
}

// =============================================================================
// DATA
// =============================================================================

const FEATURES: FeatureInfo[] = [
  {
    icon: "🏷️",
    label: "Log Symptoms",
    description: "Log and monitor symptoms with optional intensity tracking.",
    bullets: [
      "Select common or custom symptoms",
      "Select Simple or Mankoski pain scales",
      "See patterns over time",
    ],
    accent: "teal",
  },
  {
    icon: "🧻",
    label: "Track Bowel Health",
    description: "Track bowel movements using the Bristol Stool Scale.",
    bullets: [
      "Stool type (1–7)",
      "Record how you feel after",
      "Identify digestive patterns",
    ],
    accent: "green",
  },
  {
    icon: "🌸",
    label: "See Your Cycles",
    description: "Comprehensive menstrual cycle tracking.",
    bullets: [
      "Cycle phases",
      "Flow & product logging",
      "Period-specific symptoms",
    ],
    accent: "red",
  },
  {
    icon: "💊",
    label: "Log Medicine",
    description: "Track medications and supplements.",
    bullets: [
      "Custom meds & dosages",
      "Purpose tagging",
      "Optional time tracking",
    ],
    accent: "lightgreen",
  },
  {
    icon: "💡",
    label: "Insights & Trends",
    description: "Visualize patterns over time.",
    bullets: [
      "Weekly / monthly summaries",
      "Frequency charts",
      "Saved filters",
    ],
    accent: "green",
  },
  {
    icon: "💾",
    label: "Export & Save",
    description: "Export your data anytime.",
    bullets: [
      "CSV downloads",
      "Filtered exports",
    ],
    accent: "teal",
  },
];

const PRIVACY_POINTS: PrivacyInfo[] = [
  {
    icon: "🚫",
    label: "No Data Storage",
    description: "Your data never leaves your device.",
  },
  {
    icon: "🚫",
    label: "No Sharing",
    description: "Nothing sold or shared.",
  },
  {
    icon: "🚫",
    label: "No Account",
    description: "Anonymous by default.",
  },
  {
    icon: "🚫",
    label: "No Tracking",
    description: "No analytics or ads.",
  },
];

// =============================================================================
// PAGE
// =============================================================================

export default function WelcomePage() {
  const router = useRouter();
  const { setupComplete, tutorialComplete } = useSettings();

  const [showModeModal, setShowModeModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (isClient && (setupComplete || tutorialComplete)) {
      router.replace("/dashboard");
    }
  }, [isClient, setupComplete, tutorialComplete, router]);

  const handleModeSelect = (mode: OnboardingMode) => {
    setShowModeModal(false);
    router.push(`/settings?onboardingMode=${mode}`);
  };

  if (!isClient || setupComplete || tutorialComplete) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="space-y-4">
          <AnimatedLogo size="md" />
          <div className="h-4 w-32 bg-app-border rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
      {showModeModal && (
        <ModeSelectionModal
          onSelect={handleModeSelect}
          onCancel={() => setShowModeModal(false)}
        />
      )}

      <div className="min-h-[70vh] flex flex-col items-center text-center px-4 py-8">
        {/* Logo */}
        <div className="mb-4">
          <AnimatedLogo size="lg" className="mb-4" />
          <h1 className="text-3xl font-bold text-app-charcoal">
            Welcome to Cadence
          </h1>
        </div>

        {/* Description */}
        <p className="max-w-md text-lg text-app-gray mb-2">
          A highly customizable personal health tracker for symptoms,
          cycles, and long-term insights.
        </p>
        <p className="max-w-md text-sm text-app-gray mb-5 mt-2">
          Scroll down and click to get started.
        </p>

        {/* Features */}
        <section className="w-full max-w-2xl mb-10">
          <h2 className="text-sm font-semibold text-app-gray uppercase tracking-wide mb-4">
            What You Can Do With Cadence
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.label} feature={feature} />
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="w-full max-w-2xl mb-10">
          <h2 className="text-sm font-semibold text-app-gray uppercase tracking-wide mb-4">
            Your Privacy Protected
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRIVACY_POINTS.map((point) => (
              <PrivacyCard key={point.label} point={point} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <button
          onClick={() => setShowModeModal(true)}
          className="px-8 py-4 bg-app-green text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-app-green-dark transition-colors"
        >
          Get Started →
        </button>

        {process.env.NEXT_PUBLIC_IS_DEMO === "true" && (
          <button
            onClick={() => {
              loadCadenceSampleData();
              router.push("/dashboard");
            }}
            className="text-sm text-app-gray hover:text-app-charcoal transition-colors mt-2"
          >
            or explore with sample data →
          </button>
        )}
      </div>
    </>
  );
}

// =============================================================================
// FEATURE CARD (FIXED MOBILE BEHAVIOR)
// =============================================================================

function FeatureCard({ feature }: { feature: FeatureInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 768;

  const showContent = isDesktop
    ? isExpanded || isHovered
    : isExpanded;

  const accent =
    feature.accent === "teal"
      ? "border-app-teal"
      : feature.accent === "green"
      ? "border-app-green"
      : feature.accent === "lightgreen"
      ? "border-app-green/50"
      : "border-app-green";

  return (
    <div
      className="relative"
      onMouseEnter={() => isDesktop && setIsHovered(true)}
      onMouseLeave={() => isDesktop && setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className={`w-full text-left bg-app-white rounded-lg border-2 overflow-hidden transition-colors ${
          showContent
            ? `${accent} shadow-md`
            : "border-app-border hover:border-app-gray/40"
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl block mb-1">{feature.icon}</span>
              <span className="text-sm font-medium text-app-charcoal whitespace-nowrap">
                {feature.label}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-app-gray transition-transform ${
                showContent ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {showContent && (
            <div className="mt-3 pt-3 border-t border-app-border/50 space-y-2">
              <p className="text-xs text-app-gray">
                {feature.description}
              </p>
              <ul className="space-y-1">
                {feature.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="text-xs text-app-charcoal flex gap-1.5"
                  >
                    <span className="text-app-green">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// =============================================================================
// PRIVACY CARD
// =============================================================================

function PrivacyCard({ point }: { point: PrivacyInfo }) {
  return (
    <div className="p-3 bg-app-cream rounded-lg border border-app-border text-center">
      <span className="text-xl block mb-1">{point.icon}</span>
      <span className="text-xs font-medium text-app-charcoal block">
        {point.label}
      </span>
      <p className="text-[10px] text-app-gray mt-1 leading-tight">
        {point.description}
      </p>
    </div>
  );
}
