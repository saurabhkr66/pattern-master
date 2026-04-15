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
} from "lucide-react";
import { toSlug } from "@/lib/seo";

export const metadata: Metadata = {
  title: "BattleExam – AI-Powered GATE CSE Preparation | Practice Questions",
  description:
    "Master GATE CSE, ISRO, BARC & ESE with AI-generated pattern-based questions. Practice algorithms, data structures, OS, DBMS, and networks with adaptive difficulty. Free to start.",
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
    "AI exam practice",
    "GATE 2026",
    "GATE 2027",
    "pattern based learning",
  ],
  openGraph: {
    title: "BattleExam – AI-Powered GATE CSE Preparation",
    description:
      "Practice GATE CSE, ISRO & BARC with AI-generated questions tailored to each topic's core logic. Adaptive difficulty, instant explanations, progress tracking.",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "BattleExam – AI-Powered GATE CSE Preparation",
    description:
      "Practice GATE CSE, ISRO & BARC with AI-generated questions tailored to each topic's core logic.",
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
  description: "AI-powered exam preparation platform for GATE CSE, ISRO, BARC, and ESE",
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
        text: "BattleExam uses AI to generate questions based on the specific atomic logic of each GATE topic — not recycled question banks.",
      },
    },
    {
      "@type": "Question",
      name: "Which exams does BattleExam cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GATE CSE, ISRO CS, BARC CS, and ESE.",
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
    n: "1",
    title: "Pick a topic",
    body: "Choose any GATE CSE topic. See the one core idea that all exam questions for it test.",
    icon: Target,
    accent: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/15",
  },
  {
    n: "2",
    title: "Practice with fresh AI questions",
    body: "Gemini generates 5 unique questions every session. Easy, Medium, or Hard — your call. You never see the same question twice.",
    icon: Zap,
    accent: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/15",
  },
  {
    n: "3",
    title: "Track what needs work",
    body: "Your dashboard shows accuracy by topic and surfaces wrong answers for review. Know exactly where you stand.",
    icon: BarChart3,
    accent: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/15",
  },
];

const STATS = [
  { value: "50+", label: "GATE Topics" },
  { value: "3", label: "Difficulty Levels" },
  { value: "4", label: "Exams" },
  { value: "∞", label: "AI Questions" },
];

const FAQS = [
  {
    q: "How is BattleExam different from other GATE platforms?",
    a: "Most platforms recycle the same question bank. BattleExam's AI generates fresh questions every time, each targeting the specific atomic logic of the topic — the exact thinking pattern GATE examiners test.",
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
    q: "How does the AI generate questions without repeating them?",
    a: "Every generated question gets a semantic fingerprint. If an identical question already exists in the database, it's skipped — guaranteeing a growing bank of unique questions.",
  },
  {
    q: "What is 'atomic logic' in a topic?",
    a: "Every GATE question on 'Merge Sort' ultimately tests one thing: how divide-and-conquer recurrences work. That's the atomic logic. Practicing around that core makes you exam-ready faster than reading chapters.",
  },
];

