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
import { fetchPattern, fetchRelatedTopics, fetchTopicLabels, combineQuestions, unslug } from "./_lib/dataFetch";
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

// 30 days, not 24 hours. The old 24h window bought no freshness — the data
// layer is tag-invalidated (`tags: ["patterns"]` in _lib/dataFetch.ts) and
// app/api/patterns/[id]/short-notes/route.ts fires revalidateTag("patterns"),
// which invalidates every page that read the tag, not just the data entry.
// So edits still land immediately; the clock was only forcing re-renders.
//
// It was actively hurting crawling. generateStaticParams returns [] (below),
// so nothing is prebuilt and every URL is cold on first request. With ~375
// useful Googlebot crawls/day spread over the whole topic surface, a given
// page gets revisited on a scale of WEEKS — always after a 24h entry expired,
// so Googlebot paid for a cold render nearly every time. GSC crawl stats had
// average response time at 1.2s blended, ~2.3s once the (fast) redirect half
// of the requests is backed out. A 30-day window outlives the revisit
// interval, so a page rendered once stays warm until the content changes.
export const revalidate = 2592000;
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

  // WHY the 404 checks live in generateMetadata and not just the page body:
  //
  // app/loading.tsx puts a Suspense boundary at the root, so every route
  // streams. Once streaming starts the HTTP status is already flushed and can
  // no longer be changed — so notFound() in the page body renders the 404 UI
  // but the response stays "200 OK" (see node_modules/next/dist/docs/01-app/
  // 03-api-reference/03-file-conventions/loading.md, "Status Codes": "ensure
  // the resource exists before the response body is streamed").
  //
  // The result was a soft 404 on every unmatched topic URL: 200, a real-looking
  // <title>, ~30 words of chrome, and contradictory robots tags (generateMetadata's
  // "index, follow" plus the not-found boundary's "noindex"). Google discovered
  // thousands of these from the old per-question and -common URL shapes, kept
  // them in the crawl set because 200 means "this is a page", and filed them
  // under Soft 404 / "Crawled – currently not indexed".
  //
  // generateMetadata resolves BEFORE the body streams, so throwing here still
  // produces a real 404. Keep the page-body notFound() calls as the backstop.
  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  // Real names from the Pattern row — "SQL", "DBMS", "B+ Tree" — not unslug()'s
  // title-cased slug ("Sql", "Dbms", "B Plus Tree"), which put terms nobody
  // searches for into every <title>. unslug() still resolves the lookup itself
  // (toSlug round-trips it), so it stays as the pre-DB fallback.
  const labels = await fetchTopicLabels(exam, unslug(subject), topic);
  if (!labels) notFound();

  return buildTopicMetadata({
    exam,
    examType,
    subject,
    topic,
    subjectLabel: labels.subject,
    topicLabel: labels.topicName,
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

  // Lookup key only — toSlug() turns this straight back into `subject`, so its
  // casing is irrelevant. Display labels come from the Pattern row below.
  const subjectKey = unslug(subject);

  const [pattern, relatedTopics] = await Promise.all([
    fetchPattern(exam, subjectKey, topic, pageNum, PAGE_SIZE),
    fetchRelatedTopics(exam, subjectKey, topic),
  ]);
  if (!pattern) notFound();

  const subjectLabel = pattern.subject;
  const topicLabel = pattern.topic_name;

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
