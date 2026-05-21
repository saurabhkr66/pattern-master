import {
  Zap,
  Target,
  BarChart3,
  Trophy,
  Star,
  Brain,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Pattern-first learning",
    body: "We don't dump questions at you. We teach the exact mental model each GATE topic tests — then reinforce it with targeted questions.",
    accent: "text-indigo-400",
    bg: "bg-indigo-500/8",
    border: "border-indigo-500/15",
  },
  {
    icon: Zap,
    title: "Infinite fresh questions",
    body: "Every session is different. Questions are generated fresh with distractors that mirror real exam misdirection.",
    accent: "text-violet-400",
    bg: "bg-violet-500/8",
    border: "border-violet-500/15",
  },
  {
    icon: Target,
    title: "Adaptive difficulty",
    body: "Start Easy to build confidence, push to Hard when you're ready. The difficulty slider is yours — no forced progression.",
    accent: "text-rose-400",
    bg: "bg-rose-500/8",
    border: "border-rose-500/15",
  },
  {
    icon: BarChart3,
    title: "Mistake-driven review",
    body: "Wrong answers don't disappear. They go into a Mistakes Room — flashcard-style review that targets your exact weak spots.",
    accent: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
  },
  {
    icon: Star,
    title: "PYQ bank included",
    body: "Real Previous Year Questions are tagged to every topic so you can cross-check your practice against official GATE paper patterns.",
    accent: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/15",
  },
  {
    icon: Trophy,
    title: "Built for GATE rank, not just pass",
    body: "Questions are calibrated to GATE scoring patterns. Hard mode questions are genuinely AIR-100 level — not artificially inflated.",
    accent: "text-cyan-400",
    bg: "bg-cyan-500/8",
    border: "border-cyan-500/15",
  },
];

export default function FeaturesGrid() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-2">
            Features
          </p>
          <h2
            className="text-2xl md:text-3xl font-black"
            style={{ color: "var(--text-primary)" }}
          >
            Everything you need to crack GATE
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`p-5 rounded-2xl border ${f.border} ${f.bg} hover:shadow-lg transition-shadow`}
            >
              <div
                className={`w-9 h-9 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-3`}
              >
                <f.icon size={17} className={f.accent} />
              </div>
              <h3
                className="font-bold text-sm mb-1.5"
                style={{ color: "var(--text-primary)" }}
              >
                {f.title}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
