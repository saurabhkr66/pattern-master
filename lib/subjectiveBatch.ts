import "server-only";
import {
  GoogleGenAI,
  JobState,
  ThinkingLevel,
  type GenerateContentResponse,
  type InlinedRequest,
} from "@google/genai";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/dbRetry";
import { redis, isRedisConfigured } from "@/lib/redis";
import { getObjectBase64 } from "@/lib/r2";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
} from "@/lib/coachingQuestionCache";
import type { RuntimeTest } from "@/lib/coachingTestRuntime";
import type { NormalizedQuestion } from "@/lib/resolveQuestions";
import type { StoredAnswers } from "@/lib/coachingScore";
import type { SubjectiveAnswerEntry } from "@/lib/subjectiveTypes";
import {
  MODEL,
  THINKING_LEVEL,
  buildGradingPrompt,
  parseGradeResult,
  gradedAnswerPatch,
  selectUngradedSubjectives,
  mergeGradeResultsIntoAttempt,
} from "@/lib/subjectiveGrading";

// Gemini BATCH MODE grading: gather every PENDING subjective answer across
// attempts into ONE inlined batch job (~50% of standard token cost), then on a
// later pass poll the job and write results back to each attempt. Both passes are
// driven by /api/cron/grade-batch (and page-view self-heal). The synchronous
// grader in lib/subjectiveGrading.ts stays the instant, on-demand admin path.
//
// This module uses the NEW @google/genai SDK (which exposes Batch Mode); the
// legacy synchronous grader keeps @google/generative-ai untouched. Prompt
// building, output parsing, and the attempt write-back are all shared with the
// sync grader so the two paths can never disagree.

// Cap answers per batch job so one inlined request payload stays bounded (images
// are inlined as base64). Multiple jobs are created across sweeps if more are due.
const MAX_ANSWERS_PER_BATCH = Number(process.env.SUBJECTIVE_BATCH_SIZE) || 200;

// Cross-SDK JSON Schema for the grader output — mirrors GRADE_SCHEMA in
// subjectiveGrading.ts, passed via responseJsonSchema for the new SDK.
const GRADE_JSON_SCHEMA = {
  type: "object",
  properties: {
    feedback: { type: "string" },
    marks_awarded: { type: "number" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    model_answer: { type: "string" },
  },
  required: ["marks_awarded", "feedback", "confidence"],
};

function genai(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey: key });
}

// Per-request key threads attemptId + questionId through Gemini's metadata so the
// poll can map each response back without relying on response ordering.
const reqKey = (attemptId: string, qId: string) => `${attemptId}__${qId}`;
const parseKey = (key: string): { attemptId: string; qId: string } => {
  const i = key.indexOf("__");
  return { attemptId: key.slice(0, i), qId: key.slice(i + 2) };
};

const perRequestConfig = () => ({
  temperature: 0,
  responseMimeType: "application/json",
  responseJsonSchema: GRADE_JSON_SCHEMA,
  maxOutputTokens: 4096,
  thinkingConfig: {
    thinkingLevel: THINKING_LEVEL as ThinkingLevel,
    includeThoughts: false,
  },
});

type AttemptForGrading = {
  id: string;
  coaching_id: string;
  student_id: string;
  answers: unknown;
  test: { id: string; questions: unknown; shuffle: boolean; pool_size: number | null };
};

const ATTEMPT_SELECT = {
  id: true,
  coaching_id: true,
  student_id: true,
  answers: true,
  test: { select: { id: true, questions: true, shuffle: true, pool_size: true } },
} as const;

/** This student's resolved questions (same derivation the sync grader uses). */
async function resolveAttemptQuestions(a: AttemptForGrading): Promise<NormalizedQuestion[]> {
  const runtimeTest: RuntimeTest = {
    id: a.test.id,
    questions: a.test.questions,
    shuffle: a.test.shuffle,
    pool_size: a.test.pool_size,
  };
  const base = await getResolvedTestQuestions(runtimeTest, a.coaching_id);
  return studentQuestionsFromBase(base, runtimeTest, a.student_id);
}

