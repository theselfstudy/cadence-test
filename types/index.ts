// ============================================
// Cadence Type Definitions
// ============================================

/**
 * Week start day preference
 */
export type WeekStartDay = "sunday" | "monday";

/**
 * Time format preference for displaying times throughout the app
 */
export type TimeFormat = "12h" | "24h";

/**
 * Onboarding mode selection for new users
 */
export type OnboardingMode = "google-sheet" | "anonymous";

/**
 * Pain scale type options
 */
export type PainScaleType = "simple" | "mankoski";

/** 
 * Medicine category (tags)
 */

export type MedicineCategory = "bowel" | "symptom" | "period" | "other";

/**
 * Symptom intensity tracking configuration
 */
export interface IntensityTrackingConfig {
  /** Whether intensity tracking is enabled */
  enabled: boolean;
  /** Which pain scale to use */
  scaleType: PainScaleType;
}

export type ProductType = "pad" | "tampon" | "cup" | "disc" | "liner" | "period-underwear" | "other";

export interface CustomProduct {
  id: string;
  name: string;
}

export interface ProductOption {
  type: ProductType;
  label: string;
  hasSizes: boolean;
  sizes?: string[];
  allowCustomProducts?: boolean;
  maxCustomProducts?: number;
}

export interface ProductTracking {
  enabled: boolean;
  selectedProducts: string[];
  customProducts: Record<string, CustomProduct[]>;
}

/**
 * Symptom tracking configuration
 */
export interface SymptomsConfig {
  /** Whether symptom tracking section is enabled */
  enabled: boolean;
  /** Currently selected symptoms to track */
  selected: string[];
  /** User-added custom symptoms */
  custom: string[];
  /** Intensity/pain scale tracking settings */
  intensityTracking: IntensityTrackingConfig;
}

/**
 * Period tracking configuration
 */
export interface PeriodTrackingConfig {
  /** Whether period tracking is enabled */
  enabled: boolean;
  /** Whether to show personal/detailed questions */
  trackFlow: boolean;
  /** Symptoms specifically related to period (from main symptoms list) */
  periodSymptoms: string[];
  /** Custom period-specific symptoms added by user */
  customPeriodSymptoms: string[];

  /** Period product-specific symptoms added by user */
  productTracking?:ProductTracking;

  /** Custom period. product-specific symptoms added by user */
  customProducts?: CustomProduct[];
}

export interface MedicineTracking {
  enabled: boolean;
  medicines: Medicine[];  // Array of medicines
}

export interface MedicineLogEntry {
  medicineId: string;
  medicineName: string;
  dosage: string; // What they actually took
  time?: TimeValue; // Required if medicine is time-sensitive
}

/**
 * Stool/bowel tracking configuration
 */
export interface StoolTrackingConfig {
  /** Whether stool/bowel tracking is enabled */
  enabled: boolean;
}

/**
 * Google Sheet integration configuration
 */
export interface GoogleSheetConfig {
  /** The Google Sheet URL */
  url: string | null;
  /** Optional display name for the sheet */
  name: string | null;
  /** When the URL was added */
  addedAt: string | null;
}

export interface MonthlyNavigationContext {
  startDate: string | null;
  endDate: string | null;
  fromCycleInsights: boolean;
}

export interface HistoryNavigationContext {
  startDate: string | null;
  endDate: string | null;
  fromCycleInsights: boolean;
}

export interface MedicineSection {
  category: MedicineCategory;
  medicines: Medicine[];
  loggedMedicines: MedicineLogEntry[];
  onChange: (entries: MedicineLogEntry[]) => void;
  is24Hour: boolean;
}

/**
 * User settings stored in Zustand with localStorage persistence
 */
export interface UserSettings {
  /** Week start day preference */
  weekStartDay: WeekStartDay;

  /** Time display format preference */
  timeFormat: TimeFormat;
  
  /** Symptoms tracking configuration */
  symptoms: SymptomsConfig;
  
  /** Period tracking configuration */
  periodTracking: PeriodTrackingConfig;
  
  /** Stool/bowel tracking configuration */
  stoolTracking: StoolTrackingConfig;
  
  /** Google Sheet integration */
  googleSheet: GoogleSheetConfig;

  /** Medicine tracking integration */
  medicineTracking: MedicineTracking;
  
  /** Whether initial setup wizard is complete */
  setupComplete: boolean;
  
  /** Whether user has completed the app tutorial */
  tutorialComplete: boolean;

  /** Whether there are unsaved changes (for alert) */
  hasUnsavedChanges: boolean;

  lastSavedSnapshot: string | null;

  monthlyNavigationContext: MonthlyNavigationContext;
  
  historyNavigationContext: HistoryNavigationContext;
}

/**
 * Actions available on the settings store
 */
