// app/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  HeroCTAs,
  TopicsSignUpButton,
  FinalCTAButton,
} from "@/components/landing/LandingAuthButtons";
import FAQAccordion from "@/components/landing/FAQAccordion";
import {
  Brain,
  Zap,
  Target,
  BarChart3,
  CheckCircle2,
  BookOpen,
  Cpu,
  Network,
  Database,
  Code2,
  FlaskConical,
  ArrowRight,
  Flame,
  Trophy,
  RefreshCcw,
  Layers,
  Star,
} from "lucide-react";
import { toSlug } from "@/lib/seo";

export const metadata: Metadata = {
  title: "BattleExam – Pattern-Based GATE CSE Preparation | Practice Questions",
  description:
    "Master GATE, ISRO, BARC & ESE with pattern-based questions. Practice algorithms, data structures, OS, DBMS, and networks with adaptive difficulty. Free to start.",
  keywords: [
    "GATE CSE preparation",
    "GATE CSE practice questions",
    "GATE algorithms",
    "GATE data structures",
    "GATE operating systems",
    "GATE DBMS",
    "GATE computer networks",
    "ISRO CSE preparation",
    "BARC preparation",
    "GATE 2026",
    "GATE 2027",
    "pattern based learning",
  ],
  openGraph: {
    title: "BattleExam – Pattern-Based GATE CSE Preparation",
    description:
      "Practice GATE CSE, ISRO & BARC with questions tailored to each topic's core logic. Adaptive difficulty, instant explanations, progress tracking.",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "BattleExam – Pattern-Based GATE CSE Preparation",
    description:
      "Practice GATE CSE, ISRO & BARC with questions tailored to each topic's core logic.",
  },
  alternates: { canonical: "/" },
};

// Serve from CDN edge cache — regenerate at most once per hour
export const revalidate = 3600;

const subjectIcons: Record<string, React.ReactNode> = {
  Algorithms: <Cpu size={14} />,
  "Data Structures": <Code2 size={14} />,
  "Operating Systems": <FlaskConical size={14} />,
  "Computer Networks": <Network size={14} />,
  DBMS: <Database size={14} />,
  "Computer Organization": <Cpu size={14} />,
  "Digital Logic": <Zap size={14} />,
  Default: <BookOpen size={14} />,
};

const SUBJECT_COLORS: Record<string, string> = {
  Algorithms: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Data Structures": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Operating Systems": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Computer Networks": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  DBMS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Computer Organization": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Digital Logic": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Default: "bg-white/5 text-white/50 border-white/10",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "BattleExam",
  description: "Pattern-based exam preparation platform for GATE CSE, ISRO, BARC, and ESE",
  url: "https://battleexam.com",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "GATE CSE Study Topics",
    itemListElement: [
      { "@type": "Course", name: "GATE Algorithms", courseCode: "GATE-ALGO" },
      { "@type": "Course", name: "GATE Data Structures", courseCode: "GATE-DS" },
      { "@type": "Course", name: "GATE Operating Systems", courseCode: "GATE-OS" },
      { "@type": "Course", name: "GATE Computer Networks", courseCode: "GATE-CN" },
      { "@type": "Course", name: "GATE DBMS", courseCode: "GATE-DBMS" },
    ],
  },
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How is BattleExam different from other GATE preparation platforms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BattleExam generates questions based on the specific atomic logic of each GATE topic — not recycled question banks.",
      },
    },
    {
      "@type": "Question",
      name: "Which exams does BattleExam cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GATE, ISRO, BARC, and ESE.",
      },
    },
    {
      "@type": "Question",
      name: "Is BattleExam free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Create an account and start practicing immediately — no credit card required.",
      },
    },
  ],
};

const STEPS = [
  {
    n: "01",
    title: "Identify the core pattern",
    body: "Every GATE topic has one atomic logic that examiners always test. We show it to you before you even start.",
    icon: Target,
    accent: "text-indigo-400",
    bg: "bg-indigo-500/8",
    border: "border-indigo-500/15",
    glow: "shadow-indigo-500/10",
  },
  {
    n: "02",
    title: "Get fresh questions every time",
    body: "Fresh questions are generated every session — Easy, Medium, or Hard. Semantic dedup means you never see repeats.",
    icon: RefreshCcw,
    accent: "text-violet-400",
    bg: "bg-violet-500/8",
    border: "border-violet-500/15",
    glow: "shadow-violet-500/10",
  },
  {
    n: "03",
    title: "Know exactly what to fix",
    body: "Your dashboard tracks accuracy per topic. Wrong answers surface in a flashcard review deck — targeted practice, not busywork.",
    icon: BarChart3,
    accent: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
    glow: "shadow-emerald-500/10",
  },
];

