import "server-only";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema, type Schema } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import sharp from "sharp";
import ImageKit, { toFile } from "@imagekit/nodejs";

// Gemini-powered bulk import: extract questions from photos / a PDF, translate to
// the other language, and crop any diagrams. The admin supplies Exam + Set (applied
// to every row) and we feed Gemini the exam's SECTION list so it classifies each
// question into one of those exact names (never invents one).

const MODEL = process.env.COACHING_IMPORT_MODEL || "gemini-3.1-flash-lite";

const ik = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! });

export type UploadImage = { mimeType: string; base64: string };
type StoredImage = { index: number; filename: string };
type BBox = { x: number; y: number; w: number; h: number };

export type ParsedQuestion = {
  question_type: "mcq" | "nat" | "subjective";
  question_text: string;
  question_text_hindi?: string | null;
  options?: { label: string; text: string }[];
  options_hindi?: { label: string; text: string }[];
  correct_answer?: string;
  max_marks?: number;
  nat_tolerance?: number | null;
  solution?: string | null;
  solution_hindi?: string | null;
  section?: string | null;
  topic?: string | null;
  images?: StoredImage[] | null;
  // Transit-only hints from Gemini (never stored):
  number?: number | null; // printed question number — join key for the answer-key pass
  answer_derived?: boolean; // answer was AI-solved (not found in the paper) → flag for review
  is_figure?: boolean; // question relies on figures/diagrams → snapshot it as an image
  page?: number | null; // 0-based PDF page the question is on (for cropping)
  crop_box?: number[] | null; // [ymin,xmin,ymax,xmax] normalized 0..1000, around the WHOLE question
  has_diagram?: boolean;
  bbox?: BBox | null;
  source_image?: number;
  confidence?: number;
};

function buildPrompt(
  sections: string[],
  topics?: string[],
  topicsBySection?: Record<string, string[]>
): string {
  const sectionList = sections.length
    ? `Assign each question a "section" — it MUST be EXACTLY one of: ${JSON.stringify(
        sections
      )}. If none fits, use null. Do NOT invent new section names.`
    : `Leave "section" as null.`;
  // Catalog mode (fixed CBSE syllabus): topic must come from the chosen section's
  // own list. Flat mode: a single shared list. Else: no topic.
  const topicList =
    topicsBySection && Object.keys(topicsBySection).length
      ? `After choosing "section", assign "topic" — it MUST be EXACTLY one of the topics listed for THAT section in this map, or null if none fits. Do NOT invent topics or use a topic from a different section: ${JSON.stringify(
          topicsBySection
        )}.`
      : topics && topics.length
        ? `Also assign "topic" — EXACTLY one of: ${JSON.stringify(topics)}, or null if none fits.`
        : `Leave "topic" as null.`;
  return [
    "You extract exam questions from the attached images/PDF and return STRICT JSON.",
    "Extract EVERY question present, in order — do NOT sample, summarize, or stop early. If the document has 50 or 100 questions, return all 50 or 100. The array length must equal the number of questions in the source.",
    "Return a JSON array; each element is one question with these fields:",
    `{
  "number": integer | null,           // the PRINTED question number (1, 2, 3…) — needed to match answers
  "question_text": string,            // English. LaTeX inline as \\( ... \\), display as \\[ ... \\]
  "question_text_hindi": string,      // Hindi translation (translate if the source is English; keep LaTeX/numbers identical)
  "question_type": "mcq" | "nat" | "subjective",
  "options": [{"label":"A","text":string}, ...],        // English (mcq only)
  "options_hindi": [{"label":"A","text":string}, ...],  // Hindi, same labels/order (mcq only)
  "correct_answer": string,           // option label for mcq, number for nat, "" for subjective
  "max_marks": number,
  "nat_tolerance": number | null,
  "solution": string | null,          // English
  "solution_hindi": string | null,    // Hindi
  "section": string | null,
  "topic": string | null,
  "has_diagram": boolean,             // true if the question has a figure/diagram
  "bbox": {"x":number,"y":number,"w":number,"h":number} | null,  // figure box in PIXELS of source_image (image uploads only)
  "source_image": number,             // index of the image the question came from (0-based; 0 for PDF)
  "is_figure": boolean,               // true if the question NEEDS its figures to be answered (non-verbal reasoning, diagrams, figure options)
  "page": integer | null,             // 0-based PDF page this question is on (null for image uploads)
  "crop_box": [ymin, xmin, ymax, xmax] | null,  // normalized 0..1000 box around the WHOLE question incl. its figures AND option figures
  "confidence": number                // 0..1 extraction confidence
}`,
    "Preserve the source language verbatim and faithfully translate the other side; keep math/numbers identical across languages.",
    // Pass 1 is questions + options + number. Answers are matched in a separate pass,
    // so don't force answer hunting here — just capture options and the number.
    'For question_type "mcq" you MUST capture EVERY answer choice into "options" (labels A, B, C, D… in the order shown). The answer choices are part of the question — do NOT drop them or fold them into question_text.',
    'Always include the printed question "number". If the correct answer is shown right next to the question, set "correct_answer" to its option label; otherwise leave "correct_answer" null (answers are resolved in a separate step).',
    'If a question has no choices at all: use "nat" when the answer is a single number, otherwise "subjective". Do NOT label something "mcq" unless you captured its options.',
    // Figure questions (non-verbal reasoning etc.) — capture the whole thing as an image.
    'FIGURE QUESTIONS: many questions (non-verbal reasoning, series, geometry/diagrams, or where the OPTIONS themselves are figures) cannot be answered from text alone. For ANY such question set "is_figure"=true, set "page" to its 0-based page, and set "crop_box" to a TIGHT box ([ymin,xmin,ymax,xmax], normalized 0..1000 for that page) enclosing the ENTIRE question — its stem, all figures, AND all option figures. That whole region is snapshotted as the question image.',
    'For a figure question still fill "question_text" with the stem and "options" with the labels A, B, C, D (use "" for an option whose content is purely a figure). NEVER write placeholder option text like "Figure a"/"Figure b" — leave it "" since the figure is in the image.',
    sectionList,
    topicList,
    "Output ONLY the JSON array, no prose.",
  ].join("\n");
}

