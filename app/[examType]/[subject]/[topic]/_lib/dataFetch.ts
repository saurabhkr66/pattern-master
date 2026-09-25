import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  toSlug,
  type ExamSeoInfo,
} from "@/lib/seo";
import { normalizeDifficulty } from "@/lib/difficulty";
import { countByYear, type YearCount } from "@/lib/yearCounts";

// Indexed slug lookup — Postgres maintains exam_slug/branch_slug/subject_slug/
// topic_slug as STORED generated columns and the pattern_slug_lookup index
// turns this into a single seek. Replaces the previous full-exam fetch +
// JS .filter() over toSlug() of every row.
const getPatternBySlug = (examSlug: string, branchSlug: string, subjectSlug: string, topicSlug: string) =>
  unstable_cache(
    () =>
      prisma.pattern.findFirst({
        where: {
          exam_slug: examSlug,
          branch_slug: branchSlug,
          subject_slug: subjectSlug,
          topic_slug: topicSlug,
        },
        select: { id: true },
      }),
    ["pattern-by-slug", examSlug, branchSlug, subjectSlug, topicSlug],
    { revalidate: 86400, tags: ["patterns"] },
  )();

// Slug → human label, used ONLY to resolve the pattern lookup (toSlug() round-
// trips it back, so the casing here never matters) and as a last-resort display
// fallback before the DB row is available.
//
// Do NOT use this for anything user- or crawler-visible: it title-cases the
// slug, so "sql" → "Sql", "dbms" → "Dbms", "b-plus-tree" → "B Plus Tree". Those
// are not the terms anyone searches for, and they were leaking into every topic
// <title> and <h1>. Display labels come from Pattern.subject / Pattern.topic_name
// (see fetchTopicLabels), which hold the real, correctly-cased names.
export function unslug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface HtmlFields {
  questionHtml?: string | null;
  questionHtmlHindi?: string | null;
  optionsHtml?: (string | null)[] | null;
  optionsHtmlHindi?: (string | null)[] | null;
  explanationHtml?: string | null;
  explanationHtmlHindi?: string | null;
}

export type CombinedQuestion =
  | ({
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
      // AI-classified, normalized to "Easy"|"Medium"|"Hard"; null = unclassified.
      difficulty: string | null;
      images?: { index: number; filename: string; type?: string }[] | null;
      // Question-type chip; null when the PYQ has none or its chapter isn't reviewed.
      subPattern?: SubPatternChip | null;
    } & HtmlFields)
  | ({
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
      difficulty: string | null;
      images?: { index: number; filename: string; type?: string }[] | null;
    } & HtmlFields);

// Shared by the paginated topic page and the per-type page. Any change here
// must bump BOTH cache keys ("topic-pattern-page" and "topic-subpattern-page").
const PYQ_SELECT = {
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
  difficulty: true,
  images: true,
  question_html: true,
  explanation_html: true,
  options_html: true,
  question_html_hindi: true,
  explanation_html_hindi: true,
  options_html_hindi: true,
  sub_pattern_id: true,
} as const;