const STATS = [
  { value: "50+", label: "GATE Topics", icon: Layers },
  { value: "3", label: "Difficulty Levels", icon: Flame },
  { value: "4", label: "Exams Covered", icon: Trophy },
  { value: "∞", label: "Unique Questions", icon: RefreshCcw },
];

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

const FAQS = [
  {
    q: "How is BattleExam different from other GATE platforms?",
    a: "Most platforms recycle the same question bank. BattleExam generates fresh questions every time, each targeting the specific atomic logic of the topic — the exact thinking pattern GATE examiners test.",
  },
  {
    q: "Which exams and branches are covered?",
    a: "GATE CSE/IT, ISRO CS, BARC CS, and ESE — with Computer Science as the primary branch. ECE and ME patterns are being added continuously.",
  },
  {
    q: "Is it free?",
    a: "Yes. Create an account and start practicing immediately — no credit card, no trial limits.",
  },
  {
    q: "How does BattleExam generate questions without repeating them?",
    a: "Every generated question gets a semantic fingerprint. If an identical question already exists in the database, it's skipped — guaranteeing a growing bank of unique questions.",
  },
  {
    q: "What is 'atomic logic' in a topic?",
    a: "Every GATE question on 'Merge Sort' ultimately tests one thing: how divide-and-conquer recurrences work. That's the atomic logic. Practicing around that core makes you exam-ready faster than reading chapters.",
  },
];

const MOCK_OPTIONS = [
  { label: "A", text: "T(n) = T(n/2) + O(1)", correct: false },
  { label: "B", text: "T(n) = 2T(n/2) + O(n)", correct: true },
  { label: "C", text: "T(n) = T(n−1) + O(n)", correct: false },
  { label: "D", text: "T(n) = 4T(n/4) + O(n²)", correct: false },
];


