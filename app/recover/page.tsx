"use client";

import Link from 'next/link';
import { useState } from 'react';
import { GOOGLE_SHEET_URL_PATTERN } from '@/lib/constants';
import { SecureSheetURLInput } from '@/components/ui/SecureInput';
import { SyncWithGoogleSheetsButton } from '@/components/sync';

export default function RecoverPage() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRestoreSuccess = () => {
    // Success callback - button will handle redirect
    console.log("Restore successful!");
  };

  const handleRestoreError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const isValidUrl = sheetUrl.trim() && GOOGLE_SHEET_URL_PATTERN.test(sheetUrl.trim());
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-app-cream">
      <div className="max-w-md w-full p-8 space-y-6 bg-app-white border border-app-border rounded-lg shadow-md">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-app-charcoal">Restore Your Setup</h1>
            <p className="text-app-gray mt-2">
            Paste your Google Sheet URL below, then connect to restore all your settings.
            </p>
        </div>

        {/* Warning */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Before you restore:</span> Make sure your Google Sheet is fully up to date with your current device&apos;s data. Sync from your existing device first to avoid missing any recent entries.{" "}
            <a
              href="https://the-self-study.com/cadence-privacy/faq.html#how-do-i-restore-my-stuff"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900"
            >
              Learn more
            </a>
          </p>
        </div>

        {/* Google Sheet URL Input */}
        <div className="text-left">
          <SecureSheetURLInput
            value={sheetUrl}
            onChange={(value) => {
              setSheetUrl(value);
              setError(null); // Clear error when user types
            }}
            label="Your Cadence Google Sheet URL"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            required={true}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {error}
            </p>
          </div>
        )}

        <div className="pt-2 text-center">
          <SyncWithGoogleSheetsButton
            mode="restore"
            variant="primary"
            sheetUrl={sheetUrl}
            disabled={!isValidUrl}
            disabledMessage={!sheetUrl.trim() ? "Please enter a Google Sheet URL" : "Please enter a valid Google Sheets URL"}
            onRestoreSuccess={handleRestoreSuccess}
            onRestoreError={handleRestoreError}
            className="w-full"
          />

          <Link href="/" className="inline-block mt-4 text-sm text-app-gray hover:underline">
            Or, start fresh
          </Link>
        </div>
      </div>
    </div>
  );
}