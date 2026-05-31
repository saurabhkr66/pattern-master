// app/[examType]/pyq/[year]/page.tsx
// Year-wise PYQ SEO page: all questions from a specific exam year, grouped by subject.
// URL example: /gate-cse/pyq/2023

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  parseExamSlug,
  branchWhereClause,
  toSlug,
  cleanTextForMeta,
  paperSlug,
  type ExamSeoInfo,
} from "@/lib/seo";
import FeatureBanner from "@/components/ui/FeatureBanner";

const BASE = "https://battleexam.com";

interface PageParams {
  examType: string;
  year: string;
}

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { examType, year } = await params;
  const exam = parseExamSlug(examType);
  const yearNum = parseInt(year, 10);
  if (!exam || isNaN(yearNum)) return { title: "Not Found | BattleExam" };

  const canonical = `${BASE}/${examType}/pyq/${year}`;
  const title = `${exam.fullLabel} ${yearNum} Previous Year Questions (PYQ) with Solutions | BattleExam`;
  const description = `Solve all ${exam.fullLabel} ${yearNum} previous year questions with detailed solutions and explanations. Topic-wise organised, free on BattleExam.`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${exam.fullLabel} ${yearNum} previous year questions`,
      `${exam.fullLabel} ${yearNum} PYQ`,
      `${exam.fullLabel} ${yearNum} question paper`,
      `${exam.fullLabel} ${yearNum} questions with solutions`,
      `${exam.examLabel} ${yearNum} PYQ PDF`,
      `${exam.examLabel} ${yearNum} paper solutions`,
      `${exam.fullLabel} previous year ${yearNum}`,
    ],
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "BattleExam",
      locale: "en_IN",
      images: [
        {
          url: `${BASE}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${exam.fullLabel} ${yearNum} PYQ – BattleExam`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE}/opengraph-image`],
    },
  };
}

interface SubjectGroup {
  subject: string;
  questions: {
    id: string;
    question_text: string;
    correct_answer: string;
    explanation: string;
    question_type: string;
    marks: number;
    topic: string | null;
    pattern: { topic_name: string; subject: string };
  }[];
}

