// app/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  HeroCTAs,
  FinalCTAButton,
} from "@/components/landing/LandingAuthButtons";
import FAQAccordion from "@/components/landing/FAQAccordion";
import TopicsExplorer, { type BranchSubjectData } from "@/components/landing/TopicsExplorer";
import {
  Zap,
  Target,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Flame,
  Trophy,
  RefreshCcw,
  Star,
  Brain,
} from "lucide-react";

import { joinExamLabels, listExamLabels } from "@/lib/seo";

const HOME_EXAM_COPY = joinExamLabels();
const HOME_TITLE = `BattleExam – Pattern-Based ${HOME_EXAM_COPY} Practice & Mock Tests`;
const HOME_DESC = `Master ${HOME_EXAM_COPY} with AI-generated pattern-based questions, previous year questions (PYQs) and full-length mock tests. Adaptive difficulty, instant explanations. Free to start.`;
const HOME_OG_DESC = `Practice ${HOME_EXAM_COPY} with AI questions tailored to each topic's core logic. Adaptive difficulty, instant explanations, PYQs included. Free.`;

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESC,
  keywords: [
    // GATE
    "GATE preparation",
    "GATE CSE preparation",
    "GATE ECE preparation",
    "GATE EE preparation",
    "GATE ME preparation",
    "GATE CE preparation",
    "GATE practice questions",
    "GATE PYQ",
    "GATE previous year questions",
    "GATE 2026 preparation",
    "GATE 2027 preparation",
    "GATE mock test",
    // JEE
    "JEE Main preparation",
    "JEE Main practice questions",
    "JEE Main PYQ",
    "JEE Main mock test",
    "JEE Advanced preparation",
    "JEE Advanced PYQ",
    // NEET
    "NEET UG preparation",
    "NEET practice questions",
    "NEET PYQ",
    "NEET mock test",
    // UGC NET
    "UGC NET Paper 1 preparation",
    "UGC NET Paper 2 preparation",
    "UGC NET PYQ",
    // generic
    "pattern based learning",
    "AI generated questions",
    "online mock tests India",
    "engineering entrance exam preparation India",
    "medical entrance exam preparation India",
  ],
  openGraph: {
    title: HOME_TITLE,
    description: HOME_OG_DESC,
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "https://battleexam.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: `BattleExam – Pattern-Based ${HOME_EXAM_COPY} Preparation`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: `Practice ${HOME_EXAM_COPY} with AI questions tailored to each topic's core logic. Free.`,
    images: ["https://battleexam.com/opengraph-image"],
  },
  alternates: { canonical: "https://battleexam.com" },
};

// Serve from CDN edge cache — regenerate at most once per hour
export const revalidate = 3600;


const HOME_EXAM_LIST = listExamLabels();
const PROVIDER = { "@type": "Organization", name: "BattleExam", url: "https://battleexam.com" };

