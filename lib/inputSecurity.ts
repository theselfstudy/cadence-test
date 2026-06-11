/**
 * Input Security and Sanitization Library
 *
 * Provides comprehensive security measures for user input including:
 * - Character limits enforcement
 * - Google Sheets formula injection prevention
 * - XSS protection
 * - Content sanitization
 */

// =============================================================================
// CHARACTER LIMITS
// =============================================================================

export const CHARACTER_LIMITS = {
  SHORT_TEXT: 60,
  LONG_TEXT: 500,
  GOOGLE_SHEET_URL: 150,
  FILTER_NAME: 20, // Existing limit, kept for consistency
} as const;

// =============================================================================
// DANGEROUS PATTERNS
// =============================================================================

/**
 * Patterns that could indicate Google Sheets formula injection
 * These prefixes can execute formulas when imported into spreadsheets
 */
const FORMULA_INJECTION_PATTERNS = [
  /^=/,           // Excel/Google Sheets formula
  /^\+/,          // Alternative formula prefix
  /^-/,           // Alternative formula prefix
  /^@/,           // Alternative formula prefix
  /^\t=/,         // Tab + formula
  /^\r=/,         // Carriage return + formula
  /^\n=/,         // Newline + formula
];

/**
 * Dangerous formula functions that could be exploited
 */
const DANGEROUS_FORMULA_FUNCTIONS = [
  'IMPORTXML',
  'IMPORTHTML',
  'IMPORTFEED',
  'IMPORTDATA',
  'IMPORTRANGE',
  'HYPERLINK',
  'IMAGE',
  'WEBSERVICE',
];

/**
 * XSS and injection patterns
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<style[^>]*>.*?<\/style>/gi,
  /on\w+\s*=/gi,                    // Event handlers (onclick, onerror, etc.)
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if text exceeds character limit
 */
export function exceedsLimit(text: string, limit: number): boolean {
  return text.length > limit;
}

/**
 * Validate text length against a specific limit
 */
export function validateLength(
  text: string,
  limit: number,
  fieldName: string = 'Input'
): { isValid: boolean; error?: string } {
  // if (text.length === 0) {
  //   return { isValid: false, error: `${fieldName} cannot be empty` };
  // }

  if (text.length > limit) {
    return {
      isValid: false,
      error: `⚠️ ${fieldName} must be ${limit} characters or less (currently ${text.length})`,
    };
  }

  return { isValid: true };
}

/**
 * Check for Google Sheets formula injection attempts
 */