export interface SettingsActions {
  /** Update week start day preference */
  setWeekStartDay: (day: WeekStartDay) => void;
  
  /** Set history navigation context (for cross-page navigation) */
  setHistoryNavigationContext: (context: Partial<HistoryNavigationContext>) => void;
  
  /** Clear history navigation context */
  clearHistoryNavigationContext: () => void;
  
  /** Update time format preference */
  setTimeFormat: (format: TimeFormat) => void;
  
  /** Toggle a symptom selection on/off */
  toggleSymptom: (symptom: string) => void;
  
  /** Add a custom symptom */
  addCustomSymptom: (symptom: string) => void;
  
  /** Remove a custom symptom */
  removeCustomSymptom: (symptom: string) => void;
  
  /** Update intensity tracking settings */
  setIntensityTracking: (config: Partial<IntensityTrackingConfig>) => void;
  
  /** Update period tracking settings */
  setPeriodTracking: (config: Partial<PeriodTrackingConfig>) => void;
  
  /** Toggle a period-related symptom */
  togglePeriodSymptom: (symptom: string) => void;
  
  /** Add a custom period-specific symptom */
  addCustomPeriodSymptom: (symptom: string) => void;
  
  /** Remove a custom period-specific symptom */
  removeCustomPeriodSymptom: (symptom: string) => void;
  
  /** Update stool tracking settings */
  setStoolTracking: (config: Partial<StoolTrackingConfig>) => void;
  
  /** Set Google Sheet URL and optional name */
  setGoogleSheet: (url: string, name?: string) => void;
  
  /** Remove Google Sheet URL */
  clearGoogleSheet: () => void;

  setMedicineTracking: (config: Partial<MedicineTracking>) => void;
  
  /** Mark setup as complete */
  completeSetup: () => void;
  
  /** Mark tutorial as complete */
  completeTutorial: () => void;
  
  /** Reset all settings to defaults */
  resetSettings: () => void;

  /** Unchanged Setting defaults */
  setHasUnsavedChanges: (value: boolean) => void;

  /** Reverting to last save if left unsaved */
  revertToLastSave: () => void;
}

/**
 * Combined settings store type
 */
export type SettingsStore = UserSettings & SettingsActions & GoogleSettings;

// ============================================
// Entry Types
// ============================================

/**
 * Time value for entry form
 */
export interface TimeValue {
  hour: number;
  minute: number;
  period: "AM" | "PM";
}

/**
 * Bristol stool type (1-7)
 */
export type BristolScaleType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Feeling after bowel movement
 */
export type PostBowelFeeling = 
  | "complete_relief"
  | "partial_relief"
  | "incomplete"
  | "discomfort"
  | "pain"
  | "urgency_remains";

/**
 * Menstrual cycle phase
 */
export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal" | "not_sure";

/**
 * Symptom with optional intensity
 */
export interface SymptomEntry {
  name: string;
  intensity?: number;
  isPeriodRelated?: boolean;
}

/**
 * Personal period questions data
 */
export interface PersonalPeriodData {
  flowLevel?: "light" | "medium" | "heavy" | "spotting";
  painLevel?: number;
  notes?: string;
}

/**
 * Complete entry form data
 */
export interface EntryFormData {
  /** Date of the entry */
  date: string;
  
  /** Start time */
  startTime: TimeValue;
  
  /** End time */
  endTime: TimeValue;
  
  /** Bristol stool type */
  bristolType: BristolScaleType | null;
  
  /** How user feels after */
  postFeeling: PostBowelFeeling | null;
  
  /** Selected symptoms with optional intensity */
  symptoms: SymptomEntry[];
  
  /** Period tracking data (if enabled) */
  periodData?: {
    cyclePhase: CyclePhase | null;
    productUsage?: ProductUsageEntry[]; 
    personalData?: PersonalPeriodData;
  };
  
  /** Additional notes */
  notes?: string;
}

/**
 * Saved entry with metadata
 */
export interface SavedEntry extends EntryFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Navigation Types
// ============================================

/**
 * Navigation item for app routing
 */
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

// ============================================
// Bristol Stool Scale Types
// ============================================

/**
 * Bristol Stool Scale type definition
 */
export interface BristolType {
  type: number;
  name: string;
  description: string;
}

/**
 * Product usage entry definition
 */
export interface ProductUsageEntry {
  productType: string;
  customProductId?: string;
  size?: string;
}

export interface Medicine {
  id: string;
  name: string;
  categories: MedicineCategory[];
  dosages: string[];
  timeSensitive: boolean; // Requires time logging
}

export interface GoogleSettings {
  isGoogleSheetConnected: boolean;
  isSyncing: boolean;
  disconnectGoogleSheet: () => void;
  saveSettingsToSheet: (accessToken: string) => Promise<boolean>;
  loadSettingsFromSheet: (
    spreadsheetId: string,
    accessToken: string,
    sheetName?: string
  ) => Promise<boolean>;
  /** Handle sheet verification failure (deleted/access removed) - clears connection */
  handleSheetVerificationFailure: () => void;
}

