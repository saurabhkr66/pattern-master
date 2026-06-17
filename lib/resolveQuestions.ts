import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Question Resolver — the single abstraction that lets a coaching test draw
 * from either the coaching's own question bank OR the consumer PYQ/Generated
 * banks, and feeds the existing test engine a uniform shape. The engine, the
 * student test page, and the scorer all speak `NormalizedQuestion`; only this
 * file knows the per-source storage differences.
 *
 * Tenant safety: coaching questions are always queried WITH coaching_id in the
 * where-clause, so a test can never resolve another coaching's questions even
 * if a stale/forged id leaks into the test definition.
 */

export type QSource = "coaching" | "pyq" | "generated";
export type NormQType = "mcq" | "msq" | "nat" | "subjective";

/** A question reference as stored in CoachingTest.questions (JSON array). */
export interface QuestionRef {
  id: string;
  source: QSource;
  marks?: number; // overrides the question's own max_marks for this test
  neg_marks?: number; // negative marking (MCQ only); default 0
}

/** Full server-side question — INCLUDES answers. Never send to the client. */
export interface NormalizedQuestion {
  id: string;
  source: QSource;
  question_type: NormQType;
  question_text: string;
  question_html: string | null;
  /** Option texts in label order (A=0, B=1, …). Empty for nat/subjective. */
  options: string[];
  /** Letter(s) for mcq/msq ("A" or "A;C"), numeric string for nat, "" for subjective. */
  correct_answer: string;
  solution: string | null;
  solution_html: string | null;
  marks: number;
  neg_marks: number;
  nat_tolerance: number | null;
  subject: string | null;
  topic: string | null;
  // `type` follows the PYQ convention: omitted/"question" → shown with the
  // question; "explanation" → shown in the worked-solution block.
  images: { index: number; filename: string; type?: "question" | "explanation" }[] | null;
  // Bilingual: Hindi counterparts (null/[] → render falls back to English).
  question_text_hindi: string | null;
  question_html_hindi: string | null;
  options_hindi: string[];
  solution_hindi: string | null;
  solution_html_hindi: string | null;
}

/** Client-safe question — answers/solutions stripped. Safe to send mid-test. */
export type ClientQuestion = Omit<
  NormalizedQuestion,
  | "correct_answer"
  | "solution"
  | "solution_html"
  | "solution_hindi"
  | "solution_html_hindi"
  | "nat_tolerance"
>;

type StoredOption = { label: string; text: string };

function normalizeCoachingOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const opts = raw as StoredOption[];
  // Sort by label so the text array index lines up with A/B/C/D letters.
  return [...opts]
    .filter((o) => o && typeof o.text === "string")
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    .map((o) => o.text);
}

function normalizeConsumerOptions(raw: unknown): string[] {
  // PYQ / GeneratedQuestion already store options as a JSON string[].
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  return [];
}

function toEngineType(t: string): NormQType {
  const u = t.toUpperCase();
  if (u === "MSQ") return "msq";
  if (u === "NAT") return "nat";
  if (u === "SUBJECTIVE") return "subjective";
  return "mcq";
}

const asImages = (raw: unknown): NormalizedQuestion["images"] =>
  Array.isArray(raw) ? (raw as NormalizedQuestion["images"]) : null;

/**
 * Resolve an ordered list of question refs into NormalizedQuestion[], preserving
 * ref order. Missing ids (deleted questions, wrong tenant) are silently skipped —
 * the test simply has fewer questions, never another tenant's data.
 */
