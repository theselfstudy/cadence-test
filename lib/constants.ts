import type { UserSettings, BristolType, NavItem, PostBowelFeeling, CyclePhase, ProductOption, MedicineCategory, } from "@/types";

// ============================================
// Base Path (GitHub Pages)
// ============================================

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/cadence';

/** Prepend basePath to an absolute path for use with window.location (not needed for next/link or router.push) */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Strip basePath from window.location.pathname to get the app-relative path */
export function stripBasePath(pathname: string): string {
  if (pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length) || '/';
  }
  return pathname;
}

// ============================================
// Default Symptoms List
// ============================================

export const DEFAULT_SYMPTOMS: readonly string[] = [
  "Bloating",
  "Cramps",
  "Nausea",
  "Fatigue",
  "Headache",
  "Mood Changes",
  "Appetite Changes",
] as const;

// ============================================
// Default Period-Related Symptoms
// ============================================

export const DEFAULT_PERIOD_SYMPTOMS: readonly string[] = [] as const; // Empty - user selects their own

// ============================================
// Pain Scale Descriptions
// ============================================

export const PAIN_SCALE_INFO = {
  simple: {
    name: "Simple 1-10 Scale",
    shortDescription: "A straightforward numeric scale",
    description:
      "A general-purpose scale where 1 means minimal discomfort and 10 means the worst imaginable. Best for occasional symptom tracking or those new to symptom intensity journaling.",
    levels: [
      { value: 1, label: "Minimal" },
      { value: 2, label: "Mild" },
      { value: 3, label: "Uncomfortable" },
      { value: 4, label: "Moderate" },
      { value: 5, label: "Distracting" },
      { value: 6, label: "Distressing" },
      { value: 7, label: "Unmanageable" },
      { value: 8, label: "Intense" },
      { value: 9, label: "Severe" },
      { value: 10, label: "Unbearable" },
    ],
  },
  mankoski: {
    name: "Mankoski Scale",
    shortDescription: "Select this detailed scale for chronic pain",
    description:
      "Developed for chronic pain sufferers, this scale provides specific functional descriptions at each level, helping you communicate more effectively with healthcare providers. Recommended for those managing ongoing chronic conditions.",
    levels: [
      { value: 0, label: "Pain-free" },
      { value: 1, label: "Very minor annoyance; occasional twinges" },
      { value: 2, label: "Minor annoyance; occasional strong twinges" },
      { value: 3, label: "Annoying enough to be distracting" },
      { value: 4, label: "Can be ignored if deeply involved in work, but still distracting" },
      { value: 5, label: "Can't be ignored for more than 30 minutes" },
      { value: 6, label: "Can't be ignored for any length of time, but you can still work" },
      { value: 7, label: "Makes it difficult to concentrate; interferes with sleep" },
      { value: 8, label: "Physical activity severely limited; conversation requires great effort" },
      { value: 9, label: "Unable to speak; crying out or moaning uncontrollably" },
      { value: 10, label: "Unconscious; the pain makes you pass out" },
    ],
  },
} as const;

// ============================================
// Bristol Stool Scale
// ============================================

export const BRISTOL_TYPES: readonly BristolType[] = [
  {
    type: 1,
    name: "Separate hard lumps",
    description: "Like nuts, hard to pass (severe constipation)",
  },
  {
    type: 2,
    name: "Lumpy sausage",
    description: "Sausage-shaped but lumpy (mild constipation)",
  },
  {
    type: 3,
    name: "Cracked sausage",
    description: "Like a sausage with cracks on surface (normal)",
  },
  {
    type: 4,
    name: "Smooth sausage",
    description: "Like a sausage or snake, smooth and soft (ideal)",
  },
  {
    type: 5,
    name: "Soft blobs",
    description: "Soft blobs with clear-cut edges (lacking fiber)",
  },
  {
    type: 6,
    name: "Fluffy pieces",
    description: "Fluffy pieces with ragged edges, mushy (mild diarrhea)",
  },
  {
    type: 7,
    name: "Watery",
    description: "Watery, no solid pieces, entirely liquid (severe diarrhea)",
  },
] as const;

// ============================================
// Post-Bowel Feelings
// ============================================

export const POST_BOWEL_FEELINGS: readonly { value: PostBowelFeeling; label: string; description: string }[] = [
  {
    value: "complete_relief",
    label: "Complete Relief",
    description: "Felt fully emptied and comfortable",
  },
  {
    value: "partial_relief",
    label: "Partial Relief",
    description: "Some relief but not completely satisfied",
  },
  {
    value: "incomplete",
    label: "Incomplete",
    description: "Felt like there's more but couldn't go",
  },
  {
    value: "discomfort",
    label: "Discomfort",
    description: "Experienced some discomfort during or after",
  },
  {
    value: "pain",
    label: "Pain",
    description: "Experienced pain during or after",
  },
  {
    value: "urgency_remains",
    label: "Urgency Remains",
    description: "Still feel the urge to go",
  },
] as const;

// ============================================
// Cycle Phases
// ============================================

