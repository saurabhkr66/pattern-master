import Link from "next/link";
import { HOME_EXAM_COPY } from "@/components/landing/homeMetadata";

const GATE_CSE_SUBJECTS = [
  { label: "Algorithms", href: "/gate-cse/algorithms" },
  { label: "Data Structures", href: "/gate-cse/data-structures" },
  { label: "Operating Systems", href: "/gate-cse/operating-systems" },
  { label: "DBMS", href: "/gate-cse/dbms" },
  { label: "Computer Networks", href: "/gate-cse/computer-networks" },
  { label: "Theory of Computation", href: "/gate-cse/theory-of-computation" },
  { label: "Compiler Design", href: "/gate-cse/compiler-design" },
  { label: "Digital Logic", href: "/gate-cse/digital-logic" },
  { label: "Computer Organisation", href: "/gate-cse/computer-organisation" },
  { label: "Discrete Mathematics", href: "/gate-cse/discrete-mathematics" },
];

export default function LandingFooter() {
  return (
    <footer
      className="border-t px-6 py-10"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <svg width="22" height="28" viewBox="0 0 100 125" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g transform="translate(0, 2)">
                <path d="M 50 2 C 22 8 8 25 8 45 L 8 75 C 8 98 30 112 50 120 L 50 2 Z" fill="#0A1A2F"/>
                <path d="M 50 2 C 78 8 92 25 92 45 L 92 75 C 92 98 70 112 50 120" fill="none" stroke="#FF6B00" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M 50 12 L 38 48 L 45 66 L 32 66 L 32 72 L 44 72 L 44 94 L 36 102 L 50 108 Z" fill="#FFFFFF"/>
                <path d="M 50 12 L 62 48 L 55 66 L 68 66 L 68 72 L 56 72 L 56 94 L 64 102 L 50 108 Z" fill="#0A1A2F"/>
                <path d="M 50 40 A 4 4 0 0 0 50 48 Z" fill="#0A1A2F"/>
                <rect x="49" y="22" width="1" height="18" fill="#0A1A2F"/>
                <path d="M 50 40 A 4 4 0 0 1 50 48 Z" fill="#FFFFFF"/>
                <rect x="50" y="22" width="1" height="18" fill="#FFFFFF"/>
              </g>
            </svg>
            <span className="font-black text-base">
              Battle<span className="text-violet-400">Exam</span>
            </span>
          </div>
          <p className="text-[11px] text-center" style={{ color: "var(--text-faint)" }}>
            Pattern-based {HOME_EXAM_COPY} preparation.
          </p>
          <div className="flex items-center gap-5 text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/sign-in" className="hover:text-indigo-400 transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-indigo-400 transition-colors">Sign up</Link>
          </div>
        </div>

        <nav aria-label="GATE CSE subjects" className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-faint)" }}>
            GATE CSE Topics
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {GATE_CSE_SUBJECTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="text-[11px] hover:text-indigo-400 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </nav>

        <p className="text-center text-[10px]" style={{ color: "var(--text-faint)" }}>
          © {new Date().getFullYear()} BattleExam. Built for Indian engineering aspirants.
        </p>
      </div>
    </footer>
  );
}
