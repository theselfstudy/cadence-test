/**
 * Secure Input Components
 *
 * Reusable input components with built-in:
 * - Character limits
 * - Formula injection prevention
 * - XSS protection
 * - Visual feedback (character count, warnings, errors)
 */

'use client';

import { useState, useEffect, ChangeEvent, TextareaHTMLAttributes, InputHTMLAttributes } from 'react';
import {
  CHARACTER_LIMITS,
  validateShortText,
  validateLongText,
  getCharCountStatus,
  isTextSafe,
} from '@/lib/inputSecurity';

// =============================================================================
// TYPES
// =============================================================================

interface BaseSecureInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showCharCount?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  onValidationChange?: (isValid: boolean) => void;
}

interface SecureTextInputProps extends BaseSecureInputProps {
  maxLength?: number;
  type?: 'text' | 'email' | 'url';
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface SecureTextareaProps extends BaseSecureInputProps {
  rows?: number;
  className?: string;
}

// =============================================================================
// SECURE TEXT INPUT (SHORT TEXT)
// =============================================================================

export function SecureTextInput({
  value,
  onChange,
  label,
  placeholder,
  required = false,
  showCharCount = true,
  disabled = false,
  maxLength = CHARACTER_LIMITS.SHORT_TEXT,
  type = 'text',
  className = '',
  errorMessage,
  onValidationChange,
  onKeyDown,
}: SecureTextInputProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasBlurred, setHasBlurred] = useState(false);

  const charStatus = getCharCountStatus(value, maxLength);
  const displayError = errorMessage || localError;

  // Validate on change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Allow typing but validate
    onChange(newValue);

    // Only show errors after blur or if exceeding limit
    if (hasBlurred || newValue.length > maxLength) {
      const validation = validateShortText(newValue, label || 'Input');
      setLocalError(validation.isValid ? null : validation.error || null);
      onValidationChange?.(validation.isValid);
    }
  };

  // Validate on blur
  const handleBlur = () => {
    setHasBlurred(true);
    const validation = validateShortText(value, label || 'Input');
    setLocalError(validation.isValid ? null : validation.error || null);
    onValidationChange?.(validation.isValid);
  };

  // Real-time security check (formula injection, XSS)
  const securityCheck = isTextSafe(value);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-app-charcoal mb-1">
          {label}
          {required && <span className="text-app-red ml-1">*</span>}
        </label>
      )}

      <div>
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength + 50} // Allow typing over to show error
          className={`
            w-full px-4 py-2 rounded-lg border bg-app-white
            focus:outline-none focus:ring-2
            disabled:bg-app-gray/20 disabled:cursor-not-allowed
            ${displayError || !securityCheck.isSafe
              ? 'border-app-red focus:ring-app-red/50'
              : charStatus.isWarning
              ? 'border-amber-500 focus:ring-amber-500/50'
              : 'border-app-border focus:ring-app-teal'
            }
            ${className}
          `}
        />

        {showCharCount && (
          <div className="flex justify-end mt-1">
            <span
              className={`
                text-xs font-mono
                ${charStatus.isError ? 'text-app-red font-semibold' :
                  charStatus.isWarning ? 'text-amber-600' :
                  'text-app-gray'}
              `}
            >
              {charStatus.count}
            </span>
          </div>
        )}
      </div>

      {/* Security warning */}
      {!securityCheck.isSafe && (
        <p className="mt-1 text-xs text-app-red">
          ⚠️ {securityCheck.reason}
        </p>
      )}

      {/* Validation error */}
      {displayError && securityCheck.isSafe && (
        <p className="mt-1 text-xs text-app-red">{displayError}</p>
      )}

      {/* Character count warning (mobile-friendly) */}
      {showCharCount && charStatus.isWarning && !displayError && securityCheck.isSafe && (
        <p className="mt-1 text-xs text-amber-600">
          {maxLength - value.length} characters remaining
        </p>
      )}
    </div>
  );
}

// =============================================================================
// SECURE TEXTAREA (LONG TEXT)
// =============================================================================

