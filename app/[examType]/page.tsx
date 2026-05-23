// app/[examType]/page.tsx
// Per-exam SEO landing page (e.g. /gate-cse, /jee-main, /neet, /ugc-net-p1)
// Lists all subjects available for the exam with topic / question counts.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toSlug, parseExamSlug, buildExamSlug, branchWhereClause } from "@/lib/seo";

const BASE = "https://battleexam.com";

interface PageParams {
  examType: string;
}

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<PageParams[]> {
  // Skip build-time prerender. With `dynamicParams = true` and ISR, pages
  // are generated on first visit and cached for `revalidate` seconds. This
  // avoids a full-table read on every Vercel build.
  return [];
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { examType } = await params;
  const exam = parseExamSlug(examType);
  if (!exam) return { title: "Not Found | BattleExam" };

  const canonical = `${BASE}/${examType}`;
  const year = new Date().getFullYear() + 1;

  const title = `${exam.fullLabel} Preparation – Subjects, PYQs & Mock Tests | BattleExam`;
  const description = `Prepare for ${exam.fullLabel} ${year} with AI-generated pattern-based practice questions, previous year questions (PYQs) organised by subject and topic, and full-length mock tests. Free to start on BattleExam.`;

  const keywords = [
    `${exam.fullLabel} preparation`,
    `${exam.fullLabel} practice questions`,
    `${exam.fullLabel} previous year questions`,
    `${exam.fullLabel} PYQ`,
    `${exam.fullLabel} mock test`,
    `${exam.fullLabel} syllabus`,
    `${exam.fullLabel} ${year}`,
    `${exam.examLabel} preparation online`,
    `${exam.examLabel} test series`,
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "BattleExam",
      locale: "en_IN",
      images: [
        {
          url: "https://battleexam.com/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${exam.fullLabel} Preparation – BattleExam`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://battleexam.com/opengraph-image"],
    },
  };
}

export default async function ExamLandingPage({ params }: { params: Promise<PageParams> }) {
  const { examType } = await params;
  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  // All subjects (distinct) with their topic + question counts.
  const patterns = await prisma.pattern.findMany({
    where: {
      exam_type: exam.examType,
      ...branchWhereClause(exam.branch),
    },
    select: {
      subject: true,
      topic_name: true,
      _count: { select: { pyqs: true, questions: true } },
    },
  });

  if (!patterns.length) notFound();

  // Seeded previous-year papers for this exam
  const seededPapers = await prisma.mockTestTemplate.findMany({
    where: {
      exam_type: exam.examType,
      ...branchWhereClause(exam.branch),
      mode: 'seeded',
    },
    select: { id: true, title: true, branch: true, total_questions: true, max_score: true, duration_secs: true },
    orderBy: { created_at: 'desc' },
  });

  // Group by subject
  const subjectMap = new Map<string, { topics: number; questions: number; pyqs: number }>();
  for (const p of patterns) {
    const s = subjectMap.get(p.subject) ?? { topics: 0, questions: 0, pyqs: 0 };
    s.topics += 1;
    s.questions += p._count.questions;
    s.pyqs += p._count.pyqs;
    subjectMap.set(p.subject, s);
  }
  const subjects = Array.from(subjectMap.entries())
    .map(([subject, counts]) => ({ subject, ...counts }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

  const totalTopics = patterns.length;
  const totalQuestions = subjects.reduce((acc, s) => acc + s.questions + s.pyqs, 0);
  const canonical = `${BASE}/${examType}`;
  const year = new Date().getFullYear() + 1;

  const programSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    "@id": canonical,
    name: `${exam.fullLabel} Preparation`,
    description: `Pattern-based ${exam.fullLabel} preparation covering ${subjects.length} subjects and ${totalTopics} topics.`,
    url: canonical,
    educationalCredentialAwarded: `${exam.examLabel} Score`,
    educationalLevel: exam.level,
    provider: {
      "@type": "Organization",
      name: "BattleExam",
      url: BASE,
    },
    occupationalCategory: exam.fullLabel,
    inLanguage: "en-IN",
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${exam.fullLabel} Subjects`,
    description: `All subjects available for ${exam.fullLabel} preparation on BattleExam`,
    url: canonical,
    numberOfItems: subjects.length,
    itemListElement: subjects.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${exam.fullLabel} ${s.subject}`,
      url: `${BASE}/${examType}/${toSlug(s.subject)}`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: exam.fullLabel, item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(programSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-5xl mx-auto py-10 px-4">
        {/* Breadcrumb */}
        <nav
          className="text-xs font-medium mb-6 flex items-center gap-2 flex-wrap"
          style={{ color: "var(--text-secondary)" }}
        >
          <Link href="/" className="hover:underline">Home</Link>
          <span>›</span>
          <span style={{ color: "var(--text-primary)" }}>{exam.fullLabel}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            Exam preparation
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "var(--text-primary)" }}>
            {exam.fullLabel} Preparation
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Pattern-based {exam.fullLabel} preparation with AI-generated questions, previous year questions
            and full-length mock tests. {subjects.length} subjects · {totalTopics} topics · {totalQuestions} questions ·
            updated for {exam.examLabel} {year}.
          </p>
        </div>

        {/* Subject grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {subjects.map((s) => (
            <Link
              key={s.subject}
              href={`/${examType}/${toSlug(s.subject)}`}
              className="block p-4 rounded-xl border transition-colors hover:border-indigo-500/40"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="font-bold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                {s.subject}
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                {s.topics} topic{s.topics > 1 ? "s" : ""} · {s.pyqs + s.questions} questions
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {s.pyqs > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                    {s.pyqs} PYQ{s.pyqs > 1 ? "s" : ""}
                  </span>
                )}
                {s.questions > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                    {s.questions} Practice
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Previous year papers */}
        {seededPapers.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                Previous Year Papers
              </h2>
              <Link
                href={`/${examType}/pyq`}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {seededPapers.map((paper) => {
                const branchSlug = toSlug(paper.branch || "all-subjects");
                const examSlug = toSlug(exam.examType);
                const practiceUrl = `/practice?exam=${encodeURIComponent(exam.examType)}${exam.branch ? `&branch=${encodeURIComponent(exam.branch)}` : ""}&subject=Full+Papers`;
                return (
                  <div
                    key={paper.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <p className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>{paper.title}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {paper.total_questions} Questions · {paper.max_score} Marks · {Math.round(paper.duration_secs / 60)} Mins
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={practiceUrl}
                        className="px-4 py-2 rounded-xl font-bold text-sm border hover:border-indigo-500/60 transition-colors"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        Practice
                      </Link>
                      <Link
                        href={`/mock-tests/${examSlug}/${branchSlug}/${paper.id}`}
                        className="px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                      >
                        Take Mock Test →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Signup CTA */}
        <div
          className="p-6 rounded-2xl border text-center"
          style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}
        >
          <p className="font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Start practising for {exam.fullLabel} {year} — free
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Adaptive difficulty · Instant explanations · PYQs included
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Sign up free →
          </Link>
        </div>
      </div>
    </>
  );
}