// Single-flight lock so the cron and any page-view nudges can't build duplicate
// batches for the same attempts (each duplicate would be wasted spend). Best-
// effort: if Redis is down we proceed unlocked (the single-process VPS + cron is
// the usual caller, and a rare duplicate is idempotent on write-back).
const SUBMIT_LOCK = "grade-batch:submit:lock";
const SUBMIT_LOCK_TTL = 120; // seconds — longer than a sweep's image-fetch + create

async function acquireSubmitLock(): Promise<boolean> {
  if (!isRedisConfigured()) return true;
  try {
    return (await redis.set(SUBMIT_LOCK, 1, { nx: true, ex: SUBMIT_LOCK_TTL })) === "OK";
  } catch {
    return true; // Redis hiccup — don't block grading
  }
}
async function releaseSubmitLock(): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.del(SUBMIT_LOCK);
  } catch {
    /* the TTL will clear it */
  }
}

/**
 * SUBMIT pass: take pending, not-yet-batched attempts; build one inlined batch of
 * all their ungraded subjective answers; mark those attempts as batched. Returns
 * what was queued. Call again on the next sweep for any overflow beyond the cap.
 */
export async function submitGradingBatch(): Promise<{
  attempts: number;
  answers: number;
  jobName: string | null;
}> {
  if (!(await acquireSubmitLock())) return { attempts: 0, answers: 0, jobName: null };
  try {
    return await submitGradingBatchInner();
  } finally {
    await releaseSubmitLock();
  }
}

async function submitGradingBatchInner(): Promise<{
  attempts: number;
  answers: number;
  jobName: string | null;
}> {
  // Pull a few more attempts than we may need; we stop adding once the answer cap
  // is hit. The [grading_status, grading_batch] index serves this filter.
  const candidates = (await withDbRetry(() =>
    prisma.testAttempt.findMany({
      where: { status: "submitted", grading_status: "pending", grading_batch: null },
      select: ATTEMPT_SELECT,
      orderBy: { submitted_at: "asc" }, // oldest first — fairness
      take: 100,
    })
  )) as AttemptForGrading[];
  if (candidates.length === 0) return { attempts: 0, answers: 0, jobName: null };

  const requests: InlinedRequest[] = [];
  const usedAttemptIds: string[] = [];

  for (const a of candidates) {
    if (requests.length >= MAX_ANSWERS_PER_BATCH) break;
    const resolved = await resolveAttemptQuestions(a);
    const todo = selectUngradedSubjectives(resolved, (a.answers ?? {}) as StoredAnswers);
    if (todo.length === 0) continue;

    let addedForAttempt = false;
    for (const { q, entry } of todo) {
      if (requests.length >= MAX_ANSWERS_PER_BATCH) break;
      const images = await Promise.all(entry.image_keys.map((k) => getObjectBase64(k)));
      requests.push({
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
        config: perRequestConfig(),
        metadata: { key: reqKey(a.id, q.id) },
      });
      addedForAttempt = true;
    }
    if (addedForAttempt) usedAttemptIds.push(a.id);
  }

  if (requests.length === 0) return { attempts: 0, answers: 0, jobName: null };

  const ai = genai();
  const job = await ai.batches.create({
    model: MODEL,
    src: requests,
    config: { displayName: `subjgrade-${Date.now()}` },
  });
  const jobName = job.name;
  if (!jobName) throw new Error("batch create returned no job name");

  // Record the job, then claim the attempts so the next sweep skips them. (A crash
  // between create and these writes orphans the job — the poll only knows jobs it
  // recorded; such a rare orphan is wasted spend, never wrong marks: the attempts
  // stay pending+unclaimed and get re-batched.)
  await withDbRetry(() =>
    prisma.gradingBatch.create({
      data: { job_name: jobName, status: "running", attempt_ids: usedAttemptIds },
    })
  );
  await Promise.all(
    usedAttemptIds.map((id) =>
      withDbRetry(() =>
        prisma.testAttempt
          .update({ where: { id }, data: { grading_batch: jobName } })
          .then(() => undefined)
      )
    )
  );

  return { attempts: usedAttemptIds.length, answers: requests.length, jobName };
}