export function SecureTextarea({
  value,
  onChange,
  label,
  placeholder,
  required = false,
  showCharCount = true,
  disabled = false,
  rows = 4,
  className = '',
  errorMessage,
  onValidationChange,
}: SecureTextareaProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasBlurred, setHasBlurred] = useState(false);

  const maxLength = CHARACTER_LIMITS.LONG_TEXT;
  const charStatus = getCharCountStatus(value, maxLength);
  const displayError = errorMessage || localError;

  // Validate on change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // Allow typing but validate
    onChange(newValue);

    // Only show errors after blur or if exceeding limit
    if (hasBlurred || newValue.length > maxLength) {
      const validation = validateLongText(newValue, label || 'Input');
      setLocalError(validation.isValid ? null : validation.error || null);
      onValidationChange?.(validation.isValid);
    }
  };

  // Validate on blur
  const handleBlur = () => {
    setHasBlurred(true);
    const validation = validateLongText(value, label || 'Input');
    setLocalError(validation.isValid ? null : validation.error || null);
    onValidationChange?.(validation.isValid);
  };

  // Real-time security check
  const securityCheck = isTextSafe(value);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-app-charcoal mb-1">
          {label}
          {required && <span className="text-app-red ml-1">*</span>}
        </label>
      )}

      <div>
        <textarea
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength + 50} // Allow typing over to show error
          className={`
            w-full px-4 py-2 rounded-lg border bg-app-white resize-y
            focus:outline-none focus:ring-2
            disabled:bg-app-gray/20 disabled:cursor-not-allowed
            ${displayError || !securityCheck.isSafe
              ? 'border-app-red focus:ring-app-red/50'
              : charStatus.isWarning
              ? 'border-amber-500 focus:ring-amber-500/50'
              : 'border-app-border focus:ring-app-green'
            }
            ${className}
          `}
        />

        {showCharCount && (
          <div className="flex justify-end mt-1">
            <span
              className={`
                text-xs font-mono
                ${charStatus.isError ? 'text-app-red font-semibold' :
                  charStatus.isWarning ? 'text-amber-600' :
                  'text-app-gray'}
              `}
            >
              {charStatus.count}
            </span>
          </div>
        )}
      </div>

      {/* Security warning */}
      {!securityCheck.isSafe && (
        <p className="mt-1 text-xs text-app-red">
          ⚠️ {securityCheck.reason}
        </p>
      )}

      {/* Validation error */}
      {displayError && securityCheck.isSafe && (
        <p className="mt-1 text-xs text-app-red">{displayError}</p>
      )}

      {/* Character count info */}
      {showCharCount && charStatus.isWarning && !displayError && securityCheck.isSafe && (
        <p className="mt-1 text-xs text-amber-600">
          {maxLength - value.length} characters remaining
        </p>
      )}
    </div>
  );
}

// =============================================================================
// SECURE GOOGLE SHEET URL INPUT
// =============================================================================

export function SecureSheetURLInput({
  value,
  onChange,
  label = 'Google Sheet URL',
  placeholder = 'https://docs.google.com/spreadsheets/d/...',
  required = false,
  disabled = false,
  className = '',
  errorMessage,
  onValidationChange,
}: SecureTextInputProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasBlurred, setHasBlurred] = useState(false);

  const maxLength = CHARACTER_LIMITS.GOOGLE_SHEET_URL;
  const charStatus = getCharCountStatus(value, maxLength);
  const displayError = errorMessage || localError;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (hasBlurred || newValue.length > maxLength) {
      const GOOGLE_SHEET_URL_PATTERN = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/;

      if (newValue.trim() && !GOOGLE_SHEET_URL_PATTERN.test(newValue.trim())) {
        setLocalError('Please enter a valid Google Sheets URL');
        onValidationChange?.(false);
      } else if (newValue.length > maxLength) {
        setLocalError(`⚠️ URL must be ${maxLength} characters or less`);
        onValidationChange?.(false);
      } else {
        setLocalError(null);
        onValidationChange?.(true);
      }
    }
  };

  const handleBlur = () => {
    setHasBlurred(true);
    const GOOGLE_SHEET_URL_PATTERN = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/;

    if (value.trim() && !GOOGLE_SHEET_URL_PATTERN.test(value.trim())) {
      setLocalError('Please enter a valid Google Sheets URL');
      onValidationChange?.(false);
    } else if (value.length > maxLength) {
      setLocalError(`⚠️ URL must be ${maxLength} characters or less`);
      onValidationChange?.(false);
    } else {
      setLocalError(null);
      onValidationChange?.(true);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-app-charcoal mb-1">
          {label}
          {required && <span className="text-app-red ml-1">*</span>}
        </label>
      )}

      <div>
        <input
          type="url"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength + 50}
          className={`
            w-full px-4 py-2 rounded-lg border bg-app-white
            focus:outline-none focus:ring-2
            disabled:bg-app-gray/20 disabled:cursor-not-allowed
            ${displayError
              ? 'border-app-red focus:ring-app-red/50'
              : charStatus.isWarning
              ? 'border-amber-500 focus:ring-amber-500/50'
              : 'border-app-border focus:ring-app-green'
            }
            ${className}
          `}
        />

        <div className="flex justify-between items-center mt-1">
          <div className="min-h-[20px]">
            {displayError && (
              <p className="text-xs text-app-red">{displayError}</p>
            )}
            {charStatus.isWarning && !displayError && (
              <p className="text-xs text-amber-600">
                {maxLength - value.length} characters remaining
              </p>
            )}
          </div>
          <span
            className={`
              text-xs font-mono
              ${charStatus.isError ? 'text-app-red font-semibold' :
                charStatus.isWarning ? 'text-amber-600' :
                'text-app-gray'}
            `}
          >
            {charStatus.count}
          </span>
        </div>
      </div>
    </div>
  );
}
