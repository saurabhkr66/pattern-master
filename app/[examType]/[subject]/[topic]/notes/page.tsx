// app/[examType]/[subject]/[topic]/notes/page.tsx
//
// Dedicated SEO surface for a topic's concept notes (short_notes). Split out of
// the questions page so the notes get their own indexable URL, keyword focus
// ("<topic> notes, formulas & concepts") and schema — instead of diluting the
// question page. Links back to the practice questions for internal linking.
//
// URL example: /gate-cse/algorithms/divide-and-conquer/notes

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { parseExamSlug } from "@/lib/seo";
import { fetchTopicNotes, fetchTopicLabels, unslug } from "../_lib/dataFetch";
import NotesRenderer from "@/components/ui/NotesRenderer";

const BASE = "https://battleexam.com";

interface PageParams {
  examType: string;
  subject: string;
  topic: string;
}

// 30 days — see the note in ../page.tsx. Tag invalidation, not the clock,
// is what keeps this fresh; the short window only forced cold re-renders.
// Mastery-notes edits reach here via revalidateTag("patterns").
export const revalidate = 2592000;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { examType, subject, topic } = await params;

  // Decided before the body streams, or the status is stuck at 200 — see the
  // note in ../page.tsx. (A pattern that exists but has no short_notes still
  // falls through to the body's notFound(); resolving that here would cost an
  // extra query for a case the sitemap never advertises.)
  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  // Real Pattern names, not unslug()'s title-cased slug — see dataFetch.unslug.
  const labels = await fetchTopicLabels(exam, unslug(subject), topic);
  if (!labels) notFound();
  const subjectLabel = labels.subject;
  const topicLabel = labels.topicName;
  const year = new Date().getFullYear() + 1;
  const canonical = `${BASE}/${examType}/${subject}/${topic}/notes`;

  const title = `${topicLabel} Notes, Formulas & Concepts – ${exam.fullLabel} ${subjectLabel}`;
  const description = `Concise ${topicLabel} notes for ${exam.fullLabel} ${year}: key concepts, formulas and must-know points for ${subjectLabel}. Free revision notes on BattleExam.`;

  const keywords = [
    `${topicLabel} notes`,
    `${topicLabel} ${exam.examLabel} notes`,
    `${topicLabel} formulas`,
    `${topicLabel} short notes`,
    `${topicLabel} revision notes`,
    `${topicLabel} concepts ${exam.examLabel}`,
    `${exam.fullLabel} ${subjectLabel} ${topicLabel} notes`,
    `${topicLabel} important formulas ${year}`,
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
      type: "article",
      siteName: "BattleExam",
      locale: "en_IN",
      images: [
        {
          url: "https://battleexam.com/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${topicLabel} Notes – ${exam.fullLabel} | BattleExam`,
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

export default async function TopicNotesPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { examType, subject, topic } = await params;

  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  // Lookup key only — display labels come from the Pattern row below.
  const subjectKey = unslug(subject);

  const data = await fetchTopicNotes(exam, subjectKey, topic);
  if (!data) notFound();

  const subjectLabel = data.subject;
  const topicLabel = data.topic_name;

  const hasNotes = !!data.short_notes && data.short_notes.trim().length > 0;
  if (!hasNotes) notFound();

  const basePath = `/${examType}/${subject}/${topic}`;
  const canonical = `${BASE}${basePath}/notes`;
  const year = new Date().getFullYear() + 1;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: exam.fullLabel, item: `${BASE}/${exam.slug}` },
      { "@type": "ListItem", position: 3, name: subjectLabel, item: `${BASE}/${examType}/${subject}` },
      { "@type": "ListItem", position: 4, name: topicLabel, item: `${BASE}${basePath}` },
      { "@type": "ListItem", position: 5, name: "Notes", item: canonical },
    ],
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: `${topicLabel} Notes – ${exam.fullLabel}`,
    description:
      data.atomic_logic ||
      `Concept notes and formulas for ${topicLabel} in ${exam.fullLabel} ${subjectLabel}.`,
    url: canonical,
    learningResourceType: "Concept summary",
    educationalLevel: exam.level,
    about: `${subjectLabel} – ${topicLabel}`,
    isPartOf: { "@type": "WebPage", url: `${BASE}${basePath}` },
    provider: { "@type": "Organization", name: "BattleExam", url: BASE },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="max-w-3xl mx-auto py-10 px-4">
        <nav
          className="text-xs font-medium mb-6 flex items-center gap-2 flex-wrap"
          style={{ color: "var(--text-secondary)" }}
        >
          <Link href="/" className="hover:underline">Home</Link>
          <span>›</span>
          <Link href={`/${examType}/${subject}`} className="hover:underline">{subjectLabel}</Link>
          <span>›</span>
          <Link href={basePath} className="hover:underline">{topicLabel}</Link>
          <span>›</span>
          <span style={{ color: "var(--text-primary)" }}>Notes</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            {exam.fullLabel} · {subjectLabel}
          </p>
          <h1
            className="text-3xl md:text-4xl font-black mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {topicLabel} Notes & Formulas
          </h1>
          {data.atomic_logic && (
            <p className="text-sm max-w-2xl mb-3" style={{ color: "var(--text-secondary)" }}>
              {data.atomic_logic}
            </p>
          )}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Concept summary for {exam.fullLabel} {year} · {data.totalQ} practice questions available
          </p>
        </header>

        <section
          className="mb-8 p-5 md:p-6 rounded-2xl border"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <h2
            className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "var(--accent)" }}
          >
            📘 {topicLabel} – Concept Summary
          </h2>
          <NotesRenderer
            content={data.short_notes as string}
            className="prose prose-sm dark:prose-invert max-w-none
              leading-relaxed
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
              prose-h2:mt-5 prose-h3:mt-4
              prose-p:my-2 prose-li:my-0.5
              prose-strong:text-[var(--text-primary)]
              prose-a:text-[var(--accent)] prose-code:text-[var(--text-primary)]"
            style={{ color: "var(--text-secondary)" }}
          />
        </section>

        <Link
          href={basePath}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all"
          style={{ background: "var(--accent)", color: "#0c0c0e" }}
        >
          Practice {data.totalQ} {topicLabel} questions →
        </Link>
      </div>
    </>
  );
}