export async function resolveQuestions(
  refs: QuestionRef[],
  coachingId: string
): Promise<NormalizedQuestion[]> {
  const coachingIds = refs.filter((r) => r.source === "coaching").map((r) => r.id);
  const pyqIds = refs.filter((r) => r.source === "pyq").map((r) => r.id);
  const generatedIds = refs.filter((r) => r.source === "generated").map((r) => r.id);

  // Subject/topic for PYQ/Generated live on the Pattern. Rather than two nested
  // relation includes (each a separate query on the Neon HTTP adapter), we fetch
  // just pattern_id here and resolve all patterns in ONE batched query below.
  const consumerSelect = {
    id: true,
    pattern_id: true,
    question_text: true,
    question_html: true,
    options: true,
    correct_answer: true,
    explanation: true,
    explanation_html: true,
    question_type: true,
    marks: true,
    topic: true,
    images: true,
    question_text_hindi: true,
    question_html_hindi: true,
    options_hindi: true,
    explanation_hindi: true,
    explanation_html_hindi: true,
  } as const;

  const [coachingRows, pyqRows, generatedRows] = await Promise.all([
    coachingIds.length
      ? prisma.coachingQuestion.findMany({
          where: { id: { in: coachingIds }, coaching_id: coachingId },
          // Only the fields the assembly below actually reads.
          select: {
            id: true,
            question_type: true,
            question_text: true,
            question_html: true,
            options: true,
            correct_answer: true,
            solution: true,
            solution_html: true,
            max_marks: true,
            nat_tolerance: true,
            subject: true,
            topic: true,
            images: true,
            question_text_hindi: true,
            question_html_hindi: true,
            options_hindi: true,
            solution_hindi: true,
            solution_html_hindi: true,
          },
        })
      : Promise.resolve([]),
    pyqIds.length
      ? prisma.pYQ.findMany({ where: { id: { in: pyqIds } }, select: consumerSelect })
      : Promise.resolve([]),
    generatedIds.length
      ? prisma.generatedQuestion.findMany({
          where: { id: { in: generatedIds } },
          select: consumerSelect,
        })
      : Promise.resolve([]),
  ]);

  // One batched lookup for every Pattern referenced by either consumer source.
  const patternIds = [
    ...new Set(
      [...pyqRows, ...generatedRows].map((r) => r.pattern_id).filter(Boolean)
    ),
  ];
  const patternRows = patternIds.length
    ? await prisma.pattern.findMany({
        where: { id: { in: patternIds } },
        select: { id: true, subject: true, topic_name: true },
      })
    : [];
  const patternMap = new Map(patternRows.map((p) => [p.id, p]));

  // Index by id for O(1) ordered assembly.
  const coachingMap = new Map(coachingRows.map((r) => [r.id, r]));
  const pyqMap = new Map(pyqRows.map((r) => [r.id, r]));
  const generatedMap = new Map(generatedRows.map((r) => [r.id, r]));

  const out: NormalizedQuestion[] = [];

  for (const ref of refs) {
    if (ref.source === "coaching") {
      const r = coachingMap.get(ref.id);
      if (!r) continue;
      out.push({
        id: r.id,
        source: "coaching",
        question_type: toEngineType(r.question_type),
        question_text: r.question_text,
        question_html: r.question_html ?? null,
        options: normalizeCoachingOptions(r.options),
        correct_answer: r.correct_answer ?? "",
        solution: r.solution ?? null,
        solution_html: r.solution_html ?? null,
        marks: ref.marks ?? r.max_marks ?? 1,
        neg_marks: ref.neg_marks ?? 0,
        nat_tolerance: r.nat_tolerance ?? null,
        subject: r.subject ?? null,
        topic: r.topic ?? null,
        images: asImages(r.images),
        question_text_hindi: r.question_text_hindi ?? null,
        question_html_hindi: r.question_html_hindi ?? null,
        options_hindi: normalizeCoachingOptions(r.options_hindi),
        solution_hindi: r.solution_hindi ?? null,
        solution_html_hindi: r.solution_html_hindi ?? null,
      });
    } else {
      const r =
        ref.source === "pyq" ? pyqMap.get(ref.id) : generatedMap.get(ref.id);
      if (!r) continue;
      const pattern = patternMap.get(r.pattern_id);
      out.push({
        id: r.id,
        source: ref.source,
        question_type: toEngineType(r.question_type),
        question_text: r.question_text,
        question_html: r.question_html ?? null,
        options: normalizeConsumerOptions(r.options),
        correct_answer: r.correct_answer ?? "",
        solution: r.explanation ?? null,
        solution_html: r.explanation_html ?? null,
        marks: ref.marks ?? r.marks ?? 1,
        neg_marks: ref.neg_marks ?? 0,
        nat_tolerance: null,
        // Prefer the Pattern's real subject/topic; fall back to the PYQ.topic field.
        subject: pattern?.subject ?? r.topic ?? null,
        topic: pattern?.topic_name ?? r.topic ?? null,
        images: asImages(r.images),
        question_text_hindi: r.question_text_hindi ?? null,
        question_html_hindi: r.question_html_hindi ?? null,
        options_hindi: normalizeConsumerOptions(r.options_hindi),
        solution_hindi: r.explanation_hindi ?? null,
        solution_html_hindi: r.explanation_html_hindi ?? null,
      });
    }
  }

  return out;
}

/** Strip answers/solutions so a question is safe to send to the browser mid-test. */
export function stripAnswers(q: NormalizedQuestion): ClientQuestion {
  const {
    correct_answer,
    solution,
    solution_html,
    solution_hindi,
    solution_html_hindi,
    nat_tolerance,
    ...safe
  } = q;
  void correct_answer;
  void solution;
  void solution_html;
  void solution_hindi;
  void solution_html_hindi;
  void nat_tolerance;
  return safe;
}

/**
 * Score a single answer against a resolved question.
 *  - mcq:  exact letter match → +marks; wrong non-empty answer → −neg_marks; blank → 0
 *  - msq:  all-correct-none-wrong → +marks; otherwise 0 (no partial in v1)
 *  - nat:  within ± tolerance → +marks; else 0 (never negative)
 *  - subjective: returns null — must be graded manually (TestAttempt.manual_scores)
 */
export function scoreQuestion(
  q: NormalizedQuestion,
  userAnswer: string | null | undefined
): number | null {
  const answer = (userAnswer ?? "").trim();

  if (q.question_type === "subjective") return null;

  if (q.question_type === "nat") {
    if (answer === "") return 0;
    const got = parseFloat(answer);
    const want = parseFloat(q.correct_answer);
    if (!Number.isFinite(got) || !Number.isFinite(want)) return 0;
    return Math.abs(got - want) <= (q.nat_tolerance ?? 0) ? q.marks : 0;
  }

  if (q.question_type === "msq") {
    if (answer === "") return 0;
    const sel = new Set(answer.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean));
    const correct = q.correct_answer.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    const correctSet = new Set(correct);
    const anyWrong = [...sel].some((l) => !correctSet.has(l));
    const allRight = correct.every((l) => sel.has(l)) && sel.size === correct.length;
    return !anyWrong && allRight ? q.marks : 0;
  }

  // mcq
  if (answer === "") return 0;
  // neg_marks is a positive penalty magnitude by contract; the wrong-answer
  // award is its negation. Clamp with abs() defensively: a value mistakenly
  // stored as negative (e.g. a UI sending -1 for "minus one") must NOT flip the
  // penalty into a positive award — that would mark every wrong MCQ correct.
  const penalty = Math.abs(q.neg_marks);
  return answer.toUpperCase() === q.correct_answer.trim().toUpperCase()
    ? q.marks
    : -penalty;
}