// Structured-output schema. Forcing the response through this makes Gemini's
// decoder emit grammar-valid JSON — critical here because question/solution text is
// full of LaTeX backslashes (\frac, \(, …) that the model otherwise emits as broken
// JSON escapes (parse fails with finishReason STOP). Schema enforces shape; the
// prompt still drives content (translation, section/topic rules).
const OPTION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    label: { type: SchemaType.STRING },
    text: { type: SchemaType.STRING },
  },
  required: ["label", "text"],
};

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      number: { type: SchemaType.INTEGER, nullable: true },
      question_text: { type: SchemaType.STRING },
      question_text_hindi: { type: SchemaType.STRING, nullable: true },
      question_type: { type: SchemaType.STRING, format: "enum", enum: ["mcq", "nat", "subjective"] },
      options: { type: SchemaType.ARRAY, items: OPTION_SCHEMA, nullable: true },
      options_hindi: { type: SchemaType.ARRAY, items: OPTION_SCHEMA, nullable: true },
      correct_answer: { type: SchemaType.STRING, nullable: true },
      max_marks: { type: SchemaType.NUMBER },
      nat_tolerance: { type: SchemaType.NUMBER, nullable: true },
      solution: { type: SchemaType.STRING, nullable: true },
      solution_hindi: { type: SchemaType.STRING, nullable: true },
      section: { type: SchemaType.STRING, nullable: true },
      topic: { type: SchemaType.STRING, nullable: true },
      has_diagram: { type: SchemaType.BOOLEAN, nullable: true },
      bbox: {
        type: SchemaType.OBJECT,
        nullable: true,
        properties: {
          x: { type: SchemaType.NUMBER },
          y: { type: SchemaType.NUMBER },
          w: { type: SchemaType.NUMBER },
          h: { type: SchemaType.NUMBER },
        },
        required: ["x", "y", "w", "h"],
      },
      source_image: { type: SchemaType.INTEGER, nullable: true },
      is_figure: { type: SchemaType.BOOLEAN, nullable: true },
      page: { type: SchemaType.INTEGER, nullable: true },
      crop_box: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER }, nullable: true },
      confidence: { type: SchemaType.NUMBER, nullable: true },
    },
    required: ["question_text", "question_type", "max_marks"],
  },
};

// Pass 2: the answer key. A focused, compact extraction (number → label [+ worked
// solution]) from the solutions section — far more reliable than asking the
// question pass to also hunt down 100 answers.
const ANSWER_KEY_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      number: { type: SchemaType.INTEGER },
      answer: { type: SchemaType.STRING }, // option label (A/B/…) for mcq, or the numeric answer
      solution: { type: SchemaType.STRING, nullable: true },
      solution_hindi: { type: SchemaType.STRING, nullable: true },
      derived: { type: SchemaType.BOOLEAN, nullable: true }, // true = AI-solved, not from the paper
    },
    required: ["number", "answer"],
  },
};