export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const gatePatterns = await prisma.pattern.findMany({
    where: { exam_type: "GATE", branch: "CSE" },
    select: {
      id: true,
      topic_name: true,
      subject: true,
      atomic_logic: true,
      _count: { select: { pyqs: true } },
    },
    orderBy: { subject: "asc" },
    take: 24,
  });

  const bySubject: Record<string, typeof gatePatterns> = {};
  for (const p of gatePatterns) {
    const s = p.subject ?? "Other";
    if (!bySubject[s]) bySubject[s] = [];
    bySubject[s].push(p);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <div className="min-h-screen" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

        {/* ── HERO ─────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-24 pb-20">
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full opacity-20 blur-[120px]"
            style={{ background: "radial-gradient(ellipse, #6366f1 0%, #8b5cf6 40%, transparent 70%)" }}
          />

          <div className="relative max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* LEFT ── headline + CTAs */}
              <div className="flex-1 min-w-0">
                {/* Eyebrow pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-xs font-bold text-indigo-400 tracking-wide">
                    Pattern-Based · GATE 2026 / 2027
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
                  GATE topic tests — then drills it with infinite fresh questions until you own it.
                </p>

                <HeroCTAs />

                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6">
                  {[
                    "100% free to start",
                    "GATE 2026 & 2027 syllabus",
                    "Instant explanations",
                    "PYQs included",
                  ].map((t) => (
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
                  {/* Glow behind card */}
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
                    {/* Card top bar */}
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

                    {/* Atomic logic hint */}
                    <div
                      className="mx-3 mt-3 px-3 py-2 rounded-lg border border-indigo-500/20 bg-indigo-500/6"
                    >
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                        Core pattern
                      </p>
                      <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        Divide-and-conquer recurrence: cost = 2 sub-problems of n/2 + linear merge.
                      </p>
                    </div>

                    {/* Question */}
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

                    {/* Explanation */}
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

                    {/* Progress bar */}
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

                {/* Below card — score badge */}
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

        {/* ── SOCIAL PROOF BANNER ───────────────────── */}
        {/* TODO: add real social proof here (user count, testimonials teaser, etc.) */}
        {/*
        <div
          className="border-y py-4 px-6 overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
        >
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10 text-center">
            {[
              { icon: "🎯", text: "Pattern-based — not question-bank" },
              { icon: "⚡", text: "Instant explanations" },
              { icon: "🔁", text: "Never see the same question twice" },
              { icon: "📊", text: "Per-topic accuracy tracking" },
              { icon: "🆓", text: "Free forever" },
            ].map((item) => (
              <span
                key={item.text}
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                <span>{item.icon}</span>
                {item.text}
              </span>
            ))}
          </div>
        </div>
        */}

        {/* ── STATS ────────────────────────────────── */}
        <div className="py-16 px-6">
          <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="text-center p-5 rounded-2xl border"
                style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
              >
                <p
                  className="text-4xl font-black mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {s.value}
                </p>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ─────────────────────────── */}
        <section
          className="px-6 py-20 border-t"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                The Method
              </p>
              <h2
                className="text-2xl md:text-3xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                How BattleExam actually works
              </h2>
              <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                Not another question dump. A system designed around how GATE toppers actually think.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 relative">
              {/* Connector line on desktop */}
              <div
                aria-hidden
                className="hidden md:block absolute top-10 left-[calc(33%+16px)] right-[calc(33%+16px)] h-px"
                style={{ background: "var(--border)" }}
              />

              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className={`relative p-6 rounded-2xl border ${step.border} ${step.bg} shadow-lg ${step.glow}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center shrink-0`}
                    >
                      <step.icon size={18} className={step.accent} />
                    </div>
                    <span
                      className={`text-4xl font-black leading-none ${step.accent} opacity-15 select-none`}
                    >
                      {step.n}
                    </span>
                  </div>
                  <h3
                    className="font-bold text-sm mb-2 leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ────────────────────────── */}
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

        {/* ── TESTIMONIALS ─────────────────────────── */}
        {/* TODO: add real testimonials */}

        {/* ── TOPICS ───────────────────────────────── */}
        <section
          className="px-6 py-20"
          aria-labelledby="topics-heading"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                GATE CSE Coverage
              </p>
              <h2
                id="topics-heading"
                className="text-2xl md:text-3xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                Every topic. Every pattern.
              </h2>
              <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                Click any topic to see its core atomic logic — even before you sign up.
              </p>
            </div>

            <div className="space-y-8">
              {Object.entries(bySubject).map(([subject, patterns]) => {
                const colorClass = SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.Default;
                const icon = subjectIcons[subject] ?? subjectIcons.Default;
                return (
                  <div key={subject}>
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${colorClass}`}
                      >
                        {icon}
                        {subject}
                      </span>
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                      <span
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {patterns.length} topics
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {patterns.map((p) => (
                        <Link
                          key={p.id}
                          href={`/gate-cse/${toSlug(p.subject)}/${toSlug(p.topic_name)}`}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/5"
                          style={{
                            borderColor: "var(--border)",
                            background: "var(--bg-surface)",
                            color: "var(--text-secondary)",
                          }}
                          title={p.atomic_logic ?? undefined}
                        >
                          {p.topic_name}
                          {p._count.pyqs > 0 && (
                            <span className="ml-1.5 text-[9px] font-bold bg-orange-500/10 text-orange-400 px-1 py-0.5 rounded">
                              {p._count.pyqs} PYQ
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-center">
              <TopicsSignUpButton />
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────── */}
        <section
          className="px-6 py-20 border-t"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
          aria-labelledby="faq-heading"
        >
          <div className="max-w-2xl mx-auto">
            <h2
              id="faq-heading"
              className="text-2xl md:text-3xl font-black mb-10 text-center"
              style={{ color: "var(--text-primary)" }}
            >
              Frequently asked questions
            </h2>
            <FAQAccordion faqs={FAQS} />
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────── */}
        <section className="px-6 py-24 relative overflow-hidden">
          {/* Background glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full opacity-15 blur-[100px]"
            style={{ background: "radial-gradient(ellipse, #6366f1 0%, transparent 70%)" }}
          />

          <div className="relative max-w-2xl mx-auto text-center">
            {/* Urgency pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/25 bg-orange-500/8 mb-6">
              <Flame size={12} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400">
                GATE 2027 prep window is now
              </span>
            </div>

            <h2
              className="text-3xl md:text-5xl font-black mb-4 leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Your GATE rank is decided
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

            {/* Trust signals below CTA */}
            <div className="flex flex-wrap items-center justify-center gap-5 mt-8">
              {[
                "Free forever",
                "No spam",
                "Instant access",
                "GATE + ISRO + BARC + ESE",
              ].map((t) => (
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

        {/* ── FOOTER ───────────────────────────────── */}
        <footer
          className="border-t px-6 py-10"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
                  <Brain size={14} className="text-white" />
                </span>
                <span className="font-black text-base">
                  Battle<span className="text-violet-400">Exam</span>
                </span>
              </div>
              <p className="text-[11px] text-center" style={{ color: "var(--text-faint)" }}>
                Pattern-based GATE CSE, ISRO, BARC &amp; ESE preparation.
              </p>
              <div className="flex items-center gap-5 text-xs" style={{ color: "var(--text-muted)" }}>
                <Link href="/sign-in" className="hover:text-indigo-400 transition-colors">Sign in</Link>
                <Link href="/sign-up" className="hover:text-indigo-400 transition-colors">Sign up</Link>
              </div>
            </div>
            <p className="text-center text-[10px]" style={{ color: "var(--text-faint)" }}>
              © {new Date().getFullYear()} BattleExam. Built for Indian engineering aspirants.
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}
