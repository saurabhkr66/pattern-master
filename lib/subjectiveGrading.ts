import "server-only";
import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerationConfig,
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

export const MODEL = process.env.SUBJECTIVE_GRADER_MODEL || "gemini-3.1-flash-lite";
const CONCURRENCY = 3; // parallel Gemini calls per attempt

// Thinking level for the grader. Gemini 3.x flash-lite controls thinking by
// LEVEL (MINIMAL | LOW | MEDIUM | HIGH), not a numeric budget. Component-wise
// marking benefits from a reasoning pass, so default it on at LOW. Env-overridable
// to dial up accuracy (MEDIUM/HIGH) or down for cost (MINIMAL) at scale.
export const THINKING_LEVEL = process.env.SUBJECTIVE_GRADER_THINKING_LEVEL || "LOW";

// PROCESS-WIDE rate limiter for grading calls. Each submitted attempt fires its
// OWN after() grader (no shared queue), so the per-attempt CONCURRENCY cap can't
// bound total load: 100 students × 15 subjective Qs all auto-submitting at the
// buzzer = ~1,500 calls bursting at once, blowing past Gemini's per-minute quota
// (throttled calls would land as flagged → teacher review). This module-level
// limiter smoothly spaces EVERY call across all concurrent attempts at
// 60000/RPM ms, so the spike drains at a steady safe rate instead of bursting.
//
// The VPS runs a single Node process, so this is a true global cap there. On a
// multi-instance/serverless host it limits per-instance only.
//
// Default 250 = paid Gemini Tier 1 (300 RPM / 1M TPM for flash-lite) with
// headroom for retry calls, which also draw a slot. At 250/min a 100-student ×
// 15-question paper (~1,500 calls) drains in ~6 min, and 250 calls × ~2K tokens
// each stays well under the 1M TPM ceiling. Bump SUBJECTIVE_GRADER_RPM if you
// upgrade to a higher tier; drop it to ~20 if you fall back to the free tier.
const RPM = Number(process.env.SUBJECTIVE_GRADER_RPM) || 250;
const MIN_INTERVAL_MS = Math.ceil(60_000 / Math.max(1, RPM));
const MAX_RETRIES = Number(process.env.SUBJECTIVE_GRADER_RETRIES) || 4;

// Next free dispatch slot (epoch ms). Each acquire reserves max(now, nextSlot)
// and pushes the cursor forward by one interval, so callers are served FIFO at a
// fixed cadence regardless of which attempt they belong to.
let nextSlotMs = 0;
function rateLimitSlot(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlotMs);
  nextSlotMs = slot + MIN_INTERVAL_MS;
  const wait = slot - now;
  return wait > 0 ? new Promise((r) => setTimeout(r, wait)) : Promise.resolve();
}

// Gemini 429 (RESOURCE_EXHAUSTED) / 503 (overloaded) are transient — back off
// and retry rather than flagging the answer for a human. Everything else (bad
// JSON, auth, schema) throws straight through to the caller's flag path.
function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b|\b503\b|RESOURCE_EXHAUSTED|overloaded|rate.?limit|too many requests|unavailable/i.test(
    msg
  );
}

