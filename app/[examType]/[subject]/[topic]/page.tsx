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
import { parseExamSlug, TOPIC_PAGE_SIZE } from "@/lib/seo";
import { fetchPattern, combineQuestions, unslug } from "./_lib/dataFetch";
import { buildTopicMetadata, buildSchemas } from "./_lib/metadata";
import TopicHeader from "./_components/TopicHeader";
import PracticeModePromo from "./_components/PracticeModePromo";
import QuestionList from "./_components/QuestionList";
import TopicPagination from "./_components/TopicPagination";
import SignupCTA from "./_components/SignupCTA";

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

// Page reads `searchParams` (?page=N) which is a request-time API, so it must
// be dynamic. Setting `revalidate` would mark it ISR and Next.js would refuse
// to read searchParams during prerender, throwing DYNAMIC_SERVER_USAGE in prod.
// Heavy DB work is still cached via `unstable_cache` wrappers (getPatternBySlug, getPatternPage).
export const dynamic = "force-dynamic";

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

  return buildTopicMetadata({
    exam,
    examType,
    subject,
    topic,
    subjectLabel: unslug(subject),
    topicLabel: unslug(topic),
    pageNum,
  });
}

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

  const pageQuestions = combineQuestions(pattern.pyqs, pattern.questions);

  const totalQ = pattern.totalQ;
  const totalPages = Math.max(1, Math.ceil(totalQ / PAGE_SIZE));
  if (pageNum > totalPages) notFound();

  const start = (pageNum - 1) * PAGE_SIZE;

  const { itemListSchema, courseSchema, breadcrumbSchema } = buildSchemas({
    exam,
    examType,
    subject,
    subjectLabel,
    topicLabel,
    basePath,
    canonical,
    pageQuestions,
    start,
    totalQ,
    atomicLogic: pattern.atomic_logic,
  });

  const practiceHref = `/practice?${new URLSearchParams({
    exam: exam.examLabel,
    ...(exam.branch ? { branch: exam.branch } : {}),
    subject: pattern.subject,
    patternId: pattern.id,
  }).toString()}`;

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
        <TopicHeader
          examType={examType}
          subject={subject}
          subjectLabel={subjectLabel}
          topicLabel={topicLabel}
          examFullLabel={exam.fullLabel}
          atomicLogic={pattern.atomic_logic}
          totalQ={totalQ}
          pyqCount={pattern.pyqs.length}
          gqCount={pattern.questions.length}
          year={year}
          shortNotes={pattern.short_notes}
        />

        {pageNum === 1 && (
          <PracticeModePromo topicLabel={topicLabel} practiceHref={practiceHref} />
        )}

        <QuestionList
          pageQuestions={pageQuestions}
          start={start}
          examLabel={exam.examLabel}
          practiceHref={practiceHref}
        />

        <TopicPagination pageNum={pageNum} totalPages={totalPages} basePath={basePath} />

        <SignupCTA topicLabel={topicLabel} />
      </div>
    </>
  );
}
