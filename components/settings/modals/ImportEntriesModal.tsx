"use client";

import { useState } from "react";
import type { ImportEntriesResult } from "@/types";

// =============================================================================
// TYPES
// =============================================================================

interface ImportEntriesModalProps {
  /** Called when user confirms import */
  onImport: () => Promise<ImportEntriesResult>;
  /** Called when user skips import */
  onSkip: () => void;
  /** Called when modal closes */
  onClose: () => void;
  /** Called when user wants history view */
  onHistoryView: () => void;
}

type ModalState = "prompt" | "importing" | "complete" | "error";

// =============================================================================
// COMPONENT
// =============================================================================

export function ImportEntriesModal({
  onImport,
  onSkip,
  onClose,
  onHistoryView,
}: ImportEntriesModalProps) {
  const [state, setState] = useState<ModalState>("prompt");
  const [result, setResult] = useState<ImportEntriesResult | null>(null);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleImport = async () => {
    setState("importing");
    
    try {
      const importResult = await onImport();
      setResult(importResult);
      setState(importResult.success ? "complete" : "error");
    } catch (error) {
      console.error("Import error:", error);
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setState("error");
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const renderPrompt = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-app-teal/10 flex items-center justify-center">
          <span className="text-2xl">📥</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-app-charcoal">
            Import Entries from Sheet?
          </h2>
          <p className="text-sm text-app-gray">
            Pull your existing health data
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <p className="text-app-gray">
          Your Google Sheet may contain entries or saved filters from a previous device or session. 
          Would you like to import them to this device?
        </p>
        
        <div className="p-3 bg-app-cream rounded-lg border border-app-border">
          <p className="text-sm text-app-charcoal">
            <strong>What happens during import:</strong>
          </p>
          <ul className="text-sm text-app-gray mt-2 space-y-1">
            <li>• All entries from your sheet will be imported</li>
            <li>• Duplicate entries will be automatically skipped</li>
            <li>• Your history and stats will update immediately</li>
            <li>• All saved filters saved to your sheet will be imported</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleImport}
          className="flex-1 py-3 px-4 rounded-lg bg-app-teal text-white font-semibold hover:opacity-90 transition-colors"
        >
          Import Entries & Filters
        </button>
        <button
          onClick={onSkip}
          className="py-3 px-4 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors"
        >
          Skip for Now
        </button>
      </div>
      
      <p className="text-xs text-app-gray text-center mt-3">
        You can import entries later from the History page.
      </p>
    </>
  );

  const renderImporting = () => (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-app-teal/10 flex items-center justify-center animate-pulse">
          <span className="text-2xl">⏳</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-app-charcoal">
            Importing Entries...
          </h2>
          <p className="text-sm text-app-gray">
            Please don&apos;t close this window
          </p>
        </div>
      </div>

      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-app-teal/30 border-t-app-teal rounded-full animate-spin" />
      </div>
      
      <p className="text-sm text-app-gray text-center">
        Fetching entries from all monthly tabs...
      </p>
    </>
  );

  const renderComplete = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-app-green/10 flex items-center justify-center">
          <span className="text-2xl">✅</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-app-charcoal">
            Import Complete!
          </h2>
          <p className="text-sm text-app-gray">
            Your entries are now available
          </p>
        </div>
      </div>

      {result && (
        <div className="p-4 bg-app-green/10 rounded-lg border border-app-green/20 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-app-green">{result.imported}</p>
              <p className="text-xs text-app-gray">Imported</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-app-gray">{result.skipped}</p>
              <p className="text-xs text-app-gray">Skipped</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-app-charcoal">{result.total}</p>
              <p className="text-xs text-app-gray">Total in Sheet</p>
            </div>
          </div>
          
          {result.skipped > 0 && (
            <p className="text-xs text-app-gray text-center mt-3">
              Skipped entries were already on this device.
            </p>
          )}
        </div>
      )}
          <div className="px-6 pb-6 flex gap-3">
            <button
              type="button"
              onClick={onHistoryView}
              className="flex-1 px-4 py-3 rounded-xl bg-[#3F592E] text-white 
                         font-medium hover:bg-[#3F592E]/90 transition-colors"
            >
              Go to History
            </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                }}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-app-border 
                       text-app-charcoal font-medium hover:bg-app-cream transition-colors"
              >
                Close
              </button>
      </div>
    </>
  );

  const renderError = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-app-red/10 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-app-charcoal">
            Import Failed
          </h2>
          <p className="text-sm text-app-gray">
            Something went wrong
          </p>
        </div>
      </div>

      {result?.error && (
        <div className="p-3 bg-app-red/10 rounded-lg border border-app-red/20 mb-6">
          <p className="text-sm text-app-red">{result.error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleImport}
          className="flex-1 py-3 px-4 rounded-lg bg-app-teal text-white font-semibold hover:opacity-90 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onClose}
          className="py-3 px-4 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors"
        >
          Close
        </button>
      </div>
    </>
  );

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        {state === "prompt" && renderPrompt()}
        {state === "importing" && renderImporting()}
        {state === "complete" && renderComplete()}
        {state === "error" && renderError()}
      </div>
    </div>
  );
}