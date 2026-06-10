import "server-only";
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/dbRetry";
import { getObjectBase64 } from "@/lib/r2";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
} from "@/lib/coachingQuestionCache";
import type { RuntimeTest } from "@/lib/coachingTestRuntime";
import type { NormalizedQuestion } from "@/lib/resolveQuestions";
import {
  computeAttemptScore,
  computeGradingStatus,
  type StoredAnswers,
} from "@/lib/coachingScore";
import {
  isSubjectiveEntry,
  type SubjectiveAnswerEntry,
  type SubjectiveConfidence,
} from "@/lib/subjectiveTypes";
import { invalidateTestLeaderboard } from "@/lib/coachingLeaderboard";
import { invalidateAttemptResult } from "@/lib/coachingResult";

// Async Gemini grading of photographed subjective answers. Triggered via
// after() from submit/finalize (auto) and from the admin "Grade ungraded"
// button (retry net). One invocation grades a WHOLE attempt in memory and
// lands ONE TestAttempt.update — no per-question writes, so concurrent runs
// can't clobber each other's JSON (Neon HTTP has no transactions).

const MODEL = process.env.SUBJECTIVE_GRADER_MODEL || "gemini-3.1-flash-lite";
const CONCURRENCY = 3; // parallel Gemini calls per attempt

const GRADE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    marks_awarded: { type: SchemaType.NUMBER },
    feedback: { type: SchemaType.STRING },
    confidence: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["high", "medium", "low"],
    },
  },
  required: ["marks_awarded", "feedback", "confidence"],
};

function graderModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenerativeAI(key).getGenerativeModel({
    model: MODEL,
    generationConfig: {
      // temperature 0 → deterministic, consistent grading across students.
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: GRADE_SCHEMA,
      maxOutputTokens: 1024,
    },
  });
}

function buildGradingPrompt(q: NormalizedQuestion): string {
  const modelAnswer =
    q.solution?.trim() ||
    "No model answer was provided — grade on the correctness of the concepts using standard subject knowledge.";
  return [
    "You are an experienced school teacher grading ONE student's handwritten answer, photographed and attached as image(s) (multiple images = pages of the same answer, in order).",
    "",
    `QUESTION:\n${q.question_text}`,
    q.question_text_hindi ? `\nQUESTION (Hindi):\n${q.question_text_hindi}` : "",
    `\nMODEL ANSWER:\n${modelAnswer}`,
    `\nMAXIMUM MARKS: ${q.marks}`,
    "",
    "GRADING RULES:",
    "- Award marks for correct concepts even if the phrasing differs from the model answer.",
    "- Do NOT penalise extra correct information, grammar, spelling, or handwriting style unless it changes the meaning.",
    "- The student may answer in English, Hindi, or a mix — grade the content, not the language.",
    "- Partial credit is expected: award proportionally for partially correct answers.",
    `- marks_awarded must be between 0 and ${q.marks}, in steps of 0.5.`,
    "- If the image is blank, unreadable, or not an answer to this question, award 0 and say why in the feedback.",
    "",
    "feedback: 1–3 sentences addressed to the student (what was right, what was missing).",
    'confidence: "high" = clearly readable and unambiguous against the model answer; "medium" = readable but the marks involve judgement; "low" = hard to read, ambiguous, or you are unsure.',
    "",
    "Return ONLY the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Grade one answer's image(s) against its question. Throws on Gemini failure. */
export async function gradeSubjectiveAnswer(
  q: NormalizedQuestion,
  images: { data: string; mimeType: string }[]
): Promise<{ marks: number; feedback: string; confidence: SubjectiveConfidence }> {
  const model = graderModel();
  const res = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: buildGradingPrompt(q) },
          ...images.map((img) => ({
            inlineData: { mimeType: img.mimeType, data: img.data },
          })),
        ],
      },
    ],
  });
  const text = res.response.text();
  const parsed = JSON.parse(text) as {
    marks_awarded?: unknown;
    feedback?: unknown;
    confidence?: unknown;
  };

  const raw = Number(parsed.marks_awarded);
  if (!Number.isFinite(raw)) throw new Error("grader returned non-numeric marks");
  // Clamp to [0, max] and snap to 0.5 steps.
  const marks = Math.min(Math.max(Math.round(raw * 2) / 2, 0), q.marks);
  const confidence: SubjectiveConfidence =
    parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
      ? parsed.confidence
      : "low"; // unknown confidence → treat as low (teacher reviews)
  const feedback = typeof parsed.feedback === "string" ? parsed.feedback.slice(0, 1000) : "";
  return { marks, feedback, confidence };
}

/** Bounded-concurrency map (no p-limit dep). */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export type GradeAttemptResult = {
  graded: number;
  flagged: number;
  skipped: number;
  pending: number;
  status: string;
};

