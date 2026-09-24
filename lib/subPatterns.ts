import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerationConfig,
  type ResponseSchema,
  type Part,
} from "@google/generative-ai";
import { GEMINI_MODEL } from "@/lib/aiModels";
import { generateJson, stripBase64Text } from "@/lib/geminiPacing";

// Sorts one chapter's PYQs into question-types ("sub-patterns") in three small
// steps, because one "group these 100 questions" prompt gives messy,
// inconsistent piles:
//
//   1. summarizeSolvingIdeas — each PYQ → a one-line "concept + method" note.
//      Grouping on these notes groups by HOW a question is solved, not by its
//      wording or numbers.
//   2. discoverSubPatterns   — all notes of ONE chapter in one call → a short
//      list of named types.
//   3. assignSubPatterns     — fixed type list + a batch of notes → each id
//      mapped to one type (or NEW). Picking from a fixed list is far more
//      consistent than inventing groups on the fly.
//
// See scripts/build-subpatterns.ts for the caller and the clean-up pass.

const MODEL = process.env.SUBPATTERN_MODEL || GEMINI_MODEL;

/** Model id that will actually run, for startup logging. */
export function activeSubPatternModel(): string {
  return MODEL;
}

export type ChapterContext = {
  exam_type: string;
  subject: string;
  topic_name: string;
};

export type SolvingQuestion = {
  id: string;
  question_text: string;
  options: unknown;
  correct_answer: string;
  question_type: string;
  images: Array<{ data: string; mimeType: string }>;
};

/** A PYQ reduced to its solving-idea note — the unit steps 2 and 3 work on. */
export type IdeaItem = { id: string; idea: string };

export type DiscoveredType = { name: string; method: string; trick: string | null };

/** 0 = the model said none of the types fit. */
export const NEW_TYPE = 0;

function jsonModel(schema: ResponseSchema, maxOutputTokens: number) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenerativeAI(key).getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: schema,
      maxOutputTokens,
      thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false },
    } as GenerationConfig,
  });
}

const contextLine = (c: ChapterContext) =>
  `Exam: ${c.exam_type}  Subject: ${c.subject}  Chapter: ${c.topic_name}`;

// ─── Step 1: solving-idea notes ──────────────────────────────────────────────

const SUMMARY_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING },
      idea: { type: SchemaType.STRING },
    },
    required: ["id", "idea"],
  },
};

const SUMMARY_INTRO = [
  "You are an experienced teacher. For EACH previous-year exam question below, write ONE line (max 20 words)",
  "describing the core concept and the solving method a strong student would use.",
  "",
  "Rules:",
  "- Describe the METHOD, not the question. No numbers, no values, no answer.",
  "- Start with the concept, then the key step. Example: \"Rolling without slipping on incline; a = g sinθ/(1+k²/r²)\".",
  "- Two questions solved the same way must get nearly the same line, even if worded differently.",
  "- If a question has image(s), they follow its text block labeled with the same id — use them.",
  "",
  "Return ONE entry per question, using the EXACT id given, with no id skipped and no id invented.",
].join("\n");

function summaryBlock(q: SolvingQuestion): string {
  const options =
    Array.isArray(q.options) && q.options.length
      ? `\nOPTIONS:\n${(q.options as unknown[]).map((o) => stripBase64Text(String(o))).join("\n")}`
      : "";
  return [
    `--- QUESTION id=${q.id} (${q.question_type}) ---`,
    stripBase64Text(q.question_text),
    options,
    `\nCORRECT ANSWER: ${q.correct_answer}`,
    q.images.length ? `(${q.images.length} image(s) attached, labeled id=${q.id})` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * One Gemini call for a group of questions. Ids missing from the response are
 * absent from the map — the caller treats them as failed.
 */
export async function summarizeSolvingIdeas(
  ctx: ChapterContext,
  questions: SolvingQuestion[],
): Promise<Map<string, string>> {
  if (questions.length === 0) return new Map();

  const parts: Part[] = [{ text: `${SUMMARY_INTRO}\n\n${contextLine(ctx)}` }];
  for (const q of questions) {
    parts.push({ text: summaryBlock(q) });
    for (const im of q.images) parts.push({ inlineData: { data: im.data, mimeType: im.mimeType } });
  }

  const wanted = new Set(questions.map((q) => q.id));
  return generateJson(
    jsonModel(SUMMARY_SCHEMA, 8192),
    parts,
    (parsed) => {
      if (!Array.isArray(parsed)) throw new Error("summarizer did not return an array");
      const out = new Map<string, string>();
      for (const item of parsed as Array<{ id?: unknown; idea?: unknown }>) {
        if (typeof item?.id !== "string" || !wanted.has(item.id)) continue;
        const idea = typeof item.idea === "string" ? item.idea.replace(/\s+/g, " ").trim() : "";
        if (idea) out.set(item.id, idea.slice(0, 300));
      }
      if (out.size === 0) throw new Error("summarizer returned no valid entries");
      return out;
    },
    `summary group of ${questions.length}`,
  );
}

// ─── Step 2: discover the types ──────────────────────────────────────────────

const DISCOVER_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      method: { type: SchemaType.STRING },
      trick: { type: SchemaType.STRING, nullable: true },
    },
    required: ["name", "method"],
  },
};

