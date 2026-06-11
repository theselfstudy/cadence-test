"use client";

import { useState, useEffect } from "react";
import { MAX_FILTER_NAME_LENGTH } from "@/stores/useSavedFilters";
import { SecureTextInput } from "@/components/ui/SecureInput";
import { containsFormulaInjection } from "@/lib/inputSecurity";

// ============================================
// TYPES
// ============================================

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentSlot: number; // 1, 2, or 3
  totalSlots: number;  // Always 3
}

// ============================================
// COMPONENT
// ============================================

export function SaveFilterModal({
  isOpen,
  onClose,
  onSave,
  currentSlot,
  totalSlots,
}: SaveFilterModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasFormulaInjection, setHasFormulaInjection] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError(null);
      setHasFormulaInjection(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a name for this filter");
      return;
    }

    if (trimmedName.length > MAX_FILTER_NAME_LENGTH) {
      setError(`⚠️ Name must be ${MAX_FILTER_NAME_LENGTH} characters or less`);
      return;
    }

    if (containsFormulaInjection(trimmedName)) {
      setError("Name contains invalid characters");
      return;
    }

    onSave(trimmedName);
    onClose();
  };

  const handleNameChange = (value: string) => {
    setName(value);

    // Clear error when user starts typing
    if (error) setError(null);

    // Check for formula injection
    setHasFormulaInjection(containsFormulaInjection(value));

    // Show warning if approaching limit
    if (value.length > MAX_FILTER_NAME_LENGTH) {
      setError(`⚠️ Name must be ${MAX_FILTER_NAME_LENGTH} characters or less`);
    }
  };

  if (!isOpen) return null;

  const isOverLimit = name.length > MAX_FILTER_NAME_LENGTH;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-filter-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-app-border">
            <div className="flex items-center justify-between">
              <h2
                id="save-filter-title"
                className="text-xl font-semibold text-DEFAULT"
              >
                Save Filter
              </h2>
              <span className="text-sm text-app-gray bg-app-cream px-2 py-1 rounded-full">
                {currentSlot}/{totalSlots}
              </span>
            </div>
            <p className="text-sm text-app-gray mt-1">
              Save your current filter configuration for quick access later.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4">
              <SecureTextInput
                value={name}
                onChange={handleNameChange}
                label="Filter Name"
                placeholder="e.g., Work Week Symptoms"
                maxLength={MAX_FILTER_NAME_LENGTH}
                showCharCount={true}
                errorMessage={error || undefined}
              />
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-app-border
                         text-DEFAULT font-medium hover:bg-app-cream transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isOverLimit || hasFormulaInjection}
                className="flex-1 px-4 py-3 rounded-xl bg-app-green text-white
                         font-medium hover:bg-app-plumb/90
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Filter
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
