"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import {
  WeeklyIcon,
  MonthlyIcon,
  AllInsightsIcon,
  CycleInsightsIcon,
  HistoryIcon,
} from "@/components/dashboard/QuickNavIcons";

/**
 * Tutorial steps configuration (consolidated from 12 to 6 steps)
 * Entry features and insights are shown in internal carousels/grids
 */
const TUTORIAL_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Cadence!",
    description:
      "Let's take a quick tour of how to use the app. This will only take a minute!",
    illustration: "welcome",
  },
  {
    id: "log-selection",
    title: "Choose What to Log",
    description:
      "Select which sections you want to log. Tap \"Select All Categories\" to quick-select everything.",
    illustration: "log-selection",
    dynamicContent: "logSelection",
  },
  {
    id: "entry-features",
    title: "Creating an Entry",
    description: "", // Dynamic - set based on enabled features count
    illustration: "entry-features",
    dynamicContent: "entryFeatures",
  },
  {
    id: "insights",
    title: "Your Insights & History",
    description:
      "Cadence offers several ways to view and analyze your data. Access these from the menu on the top left of any page.",
    illustration: "insights",
    dynamicContent: "insights",
  },
  {
    id: "sync",
    title: "Optional Cloud Backup",
    description:
      "Connect a Google Sheet in Settings to sync your entries to the cloud. Your data stays safe even if you clear your browser.",
    illustration: "sync",
    dynamicContent: "syncCombined",
  },
  {
    id: "done",
    title: "You're All Set!",
    description:
      "That's everything! Head to Settings anytime to adjust your preferences. Happy logging!",
    illustration: "done",
  },
];