export const CYCLE_PHASES: readonly { value: CyclePhase; label: string; description: string; color: string }[] = [
  {
    value: "menstrual",
    label: "Menstrual",
    description: "Days 1-5: Active bleeding",
    color: "app-red",
  },
  {
    value: "follicular",
    label: "Follicular",
    description: "Days 1-13: Before ovulation",
    color: "app-sage",
  },
  {
    value: "ovulation",
    label: "Ovulation",
    description: "Days 14-16: Egg release",
    color: "app-purple",
  },
  {
    value: "luteal",
    label: "Luteal",
    description: "Days 17-28: After ovulation",
    color: "app-taupe",
  },
  {
    value: "not_sure",
    label: "Not Sure",
    description: "Unsure of current cycle phase",
    color: "app-gray",
  },
] as const;

// ============================================
// Flow Levels
// ============================================

export const FLOW_LEVELS: readonly { value: string; label: string }[] = [
  { value: "spotting", label: "Spotting" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
] as const;

// ============================================
// Week Start Options
// ============================================

export const WEEK_START_OPTIONS: { value: "sunday" | "monday"; label: string }[] = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
];

// ============================================
// Default User Settings
// ============================================

export const DEFAULT_USER_SETTINGS: UserSettings = {
  timeFormat: "12h" as const,
  weekStartDay: "sunday" as const,
  
    symptoms: {
    enabled: false,
    selected: [],
    custom: [],
    intensityTracking: {
      enabled: false,
      scaleType: "simple",
    },
  },
  periodTracking: {
    enabled: false,
    trackFlow: false,
    periodSymptoms: [], // Empty - user selects their own
    customPeriodSymptoms: [],
  },
  stoolTracking: {
    enabled: false,
  },
  googleSheet: {
    url: null,
    name: null,
    addedAt: null,
  },
  medicineTracking: {
    enabled: false,
    medicines: [],
  },
  monthlyNavigationContext: {
    startDate: null,
    endDate: null,
    fromCycleInsights: false,
  },
  historyNavigationContext: {
    startDate: null,
    endDate: null,
    fromCycleInsights: false,
  },
  setupComplete: false,
  tutorialComplete: false,
  hasUnsavedChanges: false,
  lastSavedSnapshot: null,
};

// ============================================
// Google Sheet URL Validation
// ============================================

export const GOOGLE_SHEET_URL_PATTERN = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/;

// ============================================
// Navigation Items
// ============================================

// Main navigation items (shown in sidebar body)
export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "New Entry",
    href: "/entry",
  },
  {
    label: "Weekly View",
    href: "/dashboard/weekly",
  },
  {
    label: "Monthly View",
    href: "/dashboard/monthly",
  },
  {
    label: "Cycle Insights",
    href: "/dashboard/cycleinsights",
  },
  // {
  //   label: "At a Glance",
  //   href: "/dashboard/settings-overview",
  // },
] as const;

// Settings item (shown at bottom of sidebar)
export const SETTINGS_NAV_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
};

// ============================================
// App Metadata
// ============================================

export const APP_CONFIG = {
  name: "Cadence",
  description: "Understand you better",
  version: "1.0.0",
} as const;

// ============================================
// Storage Keys
// ============================================

export const STORAGE_KEYS = {
  settings: "cadence-settings",
  entries: 'cadence-entries', 
} as const;

export const PRODUCT_OPTIONS: ProductOption[] = [
  {
    type: "pad",
    label: "Pad",
    hasSizes: true,
    sizes: ["Light", "Regular", "Long", "Overnight", "Postpartum"],
    allowCustomProducts: false,
  },
  {
    type: "tampon",
    label: "Tampon",
    hasSizes: true,
    sizes: ["Light", "Regular", "Super", "Super+", "Ultra"],
    allowCustomProducts: false,
  },
  {
    type: "cup",
    label: "Cup",
    hasSizes: true,
    allowCustomProducts: true,
    maxCustomProducts: 5,
  },
  {
    type: "disc",
    label: "Disc",
    hasSizes: true,
    allowCustomProducts: true,
    maxCustomProducts: 5,
  },
  {
    type: "liner",
    label: "Liner",
    hasSizes: true,
    sizes: ["Regular", "Long"],
    allowCustomProducts: false,
  },

  {
    type: "other",
    label: "Other",
    hasSizes: false,
    sizes: [],
    allowCustomProducts: true,
    maxCustomProducts: 5
  },
];

export const MEDICINE_CATEGORIES: { value: MedicineCategory; label: string; icon: string }[] = [
  { value: "bowel", label: "Bowel", icon: "🧻" },
  { value: "symptom", label: "Symptom", icon: "🏷️" },
  { value: "period", label: "Period", icon: "🌸" },
  { value: "other", label: "Other", icon: "🏷️" },
];

// ============================================
// Sync Reminder Interval
// ============================================

/**
 * Interval for showing the sync reminder modal (48 hours)
 */
// 1min TEST: 1 * 60 * 1000
export const SYNC_REMINDER_INTERVAL_MS = 48 * 60 * 60 * 1000;