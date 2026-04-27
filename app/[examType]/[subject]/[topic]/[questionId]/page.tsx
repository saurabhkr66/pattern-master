// app/[examType]/[subject]/[topic]/[questionId]/page.tsx
// Public SEO-optimised question page
// URL example: /gate-cse/dbms/normalization/pyq-abc123

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { cleanTextForMeta, buildQuestionSchema, toSlug, buildBreadcrumbSchema } from "@/lib/seo";
import QuestionViewer from "@/components/question/QuestionViewer";

interface PageParams {
  examType: string;
  subject: string;
  topic: string;
  questionId: string;
}

// ------ Data fetching helpers -----------------------------------------------

async function fetchQuestion(questionId: string) {
  // IDs are prefixed: "pyq-", "spyq-", "gq-"
  if (questionId.startsWith("pyq-")) {
    const id = questionId.slice(4);
    const q = await prisma.pYQ.findUnique({
      where: { id },
      include: { pattern: { select: { subject: true, topic_name: true, exam_type: true } } },
    });
    if (!q) return null;
    return {
      id: q.id,
      prefix: "pyq",
      questionText: q.question_text,
      options: (q.options as string[]) ?? [],
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      year: q.year,
      questionType: q.question_type,
      images: (q.images as any[]) ?? [],
      subject: q.pattern.subject,
      topicName: q.pattern.topic_name,
      examType: q.pattern.exam_type,
    };
  }

  if (questionId.startsWith("spyq-")) {
    const id = questionId.slice(5);
    const q = await prisma.subjectPYQ.findUnique({
      where: { id },
      include: { subject_pattern: { select: { subject_name: true } } },
    });
    if (!q) return null;
    return {
      id: q.id,
      prefix: "spyq",
      questionText: q.question_text,
      options: (q.options as string[]) ?? [],
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      year: q.year,
      questionType: q.question_type,
      images: (q.images as any[]) ?? [],
      subject: q.subject_pattern.subject_name,
      topicName: q.subject_pattern.subject_name,
      examType: "GATE",
    };
  }

  // gq- prefix = GeneratedQuestion
  const id = questionId.startsWith("gq-") ? questionId.slice(3) : questionId;
  const q = await prisma.generatedQuestion.findUnique({
    where: { id },
    include: { pattern: { select: { subject: true, topic_name: true, exam_type: true } } },
  });
  if (!q) return null;
  return {
    id: q.id,
    prefix: "gq",
    questionText: q.question_text,
    options: (q.options as string[]) ?? [],
    correctAnswer: q.correct_answer,
    explanation: q.explanation,
    year: new Date().getFullYear(),
    questionType: q.question_type,
    images: (q.images as any[]) ?? [],
    subject: q.pattern.subject,
    topicName: q.pattern.topic_name,
    examType: q.pattern.exam_type,
  };
}

// ------ Metadata -------------------------------------------------------------

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { questionId, subject, topic } = await params;
  const q = await fetchQuestion(questionId);
  if (!q) return { title: "Question Not Found | BattleExam" };

  const subjectLabel = subject.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const topicLabel   = topic.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const title = `${q.examType} ${subjectLabel} ${q.year > 2000 ? q.year : ""} – ${topicLabel} | BattleExam`;

  // "Answer-First" description for GEO: start with the direct context
  const rawDesc = cleanTextForMeta(q.questionText, 150);
  const description = `Solve this ${q.examType} ${q.year} ${subjectLabel} question on ${topicLabel}. ${rawDesc}`;

  const canonical = `https://battleexam.com/${toSlug(q.examType)}-cse/${toSlug(q.subject)}/${toSlug(q.topicName)}/${questionId}`;

  return {
    title,
    description,
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
          alt: title,
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

// ------ Page -----------------------------------------------------------------

export default async function QuestionPage({ params }: { params: Promise<PageParams> }) {
  const { questionId } = await params;
  const q = await fetchQuestion(questionId);
  if (!q) notFound();

  const url = `https://battleexam.com/${toSlug(q.examType)}-cse/${toSlug(q.subject)}/${toSlug(q.topicName)}/${questionId}`;

  const questionSchema = buildQuestionSchema({
    questionText: q.questionText,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    subject: q.subject,
    year: q.year,
    questionType: q.questionType,
    url,
  });

  const examSlug = `${toSlug(q.examType)}-cse`;
  const subjectSlug = toSlug(q.subject);
  const topicSlug = toSlug(q.topicName);

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", item: "https://battleexam.com" },
    { name: `${q.examType} CSE`, item: `https://battleexam.com/${examSlug}/${subjectSlug}` },
    { name: q.subject, item: `https://battleexam.com/${examSlug}/${subjectSlug}` },
    { name: q.topicName, item: `https://battleexam.com/${examSlug}/${subjectSlug}/${topicSlug}` },
  ]);

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(questionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="max-w-3xl mx-auto py-8 md:py-14 px-4">
        {/* Breadcrumb */}
        <nav className="text-xs font-medium mb-6 flex items-center gap-2 flex-wrap" style={{ color: "var(--text-secondary)" }}>
          <a href="/" className="hover:underline">Home</a>
          <span>›</span>
          <a href={`/${examSlug}/${subjectSlug}`} className="hover:underline">{q.subject}</a>
          {q.topicName !== q.subject && (
            <>
              <span>›</span>
              <a href={`/${examSlug}/${subjectSlug}/${topicSlug}`} className="hover:underline">{q.topicName}</a>
            </>
          )}
        </nav>

        {/* Meta pills */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white">
            {q.examType}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>
            {q.subject}
          </span>
          {q.year > 2000 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>
              {q.year}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>
            {q.questionType}
          </span>
        </div>

        {/* Question viewer (client component – handles show/hide answer) */}
        <QuestionViewer question={q} />
      </div>
    </>
  );
}
