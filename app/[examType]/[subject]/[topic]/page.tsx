// app/[examType]/[subject]/[topic]/page.tsx
//
// Public SEO surface: a *rich* topic page that hosts every question in the
// topic inline (paginated). This replaces the old design where each question
// got its own ultra-thin URL — Google was crawling those but not indexing
// them because the per-question pages had ~50–200 words of content.
//
// URL example: /gate-cse/algorithms/divide-and-conquer        ← page 1 (this file)
//              /gate-cse/algorithms/divide-and-conquer/page/2 ← page 2+ (./page/[pageNum]/page.tsx)
//
// No searchParams → ISR-compatible. `force-dynamic` is gone.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { parseExamSlug, TOPIC_PAGE_SIZE } from "@/lib/seo";
import { fetchPattern, fetchRelatedTopics, combineQuestions, unslug } from "./_lib/dataFetch";
import { buildTopicMetadata, buildSchemas } from "./_lib/metadata";
import TopicHeader from "./_components/TopicHeader";
import PracticeModePromo from "./_components/PracticeModePromo";
import QuestionList from "./_components/QuestionList";
import TopicPagination from "./_components/TopicPagination";
import SignupCTA from "./_components/SignupCTA";
import RelatedTopics from "./_components/RelatedTopics";

const BASE = "https://battleexam.com";
const PAGE_SIZE = TOPIC_PAGE_SIZE;

interface PageParams {
  examType: string;
  subject: string;
  topic: string;
}

export const revalidate = 86400;
export const dynamicParams = true;

// Empty array still flips this route's build classification from `ƒ` (dynamic)
// to `●` (SSG/ISR). Without `generateStaticParams`, Netlify's Durable Cache
// bypasses the response and the function runs on every hit — `revalidate`
// becomes a no-op. With it present (even returning nothing), `dynamicParams`
// renders pages on first visit and caches them at the CDN edge for 24 h.
export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { examType, subject, topic } = await params;

  const exam = parseExamSlug(examType);
  if (!exam) return { title: "Not Found" };

  return buildTopicMetadata({
    exam,
    examType,
    subject,
    topic,
    subjectLabel: unslug(subject),
    topicLabel: unslug(topic),
    pageNum: 1,
  });
}

export default async function TopicPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { examType, subject, topic } = await params;
  const pageNum = 1;

  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  const subjectLabel = unslug(subject);
  const topicLabel = unslug(topic);

  const [pattern, relatedTopics] = await Promise.all([
    fetchPattern(exam, subjectLabel, topic, pageNum, PAGE_SIZE),
    fetchRelatedTopics(exam, subjectLabel, topic),
  ]);
  if (!pattern) notFound();

  const basePath = `/${examType}/${subject}/${topic}`;
  const canonical = `${BASE}${basePath}`;
  const year = new Date().getFullYear() + 1;

  const pageQuestions = combineQuestions(pattern.pyqs, pattern.questions);

  const totalQ = pattern.totalQ;
  const totalPages = Math.max(1, Math.ceil(totalQ / PAGE_SIZE));
  const start = 0;

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
        />

        <PracticeModePromo topicLabel={topicLabel} practiceHref={practiceHref} />

        <QuestionList
          pageQuestions={pageQuestions}
          start={start}
          examLabel={exam.examLabel}
          practiceHref={practiceHref}
        />

        <TopicPagination pageNum={pageNum} totalPages={totalPages} basePath={basePath} />

        <RelatedTopics
          topics={relatedTopics}
          examType={examType}
          subject={subject}
          subjectLabel={subjectLabel}
        />

        <SignupCTA topicLabel={topicLabel} />
      </div>
    </>
  );
}