/** Rate-limited Gemini call with exponential backoff on transient errors. */
async function callGeminiWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await rateLimitSlot(); // a retry is another API call → it consumes a slot too
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || attempt >= MAX_RETRIES) throw err;
      const backoff = Math.min(30_000, 1000 * 2 ** attempt) + Math.random() * 500;
      console.warn(
        `[grade] transient Gemini error (retry ${attempt + 1}/${MAX_RETRIES}, backoff ${Math.round(backoff)}ms):`,
        err instanceof Error ? err.message : err
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

const GRADE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    // feedback is emitted BEFORE marks_awarded on purpose: the grader writes its
    // per-component marking breakdown first, then marks_awarded follows as the SUM.
    // Structured output generates top-to-bottom, so this makes it mark each part
    // and reason before committing to a number — instead of guessing a holistic
    // score up front and rationalising it (which over-credited wrong parts).
    feedback: { type: SchemaType.STRING },
    marks_awarded: { type: SchemaType.NUMBER },
    confidence: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["high", "medium", "low"],
    },
    // Only filled when no model answer was provided: the ideal answer Gemini
    // wrote itself and graded against. Empty string otherwise.
    model_answer: { type: SchemaType.STRING },
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
      // Bumped to 4096 so thinking tokens (which count against the output
      // budget) don't starve the JSON answer and truncate it.
      maxOutputTokens: 4096,
      // thinkingConfig isn't in the legacy SDK's GenerationConfig type yet, but
      // the SDK forwards generationConfig verbatim to the REST API, which
      // accepts it. includeThoughts stays false — we only parse the JSON result,
      // so thought parts would just pollute the response.
      thinkingConfig: { thinkingLevel: THINKING_LEVEL, includeThoughts: false },
    } as GenerationConfig,
  });
}

