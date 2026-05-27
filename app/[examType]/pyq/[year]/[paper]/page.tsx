// app/[examType]/pyq/[year]/[paper]/page.tsx
//
// Per-paper SEO page: all questions from one specific exam sitting, in exam order.
// URL examples:
//   /gate-cse/pyq/2026/shift-1
//   /gate-cse/pyq/2014/set-1
//   /jee-main/pyq/2024/1-feb-2024-shift-1
//   /neet/pyq/2024/paper

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  parseExamSlug,
  paperSlug,
  toSlug,
  cleanTextForMeta,
} from "@/lib/seo";
import FeatureBanner from "@/components/ui/FeatureBanner";
import QuestionViewer from "@/components/question/QuestionViewer";

const BASE = "https://battleexam.com";

interface PageParams {
  examType: string;
  year: string;
  paper: string;
}

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

async function findMock(examType: string, yearNum: number, paperParam: string) {
  const exam = parseExamSlug(examType);
  if (!exam) return null;

  // Fetch only this exam+year's seeded mocks — typically 1–4 rows
  const candidates = await prisma.mockTestTemplate.findMany({
    where: {
      exam_type: exam.examType,
      mode: "seeded",
      paper_year: yearNum,
      ...(exam.branch ? { branch: exam.branch } : {}),
    },
    select: {
      id: true,
      title: true,
      exam_type: true,
      branch: true,
      total_questions: true,
      max_score: true,
      duration_secs: true,
      subjects: true,
      sections: true,
      questions: true,
    },
  });

  return candidates.find(
    (m) => paperSlug(m.title, exam.examLabel, yearNum) === paperParam,
  ) ?? null;
}

const getCachedMock = (examType: string, yearNum: number, paperParam: string) =>
  unstable_cache(
    () => findMock(examType, yearNum, paperParam),
    ["pyq-paper", examType, String(yearNum), paperParam],
    { revalidate: 86400 }
  )();

const getPatternMap = (examType: string, branch: string | null) =>
  unstable_cache(
    () =>
      prisma.pattern.findMany({
        where: {
          exam_type: examType,
          ...(branch ? { branch } : {}),
        },
        select: { id: true, subject: true, topic_name: true },
      }),
    ["pyq-pattern-map", examType, branch || "null"],
    { revalidate: 86400, tags: ["patterns"] }
  )();

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { examType, year, paper } = await params;
  const exam = parseExamSlug(examType);
  const yearNum = parseInt(year, 10);
  if (!exam || isNaN(yearNum)) return { title: "Not Found | BattleExam" };

  const mock = await getCachedMock(examType, yearNum, paper);
  if (!mock) return { title: "Not Found | BattleExam" };

  const canonical = `${BASE}/${examType}/pyq/${year}/${paper}`;
  const title = `${mock.title} – Questions with Solutions | BattleExam`;
  const description = `Solve all ${mock.total_questions} questions from ${mock.title} with detailed solutions and explanations. Interactive answer-checking, free on BattleExam.`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${mock.title} questions`,
      `${mock.title} solutions`,
      `${mock.title} answer key`,
      `${exam.fullLabel} ${yearNum} ${paper.replace(/-/g, " ")} questions`,
      `${exam.examLabel} ${yearNum} previous year paper`,
      `${mock.title} with explanation`,
    ],
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "BattleExam",
      locale: "en_IN",
      images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE}/opengraph-image`],
    },
  };
}

interface MockQuestion {
  id: string;
  year: number;
  marks: number;
  topic: string;
  images: { index: number; filename: string; type?: string }[];
  source: string;
  options: string[];
  subject: string;
  isOptional: boolean;
  explanation: string;
  sectionName: string;
  sectionIndex: number;
  question_text: string;
  question_type: string;
  correct_answer: string;
}

