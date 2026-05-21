"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Hit by the in-app WebView after the deep-link return from the external
 * browser OAuth flow. The URL carries a `__clerk_handshake` token (or similar
 * Clerk transfer token) which the Clerk frontend SDK automatically consumes
 * on mount and exchanges for a real session cookie.
 *
 * Previously we used <AuthenticateWithRedirectCallback /> here, but that
 * component eagerly navigated to /dashboard before the handshake API call
 * finished. The (app)/layout.tsx server-side `auth()` then saw no session
 * cookie and bounced the user to /sign-in. By the time the user came back
 * (minimize/reopen) the cookie was in place and everything worked — classic
 * race condition.
 *
 * Now we just wait for `clerk.session` to actually exist, then do a *hard*
 * window.location reload to /dashboard so the next HTTP request definitely
 * carries the new cookie.
 */
export default function SSOCallbackPage() {
  const clerk = useClerk();
  const [debug, setDebug] = useState("Initializing...");
  const [urlParams, setUrlParams] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const parsed = new URLSearchParams(window.location.search);
    const params: string[] = [];
    parsed.forEach((v, k) => {
      params.push(`${k}=${v.length > 80 ? v.slice(0, 77) + "..." : v}`);
    });
    setUrlParams(params);
    console.log("[SSOCallback] mount, url=", window.location.href);

    let cancelled = false;
    const startTime = Date.now();

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;

      if (!clerk?.loaded) {
        setDebug(`Waiting for Clerk SDK to bootstrap (${elapsed}ms)...`);
        if (elapsed > 10000) {
          setDebug("Timed out: Clerk SDK never finished loading.");
          return;
        }
        setTimeout(tick, 200);
        return;
      }

      if (clerk.session) {
        setDebug("Session live — redirecting to /dashboard...");
        console.log("[SSOCallback] session live, hard-reloading to /dashboard");
        // Hard reload (not router.replace) so the new HTTP request to
        // /dashboard definitely includes the Clerk session cookie that was
        // just set. router.replace can fire before the cookie is in the jar.
        window.location.replace("/dashboard");
        return;
      }

      setDebug(`Clerk loaded, waiting for handshake to set session (${elapsed}ms)...`);
      if (elapsed > 15000) {
        setDebug(
          "Timed out: handshake never produced a session. Check the params below.",
        );
        return;
      }
      setTimeout(tick, 200);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [clerk]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center text-neutral-200">
      <p className="text-lg font-medium">Completing sign-in...</p>
      <p className="max-w-md break-all text-sm text-neutral-400">{debug}</p>
      {urlParams.length > 0 && (
        <div className="mt-6 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-left text-xs">
          <p className="mb-1 font-semibold text-neutral-200">
            Query params ({urlParams.length}):
          </p>
          <ul className="space-y-1">
            {urlParams.map((p, i) => (
              <li key={i} className="break-all font-mono text-neutral-300">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
