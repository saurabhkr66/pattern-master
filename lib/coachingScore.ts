import "server-only";
import { scoreQuestion, type NormalizedQuestion } from "@/lib/resolveQuestions";
import { isSubjectiveEntry, type SubjectiveAnswerEntry } from "@/lib/subjectiveTypes";

// THE one scoring formula for a coaching attempt. Submit-time finalize, the
// async Gemini grading worker, and the teacher's manual override all recompute
// through here, so the three can never disagree on what an attempt is worth.
//
// Objective questions: scoreQuestion (mcq/msq/nat), raw sum floored at 0.
// Subjective questions: finalMarks precedence —
//   manual_override                      if set (teacher always wins)
//   gemini_marks                         if !flagged && confidence ∈ {high, medium}
//   0 + pending                          otherwise (flagged | low | not yet graded)
// Subjective marks are never negative and are clamped to the question's marks.

export type StoredAnswer = string | SubjectiveAnswerEntry;
export type StoredAnswers = Record<string, StoredAnswer>;

export type SectionScore = {
  name: string;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
};

const clampMarks = (m: number, max: number) => Math.min(Math.max(m, 0), max);

/** Final marks + pending flag for one subjective entry (see precedence above). */
export function subjectiveEntryMarks(
  entry: SubjectiveAnswerEntry,
  questionMarks: number
): { marks: number; pending: boolean } {
  if (entry.manual_override != null) {
    return { marks: clampMarks(entry.manual_override, questionMarks), pending: false };
  }
  if (
    !entry.flagged &&
    entry.gemini_marks != null &&
    (entry.gemini_confidence === "high" || entry.gemini_confidence === "medium")
  ) {
    return { marks: clampMarks(entry.gemini_marks, questionMarks), pending: false };
  }
  // Flagged, low confidence, or not yet graded — counts as 0 until a human
  // (or a re-grade) lands. pending only if there is actually something to grade.
  return { marks: 0, pending: entry.image_keys.length > 0 };
}

/**
 * The attempt's grading lifecycle, derivable from its answers at any point:
 *   none    — the paper has no subjective questions
 *   done    — every subjective answer has final marks (or was never answered)
 *   pending — ≥1 answer the AI hasn't attempted yet
 *   review  — AI pass done, but ≥1 answer needs the teacher (low conf / flagged)
 */
export function computeGradingStatus(
  resolved: NormalizedQuestion[],
  answers: StoredAnswers
): string {
  let hasSubjective = false;
  let anyPending = false;
  let anyUngraded = false;
  for (const q of resolved) {
    if (q.question_type !== "subjective") continue;
    hasSubjective = true;
    const v = answers[q.id];
    if (!isSubjectiveEntry(v) || v.image_keys.length === 0) continue; // unanswered
    const { pending } = subjectiveEntryMarks(v, q.marks);
    if (pending) {
      anyPending = true;
      if (v.gemini_marks == null && !v.flagged) anyUngraded = true;
    }
  }
  if (!hasSubjective) return "none";
  if (!anyPending) return "done";
  return anyUngraded ? "pending" : "review";
}

/**
 * Score a full attempt from its STORED answers (original option space — the
 * caller de-shuffles before storing). Returns the total, the per-section tally
 * (null when the paper has ≤1 section, matching the consumer shape), and how
 * many subjective answers are still pending.
 */
export function computeAttemptScore(
  resolved: NormalizedQuestion[],
  answers: StoredAnswers
): {
  score: number;
  maxScore: number;
  sectionScores: SectionScore[] | null;
  pendingSubjective: number;
} {
  let objective = 0;
  let subjective = 0;
  let maxScore = 0;
  let pendingSubjective = 0;
  type SecAcc = { score: number; maxScore: number; correct: number; wrong: number; skipped: number };
  const sectionMap = new Map<string, SecAcc>();
  const secOf = (name: string) => {
    const t = sectionMap.get(name) ?? { score: 0, maxScore: 0, correct: 0, wrong: 0, skipped: 0 };
    sectionMap.set(name, t);
    return t;
  };

  for (const q of resolved) {
    maxScore += q.marks;
    const v = answers[q.id];
    const sec = q.subject ? secOf(q.subject) : null;
    if (sec) sec.maxScore += q.marks;

    if (q.question_type === "subjective") {
      if (!isSubjectiveEntry(v) || v.image_keys.length === 0) {
        if (sec) sec.skipped++;
        continue;
      }
      const { marks, pending } = subjectiveEntryMarks(v, q.marks);
      subjective += marks;
      if (pending) pendingSubjective++;
      if (sec) {
        sec.score += marks;
        // Pending answers bump neither correct nor wrong — they're undecided.
        if (!pending) {
          if (marks > 0) sec.correct++;
          else sec.wrong++;
        }
      }
      continue;
    }

    const ua = typeof v === "string" ? v : "";
    const s = scoreQuestion(q, ua) ?? 0;
    objective += s;
    if (sec) {
      sec.score += s;
      const answered = ua.trim() !== "";
      if (!answered) sec.skipped++;
      else if (s > 0) sec.correct++;
      else sec.wrong++;
    }
  }

  // Negative marking can push the objective sum below zero; the displayed total
  // never goes negative (matches the consumer mock flow). Subjective marks are
  // already ≥0 and are added after the floor so they're never eaten by it.
  const score = Math.max(0, objective) + subjective;

  const sectionScores =
    sectionMap.size > 1
      ? [...sectionMap.entries()].map(([name, t]) => ({
          name,
          score: Math.max(0, Math.round(t.score * 100) / 100),
          maxScore: t.maxScore,
          correct: t.correct,
          wrong: t.wrong,
          skipped: t.skipped,
        }))
      : null;

  return { score: Math.round(score * 100) / 100, maxScore, sectionScores, pendingSubjective };
}
