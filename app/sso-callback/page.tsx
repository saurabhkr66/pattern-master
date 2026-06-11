"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Hit by the in-app WebView after the deep-link return from the external
 * browser sign-in flow.
 *
 * Flow: the system browser completes the normal web sign-in at
 * /mobile-auth-start and deep-links back with a single-use sign-in `ticket`
 * (Clerk sign-in token minted by /api/mobile/handoff). We redeem it here via
 * signIn.create({ strategy: "ticket" }) so the session is created on the
 * WebView's OWN Clerk client — Clerk's oauth_callback does not allow
 * completing an attempt created in a different browser.
 *
 * Legacy path (no ticket param): wait for a `__clerk_handshake` in the URL to
 * be consumed by the SDK/middleware. Kept as a fallback.
 *
 * Hard-won invariants — do not "simplify":
 * - Never navigate with router.replace here; only window.location.replace,
 *   so the next HTTP request definitely carries the fresh session cookie.
 * - After redeeming, poll /api/mobile/whoami until the SERVER confirms the
 *   session. The Android WebView flushes cookie writes lazily; navigating
 *   immediately bounces off (app)/layout's auth() gate back to /sign-in.
 * - Don't reintroduce <AuthenticateWithRedirectCallback /> — it navigates
 *   before the handshake finishes (same race).
 */
export default function SSOCallbackPage() {
  const clerk = useClerk();
  const [status, setStatus] = useState("Completing sign-in...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ticket = new URLSearchParams(window.location.search).get("ticket");
    let cancelled = false;
    let redeeming = false;
    const startTime = Date.now();

    const redeemTicket = async (token: string) => {
      try {
        const signIn = clerk.client?.signIn;
        if (!signIn) throw new Error("Clerk client unavailable");
        const res = await signIn.create({ strategy: "ticket", ticket: token });
        if (res.status !== "complete" || !res.createdSessionId) {
          throw new Error(`unexpected sign-in status: ${res.status}`);
        }
        await clerk.setActive({ session: res.createdSessionId });
        if (cancelled) return;

        // Belt-and-braces: write the session cookie ourselves too, in case
        // clerk-js's own write lags behind the navigation below.
        try {
          const jwt = await clerk.session?.getToken({ skipCache: true });
          if (jwt) {
            document.cookie = `__session=${jwt}; path=/; secure; samesite=lax`;
          }
        } catch (e) {
          console.warn("[SSOCallback] session token refresh failed", e);
        }

        for (let i = 0; i < 20; i++) {
          if (cancelled) return;
          try {
            const who = await fetch("/api/mobile/whoami", { cache: "no-store" });
            const { userId } = (await who.json()) as { userId: string | null };
            if (userId) {
              window.location.replace("/dashboard");
              return;
            }
          } catch {
            /* transient network error — keep polling */
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        console.error("[SSOCallback] server never confirmed the session");
        setStatus("Sign-in could not be completed.");
        setFailed(true);
      } catch (e) {
        console.error("[SSOCallback] ticket redemption failed", e);
        if (!cancelled) {
          setStatus("Sign-in could not be completed. Please try again.");
          setFailed(true);
        }
      }
    };

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;

      if (!clerk?.loaded) {
        if (elapsed > 10000) {
          setStatus("Sign-in took too long. Check your connection and try again.");
          setFailed(true);
          return;
        }
        setTimeout(tick, 200);
        return;
      }

      if (clerk.session) {
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

      if (elapsed > 15000) {
        setStatus("Sign-in took too long. Please try again.");
        setFailed(true);
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
      <p className="text-lg font-medium">{status}</p>
      {!failed && (
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-blue-500"
          aria-hidden
        />
      )}
      {failed && (
        <button
          type="button"
          onClick={() => window.location.replace("/sign-in")}
          className="mt-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Back to sign-in
        </button>
      )}
    </div>
  );
}