export function buildGradingPrompt(q: NormalizedQuestion): string {
  const hasModelAnswer = !!q.solution?.trim();
  // Precomputed mark scheme (lib/coachingRubric). When present, the grader APPLIES
  // it instead of re-deriving the mark split every call — fewer thinking tokens at
  // grade time and a consistent breakdown across all students of this question.
  const hasRubric = !!q.rubric?.trim();
  return [
    "You are an experienced school teacher grading ONE student's handwritten answer, photographed and attached as image(s) (multiple images = pages of the same answer, in order).",
    "",
    `QUESTION:\n${q.question_text}`,
    q.question_text_hindi ? `\nQUESTION (Hindi):\n${q.question_text_hindi}` : "",
    hasModelAnswer
      ? `\nMODEL ANSWER:\n${q.solution!.trim()}`
      : "\nMODEL ANSWER:\n(none provided — no model answer exists for this question)",
    `\nMAXIMUM MARKS: ${q.marks}`,
    hasRubric
      ? `\nMARK SCHEME (apply this EXACT breakdown — the marks are split across these fixed parts):\n${q.rubric!.trim()}`
      : null,
    "",
    hasModelAnswer
      ? null
      : "FIRST, before grading, write the ideal correct answer to this question yourself, using standard subject knowledge, to the depth a full-marks response would have. Grade the student against THAT answer. Return it in the model_answer field so the teacher can see what you graded against. Wrap every mathematical expression in LaTeX delimiters — inline $...$, display $$...$$ — e.g. write `$2^2 \\cdot 3^x$`, never bare `2^2 * 3^x`.",
    hasModelAnswer ? null : "",
    "GRADING RULES:",
    "- FATAL CONCEPTUAL FLAW CHECK (do this FIRST, before any keyword/component credit): for each part, judge whether the student's claim is actually CORRECT in meaning, not just whether it contains the right words. A fatal flaw is when the student uses correct terminology but fundamentally contradicts the core mechanism — e.g. calls a permanent state temporary (or vice versa), swaps a cause for an effect, describes a solution as the problem, reverses a direction/sign, or inverts a relationship (proportional vs inversely proportional). If a part contains a fatal flaw, award 0 for THAT part regardless of how many correct keywords overlap with the model answer. Keyword presence NEVER overrides a wrong meaning.",
    "- Award marks for correct concepts even if the phrasing differs from the model answer.",
    // When a model answer is supplied, stop the grader from treating it as the ONLY
    // acceptable answer — many questions have more than one valid answer/method, and
    // the stored model answer usually captures just one. Without this, a student who
    // gives a different-but-correct response gets under-marked. Only added when a
    // model answer exists (the no-model-answer branch already grades on own knowledge).
    hasModelAnswer
      ? "- The MODEL ANSWER is ONE correct reference, NOT the only acceptable answer. If the student reaches a valid result by a different correct method, or gives a different but equally valid answer to a question that admits more than one, award full credit using your own subject knowledge — do NOT mark it down merely for differing from the model answer. Penalise only genuine errors."
      : null,
    "- Do NOT penalise extra correct information, grammar, spelling, or handwriting style unless it changes the meaning.",
    "- The student may answer in English, Hindi, or a mix — grade the content, not the language.",
    // The scheme is generated FROM the model answer (lib/coachingRubric), so its parts
    // describe ONE route to the result. Without the alternative-method clause below,
    // "the parts are FIXED" out-argues the different-but-correct rule above and a
    // student who solved it another valid way loses every part their method didn't
    // literally produce. The clause remaps rather than relaxes: a part is still 0 when
    // the equivalent work is absent or wrong, so the fatal-flaw and no-consolation-
    // half-mark rules keep their teeth.
    hasRubric
      ? "- MARK BY COMPONENT using the MARK SCHEME above: award each listed part independently against the student's answer. The parts and their marks are FIXED by the scheme — do NOT invent new parts or re-split the marks. ALTERNATIVE METHODS: the scheme describes ONE valid route to the answer. If the student reaches the result by a different but valid method, map their work onto the EQUIVALENT parts of the scheme and award those marks — do NOT zero a part merely because their method never needed the specific step the scheme names for it. A part is still 0 when the student has no equivalent work for it, or that work is wrong."
      : "- MARK BY COMPONENT, not holistically: infer the parts the marks are split across from the MODEL ANSWER and the MAXIMUM MARKS (board questions allocate marks per part — e.g. a 3-mark question = definition 1 + reason 1 + balanced equation 1).",
    "- Mark each part INDEPENDENTLY: give a part its full marks only if that part is correct and complete; give that part 0 if it is missing, wrong, or built on a fundamentally incorrect concept/law/formula — EVEN IF the student names a related or 'nearby' idea. Do NOT give a consolation half-mark for being in the right topic area (e.g. citing the WRONG conservation law earns 0 for the reason, not 0.5).",
    "- marks_awarded is the SUM of the per-part marks. Partial credit comes ONLY from parts that are fully correct — never from half-crediting an incorrect part.",
    "- METHOD / STEP MARKING: the working/concept and the final answer are SEPARATE parts. Award the marks for correct method, setup, and concepts EVEN IF the final answer is wrong — a careless slip or arithmetic error at the end loses only the final-answer mark, not the marks already earned for correct reasoning. A right concept with a wrong final value keeps the concept/method marks; zero a part only when THAT part is itself wrong or rests on a wrong concept.",
    "- Do NOT penalise the same mistake twice: if the student makes one error and then carries it correctly through the later steps, give credit for those later steps (error carried forward).",
    "- FOR NUMERICAL QUESTIONS, split the marks across formula/setup, substitution, calculation, and final answer. Award the formula/setup mark when the correct relation is written even if later arithmetic is wrong; award later steps when they correctly follow from an earlier wrong value (carry-forward); lose only the specific step that is wrong.",
    `- marks_awarded must be between 0 and ${q.marks}, in steps of 0.5.`,
    "- WHEN UNCERTAIN between two mark values, choose the LOWER one unless there is clear evidence in the answer supporting the higher mark. Do not round generously.",
    "- If the image is blank, unreadable, or not an answer to this question, award 0 and say why in the feedback.",
    "- Do NOT guess illegible handwriting: if any portion cannot be read with reasonable confidence, do NOT invent its content. Grade only what is clearly visible, note the unreadable section in the feedback, and lower confidence accordingly.",
    "",
    "feedback: FIRST a brief per-part breakdown showing each part's marks (e.g. 'Definition ✓ 1/1; Reason ✗ 0/1 — wrong law, cites X but should be Y; Equation ✓ 1/1'), THEN one short sentence of guidance for the student. Write this breakdown BEFORE deciding marks_awarded, and make marks_awarded equal the total of your breakdown.",
    // Confidence is a ROUTING signal, not a similarity score: lib/coachingScore counts
    // high/medium automatically and sends "low" to the teacher at 0 marks until they
    // override. Anchoring it on "unambiguous against the model answer" (as it used to
    // read) made every different-but-valid method look low-confidence, so the answer
    // the alternative-method rules had just credited was parked at 0 anyway. Ask
    // instead how sure the grader is of ITS OWN marks — illegible or unverifiable is
    // low, merely unfamiliar is not.
    'confidence: how sure YOU are that the marks you awarded are correct — NOT how closely the answer resembles the model answer. "high" = the answer is clearly readable and you are confident the marks are right (this INCLUDES a different-but-valid method you were able to follow and check); "medium" = readable, but at least one part involved a judgement call that could reasonably go either way; "low" = you genuinely could not decide — handwriting you could not read, reasoning you could not follow, or a claim you cannot verify with your own subject knowledge. A valid answer that simply differs from the model answer is NEVER by itself a reason to lower confidence.',
    hasModelAnswer
      ? "model_answer: leave as an empty string (a model answer was already provided)."
      : "model_answer: the ideal answer you wrote and graded against (required here, since none was provided).",
    "",
    "Return ONLY the JSON object.",
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}

// USD per 1M tokens for the grader model. Output rate ALSO bills thinking tokens.
// Verified against Google's published pricing Jun 2026. Keep in sync with MODEL.
const GRADER_TOKEN_PRICES: Record<string, { in: number; out: number }> = {
  "gemini-3.1-flash-lite": { in: 0.25, out: 1.5 },
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
};

/** Rough USD cost of grading usage at the current grader model's price (null if unpriced). */
export function gradingCostUsd(input: number, output: number, thinking: number): number | null {
  const p = GRADER_TOKEN_PRICES[MODEL];
  return p ? (input * p.in + (output + thinking) * p.out) / 1_000_000 : null;
}

export type ParsedGrade = {
  marks: number;
  feedback: string;
  confidence: SubjectiveConfidence;
  /** Set only when the question had no model answer and Gemini wrote one. */
  generatedModelAnswer: string | null;
};

/**
 * Parse the grader's JSON output into clamped marks + feedback + confidence.
 * Shared by the synchronous path and the batch write-back so both interpret the
 * model output identically. Throws on non-numeric marks (caller flags the answer).
 */
export function parseGradeResult(text: string, q: NormalizedQuestion): ParsedGrade {
  const hasModelAnswer = !!q.solution?.trim();
  const parsed = JSON.parse(text) as {
    marks_awarded?: unknown;
    feedback?: unknown;
    confidence?: unknown;
    model_answer?: unknown;
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
  // Keep the written answer only when the question genuinely lacked one.
  const written = typeof parsed.model_answer === "string" ? parsed.model_answer.trim() : "";
  const generatedModelAnswer = !hasModelAnswer && written ? written.slice(0, 4000) : null;
  return { marks, feedback, confidence, generatedModelAnswer };
}

/** The answer-entry patch for a successfully graded answer (shared sync + batch). */
export function gradedAnswerPatch(
  r: ParsedGrade,
  usage: { input: number; output: number; thinking: number }
): Partial<SubjectiveAnswerEntry> {
  return {
    gemini_marks: r.marks,
    gemini_feedback: r.feedback,
    gemini_confidence: r.confidence,
    generated_model_answer: r.generatedModelAnswer,
    gemini_input_tokens: usage.input,
    gemini_output_tokens: usage.output,
    gemini_thinking_tokens: usage.thinking,
    flagged: false,
  };
}

/** The subjective answers of an attempt that still need AI grading (shared sync + batch). */
export function selectUngradedSubjectives(
  resolved: NormalizedQuestion[],
  answers: StoredAnswers,
  force = false
): { q: NormalizedQuestion; entry: SubjectiveAnswerEntry }[] {
  const todo: { q: NormalizedQuestion; entry: SubjectiveAnswerEntry }[] = [];
  for (const q of resolved) {
    if (q.question_type !== "subjective") continue;
    const v = answers[q.id];
    if (!isSubjectiveEntry(v) || v.image_keys.length === 0) continue;
    if (v.manual_override != null) continue; // teacher already decided
    if (!force && v.gemini_marks != null && !v.flagged) continue; // already AI-graded
    todo.push({ q, entry: v });
  }
  return todo;
}

/** Grade one answer's image(s) against its question. Throws on Gemini failure. */
export async function gradeSubjectiveAnswer(
  q: NormalizedQuestion,
  images: { data: string; mimeType: string }[]
): Promise<ParsedGrade & { usage: { input: number; output: number; thinking: number } }> {
  const model = graderModel();
  const res = await callGeminiWithRetry(() =>
    model.generateContent({
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
    })
  );
  const um = (res.response as { usageMetadata?: Record<string, unknown> }).usageMetadata ?? {};
  const usage = {
    input: Number(um.promptTokenCount ?? 0),
    output: Number(um.candidatesTokenCount ?? 0),
    thinking: Number(um.thoughtsTokenCount ?? 0),
  };
  return { ...parseGradeResult(res.response.text(), q), usage };
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

  const todo = selectUngradedSubjectives(resolved, answers, force);
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
      return { qId: q.id, patch: gradedAnswerPatch(g, g.usage) };
    } catch (err) {
      console.error(`[grade:${trigger}] attempt ${attemptId} q ${q.id} failed:`, err);
      flagged++;
      return { qId: q.id, patch: { flagged: true } as Partial<SubjectiveAnswerEntry> };
    }
  });

  const merged = await mergeGradeResultsIntoAttempt({
    attemptId,
    coachingId,
    testId: attempt.test.id,
    resolved,
    results,
  });
  if (!merged) {
    return { graded, flagged, skipped: 0, pending: 0, status: attempt.grading_status };
  }
  return { graded, flagged, skipped: 0, pending: merged.pending, status: merged.status };
}

