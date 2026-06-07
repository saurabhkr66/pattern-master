import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";

// Self-hosted at build time via next/font — replaces the render-blocking
// <link> to fonts.googleapis.com the coaching layouts used to inject (an extra
// DNS/TLS round trip + font-swap layout shift on every coaching page load).
// All three are variable fonts, so no explicit weight list is needed.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Apply on a wrapping element so the CSS variables cascade to everything the
// coaching UI (components/coaching/ui.tsx) renders.
export const coachingFontVars = `${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable}`;
