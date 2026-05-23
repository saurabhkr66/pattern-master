// app/[examType]/pyq/page.tsx
// Dedicated SEO page listing all previous year papers for an exam.
// URL example: /gate-cse/pyq

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toSlug, parseExamSlug, branchWhereClause } from "@/lib/seo";

const BASE = "https://battleexam.com";

interface PageParams {
  examType: string;
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
  const { examType } = await params;
  const exam = parseExamSlug(examType);
  if (!exam) return { title: "Not Found | BattleExam" };

  const canonical = `${BASE}/${examType}/pyq`;
  const year = new Date().getFullYear();

  const title = `${exam.fullLabel} Previous Year Papers (PYQ) ${year} | BattleExam`;
  const description = `Solve ${exam.fullLabel} previous year question papers online. Practice full-length PYQs with solutions, detailed analysis and timed mock test mode. Free on BattleExam.`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${exam.fullLabel} previous year papers`,
      `${exam.fullLabel} PYQ`,
      `${exam.fullLabel} past papers`,
      `${exam.fullLabel} question paper ${year}`,
      `${exam.fullLabel} previous year question paper with solution`,
      `${exam.examLabel} PYQ PDF`,
      `${exam.examLabel} previous papers online`,
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
          url: "https://battleexam.com/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${exam.fullLabel} Previous Year Papers – BattleExam`,
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

export default async function PYQPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { examType } = await params;
  const exam = parseExamSlug(examType);
  if (!exam) notFound();

  const papers = await prisma.mockTestTemplate.findMany({
    where: {
      exam_type: exam.examType,
      ...branchWhereClause(exam.branch),
      mode: "seeded",
    },
    select: {
      id: true,
      title: true,
      branch: true,
      total_questions: true,
      max_score: true,
      duration_secs: true,
    },
    orderBy: { created_at: "desc" },
  });

  if (papers.length === 0) notFound();

  const canonical = `${BASE}/${examType}/pyq`;
  const year = new Date().getFullYear();
  const examSlug = toSlug(exam.examType);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${exam.fullLabel} Previous Year Papers`,
    url: canonical,
    numberOfItems: papers.length,
    itemListElement: papers.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: `${BASE}/mock-tests/${examSlug}/${toSlug(p.branch || "all-subjects")}/${p.id}`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: exam.fullLabel, item: `${BASE}/${examType}` },
      { "@type": "ListItem", position: 3, name: "Previous Year Papers", item: canonical },
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
          <span style={{ color: "var(--text-primary)" }}>Previous Year Papers</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            Previous Year Papers
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "var(--text-primary)" }}>
            {exam.fullLabel} PYQ {year}
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            {papers.length} previous year paper{papers.length > 1 ? "s" : ""} — solve them in
            timed mock test mode or practise questions at your own pace.
          </p>
        </div>

        {/* Papers list */}
        <div className="flex flex-col gap-4">
          {papers.map((paper) => {
            const branchSlug = toSlug(paper.branch || "all-subjects");
            const practiceUrl = `/practice?exam=${encodeURIComponent(exam.examType)}${exam.branch ? `&branch=${encodeURIComponent(exam.branch)}` : ""}&subject=Full+Papers`;

            return (
              <div
                key={paper.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
              >
                <div>
                  <p className="font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>
                    {paper.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {paper.total_questions} Questions · {paper.max_score} Marks · {Math.round(paper.duration_secs / 60)} Mins
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={practiceUrl}
                    className="px-4 py-2 rounded-xl font-bold text-sm border hover:border-indigo-500/60 transition-colors"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    Practice
                  </Link>
                  <Link
                    href={`/mock-tests/${examSlug}/${branchSlug}/${paper.id}`}
                    className="px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    Take Mock Test →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
