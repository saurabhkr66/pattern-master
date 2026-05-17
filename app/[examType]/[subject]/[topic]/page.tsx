// app/[examType]/[subject]/[topic]/page.tsx
//
// Public SEO surface: a *rich* topic page that hosts every question in the
// topic inline (paginated). This replaces the old design where each question
// got its own ultra-thin URL — Google was crawling those but not indexing
// them because the per-question pages had ~50–200 words of content.
//
// URL example: /gate-cse/algorithms/divide-and-conquer
//              /gate-cse/algorithms/divide-and-conquer?page=2

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  toSlug,
  cleanTextForMeta,
  parseExamSlug,
  buildExamSlug,
  isCommonBranch,
  TOPIC_PAGE_SIZE,
  type ExamSeoInfo,
} from "@/lib/seo";
import QuestionViewer from "@/components/question/QuestionViewer";

// Slug-matching needs every pattern for the exam_type, but the result is
// identical across every topic page of the same exam. Cache the small slug
// index (~30 KB per exam) so each crawl of N topic URLs is 1 query, not N.
const getExamPatternIndex = unstable_cache(
  async (examType: string) => {
    return prisma.pattern.findMany({
      where: { exam_type: { equals: examType, mode: "insensitive" } },
      select: { id: true, topic_name: true, subject: true, branch: true, exam_type: true },
    });
  },
  ["exam-pattern-slug-index"],
  { revalidate: 3600, tags: ["patterns"] },
);

const BASE = "https://battleexam.com";
const PAGE_SIZE = TOPIC_PAGE_SIZE;

interface PageParams {
  examType: string;
  subject: string;
  topic: string;
}

interface PageSearchParams {
  page?: string;
}

function unslug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<PageParams[]> {
  // Skip build-time prerender. With `dynamicParams = true` and ISR, pages
  // are generated on first visit and cached for `revalidate` seconds. This
  // avoids loading every pattern + every question on every Vercel build.
  return [];
}

// ────────────────────────────────────────────────────────────────────────────
// Data fetch — Step 1 resolves slug to pattern id (cheap); Step 2 loads all
// questions with the fields QuestionViewer needs.
// ────────────────────────────────────────────────────────────────────────────