export default function TutorialPage() {
  const router = useRouter();
  const { 
    periodTracking, 
    stoolTracking, 
    medicineTracking,
    isGoogleSheetConnected,
    completeTutorial 
  } = useSettings();
  const [currentStep, setCurrentStep] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // All 6 steps are always shown (conditionals handled internally)
  const activeSteps = TUTORIAL_STEPS;

  // Reset carousel when leaving entry-features step
  const step = activeSteps[currentStep];
  useEffect(() => {
    if (step?.id !== "entry-features") {
      setCarouselIndex(0);
    }
  }, [step?.id]);

  // Build list of entry features for carousel
  const entryFeatures = useMemo(() => {
    const features: Array<{
      id: string;
      title: string;
      shortDescription: string;
      illustration: string;
    }> = [];

    // Time is always first
    features.push({
      id: "time",
      title: "Recording Time",
      shortDescription: "Track when entries start and end. Tap 'Now' for quick input.",
      illustration: "time",
    });

    // Conditional tracking features
    if (stoolTracking?.enabled) {
      features.push({
        id: "bristol",
        title: "Bristol Stool Scale",
        shortDescription: "Select type 1-7 and how you felt to track digestive patterns.",
        illustration: "bristol",
      });
    }

    if (periodTracking?.enabled) {
      features.push({
        id: "period",
        title: "Cycle Tracking",
        shortDescription: "Log your cycle phase, flow level, and products used.",
        illustration: "period",
      });
    }

    // Symptoms always included
    features.push({
      id: "symptoms",
      title: "Tracking Symptoms",
      shortDescription: "Select symptoms and optionally rate their intensity.",
      illustration: "symptoms",
    });

    if (medicineTracking?.enabled && (medicineTracking?.medicines?.length ?? 0) > 0) {
      features.push({
        id: "medicine",
        title: "Medicine Log",
        shortDescription: "Log medications with dosage and timing.",
        illustration: "medicine",
      });
    }

    // Notes is always last
    features.push({
      id: "notes",
      title: "Notes",
      shortDescription: "Add observations and set your end time before submitting.",
      illustration: "notes",
    });

    return features;
  }, [stoolTracking?.enabled, periodTracking?.enabled, medicineTracking?.enabled, medicineTracking?.medicines?.length]);

  // Dynamic description for entry-features step
  const getEntryFeaturesDescription = () => {
    const count = entryFeatures.length;
    return `Here's what you can log in each entry. Click the arrows to see all ${count} features.`;
  };

  const totalSteps = activeSteps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Build context for dynamic content
  const dynamicContext = {
    stoolTracking: stoolTracking?.enabled ?? false,
    periodTracking: periodTracking?.enabled ?? false,
    medicineTracking: medicineTracking?.enabled && (medicineTracking?.medicines?.length ?? 0) > 0,
    hasSymptoms: true, // Symptoms are always available
    isGoogleSheetConnected,
    productTrackingEnabled: periodTracking?.productTracking?.enabled ?? false,
  };

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial();
      router.push("/entry");
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
    router.push("/entry");
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-app-gray">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            onClick={handleSkip}
            className="text-sm text-app-gray hover:text-app-charcoal transition-colors"
          >
            Skip tutorial
          </button>
        </div>
        <div className="h-2 bg-app-border rounded-full overflow-hidden">
          <div
            className="h-full bg-app-green transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Main content card */}
      <div className="flex-1 flex flex-col">
        <div className="card flex-1 flex flex-col">
          {/* Illustration */}
          <div className="flex-1 flex items-center justify-center py-8">
            {step.id === "entry-features" ? (
              <FeatureCarousel
                features={entryFeatures}
                currentIndex={carouselIndex}
                onIndexChange={setCarouselIndex}
                context={dynamicContext}
              />
            ) : (
              <TutorialIllustration
                type={step.illustration}
                context={dynamicContext}
                dynamicContent={step.dynamicContent}
              />
            )}
          </div>

          {/* Text content */}
          <div className="text-center pb-6">
            <h1 className="text-2xl font-bold text-app-charcoal mb-4">
              {step.title}
            </h1>

            <p className="text-app-gray max-w-md mx-auto leading-relaxed">
              {step.id === "entry-features"
                ? getEntryFeaturesDescription()
                : step.description}
            </p>
          </div>


          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pb-6">
            {activeSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-app-green"
                    : index < currentStep
                    ? "bg-app-green/50"
                    : "bg-app-border"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isFirstStep
                ? "text-app-border cursor-not-allowed"
                : "text-app-gray hover:text-app-charcoal hover:bg-app-cream"
            }`}
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-lg font-semibold bg-app-green text-white hover:opacity-90 transition-opacity"
          >
            {isLastStep ? "Start Tracking →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Dynamic Context Type
// ============================================

interface DynamicContext {
  stoolTracking: boolean;
  periodTracking: boolean;
  medicineTracking: boolean;
  hasSymptoms: boolean;
  isGoogleSheetConnected: boolean;
  productTrackingEnabled: boolean;
}

// ============================================
// Illustration Component
// ============================================

interface TutorialIllustrationProps {
  type: string;
  context: DynamicContext;
  dynamicContent?: string;
}

function TutorialIllustration({ type, context, dynamicContent }: TutorialIllustrationProps) {
  const illustrations: Record<string, React.ReactNode> = {
    // ==========================================
    // WELCOME - Animated logo with color flow
    // ==========================================
    welcome: (
      <AnimatedLogo size="lg" />
    ),

    // ==========================================
    // LOG SELECTION - Dynamic modal preview
    // ==========================================
    "log-selection": (
      <div className="w-full max-w-xs">
        <div className="bg-white rounded-xl shadow-lg border border-app-border overflow-hidden">
          {/* Modal header */}
          <div className="px-4 py-3 border-b border-app-border bg-app-cream">
            <p className="text-sm font-medium text-app-charcoal text-center">
              What would you like to log?
            </p>
          </div>
          
          {/* Options - dynamic based on settings */}
          <div className="p-4 space-y-2">
            {context.hasSymptoms && (
              <LogOptionChip label="Symptoms" icon="🏷️" selected />
            )}
            {context.stoolTracking && (
              <LogOptionChip label="Bowel Movement" icon="🧻" selected />
            )}
            {context.periodTracking && (
              <LogOptionChip label="Cycle / Period" icon="🌸" selected={false} />
            )}
            {context.medicineTracking && (
              <LogOptionChip label="Medicine" icon="💊" selected />
            )}
            {!context.stoolTracking && !context.periodTracking && !context.medicineTracking && (
              <p className="text-xs text-app-gray text-center py-2">
                Enable more tracking options in Settings!
              </p>
            )}
          </div>
          
          {/* Confirm button */}
          <div className="px-4 pb-4">
            <div className="w-full py-2 bg-app-teal text-white text-sm font-medium rounded-lg text-center">
              Continue
            </div>
          </div>
        </div>
      </div>
    ),

    // ==========================================
    // TIME INPUT
    // ==========================================
    time: (
      <div className="p-6 bg-app-cream rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-14 h-11 bg-white rounded-lg border-2 border-app-border flex items-center justify-center">
              <span className="font-mono text-lg text-app-charcoal">09</span>
            </div>
            <span className="text-xl text-app-gray font-bold">:</span>
            <div className="w-14 h-11 bg-white rounded-lg border-2 border-app-border flex items-center justify-center">
              <span className="font-mono text-lg text-app-charcoal">30</span>
            </div>
            <div className="w-14 h-11 bg-white rounded-lg border-2 border-app-border flex items-center justify-center">
              <span className="text-sm font-medium text-app-charcoal">AM</span>
            </div>
          </div>
          <div className="px-4 py-2.5 bg-app-green text-white rounded-lg text-sm font-medium shadow-sm">
            Now
          </div>
        </div>
        <p className="text-xs text-app-gray mt-3 text-center">
          Tap "Now" for the current time
        </p>
      </div>
    ),

    // ==========================================
    // BRISTOL STOOL SCALE
    // ==========================================
    bristol: (
      <div className="p-5 bg-app-cream rounded-xl space-y-4 w-full max-w-xs">
        {/* Type selection */}
        <div>
          <p className="text-xs text-app-gray mb-2">Select type:</p>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  n === 4
                    ? "bg-app-plumb text-white scale-110 shadow-md"
                    : "bg-white border-2 border-app-border text-app-gray hover:border-app-plumb"
                }`}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
        
        {/* Selected type info */}
        <div className="bg-white rounded-lg p-3 border border-app-plumb/30">
          <p className="text-sm font-medium text-app-charcoal">Type 4: Smooth Snake</p>
          <p className="text-xs text-app-gray mt-1">Like a sausage or snake, smooth and soft</p>
        </div>
        
        {/* Feeling chips */}
        <div>
          <p className="text-xs text-app-gray mb-2">How do you feel?</p>
          <div className="flex flex-wrap gap-1.5">
            {["Complete", "Incomplete", "Urgent"].map((feeling, i) => (
              <span
                key={feeling}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  i === 0
                    ? "bg-app-plumb text-white"
                    : "bg-white border border-app-border text-app-gray"
                }`}
              >
                {feeling}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),

    // ==========================================
    // PERIOD / CYCLE TRACKING
    // ==========================================
    period: (
      <div className="p-5 bg-app-cream rounded-xl w-full max-w-xs space-y-4">
        {/* Phase selection */}
        <div>
          <p className="text-xs text-app-gray mb-2">Cycle phase:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Menstrual", color: "bg-app-red" },
              { name: "Follicular", color: "bg-app-teal" },
              { name: "Ovulation", color: "bg-app-green" },
              { name: "Luteal", color: "bg-app-taupe" },
            ].map((phase, i) => (
              <div
                key={phase.name}
                className={`px-3 py-2 rounded-lg text-xs font-medium text-center transition-all ${
                  i === 0
                    ? `${phase.color} text-white shadow-sm`
                    : "bg-white border border-app-border text-app-gray"
                }`}
              >
                {phase.name}
              </div>
            ))}
          </div>
        </div>

        {/* Flow level (shown during menstrual) */}
        <div className="pt-2 border-t border-app-border">
          <p className="text-xs text-app-gray mb-2">Flow level:</p>
          <div className="flex gap-2">
            {["Light", "Medium", "Heavy"].map((level, i) => (
              <span
                key={level}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium text-center ${
                  i === 1
                    ? "bg-app-red text-white"
                    : "bg-white border border-app-border text-app-gray"
                }`}
              >
                {level}
              </span>
            ))}
          </div>
        </div>

        {/* Product tracking hint */}
        {context.productTrackingEnabled && (
          <p className="text-xs text-app-red/80 text-center pt-1">
            + Track products used (pads, tampons, cups...)
          </p>
        )}
      </div>
    ),

    // ==========================================
    // SYMPTOMS
    // ==========================================
    symptoms: (
      <div className="p-5 bg-app-cream rounded-xl w-full max-w-xs space-y-4">
        {/* Symptom chips */}
        <div>
          <p className="text-xs text-app-gray mb-2">Select symptoms:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Bloating", selected: true, period: false },
              {
                name: "Cramps",
                selected: true,
                period: context.periodTracking,
              },              
              { name: "Fatigue", selected: false, period: false },
              { name: "Headache", selected: false, period: false },
            ].map((symptom) => (
              <span
                key={symptom.name}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  symptom.selected
                    ? symptom.period
                      ? "bg-app-red text-white"
                      : "bg-app-teal text-white"
                    : "bg-white border border-app-border text-app-gray"
                }`}
              >
                {symptom.name}
                {symptom.period && symptom.selected && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-white/60 inline-block" />
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Intensity slider preview */}
        <div className="bg-white rounded-lg p-3 border border-app-teal/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-app-charcoal">Bloating</span>
            <span className="text-sm font-semibold text-app-teal">5</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div
                key={n}
                className={`flex-1 h-2 rounded-full ${
                  n <= 5 ? "bg-app-teal" : "bg-app-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    ),

    // ==========================================
    // MEDICINE LOG
    // ==========================================
    medicine: (
      <div className="p-5 bg-app-cream rounded-xl w-full max-w-xs space-y-4">
        {/* Medicine chips with category dots */}
        <div>
          <p className="text-xs text-app-gray mb-2">Your medicines:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Ibuprofen", categories: ["symptom"], selected: true },
              { name: "Probiotic", categories: ["bowel"], selected: false },
              { name: "Iron", categories: ["period"], selected: true },
            ].map((med) => (
              <span
                key={med.name}
                className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${
                  med.selected
                    ? "bg-app-taupe text-white"
                    : "bg-white border border-app-border text-app-gray"
                }`}
              >
                <span className="flex gap-0.5">
                  {med.categories.map((cat) => (
                    <span
                      key={cat}
                      className={`w-2 h-2 rounded-full ${
                        cat === "bowel" ? "bg-app-plumb" :
                        cat === "period" ? "bg-app-red" :
                        cat === "symptom" ? "bg-app-teal" : "bg-app-gray"
                      } ${med.selected ? "opacity-70" : ""}`}
                    />
                  ))}
                </span>
                {med.name}
              </span>
            ))}
          </div>
        </div>

        {/* Dosage selection */}
        <div className="bg-white rounded-lg p-3 border border-app-taupe/30">
          <p className="text-xs text-app-gray mb-2">Ibuprofen dosage:</p>
          <div className="flex gap-2">
            {["200mg", "400mg", "600mg"].map((dose, i) => (
              <span
                key={dose}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  i === 1
                    ? "bg-app-taupe text-white"
                    : "bg-app-cream border border-app-border text-app-gray"
                }`}
              >
                {dose}
              </span>
            ))}
          </div>
        </div>

        {/* Time indicator */}
        <p className="text-xs text-app-gray text-center">
          ⏰ Time-sensitive meds track when taken
        </p>
      </div>
    ),

    // ==========================================
    // NOTES
    // ==========================================
    notes: (
      <div className="p-5 bg-app-cream rounded-xl w-full max-w-xs space-y-4">
        <div>
          <p className="text-xs text-app-gray mb-2">Additional notes:</p>
          <div className="bg-white rounded-lg p-3 border border-app-border min-h-[70px]">
            <p className="text-sm text-app-charcoal/70 italic">
              Had coffee this morning. Feeling better than yesterday...
            </p>
          </div>
        </div>
        
        {/* End time reminder */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-app-green/30">
          <svg className="w-5 h-5 text-app-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-app-charcoal">
            Don&apos;t forget to set your <strong>End Time</strong> before submitting!
          </p>
        </div>
      </div>
    ),

    // ==========================================
    // HISTORY
    // ==========================================
    history: (
      <div className="w-full max-w-xs space-y-3">
        {/* Filter bar preview */}
        <div className="bg-white rounded-lg p-3 border border-app-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-app-gray">Show:</span>
            {["7 Days", "30 Days", "All"].map((filter, i) => (
              <span
                key={filter}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  i === 1
                    ? "bg-app-teal text-white"
                    : "bg-app-cream text-app-gray"
                }`}
              >
                {filter}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-app-gray">View:</span>
            <div className="flex rounded overflow-hidden border border-app-border">
              <span className="px-2 py-1 bg-app-teal text-white">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                </svg>
              </span>
              <span className="px-2 py-1 bg-white text-app-gray">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M3 10h18M3 14h18" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Mini entry cards */}
        <div className="space-y-2">
          {[
            { date: "Today", symptoms: 2, bristol: 4 },
            { date: "Yesterday", symptoms: 1, bristol: null },
          ].map((entry, i) => (
            <div key={i} className="bg-white rounded-lg p-3 border border-app-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-app-charcoal">{entry.date}</span>
                <div className="flex gap-1.5">
                  {entry.symptoms > 0 && (
                    <span className="text-xs bg-app-teal/10 text-app-teal px-1.5 py-0.5 rounded">
                      {entry.symptoms} symptoms
                    </span>
                  )}
                  {entry.bristol && (
                    <span className="text-xs bg-app-plumb/10 text-app-plumb px-1.5 py-0.5 rounded">
                      Bristol {entry.bristol}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Export button */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-app-teal text-white text-xs font-medium rounded-lg">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </div>
        </div>
      </div>
    ),

    // ==========================================
    // INSIGHTS - Dynamic based on settings
    // ==========================================
    insights: (
      <div className="w-full max-w-xs space-y-3">
        {/* Hamburger menu hint */}
        <div className="flex items-center gap-2 p-3 bg-app-cream rounded-lg">
          <div className="w-7 h-7 bg-white rounded border border-app-border flex flex-col justify-center items-center gap-0.5 p-1.5">
            <div className="w-3.5 h-0.5 bg-app-charcoal rounded" />
            <div className="w-3.5 h-0.5 bg-app-charcoal rounded" />
            <div className="w-3.5 h-0.5 bg-app-charcoal rounded" />
          </div>
          <p className="text-xs text-app-gray">Access from the menu on any page</p>
        </div>

        {/* Insights grid - dynamic based on settings */}
        <InsightsGrid showCycleInsights={context.periodTracking} />

        {/* Data hint */}
        <p className="text-xs text-app-gray text-center">
          Insights get richer as you log more entries
        </p>
      </div>
    ),

    // ==========================================
    // SYNC / GOOGLE SHEETS (Combined with sync-buttons)
    // ==========================================
    sync: (
      <div className="w-full max-w-xs space-y-4">
        {/* Main sync diagram */}
        <div className="relative">
          {/* Device */}
          <div className="bg-white rounded-xl p-3 border-2 border-app-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-app-cream flex items-center justify-center">
                <svg className="w-3 h-3 text-app-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-app-charcoal">Your Entries</span>
            </div>
            <div className="space-y-1">
              {[1, 2].map((i) => (
                <div key={i} className="h-1.5 bg-app-cream rounded-full" style={{ width: `${90 - i * 20}%` }} />
              ))}
            </div>
          </div>

          {/* Sync arrow */}
          <div className="flex justify-center my-2">
            <div
              className="w-8 h-8 rounded-full bg-app-teal/10 flex items-center justify-center"
              style={{ animation: "pulse 2s ease-in-out infinite" }}
            >
              <svg className="w-4 h-4 text-app-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
          </div>

          {/* Cloud */}
          <div className="bg-gradient-to-br from-app-green/10 to-app-teal/10 rounded-xl p-3 border border-app-teal/30">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-app-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-app-charcoal">Google Sheets</p>
                <p className="text-xs text-app-gray">Automatic backup</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conditional: Sync buttons preview - only if already connected */}
        {context.isGoogleSheetConnected && (
          <div className="bg-white rounded-xl border border-app-border overflow-hidden animate-slideUp">
            <div className="px-3 py-2 bg-app-cream border-b border-app-border">
              <p className="text-xs font-medium text-app-charcoal text-center">
                Sync buttons in the app
              </p>
            </div>
            <div className="p-3 space-y-3">
              {/* Settings page - primary button style */}
              <div className="space-y-1">
                <span className="text-xs text-app-gray">Settings page</span>
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-app-green text-white text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync with Google Sheets
                </div>
              </div>

              {/* Dashboard - subtle button style */}
              <div className="space-y-1">
                <span className="text-xs text-app-gray">Dashboard</span>
                <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-teal/10 text-app-teal text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync with Google Sheets
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer text */}
        <p className="text-xs text-app-gray text-center">
          {context.isGoogleSheetConnected
            ? "Your sheet is connected! Use sync buttons to back up anytime."
            : "This is optional. Your data always stays on your device."}
        </p>
      </div>
    ),

    // ==========================================
    // SYNC BUTTONS (kept for backwards compatibility but not used)
    // ==========================================
    "sync-buttons": (
      <div className="w-full max-w-xs">
        {/* Card container */}
        <div className="bg-white rounded-xl border border-app-border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-app-cream border-b border-app-border">
            <p className="text-sm font-medium text-app-charcoal text-center">
              Button styles across the app
            </p>
          </div>

          {/* Button showcase */}
          <div className="p-4 space-y-3">
            {/* Primary */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-app-gray w-16">Settings</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-green text-white text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync with Google Sheets
              </div>
            </div>

            {/* Secondary */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-app-gray w-16">Dashboard</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-teal text-white text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync with Google Sheets
              </div>
            </div>

            {/* Subtle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-app-gray w-16">History</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-teal/10 text-app-teal text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync with Google Sheets
              </div>
            </div>
          </div>

          {/* Google sign-in hint */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-green-50 border-t border-app-border">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <p className="text-xs text-app-charcoal">
                A secure Google sign-in window will appear
              </p>
            </div>
          </div>
        </div>
      </div>
    ),

    // ==========================================
    // DONE / COMPLETE
    // ==========================================
    done: (
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Center logo */}
        <div className="relative z-10">
          <AnimatedLogo size="lg" />
        </div>

        {/* Floating icons */}
        <div
          className="absolute top-2 right-8 text-2xl"
          style={{ animation: "bounce 1.5s ease-in-out infinite" }}
        >
          📊
        </div>
        <div
          className="absolute bottom-4 left-4 text-2xl"
          style={{ animation: "bounce 1.2s ease-in-out 0.7s infinite" }}
        >
          🌸
        </div>
        <div
          className="absolute top-8 left-2 text-xl"
          style={{ animation: "bounce 1.5s ease-in-out 0.6s infinite" }}
        >
          📝
        </div>
        <div
          className="absolute bottom-4 right-2 text-xl"
          style={{ animation: "bounce 1.3s ease-in-out 0.9s infinite" }}
        >
          💊
        </div>
      </div>
    ),
  };

  return (
    <div className="w-full max-w-sm mx-auto flex items-center justify-center">
      {illustrations[type] || illustrations.welcome}
    </div>
  );
}

// ============================================
// Feature Carousel Component
// ============================================

interface FeatureCarouselProps {
  features: Array<{
    id: string;
    title: string;
    shortDescription: string;
    illustration: string;
  }>;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  context: DynamicContext;
}

function FeatureCarousel({
  features,
  currentIndex,
  onIndexChange,
  context,
}: FeatureCarouselProps) {
  const currentFeature = features[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === features.length - 1;

  const handlePrev = () => {
    if (!isFirst) onIndexChange(currentIndex - 1);
  };

  const handleNext = () => {
    if (!isLast) onIndexChange(currentIndex + 1);
  };

  return (
    <div className="w-full max-w-sm">
      {/* Carousel container */}
      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={handlePrev}
          disabled={isFirst}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10
            w-8 h-8 rounded-full flex items-center justify-center transition-all
            ${isFirst
              ? "text-app-border cursor-not-allowed"
              : "text-app-gray hover:text-app-charcoal hover:bg-app-cream"
            }`}
          aria-label="Previous feature"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Feature content with animation */}
        <div key={currentFeature.id} className="animate-fadeIn px-8">
          {/* Feature illustration */}
          <div className="mb-4">
            <TutorialIllustration type={currentFeature.illustration} context={context} />
          </div>

          {/* Feature info */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-app-charcoal mb-2">
              {currentFeature.title}
            </h3>
            <p className="text-sm text-app-gray leading-relaxed">
              {currentFeature.shortDescription}
            </p>
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={handleNext}
          disabled={isLast}
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10
            w-8 h-8 rounded-full flex items-center justify-center transition-all
            ${isLast
              ? "text-app-border cursor-not-allowed"
              : "text-app-gray hover:text-app-charcoal hover:bg-app-cream"
            }`}
          aria-label="Next feature"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {features.map((feature, index) => (
          <button
            key={feature.id}
            onClick={() => onIndexChange(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? "bg-app-teal w-4"
                : index < currentIndex
                ? "bg-app-teal/50 w-2"
                : "bg-app-border w-2"
            }`}
            aria-label={`Go to ${feature.title}`}
          />
        ))}
      </div>

      {/* Feature counter */}
      <p className="text-xs text-app-gray text-center mt-2">
        {currentIndex + 1} of {features.length} features
      </p>
    </div>
  );
}