// ============================================
// Google Sheets Entry Types
// ============================================

/**
 * Represents a single row in the Google Sheet
 * Maps column headers to cell values
 */
export interface SheetRowData {
  [columnHeader: string]: string | number | null;
}

/**
 * Entry as stored in localStorage/Zustand
 * This is the canonical format before transformation to sheet row
 */
export interface StoredEntry {
  /** Unique identifier for the entry */
  id: string;
  
  /** ISO date string of when entry was created */
  createdAt: string;
  
  /** ISO date string of last update */
  updatedAt: string;
  
  /** Date of the entry (YYYY-MM-DD format for sheets) */
  date: string;
  
  /** Start time formatted as string */
  startTime: string;
  
  /** End time formatted as string */
  endTime: string;
  
  /** Pain scale type used for this entry */
  painScale: PainScaleType;
  
  /** Symptom intensities - key is symptom name, value is intensity (or null if no intensity tracking) */
  symptomIntensities: Record<string, number | null>;

  /** One-off custom symptoms for this entry only (not persisted globally) */
  oneOffSymptoms?: string[];

  /** Period-related symptom intensities (tracked separately for column grouping) */
  periodSymptomIntensities: Record<string, number | null>;
  
  /** Cycle phase if period tracking enabled */
  cyclePhase: CyclePhase | null;
  
  /** Period flow level if applicable (may include start time as "heavy @ 4:44 PM") */
  periodFlow: string | null;

  /** Product usage entries */
  productUsage: ProductUsageEntry[];
  
  /** Bristol stool type (1-7) if applicable */
  stoolType: BristolScaleType | null;
  
  /** Post-bowel feeling if applicable */
  stoolFeeling: PostBowelFeeling | null;
  
  /** Medicine log entries */
  medicineLog: MedicineLogEntry[];
  
  /** Additional notes */
  notes: string;
  
  /** Sync status with Google Sheets */
  syncStatus: 'pending' | 'synced' | 'error';
  
  /** Error message if sync failed */
  syncError?: string;
}

/**
 * Entry store state
 */
export interface EntryStoreState {
  /** All stored entries */
  entries: StoredEntry[];

  /** Monotonic revision counter – incremented on every entries mutation.
   *  Use as a useMemo dependency to guarantee derived views recompute. */
  _revision: number;

  /** Whether we're currently syncing with Google Sheets */
  isSyncing: boolean;

  /** Last sync timestamp */
  lastSyncAt: string | null;

  /** Progress state for batch sync operations */
  batchSyncProgress: BatchSyncProgress | null;
}

/**
 * Entry store actions
 */
export interface EntryStoreActions {
  /** Add a new entry (saves to localStorage, optionally syncs to sheet) */
  addEntry: (entry: Omit<StoredEntry, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => StoredEntry;
  
  /** Sync a pending entry to Google Sheets */
  syncEntryToSheet: (entryId: string, accessToken: string) => Promise<boolean>;
  
  /** Mark an entry as synced */
  markEntrySynced: (entryId: string) => void;
  
  /** Mark an entry sync as failed */
  markEntryFailed: (entryId: string, error: string) => void;
  
  /** Get all entries pending sync */
  getPendingEntries: () => StoredEntry[];
  
  /** Sync all pending entries */
  syncAllPending: (accessToken: string) => Promise<void>;
  
  /** Clear all entries (for testing/reset) */
  clearEntries: () => void;
  
  /** Batch sync all pending/error entries with progress tracking */
  batchSyncEntries: (
    accessToken: string,
    onProgress?: (progress: BatchSyncProgress) => void
  ) => Promise<BatchSyncResult>;
  
  /** Get count of entries that can be synced */
  getSyncableEntriesCount: () => number;
  
  /** Clear batch sync progress state */
  clearBatchSyncProgress: () => void;
  
  /** Import entries from connected Google Sheet, merging with local entries */
  importEntriesFromSheet: (accessToken: string) => Promise<ImportEntriesResult>;
}

/**
 * Combined entry store type
 */
export type EntryStore = EntryStoreState & EntryStoreActions;

/**
 * Column definition for sheet structure
 */
export interface SheetColumn {
  header: string;
  section: 'metadata' | 'symptoms' | 'oneOffSymptoms' | 'periodSymptoms' | 'period' | 'products' | 'stool' | 'medicines' | 'closing';
  getValue: (entry: StoredEntry) => string | number;
}

// ============================================
// Entry Log Section Selection
// ============================================

/**
 * Sections available for logging in the entry form
 * Used by the pre-entry modal to let users choose what to log
 */
export type LogSection = "symptoms" | "bowel" | "period" | "medicine";

/**
 * Configuration for the log selection modal
 */
export interface LogSelectionConfig {
  /** Which sections the user wants to log for this entry */
  selectedSections: LogSection[];
}

// ============================================
// Batch Sync Types
// ============================================

/**
 * Progress state for batch entry sync
 */
export interface BatchSyncProgress {
  /** Total number of entries to sync */
  total: number;
  /** Number of entries completed (success or fail) */
  completed: number;
  /** Number of entries successfully synced */
  succeeded: number;
  /** Number of entries that failed */
  failed: number;
  /** Currently syncing entry index (1-based for display) */
  current: number;
  /** Entry IDs that failed to sync */
  failedEntryIds: string[];
}

/**
 * Result of a batch sync operation
 */
export interface BatchSyncResult {
  /** Whether all entries synced successfully */
  success: boolean;
  /** Total entries attempted */
  total: number;
  /** Number successfully synced */
  succeeded: number;
  /** Number that failed */
  failed: number;
  /** IDs of entries that failed */
  failedEntryIds: string[];
}

/**
 * Result of importing entries from Google Sheet
 */
export interface ImportEntriesResult {
  /** Whether the import completed successfully */
  success: boolean;
  /** Number of new entries imported */
  imported: number;
  /** Number of entries skipped (duplicates) */
  skipped: number;
  /** Total entries found in sheet */
  total: number;
  /** Error message if failed */
  error?: string;
}

// ============================================
// History Filter Types
// ============================================

/**
 * Filter categories available in history view
 */
export type FilterCategory = "symptoms" | "cycle" | "bowel" | "medicine";

/**
 * Flow level options for period tracking
 */
export type FlowLevel = "spotting" | "light" | "medium" | "heavy";

/**
 * Complete filter state for history page
 */
export interface HistoryFilters {
  /** Selected symptoms (includes both general and period symptoms) */
  selectedSymptoms: string[];
  