export default async function PaperPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { examType, year, paper } = await params;
  const exam = parseExamSlug(examType);
  const yearNum = parseInt(year, 10);
  if (!exam || isNaN(yearNum)) notFound();

  const [mock, patterns] = await Promise.all([
    getCachedMock(examType, yearNum, paper),
    getPatternMap(exam.examType, exam.branch ?? null),
  ]);
  if (!mock) notFound();

  const questions = (mock.questions as unknown as MockQuestion[]) ?? [];
  const durationMins = Math.round(mock.duration_secs / 60);
  // Map "subject::topic_name" → patternId for O(1) lookup
  const patternMap = new Map<string, string>(
    patterns.map((p) => [`${p.subject}::${p.topic_name}`, p.id]),
  );

  function questionPracticeHref(q: MockQuestion): string {
    const patternId = patternMap.get(`${q.subject}::${q.topic}`);
    const base = `/practice?${new URLSearchParams({
      exam: exam!.examLabel,
      ...(exam!.branch ? { branch: exam!.branch } : {}),
      subject: q.subject,
      ...(patternId ? { patternId } : {}),
    }).toString()}`;
    return base;
  }

  // Group questions by section
  const sectionMap = new Map<string, MockQuestion[]>();
  for (const q of questions) {
    const sec = q.sectionName || "General";
    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
    sectionMap.get(sec)!.push(q);
  }
  const sections = Array.from(sectionMap.entries());

  const canonical = `${BASE}/${examType}/pyq/${year}/${paper}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${mock.title} – All Questions`,
    url: canonical,
    numberOfItems: questions.length,
    itemListElement: questions.slice(0, 50).map((q, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: cleanTextForMeta(q.question_text, 120),
      url: canonical,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: exam.fullLabel, item: `${BASE}/${examType}` },
      { "@type": "ListItem", position: 3, name: "Previous Year Papers", item: `${BASE}/${examType}/pyq` },
      { "@type": "ListItem", position: 4, name: String(yearNum), item: `${BASE}/${examType}/pyq/${year}` },
      { "@type": "ListItem", position: 5, name: mock.title, item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

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
          <Link href={`/${examType}/pyq`} className="hover:underline">PYQ</Link>
          <span>›</span>
          <Link href={`/${examType}/pyq/${year}`} className="hover:underline">{yearNum}</Link>
          <span>›</span>
          <span style={{ color: "var(--text-primary)" }}>{mock.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            Previous Year Paper
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "var(--text-primary)" }}>
            {mock.title}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {questions.length} Questions
            </span>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {mock.max_score} Marks
            </span>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {durationMins} Min
            </span>
            <Link
              href={`/mock-tests/${toSlug(exam.examType)}/${toSlug(exam.branch || "all-subjects")}/${mock.id}`}
              className="ml-auto px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Take as Timed Mock →
            </Link>
          </div>
        </div>

        <FeatureBanner
          heading={`Practice ${mock.title} questions with full analytics — free`}
          practiceHref={`/practice?${new URLSearchParams({ exam: exam.examLabel, ...(exam.branch ? { branch: exam.branch } : {}) }).toString()}`}
        />

        {/* Sections */}
        <div className="space-y-12">
          {sections.map(([sectionName, qs]) => (
            <section key={sectionName}>
              <h2
                className="text-base font-black uppercase tracking-widest mb-5 pb-2 border-b"
                style={{ color: "var(--accent)", borderColor: "var(--border)" }}
              >
                {sectionName}
                <span className="ml-2 text-xs font-normal normal-case" style={{ color: "var(--text-muted)" }}>
                  {qs.length} questions
                </span>
              </h2>

              <div className="space-y-6">
                {qs.map((q, i) => {
                  // Global question number across all sections
                  const globalIdx = questions.indexOf(q);
                  const anchor = `q-${globalIdx + 1}`;
                  return (
                    <article key={q.id} id={anchor} className="scroll-mt-20">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span
                          className="text-[11px] font-black uppercase tracking-wider"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Q{globalIdx + 1}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                          {exam.examLabel} {q.year}
                        </span>
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
                        {q.topic && (
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {q.topic}
                          </span>
                        )}
                      </div>

                      <QuestionViewer
                        question={{
                          id: q.id,
                          prefix: "spyq",
                          questionText: q.question_text,
                          options: q.options ?? [],
                          correctAnswer: q.correct_answer,
                          explanation: q.explanation,
                          questionType: q.question_type,
                          images: q.images ?? [],
                        }}
                        practiceHref={questionPracticeHref(q)}
                      />
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t flex items-center justify-between flex-wrap gap-4" style={{ borderColor: "var(--border)" }}>
          <Link href={`/${examType}/pyq/${year}`} className="text-sm font-bold text-indigo-400 hover:underline">
            ← All {exam.fullLabel} {yearNum} papers
          </Link>
          <Link
            href={`/mock-tests/${toSlug(exam.examType)}/${toSlug(exam.branch || "all-subjects")}/${mock.id}`}
            className="px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Take as Timed Mock →
          </Link>
        </div>
      </div>
    </>
  );
}
