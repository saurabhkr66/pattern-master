"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useRouter, usePathname } from "next/navigation";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { useClerk } from "@clerk/nextjs";

const OAUTH_CALLBACK_SCHEME = "battleexam://oauth-callback";

// Inside the Android WebView, Google session cookies are persistent and
// isolated from the system browser. Without prompt=select_account, Google
// silently re-auths with the last-used account on every subsequent sign-in,
// so the account chooser never appears. Clerk's <SignIn/> UI doesn't expose
// the OIDC prompt option, so we patch the resource prototype once.
// Returns true if the resource was patched (or is already patched), false if it's missing.
function forceAccountChooser(resource: unknown): boolean {
  if (!resource) return false;
  const proto = Object.getPrototypeOf(resource) as
    | (Record<string, unknown> & { __chooserPatched?: boolean })
    | null;
  if (!proto) return false;
  if (proto.__chooserPatched) return true;
  const original = proto.authenticateWithRedirect;
  if (typeof original !== "function") return false;

  proto.authenticateWithRedirect = function (
    this: unknown,
    params: { strategy?: string; oidcPrompt?: string } & Record<string, unknown>,
  ) {
    const isOAuth =
      typeof params?.strategy === "string" && params.strategy.startsWith("oauth_");
    const merged =
      isOAuth && !params.oidcPrompt
        ? { ...params, oidcPrompt: "select_account" }
        : params;
    return (original as (p: typeof merged) => unknown).call(this, merged);
  };
  proto.__chooserPatched = true;
  return true;
}

/**
 * This component bridges Next.js web logic with Native Capacitor features.
 * It only runs on actual mobile devices (iOS/Android).
 */
export default function NativeMobileBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const clerk = useClerk();

  useEffect(() => {
    // Mark the HTML element so CSS can target native-app-specific styles
    // (works even if the Capacitor bridge hasn't fully initialized yet)
    if (navigator.userAgent.includes('BattleExamApp')) {
      document.documentElement.classList.add('native-app');
    }

    // Only run on Native platforms
    if (!Capacitor.isNativePlatform()) return;

    // 1. Handle Android Hardware Back Button
    const backButtonListener = App.addListener("backButton", (_data) => {
      if (pathname === "/" || pathname === "/dashboard") {
        // Exit app if on root pages
        App.exitApp();
      } else {
        // Otherwise, navigate back in Next.js history
        router.back();
      }
    });

    // 2. Handle deep-link return from OAuth (system browser → app)
    // When Clerk redirects to battleexam://oauth-callback?... after Google sign-in,
    // Android opens the app via the intent filter and fires appUrlOpen. We close
    // the in-app browser tab and force a full page navigation (not Next.js client
    // router) so the Clerk SDK reinitializes and picks up the __clerk_handshake
    // token from the URL. A client-side router.replace would leave the existing
    // Clerk instance in place, and it doesn't re-scan the URL on mid-app navs.
    const oauthCallbackListener = App.addListener("appUrlOpen", async (event) => {
      console.log("[NativeMobileBridge] appUrlOpen:", event.url);
      if (!event.url.startsWith(OAUTH_CALLBACK_SCHEME)) return;
      try {
        await Browser.close();
      } catch {
        // Browser may already be closed; ignore.
      }
      try {
        const parsed = new URL(event.url);
        const target = `${window.location.origin}/sso-callback${parsed.search}${parsed.hash}`;
        console.log("[NativeMobileBridge] Forcing full reload to:", target);
        // Full reload (not router.replace) so Clerk re-bootstraps and consumes
        // the handshake token from the URL.
        window.location.replace(target);
      } catch (e) {
        console.error("[NativeMobileBridge] Failed to parse OAuth deep link", e);
      }
    });

    // 3. Style the Status Bar to match your theme
    const setupStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0a0a0a" }); // Matches your BE theme
      } catch (e) {
        console.warn("StatusBar plugin not available", e);
      }
    };

    setupStatusBar();

    return () => {
      backButtonListener.then((l) => l.remove());
      oauthCallbackListener.then((l) => l.remove());
    };
  }, [router, pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let signInPatched = false;
    let signUpPatched = false;
    const attempt = () => {
      if (cancelled) return;
      const client = (clerk as unknown as { client?: { signIn?: unknown; signUp?: unknown } })?.client;
      if (!signInPatched && client?.signIn) {
        signInPatched = forceAccountChooser(client.signIn);
      }
      if (!signUpPatched && client?.signUp) {
        signUpPatched = forceAccountChooser(client.signUp);
      }
      if (signInPatched && signUpPatched) return;
      setTimeout(attempt, 200);
    };
    attempt();

    return () => {
      cancelled = true;
    };
  }, [clerk]);

  return null; // This is a logic-only component
}
