import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getExamSeoInfo, toSlug, displayBranch } from "@/lib/seo";
import type { Metadata } from "next";

const BASE = "https://battleexam.com";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ examType: string; branch: string; mockId: string }[]> {
  // Skip build-time prerender. With `dynamicParams = true` and ISR, pages
  // are generated on first visit and cached for `revalidate` seconds. With
  // hundreds of mocks this previously triggered a heavy read per Vercel build.
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ examType: string; branch: string; mockId: string }> }): Promise<Metadata> {
  const { examType, branch, mockId } = await params;
  const test = await prisma.mockTestTemplate.findUnique({
    where: { id: mockId },
    select: { title: true, exam_type: true, branch: true, total_questions: true, max_score: true, duration_secs: true }
  });

  if (!test) return { title: "Mock Test Not Found | BattleExam" };

  const info = getExamSeoInfo(test.exam_type, test.branch);
  const branchLabel = displayBranch(test.branch);
  const fullLabel = branchLabel ? `${info.examLabel} (${branchLabel})` : info.examLabel;
  const durationMins = Math.round(test.duration_secs / 60);

  const title = `${test.title} | ${fullLabel} Mock Test`;
  const description = `Take the ${test.title} for ${fullLabel}. ${test.total_questions} hand-picked questions, ${test.max_score} marks, ${durationMins} minutes. Real exam interface and detailed performance analysis. Free to practice on BattleExam.`;
  const canonical = `${BASE}/mock-tests/${examType}/${branch}/${mockId}`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${test.title}`,
      `${info.examLabel} mock test`,
      branchLabel ? `${info.examLabel} ${branchLabel} mock test` : `${info.examLabel} mock test`,
      `${info.examLabel} practice paper`,
      `${info.examLabel} full length mock`,
      `online ${info.examLabel} test`,
    ],
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
          alt: `${test.title} – ${fullLabel} Mock Test`,
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

export default async function MockTestLandingPage({ params }: { params: Promise<{ examType: string; branch: string; mockId: string }> }) {
  const { examType, branch, mockId } = await params;

  const test = await prisma.mockTestTemplate.findUnique({
    where: { id: mockId },
    select: {
      id: true,
      title: true,
      exam_type: true,
      branch: true,
      total_questions: true,
      max_score: true,
      duration_secs: true,
      created_at: true,
      _count: { select: { sessions: true } },
    },
  });

  if (!test) notFound();

  const info = getExamSeoInfo(test.exam_type, test.branch);
  const branchLabel = displayBranch(test.branch);
  const fullLabel = branchLabel ? `${info.examLabel} ${branchLabel}` : info.examLabel;
  const durationMins = Math.round(test.duration_secs / 60);
  const canonical = `${BASE}/mock-tests/${examType}/${branch}/${mockId}`;

  const quizSchema = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    "@id": canonical,
    name: test.title,
    description: `Full-length ${fullLabel} mock test. ${test.total_questions} questions, ${test.max_score} marks, ${durationMins} minutes.`,
    url: canonical,
    educationalLevel: info.level,
    learningResourceType: "Practice problem",
    timeRequired: `PT${durationMins}M`,
    numberOfQuestions: test.total_questions,
    inLanguage: "en-IN",
    dateModified: test.created_at,
    about: {
      "@type": "EducationalOccupationalProgram",
      name: fullLabel,
      educationalCredentialAwarded: `${info.examLabel} Score`,
    },
    publisher: {
      "@type": "Organization",
      name: "BattleExam",
      url: BASE,
    },
    provider: {
      "@type": "Organization",
      name: "BattleExam",
      url: BASE,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Mock Tests", item: `${BASE}/mock-tests` },
      { "@type": "ListItem", position: 3, name: `${info.examLabel} Mock Tests`, item: `${BASE}/mock-tests/${examType}` },
      { "@type": "ListItem", position: 4, name: branchLabel || "All Subjects", item: `${BASE}/mock-tests/${examType}/${branch}` },
      { "@type": "ListItem", position: 5, name: test.title, item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(quizSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <div className="mb-10">
          <Link href={`/mock-tests/${examType}/${branch}`} className="text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">← Back to Papers</Link>
          <div className="flex flex-wrap items-center gap-3 mt-6 mb-4">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--accent)', color: '#fff' }}>
              {info.examLabel}
            </span>
            {branchLabel && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                {branchLabel}
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6" style={{ color: 'var(--text-primary)' }}>
            {test.title}
          </h1>
          <p className="text-lg opacity-70 leading-relaxed max-w-2xl">
            Complete full-length mock test designed to simulate the actual {fullLabel} exam experience.
            Master your time management and evaluate your concepts with {test.total_questions} high-quality questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="text-xs font-bold opacity-50 uppercase tracking-widest mb-1">Duration</div>
            <div className="text-2xl font-black">{durationMins} Mins</div>
          </div>
          <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="text-xs font-bold opacity-50 uppercase tracking-widest mb-1">Total Marks</div>
            <div className="text-2xl font-black">{test.max_score}</div>
          </div>
          <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="text-xs font-bold opacity-50 uppercase tracking-widest mb-1">Questions</div>
            <div className="text-2xl font-black">{test.total_questions}</div>
          </div>
        </div>

        <div className="p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.03] to-transparent mb-12">
          <h3 className="text-xl font-bold mb-4">Test Instructions</h3>
          <ul className="space-y-3 text-sm opacity-80 list-disc pl-5">
            <li>Ensure you have a stable internet connection before starting.</li>
            <li>The timer will start automatically once you begin the test.</li>
            <li>You can mark questions for review and return to them later.</li>
            <li>Detailed solutions and performance analysis will be available immediately after submission.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href={`/test?id=${test.id}`}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl text-lg font-black bg-indigo-500 text-white hover:bg-indigo-600 transition-all hover:scale-[1.02] active:scale-95 text-center"
          >
            Begin Mock Test →
          </Link>
          <div className="text-sm opacity-50 font-bold">
            {test._count.sessions} candidates have already taken this test.
          </div>
        </div>
      </div>
    </>
  );
}
