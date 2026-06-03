"use client";

import { useEffect } from "react";

/**
 * Registers the minimal PWA service worker (`public/sw.js`) so the app is
 * installable to the home screen and runs in standalone mode. The SW itself is
 * a no-op (no caching) — see public/sw.js for why — so installing it does not
 * change how the app behaves versus a normal browser tab.
 *
 * Skipped inside the native Capacitor WebView: the native shell manages its own
 * lifecycle and a SW there could serve stale assets into the app.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Don't register inside the native app (UA is tagged "BattleExamApp").
    if (navigator.userAgent.includes("BattleExamApp")) return;

    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        // Never let the browser HTTP-cache the SW script itself, so new
        // versions are picked up immediately on next visit.
        updateViaCache: "none",
      })
      .catch(() => {
        /* registration failures are non-fatal — app still works in the browser */
      });
  }, []);

  return null;
}
