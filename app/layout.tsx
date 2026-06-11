"use client";

import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/Layout/AppShell";
import { GlobalSyncIndicator } from "@/components/sync/GlobalSyncIndicator";
import { ResumeSyncModal } from "@/components/sync/ResumeSyncModal";
import { useSyncState } from "@/stores/useSyncState";
import { getOAuthToken, getMobileSyncPending, clearMobileSyncPending } from "@/lib/oauthHelpers";
import { startSync } from "@/lib/syncEngine";
import "./globals.css";

// ========================
// Font Configuration
// ========================
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});


// ========================
// Viewport Configuration
// ========================
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3F592E",
};

// ========================
// Root Layout Component
// ========================
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
  const [showResumeModal, setShowResumeModal] = useState(false);
  const { shouldResumeSync, pendingOAuthRedirect } = useSyncState();

  useEffect(() => {
    // Check if we just returned from OAuth redirect
    const token = getOAuthToken();
    const mobileSyncPending = getMobileSyncPending();

    // Check for mobile sync pending (more reliable than Zustand for mobile OAuth flow)
    if (token && mobileSyncPending && mobileSyncPending.mode === 'sync') {
      // Mobile sync flow - clear the pending state and start a fresh sync
      clearMobileSyncPending();
      startSync().catch(console.error);
      return;
    }

    // Fallback: Check Zustand store for pending OAuth redirect
    if (token && pendingOAuthRedirect) {
      // Automatically start sync after OAuth return
      startSync().catch(console.error);
      return;
    }

    // Check if there's a pending sync to resume
    if (shouldResumeSync()) {
      setShowResumeModal(true);
    }
  }, [shouldResumeSync, pendingOAuthRedirect]);

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <title>Cadence</title>
        <meta name="description" content="Privacy-first, judgment-free body tracking" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <GlobalSyncIndicator />
          <AppShell>{children}</AppShell>
          <ResumeSyncModal
            isOpen={showResumeModal}
            onClose={() => setShowResumeModal(false)}
          />
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}