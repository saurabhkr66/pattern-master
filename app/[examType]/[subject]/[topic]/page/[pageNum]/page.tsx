// app/[examType]/[subject]/[topic]/page/[pageNum]/page.tsx
//
// Pages 2+ of the topic question list.
// URL example: /gate-cse/algorithms/divide-and-conquer/page/2
//
// ISR-compatible: pageNum comes from the path, no searchParams needed.

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { parseExamSlug, TOPIC_PAGE_SIZE } from "@/lib/seo";
import { fetchPattern, fetchTopicLabels, combineQuestions, unslug } from "../../_lib/dataFetch";
import { buildTopicMetadata, buildSchemas } from "../../_lib/metadata";
import TopicHeader from "../../_components/TopicHeader";
import QuestionList from "../../_components/QuestionList";
import TopicPagination from "../../_components/TopicPagination";
import SignupCTA from "../../_components/SignupCTA";

const BASE = "https://battleexam.com";
const PAGE_SIZE = TOPIC_PAGE_SIZE;

interface PageParams {
  examType: string;
  subject: string;
  topic: string;
  pageNum: string;
}

// 30 days — see the note in ../../page.tsx. Tag invalidation, not the clock,
// is what keeps this fresh; the short window only forced cold re-renders.
export const revalidate = 2592000;
export const dynamicParams = true;

// See note in ../../page.tsx — required to flip build classification to ●
// so Netlify Durable Cache actually caches ISR responses for paginated topic
// pages instead of marking them `fwd=bypass`.
export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { examType, subject, topic, pageNum: pageNumStr } = await params;
  const pageNum = parseInt(pageNumStr, 10);

  // Every unresolvable case must be decided HERE, before the body streams and
  // locks the status at 200 — see the long note in ../../page.tsx. Returning
  // `{ title: "Not Found" }` (the previous behaviour) left a 200 soft 404.
  //
  // `/page/1` and junk like `/page/abc` redirect to the topic root rather than
  // 404: page 1 is a real surface, it just lives at the root URL.
  const basePath = `/${examType}/${subject}/${topic}`;
  if (isNaN(pageNum) || pageNum < 2) redirect(basePath);

  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  // Real Pattern names for the labels, plus totalQ so the description can state
  // the actual question range on this page instead of repeating page 1's.
  const labels = await fetchTopicLabels(exam, unslug(subject), topic);
  if (!labels) notFound();

  // Out-of-range pages (/page/99 on an 11-page topic) were the same soft 404.
  // totalQ is already loaded, so the bound is free to enforce here.
  const totalPages = Math.max(1, Math.ceil(labels.totalQ / PAGE_SIZE));
  if (pageNum > totalPages) notFound();

  return buildTopicMetadata({
    exam,
    examType,
    subject,
    topic,
    subjectLabel: labels.subject,
    topicLabel: labels.topicName,
    pageNum,
    totalQ: labels.totalQ,
    pageSize: PAGE_SIZE,
  });
}

export default async function TopicPageN({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { examType, subject, topic, pageNum: pageNumStr } = await params;
  const pageNum = parseInt(pageNumStr, 10);

  const basePath = `/${examType}/${subject}/${topic}`;

  if (isNaN(pageNum) || pageNum < 2) redirect(basePath);

  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  // Lookup key only — display labels come from the Pattern row below.
  const subjectKey = unslug(subject);

  const pattern = await fetchPattern(exam, subjectKey, topic, pageNum, PAGE_SIZE);
  if (!pattern) notFound();

  const subjectLabel = pattern.subject;
  const topicLabel = pattern.topic_name;

  const canonical = `${BASE}${basePath}/page/${pageNum}`;
  const year = new Date().getFullYear() + 1;

  const pageQuestions = combineQuestions(pattern.pyqs, pattern.questions);

  const totalQ = pattern.totalQ;
  const totalPages = Math.max(1, Math.ceil(totalQ / PAGE_SIZE));
  if (pageNum > totalPages) notFound();

  const start = (pageNum - 1) * PAGE_SIZE;

  const { itemListSchema, courseSchema, breadcrumbSchema, quizSchemas } = buildSchemas({
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
      {quizSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <div className="max-w-4xl mx-auto py-10 px-4">
        <TopicHeader
          examType={examType}
          subject={subject}
          topic={topic}
          subjectLabel={subjectLabel}
          topicLabel={topicLabel}
          examFullLabel={exam.fullLabel}
          atomicLogic={pattern.atomic_logic}
          totalQ={totalQ}
          pyqCount={pattern.pyqs.length}
          gqCount={pattern.questions.length}
          year={year}
          shortNotes={pattern.short_notes}
          pageNum={pageNum}
          totalPages={totalPages}
        />

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
