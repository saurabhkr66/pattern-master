import "server-only";
import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerationConfig,
  type ResponseSchema,
} from "@google/generative-ai";

// Precompute a per-question MARK SCHEME (rubric) ONCE so the subjective grader
// APPLIES it instead of re-deriving the mark split on every one of the ~150 calls
// per question. Generation is a single cheap text-only Gemini call per question,
// run offline by scripts/coaching/backfill-coaching-rubrics.ts and reused across
// every future exam — so it amortizes to ~₹0/exam while making grading both
// cheaper (fewer thinking tokens at grade time) and consistent across students.
//
// See lib/subjectiveGrading.ts (buildGradingPrompt) for where the rubric is read.

// Bump when the rubric prompt/shape changes — the backfill recomputes any row
// whose rubric_version is below this. 0 = ungenerated/stale.
export const RUBRIC_VERSION = 1;

const MODEL = process.env.SUBJECTIVE_GRADER_MODEL || "gemini-3.1-flash-lite";
const MAX_RETRIES = 4;

const RUBRIC_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: { rubric: { type: SchemaType.STRING } },
  required: ["rubric"],
};

// Transient Gemini errors (429/503/overloaded) are retried with backoff; anything
// else (auth, bad JSON, empty result) throws straight through to the caller.
function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b|\b503\b|RESOURCE_EXHAUSTED|overloaded|rate.?limit|too many requests|unavailable/i.test(
    msg
  );
}

function rubricModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenerativeAI(key).getGenerativeModel({
    model: MODEL,
    generationConfig: {
      // temperature 0 → deterministic, consistent schemes.
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RUBRIC_SCHEMA,
      maxOutputTokens: 2048,
      // Splitting marks needs only light reasoning; keep it cheap.
      thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false },
    } as GenerationConfig,
  });
}

function buildRubricPrompt(q: {
  question_text: string;
  solution: string;
  max_marks: number;
}): string {
  return [
    "You are an experienced school examiner writing the MARK SCHEME for ONE exam question.",
    "Given the QUESTION, the MODEL ANSWER, and the MAXIMUM MARKS, break the marks into the independent parts a marker awards, summing EXACTLY to the maximum.",
    "Board questions allocate marks per component — e.g. a 3-mark question = definition 1 + reason 1 + balanced equation 1.",
    "",
    `QUESTION:\n${q.question_text}`,
    `\nMODEL ANSWER:\n${q.solution}`,
    `\nMAXIMUM MARKS: ${q.max_marks}`,
    "",
    "Return ONLY a concise part-wise breakdown in the `rubric` string, ONE part per line as `<part> — <marks>`. Example:",
    "Definition of refraction — 1",
    "Two laws stated correctly — 1",
    "Snell's law / constant ratio — 1",
    `The marks across all parts MUST total exactly ${q.max_marks}. Do NOT grade any student answer — produce only the scheme.`,
  ].join("\n");
}

/**
 * Generate the part-wise mark scheme for one question. Retries transient Gemini
 * errors; throws on auth/parse/empty so the caller can skip + flag that row.
 */
export async function generateRubric(q: {
  question_text: string;
  solution: string;
  max_marks: number;
}): Promise<string> {
  const model = rubricModel();
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await model.generateContent(buildRubricPrompt(q));
      const parsed = JSON.parse(res.response.text()) as { rubric?: unknown };
      const rubric = typeof parsed.rubric === "string" ? parsed.rubric.trim() : "";
      if (!rubric) throw new Error("rubric generator returned empty rubric");
      return rubric.slice(0, 2000);
    } catch (err) {
      if (!isRetryable(err) || attempt >= MAX_RETRIES) throw err;
      const backoff = Math.min(30_000, 1000 * 2 ** attempt) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
