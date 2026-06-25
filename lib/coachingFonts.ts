import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

// Self-hosted at build time via next/font — replaces the render-blocking
// <link> to fonts.googleapis.com the coaching layouts used to inject (an extra
// DNS/TLS round trip + font-swap layout shift on every coaching page load).
// All are variable fonts, so no explicit weight list is needed.
//
// The coaching admin "Consistent design format" mockup uses a single family —
// Plus Jakarta Sans — for both body and display. We expose it under BOTH the
// legacy --font-space-grotesk (display) and --font-manrope (body) variable names
// so every existing `style={{ fontFamily: display }}` keeps working while the
// whole module now renders in one consistent typeface.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Apply on a wrapping element so the CSS variables cascade to everything the
// coaching UI (components/coaching/ui.tsx) renders.
export const coachingFontVars = `${jakarta.variable} ${jetbrainsMono.variable}`;