export default async function YearPYQPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { examType, year } = await params;
  const exam = parseExamSlug(examType);
  const yearNum = parseInt(year, 10);
  if (!exam || isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear()) notFound();

  const [pyqs, mockPapers] = await Promise.all([
    prisma.pYQ.findMany({
      where: {
        exam_type: exam.examType,
        year: yearNum,
        pattern: branchWhereClause(exam.branch),
      },
      select: {
        id: true,
        question_text: true,
        correct_answer: true,
        explanation: true,
        question_type: true,
        marks: true,
        topic: true,
        pattern: { select: { topic_name: true, subject: true } },
      },
      orderBy: [{ pattern: { subject: "asc" } }, { id: "asc" }],
    }),
    prisma.mockTestTemplate.findMany({
      where: {
        exam_type: exam.examType,
        mode: "seeded",
        paper_year: yearNum,
        ...(exam.branch ? { branch: exam.branch } : {}),
      },
      select: { id: true, title: true, total_questions: true, max_score: true, duration_secs: true, branch: true },
    }),
  ]);

  // Derive slugs for the year's papers
  const yearPapers = mockPapers.map((m) => ({
    ...m,
    slug: paperSlug(m.title, exam.examLabel, yearNum),
  }));

  if (pyqs.length === 0 && yearPapers.length === 0) notFound();

  // Group by subject
  const subjectMap = new Map<string, SubjectGroup>();
  for (const q of pyqs) {
    const subj = q.pattern.subject;
    if (!subjectMap.has(subj)) {
      subjectMap.set(subj, { subject: subj, questions: [] });
    }
    subjectMap.get(subj)!.questions.push(q);
  }
  const groups = Array.from(subjectMap.values());

  const canonical = `${BASE}/${examType}/pyq/${year}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${exam.fullLabel} ${yearNum} Previous Year Questions`,
    url: canonical,
    numberOfItems: pyqs.length,
    itemListElement: pyqs.slice(0, 50).map((q, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: cleanTextForMeta(q.question_text, 120),
      url: `${BASE}/${examType}/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: exam.fullLabel, item: `${BASE}/${examType}` },
      { "@type": "ListItem", position: 3, name: "Previous Year Papers", item: `${BASE}/${examType}/pyq` },
      { "@type": "ListItem", position: 4, name: String(yearNum), item: canonical },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <nav
          className="text-xs font-medium mb-6 flex items-center gap-2 flex-wrap"
          style={{ color: "var(--text-secondary)" }}
        >
          <Link href="/" className="hover:underline">Home</Link>
          <span>›</span>
          <Link href={`/${examType}`} className="hover:underline">{exam.fullLabel}</Link>
          <span>›</span>
          <Link href={`/${examType}/pyq`} className="hover:underline">Previous Year Papers</Link>
          <span>›</span>
          <span style={{ color: "var(--text-primary)" }}>{yearNum}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            Previous Year Questions
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "var(--text-primary)" }}>
            {exam.fullLabel} {yearNum} PYQ
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            {yearPapers.length > 0 && <>{yearPapers.length} paper{yearPapers.length > 1 ? "s" : ""} · </>}
            {pyqs.length > 0 && <>{pyqs.length} questions — organised by subject with solutions and explanations.</>}
          </p>
        </div>

        <FeatureBanner
          heading={`Practice ${exam.fullLabel} ${yearNum} PYQs with full analytics — free`}
          practiceHref={`/practice?${new URLSearchParams({ exam: exam.examLabel, ...(exam.branch ? { branch: exam.branch } : {}) }).toString()}`}
        />

        {/* Paper cards — links to per-paper pages */}
        {yearPapers.length > 0 && (
          <div className="mb-12">
            <h2 className="text-base font-black mb-4" style={{ color: "var(--text-primary)" }}>
              Papers
            </h2>
            <div className="flex flex-col gap-3">
              {yearPapers.map((p) => (
                <Link
                  key={p.id}
                  href={`/${examType}/pyq/${year}/${p.slug}`}
                  prefetch={false}
                  className="flex items-center justify-between gap-4 p-5 rounded-2xl border hover:border-indigo-500/50 transition-colors"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                >
                  <div>
                    <p className="font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>
                      {p.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {p.total_questions} Questions · {p.max_score} Marks · {Math.round(p.duration_secs / 60)} Min
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-400 shrink-0">View Paper →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Subject groups */}
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.subject}>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-black"
                  style={{ color: "var(--text-primary)" }}
                >
                  {group.subject}
                  <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                    {group.questions.length} questions
                  </span>
                </h2>
                <Link
                  href={`/${examType}/${toSlug(group.subject)}`}
                  prefetch={false}
                  className="text-xs font-bold text-indigo-400 hover:underline"
                >
                  All {group.subject} topics →
                </Link>
              </div>

              <div className="space-y-3">
                {group.questions.map((q, i) => (
                  <Link
                    key={q.id}
                    href={`/${examType}/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}`}
                    prefetch={false}
                    className="block p-4 rounded-xl border hover:border-indigo-500/50 transition-colors"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="text-[11px] font-black uppercase tracking-wider shrink-0 mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Q{i + 1}
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-sm leading-relaxed line-clamp-2"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {cleanTextForMeta(q.question_text, 200)}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}
                          >
                            {q.question_type}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}
                          >
                            {q.marks}M
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {q.pattern.topic_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Navigation to other years */}
        <div className="mt-12 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href={`/${examType}/pyq`}
            className="text-sm font-bold text-indigo-400 hover:underline"
          >
            ← View all {exam.fullLabel} previous year papers
          </Link>
        </div>
      </div>
    </>
  );
}