/**
 * Merge graded-answer patches into an attempt and re-finalize it in ONE update.
 * Re-reads answers FIRST so a teacher's manual override (or a concurrent run)
 * always survives, recomputes score + grading_status through the shared scorer,
 * and busts the leaderboard/result caches. Shared by the synchronous grader and
 * the batch write-back. Returns null if the attempt is no longer gradable.
 */
export async function mergeGradeResultsIntoAttempt(opts: {
  attemptId: string;
  coachingId: string;
  testId: string;
  resolved: NormalizedQuestion[];
  results: { qId: string; patch: Partial<SubjectiveAnswerEntry> }[];
}): Promise<{ pending: number; status: string } | null> {
  const { attemptId, coachingId, testId, resolved, results } = opts;

  const fresh = await withDbRetry(() =>
    prisma.testAttempt.findFirst({
      where: { id: attemptId, coaching_id: coachingId },
      select: { answers: true, status: true },
    })
  );
  if (!fresh || fresh.status !== "submitted") return null;

  const merged = { ...((fresh.answers ?? {}) as StoredAnswers) };
  for (const r of results) {
    const cur = merged[r.qId];
    if (!isSubjectiveEntry(cur)) continue; // answer shape changed under us — skip
    if (cur.manual_override != null) continue; // teacher won the race
    // Log AI grade events into the audit trail so every marks change is tracked.
    const patched = { ...cur, ...r.patch };
    if (r.patch.gemini_marks != null && !r.patch.flagged) {
      const history = (cur.grade_history ?? []).slice();
      history.push({
        from: cur.gemini_marks,
        to: r.patch.gemini_marks,
        by: "ai",
        at: new Date().toISOString(),
      });
      patched.grade_history = history;
    }
    merged[r.qId] = patched;
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

  await Promise.all([
    invalidateTestLeaderboard(testId),
    invalidateAttemptResult(attemptId),
  ]);

  return { pending: pendingSubjective, status: gradingStatus };
}
