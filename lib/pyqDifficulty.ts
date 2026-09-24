import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerationConfig,
  type ResponseSchema,
  type Part,
} from "@google/generative-ai";
import { GEMINI_MODEL } from "@/lib/aiModels";
import { generateJson, stripBase64Text } from "@/lib/geminiPacing";

// Re-exported so existing callers keep importing from here.
export { isDailyQuotaExceeded, stripBase64Text } from "@/lib/geminiPacing";

// Classifies a GROUP of PYQ questions per Gemini call (not one call per question)
// — much faster/cheaper than a per-row call. Each question in the group is tagged
// by id in the prompt, and the model must echo that id back in its response, so
// results map to rows unambiguously regardless of any reordering.
// See scripts/backfill-pyq-difficulty.ts for the caller.

export const DIFFICULTY_VALUES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTY_VALUES)[number];

const MODEL = process.env.PYQ_DIFFICULTY_MODEL || GEMINI_MODEL;

/** Model id that will actually run, for startup logging. */
export function activeDifficultyModel(): string {
  return MODEL;
}

export type DifficultyQuestion = {
  id: string;
  question_text: string;
  options: unknown;
  correct_answer: string;
  question_type: string;
  subject: string;
  topic_name: string;
  exam_type: string;
  year: number;
  images: Array<{ data: string; mimeType: string }>;
};

const BATCH_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING },
      difficulty: {
        type: SchemaType.STRING,
        format: "enum",
        enum: [...DIFFICULTY_VALUES] as unknown as string[],
      },
    },
    required: ["id", "difficulty"],
  },
};

function difficultyModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenerativeAI(key).getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: BATCH_SCHEMA,
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false },
    } as GenerationConfig,
  });
}

function questionBlock(q: DifficultyQuestion): string {
  const options =
    q.options && Array.isArray(q.options) && (q.options as unknown[]).length
      ? `\nOPTIONS:\n${(q.options as unknown[]).map((o) => String(o)).join("\n")}`
      : "";
  return [
    `--- QUESTION id=${q.id} ---`,
    `Exam: ${q.exam_type}  Year: ${q.year}  Subject: ${q.subject}  Topic: ${q.topic_name}  Type: ${q.question_type}`,
    `QUESTION:\n${stripBase64Text(q.question_text)}`,
    options,
    `\nCORRECT ANSWER: ${q.correct_answer}`,
    q.images.length ? `(${q.images.length} image(s) attached for this question, labeled id=${q.id})` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const INTRO = [
  "You are an experienced exam setter rating the DIFFICULTY of a batch of previous-year exam questions.",
  "Rate EACH question independently on this exact 3-point scale:",
  "- EASY: direct recall or single-step application, no multi-concept chaining.",
  "- MEDIUM: 2-step reasoning, combines two concepts or requires one intermediate calculation.",
  "- HARD: multi-step, tricky, conceptual traps, heavy calculation, or requires synthesizing 3+ concepts.",
  "",
  "If a question has image(s) attached (diagram/figure/circuit/graph), the image immediately follows that question's",
  "text block and is labeled with the same id — factor its visual complexity into that question's rating.",
  "",
  "Return ONE entry per question, using the EXACT id given, with no id skipped and no id invented.",
].join("\n");

/**
 * Keeps only entries whose id is a string and whose difficulty is one of the
 * three allowed values. Anything malformed is dropped rather than guessed at,
 * so the caller can retry those rows.
 */
function collectResults(items: unknown[]): Map<string, Difficulty> {
  const result = new Map<string, Difficulty>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    const rawDifficulty = (item as { difficulty?: unknown }).difficulty;
    if (typeof id !== "string") continue;
    const difficulty = typeof rawDifficulty === "string" ? rawDifficulty.trim().toUpperCase() : "";
    if (DIFFICULTY_VALUES.includes(difficulty as Difficulty)) {
      result.set(id, difficulty as Difficulty);
    }
  }
  return result;
}

/**
 * Classifies one group of questions in a single Gemini call. Returns a map of
 * id -> difficulty for every id the model actually returned; ids missing from
 * the response (or with a malformed value) are simply absent from the map —
 * the caller treats those as failed and retries/logs them separately.
 */
export async function classifyDifficultyBatch(
  questions: DifficultyQuestion[],
): Promise<Map<string, Difficulty>> {
  if (questions.length === 0) return new Map();

  const parts: Part[] = [{ text: INTRO }];
  for (const q of questions) {
    parts.push({ text: questionBlock(q) });
    for (const im of q.images) {
      parts.push({ inlineData: { data: im.data, mimeType: im.mimeType } });
    }
  }

  return generateJson(
    difficultyModel(),
    parts,
    (parsed) => {
      if (!Array.isArray(parsed)) throw new Error("difficulty classifier did not return an array");
      const result = collectResults(parsed);
      if (result.size === 0) throw new Error("difficulty classifier returned no valid entries");
      return result;
    },
    `group of ${questions.length}`,
  );
}
