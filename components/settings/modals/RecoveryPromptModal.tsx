"use client";

interface RecoveryPromptModalProps {
  onRestore: () => void;
  onStartFresh: () => void;
  onCancel: () => void;
  /** Name of the Google Sheet being connected */
  sheetName?: string | null;
}

export function RecoveryPromptModal({ onRestore, onStartFresh, onCancel, sheetName }: RecoveryPromptModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-app-white p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔍</span>
          <h3 className="text-xl font-bold text-app-charcoal">Existing Settings Found</h3>
        </div>
        {sheetName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-app-cream rounded-lg">
            <svg className="w-4 h-4 text-app-teal flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
              <path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>
            </svg>
            <span className="text-sm font-medium text-app-charcoal truncate">{sheetName}</span>
          </div>
        )}
        <p className="text-sm text-app-gray">
          This Google Sheet already contains Cadence settings. Would you like to restore them,
          or start fresh with new settings?
        </p>
        <div className="p-3 bg-app-cream rounded-lg border border-app-border">
          <p className="text-xs text-app-gray">
            💡 <strong>Tip:</strong> Choose "Restore" if you've used Cadence with this sheet before
            and want to recover your preferences.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onRestore}
            className="w-full py-3 px-4 rounded-lg bg-app-green text-white font-semibold hover:bg-app-green-dark transition-colors"
          >
            Restore My Settings
          </button>
          <button
            onClick={onStartFresh}
            className="w-full py-3 px-4 rounded-lg bg-app-cream text-app-charcoal font-medium border border-app-border hover:bg-app-border transition-colors"
          >
            Start Fresh
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 text-sm text-app-gray hover:text-app-charcoal transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}