"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";

const SIGN_IN_URL = `/sign-in?redirect_url=${encodeURIComponent("/mobile-auth-start")}`;

/**
 * Entry point for native-app sign-in, opened in the SYSTEM browser (Chrome
 * Custom Tab) by MobileGoogleSignIn. Clerk's oauth_callback now rejects
 * callbacks from a different browser than the one that created the sign-in
 * attempt (err_code=authorization_invalid), so the old bridge flow — attempt
 * created in the WebView, completed in Chrome — is dead. Instead, the ENTIRE
 * sign-in happens here in Chrome via the normal web flow (which works), and
 * the session is handed back to the app as a single-use sign-in ticket:
 *
 * 1. Not signed in (in Chrome)? Bounce to /sign-in and come back here.
 * 2. Signed in? POST /api/mobile/handoff to mint a short-lived sign-in token.
 * 3. Deep-link battleexam://oauth-callback?ticket=... — NativeMobileBridge
 *    forwards it to /sso-callback, which redeems the ticket on the WebView's
 *    own Clerk client.
 */
export default function MobileAuthStartPage() {
  const clerk = useClerk();
  const [status, setStatus] = useState("Checking your sign-in...");
  const [deepLink, setDeepLink] = useState("");
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!clerk?.loaded || startedRef.current) return;
    startedRef.current = true;

    if (!clerk.user) {
      setStatus("Redirecting to sign-in...");
      window.location.replace(SIGN_IN_URL);
      return;
    }

    (async () => {
      try {
        setStatus("Preparing to return to the app...");
        const res = await fetch("/api/mobile/handoff", { method: "POST" });
        if (!res.ok) throw new Error(`handoff failed (${res.status})`);
        const { token } = (await res.json()) as { token: string };
        const url = `battleexam://oauth-callback?ticket=${encodeURIComponent(token)}`;
        setDeepLink(url);
        setStatus("Returning to BattleExam...");
        window.location.href = url;
      } catch (e) {
        console.error("[MobileAuthStart]", e);
        setFailed(true);
        setStatus("Could not hand the session back to the app. Please try again.");
      }
    })();
  }, [clerk, clerk?.loaded]);

  async function switchAccount() {
    setStatus("Signing out of this browser...");
    try {
      await clerk.signOut();
    } finally {
      window.location.replace(SIGN_IN_URL);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center text-neutral-200">
      <p className="text-lg font-medium">{status}</p>
      {deepLink && !failed && (
        <>
          <p className="text-sm text-neutral-400">
            If the app doesn&apos;t open automatically, tap the button below.
          </p>
          <a
            href={deepLink}
            className="mt-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Open BattleExam
          </a>
          <button
            type="button"
            onClick={switchAccount}
            className="mt-4 text-sm text-neutral-400 underline hover:text-neutral-200"
          >
            Use a different account
          </button>
        </>
      )}
      {failed && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Try again
        </button>
      )}
    </div>
  );
}
