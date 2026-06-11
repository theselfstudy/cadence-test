"use client";

import { useEffect, useState } from "react";

// ============================================
// Advanced Options Modal
// Modal for dangerous/advanced actions with single or double confirmation
// ============================================

interface AdvancedOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Main title */
  title: string;
  /** Description text (can include JSX) */
  description: React.ReactNode;
  /** What will be affected (bullet points) */
  affectedItems?: string[];
  /** What will be preserved (bullet points) */
  preservedItems?: string[];
  /** Primary button text (defaults to "Continue") */
  confirmButtonText?: string;
  /** Cancel button text (defaults to "Cancel") */
  cancelButtonText?: string;
  /** Variant: 'warning' (amber) or 'danger' (red) */
  variant?: "warning" | "danger";
}

export function AdvancedOptionsModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  affectedItems,
  preservedItems,
  confirmButtonText = "Continue",
  cancelButtonText = "Cancel",
  variant = "warning",
}: AdvancedOptionsModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isMounted || !isOpen) return null;

  const isDanger = variant === "danger";
  const iconBgOuter = isDanger ? "bg-app-red/10" : "bg-amber-100";
  const iconBgInner = isDanger ? "bg-red-600" : "bg-amber-500";
  const confirmBtnBg = isDanger
    ? "bg-app-red hover:bg-red-700"
    : "bg-app-red hover:bg-red-600";

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
        aria-labelledby="advanced-options-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slideUp max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Warning/Danger Icon */}
          <div className="pt-8 pb-4 flex justify-center">
            <div className={`w-16 h-16 rounded-full ${iconBgOuter} flex items-center justify-center`}>
              <div className={`w-12 h-12 rounded-full ${iconBgInner} flex items-center justify-center`}>
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            <h2
              id="advanced-options-modal-title"
              className="text-xl font-semibold text-app-charcoal mb-3 text-center"
            >
              {title}
            </h2>
            <div className="text-app-gray text-sm">
              {description}
            </div>

            {/* Affected Items */}
            {affectedItems && affectedItems.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs font-medium text-red-700 mb-2">This will reset:</p>
                <ul className="space-y-1">
                  {affectedItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-red-600">
                      <span className="mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preserved Items */}
            {preservedItems && preservedItems.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-700 mb-2">This will NOT be affected:</p>
                <ul className="space-y-1">
                  {preservedItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-green-600">
                      <span className="mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-app-border
                         text-app-charcoal font-medium hover:bg-app-cream
                         transition-colors order-2 sm:order-1"
              >
                {cancelButtonText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 rounded-xl text-white
                         font-medium transition-colors
                         order-1 sm:order-2 ${confirmBtnBg}`}
              >
                {confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// Double Confirmation Modal
// For highly destructive actions requiring two confirmations
// ============================================

interface DoubleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** First modal config */
  firstModal: {
    title: string;
    description: React.ReactNode;
    affectedItems?: string[];
    preservedItems?: string[];
    confirmButtonText?: string;
  };
  /** Second modal config */
  secondModal: {
    title: string;
    description: React.ReactNode;
    confirmButtonText?: string;
  };
}

export function DoubleConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  firstModal,
  secondModal,
}: DoubleConfirmModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Reset step when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleSecondConfirm = () => {
    onConfirm();
    setStep(1);
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  if (step === 1) {
    return (
      <AdvancedOptionsModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleFirstConfirm}
        title={firstModal.title}
        description={firstModal.description}
        affectedItems={firstModal.affectedItems}
        preservedItems={firstModal.preservedItems}
        confirmButtonText={firstModal.confirmButtonText || "Continue"}
        cancelButtonText="Cancel"
        variant="danger"
      />
    );
  }

  return (
    <FinalConfirmModal
      isOpen={true}
      onClose={handleClose}
      onConfirm={handleSecondConfirm}
      title={secondModal.title}
      description={secondModal.description}
      confirmButtonText={secondModal.confirmButtonText || "Yes, Delete Everything"}
    />
  );
}

// ============================================
// Final Confirm Modal (Step 2 of double confirmation)
// More severe styling for final warning
// ============================================

interface FinalConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmButtonText?: string;
}

function FinalConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonText = "Yes, Delete Everything",
}: FinalConfirmModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isMounted || !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="final-confirm-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-sm w-full animate-slideUp border-2 border-red-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Danger Icon */}
          <div className="pt-6 pb-3 flex justify-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-4 text-center">
            <h2
              id="final-confirm-modal-title"
              className="text-lg font-bold text-red-700 mb-2"
            >
              {title}
            </h2>
            <div className="text-sm text-app-gray">
              {description}
            </div>
          </div>

          {/* Buttons */}
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="w-full px-4 py-3 rounded-xl bg-red-600 text-white
                         font-medium hover:bg-red-700 transition-colors"
              >
                {confirmButtonText}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-3 rounded-xl border-2 border-app-border
                         text-app-charcoal font-medium hover:bg-app-cream
                         transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}