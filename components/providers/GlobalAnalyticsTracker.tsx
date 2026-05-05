"use client";
import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

/**
 * GlobalAnalyticsTracker watches the URL and search params.
 * Every time they change, it triggers a pageview in GA.
 */
export default function GlobalAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // We wrap this in a small timeout to ensure the DOM title has updated
    // and to avoid double-counting on the very first mount which GA script handles.
    const timer = setTimeout(() => {
      trackPageView();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
