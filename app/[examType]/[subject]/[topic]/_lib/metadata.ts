import type { Metadata } from "next";
import { cleanTextForMeta, type ExamSeoInfo } from "@/lib/seo";
import type { CombinedQuestion } from "./dataFetch";

const BASE = "https://battleexam.com";

interface MetaArgs {
  exam: ExamSeoInfo;
  examType: string;
  subject: string;
  topic: string;
  subjectLabel: string;
  topicLabel: string;
  pageNum: number;
}

export function buildTopicMetadata({
  exam, examType, subject, topic, subjectLabel, topicLabel, pageNum,
}: MetaArgs): Metadata {
  const year = new Date().getFullYear() + 1;
  const basePath = `${BASE}/${examType}/${subject}/${topic}`;
  const canonical = pageNum === 1 ? basePath : `${basePath}?page=${pageNum}`;
  const pageSuffix = pageNum > 1 ? ` – Page ${pageNum}` : "";

  const title = `${topicLabel} – ${exam.fullLabel} ${subjectLabel} Practice Questions & PYQs${pageSuffix} | BattleExam`;
  const description = `Practise ${topicLabel} for ${exam.fullLabel} ${year} with all previous year questions and AI-generated practice questions. Solutions and explanations included. Free on BattleExam.`;

  const keywords = [
    `${topicLabel} ${exam.examLabel}`,
    `${topicLabel} practice questions`,
    `${exam.fullLabel} ${subjectLabel} ${topicLabel}`,
    `${topicLabel} previous year questions`,
    `${topicLabel} PYQ ${exam.examLabel}`,
    `${exam.examLabel} ${topicLabel} questions`,
    `${topicLabel} ${exam.fullLabel} ${year}`,
    `${topicLabel} questions and answers`,
    `${topicLabel} ${exam.examLabel} pattern`,
    `${exam.fullLabel} ${subjectLabel} ${topicLabel} MCQ`,
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
          alt: `${topicLabel} – ${exam.fullLabel} Practice Questions | BattleExam`,
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

interface SchemaArgs {
  exam: ExamSeoInfo;
  examType: string;
  subject: string;
  subjectLabel: string;
  topicLabel: string;
  basePath: string;
  canonical: string;
  pageQuestions: CombinedQuestion[];
  start: number;
  totalQ: number;
  atomicLogic: string | null;
}

export function buildSchemas({
  exam, examType, subject, subjectLabel, topicLabel,
  basePath, canonical, pageQuestions, start, totalQ, atomicLogic,
}: SchemaArgs) {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${topicLabel} ${exam.fullLabel} Practice Questions`,
    description:
      atomicLogic ||
      `Practice questions for ${topicLabel} in ${exam.fullLabel}`,
    url: canonical,
    numberOfItems: totalQ,
    itemListElement: pageQuestions.map((q, i) => ({
      "@type": "ListItem",
      position: start + i + 1,
      name:
        q.source === "pyq"
          ? `${topicLabel} – ${exam.fullLabel} ${q.year} ${q.questionType} Question`
          : `${topicLabel} – ${q.difficulty} Practice Question`,
      url: `${canonical}#q-${q.source}-${q.id}`,
      description: cleanTextForMeta(q.questionText, 120),
    })),
  };

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${topicLabel} – ${exam.fullLabel}`,
    description:
      atomicLogic ||
      `Master ${topicLabel} for ${exam.fullLabel} with pattern-based practice`,
    provider: {
      "@type": "Organization",
      name: "BattleExam",
      url: BASE,
    },
    educationalLevel: exam.level,
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
        name: exam.fullLabel,
        item: `${BASE}/${exam.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: subjectLabel,
        item: `${BASE}/${examType}/${subject}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: topicLabel,
        item: `${BASE}${basePath}`,
      },
    ],
  };

  return { itemListSchema, courseSchema, breadcrumbSchema };
}
