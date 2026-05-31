import { CheckCircle2 } from "lucide-react";
import { HeroCTAs } from "@/components/landing/LandingAuthButtons";

const MOCK_OPTIONS = [
  { label: "A", text: "T(n) = T(n/2) + O(1)", correct: false },
  { label: "B", text: "T(n) = 2T(n/2) + O(n)", correct: true },
  { label: "C", text: "T(n) = T(n−1) + O(n)", correct: false },
  { label: "D", text: "T(n) = 4T(n/4) + O(n²)", correct: false },
];

const HERO_TAGS = [
  "100% free to start",
  "Aligned to the latest syllabus",
  "Instant explanations",
  "PYQs included",
];

// Every exam BattleExam delivers — given equal billing in the hero so no
// single exam (GATE) overshadows the rest.
const HERO_EXAMS = ["GATE", "JEE Main", "JEE Advanced", "NEET", "UGC-NET"];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-20">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(ellipse, #6366f1 0%, #8b5cf6 40%, transparent 70%)" }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* LEFT ── headline + CTAs */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-bold text-indigo-400 tracking-wide">
                Pattern-Based · GATE · JEE · NEET · UGC-NET
              </span>
            </div>

            <h1
              className="text-4xl md:text-[56px] font-black leading-[1.05] tracking-tight mb-5"
              style={{ color: "var(--text-primary)" }}
            >
              Stop memorising.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Start understanding.
              </span>
            </h1>

            <p
              className="text-base md:text-lg leading-relaxed mb-8 max-w-[440px]"
              style={{ color: "var(--text-secondary)" }}
            >
              BattleExam shows you the <strong style={{ color: "var(--text-primary)" }}>one core pattern</strong> each
              exam topic tests — then drills it with infinite fresh questions until you own it.
            </p>

            {/* Exam lineup — equal billing for every exam we cover */}
            <div className="flex flex-wrap gap-2 mb-6">
              {HERO_EXAMS.map((e) => (
                <span
                  key={e}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
                  style={{
                    color: "var(--text-secondary)",
                    borderColor: "var(--border-strong)",
                    background: "var(--bg-surface-2)",
                  }}
                >
                  {e}
                </span>
              ))}
            </div>

            <HeroCTAs />

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6">
              {HERO_TAGS.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT ── animated practice card */}
          <div className="hidden lg:block flex-shrink-0 w-[350px]">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-3 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              Live practice session
            </p>

            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl blur-2xl opacity-25 scale-95"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              />
              <div
                className="relative rounded-2xl overflow-hidden border"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Algorithms · Merge Sort
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-400 uppercase tracking-wider">
                    Hard
                  </span>
                </div>

                <div className="mx-3 mt-3 px-3 py-2 rounded-lg border border-indigo-500/20 bg-indigo-500/6">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                    Core pattern
                  </p>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Divide-and-conquer recurrence: cost = 2 sub-problems of n/2 + linear merge.
                  </p>
                </div>

                <div className="px-4 pt-3 pb-3">
                  <p
                    className="text-sm font-semibold leading-snug mb-3"
                    style={{ color: "var(--text-primary)" }}
                  >
                    What is the recurrence relation for Merge Sort on{" "}
                    <span className="font-mono text-violet-400">n</span> elements?
                  </p>

                  <div className="space-y-2">
                    {MOCK_OPTIONS.map((opt) => (
                      <div
                        key={opt.label}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                          opt.correct
                            ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                            : "opacity-50"
                        }`}
                        style={
                          opt.correct
                            ? undefined
                            : { borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-muted)" }
                        }
                      >
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-black shrink-0 ${
                            opt.correct
                              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                              : "border-current opacity-40"
                          }`}
                        >
                          {opt.label}
                        </span>
                        {opt.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/6">
                  <p className="text-[10px] font-bold text-emerald-400 mb-0.5">
                    ✓ Correct — here&apos;s why
                  </p>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Merge Sort splits into 2 sub-problems of size n/2 (→ 2T(n/2)) and merges
                    in O(n), giving O(n log n) overall by Master Theorem.
                  </p>
                </div>

                <div
                  className="px-4 py-2.5 flex items-center justify-between border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Question 3 / 5
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`w-5 h-1 rounded-full ${
                          i === 3 ? "bg-indigo-500" : i < 3 ? "bg-emerald-500" : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/6">
                <CheckCircle2 size={11} className="text-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-400">
                  2 / 2 correct so far
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
