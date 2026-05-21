"use client";

import { useEffect, useState } from "react";

/**
 * Hosted bridge page that Clerk redirects to after the external-browser OAuth
 * flow completes. Clerk requires an http(s) redirect URL — it does not accept
 * custom schemes — so we land here first, then forward the same query params
 * to `battleexam://oauth-callback?...` which Android's intent filter routes
 * back into the native app. NativeMobileBridge picks it up and finishes the
 * Clerk session at /sso-callback.
 */
export default function NativeSSOCallbackPage() {
  const [deepLink, setDeepLink] = useState<string>("");

  useEffect(() => {
    const params = window.location.search + window.location.hash;
    const url = `battleexam://oauth-callback${params}`;
    setDeepLink(url);
    window.location.href = url;
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center text-neutral-200">
      <p className="text-lg font-medium">Returning to BattleExam...</p>
      <p className="text-sm text-neutral-400">
        If the app doesn&apos;t open automatically, tap the button below.
      </p>
      {deepLink && (
        <a
          href={deepLink}
          className="mt-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Open BattleExam
        </a>
      )}
    </div>
  );
}
