import Link from "next/link";
import { Flame, ArrowRight, CheckCircle2 } from "lucide-react";
import { FinalCTAButton } from "@/components/landing/LandingAuthButtons";

const TRUST_SIGNALS = [
  "Free forever",
  "No spam",
  "Instant access",
  "GATE · JEE · NEET · UGC NET",
];

export default function FinalCTASection() {
  return (
    <section className="px-6 py-24 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full opacity-15 blur-[100px]"
        style={{ background: "radial-gradient(ellipse, #6366f1 0%, transparent 70%)" }}
      />

      <div className="relative max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/25 bg-orange-500/8 mb-6">
          <Flame size={12} className="text-orange-400" />
          <span className="text-xs font-bold text-orange-400">
            Your 2026 / 2027 prep window is now
          </span>
        </div>

        <h2
          className="text-3xl md:text-5xl font-black mb-4 leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Your rank is decided
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            by how you practice.
          </span>
        </h2>
        <p
          className="text-sm md:text-base mb-2 max-w-md mx-auto leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Top rankers don&apos;t study more — they practice smarter. BattleExam gives you
          the same pattern-based system, for free.
        </p>
        <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>
          No credit card. No trial limits. Start in 30 seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <FinalCTAButton />
          <Link
            href="/gate-cse/algorithms/merge-sort"
            className="flex items-center gap-1.5 text-sm font-medium hover:text-indigo-400 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            See a topic first <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 mt-8">
          {TRUST_SIGNALS.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              <CheckCircle2 size={11} className="text-emerald-500/60 shrink-0" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
