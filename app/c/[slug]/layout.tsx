import { coachingFontVars } from "@/lib/coachingFonts";

// Applies the redesign fonts (Space Grotesk display + Manrope + JetBrains Mono)
// to all student-facing /c/[slug] pages. Self-hosted via next/font — no external
// request, no font-swap layout shift.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <div className={coachingFontVars}>{children}</div>;
}
