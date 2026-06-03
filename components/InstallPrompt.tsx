"use client";

import { useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";

// We re-offer the banner once a day rather than hiding it forever: store the
// last-dismissed timestamp and suppress only while it's < 24h old. Once the app
// is actually installed we set a separate permanent flag and never ask again.
const DISMISS_KEY = "be_install_dismissed_at";
const INSTALLED_KEY = "be_install_done";
const DISMISS_TTL = 24 * 60 * 60 * 1000; // 24h

// Not in the standard TS DOM lib yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// The install state lives in the browser (a one-shot event + environment
// checks), not in React. We model it as a tiny external store and read it via
// useSyncExternalStore — that captures `beforeinstallprompt` the instant the
// browser fires it (independent of render timing) and avoids setState-in-effect.
let deferredEvt: BeforeInstallPromptEvent | null = null;
let dismissed = false;
let wired = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function wireOnce() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // suppress Chrome's mini-infobar; we drive the prompt
    deferredEvt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredEvt = null;
    dismissed = true;
    try {
      localStorage.setItem(INSTALLED_KEY, "1");
    } catch {
      /* ignore */
    }
    emit();
  });
}

function subscribe(cb: () => void) {
  wireOnce();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Capture `beforeinstallprompt` at module-evaluation time, not just on mount.
// Mobile Chrome often fires it during the initial page load — before React
// hydrates and `subscribe` runs — so wiring only on mount drops the one-shot
// event and the banner never shows. The module loads before hydration, so the
// listener is in place in time.
wireOnce();

type Mode = "none" | "android" | "ios";

// Installing a PWA is only worthwhile on mobile (home-screen launcher). On
// desktop the browser already offers an address-bar install affordance, so our
// banner is redundant — gate the Android/Chromium path to mobile devices.
function isMobile(): boolean {
  const uaData = (navigator as unknown as { userAgentData?: { mobile?: boolean } })
    .userAgentData;
  if (uaData && typeof uaData.mobile === "boolean") return uaData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function getSnapshot(): Mode {
  if (dismissed) return "none";
  if (navigator.userAgent.includes("BattleExamApp")) return "none"; // native shell

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes standalone on navigator instead of matchMedia.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) return "none";

  try {
    if (localStorage.getItem(INSTALLED_KEY)) return "none"; // already installed
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL) return "none";
  } catch {
    /* private mode — ignore */
  }

  if (!isMobile()) return "none"; // redundant on desktop

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  if (isIOS) return "ios";

  return deferredEvt ? "android" : "none";
}

function getServerSnapshot(): Mode {
  return "none";
}

function dismiss() {
  dismissed = true;
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  emit();
}

async function install() {
  if (!deferredEvt) return;
  await deferredEvt.prompt();
  await deferredEvt.userChoice;
  deferredEvt = null;
  dismiss();
}

/**
 * "Add to Home Screen" affordance.
 *   - Android / desktop Chromium: a one-tap Install button that fires the
 *     native prompt captured from `beforeinstallprompt`.
 *   - iOS Safari: a hint pointing at Share → "Add to Home Screen" (iOS has no
 *     programmatic prompt).
 * Hidden when already installed, inside the native app, or once dismissed.
 */
export default function InstallPrompt() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (mode === "none") return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-50 mx-auto max-w-md px-3 md:bottom-4">
      <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-lg dark:border-white/10 dark:bg-neutral-900">
        <div className="flex-1 text-sm">
          {mode === "ios" ? (
            <span className="text-neutral-700 dark:text-neutral-200">
              Install BattleExam: tap{" "}
              <Share className="mx-0.5 inline h-4 w-4 align-text-bottom" aria-label="Share" />
              then <span className="font-medium">Add to Home Screen</span>.
            </span>
          ) : (
            <span className="font-medium text-neutral-800 dark:text-neutral-100">
              Install BattleExam for quick access
            </span>
          )}
        </div>

        {mode === "android" && (
          <button
            onClick={install}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Download className="h-4 w-4" />
            Install
          </button>
        )}

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
