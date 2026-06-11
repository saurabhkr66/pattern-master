import { Browser } from "@capacitor/browser";

/**
 * Launches the native-app sign-in flow: opens /mobile-auth-start in the
 * system browser (Chrome Custom Tab), where the normal web sign-in runs
 * end-to-end in one cookie jar and hands the session back to the app via a
 * single-use sign-in ticket (see app/mobile-auth-start/page.tsx).
 *
 * Every sign-in/sign-up affordance on native must go through this — Clerk's
 * in-WebView forms and modals are dead ends there (Google blocks WebView
 * OAuth, and Clerk rejects cross-client callback completion).
 */
export async function launchNativeSignIn(): Promise<void> {
  await Browser.open({
    url: `${window.location.origin}/mobile-auth-start`,
    presentationStyle: "fullscreen",
  });
}
