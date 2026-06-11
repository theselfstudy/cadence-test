"use client";

interface SavePromptModalProps {
  onSave: () => void;
  onContinueWithoutSaving: () => void;
  onCancel: () => void;
  isGoogleSheetConnected?: boolean;
  destination: "tutorial" | "entry";
}

export function SavePromptModal({
  onSave,
  onContinueWithoutSaving,
  onCancel,
  isGoogleSheetConnected = false,
  destination
}: SavePromptModalProps) {
  const continueButtonText = destination === "tutorial"
    ? "Continue to Tutorial"
    : "Start Logging";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-app-white p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <h3 className="text-xl font-bold text-app-charcoal">Your Data is Saved!</h3>
        </div>

        <p className="text-sm text-app-gray">
          Your data is saved locally on this device.
        </p>

        {isGoogleSheetConnected && (
          <div className="p-3 bg-app-teal/10 rounded-lg border border-app-teal/20">
            <p className="text-xs text-app-teal">
              Sync with Google Sheets to back up and protect your data.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isGoogleSheetConnected ? (
            <>
              <button
                onClick={onSave}
                className="w-full py-3 px-4 rounded-lg bg-app-green text-white font-semibold hover:bg-app-green-dark transition-colors"
              >
                Sign in to Sync & {continueButtonText.replace("Continue to ", "").replace("Start ", "")}
              </button>
              <button
                onClick={onContinueWithoutSaving}
                className="w-full py-3 px-4 rounded-lg bg-app-cream text-app-charcoal font-medium border border-app-border hover:bg-app-border transition-colors"
              >
                {continueButtonText} Without Syncing
              </button>
            </>
          ) : (
            <button
              onClick={onContinueWithoutSaving}
              className="w-full py-3 px-4 rounded-lg bg-app-green text-white font-semibold hover:bg-app-green-dark transition-colors"
            >
              {continueButtonText}
            </button>
          )}
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 text-sm text-app-gray hover:text-app-charcoal transition-colors"
          >
            Go Back to Settings
          </button>
        </div>
      </div>
    </div>
  );
}