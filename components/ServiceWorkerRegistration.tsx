"use client";

import { useEffect } from "react";

/**
 * The app no longer ships a service worker (`public/sw.js` does not exist).
 * However, deploys from earlier versions DID register one, and service
 * workers persist in users' browsers across deploys until explicitly
 * unregistered. Those stale workers cache old JS chunks and cause
 * "module factory is not available" errors after auth state changes
 * (sign-out, sign-in, navigation), because the SW serves an old chunk
 * reference for a chunk that no longer exists in the latest build.
 *
 * This component used to register `/sw.js` (which 404s). It now does the
 * opposite: actively unregisters any stale service worker and clears its
 * caches, so returning users self-heal on next page load.
 *
 * Once you're confident no users are running an old build (give it a
 * few weeks), this whole component can be deleted along with its mount
 * point in app/layout.tsx.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          regs.forEach((r) => r.unregister());
        })
        .catch(() => { /* ignore */ });
    }

    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => {
          keys.forEach((k) => caches.delete(k));
        })
        .catch(() => { /* ignore */ });
    }
  }, []);

  return null;
}
