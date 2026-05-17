import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { toSlug, getExamSeoInfo } from "@/lib/seo";
import type { Metadata } from "next";

const BASE = "https://battleexam.com";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ examType: string }[]> {
  // Skip build-time prerender. With `dynamicParams = true` and ISR, pages
  // are generated on first visit and cached for `revalidate` seconds.
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ examType: string }> }): Promise<Metadata> {
  const { examType } = await params;

  // Resolve the actual DB exam_type so the label matches what users navigate to.
  const allExams = await prisma.mockTestTemplate.findMany({
    select: { exam_type: true },
    distinct: ['exam_type'],
  }).catch(() => []);
  const actualExamType = allExams.find((e) => toSlug(e.exam_type) === examType)?.exam_type ?? examType;
  const info = getExamSeoInfo(actualExamType, null);

  const title = `${info.examLabel} Mock Tests & Practice Papers | BattleExam`;
  const description = `Free online mock tests for ${info.examLabel}. Real exam interface, detailed analysis and subject-wise practice papers. Start your ${info.examLabel} preparation today.`;
  const canonical = `${BASE}/mock-tests/${examType}`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${info.examLabel} mock test`,
      `${info.examLabel} practice papers`,
      `${info.examLabel} previous year question paper`,
      `${info.examLabel} online test series`,
      `free ${info.examLabel} mock test`,
      `${info.examLabel} full length mock`,
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
          alt: `${info.examLabel} Mock Tests – BattleExam`,
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

export default async function ExamMockTestsPage({ params }: { params: Promise<{ examType: string }> }) {
  const { examType } = await params;

  // Find the actual exam type string from the database that matches the slug
  const allExams = await prisma.mockTestTemplate.findMany({
    select: { exam_type: true },
    distinct: ['exam_type']
  });

  const actualExamType = allExams.find(e => toSlug(e.exam_type) === examType)?.exam_type;
  if (!actualExamType) notFound();

  const info = getExamSeoInfo(actualExamType, null);

  // Get branches/modes for this exam
  const branches = await prisma.mockTestTemplate.groupBy({
    by: ['branch'],
    where: { exam_type: actualExamType },
    _count: { _all: true }
  });

  const canonical = `${BASE}/mock-tests/${examType}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${info.examLabel} Mock Tests`,
    url: canonical,
    numberOfItems: branches.length,
    itemListElement: branches.map((b, i) => {
      const branchLabel = b.branch || "All Subjects";
      const branchSlug = toSlug(branchLabel);
      return {
        "@type": "ListItem",
        position: i + 1,
        name: `${info.examLabel} ${branchLabel} Mock Tests`,
        url: `${canonical}/${branchSlug}`,
      };
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Mock Tests", item: `${BASE}/mock-tests` },
      { "@type": "ListItem", position: 3, name: `${info.examLabel} Mock Tests`, item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Link href="/mock-tests" className="text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">← All Exams</Link>
          <h1 className="text-4xl font-black mt-4" style={{ color: 'var(--text-primary)' }}>
            {info.examLabel} Mock Tests
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((b) => {
            const branchLabel = b.branch || "All Subjects";
            const branchSlug = toSlug(branchLabel);

            return (
              <Link
                key={branchSlug}
                href={`/mock-tests/${examType}/${branchSlug}`}
                className="group p-8 rounded-2xl border hover:border-indigo-500/40 transition-all hover:translate-y-[-4px]"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
                  {b._count._all} Papers
                </div>
                <h2 className="text-2xl font-black mb-4 group-hover:text-indigo-400 transition-colors">
                  {branchLabel}
                </h2>
                <div className="text-sm font-bold flex items-center gap-2">
                  View All Papers →
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
