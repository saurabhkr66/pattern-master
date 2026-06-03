"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Building2 } from "lucide-react";

/**
 * Thin desktop-only rail pinned to the left edge. Two doors: the coaching home
 * (/coaching) for students, and the "for coachings" application page
 * (/for-coachings) for teachers. Mobile uses the header menu instead. Hidden on
 * the test runner and on coaching's own routes (they have their own chrome) —
 * mirrors the guards in Header/MobileNav.
 */
export default function CoachingRail() {
  const pathname = usePathname();

  if (pathname === "/test") return null;
  if (pathname.startsWith("/coaching-admin") || pathname.startsWith("/c/")) return null;

  // /coaching (student) must not also light up the /for-coachings (teacher) icon.
  const studentActive = pathname === "/coaching" || pathname.startsWith("/coaching/");
  const teacherActive = pathname.startsWith("/for-coachings");

  const activeStyle = { background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#1a1205" };
  const idleStyle = { color: "var(--text-secondary)" };

  return (
    <div
      className="fixed left-3 top-[76px] z-40 hidden flex-col items-center gap-2 rounded-2xl border p-2 backdrop-blur-md md:flex"
      style={{ background: "var(--header-bg)", borderColor: "var(--border)" }}
    >
      <Link
        href="/coaching"
        title="My coaching"
        aria-label="My coaching"
        className="grid h-11 w-11 place-items-center rounded-xl transition-colors"
        style={studentActive ? activeStyle : idleStyle}
      >
        <GraduationCap size={22} />
      </Link>
      <Link
        href="/for-coachings"
        title="For coachings — run your coaching"
        aria-label="For coachings"
        className="grid h-11 w-11 place-items-center rounded-xl transition-colors"
        style={teacherActive ? activeStyle : idleStyle}
      >
        <Building2 size={22} />
      </Link>
    </div>
  );
}