  /** Selected cycle phases */
  selectedCyclePhases: CyclePhase[];
  
  /** Selected flow levels */
  selectedFlowLevels: FlowLevel[];
  
  /** Selected Bristol stool types */
  selectedBristolTypes: BristolScaleType[];
  
  /** Selected post-bowel feelings */
  selectedFeelings: PostBowelFeeling[];
  
  /** Selected medicine names */
  selectedMedicines: string[];
}

/**
 * Represents a single active filter for display as a chip
 */
export interface ActiveFilter {
  /** Which category this filter belongs to */
  category: FilterCategory;
  /** Subcategory for removal logic (e.g., 'phase' vs 'flow' within cycle) */
  type: "symptom" | "phase" | "flow" | "bristol" | "feeling" | "medicine";
  /** The actual filter value */
  value: string;
  /** Human-readable label for display */
  label: string;
}

/**
 * Available filter options derived from entries
 */
export interface AvailableFilterOptions {
  symptoms: string[];
  cyclePhases: CyclePhase[];
  flowLevels: FlowLevel[];
  bristolTypes: BristolScaleType[];
  feelings: PostBowelFeeling[];
  medicines: string[];
}

// ============================================
// Saved Filter Types
// ============================================

/**
 * A saved filter configuration
 */
export interface SavedFilter {
  /** Unique identifier */
  id: string;
  /** User-defined name (max 30 characters) */
  name: string;
  /** The filter configuration */
  filters: HistoryFilters;
  /** When the filter was created */
  createdAt: string;
  /** When the filter was last updated */
  updatedAt: string;
}

/**
 * Saved filters store state
 */
export interface SavedFiltersState {
  /** Array of saved filters (max 3) */
  savedFilters: SavedFilter[];
  /** Whether we're syncing with Google Sheets */
  isSyncing: boolean;
}

/**
 * Saved filters store actions
 */
export interface SavedFiltersActions {
  /** Save current filters with a name (returns false if at max capacity) */
  saveFilter: (name: string, filters: HistoryFilters) => SavedFilter | null;
  /** Delete a saved filter by ID */
  deleteFilter: (id: string) => void;
  /** Update an existing filter's configuration */
  updateFilter: (id: string, filters: HistoryFilters) => void;
  /** Rename an existing filter */
  renameFilter: (id: string, newName: string) => void;
  /** Check if we can save more filters */
  canSaveMore: () => boolean;
  /** Get remaining slot count */
  getRemainingSlots: () => number;
  /** Sync saved filters to Google Sheet */
  syncToSheet: (accessToken: string) => Promise<boolean>;
  /** Load saved filters from Google Sheet */
  loadFromSheet: (spreadsheetId: string, accessToken: string) => Promise<boolean>;
  /** Clear all saved filters */
  clearAll: () => void;
}

/**
 * Combined saved filters store type
 */
export type SavedFiltersStore = SavedFiltersState & SavedFiltersActions;