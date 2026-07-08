// app/[examType]/[subject]/page.tsx
// Public SEO hub listing all topics for a subject
// URL example: /gate-cse/algorithms

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toSlug, parseExamSlug, buildExamSlug, branchWhereClause } from "@/lib/seo";
import FeatureBanner from "@/components/ui/FeatureBanner";

const BASE = "https://battleexam.com";

// Per-subject topic index. Many subject pages share underlying patterns when
// the page-level ISR window expires; this dedupes the actual DB hit across
// concurrent revalidations and across subjects of the same exam.
const getSubjectTopicIndex = (examType: string, branch: string | null, subjectLabel: string) =>
  unstable_cache(
    () =>
      prisma.pattern.findMany({
        where: {
          exam_type: examType,
          ...branchWhereClause(branch),
          subject: { equals: subjectLabel, mode: "insensitive" },
        },
        select: {
          id: true,
          topic_name: true,
          atomic_logic: true,
          _count: { select: { pyqs: true, questions: true } },
        },
        orderBy: { topic_name: "asc" },
      }),
    ["subject-topic-index", examType, branch || "null", subjectLabel],
    { revalidate: 86400, tags: ["patterns"] },
  )();

interface PageParams {
  examType: string; // e.g. "gate-cse", "jee-main", "neet"
  subject: string;  // e.g. "algorithms", "physics"
}

function unslug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const revalidate = 86400; // revalidate daily
export const dynamicParams = true; // generate pages on first visit, then cache

export async function generateStaticParams(): Promise<PageParams[]> {
  // Skip build-time prerender. With `dynamicParams = true` and ISR, pages
  // are generated on first visit and cached for `revalidate` seconds. This
  // avoids a full-table read on every Vercel build.
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { examType, subject } = await params;
  const exam = parseExamSlug(examType);
  if (!exam) return { title: "Not Found | BattleExam" };

  const subjectLabel = unslug(subject);
  const canonical = `${BASE}/${examType}/${subject}`;
  const year = new Date().getFullYear() + 1;

  const title = `${exam.fullLabel} ${subjectLabel} Practice Questions – Topics & PYQs | BattleExam`;
  const description = `Practise all ${exam.fullLabel} ${subjectLabel} topics with AI-generated questions and previous year questions (PYQs). Master every ${subjectLabel} pattern tested in ${exam.fullLabel} ${year}. Free to start.`;

  const keywords = [
    `${exam.fullLabel} ${subjectLabel}`,
    `${exam.fullLabel} ${subjectLabel} practice questions`,
    `${exam.fullLabel} ${subjectLabel} PYQ`,
    `${exam.fullLabel} ${subjectLabel} previous year questions`,
    `${subjectLabel} ${exam.fullLabel}`,
    `${exam.examLabel} ${subjectLabel} topics`,
    `${subjectLabel} questions for ${exam.examLabel}`,
    `${exam.fullLabel} ${subjectLabel} ${year}`,
    `${exam.fullLabel} ${subjectLabel} preparation`,
    `${subjectLabel} pattern based questions`,
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
          alt: `${exam.fullLabel} ${subjectLabel} Practice Questions – BattleExam`,
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

export default async function SubjectPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { examType, subject } = await params;
  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  const subjectLabel = unslug(subject);

  const patterns = await getSubjectTopicIndex(
    exam.examType,
    exam.branch ?? null,
    subjectLabel,
  );

  if (!patterns.length) notFound();

  // Hide topics with zero questions from the grid + ItemList schema — they
  // render as question-less shells (thin content for crawlers, dead ends for
  // users). Seeding is ongoing; a topic re-enters automatically once its first
  // questions land (same rule the sitemap applies).
  const seeded = patterns.filter((p) => p._count.pyqs + p._count.questions > 0);
  if (!seeded.length) notFound();

  const canonical = `${BASE}/${examType}/${subject}`;
  const year = new Date().getFullYear() + 1;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${exam.fullLabel} ${subjectLabel} Topics`,
    description: `All ${exam.fullLabel} ${subjectLabel} topics with practice questions`,
    url: canonical,
    numberOfItems: seeded.length,
    itemListElement: seeded.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.topic_name,
      url: `${BASE}/${examType}/${subject}/${toSlug(p.topic_name)}`,
      description: p.atomic_logic,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      {
        "@type": "ListItem",
        position: 2,
        name: `${exam.fullLabel} ${subjectLabel}`,
        item: canonical,
      },
    ],
  };

  const totalQuestions = seeded.reduce(
    (sum, p) => sum + p._count.pyqs + p._count.questions,
    0
  );

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
          <span style={{ color: "var(--text-primary)" }}>{subjectLabel}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            {exam.fullLabel}
          </p>
          <h1
            className="text-3xl md:text-4xl font-black mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {exam.fullLabel} {subjectLabel} Practice Questions &amp; PYQs
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {seeded.length} topics · {totalQuestions} questions · AI‑generated
            &amp; Previous Year Questions for {exam.fullLabel} {year}
          </p>
        </div>

        <FeatureBanner
          heading={`Master all ${subjectLabel} topics — 100% free`}
          practiceHref={`/practice?${new URLSearchParams({ exam: exam.examLabel, ...(exam.branch ? { branch: exam.branch } : {}), subject: subjectLabel }).toString()}`}
        />

        {/* Topic grid */}
        <div className="grid sm:grid-cols-2 gap-3">
          {seeded.map((p) => (
            <Link
              key={p.id}
              href={`/${examType}/${subject}/${toSlug(p.topic_name)}`}
              prefetch={false}
              className="block p-4 rounded-xl border transition-colors hover:border-indigo-500/40"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="font-bold text-sm mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {p.topic_name}
              </div>
              {p.atomic_logic && (
                <p
                  className="text-xs mb-2 line-clamp-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {p.atomic_logic}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {p._count.pyqs > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                    {p._count.pyqs} PYQ{p._count.pyqs > 1 ? "s" : ""}
                  </span>
                )}
                {p._count.questions > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                    {p._count.questions} Practice
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-10 p-6 rounded-2xl border text-center"
          style={{
            background: "var(--bg-surface-2)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Practice all {subjectLabel} topics with unlimited AI questions
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            Adaptive difficulty · Instant explanations · Free to start
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