type AnswerKeyEntry = {
  number: number;
  answer: string;
  solution?: string | null;
  solution_hindi?: string | null;
  derived?: boolean | null; // true = AI solved it (not found in the paper)
};

function buildAnswerKeyPrompt(): string {
  return [
    "You are given an exam paper. Provide the correct answer + worked solution for EVERY question in it.",
    "Answers/solutions may be ANYWHERE and in ANY format: inline next to each question, in an answer key, in a separate solutions section, at the end, after each section, or in a table. Look across the WHOLE document and match each answer to its question by number.",
    "Return STRICT JSON: an array where each element is one question's answer:",
    `{
  "number": integer,            // the question number this answer belongs to
  "answer": string,             // the CORRECT option label (A, B, C, D…) for an mcq; the numeric value for a numeric answer
  "solution": string | null,    // worked explanation in English (LaTeX inline \\( \\), display \\[ \\])
  "solution_hindi": string | null, // Hindi translation of the solution
  "derived": boolean            // true if YOU solved it (not found in the paper), false if read from the paper
}`,
    "PREFER the paper's own answer/solution and read it verbatim (set derived=false). ONLY when a question's answer is NOT present anywhere in the document, solve it yourself: work out the correct answer and write a clear step-by-step solution, and set derived=true.",
    "Return an entry for EVERY question number — never leave a question without an answer. Do not stop early.",
    "Output ONLY the JSON array, no prose.",
  ].join("\n");
}

/**
 * Recover a JSON array that was cut off mid-stream (model hit MAX_TOKENS). Trims
 * back to the last complete top-level object and closes the array, so a truncated
 * response yields the questions that *did* come through instead of throwing.
 * Returns the parsed array, or null if nothing salvageable.
 */
function salvageTruncatedArray(text: string): unknown[] | null {
  const start = text.indexOf("[");
  if (start === -1) return null;
  const lastClose = text.lastIndexOf("}");
  if (lastClose <= start) return null;
  const candidate = text.slice(start, lastClose + 1) + "]";
  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Upload a PDF via Gemini's File API and wait until it's ACTIVE, returning a
 * fileData reference. Inlining a PDF as base64 blows the ~20MB request-body limit
 * (→ "fetch failed") for multi-page papers; the File API takes files up to 2GB.
 */
async function uploadPdf(pdf: UploadImage, apiKey: string): Promise<{ mimeType: string; fileUri: string }> {
  const fm = new GoogleAIFileManager(apiKey);
  const buf = Buffer.from(pdf.base64, "base64");
  const { file } = await fm.uploadFile(buf, {
    mimeType: pdf.mimeType || "application/pdf",
    displayName: `import-${Date.now()}.pdf`,
  });

  // Poll until processing finishes (PDFs are usually quick; cap the wait).
  let state = file.state;
  let uri = file.uri;
  for (let i = 0; state === FileState.PROCESSING && i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const meta = await fm.getFile(file.name);
    state = meta.state;
    uri = meta.uri;
  }
  if (state !== FileState.ACTIVE) {
    throw new Error(`PDF upload did not become ready (state: ${state})`);
  }
  return { mimeType: pdf.mimeType || "application/pdf", fileUri: uri };
}

/** Call Gemini to extract + translate questions from the uploaded media. */
export async function extractQuestions(opts: {
  images?: UploadImage[];
  pdf?: UploadImage;
  sections: string[];
  topics?: string[];
  topicsBySection?: Record<string, string[]>;
}): Promise<ParsedQuestion[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  // Resolve media once (PDF via File API, images inline) and reuse across passes.
  const media: Part[] = [];
  if (opts.pdf) media.push({ fileData: await uploadPdf(opts.pdf, key) });
  for (const img of opts.images ?? []) {
    media.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  // Pass 1 — questions + options + printed number.
  const qParts: Part[] = [
    { text: buildPrompt(opts.sections, opts.topics, opts.topicsBySection) },
    ...media,
  ];
  const questions = (await callGeminiJsonArray(key, RESPONSE_SCHEMA, qParts)) as ParsedQuestion[];

  // Pass 2 — answer key (number → label [+ solution]) from the solutions section,
  // matched back onto the questions. Only run if answers are still missing. Best-
  // effort: on failure the questions still import; the admin fills answers in review.
  if (questions.some((q) => !q.correct_answer)) {
    try {
      const akParts: Part[] = [{ text: buildAnswerKeyPrompt() }, ...media];
      const answers = (await callGeminiJsonArray(key, ANSWER_KEY_SCHEMA, akParts)) as AnswerKeyEntry[];
      mergeAnswers(questions, answers);
    } catch {
      // leave correct_answer empty — surfaced in the review UI for manual fill
    }
  }
  return questions;
}

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } };

