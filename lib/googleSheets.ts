// ============================================
// Google Sheets API Helpers
// ============================================

import type { StoredEntry, UserSettings, SheetColumn, MedicineLogEntry, ProductUsageEntry } from '@/types';

import { PRODUCT_OPTIONS } from '@/lib/constants';

// Entry sheet naming: cadence-YYYY-MM (e.g., cadence-2024-01)
export const ENTRIES_SHEET_PREFIX = "Cadence";

// ============================================
// SHEET HEALTH CHECK
// ============================================

export interface SheetVerificationResult {
  success: boolean;
  error?: 'deleted' | 'access_removed' | 'invalid' | 'network_error';
  message?: string;
}

/**
 * Verifies that the connected Google Sheet is still accessible.
 * Should be called after OAuth succeeds but before any push/pull operations.
 *
 * Checks:
 * - Sheet exists (not deleted)
 * - User still has access
 * - spreadsheetId is valid
 *
 * @param spreadsheetId - The ID of the spreadsheet to verify
 * @param accessToken - OAuth access token
 * @returns SheetVerificationResult indicating success or failure type
 */
export async function verifySheetConnection(
  spreadsheetId: string,
  accessToken: string
): Promise<SheetVerificationResult> {
  try {
    // Request minimal metadata to verify sheet exists and is accessible
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      return { success: true };
    }

    // Handle specific error codes
    const status = response.status;

    if (status === 404) {
      // Sheet was deleted
      return {
        success: false,
        error: 'deleted',
        message: 'Sheet deleted or access removed. Please reconnect.',
      };
    }

    if (status === 403) {
      // Permission denied - user lost access
      return {
        success: false,
        error: 'access_removed',
        message: 'Sheet deleted or access removed. Please reconnect.',
      };
    }

    if (status === 400) {
      // Bad request - invalid spreadsheet ID
      return {
        success: false,
        error: 'invalid',
        message: 'Sheet deleted or access removed. Please reconnect.',
      };
    }

    if (status === 401) {
      // Unauthorized - token issue, but since we just got a fresh token,
      // this likely means the sheet was deleted or access was revoked
      return {
        success: false,
        error: 'access_removed',
        message: 'Sheet deleted or access removed. Please reconnect.',
      };
    }

    // Other errors - treat as network/temporary issues
    return {
      success: false,
      error: 'network_error',
      message: 'Unable to verify sheet connection. Please try again.',
    };
  } catch (error) {
    console.error('Error verifying sheet connection:', error);
    return {
      success: false,
      error: 'network_error',
      message: 'Unable to verify sheet connection. Please try again.',
    };
  }
}

/**
 * Fetches the title of a Google Spreadsheet.
 * Used to display the user's sheet name without requiring manual input.
 *
 * @param spreadsheetId - The ID of the spreadsheet
 * @param accessToken - OAuth access token
 * @returns The spreadsheet title, or null if unable to fetch
 */
export async function getSpreadsheetTitle(
  spreadsheetId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch spreadsheet title:', response.status);
      return null;
    }

    const data = await response.json();
    return data.properties?.title ?? null;
  } catch (error) {
    console.error('Error fetching spreadsheet title:', error);
    return null;
  }
}

// ============================================
// SHEET NAMES & CONFIGURATION
// ============================================

const SETTINGS_SHEET_NAME = ".cadence-settings";
const SAVED_FILTERS_SHEET_NAME = ".cadence-savedfilters";
const SAVED_FILTERS_RANGE = `${SAVED_FILTERS_SHEET_NAME}!A1`;

/**
 * Generates the sheet name for a given date's month.
 * Format: Cadence-YYYY-MM
 *
 * Accepts either a YYYY-MM-DD date string (parsed directly to avoid
 * timezone-offset bugs with `new Date()`) or a Date object.
 */
