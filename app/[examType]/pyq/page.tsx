// app/[examType]/pyq/page.tsx
// Dedicated SEO page listing all previous year papers for an exam.
// URL example: /gate-cse/pyq

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toSlug, parseExamSlug, branchWhereClause } from "@/lib/seo";
import { EXAM_CONFIGS, fmtDuration } from "@/lib/examConfigs";
import { getPyqSeoCopy } from "@/lib/pyqSeoContent";
import FeatureBanner from "@/components/ui/FeatureBanner";

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

  const config = EXAM_CONFIGS.find((c) => c.examType === exam.examType);
  const unit = config?.pyqUnit ?? "topic";
  const unitCap = unit === "chapter" ? "Chapter" : "Topic";

  // Root layout appends " | BattleExam" via its title template — keep the
  // page part ≤60 chars with the primary keyword at the front.
  const title = `${exam.fullLabel} Previous Year Questions – ${unitCap}-wise PYQs`;
  const longDesc = `Practice ${exam.fullLabel} previous year questions ${unit}-wise with step-by-step solutions. Free PYQ papers, pattern analysis & mock tests. Start solving in 30 seconds.`;
  const description =
    longDesc.length <= 160
      ? longDesc
      : `Practice ${exam.fullLabel} previous year questions ${unit}-wise with solutions. Free PYQ papers, pattern analysis & mock tests. Start free.`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${exam.fullLabel} previous year questions`,
      `${exam.fullLabel} PYQ with solutions`,
      `${exam.fullLabel} question paper`,
      `${exam.fullLabel} previous year papers`,
      `${unit}-wise ${exam.examLabel} questions`,
      `${exam.fullLabel} question paper ${year}`,
      `${exam.examLabel} PYQ PDF`,
      `${exam.examLabel} mock test`,
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

  const [papers, yearRows, patternRows] = await Promise.all([
    prisma.mockTestTemplate.findMany({
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
    }),
    prisma.pYQ.groupBy({
      by: ["year"],
      where: {
        exam_type: exam.examType,
        pattern: branchWhereClause(exam.branch),
      },
      _count: { year: true },
      orderBy: { year: "desc" },
    }),
    prisma.pattern.findMany({
      where: {
        exam_type: exam.examType,
        ...branchWhereClause(exam.branch),
      },
      select: { subject: true, _count: { select: { pyqs: true } } },
    }),
  ]);

  if (papers.length === 0 && yearRows.length === 0) notFound();

  const canonical = `${BASE}/${examType}/pyq`;
  const year = new Date().getFullYear();
  const examSlug = toSlug(exam.examType);

  const config = EXAM_CONFIGS.find((c) => c.examType === exam.examType);
  const unit = config?.pyqUnit ?? "topic";
  const unitCap = unit === "chapter" ? "Chapter" : "Topic";
  const copy = getPyqSeoCopy({
    examType: exam.examType,
    fullLabel: exam.fullLabel,
    examLabel: exam.examLabel,
    unit,
    year,
  });

  // Subjects that actually have PYQs, for the topic/chapter-wise grid.
  const subjectMap = new Map<string, number>();
  for (const p of patternRows) {
    if (p._count.pyqs > 0) {
      subjectMap.set(p.subject, (subjectMap.get(p.subject) ?? 0) + p._count.pyqs);
    }
  }
  const subjects = Array.from(subjectMap.entries())
    .map(([subject, pyqs]) => ({ subject, pyqs }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

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
      { "@type": "ListItem", position: 3, name: "Previous Year Questions", item: canonical },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: copy.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
            Previous Year Questions
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "var(--text-primary)" }}>
            {exam.fullLabel} Previous Year Questions (PYQs) — Practice {unitCap}-wise, Free
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            {yearRows.length > 0 && <>{yearRows.length} years of questions · </>}
            {papers.length > 0 && <>{papers.length} full paper{papers.length > 1 ? "s" : ""} · </>}
            solve {unit}-wise with solutions, browse by year, or take a timed mock test.
          </p>
        </div>

        <FeatureBanner
          heading={`Practice ${exam.fullLabel} PYQs with full analytics — free`}
          practiceHref={`/practice?${new URLSearchParams({ exam: exam.examLabel, ...(exam.branch ? { branch: exam.branch } : {}) }).toString()}`}
        />

        {/* Subject-wise PYQ links */}
        {subjects.length > 0 && (
          <div className="mb-12">
            <h2 className="text-base font-black mb-1" style={{ color: "var(--text-primary)" }}>
              Practice {exam.fullLabel} PYQs by {unitCap}
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              Pick a subject to drill its {unit}-wise previous year questions with solutions.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjects.map((s) => (
                <Link
                  key={s.subject}
                  href={`/${examType}/${toSlug(s.subject)}`}
                  prefetch={false}
                  className="flex items-center justify-between p-4 rounded-xl border hover:border-indigo-500/60 transition-colors"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                >
                  <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                    {s.subject}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                    {s.pyqs} PYQ{s.pyqs > 1 ? "s" : ""}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Year-wise PYQ links */}
        {yearRows.length > 0 && (
          <div className="mb-12">
            <h2 className="text-base font-black mb-4" style={{ color: "var(--text-primary)" }}>
              {exam.fullLabel} Previous Year Papers by Year
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {yearRows.map((row) => (
                <Link
                  key={row.year}
                  href={`/${examType}/pyq/${row.year}`}
                  prefetch={false}
                  className="flex items-center justify-between p-4 rounded-xl border hover:border-indigo-500/60 transition-colors"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                >
                  <span className="font-black text-base" style={{ color: "var(--text-primary)" }}>
                    {row.year}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {row._count.year}Q
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Full papers / mock tests */}
        {papers.length > 0 && (
          <>
            <h2 className="text-base font-black mb-4" style={{ color: "var(--text-primary)" }}>
              Attempt Full {exam.fullLabel} Papers as Mock Tests
            </h2>
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
                        prefetch={false}
                        className="px-4 py-2 rounded-xl font-bold text-sm border hover:border-indigo-500/60 transition-colors"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        Practice
                      </Link>
                      <Link
                        href={`/mock-tests/${examSlug}/${branchSlug}/${paper.id}`}
                        prefetch={false}
                        className="px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                      >
                        Take Mock Test →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* SEO content: why PYQs */}
        <div className="mt-14 max-w-3xl">
          <h2 className="text-base font-black mb-3" style={{ color: "var(--text-primary)" }}>
            Why PYQs Are the Highest-ROI {exam.examLabel} Prep Strategy
          </h2>
          {copy.why.map((p, i) => (
            <p key={i} className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {p}
            </p>
          ))}

          <h3 className="text-sm font-black mt-6 mb-3" style={{ color: "var(--text-primary)" }}>
            What toppers do differently with PYQs
          </h3>
          <ol className="list-decimal pl-5 flex flex-col gap-2">
            {copy.topperSteps.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {s}
              </li>
            ))}
          </ol>

          <h2 className="text-base font-black mt-10 mb-3" style={{ color: "var(--text-primary)" }}>
            How to Use This PYQ Bank Effectively
          </h2>
          {copy.howToUse.map((p, i) => (
            <p key={i} className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {p}
            </p>
          ))}

          <h3 className="text-sm font-black mt-6 mb-3" style={{ color: "var(--text-primary)" }}>
            From PYQs to full mocks
          </h3>
          <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Once you clear a subject&apos;s PYQs at 70%+ accuracy, switch to timed practice — first the
            year-wise papers above, then full-length{" "}
            <Link href={`/mock-tests/${examSlug}`} className="text-indigo-400 hover:underline font-semibold">
              {exam.fullLabel} mock tests
            </Link>{" "}
            in the real exam interface. PYQs build recognition; mocks build the temperament to use it
            under the clock.
          </p>

          {/* Exam pattern quick reference */}
          {config && (
            <>
              <h2 className="text-base font-black mt-10 mb-3" style={{ color: "var(--text-primary)" }}>
                {exam.fullLabel} Exam Pattern &amp; Marking Scheme
              </h2>
              <div
                className="rounded-2xl border p-5 mb-3"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
              >
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div>
                    <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{config.totalQuestions}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Questions</p>
                  </div>
                  <div>
                    <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{config.maxScore}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Max marks</p>
                  </div>
                  <div>
                    <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{fmtDuration(config.durationSecs)}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Duration</p>
                  </div>
                </div>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                  {config.instructions.map((line, i) => (
                    <li key={i} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* FAQs */}
          <h2 className="text-base font-black mt-10 mb-4" style={{ color: "var(--text-primary)" }}>
            FAQs on {exam.fullLabel} Previous Year Questions
          </h2>
          <div className="flex flex-col gap-4">
            {copy.faqs.map((f, i) => (
              <div key={i}>
                <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                  {f.q}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {f.a}
                </p>
              </div>
            ))}
          </div>

          {/* Cross-exam links */}
          {copy.related.length > 0 && (
            <p className="text-sm mt-8" style={{ color: "var(--text-secondary)" }}>
              Also preparing for a related exam? Practice{" "}
              {copy.related.map((r, i) => (
                <span key={r.href}>
                  {i > 0 && " · "}
                  <Link href={r.href} className="text-indigo-400 hover:underline font-semibold">
                    {r.label}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
        </div>
      </div>
    </>
  );
}