/**
 * Run one Gemini call constrained to a JSON-array schema and return the parsed
 * array. Shared by the question pass and the answer-key pass: same retry on a
 * transient "fetch failed", same blocked/empty/truncation handling + salvage.
 */
async function callGeminiJsonArray(
  apiKey: string,
  schema: ResponseSchema,
  parts: Part[]
): Promise<unknown[]> {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      maxOutputTokens: 65536,
    },
  });

  // Retry once on a transient network failure ("fetch failed"), then surface it.
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await model.generateContent({ contents: [{ role: "user", parts }] });
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt >= 1 || !/fetch failed|ECONN|network|socket/i.test(msg)) {
        throw new Error(`Gemini request failed: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // Surface why the model stopped (blocked prompt / truncation) before parsing,
  // so it doesn't collapse into a misleading "invalid JSON".
  const cand = res.response.candidates?.[0];
  const finish = cand?.finishReason;
  const blocked = res.response.promptFeedback?.blockReason;
  if (blocked) throw new Error(`Gemini blocked the request (${blocked})`);

  let text = "";
  try {
    text = res.response.text();
  } catch {
    text = cand?.content?.parts?.map((p) => ("text" in p ? p.text : "")).join("") ?? "";
  }
  // responseMimeType should suppress fences, but strip them defensively.
  text = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  if (!text) throw new Error(`Gemini returned no content${finish ? ` (finishReason: ${finish})` : ""}`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Truncated mid-array (MAX_TOKENS): salvage the complete objects emitted so far.
    const salvaged = salvageTruncatedArray(text);
    if (salvaged) parsed = salvaged;
    else if (finish === "MAX_TOKENS")
      throw new Error("Gemini hit its output limit — too many items to extract at once. Use a smaller batch.");
    else throw new Error(`Gemini did not return valid JSON${finish ? ` (finishReason: ${finish})` : ""}`);
  }
  return Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : [];
}

/**
 * Fold answer-key entries into the questions, matching by printed number (falling
 * back to position). Only fills answers/solutions that pass 1 left empty.
 */
function mergeAnswers(questions: ParsedQuestion[], key: AnswerKeyEntry[]): void {
  const byNumber = new Map<number, AnswerKeyEntry>();
  for (const e of key) {
    const n = Number(e?.number);
    if (Number.isFinite(n)) byNumber.set(n, e);
  }
  questions.forEach((q, i) => {
    if (q.correct_answer) return; // pass 1 already had an inline answer
    const entry = byNumber.get(typeof q.number === "number" ? q.number : i + 1);
    const ans = entry?.answer ? String(entry.answer).trim() : "";
    if (!ans) return;
    q.correct_answer = q.question_type === "mcq" ? resolveMcqLabel(ans, q.options) ?? ans : ans;
    if (entry?.solution && !q.solution) q.solution = entry.solution;
    if (entry?.solution_hindi && !q.solution_hindi) q.solution_hindi = entry.solution_hindi;
    if (entry?.derived) q.answer_derived = true;
  });
}

/**
 * Map an answer-key value ("C", "(C)", or the option's full text) to one of the
 * question's option labels, so the review radio pre-selects the right choice.
 */
function resolveMcqLabel(raw: string, options?: { label: string; text: string }[] | null): string | null {
  const s = raw.trim();
  if (!options?.length) return /^[A-Za-z]$/.test(s) ? s.toUpperCase() : null;
  const ci = options.find((o) => o.label.toLowerCase() === s.toLowerCase());
  if (ci) return ci.label;
  const byText = options.find((o) => o.text.trim().toLowerCase() === s.toLowerCase());
  if (byText) return byText.label;
  const lead = s.match(/[A-Za-z]/)?.[0];
  const byLead = lead && options.find((o) => o.label.toLowerCase() === lead.toLowerCase());
  return byLead ? byLead.label : null;
}

// A rasterized PDF page source, shaped to avoid leaking mupdf types here (the
// renderer lives in lib/pdfRaster and is passed in by the route).
type PageRenderer = { render(pageIndex: number): { png: Buffer; width: number; height: number } | null };
export type CropContext = { images: UploadImage[]; renderer?: PageRenderer | null };

/** Upload a PNG crop to ImageKit; returns its URL (passed through by getImageUrl) or null. */
async function uploadCrop(png: Buffer, coachingId: string): Promise<string | null> {
  try {
    const fileName = `q-${globalThis.crypto.randomUUID()}.png`;
    const file = await toFile(png, fileName);
    const result = await ik.files.upload({
      file,
      fileName,
      folder: `/pattern-master/coaching/${coachingId}`,
      useUniqueFileName: true,
    });
    return result.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Capture a question's figure(s) as an image. For figure questions Gemini returns
 * a normalized crop_box (0..1000, [ymin,xmin,ymax,xmax]) around the WHOLE question;
 * we crop it from the rasterized PDF page (or the source image for image uploads)
 * and upload it. Falls back to the legacy single-diagram bbox path. Best-effort:
 * any failure returns null so the question still imports (just without the image).
 */
export async function cropQuestionImage(
  ctx: CropContext,
  q: ParsedQuestion,
  coachingId: string
): Promise<StoredImage[] | null> {
  const box = Array.isArray(q.crop_box) && q.crop_box.length === 4 ? q.crop_box.map(Number) : null;
  if (!box || box.some((n) => !Number.isFinite(n))) {
    return cropDiagram(ctx.images, q, coachingId);
  }

  // Resolve the source bitmap + its pixel dimensions: a rasterized PDF page, or
  // the originating uploaded image.
  let srcPng: Buffer | null = null;
  let W = 0;
  let H = 0;
  if (ctx.renderer && typeof q.page === "number") {
    const r = ctx.renderer.render(q.page);
    if (r) ({ png: srcPng, width: W, height: H } = r);
  }
  if (!srcPng && ctx.images.length) {
    const src = ctx.images[q.source_image ?? 0];
    if (src) {
      srcPng = Buffer.from(src.base64, "base64");
      const meta = await sharp(srcPng).metadata();
      W = meta.width ?? 0;
      H = meta.height ?? 0;
    }
  }
  if (!srcPng || W === 0 || H === 0) return null;

  try {
    const [ymin, xmin, ymax, xmax] = box;
    const pad = 0.012; // a little breathing room so figure edges aren't clipped
    const left = Math.max(0, Math.round((Math.min(xmin, xmax) / 1000 - pad) * W));
    const top = Math.max(0, Math.round((Math.min(ymin, ymax) / 1000 - pad) * H));
    const right = Math.min(W, Math.round((Math.max(xmin, xmax) / 1000 + pad) * W));
    const bottom = Math.min(H, Math.round((Math.max(ymin, ymax) / 1000 + pad) * H));
    const width = right - left;
    const height = bottom - top;
    if (width <= 2 || height <= 2) return null;

    const cropped = await sharp(srcPng).extract({ left, top, width, height }).png().toBuffer();
    const url = await uploadCrop(cropped, coachingId);
    return url ? [{ index: 0, filename: url }] : null;
  } catch {
    return null;
  }
}

/**
 * Legacy single-diagram crop from an uploaded image's pixel bbox. Kept as the
 * fallback when no normalized crop_box is present.
 */
export async function cropDiagram(
  images: UploadImage[],
  q: ParsedQuestion,
  coachingId: string
): Promise<StoredImage[] | null> {
  if (!q.has_diagram || !q.bbox || images.length === 0) return null;
  const src = images[q.source_image ?? 0];
  if (!src) return null;
  try {
    const buf = Buffer.from(src.base64, "base64");
    const meta = await sharp(buf).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    const left = Math.max(0, Math.round(q.bbox.x));
    const top = Math.max(0, Math.round(q.bbox.y));
    const width = Math.min(imgW - left, Math.round(q.bbox.w));
    const height = Math.min(imgH - top, Math.round(q.bbox.h));
    if (width <= 1 || height <= 1) return null;

    const cropped = await sharp(buf).extract({ left, top, width, height }).png().toBuffer();
    const url = await uploadCrop(cropped, coachingId);
    return url ? [{ index: 0, filename: url }] : null;
  } catch {
    return null;
  }
}