function getEntriesSheetName(date?: string | Date): string {
  if (typeof date === 'string') {
    // Extract YYYY-MM directly from "YYYY-MM-DD" — no timezone ambiguity
    const [year, month] = date.split('-');
    return `${ENTRIES_SHEET_PREFIX}-${year}-${month}`;
  }
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${ENTRIES_SHEET_PREFIX}-${year}-${month}`;
}

/**
 * Parses a sheet name to extract year and month.
 * Returns null if not a valid entries sheet name.
 */
function parseEntriesSheetName(sheetName: string): { year: number; month: number } | null {
  const match = sheetName.match(/^Cadence-(\d{4})-(\d{2})$/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
  };
}

/**
 * Checks if a sheet name is a Cadence entries sheet.
 */
function isEntriesSheet(sheetName: string): boolean {
  return parseEntriesSheetName(sheetName) !== null;
}

// Ranges
const SETTINGS_RANGE = `${SETTINGS_SHEET_NAME}!A1`;

// ============================================
// SETTINGS FUNCTIONS
// ============================================

/**
 * Reads the settings JSON from the hidden tab in the user's Google Sheet.
 */
export async function getSettingsFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<string | null> {
  try {
    console.log("getSettingsFromSheet: Fetching from range:", SETTINGS_RANGE);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SETTINGS_RANGE)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error("getSettingsFromSheet: API error", response.status, errorBody);
      throw new Error(`Failed to fetch settings from sheet: ${response.status}`);
    }
    const data = await response.json();
    const settingsValue = data.values?.[0]?.[0] || null;
    console.log("getSettingsFromSheet: Retrieved data, has value:", !!settingsValue, "length:", settingsValue?.length || 0);
    return settingsValue;
  } catch (error) {
    console.error("Error getting settings from sheet:", error);
    return null;
  }
}

/**
 * Writes the settings JSON to the hidden tab in the user's Google Sheet.
 * It will create the hidden tab if it doesn't exist.
 */
export async function saveSettingsToSheet(
  settingsJson: string,
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SETTINGS_RANGE)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[settingsJson]],
        }),
      }
    );

    if (updateResponse.status === 400) {
      await _createHiddenSheet(spreadsheetId, accessToken, SETTINGS_SHEET_NAME);
      return await saveSettingsToSheet(settingsJson, spreadsheetId, accessToken);
    }

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.json();
      console.error("Google Sheets API error:", errorBody);
      throw new Error("Failed to update settings in sheet.");
    }

    return true;
  } catch (error) {
    console.error("Error saving settings to sheet:", error);
    return false;
  }
}

/**
 * Helper function to create a hidden sheet.
 */
async function _createHiddenSheet(
  spreadsheetId: string,
  accessToken: string,
  sheetName: string
) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
                hidden: true,
              },
            },
          },
        ],
      }),
    }
  );
}

/**
 * Checks if the settings sheet exists and has content.
 */
export async function checkForExistingSettings(
  spreadsheetId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SETTINGS_RANGE)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.values?.[0]?.[0] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if the spreadsheet has any Cadence entry sheets with data.
 * Returns true if at least one entry exists.
 */
export async function checkForExistingEntries(
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const sheets = await getAllEntriesSheets(spreadsheetId, accessToken);

    if (sheets.length === 0) {
      return false;
    }

    // Check first sheet for any data rows (beyond header)
    for (const sheet of sheets) {
      const data = await fetchSheetData(spreadsheetId, accessToken, sheet.name);
      if (data && data.rows.length > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking for existing entries:", error);
    return false;
  }
}

/**
 * Deletes the settings sheet from the user's Google Sheet.
 * Used when doing a full reset to remove all saved settings.
 */
export async function deleteSettingsSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to get spreadsheet info");
      return false;
    }

    const data = await response.json();
    const settingsSheet = data.sheets?.find(
      (sheet: { properties: { title: string } }) =>
        sheet.properties.title === SETTINGS_SHEET_NAME
    );

    if (!settingsSheet) {
      console.log("Settings sheet not found, nothing to delete");
      return true;
    }

    const sheetId = settingsSheet.properties.sheetId;

    const deleteResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              deleteSheet: {
                sheetId: sheetId,
              },
            },
          ],
        }),
      }
    );

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      console.error("Failed to delete settings sheet:", error);
      return false;
    }

    console.log("Settings sheet deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting settings sheet:", error);
    return false;
  }
}

// ============================================
// MONTHLY TAB MANAGEMENT
// ============================================

/**
 * Gets all Cadence entry sheet tabs from the spreadsheet.
 * Returns array of { name, sheetId, year, month, hidden }
 */
export async function getAllEntriesSheets(
  spreadsheetId: string,
  accessToken: string
): Promise<Array<{
  name: string;
  sheetId: number;
  year: number;
  month: number;
  hidden: boolean;
}>> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to get spreadsheet info");
      return [];
    }

    const data = await response.json();
    const entriesSheets: Array<{
      name: string;
      sheetId: number;
      year: number;
      month: number;
      hidden: boolean;
    }> = [];

    for (const sheet of data.sheets ?? []) {
      const name = sheet.properties.title;
      const parsed = parseEntriesSheetName(name);
      if (parsed) {
        entriesSheets.push({
          name,
          sheetId: sheet.properties.sheetId,
          year: parsed.year,
          month: parsed.month,
          hidden: sheet.properties.hidden ?? false,
        });
      }
    }

    // Sort by date descending (most recent first)
    entriesSheets.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return entriesSheets;
  } catch (error) {
    console.error("Error getting entries sheets:", error);
    return [];
  }
}

/**
 * Hides old monthly tabs. Called after successfully appending to current month.
 * Hides tabs that are:
 * - Not the current month
 * - We're at least 7 days into the current month
 */
export async function hideOldMonthlyTabs(
  spreadsheetId: string,
  accessToken: string
): Promise<void> {
  const now = new Date();
  const currentDay = now.getDate();
  
  // Only hide old tabs if we're 7+ days into the month
  if (currentDay < 7) {
    return;
  }

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  try {
    const allSheets = await getAllEntriesSheets(spreadsheetId, accessToken);
    
    const sheetsToHide = allSheets.filter(sheet => {
      // Don't hide current month
      if (sheet.year === currentYear && sheet.month === currentMonth) {
        return false;
      }
      // Don't hide already hidden sheets
      if (sheet.hidden) {
        return false;
      }
      return true;
    });

    if (sheetsToHide.length === 0) {
      return;
    }

    const requests = sheetsToHide.map(sheet => ({
      updateSheetProperties: {
        properties: {
          sheetId: sheet.sheetId,
          hidden: true,
        },
        fields: 'hidden',
      },
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    console.log(`Hidden ${sheetsToHide.length} old monthly tab(s)`);
  } catch (error) {
    // Non-critical error - don't fail the main operation
    console.error("Error hiding old tabs:", error);
  }
}

/**
 * Unhides a specific monthly tab (for viewing old data).
 */
export async function unhideMonthlyTab(
  spreadsheetId: string,
  accessToken: string,
  year: number,
  month: number
): Promise<boolean> {
  try {
    const allSheets = await getAllEntriesSheets(spreadsheetId, accessToken);
    const targetSheet = allSheets.find(s => s.year === year && s.month === month);
    
    if (!targetSheet) {
      console.log(`Sheet for ${year}-${month} not found`);
      return false;
    }

    if (!targetSheet.hidden) {
      return true; // Already visible
    }

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            updateSheetProperties: {
              properties: {
                sheetId: targetSheet.sheetId,
                hidden: false,
              },
              fields: 'hidden',
            },
          }],
        }),
      }
    );

    return true;
  } catch (error) {
    console.error("Error unhiding tab:", error);
    return false;
  }
}

// ============================================
// COLUMN BUILDING
// ============================================

/**
 * Builds the canonical column order based on current user settings.
 * 
 * COLUMN ORDER ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FIXED START        │ DYNAMIC MIDDLE (append-only)              │ FIXED END │
 * ├────────────────────┼───────────────────────────────────────────┼───────────┤
 * │ Date               │ Stool: Type, Feeling                      │ Notes     │
 * │ Start Time         │ Cycle Phase, Flow                         │           │
 * │ End Time           │ Products (append-only)                    │           │
 * │ Pain Scale         │ General Symptoms (append-only)            │           │
 * │                    │ Period Symptoms (append-only)             │           │
 * │                    │ Medicines (append-only)                   │           │
 * └────────────────────┴───────────────────────────────────────────┴───────────┘
 * 
 * Rules:
 * 1. Fixed columns don't change position
 * 2. New columns are appended to the end of their section
 * 3. Removed/archived symptoms leave columns in place (old entries keep data)
 * 4. Column headers in the sheet are the source of truth for positions
 */
export function buildCanonicalColumns(settings: UserSettings): SheetColumn[] {
  const columns: SheetColumn[] = [];

  // ─────────────────────────────────────────
  // SECTION 1: Fixed Start (always these 4, in this order)
  // ─────────────────────────────────────────
  columns.push({
    header: 'Date',
    section: 'metadata',
    getValue: (entry) => entry.date,
  });
  
  columns.push({
    header: 'Start Time',
    section: 'metadata',
    getValue: (entry) => entry.startTime,
  });
  
  columns.push({
    header: 'End Time',
    section: 'metadata',
    getValue: (entry) => entry.endTime,
  });
  
  columns.push({
    header: 'Pain Scale',
    section: 'metadata',
    getValue: (entry) => entry.painScale,
  });

  // ─────────────────────────────────────────
  // SECTION 2: Stool Tracking
  // ─────────────────────────────────────────
  if (settings.stoolTracking.enabled) {
    columns.push({
      header: 'Stool: Type',
      section: 'stool',
      getValue: (entry) => entry.stoolType ?? '',
    });
    
    columns.push({
      header: 'Stool: Feeling',
      section: 'stool',
      getValue: (entry) => entry.stoolFeeling ?? '',
    });
  }

  // ─────────────────────────────────────────
  // SECTION 3: Period/Cycle Info
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled) {
    columns.push({
      header: 'Cycle Phase',
      section: 'period',
      getValue: (entry) => entry.cyclePhase ?? '',
    });

    if (settings.periodTracking.trackFlow) {
      columns.push({
        header: 'Period: Flow',
        section: 'period',
        getValue: (entry) => entry.periodFlow ?? '',
      });
    }

  }

  // ─────────────────────────────────────────
  // SECTION 4: Products (append-only)
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled && settings.periodTracking.productTracking?.enabled) {
    const selectedProducts = settings.periodTracking.productTracking.selectedProducts ?? [];
    const customProductsMap = settings.periodTracking.productTracking.customProducts ?? {};
    
    for (const productType of selectedProducts) {
      const productDef = PRODUCT_OPTIONS.find(p => p.type === productType);
      
      if (productDef?.allowCustomProducts) {
        const customProducts = customProductsMap[productType] ?? [];
        
        for (const customProduct of customProducts) {
          const productLabel = productDef.label.toLowerCase();
          
          columns.push({
            header: `Product: ${customProduct.name} (${productLabel})`,
            section: 'products',
            getValue: (entry) => {
              const usage = entry.productUsage.find(
                p => p.productType === productType && p.customProductId === customProduct.id
              );
              if (!usage) return '';
              return usage.size ?? 'Used';
            },
          });
        }
      } else {
        const productLabel = productDef?.label ?? productType;
        
        columns.push({
          header: `Product: ${productLabel}`,
          section: 'products',
          getValue: (entry) => {
            const usage = entry.productUsage.find(p => p.productType === productType);
            if (!usage) return '';
            return usage.size ?? 'Used';
          },
        });
      }
    }
  }

  // ─────────────────────────────────────────
  // SECTION 4.5: One-Off Symptoms (per-entry custom symptoms)
  // ─────────────────────────────────────────
  // Always include this column - stores as comma-separated string
  columns.push({
    header: 'oneOff. Sym',
    section: 'oneOffSymptoms',
    getValue: (entry) => {
      const symptoms = entry.oneOffSymptoms ?? [];
      return symptoms.length > 0 ? symptoms.join(', ') : '';
    },
  });

  // ─────────────────────────────────────────
  // SECTION 5: General Symptoms (append-only)
  // ─────────────────────────────────────────
  if (settings.symptoms.enabled && settings.symptoms.intensityTracking.enabled) {
    const periodOnlySymptoms = new Set(
      settings.periodTracking.customPeriodSymptoms.filter(
        s => !settings.symptoms.custom.includes(s)
      )
    );

    for (const symptom of settings.symptoms.selected) {
      if (periodOnlySymptoms.has(symptom)) continue;
      
      columns.push({
        header: `Gen. Sym: ${symptom}`,
        section: 'symptoms',
        getValue: (entry) => entry.symptomIntensities[symptom] ?? '',
      });
    }

    for (const symptom of settings.symptoms.custom) {
      if (!settings.symptoms.selected.includes(symptom)) {
        columns.push({
          header: `Gen. Sym: ${symptom}`,
          section: 'symptoms',
          getValue: (entry) => entry.symptomIntensities[symptom] ?? '',
        });
      }
    }
  }

  // ─────────────────────────────────────────
  // SECTION 6: Period Symptoms (append-only)
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled) {
    for (const symptom of settings.periodTracking.periodSymptoms) {
      columns.push({
        header: `Per. Sym: ${symptom}`,
        section: 'periodSymptoms',
        getValue: (entry) => entry.periodSymptomIntensities[symptom] ?? '',
      });
    }

    for (const symptom of settings.periodTracking.customPeriodSymptoms) {
      if (!settings.periodTracking.periodSymptoms.includes(symptom)) {
        columns.push({
          header: `Per. Sym: ${symptom}`,
          section: 'periodSymptoms',
          getValue: (entry) => entry.periodSymptomIntensities[symptom] ?? '',
        });
      }
    }
  }

  // ─────────────────────────────────────────
  // SECTION 7: Medicines (append-only)
  // ─────────────────────────────────────────
  if (settings.medicineTracking.enabled) {
    for (const medicine of settings.medicineTracking.medicines) {
      columns.push({
        header: `Med: ${medicine.name}`,
        section: 'medicines',
        getValue: (entry) => {
          const log = entry.medicineLog.find(m => m.medicineId === medicine.id);
          if (!log) return '';
          const parts: string[] = [];
          if (log.dosage) parts.push(log.dosage);
          if (log.time) {
            const timeStr = `${log.time.hour}:${log.time.minute.toString().padStart(2, '0')} ${log.time.period}`;
            parts.push(`@ ${timeStr}`);
          }
          return parts.join(' ') || 'Taken';
        },
      });
    }
  }

  // ─────────────────────────────────────────
  // SECTION 8: Fixed End (Notes always last)
  // ─────────────────────────────────────────
  columns.push({
    header: 'Notes',
    section: 'closing',
    getValue: (entry) => entry.notes ?? '',
  });

  return columns;
}

// ============================================
// ENTRIES SHEET OPERATIONS
// ============================================

/**
 * Gets the existing headers from a specific entries sheet.
 * Returns null if the sheet doesn't exist.
 */
export async function getEntriesSheetHeaders(
  spreadsheetId: string,
  accessToken: string,
  sheetName?: string
): Promise<string[] | null> {
  const targetSheet = sheetName ?? getEntriesSheetName();
  const range = `'${targetSheet}'!1:1`;
  
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      if (error.error?.status === 'NOT_FOUND' || response.status === 400) {
        return null;
      }
      throw new Error('Failed to fetch headers');
    }

    const data = await response.json();
    return data.values?.[0] ?? null;
  } catch (error) {
    console.error('Error getting entries sheet headers:', error);
    return null;
  }
}

/**
 * Creates an entries sheet for a specific month with headers.
 */
export async function createEntriesSheet(
  spreadsheetId: string,
  accessToken: string,
  headers: string[],
  sheetName?: string
): Promise<boolean> {
  const targetSheet = sheetName ?? getEntriesSheetName();
  
  try {
    // First, create the sheet
    const createResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: targetSheet,
                  hidden: false,
                },
              },
            },
          ],
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      if (!error.error?.message?.includes('already exists')) {
        console.error('Error creating entries sheet:', error);
        return false;
      }
    }

    // Then, add headers
    const headersResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${targetSheet}'!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers],
        }),
      }
    );

    if (!headersResponse.ok) {
      console.error('Error setting headers:', await headersResponse.json());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating entries sheet:', error);
    return false;
  }
}

/**
 * Reconciles existing sheet headers with canonical headers from current settings.
 */
export function reconcileHeaders(
  existingHeaders: string[],
  canonicalColumns: SheetColumn[]
): {
  finalHeaders: string[];
  columnsToInsert: Array<{ header: string; position: number }>;
  hasChanges: boolean;
} {
  const existingSet = new Set(existingHeaders);
  const finalHeaders = [...existingHeaders];
  const columnsToInsert: Array<{ header: string; position: number }> = [];

  const sectionOrder: SheetColumn['section'][] = [
    'metadata',
    'stool',
    'period',
    'products',
    'oneOffSymptoms',  // One-off symptoms come after products, before general symptoms
    'symptoms',
    'periodSymptoms',
    'medicines',
    'closing',
  ];

  const findSectionEndIndex = (section: SheetColumn['section']): number => {
    let lastIndex = -1;
    
    for (let i = 0; i < finalHeaders.length; i++) {
      const header = finalHeaders[i];
      const column = canonicalColumns.find(c => c.header === header);
      const inferredSection = inferSectionFromHeader(header);
      
      if (column?.section === section || inferredSection === section) {
        lastIndex = i;
      }
    }
    
    return lastIndex;
  };

  const findSectionInsertPoint = (section: SheetColumn['section']): number => {
    const sectionIdx = sectionOrder.indexOf(section);
    
    if (section === 'closing') {
      const notesIdx = finalHeaders.indexOf('Notes');
      if (notesIdx !== -1) return notesIdx;
      return finalHeaders.length;
    }
    
    for (let i = sectionIdx - 1; i >= 0; i--) {
      const prevSectionEnd = findSectionEndIndex(sectionOrder[i]);
      if (prevSectionEnd !== -1) {
        return prevSectionEnd + 1;
      }
    }
    
    return 4;
  };

  for (const column of canonicalColumns) {
    if (!existingSet.has(column.header)) {
      let insertPosition: number;
      
      if (column.section === 'closing') {
        insertPosition = finalHeaders.length;
      } else if (column.section === 'metadata') {
        const metadataHeaders = ['Date', 'Start Time', 'End Time', 'Pain Scale'];
        insertPosition = metadataHeaders.indexOf(column.header);
        if (insertPosition === -1) insertPosition = 4;
      } else {
        const sectionEnd = findSectionEndIndex(column.section);
        
        if (sectionEnd !== -1) {
          insertPosition = sectionEnd + 1;
        } else {
          insertPosition = findSectionInsertPoint(column.section);
        }
        
        const notesIdx = finalHeaders.indexOf('Notes');
        if (notesIdx !== -1 && insertPosition > notesIdx) {
          insertPosition = notesIdx;
        }
      }
      
      columnsToInsert.push({ header: column.header, position: insertPosition });
      finalHeaders.splice(insertPosition, 0, column.header);
      existingSet.add(column.header);
    }
  }

  return { 
    finalHeaders, 
    columnsToInsert,
    hasChanges: columnsToInsert.length > 0
  };
}

/**
 * Infers the section of a header based on its prefix.
 */
function inferSectionFromHeader(header: string): SheetColumn['section'] | null {
  if (header === 'Date' || header === 'Start Time' || header === 'End Time' || header === 'Pain Scale') {
    return 'metadata';
  }
  if (header === 'Notes') {
    return 'closing';
  }
  if (header.startsWith('Stool:')) {
    return 'stool';
  }
  if (header === 'Cycle Phase' || header.startsWith('Period:')) {
    return 'period';
  }
  if (header.startsWith('Product:')) {
    return 'products';
  }
  if (header.startsWith('oneOff.') || header.startsWith('One-Off')) {
    return 'oneOffSymptoms';
  }
  if (header.startsWith('Gen. Sym:')) {
    return 'symptoms';
  }
  if (header.startsWith('Per. Sym:')) {
    return 'periodSymptoms';
  }
  if (header.startsWith('Med:')) {
    return 'medicines';
  }
  return null;
}

/**
 * Inserts new columns into the sheet at specific positions.
 */
export async function insertSheetColumns(
  spreadsheetId: string,
  accessToken: string,
  sheetId: number,
  columnsToInsert: Array<{ header: string; position: number }>,
  sheetName?: string
): Promise<boolean> {
  if (columnsToInsert.length === 0) return true;
  
  const targetSheet = sheetName ?? getEntriesSheetName();

  try {
    const sortedColumns = [...columnsToInsert].sort((a, b) => b.position - a.position);

    const requests = sortedColumns.map(col => ({
      insertDimension: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: col.position,
          endIndex: col.position + 1,
        },
        inheritFromBefore: col.position > 0,
      },
    }));

    const insertResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!insertResponse.ok) {
      console.error('Error inserting columns:', await insertResponse.json());
      return false;
    }

    for (const col of columnsToInsert) {
      const columnLetter = getColumnLetter(col.position);
      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${targetSheet}'!${columnLetter}1?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[col.header]],
          }),
        }
      );

      if (!updateResponse.ok) {
        console.error('Error updating header:', await updateResponse.json());
      }
    }

    return true;
  } catch (error) {
    console.error('Error inserting columns:', error);
    return false;
  }
}

/**
 * Converts a 0-based column index to a column letter (A, B, ..., Z, AA, AB, ...)
 */
function getColumnLetter(index: number): string {
  let letter = '';
  let temp = index;
  
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  
  return letter;
}

/**
 * Gets the sheet ID for a specific entries sheet.
 */
export async function getEntriesSheetId(
  spreadsheetId: string,
  accessToken: string,
  sheetName?: string
): Promise<number | null> {
  const targetSheet = sheetName ?? getEntriesSheetName();
  
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const entriesSheet = data.sheets?.find(
      (sheet: { properties: { title: string } }) => 
        sheet.properties.title === targetSheet
    );

    return entriesSheet?.properties?.sheetId ?? null;
  } catch (error) {
    console.error('Error getting sheet ID:', error);
    return null;
  }
}

/**
 * Appends an entry row to the entries sheet for the current month.
 * This is the main function called when submitting an entry.
 */
export async function appendEntryToSheet(
  entry: StoredEntry,
  settings: UserSettings,
  spreadsheetId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  // Determine which month's sheet to use based on entry date
  // Pass the YYYY-MM-DD string directly to avoid timezone-offset bugs
  const sheetName = getEntriesSheetName(entry.date);
  
  try {
    // Step 1: Build canonical columns based on current settings
    const canonicalColumns = buildCanonicalColumns(settings);
    const canonicalHeaders = canonicalColumns.map(c => c.header);

    // Step 2: Get existing headers (or null if sheet doesn't exist)
    let existingHeaders = await getEntriesSheetHeaders(spreadsheetId, accessToken, sheetName);

    // Step 3: Create sheet if it doesn't exist
    if (existingHeaders === null) {
      const created = await createEntriesSheet(spreadsheetId, accessToken, canonicalHeaders, sheetName);
      if (!created) {
        return { success: false, error: 'Failed to create entries sheet' };
      }
      existingHeaders = canonicalHeaders;
    }

    // Step 4: Reconcile headers - check if new columns need to be added
    const { finalHeaders, columnsToInsert } = reconcileHeaders(existingHeaders, canonicalColumns);

    // Step 5: Insert any new columns
    if (columnsToInsert.length > 0) {
      const sheetId = await getEntriesSheetId(spreadsheetId, accessToken, sheetName);
      if (sheetId !== null) {
        await insertSheetColumns(spreadsheetId, accessToken, sheetId, columnsToInsert, sheetName);
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A1?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [finalHeaders],
            }),
          }
        );
      }
    }

    // Step 6: Build the row data matching the header order
    const rowData: (string | number)[] = finalHeaders.map(header => {
      const column = canonicalColumns.find(c => c.header === header);
      if (column) {
        return column.getValue(entry);
      }
      return '';
    });

    // Step 7: Append the row
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!appendResponse.ok) {
      const error = await appendResponse.json();
      console.error('Error appending entry:', error);
      return { success: false, error: error.error?.message || 'Failed to append entry' };
    }

    // Step 8: Hide old monthly tabs (if conditions are met)
    await hideOldMonthlyTabs(spreadsheetId, accessToken);

    return { success: true };
  } catch (error) {
    console.error('Error in appendEntryToSheet:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Helper to extract spreadsheet ID from URL
 */
export function getSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// ============================================
// BATCH SYNC OPERATIONS
// ============================================

/**
 * Gets all entry IDs already present in the sheet for a specific month.
 * Used to detect duplicates before syncing.
 * 
 * Note: We store entry IDs in a hidden column or check by date+time combo.
 * For simplicity, we'll check by Date + Start Time + End Time as a unique key.
 */
export async function getExistingEntryKeys(
  spreadsheetId: string,
  accessToken: string,
  sheetName: string
): Promise<Set<string>> {
  const existingKeys = new Set<string>();
  
  try {
    // Get all data from the sheet (Date, Start Time, End Time columns)
    const range = `'${sheetName}'!A:C`;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // Sheet might not exist yet, that's fine
      return existingKeys;
    }

    const data = await response.json();
    const rows = data.values ?? [];
    
    // Skip header row, create keys from Date+StartTime+EndTime
    for (let i = 1; i < rows.length; i++) {
      const [date, startTime, endTime] = rows[i];
      if (date && startTime && endTime) {
        const key = `${date}|${startTime}|${endTime}`;
        existingKeys.add(key);
      }
    }
    
    return existingKeys;
  } catch (error) {
    console.error('Error getting existing entry keys:', error);
    return existingKeys;
  }
}

/**
 * Creates a unique key for an entry to check for duplicates.
 */
export function createEntryKey(entry: StoredEntry): string {
  return `${entry.date}|${entry.startTime}|${entry.endTime}`;
}

/**
 * Groups entries by their target monthly sheet.
 */
export function groupEntriesByMonth(entries: StoredEntry[]): Map<string, StoredEntry[]> {
  const grouped = new Map<string, StoredEntry[]>();
  
  for (const entry of entries) {
    // Extract year-month directly from the YYYY-MM-DD string to avoid
    // timezone-offset bugs with `new Date(dateOnlyString)`
    const [year, month] = entry.date.split('-');
    const sheetName = `${ENTRIES_SHEET_PREFIX}-${year}-${month}`;
    
    if (!grouped.has(sheetName)) {
      grouped.set(sheetName, []);
    }
    grouped.get(sheetName)!.push(entry);
  }
  
  return grouped;
}

/**
 * Appends multiple entries to a sheet in a single batch operation.
 * More efficient than appending one at a time.
 */
export async function appendEntriesToSheet(
  entries: StoredEntry[],
  settings: UserSettings,
  spreadsheetId: string,
  accessToken: string,
  sheetName: string,
  existingKeys: Set<string>
): Promise<{ 
  success: boolean; 
  syncedIds: string[]; 
  skippedIds: string[]; 
  failedIds: string[];
  error?: string;
}> {
  const syncedIds: string[] = [];
  const skippedIds: string[] = [];
  const failedIds: string[] = [];
  
  // Filter out duplicates
  const entriesToSync = entries.filter(entry => {
    const key = createEntryKey(entry);
    if (existingKeys.has(key)) {
      skippedIds.push(entry.id);
      return false;
    }
    return true;
  });
  
  if (entriesToSync.length === 0) {
    return { success: true, syncedIds, skippedIds, failedIds };
  }
  
  try {
    // Build canonical columns based on current settings
    const canonicalColumns = buildCanonicalColumns(settings);
    const canonicalHeaders = canonicalColumns.map(c => c.header);

    // Get existing headers (or null if sheet doesn't exist)
    let existingHeaders = await getEntriesSheetHeaders(spreadsheetId, accessToken, sheetName);

    // Create sheet if it doesn't exist
    if (existingHeaders === null) {
      const created = await createEntriesSheet(spreadsheetId, accessToken, canonicalHeaders, sheetName);
      if (!created) {
        // Mark all as failed
        entries.forEach(e => failedIds.push(e.id));
        return { success: false, syncedIds, skippedIds, failedIds, error: 'Failed to create sheet' };
      }
      existingHeaders = canonicalHeaders;
    }

    // Reconcile headers
    const { finalHeaders, columnsToInsert } = reconcileHeaders(existingHeaders, canonicalColumns);

    // Insert any new columns
    if (columnsToInsert.length > 0) {
      const sheetId = await getEntriesSheetId(spreadsheetId, accessToken, sheetName);
      if (sheetId !== null) {
        await insertSheetColumns(spreadsheetId, accessToken, sheetId, columnsToInsert, sheetName);
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A1?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [finalHeaders],
            }),
          }
        );
      }
    }

    // Build all row data
    const rows: (string | number)[][] = entriesToSync.map(entry => {
      return finalHeaders.map(header => {
        const column = canonicalColumns.find(c => c.header === header);
        if (column) {
          return column.getValue(entry);
        }
        return '';
      });
    });

    // Batch append all rows at once
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );

    if (!appendResponse.ok) {
      const error = await appendResponse.json();
      console.error('Error batch appending entries:', error);
      entries.forEach(e => failedIds.push(e.id));
      return { 
        success: false, 
        syncedIds, 
        skippedIds, 
        failedIds, 
        error: error.error?.message || 'Failed to append entries' 
      };
    }

    // All succeeded
    entriesToSync.forEach(e => syncedIds.push(e.id));

    return { success: true, syncedIds, skippedIds, failedIds };
  } catch (error) {
    console.error('Error in appendEntriesToSheet:', error);
    entries.forEach(e => failedIds.push(e.id));
    return { 
      success: false, 
      syncedIds, 
      skippedIds, 
      failedIds, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ============================================
// IMPORT FROM SHEET OPERATIONS
// ============================================

/**
 * Fetches all data from a specific monthly sheet tab.
 * Returns headers and row data.
 */
export async function fetchSheetData(
  spreadsheetId: string,
  accessToken: string,
  sheetName: string
): Promise<{ headers: string[]; rows: string[][] } | null> {
  try {
    const range = `'${sheetName}'!A:ZZ`; // Wide range to capture all columns
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // Sheet might not exist or be empty - that's okay
      if (response.status === 400 || error.error?.status === 'NOT_FOUND') {
        return { headers: [], rows: [] };
      }
      console.error('Failed to fetch sheet data:', error);
      return null;
    }

    const data = await response.json();
    const values = data.values ?? [];
    
    if (values.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = values[0] as string[];
    const rows = values.slice(1) as string[][];
    
    return { headers, rows };
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return null;
  }
}

/**
 * Parses an intensity value from sheet cell.
 * Returns number, null (for logged without intensity), or undefined (not logged).
 */
function parseIntensityValue(value: string): number | null | undefined {
  if (!value || value.trim() === '') return undefined;
  
  const trimmed = value.trim();
  
  // Check for "Yes" or checkmark (logged without intensity tracking)
  if (trimmed.toLowerCase() === 'yes' || trimmed === '✓') {
    return null;
  }
  
  // Try to parse as number
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    return num;
  }
  
  return undefined;
}

/**
 * Parses a medicine column value back into a MedicineLogEntry.
 * Format in sheet: "{dosage} @ {time}" or "Taken" or just dosage
 */
function parseMedicineColumnValue(
  value: string,
  medicineName: string
): MedicineLogEntry | null {
  if (!value || value.trim() === '') return null;
  
  const trimmed = value.trim();
  
  // Simple "Taken" case
  if (trimmed.toLowerCase() === 'taken') {
    return {
      medicineId: `imported_${medicineName}`.replace(/\s+/g, '_'),
      medicineName,
      dosage: '',
    };
  }
  
  // Parse "{dosage} @ {time}" format
  const atIndex = trimmed.lastIndexOf(' @ ');
  if (atIndex > 0) {
    const dosage = trimmed.substring(0, atIndex).trim();
    const timeStr = trimmed.substring(atIndex + 3).trim();
    
    // Parse time like "10:30 AM"
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (timeMatch) {
      return {
        medicineId: `imported_${medicineName}`.replace(/\s+/g, '_'),
        medicineName,
        dosage,
        time: {
          hour: parseInt(timeMatch[1], 10),
          minute: parseInt(timeMatch[2], 10),
          period: timeMatch[3].toUpperCase() as 'AM' | 'PM',
        },
      };
    }
    
    // Time parsing failed, just use dosage
    return {
      medicineId: `imported_${medicineName}`.replace(/\s+/g, '_'),
      medicineName,
      dosage,
    };
  }
  
  // Just a value, treat as dosage
  return {
    medicineId: `imported_${medicineName}`.replace(/\s+/g, '_'),
    medicineName,
    dosage: trimmed,
  };
}

/**
 * Parses a product column header and value back into ProductUsageEntry.
 * Header format: "Product: {Label}" or "Product: {customName} ({type})"
 * Value: size or "Used"
 */
function parseProductColumnValue(
  header: string,
  value: string
): ProductUsageEntry | null {
  if (!value || value.trim() === '') return null;
  
  // Remove "Product: " prefix
  const productPart = header.replace('Product: ', '');
  
  // Check if it's a custom product format: "CustomName (type)"
  const customMatch = productPart.match(/^(.+)\s+$(\w+(?:-\w+)*)$$/);
  
  let productType: string;
  let customProductId: string | undefined;
  
  if (customMatch) {
    // Custom product - e.g., "My Cup (cup)"
    const customName = customMatch[1];
    productType = customMatch[2];
    customProductId = `imported_${customName}`.replace(/\s+/g, '_');
  } else {
    // Standard product - map label back to type
    const labelToType: Record<string, string> = {
      'Pad': 'pad',
      'Tampon': 'tampon',
      'Cup': 'cup',
      'Disc': 'disc',
      'Liner': 'liner',
      'Period Underwear': 'period-underwear',
      'Other': 'other',
    };
    productType = labelToType[productPart] || productPart.toLowerCase().replace(/\s+/g, '-');
  }
  
  const trimmedValue = value.trim();
  const size = trimmedValue.toLowerCase() === 'used' ? undefined : trimmedValue;
  
  return {
    productType,
    customProductId,
    size,
  };
}

/**
 * Parses a sheet row back into a StoredEntry object.
 */
export function parseSheetRowToEntry(
  headers: string[],
  row: string[]
): StoredEntry | null {
  // Create a map of header -> value for easy lookup
  const data: Record<string, string> = {};
  headers.forEach((header, index) => {
    data[header] = row[index] ?? '';
  });

  // Required fields
  const date = data['Date'];
  const startTime = data['Start Time'];
  const endTime = data['End Time'];
  
  if (!date || !startTime) {
    return null; // Invalid row - skip
  }

  // Generate a deterministic ID based on date+time to avoid duplicates
  const idBase = `${date}_${startTime}_${endTime || 'noend'}`;
  const entryId = `imported_${idBase}`.replace(/[^a-zA-Z0-9_]/g, '_');

  // Parse symptom intensities from "Gen. Sym: {name}" columns
  const symptomIntensities: Record<string, number | null> = {};
  const periodSymptomIntensities: Record<string, number | null> = {};
  
  headers.forEach(header => {
    const value = data[header];
    
    if (header.startsWith('Gen. Sym: ')) {
      const symptomName = header.replace('Gen. Sym: ', '');
      const intensity = parseIntensityValue(value);
      if (intensity !== undefined) {
        symptomIntensities[symptomName] = intensity;
      }
    } else if (header.startsWith('Per. Sym: ')) {
      const symptomName = header.replace('Per. Sym: ', '');
      const intensity = parseIntensityValue(value);
      if (intensity !== undefined) {
        periodSymptomIntensities[symptomName] = intensity;
      }
    }
  });

  // Parse medicine log from "Med: {name}" columns
  const medicineLog: MedicineLogEntry[] = [];
  headers.forEach(header => {
    const value = data[header];
    if (!header.startsWith('Med: ')) return;
    
    const medicineName = header.replace('Med: ', '');
    const parsed = parseMedicineColumnValue(value, medicineName);
    if (parsed) {
      medicineLog.push(parsed);
    }
  });

  // Parse product usage from "Product: {name}" columns
  const productUsage: ProductUsageEntry[] = [];
  headers.forEach(header => {
    const value = data[header];
    if (!header.startsWith('Product: ')) return;
    
    const parsed = parseProductColumnValue(header, value);
    if (parsed) {
      productUsage.push(parsed);
    }
  });

  // Parse stool data
  const stoolTypeStr = data['Stool: Type'];
  const stoolType = stoolTypeStr ? parseInt(stoolTypeStr, 10) as StoredEntry['stoolType'] : null;
  const stoolFeeling = (data['Stool: Feeling'] || null) as StoredEntry['stoolFeeling'];

  // Parse period data
  const cyclePhase = (data['Cycle Phase'] || null) as StoredEntry['cyclePhase'];
  let periodFlow = data['Period: Flow'] || null;
  // Backward compat: if old "Period: Flow Start Time" column exists, merge into periodFlow
  const legacyFlowStartTime = data['Period: Flow Start Time'] || undefined;
  if (legacyFlowStartTime && periodFlow && !periodFlow.includes('@')) {
    periodFlow = `${periodFlow} @ ${legacyFlowStartTime}`;
  }

  // Parse pain scale
  const painScale = (data['Pain Scale'] || 'simple') as StoredEntry['painScale'];

  // Parse one-off symptoms (comma-separated string → array)
  const oneOffSymptomStr = data['oneOff. Sym'] || '';
  const oneOffSymptoms = oneOffSymptomStr
    ? oneOffSymptomStr.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];

  // Build the entry
  const entry: StoredEntry = {
    id: entryId,
    createdAt: new Date().toISOString(), // Original creation time not available
    updatedAt: new Date().toISOString(),
    date,
    startTime,
    endTime: endTime || startTime, // Default to start time if missing
    painScale,
    symptomIntensities,
    periodSymptomIntensities,
    cyclePhase,
    periodFlow,
    productUsage,
    stoolType,
    stoolFeeling,
    medicineLog,
    notes: data['Notes'] || '',
    oneOffSymptoms,
    syncStatus: 'synced', // Imported from sheet = already synced
  };

  return entry;
}

/**
 * Fetches and parses all entries from all monthly tabs in the spreadsheet.
 */
export async function fetchAllEntriesFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<{ entries: StoredEntry[]; error?: string }> {
  try {
    // Get all entry sheet tabs
    const sheets = await getAllEntriesSheets(spreadsheetId, accessToken);
    
    if (sheets.length === 0) {
      return { entries: [] };
    }

    const allEntries: StoredEntry[] = [];
    
    for (const sheet of sheets) {
      const data = await fetchSheetData(spreadsheetId, accessToken, sheet.name);
      
      if (!data) {
        console.warn(`Failed to fetch data from sheet: ${sheet.name}`);
        continue;
      }
      
      if (data.rows.length === 0) {
        continue;
      }
      
      for (const row of data.rows) {
        // Skip empty rows
        if (row.every(cell => !cell || cell.trim() === '')) {
          continue;
        }
        
        const entry = parseSheetRowToEntry(data.headers, row);
        if (entry) {
          allEntries.push(entry);
        }
      }
    }

    // Sort by date descending (most recent first)
    allEntries.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // If same date, sort by start time
      return b.startTime.localeCompare(a.startTime);
    });

    return { entries: allEntries };
  } catch (error) {
    console.error('Error fetching entries from sheet:', error);
    return { 
      entries: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ============================================
// SAVED FILTERS SHEET OPERATIONS
// ============================================

/**
 * Reads saved filters JSON from the hidden tab in the user's Google Sheet.
 */
export async function getSavedFiltersFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<string | null> {
  try {
    console.log("getSavedFiltersFromSheet: Fetching from range:", SAVED_FILTERS_RANGE);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SAVED_FILTERS_RANGE)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // Sheet might not exist yet - that's okay (user may not have saved any filters)
      console.log("getSavedFiltersFromSheet: Sheet not found or empty (status:", response.status, ") - this is normal if no filters were saved");
      return null;
    }

    const data = await response.json();
    const filtersValue = data.values?.[0]?.[0] || null;
    console.log("getSavedFiltersFromSheet: Retrieved data, has value:", !!filtersValue, "length:", filtersValue?.length || 0);
    return filtersValue;
  } catch (error) {
    console.error("Error getting saved filters from sheet:", error);
    return null;
  }
}

/**
 * Writes saved filters JSON to the hidden tab in the user's Google Sheet.
 * Creates the hidden tab if it doesn't exist.
 */
export async function saveSavedFiltersToSheet(
  filtersJson: string,
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SAVED_FILTERS_RANGE)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[filtersJson]],
        }),
      }
    );

    // If sheet doesn't exist, create it and retry
    if (updateResponse.status === 400) {
      await _createHiddenSheet(spreadsheetId, accessToken, SAVED_FILTERS_SHEET_NAME);
      return await saveSavedFiltersToSheet(filtersJson, spreadsheetId, accessToken);
    }

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.json();
      console.error("Google Sheets API error (saved filters):", errorBody);
      throw new Error("Failed to update saved filters in sheet.");
    }

    return true;
  } catch (error) {
    console.error("Error saving filters to sheet:", error);
    return false;
  }
}

/**
 * Deletes the saved filters sheet from the user's Google Sheet.
 */
export async function deleteSavedFiltersSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to get spreadsheet info");
      return false;
    }

    const data = await response.json();
    const filtersSheet = data.sheets?.find(
      (sheet: { properties: { title: string } }) =>
        sheet.properties.title === SAVED_FILTERS_SHEET_NAME
    );

    if (!filtersSheet) {
      // Sheet doesn't exist, nothing to delete
      return true;
    }

    const sheetId = filtersSheet.properties.sheetId;

    const deleteResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              deleteSheet: {
                sheetId: sheetId,
              },
            },
          ],
        }),
      }
    );

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      console.error("Failed to delete saved filters sheet:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting saved filters sheet:", error);
    return false;
  }
}