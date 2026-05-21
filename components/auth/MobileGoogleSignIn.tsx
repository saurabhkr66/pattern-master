"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Browser } from "@capacitor/browser";

// Clerk does not accept custom URL schemes (battleexam://) in its mobile SSO
// allowlist — only http/https. We point Clerk at the hosted bridge page below,
// which itself forwards the OAuth params on to battleexam://oauth-callback,
// where Android's intent filter routes them back into the native app.
function getRedirectUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/native-sso-callback`;
}

/**
 * Native-only "Continue with Google" button. Opens the OAuth flow in the
 * system browser (Chrome Custom Tabs) instead of the in-app WebView, so the
 * user's device Google accounts appear as one-tap options. After auth, Google
 * redirects back to Clerk's callback, Clerk redirects to battleexam://oauth-callback,
 * Android opens the app via the deep link intent filter, and NativeMobileBridge
 * routes to /sso-callback to complete the session.
 */
export default function MobileGoogleSignIn() {
  const clerk = useClerk();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setError(null);

    try {
      // Wait up to 8s for Clerk to finish bootstrapping. Reading `clerk.loaded`
      // imperatively avoids the React closure problem we'd hit with useSignIn().
      const deadline = Date.now() + 8000;
      while (!clerk?.loaded && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200));
      }
      const signIn = clerk?.client?.signIn;
      if (!clerk?.loaded || !signIn) {
        setError(
          "Sign-in service didn't finish loading. Check your connection and try again.",
        );
        return;
      }
      const redirectUrl = getRedirectUrl();
      await signIn.create({
        strategy: "oauth_google",
        redirectUrl,
        actionCompleteRedirectUrl: redirectUrl,
      });

      const verification = signIn.firstFactorVerification as
        | { externalVerificationRedirectURL?: URL | string | null }
        | undefined;
      const raw = verification?.externalVerificationRedirectURL;
      const oauthUrl = raw ? raw.toString() : null;

      if (!oauthUrl) {
        setError("Could not retrieve Google sign-in URL from Clerk.");
        return;
      }

      await Browser.open({ url: oauthUrl, presentationStyle: "fullscreen" });
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
