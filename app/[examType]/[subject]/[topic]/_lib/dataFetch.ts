import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  toSlug,
  type ExamSeoInfo,
} from "@/lib/seo";

// Indexed slug lookup — Postgres maintains exam_slug/branch_slug/subject_slug/
// topic_slug as STORED generated columns and the pattern_slug_lookup index
// turns this into a single seek. Replaces the previous full-exam fetch +
// JS .filter() over toSlug() of every row.
const getPatternBySlug = unstable_cache(
  (examSlug: string, branchSlug: string, subjectSlug: string, topicSlug: string) =>
    prisma.pattern.findFirst({
      where: {
        exam_slug: examSlug,
        branch_slug: branchSlug,
        subject_slug: subjectSlug,
        topic_slug: topicSlug,
      },
      select: { id: true },
    }),
  ["pattern-by-slug"],
  { revalidate: 86400, tags: ["patterns"] },
);

export function unslug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type CombinedQuestion =
  | {
      source: "pyq";
      id: string;
      questionText: string;
      questionTextHindi?: string | null;
      options: string[];
      optionsHindi?: string[] | null;
      correctAnswer: string;
      explanation: string;
      explanationHindi?: string | null;
      questionType: string;
      year: number;
      images?: { index: number; filename: string; type?: string }[] | null;
    }
  | {
      source: "gq";
      id: string;
      questionText: string;
      questionTextHindi?: string | null;
      options: string[];
      optionsHindi?: string[] | null;
      correctAnswer: string;
      explanation: string;
      explanationHindi?: string | null;
      questionType: string;
      difficulty: string;
      images?: { index: number; filename: string; type?: string }[] | null;
    };

const getPatternPage = unstable_cache(
  async (patternId: string, page: number, size: number) => {
    const meta = await prisma.pattern.findUnique({
      where: { id: patternId },
      select: {
        id: true,
        subject: true,
        atomic_logic: true,
        short_notes: true,
        _count: { select: { pyqs: true, questions: true } },
      },
    });
    if (!meta) return null;

    const pyqCount = meta._count.pyqs;
    const gqCount = meta._count.questions;
    const totalQ = pyqCount + gqCount;

    const offset = (page - 1) * size;
    const end = offset + size;

    const pyqSelect = {
      id: true,
      question_text: true,
      question_text_hindi: true,
      options: true,
      options_hindi: true,
      correct_answer: true,
      explanation: true,
      explanation_hindi: true,
      year: true,
      question_type: true,
      images: true,
    } as const;
    const gqSelect = {
      id: true,
      question_text: true,
      question_text_hindi: true,
      options: true,
      options_hindi: true,
      correct_answer: true,
      explanation: true,
      explanation_hindi: true,
      difficulty_level: true,
      question_type: true,
      images: true,
    } as const;

    const pyqsPromise =
      offset < pyqCount
        ? prisma.pYQ.findMany({
            where: { pattern_id: patternId },
            orderBy: [{ year: "desc" }, { id: "asc" }],
            skip: offset,
            take: Math.min(end, pyqCount) - offset,
            select: pyqSelect,
          })
        : Promise.resolve([]);

    const questionsPromise =
      end > pyqCount
        ? prisma.generatedQuestion.findMany({
            where: { pattern_id: patternId },
            orderBy: [{ difficulty_level: "asc" }, { id: "asc" }],
            skip: Math.max(0, offset - pyqCount),
            take: end - Math.max(offset, pyqCount),
            select: gqSelect,
          })
        : Promise.resolve([]);

    const [pyqs, questions] = await Promise.all([pyqsPromise, questionsPromise]);

    return {
      id: meta.id,
      subject: meta.subject,
      atomic_logic: meta.atomic_logic,
      short_notes: meta.short_notes,
      pyqs,
      questions,
      totalQ,
    };
  },
  ["topic-pattern-page"],
  { revalidate: 604800, tags: ["patterns"] },
);

export async function fetchPattern(
  exam: ExamSeoInfo,
  subjectLabel: string,
  topicSlug: string,
  pageNum: number,
  pageSize: number,
) {
  const examSlug    = toSlug(exam.examType);
  const branchSlug  = exam.branch ? toSlug(exam.branch) : "common";
  const subjectSlug = toSlug(subjectLabel);

  const match = await getPatternBySlug(examSlug, branchSlug, subjectSlug, topicSlug);
  if (!match) return null;

  return getPatternPage(match.id, pageNum, pageSize);
}

export function combineQuestions(
  pyqs: Awaited<ReturnType<typeof fetchPattern>> extends infer T
    ? T extends { pyqs: infer P } ? P : never
    : never,
  questions: Awaited<ReturnType<typeof fetchPattern>> extends infer T
    ? T extends { questions: infer Q } ? Q : never
    : never,
): CombinedQuestion[] {
  return [
    ...(pyqs as any[]).map((q): CombinedQuestion => ({
      source: "pyq",
      id: q.id,
      questionText: q.question_text,
      questionTextHindi: q.question_text_hindi,
      options: (q.options as string[]) ?? [],
      optionsHindi: (q.options_hindi as string[] | null) ?? null,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      explanationHindi: q.explanation_hindi,
      questionType: q.question_type,
      year: q.year,
      images: (q.images as any) ?? null,
    })),
    ...(questions as any[]).map((q): CombinedQuestion => ({
      source: "gq",
      id: q.id,
      questionText: q.question_text,
      questionTextHindi: q.question_text_hindi,
      options: (q.options as string[]) ?? [],
      optionsHindi: (q.options_hindi as string[] | null) ?? null,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      explanationHindi: q.explanation_hindi,
      questionType: q.question_type,
      difficulty: q.difficulty_level,
      images: (q.images as any) ?? null,
    })),
  ];
}
