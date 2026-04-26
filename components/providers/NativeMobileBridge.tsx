"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useRouter, usePathname } from "next/navigation";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

/**
 * This component bridges Next.js web logic with Native Capacitor features.
 * It only runs on actual mobile devices (iOS/Android).
 */
export default function NativeMobileBridge() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run on Native platforms
    if (!Capacitor.isNativePlatform()) return;

    // 1. Handle Android Hardware Back Button
    const backButtonListener = App.addListener("backButton", (data) => {
      if (pathname === "/" || pathname === "/dashboard") {
        // Exit app if on root pages
        App.exitApp();
      } else {
        // Otherwise, navigate back in Next.js history
        router.back();
      }
    });

    // 2. Style the Status Bar to match your theme
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
    };
  }, [router, pathname]);

  return null; // This is a logic-only component
}
