// app/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { HeroCTAs, TopicsSignUpButton, FinalCTAButton } from "@/components/landing/LandingAuthButtons";
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

export const metadata: Metadata = {
  title: "PatternMaster – AI-Powered GATE CSE Preparation | Practice Questions",
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
    title: "PatternMaster – AI-Powered GATE CSE Preparation",
    description:
      "Practice GATE CSE, ISRO & BARC with AI-generated questions tailored to each topic's core logic. Adaptive difficulty, instant explanations, progress tracking.",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "PatternMaster – AI-Powered GATE CSE Preparation",
    description:
      "Practice GATE CSE, ISRO & BARC with AI-generated questions tailored to each topic's core logic.",
  },
  alternates: {
    canonical: "/",
  },
};

// Subject icon map
const subjectIcons: Record<string, React.ReactNode> = {
  Algorithms: <Cpu size={16} />,
  "Data Structures": <Code2 size={16} />,
  "Operating Systems": <FlaskConical size={16} />,
  "Computer Networks": <Network size={16} />,
  DBMS: <Database size={16} />,
  "Computer Organization": <Cpu size={16} />,
  "Digital Logic": <Zap size={16} />,
  Default: <BookOpen size={16} />,
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

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "PatternMaster",
  description:
    "AI-powered exam preparation platform for GATE CSE, ISRO, BARC, and ESE competitive engineering exams",
  url: "https://patternmaster.in",
  educationalCredentialAwarded: "GATE Exam Preparation",
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
      name: "How is PatternMaster different from other GATE preparation platforms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PatternMaster uses AI to generate questions based on the specific atomic logic (core concept) of each GATE topic. Instead of recycling the same question banks, every question is freshly generated to test deep understanding — not pattern memorization.",
      },
    },
    {
      "@type": "Question",
      name: "Which exams does PatternMaster cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PatternMaster covers GATE CSE, ISRO CS, BARC CS, and ESE. The platform is specifically designed for Computer Science and IT branches.",
      },
    },
    {
      "@type": "Question",
      name: "Is PatternMaster free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, PatternMaster is free to get started. Create an account, select your target exam, and begin practicing AI-generated questions immediately.",
      },
    },
    {
      "@type": "Question",
      name: "How does the AI question generation work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PatternMaster uses Google Gemini to generate 5 unique questions per practice session for each GATE topic. Questions are generated at Easy, Medium, or Hard difficulty and are deduplicated using semantic hashing to ensure you always get fresh content.",
      },
    },
  ],
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Select Your Exam & Branch",
    description:
      "Choose from GATE, ISRO, BARC, or ESE. Pick your branch — CSE, IT, ECE, or ME. The platform personalises your syllabus instantly.",
    icon: Target,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    step: "02",
    title: "Practice Topic by Topic",
    description:
      "Every GATE topic has an atomic logic — the one concept that all questions test. Our AI generates fresh questions targeting exactly that logic.",
    icon: Zap,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    step: "03",
    title: "Track & Review Weak Areas",
    description:
      "Your dashboard shows accuracy per topic, your streak, and which concepts need critical review. Study smarter, not harder.",
    icon: BarChart3,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

const STATS = [
  { value: "50+", label: "GATE Topics Covered" },
  { value: "3", label: "Difficulty Levels" },
  { value: "4", label: "Exams Supported" },
  { value: "∞", label: "Unique AI Questions" },
];

const FAQS = [
  {
    q: "How is PatternMaster different from other GATE platforms?",
    a: "Most platforms recycle the same question bank. PatternMaster's AI generates fresh questions every time, each targeting the specific atomic logic of the topic — the exact thinking pattern GATE examiners test.",
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
    a: "Every generated question gets a semantic fingerprint (SHA-256 hash of the normalized text). If an identical question already exists in the database, it's skipped. This guarantees a growing bank of unique questions.",
  },
  {
    q: "What is 'atomic logic' in a topic?",
    a: "Every GATE question on, say, 'Merge Sort' ultimately tests one thing: understanding how divide-and-conquer recurrences work. That's the atomic logic. Practicing around that core makes you exam-ready faster than reading textbook chapters.",
  },
];