/** How many types to ask for, scaled to the chapter size. */
export function typeRange(n: number): { min: number; max: number } {
  const max = Math.max(3, Math.min(20, Math.round(n / 5)));
  const min = Math.max(2, Math.min(max, Math.round(n / 12)));
  return { min, max };
}

/**
 * All notes of one chapter (or one oversized pile, when splitting) in a single
 * call → named types. `existing` names are passed when discovering extra types
 * for leftovers, so the model doesn't re-invent one that already exists.
 */
export async function discoverSubPatterns(
  ctx: ChapterContext,
  items: IdeaItem[],
  range: { min: number; max: number },
  existing: string[] = [],
): Promise<DiscoveredType[]> {
  if (items.length === 0) return [];

  const prompt = [
    "You are an experienced teacher building a list of QUESTION-TYPES for one chapter.",
    "Below is a one-line solving note for every previous-year question. Group them into question-types.",
    "",
    "Rules:",
    `- Produce between ${range.min} and ${range.max} types.`,
    "- One type = one distinct solving METHOD. Two questions belong together if a student who can solve one can solve the other with the same approach.",
    "- Do not split by numbers, wording or difficulty. Do not make a type for a single odd question — leave rare ones out.",
    "- name: 2–6 words a student would recognise (e.g. \"Rolling on incline\", \"Parallel axis theorem\"). No numbering, no chapter name prefix.",
    "- method: one line, how to solve this type.",
    "- trick: the key formula or shortcut, or null if there is none.",
    existing.length
      ? `- These types ALREADY exist, do NOT repeat them: ${existing.map((e) => `"${e}"`).join(", ")}`
      : "",
    "",
    contextLine(ctx),
    "",
    "NOTES:",
    ...items.map((it) => `- ${it.idea}`),
  ]
    .filter((l) => l !== "")
    .join("\n");

  return generateJson(
    jsonModel(DISCOVER_SCHEMA, 4096),
    [{ text: prompt }],
    (parsed) => {
      if (!Array.isArray(parsed)) throw new Error("discovery did not return an array");
      const seen = new Set(existing.map((e) => e.toLowerCase()));
      const out: DiscoveredType[] = [];
      for (const t of parsed as Array<{ name?: unknown; method?: unknown; trick?: unknown }>) {
        const name = typeof t?.name === "string" ? t.name.trim() : "";
        const method = typeof t?.method === "string" ? t.method.trim() : "";
        if (!name || !method || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const trick = typeof t.trick === "string" && t.trick.trim() ? t.trick.trim() : null;
        out.push({ name: name.slice(0, 80), method: method.slice(0, 300), trick: trick?.slice(0, 300) ?? null });
      }
      if (out.length === 0) throw new Error("discovery returned no valid types");
      return out;
    },
    `discovery over ${items.length} notes`,
  );
}

// ─── Step 3: assign each note to a type ──────────────────────────────────────

const ASSIGN_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING },
      type: { type: SchemaType.INTEGER },
    },
    required: ["id", "type"],
  },
};

/**
 * Returns id → 1-based type number, or NEW_TYPE (0) when nothing fits. Ids
 * missing or out of range are absent from the map.
 */
export async function assignSubPatterns(
  ctx: ChapterContext,
  types: DiscoveredType[],
  items: IdeaItem[],
): Promise<Map<string, number>> {
  if (items.length === 0) return new Map();

  const prompt = [
    "You are sorting previous-year questions into a FIXED list of question-types.",
    "For each note, pick the ONE type whose solving method it uses.",
    `Answer with the type number (1–${types.length}). Answer 0 only if the question clearly needs a different method than every type listed.`,
    "Return ONE entry per note, using the EXACT id given, with no id skipped and no id invented.",
    "",
    contextLine(ctx),
    "",
    "TYPES:",
    ...types.map((t, i) => `${i + 1}. ${t.name} — ${t.method}`),
    "",
    "NOTES:",
    ...items.map((it) => `id=${it.id}: ${it.idea}`),
  ].join("\n");

  const wanted = new Set(items.map((i) => i.id));
  return generateJson(
    jsonModel(ASSIGN_SCHEMA, 4096),
    [{ text: prompt }],
    (parsed) => {
      if (!Array.isArray(parsed)) throw new Error("assignment did not return an array");
      const out = new Map<string, number>();
      for (const item of parsed as Array<{ id?: unknown; type?: unknown }>) {
        if (typeof item?.id !== "string" || !wanted.has(item.id)) continue;
        const n = Number(item.type);
        if (Number.isInteger(n) && n >= 0 && n <= types.length) out.set(item.id, n);
      }
      if (out.size === 0) throw new Error("assignment returned no valid entries");
      return out;
    },
    `assignment of ${items.length} notes`,
  );
}