const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "BattleExam",
  description: `Pattern-based exam preparation platform for ${HOME_EXAM_COPY}`,
  url: "https://battleexam.com",
  knowsAbout: HOME_EXAM_LIST,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Exam Preparation Programs",
    itemListElement: [
      {
        "@type": "Course",
        name: "GATE CSE Preparation",
        courseCode: "GATE-CSE",
        url: "https://battleexam.com/gate-cse",
        description: "Pattern-based GATE Computer Science preparation: algorithms, data structures, OS, DBMS, networks, theory of computation and more.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "JEE Main Preparation",
        courseCode: "JEE-MAIN",
        url: "https://battleexam.com/jee-main",
        description: "Physics, Chemistry and Mathematics practice for JEE Main with AI-generated questions and full-length mock tests.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "JEE Advanced Preparation",
        courseCode: "JEE-ADVANCED",
        url: "https://battleexam.com/jee-advanced",
        description: "Pattern-based JEE Advanced practice covering MCQ, MSQ and Integer-type questions across Physics, Chemistry, Mathematics.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "NEET UG Preparation",
        courseCode: "NEET-UG",
        url: "https://battleexam.com/neet",
        description: "NEET UG Physics, Chemistry and Biology practice with previous year questions and full-length mocks.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "UGC NET Paper 1 Preparation",
        courseCode: "UGC-NET-P1",
        url: "https://battleexam.com/ugc-net-p1",
        description: "General Paper on Teaching and Research Aptitude practice for UGC NET Paper 1.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "UGC NET Paper 2 Preparation",
        courseCode: "UGC-NET-P2",
        url: "https://battleexam.com/ugc-net-p2",
        description: "Subject-specific UGC NET Paper 2 practice across supported subjects.",
        provider: PROVIDER,
      },
    ],
  },
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "BattleExam",
  operatingSystem: "Web, Android, iOS",
  applicationCategory: "EducationApplication",
  applicationSubCategory: "Exam Preparation",
  url: "https://battleexam.com",
  description: `AI-powered pattern-based exam preparation platform for ${HOME_EXAM_COPY}. Practice with adaptive-difficulty questions, access previous year papers, and track your progress.`,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
    description: "Free core practice. No credit card required.",
  },
  featureList: [
    "AI-generated pattern-based questions",
    `Previous Year Questions (PYQs) for ${HOME_EXAM_COPY}`,
    "Full-length mock tests with real exam interface",
    "Adaptive difficulty: Easy, Medium, Hard",
    "Instant explanations and step-by-step solutions",
    "Progress tracking and accuracy analytics",
    "Mistake review and flashcard mode",
    `Covers ${HOME_EXAM_COPY}`,
  ],
  screenshot: "https://battleexam.com/opengraph-image",
  inLanguage: "en-IN",
  audience: {
    "@type": "EducationalAudience",
    educationalRole: "student",
    audienceType: `Students preparing for ${HOME_EXAM_COPY}`,
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
        text: "BattleExam generates questions based on the specific atomic logic of each GATE topic — not recycled question banks. Every question targets the exact thinking pattern GATE examiners test, so practice is always relevant and non-repetitive.",
      },
    },
    {
      "@type": "Question",
      name: "Which exams and subjects does BattleExam cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `BattleExam covers ${HOME_EXAM_COPY}. GATE preparation is supported across all branches (CSE, ECE, EE, ME, CE, IN, CH, BT). JEE Main and JEE Advanced cover Physics, Chemistry and Mathematics; NEET UG adds Biology. UGC NET Paper 1 (general aptitude) and Paper 2 (subject-specific) are also supported.`,
      },
    },
    {
      "@type": "Question",
      name: "Is BattleExam free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Create an account and start practicing immediately — no credit card required. The core practice, PYQs, and progress tracking are completely free.",
      },
    },
    {
      "@type": "Question",
      name: "Does BattleExam have previous year questions (PYQs)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. BattleExam includes PYQ banks for ${HOME_EXAM_COPY}, organised by subject, topic and year. Every previous year question is tagged to the exact pattern it tests, so you can study PYQs in context rather than in isolation.`,
      },
    },
    {
      "@type": "Question",
      name: "How does BattleExam generate questions without repeating them?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every generated question gets a semantic fingerprint. If an identical question already exists in the database, it is skipped — guaranteeing a growing bank of unique, non-repetitive questions.",
      },
    },
    {
      "@type": "Question",
      name: "What is pattern-based learning for GATE?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every GATE question tests one core idea — for example, every Merge Sort question ultimately tests how divide-and-conquer recurrences resolve. Pattern-based learning identifies that core idea (the atomic logic) and drills it with varied questions until you own it — instead of memorising individual questions.",
      },
    },
    {
      "@type": "Question",
      name: "Does BattleExam have full-length mock tests?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. BattleExam provides full-length mock tests with the real exam interface, timing, and marking schemes for ${HOME_EXAM_COPY}. Mocks include instant scoring, detailed performance analysis and per-question explanations.`,
      },
    },
    {
      "@type": "Question",
      name: "What difficulty levels are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BattleExam offers Easy, Medium, and Hard difficulty modes. Hard mode questions are calibrated to AIR-100 level — genuinely challenging, not artificially inflated. You control the difficulty slider at any time.",
      },
    },
  ],
};


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
    a: `BattleExam covers ${HOME_EXAM_COPY}. GATE is supported across all 8 branches (CSE, ECE, EE, ME, CE, IN, CH, BT). JEE Main and JEE Advanced cover Physics, Chemistry and Mathematics; NEET UG adds Biology. UGC NET Paper 1 (teaching & research aptitude) and Paper 2 (subject-specific) are also live.`,
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

  // Fetch distinct branch+subject+exam combinations for the Topics explorer
  const branchSubjectRows = await prisma.pattern.findMany({
    select: { exam_type: true, branch: true, subject: true },
    distinct: ["exam_type", "branch", "subject"],
    orderBy: [{ branch: "asc" }, { subject: "asc" }],
  });

  // Group by branch: pick primary exam per branch (first one encountered)
  const branchMap = new Map<string, { exam: string; subjects: Set<string> }>();
  for (const row of branchSubjectRows) {
    if (!branchMap.has(row.branch)) {
      branchMap.set(row.branch, { exam: row.exam_type, subjects: new Set() });
    }
    branchMap.get(row.branch)!.subjects.add(row.subject);
  }

  const topicsData: BranchSubjectData[] = Array.from(branchMap.entries()).map(
    ([branch, { exam, subjects }]) => ({
      branch,
      exam,
      subjects: Array.from(subjects).sort(),
    })
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
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
        <div
          className="px-6 py-8 border-y"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4">
            {[
              { value: "50+", label: "GATE Topics" },
              { value: "6", label: "Exams Covered" },
              { value: "∞", label: "Unique Questions" },
              { value: "0 ₹", label: "Core Practice" },
            ].map((s, i, arr) => (
              <div
                key={s.label}
                className="px-5 py-4"
                style={{
                  borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "clamp(28px, 5vw, 40px)",
                    fontWeight: 600,
                    letterSpacing: "-0.8px",
                    color: "var(--text-primary)",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.label}
                </div>
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
            <p
              className="text-center text-[11px] font-bold uppercase tracking-widest mb-2.5"
              style={{ color: "var(--text-muted)" }}
            >
              How it works
            </p>
            <h2
              className="text-center mb-10 mx-auto"
              style={{
                fontFamily: "var(--be-font-serif, Georgia, serif)",
                fontSize: "clamp(26px, 4vw, 36px)",
                fontWeight: 600,
                letterSpacing: "-0.6px",
                lineHeight: 1.2,
                color: "var(--text-primary)",
                maxWidth: 600,
              }}
            >
              A feedback loop that gets sharper every session.
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  n: "01",
                  title: "Answer",
                  body: "Generated questions at your level. Each tagged to a pattern — not just a topic.",
                },
                {
                  n: "02",
                  title: "Understand",
                  body: "Instant explanation, reasoning steps, and links to the short-note for the pattern.",
                },
                {
                  n: "03",
                  title: "Fix the pattern",
                  body: "Next session focuses on the patterns you're weakest on. Drill until mastered.",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="p-6 rounded-2xl border"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <div
                    className="mb-2.5"
                    style={{
                      fontFamily: "var(--be-font-mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--be-purple-500)",
                    }}
                  >
                    {s.n}
                  </div>
                  <h3
                    className="mb-2"
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURE STRIP ────────────────────────── */}
        <section className="px-6 pb-20">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[2fr_1fr] gap-4 items-stretch">
            {/* Left — Mistake log card */}
            <div
              className="rounded-2xl border p-7"
              style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#8b5cf6" }}>
                Mistake log · Pattern analysis
              </p>
              <h3
                style={{
                  fontFamily: "var(--be-font-serif, Georgia, serif)",
                  fontSize: "clamp(20px, 3vw, 26px)",
                  fontWeight: 600,
                  letterSpacing: "-0.4px",
                  color: "var(--text-primary)",
                  margin: "0 0 8px",
                }}
              >
                See the gaps in your reasoning.
              </h3>
              <p className="text-[13.5px] leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
                We group wrong answers by the concept beneath them. 4 patterns account for 30 of 34 recent mistakes.
              </p>
              <div className="flex items-start gap-3 mt-5">
                <div
                  className="shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center"
                  style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}
                >
                  <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700, fontSize: 18, lineHeight: 1 }}>17</span>
                  <span style={{ fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8, marginTop: 2 }}>wrong</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Secondary index B+ tree calculations</p>
                  <p
                    className="text-[13px] mt-1 italic"
                    style={{ fontFamily: "var(--be-font-serif, Georgia, serif)", color: "var(--text-secondary)" }}
                  >
                    &ldquo;You miscount leaf-level capacity when fan-out exceeds key size.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Right — Ad-free solver card */}
            <div
              className="rounded-2xl p-7 flex flex-col justify-between"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ opacity: 0.85 }}>
                  Solver focus mode
                </p>
                <h3
                  style={{
                    fontFamily: "var(--be-font-serif, Georgia, serif)",
                    fontSize: "clamp(18px, 2.5vw, 24px)",
                    fontWeight: 600,
                    margin: "0 0 8px",
                  }}
                >
                  Ad-free while you&apos;re thinking.
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ opacity: 0.85 }}>
                  Ads keep BattleExam free — but they never appear on the solver or during flashcards. Ever.
                </p>
              </div>
              <p
                className="mt-8 text-[11px]"
                style={{ opacity: 0.75, fontFamily: "var(--font-geist-mono, monospace)" }}
              >
                Our contract with you.
              </p>
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
          id="topics"
          className="px-6 py-20"
          aria-labelledby="topics-heading"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                Coverage
              </p>
              <h2
                id="topics-heading"
                className="text-2xl md:text-3xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                Pick your stream. Start practicing.
              </h2>
              <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                Click any subject — you&apos;ll land directly on that topic after signing up.
              </p>
            </div>

            <TopicsExplorer data={topicsData} />
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
                "GATE · JEE · NEET · UGC NET",
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

            {/* Subject links — internal linking for crawlers */}
            <nav aria-label="GATE CSE subjects" className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-faint)" }}>
                GATE CSE Topics
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {[
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
                ].map((s) => (
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

      </div>
    </>
  );
}
