// app/[examType]/[subject]/[topic]/page.tsx
// Public SEO hub listing all questions for a topic
// URL example: /gate-cse/algorithms/divide-and-conquer

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toSlug, cleanTextForMeta } from "@/lib/seo";

const BASE = "https://battleexam.com";

interface PageParams {
  examType: string; // e.g. "gate-cse"
  subject: string;  // e.g. "algorithms"
  topic: string;    // e.g. "divide-and-conquer"
}

function unslug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseExamType(examTypeSlug: string) {
  return examTypeSlug.split("-")[0].toUpperCase();
}

export const revalidate = 86400; // revalidate daily
export const dynamicParams = true; // generate pages on first visit, then cache

async function fetchPattern(examLabel: string, subjectLabel: string, topicSlug: string) {
  // Fetch all patterns for this subject+exam, then find by slug match
  const candidates = await prisma.pattern.findMany({
    where: {
      exam_type: examLabel,
      subject: { equals: subjectLabel, mode: "insensitive" },
    },
    include: {
      pyqs: {
        select: {
          id: true,
          question_text: true,
          year: true,
          question_type: true,
        },
        orderBy: { year: "desc" },
        take: 30,
      },
      questions: {
        select: {
          id: true,
          question_text: true,
          question_type: true,
          difficulty_level: true,
        },
        orderBy: { created_at: "desc" },
        take: 15,
      },
    },
  });

  return candidates.find((p) => toSlug(p.topic_name) === topicSlug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { examType, subject, topic } = await params;
  const examLabel = parseExamType(examType);
  const subjectLabel = unslug(subject);
  const topicLabel = unslug(topic);
  const canonical = `${BASE}/${examType}/${subject}/${topic}`;
  const year = new Date().getFullYear() + 1;

  const title = `${topicLabel} – ${examLabel} ${subjectLabel} Practice Questions & PYQs | BattleExam`;
  const description = `Practise ${topicLabel} for ${examLabel} CSE ${year} with AI-generated questions and previous year questions (PYQs). Understand the exact pattern ${examLabel} examiners test on ${topicLabel}. Free on BattleExam.`;

  return {
    title,
    description,
    keywords: [
      `${topicLabel} GATE`,
      `${topicLabel} practice questions`,
      `GATE ${subjectLabel} ${topicLabel}`,
      `${topicLabel} previous year questions`,
      `${topicLabel} PYQ GATE`,
      `${examLabel} ${topicLabel} questions`,
      `${topicLabel} GATE CSE ${year}`,
      `${topicLabel} questions and answers`,
      `${topicLabel} GATE pattern`,
      `${examLabel} ${subjectLabel} ${topicLabel} MCQ`,
    ],
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
          alt: `${topicLabel} – ${examLabel} Practice Questions | BattleExam`,
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

export default async function TopicPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { examType, subject, topic } = await params;
  const examLabel = parseExamType(examType);
  const subjectLabel = unslug(subject);
  const topicLabel = unslug(topic);

  const pattern = await fetchPattern(examLabel, subjectLabel, topic);
  if (!pattern) notFound();

  const canonical = `${BASE}/practice?patternId=${pattern.id}`;
  const year = new Date().getFullYear() + 1;
  const totalQ = pattern.pyqs.length + pattern.questions.length;

  // JSON-LD ItemList of questions
  const pyqListItems = pattern.pyqs.map((q, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: `${topicLabel} – GATE ${q.year} ${q.question_type} Question`,
    url: `${BASE}/${examType}/${subject}/${topic}/pyq-${q.id}`,
    description: cleanTextForMeta(q.question_text, 120),
  }));

  const gqListItems = pattern.questions.map((q, i) => ({
    "@type": "ListItem",
    position: pattern.pyqs.length + i + 1,
    name: `${topicLabel} – ${q.difficulty_level} Practice Question`,
    url: `${BASE}/${examType}/${subject}/${topic}/gq-${q.id}`,
    description: cleanTextForMeta(q.question_text, 120),
  }));

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${topicLabel} GATE Practice Questions`,
    description:
      pattern.atomic_logic ||
      `Practice questions for ${topicLabel} in GATE CSE`,
    url: canonical,
    numberOfItems: totalQ,
    itemListElement: [...pyqListItems, ...gqListItems],
  };

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${topicLabel} – GATE CSE`,
    description:
      pattern.atomic_logic ||
      `Master ${topicLabel} for GATE CSE with pattern-based practice`,
    provider: {
      "@type": "Organization",
      name: "BattleExam",
      url: BASE,
    },
    educationalLevel: "Graduate",
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
        item: canonical,
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
          <Link
            href={`/${examType}/${subject}`}
            className="hover:underline"
          >
            {subjectLabel}
          </Link>
          <span>›</span>
          <span style={{ color: "var(--text-primary)" }}>{topicLabel}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            {examLabel} CSE · {subjectLabel}
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
            {totalQ} questions · AI-generated &amp; Previous Year Questions for GATE {year}
          </p>
        </div>

        {/* Previous Year Questions */}
        {pattern.pyqs.length > 0 && (
          <section className="mb-10">
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Previous Year Questions
              <span
                className="ml-2 text-sm font-normal"
                style={{ color: "var(--text-muted)" }}
              >
                ({pattern.pyqs.length})
              </span>
            </h2>
            <div className="space-y-2">
              {pattern.pyqs.map((q) => (
                <Link
                  key={q.id}
                  href={`/practice?patternId=${pattern.id}&q=pyq-${q.id}`}
                  className="flex items-start gap-3 p-4 rounded-xl border hover:border-indigo-500/40 transition-colors group"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {q.year > 2000 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                          GATE {q.year}
                        </span>
                      )}
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--bg-surface-2)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {q.question_type}
                      </span>
                    </div>
                    <p
                      className="text-sm line-clamp-2 group-hover:text-indigo-400 transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {cleanTextForMeta(q.question_text, 180)}
                    </p>
                  </div>
                  <span
                    className="text-xs mt-1 shrink-0 group-hover:text-indigo-400 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* AI Practice Questions */}
        {pattern.questions.length > 0 && (
          <section className="mb-10">
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              AI Practice Questions
              <span
                className="ml-2 text-sm font-normal"
                style={{ color: "var(--text-muted)" }}
              >
                ({pattern.questions.length})
              </span>
            </h2>
            <div className="space-y-2">
              {pattern.questions.map((q) => (
                <Link
                  key={q.id}
                  href={`/practice?patternId=${pattern.id}&q=gq-${q.id}`}
                  className="flex items-start gap-3 p-4 rounded-xl border hover:border-violet-500/40 transition-colors group"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {q.difficulty_level && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            q.difficulty_level === "Hard"
                              ? "bg-red-500/10 text-red-400"
                              : q.difficulty_level === "Medium"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {q.difficulty_level}
                        </span>
                      )}
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--bg-surface-2)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {q.question_type}
                      </span>
                    </div>
                    <p
                      className="text-sm line-clamp-2 group-hover:text-violet-400 transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {cleanTextForMeta(q.question_text, 180)}
                    </p>
                  </div>
                  <span
                    className="text-xs mt-1 shrink-0 group-hover:text-violet-400 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Signup CTA */}
        <div
          className="mt-8 p-6 rounded-2xl border text-center"
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