const usageOf = (
  resp:
    | {
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          thoughtsTokenCount?: number;
        };
      }
    | undefined
) => ({
  input: Number(resp?.usageMetadata?.promptTokenCount ?? 0),
  output: Number(resp?.usageMetadata?.candidatesTokenCount ?? 0),
  thinking: Number(resp?.usageMetadata?.thoughtsTokenCount ?? 0),
});

/**
 * Text of a BATCH inlined response.
 *
 * `.text` is a GETTER on the SDK's GenerateContentResponse *class*, but batch
 * results are deserialized into PLAIN objects (batches.get → inlinedResponseFromMldev
 * builds `{}` literals; only models.generateContent wraps them in the class). So
 * `resp.text` is always `undefined` here even though it type-checks — reading it
 * silently flagged every batch-graded answer. Extract the parts ourselves, skipping
 * thought parts, exactly as the class getter does.
 */
function responseText(resp: GenerateContentResponse | undefined): string | undefined {
  const parts = resp?.candidates?.[0]?.content?.parts ?? [];
  let text = "";
  let any = false;
  for (const part of parts) {
    if (part.thought) continue; // reasoning, not the JSON answer
    if (typeof part.text === "string") {
      any = true;
      text += part.text;
    }
  }
  return any ? text : undefined;
}

/**
 * POLL pass: for every running batch, check completion. On success, map each
 * response back to its answer via metadata, write results through the shared
 * attempt merge (teacher overrides survive), and clear the batch marker. On
 * terminal failure, release the attempts so the next sweep re-batches them.
 */
export async function pollGradingBatches(): Promise<{
  checked: number;
  completed: number;
  failed: number;
  attemptsWritten: number;
}> {
  const open = await withDbRetry(() =>
    prisma.gradingBatch.findMany({ where: { status: "running" } })
  );
  if (open.length === 0) return { checked: 0, completed: 0, failed: 0, attemptsWritten: 0 };

  const ai = genai();
  let completed = 0;
  let failed = 0;
  let attemptsWritten = 0;

  for (const batch of open) {
    let job;
    try {
      job = await ai.batches.get({ name: batch.job_name });
    } catch (err) {
      console.error(`[grade-batch] get ${batch.job_name} failed:`, err);
      continue; // transient — try again next sweep
    }
    const state = job.state;

    // Still working — leave it for a later sweep.
    if (
      state === JobState.JOB_STATE_PENDING ||
      state === JobState.JOB_STATE_QUEUED ||
      state === JobState.JOB_STATE_RUNNING ||
      state === JobState.JOB_STATE_PAUSED ||
      state === undefined
    ) {
      continue;
    }

    const succeeded =
      state === JobState.JOB_STATE_SUCCEEDED ||
      state === JobState.JOB_STATE_PARTIALLY_SUCCEEDED;

    if (succeeded) {
      const responses = job.dest?.inlinedResponses ?? [];
      // Group each answer's parsed patch by attempt.
      const byAttempt = new Map<string, { qId: string; key: string; text?: string; usage: ReturnType<typeof usageOf>; errored: boolean }[]>();
      for (const r of responses) {
        const key = r.metadata?.key;
        if (!key) continue;
        const { attemptId, qId } = parseKey(key);
        const list = byAttempt.get(attemptId) ?? [];
        const text = r.error ? undefined : responseText(r.response);
        if (!text) {
          // Empty text with no per-request error usually means the answer was
          // truncated (MAX_TOKENS, thinking ate the budget) or blocked — log it
          // rather than letting it vanish into a silent `flagged`.
          console.error(
            `[grade-batch] no text for ${key}:`,
            r.error ??
              `finishReason=${r.response?.candidates?.[0]?.finishReason ?? "unknown"}`
          );
        }
        list.push({
          qId,
          key,
          text,
          usage: usageOf(r.response),
          errored: !!r.error || !r.response,
        });
        byAttempt.set(attemptId, list);
      }

      // Re-load the attempts (for per-question clamp + the shared merge).
      const attempts = (await withDbRetry(() =>
        prisma.testAttempt.findMany({
          where: { id: { in: batch.attempt_ids } },
          select: ATTEMPT_SELECT,
        })
      )) as AttemptForGrading[];
      const attemptMap = new Map(attempts.map((a) => [a.id, a]));

      for (const [attemptId, items] of byAttempt) {
        const a = attemptMap.get(attemptId);
        if (!a) continue;
        const resolved = await resolveAttemptQuestions(a);
        const qById = new Map(resolved.map((q) => [q.id, q]));
        const results: { qId: string; patch: Partial<SubjectiveAnswerEntry> }[] = [];
        for (const it of items) {
          const q = qById.get(it.qId);
          if (!q) continue;
          if (it.errored || !it.text) {
            results.push({ qId: it.qId, patch: { flagged: true } });
            continue;
          }
          try {
            const parsed = parseGradeResult(it.text, q);
            results.push({ qId: it.qId, patch: gradedAnswerPatch(parsed, it.usage) });
          } catch (err) {
            console.error(`[grade-batch] parse ${attemptId} q ${it.qId}:`, err);
            results.push({ qId: it.qId, patch: { flagged: true } });
          }
        }
        const merged = await mergeGradeResultsIntoAttempt({
          attemptId,
          coachingId: a.coaching_id,
          testId: a.test.id,
          resolved,
          results,
        });
        if (merged) attemptsWritten++;
      }

      await finishBatch(batch.id, batch.attempt_ids, "done");
      completed++;
    } else {
      // FAILED / CANCELLED / EXPIRED — release the attempts so they re-batch.
      console.error(`[grade-batch] job ${batch.job_name} ended ${state}:`, job.error);
      await finishBatch(batch.id, batch.attempt_ids, "failed");
      failed++;
    }
  }

  return { checked: open.length, completed, failed, attemptsWritten };
}