const getPatternPage = (patternId: string, page: number, size: number) =>
  unstable_cache(
    async () => {
      const meta = await prisma.pattern.findUnique({
        where: { id: patternId },
        select: {
          id: true,
          subject: true,
          topic_name: true,
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
        question_html: true,
        explanation_html: true,
        options_html: true,
        question_html_hindi: true,
        explanation_html_hindi: true,
        options_html_hindi: true,
      } as const;

      const pyqsPromise =
        offset < pyqCount
          ? prisma.pYQ.findMany({
              where: { pattern_id: patternId },
              orderBy: [{ year: "desc" }, { id: "asc" }],
              skip: offset,
              take: Math.min(end, pyqCount) - offset,
              select: PYQ_SELECT,
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
        topic_name: meta.topic_name,
        atomic_logic: meta.atomic_logic,
        short_notes: meta.short_notes,
        pyqs,
        questions,
        totalQ,
      };
    },
    // "v2" = PYQ difficulty added to pyqSelect; retires the 7-day-cached
    // payloads that predate the column.
    // "v3" = topic_name added to the meta select (real display label). MUST be
    // bumped alongside any select change or the 7-day cache serves payloads
    // missing the new field.
    // "v4" = sub_pattern_id added to PYQ_SELECT (question-type chips).
    ["topic-pattern-page", "v4", patternId, String(page), String(size)],
    { revalidate: 604800, tags: ["patterns"] },
  )();

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

// Display labels + question count for a topic, with no question payload.
//
// generateMetadata() runs separately from the page body and needs the real
// Pattern.subject / Pattern.topic_name to build <title> and the description —
// but it has no use for 20 questions' worth of HTML. This keeps its own tiny
// cache entry so metadata never deserializes the full page payload.
//
// totalQ is returned so the description can say "Page N of M" without a second
// lookup (pagination pages must not share page 1's description verbatim).
const getTopicLabels = (patternId: string) =>
  unstable_cache(
    async () => {
      const meta = await prisma.pattern.findUnique({
        where: { id: patternId },
        select: {
          subject: true,
          topic_name: true,
          _count: { select: { pyqs: true, questions: true } },
        },
      });
      if (!meta) return null;

      return {
        subject: meta.subject,
        topicName: meta.topic_name,
        totalQ: meta._count.pyqs + meta._count.questions,
      };
    },
    ["topic-labels", patternId],
    { revalidate: 604800, tags: ["patterns"] },
  )();

export type TopicLabels = NonNullable<Awaited<ReturnType<typeof getTopicLabels>>>;

export async function fetchTopicLabels(
  exam: ExamSeoInfo,
  subjectLabel: string,
  topicSlug: string,
): Promise<TopicLabels | null> {
  const examSlug    = toSlug(exam.examType);
  const branchSlug  = exam.branch ? toSlug(exam.branch) : "common";
  const subjectSlug = toSlug(subjectLabel);

  const match = await getPatternBySlug(examSlug, branchSlug, subjectSlug, topicSlug);
  if (!match) return null;

  return getTopicLabels(match.id);
}

// Lightweight lookup for the dedicated notes page: just the concept notes and
// counts, no questions loaded. Separate cache key from the paginated question
// fetch so the notes route stays cheap.
const getTopicNotes = (patternId: string) =>
  unstable_cache(
    async () => {
      const meta = await prisma.pattern.findUnique({
        where: { id: patternId },
        select: {
          id: true,
          subject: true,
          topic_name: true,
          atomic_logic: true,
          short_notes: true,
          _count: { select: { pyqs: true, questions: true } },
        },
      });
      if (!meta) return null;

      return {
        id: meta.id,
        subject: meta.subject,
        topic_name: meta.topic_name,
        atomic_logic: meta.atomic_logic,
        short_notes: meta.short_notes,
        pyqCount: meta._count.pyqs,
        gqCount: meta._count.questions,
        totalQ: meta._count.pyqs + meta._count.questions,
      };
    },
    // "v2" = topic_name added to the select; retires cached payloads without it.
    ["topic-notes", "v2", patternId],
    { revalidate: 604800, tags: ["patterns"] },
  )();

export async function fetchTopicNotes(
  exam: ExamSeoInfo,
  subjectLabel: string,
  topicSlug: string,
) {
  const examSlug    = toSlug(exam.examType);
  const branchSlug  = exam.branch ? toSlug(exam.branch) : "common";
  const subjectSlug = toSlug(subjectLabel);

  const match = await getPatternBySlug(examSlug, branchSlug, subjectSlug, topicSlug);
  if (!match) return null;

  return getTopicNotes(match.id);
}

// Sibling topics in the same exam/branch/subject — powers the "Related topics"
// internal-link block at the bottom of a topic page. Real <a> links to every
// sibling spread internal-link equity across the subject's topic pages (helps
// thin/short_notes-less pages get discovered and indexed). Ordered by question
// count so the richest siblings surface first.
const getRelatedTopics = (
  examSlug: string,
  branchSlug: string,
  subjectSlug: string,
  currentTopicSlug: string,
  limit: number,
) =>
  unstable_cache(
    async () => {
      const siblings = await prisma.pattern.findMany({
        where: {
          exam_slug: examSlug,
          branch_slug: branchSlug,
          subject_slug: subjectSlug,
          topic_slug: { not: currentTopicSlug },
        },
        select: {
          topic_name: true,
          topic_slug: true,
          _count: { select: { pyqs: true, questions: true } },
        },
      });

      return siblings
        .map((s) => ({
          topicName: s.topic_name,
          topicSlug: s.topic_slug ?? toSlug(s.topic_name),
          totalQ: s._count.pyqs + s._count.questions,
        }))
        .filter((s) => s.totalQ > 0)
        .sort((a, b) => b.totalQ - a.totalQ)
        .slice(0, limit);
    },
    ["related-topics", examSlug, branchSlug, subjectSlug, currentTopicSlug, String(limit)],
    { revalidate: 604800, tags: ["patterns"] },
  )();

export type RelatedTopic = {
  topicName: string;
  topicSlug: string;
  totalQ: number;
};

export async function fetchRelatedTopics(
  exam: ExamSeoInfo,
  subjectLabel: string,
  currentTopicSlug: string,
  limit = 8,
): Promise<RelatedTopic[]> {
  const examSlug    = toSlug(exam.examType);
  const branchSlug  = exam.branch ? toSlug(exam.branch) : "common";
  const subjectSlug = toSlug(subjectLabel);

  return getRelatedTopics(examSlug, branchSlug, subjectSlug, currentTopicSlug, limit);
}

export type SubPatternChip = { name: string; slug: string; count: number };

// ─── Question-types (sub-patterns) ───────────────────────────────────────────
//
// Built by scripts/build-subpatterns.ts, checked at /admin/sub-patterns. Only
// REVIEWED types are public. The catch-all "Other / mixed" pile (and any pile
// of one) is never shown as a type — it's a leftover bucket, not a method.
const HIDDEN_TYPE_SLUG = "other-mixed";

export type SubPatternSummaryItem = {
  id: string;
  name: string;
  slug: string;
  method: string;
  trick: string | null;
  count: number;
  years: number[];
  // Questions of this type per year, oldest first (JEE-style multi-shift
  // years routinely have 2+).
  yearCounts: YearCount[];
};

export type SubPatternSummary = {
  types: SubPatternSummaryItem[];
  pyqCount: number;
  // % of the chapter's PYQs covered by the 5 biggest types.
  coverageTop5: number;
};

const getSubPatternSummary = (patternId: string) =>
  unstable_cache(
    async (): Promise<SubPatternSummary> => {
      const [types, pyqCount] = await Promise.all([
        prisma.subPattern.findMany({
          where: { pattern_id: patternId, reviewed: true },
          select: { id: true, name: true, slug: true, method: true, trick: true, pyqs: { select: { year: true } } },
        }),
        prisma.pYQ.count({ where: { pattern_id: patternId } }),
      ]);

      const items = types
        .filter((t) => t.slug !== HIDDEN_TYPE_SLUG && t.pyqs.length >= 2)
        .map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          method: t.method,
          trick: t.trick,
          count: t.pyqs.length,
          years: [...new Set(t.pyqs.map((q) => q.year))].sort((a, b) => a - b),
          yearCounts: countByYear(t.pyqs.map((q) => q.year)),
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      const top5 = items.slice(0, 5).reduce((s, t) => s + t.count, 0);
      return {
        types: items,
        pyqCount,
        coverageTop5: pyqCount ? Math.round((top5 / pyqCount) * 100) : 0,
      };
    },
    // "v2" = yearCounts added.
    ["topic-subpatterns", "v2", patternId],
    { revalidate: 604800, tags: ["patterns"] },
  )();

export function fetchSubPatternSummary(patternId: string) {
  return getSubPatternSummary(patternId);
}

/** id → chip, for tagging questions in QuestionList. */
export function subPatternChips(summary: SubPatternSummary | null): Map<string, SubPatternChip> {
  return new Map((summary?.types ?? []).map((t) => [t.id, { name: t.name, slug: t.slug, count: t.count }]));
}

// One type's page: every PYQ in it (a type is small — no pagination).
const getSubPatternPage = (patternId: string, typeSlug: string) =>
  unstable_cache(
    async () => {
      const type = await prisma.subPattern.findUnique({
        where: { pattern_id_slug: { pattern_id: patternId, slug: typeSlug } },
        select: { id: true, name: true, slug: true, method: true, trick: true, reviewed: true },
      });
      if (!type || !type.reviewed || type.slug === HIDDEN_TYPE_SLUG) return null;
      const pyqs = await prisma.pYQ.findMany({
        where: { sub_pattern_id: type.id },
        orderBy: [{ year: "desc" }, { id: "asc" }],
        select: PYQ_SELECT,
      });
      if (pyqs.length < 2) return null;
      return { type, pyqs };
    },
    ["topic-subpattern-page", "v1", patternId, typeSlug],
    { revalidate: 604800, tags: ["patterns"] },
  )();

/** Resolves the chapter by slug, then the type. null → 404. */
export async function fetchSubPatternPage(
  exam: ExamSeoInfo,
  subjectLabel: string,
  topicSlug: string,
  typeSlug: string,
) {
  const examSlug    = toSlug(exam.examType);
  const branchSlug  = exam.branch ? toSlug(exam.branch) : "common";
  const subjectSlug = toSlug(subjectLabel);

  const match = await getPatternBySlug(examSlug, branchSlug, subjectSlug, topicSlug);
  if (!match) return null;

  const [page, labels] = await Promise.all([
    getSubPatternPage(match.id, typeSlug),
    getTopicLabels(match.id),
  ]);
  if (!page || !labels) return null;
  return { patternId: match.id, labels, ...page };
}

export function combineQuestions(
  pyqs: Awaited<ReturnType<typeof fetchPattern>> extends infer T
    ? T extends { pyqs: infer P } ? P : never
    : never,
  questions: Awaited<ReturnType<typeof fetchPattern>> extends infer T
    ? T extends { questions: infer Q } ? Q : never
    : never,
  chips?: Map<string, SubPatternChip>,
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
      difficulty: normalizeDifficulty(q.difficulty),
      subPattern: (q.sub_pattern_id && chips?.get(q.sub_pattern_id)) || null,
      images: (q.images as any) ?? null,
      questionHtml: q.question_html ?? null,
      questionHtmlHindi: q.question_html_hindi ?? null,
      optionsHtml: (q.options_html as (string | null)[] | null) ?? null,
      optionsHtmlHindi: (q.options_html_hindi as (string | null)[] | null) ?? null,
      explanationHtml: q.explanation_html ?? null,
      explanationHtmlHindi: q.explanation_html_hindi ?? null,
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
      difficulty: normalizeDifficulty(q.difficulty_level),
      images: (q.images as any) ?? null,
      questionHtml: q.question_html ?? null,
      questionHtmlHindi: q.question_html_hindi ?? null,
      optionsHtml: (q.options_html as (string | null)[] | null) ?? null,
      optionsHtmlHindi: (q.options_html_hindi as (string | null)[] | null) ?? null,
      explanationHtml: q.explanation_html ?? null,
      explanationHtmlHindi: q.explanation_html_hindi ?? null,
    })),
  ];
}
