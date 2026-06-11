"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Hit by the in-app WebView after the deep-link return from the external
 * browser sign-in flow.
 *
 * Current flow: the system browser completes the normal web sign-in at
 * /mobile-auth-start and deep-links back with a single-use sign-in `ticket`
 * (Clerk sign-in token minted by /api/mobile/handoff). We redeem it here via
 * signIn.create({ strategy: "ticket" }) so the session is created on the
 * WebView's OWN Clerk client — Clerk's oauth_callback no longer allows
 * completing an attempt created in a different browser.
 *
 * Legacy path (no ticket param): wait for a `__clerk_handshake` in the URL to
 * be consumed by the SDK/middleware. Kept as a fallback.
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
    const ticket = parsed.get("ticket");
    const params: string[] = [];
    parsed.forEach((v, k) => {
      params.push(`${k}=${v.length > 80 ? v.slice(0, 77) + "..." : v}`);
    });
    setUrlParams(params);
    console.log("[SSOCallback] mount, url=", window.location.href);

    let cancelled = false;
    let redeeming = false;
    const startTime = Date.now();

    const redeemTicket = async (token: string) => {
      try {
        setDebug("Redeeming sign-in ticket...");
        const signIn = clerk.client?.signIn;
        if (!signIn) throw new Error("Clerk client unavailable");
        const res = await signIn.create({ strategy: "ticket", ticket: token });
        if (res.status !== "complete" || !res.createdSessionId) {
          throw new Error(`unexpected sign-in status: ${res.status}`);
        }
        await clerk.setActive({ session: res.createdSessionId });
        if (cancelled) return;

        // Force a fresh session JWT so clerk-js definitely (re)writes the
        // __session cookie before we navigate.
        try {
          await clerk.session?.getToken({ skipCache: true });
        } catch {
          /* non-fatal — the poll below is the real gate */
        }

        // Don't navigate until the SERVER confirms it can see the session.
        // The Android WebView flushes document.cookie writes lazily, so an
        // immediate navigation can reach (app)/layout's auth() gate without
        // the cookie and bounce straight back to /sign-in.
        setDebug("Confirming session with server...");
        for (let i = 0; i < 20; i++) {
          if (cancelled) return;
          try {
            const who = await fetch("/api/mobile/whoami", { cache: "no-store" });
            const { userId } = (await who.json()) as { userId: string | null };
            if (userId) {
              setDebug("Session confirmed — redirecting to /dashboard...");
              window.location.replace("/dashboard");
              return;
            }
          } catch {
            /* transient network error — keep polling */
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        setDebug(
          "Signed in, but the server never saw the session cookie (8s). " +
            "This means cookies from the sign-in aren't reaching the server — report this message.",
        );
      } catch (e) {
        console.error("[SSOCallback] ticket redemption failed", e);
        if (!cancelled) {
          setDebug(
            `Ticket sign-in failed: ${e instanceof Error ? e.message : String(e)}. Go back and try again.`,
          );
        }
      }
    };

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

      if (ticket) {
        if (!redeeming) {
          redeeming = true;
          void redeemTicket(ticket);
        }
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