async function fetchPattern(
  exam: ExamSeoInfo,
  subjectLabel: string,
  topicSlug: string,
  pageNum: number,
  pageSize: number,
) {
  // Match by slug equivalence in memory rather than strict DB string equality —
  // exam_type / branch / subject may all be stored with varying casing or
  // null branches (legacy data), so we fetch a generous candidate set and
  // filter using the same `toSlug` normalisation the URL was built from.
  const examTypeSlug = toSlug(exam.examType);
  const branchSlug = exam.branch ? toSlug(exam.branch) : null;
  const subjectSlug = toSlug(subjectLabel);

  const candidates = await getExamPatternIndex(exam.examType);

  // Filter to rows whose buildExamSlug + subject slug + topic slug all match.
  const matched = candidates.filter((p) => {
    if (toSlug(p.exam_type) !== examTypeSlug) return false;
    // Branch: a URL with no branch slug (or our resolver returning "common"
    // as a tolerant fallback) matches rows with branch=null OR branch="Common".
    // A URL with a real branch like "cse" must match that branch exactly.
    const urlAbsentBranch = !branchSlug || branchSlug === "common";
    const rowAbsentBranch = !p.branch || isCommonBranch(p.branch);
    if (urlAbsentBranch !== rowAbsentBranch) return false;
    if (!urlAbsentBranch && p.branch && toSlug(p.branch) !== branchSlug) return false;
    if (toSlug(p.subject) !== subjectSlug) return false;
    return toSlug(p.topic_name) === topicSlug;
  });

  const match = matched[0];
  if (!match) return null;

  // First fetch pattern metadata + relation counts (cheap, no question bodies).
  const meta = await prisma.pattern.findUnique({
    where: { id: match.id },
    select: {
      id: true,
      subject: true,
      atomic_logic: true,
      short_notes: true,
      _count: { select: { pyqs: true, questions: true } },
    },
  });
  if (!meta) return null;

  const pyqCount = meta._count.pyqs;
  const gqCount = meta._count.questions;
  const totalQ = pyqCount + gqCount;

  // Combined order on the page is: all PYQs first, then all generated
  // questions. Slice the requested page across both buckets so we only read
  // the rows we actually render — a single topic can have hundreds of
  // questions and pulling them all per render was the egress hot spot.
  const offset = (pageNum - 1) * pageSize;
  const end = offset + pageSize;

  const pyqSelect = {
    id: true,
    question_text: true,
    question_text_hindi: true,
    options: true,
    options_hindi: true,
    correct_answer: true,
    explanation: true,
    explanation_hindi: true,
    year: true,
    question_type: true,
    images: true,
  } as const;
  const gqSelect = {
    id: true,
    question_text: true,
    question_text_hindi: true,
    options: true,
    options_hindi: true,
    correct_answer: true,
    explanation: true,
    explanation_hindi: true,
    difficulty_level: true,
    question_type: true,
    images: true,
  } as const;

  const pyqsPromise =
    offset < pyqCount
      ? prisma.pYQ.findMany({
          where: { pattern_id: match.id },
          orderBy: [{ year: "desc" }, { id: "asc" }],
          skip: offset,
          take: Math.min(end, pyqCount) - offset,
          select: pyqSelect,
        })
      : Promise.resolve([]);

  const questionsPromise =
    end > pyqCount
      ? prisma.generatedQuestion.findMany({
          where: { pattern_id: match.id },
          orderBy: [{ difficulty_level: "asc" }, { id: "asc" }],
          skip: Math.max(0, offset - pyqCount),
          take: end - Math.max(offset, pyqCount),
          select: gqSelect,
        })
      : Promise.resolve([]);

  const [pyqs, questions] = await Promise.all([pyqsPromise, questionsPromise]);

  return {
    id: meta.id,
    subject: meta.subject,
    atomic_logic: meta.atomic_logic,
    short_notes: meta.short_notes,
    pyqs,
    questions,
    totalQ,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Metadata
// ────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const { examType, subject, topic } = await params;
  const { page: pageParam } = await searchParams;
  const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const exam = parseExamSlug(examType);
  if (!exam) return { title: "Not Found | BattleExam" };

  const subjectLabel = unslug(subject);
  const topicLabel = unslug(topic);
  const year = new Date().getFullYear() + 1;

  const basePath = `${BASE}/${examType}/${subject}/${topic}`;
  const canonical = pageNum === 1 ? basePath : `${basePath}?page=${pageNum}`;
  const pageSuffix = pageNum > 1 ? ` – Page ${pageNum}` : "";

  const title = `${topicLabel} – ${exam.fullLabel} ${subjectLabel} Practice Questions & PYQs${pageSuffix} | BattleExam`;
  const description = `Practise ${topicLabel} for ${exam.fullLabel} ${year} with all previous year questions and AI-generated practice questions. Solutions and explanations included. Free on BattleExam.`;

  const keywords = [
    `${topicLabel} ${exam.examLabel}`,
    `${topicLabel} practice questions`,
    `${exam.fullLabel} ${subjectLabel} ${topicLabel}`,
    `${topicLabel} previous year questions`,
    `${topicLabel} PYQ ${exam.examLabel}`,
    `${exam.examLabel} ${topicLabel} questions`,
    `${topicLabel} ${exam.fullLabel} ${year}`,
    `${topicLabel} questions and answers`,
    `${topicLabel} ${exam.examLabel} pattern`,
    `${exam.fullLabel} ${subjectLabel} ${topicLabel} MCQ`,
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
          alt: `${topicLabel} – ${exam.fullLabel} Practice Questions | BattleExam`,
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

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

type CombinedQuestion =
  | {
      source: "pyq";
      id: string;
      questionText: string;
      questionTextHindi?: string | null;
      options: string[];
      optionsHindi?: string[] | null;
      correctAnswer: string;
      explanation: string;
      explanationHindi?: string | null;
      questionType: string;
      year: number;
      images?: { index: number; filename: string; type?: string }[] | null;
    }
  | {
      source: "gq";
      id: string;
      questionText: string;
      questionTextHindi?: string | null;
      options: string[];
      optionsHindi?: string[] | null;
      correctAnswer: string;
      explanation: string;
      explanationHindi?: string | null;
      questionType: string;
      difficulty: string;
      images?: { index: number; filename: string; type?: string }[] | null;
    };

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { examType, subject, topic } = await params;
  const { page: pageParam } = await searchParams;
  const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  const subjectLabel = unslug(subject);
  const topicLabel = unslug(topic);

  const pattern = await fetchPattern(exam, subjectLabel, topic, pageNum, PAGE_SIZE);
  if (!pattern) notFound();

  const basePath = `/${examType}/${subject}/${topic}`;
  const canonical = pageNum === 1 ? `${BASE}${basePath}` : `${BASE}${basePath}?page=${pageNum}`;
  const year = new Date().getFullYear() + 1;

  // PYQs + Generated Questions for this page (already sliced in fetchPattern).
  // PYQs first (more authoritative SEO surface), then GQs.
  const combined: CombinedQuestion[] = [
    ...pattern.pyqs.map((q): CombinedQuestion => ({
      source: "pyq",
      id: q.id,
      questionText: q.question_text,
      questionTextHindi: q.question_text_hindi,
      options: (q.options as string[]) ?? [],
      optionsHindi: (q.options_hindi as string[] | null) ?? null,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      explanationHindi: q.explanation_hindi,
      questionType: q.question_type,
      year: q.year,
      images: (q.images as any) ?? null,
    })),
    ...pattern.questions.map((q): CombinedQuestion => ({
      source: "gq",
      id: q.id,
      questionText: q.question_text,
      questionTextHindi: q.question_text_hindi,
      options: (q.options as string[]) ?? [],
      optionsHindi: (q.options_hindi as string[] | null) ?? null,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      explanationHindi: q.explanation_hindi,
      questionType: q.question_type,
      difficulty: q.difficulty_level,
      images: (q.images as any) ?? null,
    })),
  ];

  const totalQ = pattern.totalQ;
  const totalPages = Math.max(1, Math.ceil(totalQ / PAGE_SIZE));
  if (pageNum > totalPages) notFound();

  const start = (pageNum - 1) * PAGE_SIZE;
  const pageQuestions = combined;

  // ── JSON-LD ──────────────────────────────────────────────────────────────
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${topicLabel} ${exam.fullLabel} Practice Questions`,
    description:
      pattern.atomic_logic ||
      `Practice questions for ${topicLabel} in ${exam.fullLabel}`,
    url: canonical,
    numberOfItems: totalQ,
    itemListElement: pageQuestions.map((q, i) => ({
      "@type": "ListItem",
      position: start + i + 1,
      name:
        q.source === "pyq"
          ? `${topicLabel} – ${exam.fullLabel} ${q.year} ${q.questionType} Question`
          : `${topicLabel} – ${q.difficulty} Practice Question`,
      url: `${canonical}#q-${q.source}-${q.id}`,
      description: cleanTextForMeta(q.questionText, 120),
    })),
  };

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${topicLabel} – ${exam.fullLabel}`,
    description:
      pattern.atomic_logic ||
      `Master ${topicLabel} for ${exam.fullLabel} with pattern-based practice`,
    provider: {
      "@type": "Organization",
      name: "BattleExam",
      url: BASE,
    },
    educationalLevel: exam.level,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
    },
    about: `${subjectLabel} – ${topicLabel}`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      {
        "@type": "ListItem",
        position: 2,
        name: subjectLabel,
        item: `${BASE}/${examType}/${subject}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: topicLabel,
        item: `${BASE}${basePath}`,
      },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="max-w-4xl mx-auto py-10 px-4">
        {/* Breadcrumb */}
        <nav
          className="text-xs font-medium mb-6 flex items-center gap-2 flex-wrap"
          style={{ color: "var(--text-secondary)" }}
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>›</span>
          <Link href={`/${examType}/${subject}`} className="hover:underline">
            {subjectLabel}
          </Link>
          <span>›</span>
          <span style={{ color: "var(--text-primary)" }}>{topicLabel}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            {exam.fullLabel} · {subjectLabel}
          </p>
          <h1
            className="text-3xl md:text-4xl font-black mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {topicLabel} Practice Questions
          </h1>
          {pattern.atomic_logic && (
            <p
              className="text-sm max-w-2xl mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {pattern.atomic_logic}
            </p>
          )}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {totalQ} questions · {pattern.pyqs.length} PYQs · {pattern.questions.length} AI practice · {exam.fullLabel} {year}
          </p>
        </header>

        {/* Concept summary — short_notes is the richest topic content we have */}
        {pattern.short_notes && (
          <section
            className="mb-10 p-5 rounded-2xl border"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <h2
              className="text-sm font-black uppercase tracking-widest mb-3"
              style={{ color: "var(--accent)" }}
            >
              📘 {topicLabel} – Concept Summary
            </h2>
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-primary)" }}
            >
              {pattern.short_notes}
            </div>
          </section>
        )}

        {/* Practice Mode promo card — shown only on page 1 so users on
            deeper pagination pages don't see the same nag repeatedly. */}
        {pageNum === 1 && (
          <section
            className="mb-10 p-6 rounded-2xl border relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.04))",
              borderColor: "var(--accent)",
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-2"
                  style={{ color: "var(--accent)" }}
                >
                  🎯 These are sample questions
                </p>
                <h2
                  className="text-lg md:text-xl font-black mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Get the full {topicLabel} experience — 100% free
                </h2>
                <ul
                  className="text-sm leading-relaxed mb-4 grid sm:grid-cols-2 gap-x-4 gap-y-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <li>✓ Attempt tracking &amp; analytics</li>
                  <li>✓ Timer &amp; exam-mode simulation</li>
                  <li>✓ Adaptive difficulty (Easy → Hard)</li>
                  <li>✓ Bookmarks, notes &amp; mistake review</li>
                </ul>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  Just sign in to unlock everything. Free for all students.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Link
                    href={`/practice?${new URLSearchParams({
                      exam: exam.examLabel,
                      ...(exam.branch ? { branch: exam.branch } : {}),
                      subject: pattern.subject,
                      patternId: pattern.id,
                    }).toString()}`}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    🚀 Start Practice Mode
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold border transition-colors"
                    style={{
                      borderColor: "var(--accent)",
                      color: "var(--accent)",
                      background: "transparent",
                    }}
                  >
                    Sign in free →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Question list */}
        <section className="space-y-6">
          {pageQuestions.map((q, i) => {
            const position = start + i + 1;
            const anchor = `q-${q.source}-${q.id}`;
            return (
              <article key={anchor} id={anchor} className="scroll-mt-20">
                {/* Question header */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className="text-[11px] font-black uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Q{position}
                  </span>
                  {q.source === "pyq" && q.year > 2000 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                      {exam.examLabel} {q.year}
                    </span>
                  )}
                  {q.source === "gq" && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        q.difficulty === "Hard"
                          ? "bg-red-500/10 text-red-400"
                          : q.difficulty === "Medium"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--bg-surface-2)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {q.questionType}
                  </span>
                </div>

                <QuestionViewer
                  question={{
                    id: q.id,
                    prefix: q.source,
                    questionText: q.questionText,
                    questionTextHindi: q.questionTextHindi ?? undefined,
                    options: q.options,
                    optionsHindi: (q.optionsHindi as string[] | undefined) ?? undefined,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    explanationHindi: q.explanationHindi ?? undefined,
                    questionType: q.questionType,
                    images: (q.images as any) ?? undefined,
                  }}
                  practiceHref={`/practice?${new URLSearchParams({
                    exam: exam.examLabel,
                    ...(exam.branch ? { branch: exam.branch } : {}),
                    subject: pattern.subject,
                    patternId: pattern.id,
                  }).toString()}`}
                />
              </article>
            );
          })}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            className="mt-12 flex items-center justify-between"
            aria-label="Pagination"
          >
            {pageNum > 1 ? (
              <Link
                href={pageNum === 2 ? basePath : `${basePath}?page=${pageNum - 1}`}
                className="px-4 py-2 rounded-xl text-sm font-bold border hover:border-indigo-500/40 transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  borderColor: "var(--border)",
                }}
                rel="prev"
              >
                ← Page {pageNum - 1}
              </Link>
            ) : (
              <span />
            )}

            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Page {pageNum} of {totalPages}
            </span>

            {pageNum < totalPages ? (
              <Link
                href={`${basePath}?page=${pageNum + 1}`}
                className="px-4 py-2 rounded-xl text-sm font-bold border hover:border-indigo-500/40 transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  borderColor: "var(--border)",
                }}
                rel="next"
              >
                Page {pageNum + 1} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {/* Signup CTA */}
        <div
          className="mt-12 p-6 rounded-2xl border text-center"
          style={{
            background: "var(--bg-surface-2)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Want unlimited AI-generated {topicLabel} questions?
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign up free and practice with adaptive difficulty — Easy, Medium,
            Hard. New questions every session.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Start practising for free →
          </Link>
        </div>
      </div>
    </>
  );
}