// ============================================
// Insights Grid & Card Components
// ============================================

interface IconComponentProps {
  className?: string;
  isHovered?: boolean;
}

const INSIGHT_ITEMS: Array<{
  id: string;
  title: string;
  iconComponent: React.ComponentType<IconComponentProps>;
  blurb: string;
  cycleOnly?: boolean;
}> = [
  { id: "weekly", title: "Weekly View", iconComponent: WeeklyIcon, blurb: "Your past 7 days at a glance" },
  { id: "monthly", title: "Monthly View", iconComponent: MonthlyIcon, blurb: "Track patterns across the full month" },
  { id: "insights", title: "All Insights", iconComponent: AllInsightsIcon, blurb: "Trends and patterns in all your data" },
  { id: "cycle", title: "Cycle Insights", iconComponent: CycleInsightsIcon, blurb: "Menstrual cycle analysis and trends", cycleOnly: true },
  { id: "history", title: "History", iconComponent: HistoryIcon, blurb: "Browse and filter all past entries" },
];

function InsightsGrid({ showCycleInsights }: { showCycleInsights: boolean }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const items = INSIGHT_ITEMS.filter((item) => !item.cycleOnly || showCycleInsights);

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <InsightCard
          key={item.id}
          id={item.id}
          title={item.title}
          iconComponent={item.iconComponent}
          blurb={item.blurb}
          isActive={activeId === item.id}
          onActivate={(id) => setActiveId(activeId === id ? null : id)}
          onHover={(id) => setActiveId(id)}
          onHoverEnd={() => setActiveId(null)}
        />
      ))}
    </div>
  );
}

