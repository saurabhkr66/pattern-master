"use client";

import { useState } from "react";
import { launchNativeSignIn } from "@/lib/nativeAuth";

/**
 * Native-only "Continue with Google" button.
 *
 * The old flow created the OAuth sign-in attempt on the WebView's Clerk
 * client and completed it in the system browser — Clerk's oauth_callback now
 * rejects that cross-client handoff (err_code=authorization_invalid). So the
 * WebView no longer touches Clerk at all here: we open /mobile-auth-start in
 * the system browser (Chrome Custom Tab), where the normal, working web
 * sign-in runs end-to-end in ONE cookie jar. That page then deep-links back
 * with a single-use sign-in ticket, which /sso-callback redeems on the
 * WebView's own Clerk client. See app/mobile-auth-start/page.tsx.
 */
export default function MobileGoogleSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setError(null);
    try {
      await launchNativeSignIn();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Google sign-in failed to start.";
      setError(msg);
      console.error("[MobileGoogleSignIn]", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="flex items-center justify-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {isLoading ? "Opening browser..." : "Continue with Google"}
      </button>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