// The mock options for the hero card
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
          {/* Ambient glow — sits behind everything */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[420px] w-[700px] rounded-full opacity-30 blur-[100px]"
            style={{ background: "radial-gradient(ellipse, #6366f1 0%, transparent 70%)" }}
          />

          <div className="relative max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* LEFT ── headline + CTAs */}
              <div className="flex-1 min-w-0">
                {/* Eyebrow */}
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-5">
                  AI-Powered GATE Preparation
                </p>

                <h1
                  className="text-4xl md:text-[52px] font-black leading-[1.1] tracking-tight mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Practice GATE CSE
                  <br />
                  <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    the smart way.
                  </span>
                </h1>

                <p
                  className="text-base leading-relaxed mb-8 max-w-md"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Every topic has one core pattern examiners test. BattleExam's AI
                  generates fresh questions around exactly that — for GATE, ISRO, BARC &amp; ESE.
                </p>

                <HeroCTAs />

                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6">
                  {["Free to start", "GATE 2027 syllabus", "Instant explanations"].map((t) => (
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

              {/* RIGHT ── practice card */}
              <div className="hidden lg:block flex-shrink-0 w-[340px]">
                {/* Label above card */}
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-3 text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  Live practice session
                </p>

                {/* Card with ambient glow behind */}
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-2xl blur-2xl opacity-20 scale-95"
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
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Algorithms
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-400 uppercase tracking-wider">
                        Hard
                      </span>
                    </div>

                    {/* Question */}
                    <div className="px-4 pt-4 pb-3">
                      <p
                        className="text-sm font-semibold leading-snug mb-4"
                        style={{ color: "var(--text-primary)" }}
                      >
                        What is the recurrence relation for Merge Sort on{" "}
                        <span className="font-mono text-violet-400">n</span> elements?
                      </p>

                      <div className="space-y-2">
                        {MOCK_OPTIONS.map((opt) => (
                          <div
                            key={opt.label}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-mono ${
                              opt.correct
                                ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                                : "text-[--text-muted]"
                            }`}
                            style={
                              opt.correct
                                ? undefined
                                : { borderColor: "var(--border)", background: "var(--bg-surface-2)" }
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
                        Correct — here&apos;s why
                      </p>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Merge Sort splits into 2 sub-problems of size n/2 (→ 2T(n/2)) and merges
                        in O(n), giving O(n log n) overall.
                      </p>
                    </div>

                    {/* Progress bar strip */}
                    <div
                      className="px-4 py-2.5 flex items-center justify-between border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Question 3 of 5
                      </span>
                      <div
                        className="flex gap-1"
                      >
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className={`w-5 h-1 rounded-full ${
                              i === 3
                                ? "bg-indigo-500"
                                : i < 3
                                ? "bg-emerald-500"
                                : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────── */}
        <div
          className="border-y py-8 px-6"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
        >
          <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p
                  className="text-3xl font-black mb-0.5"
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
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-black mb-12 text-center"
              style={{ color: "var(--text-primary)" }}
            >
              How it works
            </h2>

            <div className="grid md:grid-cols-3 gap-5">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className={`relative p-6 rounded-2xl border ${step.border} ${step.bg}`}
                >
                  {/* Step number — large, faded, top right */}
                  <span
                    className={`absolute top-4 right-5 text-5xl font-black leading-none ${step.accent} opacity-10 select-none`}
                  >
                    {step.n}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center mb-4`}
                  >
                    <step.icon size={17} className={step.accent} />
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

        {/* ── TOPICS ───────────────────────────────── */}
        <section
          className="px-6 py-20 border-y"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
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
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:border-indigo-500/40 hover:text-indigo-400"
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
        <section className="px-6 py-20" aria-labelledby="faq-heading">
          <div className="max-w-2xl mx-auto">
            <h2
              id="faq-heading"
              className="text-2xl md:text-3xl font-black mb-10 text-center"
              style={{ color: "var(--text-primary)" }}
            >
              FAQ
            </h2>
            <FAQAccordion faqs={FAQS} />
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────── */}
        <section
          className="px-6 py-20 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="max-w-xl mx-auto text-center">
            <h2
              className="text-3xl md:text-4xl font-black mb-3 leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Your GATE rank is decided
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                by how you practice.
              </span>
            </h2>
            <p
              className="text-sm mb-8"
              style={{ color: "var(--text-muted)" }}
            >
              BattleExam is free. Start now.
            </p>
            <div className="flex justify-center">
              <FinalCTAButton />
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────── */}
        <footer
          className="border-t px-6 py-8"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
                <Brain size={13} />
              </span>
              <span className="font-bold text-sm">
                Battle<span className="text-violet-400">Exam</span>
              </span>
            </div>
            <p className="text-[11px] text-center" style={{ color: "var(--text-faint)" }}>
              AI-powered GATE CSE, ISRO, BARC &amp; ESE preparation.
            </p>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
              <Link href="/sign-in" className="hover:underline">Sign in</Link>
              <Link href="/sign-up" className="hover:underline">Sign up</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