interface InsightCardProps {
  id: string;
  title: string;
  iconComponent: React.ComponentType<IconComponentProps>;
  blurb: string;
  isActive: boolean;
  onActivate: (id: string) => void;
  onHover: (id: string) => void;
  onHoverEnd: () => void;
}

function InsightCard({ id, title, iconComponent: IconComponent, blurb, isActive, onActivate, onHover, onHoverEnd }: InsightCardProps) {
  return (
    <div
      className="relative bg-white rounded-lg p-3 border border-app-border flex items-center gap-2 cursor-pointer select-none transition-colors hover:border-app-teal/50"
      onMouseEnter={() => onHover(id)}
      onMouseLeave={onHoverEnd}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          e.preventDefault();
          onActivate(id);
        }
      }}
    >
      <IconComponent isHovered={isActive} />
      <span className="text-xs font-medium text-app-charcoal">{title}</span>

      {/* Tooltip */}
      {isActive && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-9 z-10 px-2.5 py-1.5 bg-app-charcoal text-white text-xs rounded-lg whitespace-nowrap shadow-lg animate-fadeIn">
          {blurb}
        </div>
      )}
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

interface LogOptionChipProps {
  label: string;
  icon: string;
  selected: boolean;
}

function LogOptionChip({ label, icon, selected }: LogOptionChipProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
        selected
          ? "border-app-teal bg-app-teal/5"
          : "border-app-border bg-white"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className={`text-sm font-medium ${selected ? "text-app-teal" : "text-app-gray"}`}>
        {label}
      </span>
      <div className="ml-auto">
        {selected ? (
          <div className="w-5 h-5 rounded-full bg-app-teal flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-app-border" />
        )}
      </div>
    </div>
  );
}