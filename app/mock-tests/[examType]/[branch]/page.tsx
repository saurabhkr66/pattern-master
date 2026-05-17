import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { toSlug, getExamSeoInfo } from "@/lib/seo";
import type { Metadata } from "next";

const BASE = "https://battleexam.com";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ examType: string; branch: string }[]> {
  // Skip build-time prerender. With `dynamicParams = true` and ISR, pages
  // are generated on first visit and cached for `revalidate` seconds.
  return [];
}

function unslug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ examType: string; branch: string }> }): Promise<Metadata> {
  const { examType, branch } = await params;

  const allExams = await prisma.mockTestTemplate.findMany({
    select: { exam_type: true },
    distinct: ['exam_type'],
  }).catch(() => []);
  const actualExamType = allExams.find((e) => toSlug(e.exam_type) === examType)?.exam_type ?? examType;
  const info = getExamSeoInfo(actualExamType, null);

  const branchLabel = branch === "all-subjects" ? "All Subjects" : unslug(branch);

  const title = `${branchLabel} Mock Tests for ${info.examLabel} | BattleExam`;
  const description = `Take free ${branchLabel} mock tests for ${info.examLabel}. Practice with full-length papers, previous year questions, and AI-generated mocks. Detailed analysis and solutions included.`;
  const canonical = `${BASE}/mock-tests/${examType}/${branch}`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${info.examLabel} ${branchLabel} mock test`,
      `${info.examLabel} ${branchLabel} practice papers`,
      `${info.examLabel} ${branchLabel} previous year paper`,
      `${branchLabel} test series ${info.examLabel}`,
      `free ${info.examLabel} ${branchLabel} mock`,
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
          alt: `${branchLabel} Mock Tests for ${info.examLabel} – BattleExam`,
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

export default async function BranchMockTestsPage({ params }: { params: Promise<{ examType: string; branch: string }> }) {
  const { examType, branch } = await params;

  // Find actual exam type
  const allExams = await prisma.mockTestTemplate.findMany({
    select: { exam_type: true },
    distinct: ['exam_type']
  });
  const actualExamType = allExams.find(e => toSlug(e.exam_type) === examType)?.exam_type;
  if (!actualExamType) notFound();

  const info = getExamSeoInfo(actualExamType, null);

  // Find tests for this branch
  const listSelect = {
    id: true,
    title: true,
    branch: true,
    total_questions: true,
    max_score: true,
    duration_secs: true,
  } as const;

  const tests = await prisma.mockTestTemplate.findMany({
    where: {
      exam_type: actualExamType,
      OR: [
        { branch: branch === 'all-subjects' ? null : undefined },
        { branch: { equals: branch, mode: 'insensitive' } },
      ]
    },
    select: listSelect,
    orderBy: { created_at: 'desc' }
  });

  // If no tests found via direct match, do a fuzzy slug match
  let finalTests = tests;
  if (tests.length === 0) {
     const allTemplates = await prisma.mockTestTemplate.findMany({
        where: { exam_type: actualExamType },
        select: listSelect,
     });
     finalTests = allTemplates.filter(t => toSlug(t.branch || "All Subjects") === branch);
  }

  if (finalTests.length === 0) notFound();

  const displayBranch = finalTests[0].branch || "All Subjects";
  const canonical = `${BASE}/mock-tests/${examType}/${branch}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${info.examLabel} ${displayBranch} Mock Tests`,
    url: canonical,
    numberOfItems: finalTests.length,
    itemListElement: finalTests.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `${canonical}/${t.id}`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Mock Tests", item: `${BASE}/mock-tests` },
      { "@type": "ListItem", position: 3, name: `${info.examLabel} Mock Tests`, item: `${BASE}/mock-tests/${examType}` },
      { "@type": "ListItem", position: 4, name: `${displayBranch}`, item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Link href={`/mock-tests/${examType}`} className="text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">← Back to {info.examLabel}</Link>
          <h1 className="text-4xl font-black mt-4" style={{ color: 'var(--text-primary)' }}>
            {displayBranch} Mock Papers
          </h1>
          <p className="text-lg mt-2 opacity-70">
            Prepare with our collection of {finalTests.length} specialized {info.examLabel} mock tests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {finalTests.map((test) => (
            <Link
              key={test.id}
              href={`/mock-tests/${examType}/${branch}/${test.id}`}
              className="group flex items-center justify-between p-6 rounded-2xl border hover:border-indigo-500/40 transition-all"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <h3 className="text-xl font-bold mb-1 group-hover:text-indigo-400 transition-colors">
                  {test.title}
                </h3>
                <div className="flex items-center gap-4 text-xs opacity-60">
                  <span>{test.total_questions} Questions</span>
                  <span>•</span>
                  <span>{test.max_score} Marks</span>
                  <span>•</span>
                  <span>{Math.round(test.duration_secs / 60)} Mins</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
