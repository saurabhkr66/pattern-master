import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { toSlug, joinExamLabels, getExamSeoInfo } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 3600;

const MOCK_EXAM_COPY = joinExamLabels();
const MOCK_TITLE = `Online Mock Tests – ${MOCK_EXAM_COPY}`;
const MOCK_DESC = `Free online mock tests with real exam interfaces for ${MOCK_EXAM_COPY}. Full-length papers, instant scoring, detailed performance analysis and step-by-step explanations.`;
const MOCK_URL = "https://battleexam.com/mock-tests";

export const metadata: Metadata = {
  title: MOCK_TITLE,
  description: MOCK_DESC,
  alternates: { canonical: MOCK_URL },
  keywords: [
    "online mock tests",
    "GATE mock test",
    "GATE CSE mock test",
    "JEE Main mock test",
    "JEE Advanced mock test",
    "NEET mock test",
    "UGC NET mock test",
    "free mock test India",
    "full length mock test",
    "previous year question paper",
  ],
  openGraph: {
    title: MOCK_TITLE,
    description: MOCK_DESC,
    url: MOCK_URL,
    type: "website",
    siteName: "BattleExam",
    locale: "en_IN",
    images: [
      {
        url: "https://battleexam.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: `Online Mock Tests for ${MOCK_EXAM_COPY} – BattleExam`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: MOCK_TITLE,
    description: MOCK_DESC,
    images: ["https://battleexam.com/opengraph-image"],
  },
};

export default async function MockTestsPage() {
  const exams = await prisma.mockTestTemplate.groupBy({
    by: ['exam_type'],
    _count: { _all: true }
  }).catch(() => []);

  const examEntries = exams.map((e) => {
    const info = getExamSeoInfo(e.exam_type, null);
    return { ...e, label: info.examLabel, slug: toSlug(e.exam_type) };
  });

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Online Mock Tests – ${MOCK_EXAM_COPY}`,
    description: MOCK_DESC,
    url: MOCK_URL,
    numberOfItems: examEntries.length,
    itemListElement: examEntries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${e.label} Mock Tests`,
      url: `${MOCK_URL}/${e.slug}`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://battleexam.com" },
      { "@type": "ListItem", position: 2, name: "Mock Tests", item: MOCK_URL },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>
          Online Mock Tests
        </h1>
        <p className="text-lg mb-12" style={{ color: 'var(--text-secondary)' }}>
          Free full-length mock tests for {MOCK_EXAM_COPY} with the real exam interface, instant scoring and detailed analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examEntries.map((exam) => (
            <Link
              key={exam.exam_type}
              href={`/mock-tests/${exam.slug}`}
              className="group p-8 rounded-2xl border hover:border-indigo-500/40 transition-all hover:translate-y-[-4px]"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
                {exam._count._all} Available Tests
              </div>
              <h2 className="text-2xl font-black mb-4 group-hover:text-indigo-400 transition-colors">
                {exam.label}
              </h2>
              <div className="text-sm font-bold flex items-center gap-2">
                Browse Exams →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
