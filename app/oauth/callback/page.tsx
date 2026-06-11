"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSyncState } from '@/stores/useSyncState';
import { validateAndClearNonce } from '@/lib/oauthHelpers';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { oauthReturnUrl, setPendingOAuthRedirect } = useSyncState();

  useEffect(() => {
    // Parse access token and state from URL fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const stateParam = params.get('state');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(`OAuth failed: ${errorParam}`);
      return;
    }

    if (accessToken) {
      // Clear the URL hash immediately so the token isn't sitting in browser history
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      // Extract returnUrl and nonce from OAuth state parameter
      let returnUrlFromState: string | null = null;
      if (stateParam) {
        try {
          const stateData = JSON.parse(atob(stateParam));
          returnUrlFromState = stateData.returnUrl || null;

          // Validate CSRF nonce — reject the callback if it doesn't match
          // what we stored in sessionStorage before the redirect
          if (!validateAndClearNonce(stateData.nonce)) {
            setError('Authentication failed: session mismatch. Please try again.');
            return;
          }
        } catch (e) {
          console.warn('Failed to parse OAuth state parameter:', e);
          setError('Authentication failed: invalid response. Please try again.');
          return;
        }
      } else {
        // No state at all — reject, could be a forged callback
        setError('Authentication failed: missing session data. Please try again.');
        return;
      }

      // Validate returnUrl is same-origin before using it
      const safeReturnUrl =
        returnUrlFromState?.startsWith('/') && !returnUrlFromState.includes('://')
          ? returnUrlFromState
          : '/settings';

      // Store token in sessionStorage (not localStorage)
      sessionStorage.setItem('google_oauth_token', accessToken);
      sessionStorage.setItem('google_oauth_timestamp', Date.now().toString());

      // Clear OAuth redirect flag
      setPendingOAuthRedirect(false);

      router.replace(safeReturnUrl);
    } else {
      setError('OAuth failed. No access token received.');
    }
  }, [router, oauthReturnUrl, setPendingOAuthRedirect]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-cream">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">OAuth Error</h1>
          <p className="text-app-gray mb-6">{error}</p>
          <button
            onClick={() => router.push('/settings')}
            className="px-6 py-3 bg-app-green text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Return to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-app-cream">
      <div className="text-center">
        <svg
          className="animate-spin h-12 w-12 text-app-green mx-auto mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-app-gray text-lg">Completing authentication...</p>
      </div>
    </div>
  );
}
