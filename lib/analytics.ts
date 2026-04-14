"use client";

/**
 * Manually tracks a pageview in Google Analytics.
 * This is useful when updating the URL via window.history.replaceState()
 * which GA4 doesn't always detect automatically.
 */
export function trackPageView() {
  if (typeof window !== "undefined" && (window as any).gtag) {
    const path = window.location.pathname + window.location.search;
    console.log(`[Analytics] Tracking PageView: ${path} | ${document.title}`);
    (window as any).gtag("config", process.env.NEXT_PUBLIC_GA_ID, {
      page_path: path,
      page_title: document.title,
    });
  }
}