export function containsFormulaInjection(text: string): boolean {
  // Check for formula prefixes
  for (const pattern of FORMULA_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for dangerous formula functions
  const upperText = text.toUpperCase();
  for (const func of DANGEROUS_FORMULA_FUNCTIONS) {
    if (upperText.includes(func)) {
      return true;
    }
  }

  return false;
}

/**
 * Check for XSS patterns
 */
export function containsXSS(text: string): boolean {
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Comprehensive safety check for text input
 */
export function isTextSafe(text: string): {
  isSafe: boolean;
  reason?: string;
} {
  // Check for formula injection
  if (containsFormulaInjection(text)) {
    return {
      isSafe: false,
      reason: 'Input contains potential formula patterns. Please remove any =, +, -, or @ characters and formula functions.',
    };
  }

  // Check for XSS
  if (containsXSS(text)) {
    return {
      isSafe: false,
      reason: 'Input contains potentially dangerous content. Please remove any HTML tags or script-like content.',
    };
  }

  return { isSafe: true };
}

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHTML(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Sanitize text to prevent formula injection
 * Prefixes dangerous characters with a single quote to neutralize them
 */
export function sanitizeFormulaInjection(text: string): string {
  // If text starts with dangerous formula characters, prefix with single quote
  if (/^[=+\-@]/.test(text)) {
    return `'${text}`;
  }

  // Remove or escape dangerous formula functions
  let sanitized = text;
  for (const func of DANGEROUS_FORMULA_FUNCTIONS) {
    const regex = new RegExp(func, 'gi');
    sanitized = sanitized.replace(regex, `_${func}_`);
  }

  return sanitized;
}

/**
 * Comprehensive text sanitization
 * Applies all sanitization techniques
 */
export function sanitizeText(text: string): string {
  let sanitized = text.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Sanitize formula injection
  sanitized = sanitizeFormulaInjection(sanitized);

  // Escape HTML
  sanitized = escapeHTML(sanitized);

  return sanitized;
}

/**
 * Sanitize and truncate text to a specific limit
 */
export function sanitizeAndTruncate(text: string, limit: number): string {
  const sanitized = sanitizeText(text);
  return sanitized.slice(0, limit);
}

// =============================================================================
// VALIDATION WITH SANITIZATION
// =============================================================================

/**
 * Complete validation for short text fields (60 chars)
 */
export function validateShortText(
  text: string,
  fieldName: string = 'Input'
): {
  isValid: boolean;
  error?: string;
  sanitized?: string;
} {
  const trimmed = text.trim();

  // Check length
  const lengthCheck = validateLength(trimmed, CHARACTER_LIMITS.SHORT_TEXT, fieldName);
  if (!lengthCheck.isValid) {
    return lengthCheck;
  }

  // Check safety
  const safetyCheck = isTextSafe(trimmed);
  if (!safetyCheck.isSafe) {
    return { isValid: false, error: safetyCheck.reason };
  }

  // Sanitize and return
  return {
    isValid: true,
    sanitized: sanitizeText(trimmed),
  };
}

/**
 * Complete validation for long text fields (500 chars)
 */
export function validateLongText(
  text: string,
  fieldName: string = 'Input'
): {
  isValid: boolean;
  error?: string;
  sanitized?: string;
} {
  const trimmed = text.trim();

  // Check length
  const lengthCheck = validateLength(trimmed, CHARACTER_LIMITS.LONG_TEXT, fieldName);
  if (!lengthCheck.isValid) {
    return lengthCheck;
  }

  // Check safety
  const safetyCheck = isTextSafe(trimmed);
  if (!safetyCheck.isSafe) {
    return { isValid: false, error: safetyCheck.reason };
  }

  // Sanitize and return
  return {
    isValid: true,
    sanitized: sanitizeText(trimmed),
  };
}

/**
 * Complete validation for Google Sheet URLs (80 chars)
 */
export function validateGoogleSheetURL(
  url: string,
  fieldName: string = 'Google Sheet URL'
): {
  isValid: boolean;
  error?: string;
  sanitized?: string;
} {
  const trimmed = url.trim();

  // Check length
  const lengthCheck = validateLength(trimmed, CHARACTER_LIMITS.GOOGLE_SHEET_URL, fieldName);
  if (!lengthCheck.isValid) {
    return lengthCheck;
  }

  // Check URL format (must be Google Sheets URL)
  const GOOGLE_SHEET_URL_PATTERN = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/;
  if (!GOOGLE_SHEET_URL_PATTERN.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid Google Sheets URL',
    };
  }

  // URLs should not contain HTML or scripts
  if (containsXSS(trimmed)) {
    return {
      isValid: false,
      error: 'URL contains invalid characters',
    };
  }

  return {
    isValid: true,
    sanitized: trimmed, // URLs don't need HTML escaping
  };
}

// =============================================================================
// REACT HOOK HELPERS
// =============================================================================

/**
 * Get remaining characters for display
 */
export function getRemainingChars(text: string, limit: number): number {
  return Math.max(0, limit - text.length);
}

/**
 * Check if at warning threshold (90% of limit)
 */
export function isAtWarningThreshold(text: string, limit: number): boolean {
  return text.length >= limit * 0.9;
}

/**
 * Get character count display string
 */
export function getCharCountDisplay(text: string, limit: number): string {
  const remaining = getRemainingChars(text, limit);
  return `${text.length}/${limit}`;
}

/**
 * Get character count with status
 */
export function getCharCountStatus(text: string, limit: number): {
  count: string;
  isWarning: boolean;
  isError: boolean;
} {
  const length = text.length;
  return {
    count: `${length}/${limit}`,
    isWarning: length >= limit * 0.9 && length <= limit,
    isError: length > limit,
  };
}
