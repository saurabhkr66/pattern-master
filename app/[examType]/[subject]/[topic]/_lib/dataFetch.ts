import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  toSlug,
  isCommonBranch,
  type ExamSeoInfo,
} from "@/lib/seo";

// Slug-matching needs every pattern for the exam_type, but the result is
// identical across every topic page of the same exam. Cache the small slug
// index (~30 KB per exam) so each crawl of N topic URLs is 1 query, not N.
export const getExamPatternIndex = unstable_cache(
  async (examType: string) => {
    return prisma.pattern.findMany({
      where: { exam_type: { equals: examType, mode: "insensitive" } },
      select: { id: true, topic_name: true, subject: true, branch: true, exam_type: true },
    });
  },
  ["exam-pattern-slug-index"],
  { revalidate: 3600, tags: ["patterns"] },
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

export async function fetchPattern(
  exam: ExamSeoInfo,
  subjectLabel: string,
  topicSlug: string,
  pageNum: number,
  pageSize: number,
) {
  // Match by slug equivalence in memory rather than strict DB string equality —
  // exam_type / branch / subject may all be stored with varying casing or
  // null branches (legacy data), so we fetch a generous candidate set and
  // filter using the same `toSlug` normalisation the URL was built from.
  const examTypeSlug = toSlug(exam.examType);
  const branchSlug = exam.branch ? toSlug(exam.branch) : null;
  const subjectSlug = toSlug(subjectLabel);

  const candidates = await getExamPatternIndex(exam.examType);

  const matched = candidates.filter((p) => {
    if (toSlug(p.exam_type) !== examTypeSlug) return false;
    // Branch: a URL with no branch slug (or our resolver returning "common"
    // as a tolerant fallback) matches rows with branch=null OR branch="Common".
    // A URL with a real branch like "cse" must match that branch exactly.
    const urlAbsentBranch = !branchSlug || branchSlug === "common";
    const rowAbsentBranch = !p.branch || isCommonBranch(p.branch);
    if (urlAbsentBranch !== rowAbsentBranch) return false;
    if (!urlAbsentBranch && p.branch && toSlug(p.branch) !== branchSlug) return false;
    if (toSlug(p.subject) !== subjectSlug) return false;
    return toSlug(p.topic_name) === topicSlug;
  });

  const match = matched[0];
  if (!match) return null;

  const meta = await prisma.pattern.findUnique({
    where: { id: match.id },
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

  // Combined order on the page is: all PYQs first, then all generated
  // questions. Slice the requested page across both buckets so we only read
  // the rows we actually render — a single topic can have hundreds of
  // questions and pulling them all per render was the egress hot spot.
  const offset = (pageNum - 1) * pageSize;
  const end = offset + pageSize;

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
          where: { pattern_id: match.id },
          orderBy: [{ year: "desc" }, { id: "asc" }],
          skip: offset,
          take: Math.min(end, pyqCount) - offset,
          select: pyqSelect,
        })
      : Promise.resolve([]);

  const questionsPromise =
    end > pyqCount
      ? prisma.generatedQuestion.findMany({
          where: { pattern_id: match.id },
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