/**
 * Dead-man heartbeat: how many attempts have been stuck at grading_status =
 * 'pending' longer than `hours`. Non-zero means the sweeper isn't draining work
 * (cron dead / quota / stuck batch) — the cron logs a warning on this, and a
 * super-admin dashboard can surface it. (The admin "Grade ungraded" button is
 * always the manual escape hatch.)
 */
export async function countStalePendingGrading(hours = 6): Promise<number> {
  const cutoff = new Date(Date.now() - hours * 3600_000);
  return withDbRetry(() =>
    prisma.testAttempt.count({
      where: {
        status: "submitted",
        grading_status: "pending",
        submitted_at: { lt: cutoff },
      },
    })
  );
}

/**
 * Self-heal nudge: poll completed jobs then submit pending ones. Fire-and-forget
 * from a result/admin page view (via `after`) so grading advances on traffic even
 * if cron lapses. Swallows errors — the cron + admin "Grade ungraded" button
 * remain the backstops. Cheap to call repeatedly: poll/submit are idempotent and
 * the submit lock prevents duplicate batches.
 */
export async function nudgeGradingSweep(): Promise<void> {
  try {
    await pollGradingBatches();
    await submitGradingBatch();
  } catch (err) {
    console.error("[grade-batch] nudge failed:", err);
  }
}

/** Mark the batch terminal and clear the grading_batch marker on its attempts. */
async function finishBatch(batchId: string, attemptIds: string[], status: "done" | "failed") {
  await withDbRetry(() =>
    prisma.gradingBatch.update({ where: { id: batchId }, data: { status } })
  );
  // Clear the claim so a failed batch's attempts (still grading_status='pending')
  // are eligible for the next sweep; for a done batch the merge already moved them
  // to review/done, so clearing is just cleanup.
  await Promise.all(
    attemptIds.map((id) =>
      withDbRetry(() =>
        prisma.testAttempt
          .update({ where: { id }, data: { grading_batch: null } })
          .then(() => undefined)
      )
    )
  );
}