export default async function HomePage() {
  const { userId } = await auth();

  // Authenticated users go straight to practice
  if (userId) {
    redirect("/practice");
  }

  // Fetch real patterns from DB for the topics section (public, no user context)
  const gatePatterns = await prisma.pattern.findMany({
    where: { exam_type: "GATE", branch: "CSE" },
    select: { 
      id: true, 
      topic_name: true, 
      subject: true, 
      atomic_logic: true,
      _count: {
        select: { pyqs: true }
      }
    },
    orderBy: { subject: "asc" },
    take: 24, // Show a representative preview
  });

  // Group by subject for display
  const bySubject: Record<string, typeof gatePatterns> = {};
  for (const p of gatePatterns) {
    const s = p.subject ?? "Other";
    if (!bySubject[s]) bySubject[s] = [];
    bySubject[s].push(p);
  }

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <div className="min-h-screen bg-[#0a0a0a] text-white">

        {/* ═══════════════════════════════════════
            HERO
        ═══════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-24 pb-20 px-4">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[500px] w-[800px] rounded-full bg-indigo-600/10 blur-[120px]" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              AI-Powered GATE Preparation
            </div>

            {/* H1 — primary keyword target */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              Crack{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                GATE CSE
              </span>
              <br />
              with Pattern-Based AI Practice
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
              Every GATE question tests one core idea. PatternMaster's AI generates
              fresh questions around that exact logic — so you practice smarter, not longer.
              Built for GATE, ISRO, BARC &amp; ESE.
            </p>

            {/* CTAs */}
            <HeroCTAs />

            {/* Mini trust bar */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-white/30 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" /> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" /> GATE 2027 syllabus
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" /> Adaptive difficulty
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" /> Instant AI explanations
              </span>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STATS BAR
        ═══════════════════════════════════════ */}
        <section className="border-y border-white/5 bg-white/[0.02] py-10 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-black bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            HOW IT WORKS
        ═══════════════════════════════════════ */}
        <section className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                How PatternMaster Works
              </h2>
              <p className="text-white/40 max-w-xl mx-auto">
                A focused, three-step loop that builds real exam confidence — not false familiarity with repeated questions.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="relative p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                >
                  <span className="absolute top-6 right-6 text-[11px] font-black text-white/10 tracking-widest">
                    {item.step}
                  </span>
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center mb-6`}>
                    <item.icon size={22} className={item.color} />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-3 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            TOPICS / PATTERNS SECTION
            (Real DB data — great for SEO long-tail keywords)
        ═══════════════════════════════════════ */}
        <section className="py-20 px-4 bg-white/[0.015] border-y border-white/5" aria-labelledby="topics-heading">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">
                GATE CSE Syllabus Coverage
              </p>
              <h2 id="topics-heading" className="text-3xl md:text-4xl font-black mb-4">
                Every Topic. Every Pattern.
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto text-sm leading-relaxed">
                PatternMaster covers the full GATE CSE syllabus — from sorting algorithms and
                recurrence relations to database normalisation and network protocols. Each topic
                maps to its core exam logic so you know exactly what to practice.
              </p>
            </div>

            {/* Subject groups */}
            <div className="space-y-10">
              {Object.entries(bySubject).map(([subject, patterns]) => {
                const colorClass = SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.Default;
                const icon = subjectIcons[subject] ?? subjectIcons.Default;

                return (
                  <div key={subject}>
                    {/* Subject heading */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${colorClass}`}>
                        {icon}
                        {subject}
                      </span>
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                        {patterns.length} topics
                      </span>
                    </div>

                    {/* Topic chips */}
                    <div className="flex flex-wrap gap-2">
                      {patterns.map((p) => (
                        <div
                          key={p.id}
                          className="group relative px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all cursor-default"
                          title={p.atomic_logic ?? undefined}
                        >
                          <span className="text-xs font-semibold text-white/70 group-hover:text-white/90 transition-colors">
                            {p.topic_name}
                          </span>
                          {p._count.pyqs > 0 && (
                            <span className="ml-2 text-[8px] font-black bg-orange-500/10 text-orange-400 px-1 py-0.5 rounded uppercase tracking-tighter">
                              {p._count.pyqs} PYQ
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA below topics */}
            <div className="mt-14 text-center">
              <p className="text-white/30 text-sm mb-5">
                Sign up to unlock AI practice questions for every topic above.
              </p>
              <TopicsSignUpButton />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FEATURE HIGHLIGHTS
        ═══════════════════════════════════════ */}
        <section className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Built for Serious GATE Aspirants
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5">
                  <Zap size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-bold text-lg mb-3">AI-Generated, Never Repeated</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Google Gemini generates 5 unique questions per session. Semantic hashing
                  guarantees you never see the same question twice — your question bank grows
                  with every practice run.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-violet-500/5 to-transparent">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5">
                  <Target size={18} className="text-violet-400" />
                </div>
                <h3 className="font-bold text-lg mb-3">Atomic Logic Targeting</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Each GATE topic has one core concept examiners always test. PatternMaster
                  identifies that atomic logic and generates questions that probe exactly it —
                  at Easy, Medium, and Hard difficulty.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5">
                  <BarChart3 size={18} className="text-emerald-400" />
                </div>
                <h3 className="font-bold text-lg mb-3">Progress You Can See</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Your dashboard tracks accuracy per topic, flags critical weak areas, and
                  shows recent attempt history. Know exactly where you stand before exam day.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-cyan-500/5 to-transparent">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5">
                  <BookOpen size={18} className="text-cyan-400" />
                </div>
                <h3 className="font-bold text-lg mb-3">Covers GATE, ISRO, BARC & ESE</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  One platform, four exams. Patterns are tagged by exam type so you only
                  study what's relevant to your target. Switch exams instantly without losing
                  your progress.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FAQ (structured data already injected above)
        ═══════════════════════════════════════ */}
        <section className="py-20 px-4 border-t border-white/5" aria-labelledby="faq-heading">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <h2 id="faq-heading" className="text-3xl font-black mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-white/40 text-sm">
                Everything you need to know before you start.
              </p>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq) => (
                <div
                  key={faq.q}
                  className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
                >
                  <h3 className="font-bold text-white mb-2 text-sm leading-snug">
                    {faq.q}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FINAL CTA
        ═══════════════════════════════════════ */}
        <section className="py-24 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-8 shadow-2xl shadow-indigo-500/30">
              <Brain size={28} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
              Your GATE Rank is Decided
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                by How You Practice
              </span>
            </h2>
            <p className="text-white/40 mb-10 max-w-xl mx-auto leading-relaxed">
              Stop re-reading textbooks. Start practicing the exact patterns GATE examiners use.
              PatternMaster is free — your first question is one click away.
            </p>
            <FinalCTAButton />
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════ */}
        <footer className="border-t border-white/5 py-10 px-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white/60">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
                <Brain size={14} />
              </span>
              <span className="font-bold text-sm">
                Pattern<span className="text-violet-400">Master</span>
              </span>
            </div>
            <p className="text-xs text-white/20 text-center">
              AI-powered GATE CSE, ISRO, BARC & ESE preparation. Practice smarter, rank higher.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/30">
              <Link href="/sign-in" className="hover:text-white/60 transition-colors">Sign In</Link>
              <Link href="/sign-up" className="hover:text-white/60 transition-colors">Sign Up</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