/**
 * Grade every ungraded subjective answer of a submitted attempt and write the
 * result in ONE update. Idempotent: already-graded entries are skipped unless
 * `force`; manual overrides are NEVER touched. Safe to re-run any time —
 * temperature-0 grading makes concurrent duplicate runs converge.
 */
export async function gradeAttemptSubjectives(opts: {
  attemptId: string;
  coachingId: string;
  force?: boolean;
  trigger: "auto" | "admin";
}): Promise<GradeAttemptResult> {
  const { attemptId, coachingId, force = false, trigger } = opts;

  const attempt = await withDbRetry(() =>
    prisma.testAttempt.findFirst({
      where: { id: attemptId, coaching_id: coachingId },
      select: {
        id: true,
        status: true,
        answers: true,
        student_id: true,
        grading_status: true,
        test: { select: { id: true, questions: true, shuffle: true, pool_size: true } },
      },
    })
  );
  if (!attempt || attempt.status !== "submitted") {
    return { graded: 0, flagged: 0, skipped: 0, pending: 0, status: attempt?.grading_status ?? "none" };
  }
  if (!force && (attempt.grading_status === "none" || attempt.grading_status === "done")) {
    return { graded: 0, flagged: 0, skipped: 1, pending: 0, status: attempt.grading_status };
  }

  const runtimeTest: RuntimeTest = {
    id: attempt.test.id,
    questions: attempt.test.questions,
    shuffle: attempt.test.shuffle,
    pool_size: attempt.test.pool_size,
  };
  const base = await getResolvedTestQuestions(runtimeTest, coachingId);
  const resolved = studentQuestionsFromBase(base, runtimeTest, attempt.student_id);
  const answers = (attempt.answers ?? {}) as StoredAnswers;

  // Select what actually needs grading.
  const todo: { q: NormalizedQuestion; entry: SubjectiveAnswerEntry }[] = [];
  for (const q of resolved) {
    if (q.question_type !== "subjective") continue;
    const v = answers[q.id];
    if (!isSubjectiveEntry(v) || v.image_keys.length === 0) continue;
    if (v.manual_override != null) continue; // teacher already decided
    if (!force && v.gemini_marks != null && !v.flagged) continue; // already AI-graded
    todo.push({ q, entry: v });
  }
  if (todo.length === 0) {
    return { graded: 0, flagged: 0, skipped: 1, pending: 0, status: attempt.grading_status };
  }

  // Grade in memory (concurrency-limited). Per-question failure → flagged entry;
  // the rest of the paper still grades.
  let graded = 0;
  let flagged = 0;
  const results = await mapLimit(todo, CONCURRENCY, async ({ q, entry }) => {
    try {
      const images = await Promise.all(entry.image_keys.map((k) => getObjectBase64(k)));
      const g = await gradeSubjectiveAnswer(q, images);
      graded++;
      return {
        qId: q.id,
        patch: {
          gemini_marks: g.marks,
          gemini_feedback: g.feedback,
          gemini_confidence: g.confidence,
          flagged: false,
        } as Partial<SubjectiveAnswerEntry>,
      };
    } catch (err) {
      console.error(`[grade:${trigger}] attempt ${attemptId} q ${q.id} failed:`, err);
      flagged++;
      return { qId: q.id, patch: { flagged: true } as Partial<SubjectiveAnswerEntry> };
    }
  });

  // Merge onto a FRESH read — a teacher may have overridden an answer while we
  // were grading; their decision always survives. The student can't write
  // post-submit, so the only other writer is another grading run (which, at
  // temperature 0, produced the same marks anyway).
  const fresh = await withDbRetry(() =>
    prisma.testAttempt.findFirst({
      where: { id: attemptId, coaching_id: coachingId },
      select: { answers: true, status: true },
    })
  );
  if (!fresh || fresh.status !== "submitted") {
    return { graded, flagged, skipped: 0, pending: 0, status: attempt.grading_status };
  }
  const merged = { ...((fresh.answers ?? {}) as StoredAnswers) };
  for (const r of results) {
    const cur = merged[r.qId];
    if (!isSubjectiveEntry(cur)) continue; // answer shape changed under us — skip
    if (cur.manual_override != null) continue; // teacher won the race
    merged[r.qId] = { ...cur, ...r.patch };
  }

  const { score, sectionScores, pendingSubjective } = computeAttemptScore(resolved, merged);
  const gradingStatus = computeGradingStatus(resolved, merged);

  await withDbRetry(() =>
    prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        answers: merged as object,
        score,
        section_scores: sectionScores ?? undefined,
        grading_status: gradingStatus,
      },
    })
  );

  // Marks changed → the cached leaderboard and this attempt's cached result are
  // both stale now.
  await Promise.all([
    invalidateTestLeaderboard(attempt.test.id),
    invalidateAttemptResult(attemptId),
  ]);

  return { graded, flagged, skipped: 0, pending: pendingSubjective, status: gradingStatus };
}
