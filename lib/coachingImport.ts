import "server-only";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema, type Schema } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { VertexAI } from "@google-cloud/vertexai";
import sharp from "sharp";
import ImageKit, { toFile } from "@imagekit/nodejs";

// Gemini-powered bulk import: extract questions from photos / a PDF, translate to
// the other language, and crop any diagrams. The admin supplies Exam + Set (applied
// to every row) and we feed Gemini the exam's SECTION list so it classifies each
// question into one of those exact names (never invents one).

// Vertex AI vs the Developer API. Set GEMINI_USE_VERTEX=1 in .env.local to route
// imports through Vertex (uses GCP ADC, not the API key) — its quotas dwarf the
// Developer free tier's 15 req/min, so local dev stops hitting rate limits. Prod
// has no such flag, so it keeps using GEMINI_API_KEY. Auth: run once locally
//   gcloud auth application-default login
// (or set GOOGLE_APPLICATION_CREDENTIALS to a service-account key).
const USE_VERTEX = process.env.GEMINI_USE_VERTEX === "1";
const vertexAI = USE_VERTEX
  ? new VertexAI({
      project: process.env.VERTEX_PROJECT || "project-27ed127f-554a-419a-b39",
      location: process.env.VERTEX_LOCATION || "us-central1",
    })
  : null;

// On Vertex (high quota) default to gemini-2.5-pro — strongest reasoning, the least
// loop-prone, best at bilingual LaTeX. On the Developer API default to 2.5-flash
// (Pro's free-tier quota is tiny). COACHING_IMPORT_MODEL overrides either.
const MODEL =
  process.env.COACHING_IMPORT_MODEL || (USE_VERTEX ? "gemini-2.5-pro" : "gemini-2.5-flash");
// Pro REQUIRES thinking (rejects thinkingBudget:0); flash/lite are told to skip it
// so the whole token budget goes to the JSON answer. Pro's thinking is the main
// per-call time cost — extraction/short-answer work doesn't need 4k tokens of it,
// so cap it modestly (tunable). Bump COACHING_IMPORT_THINKING if derived answers
// to hard questions need more reasoning.
const IS_PRO = /pro/i.test(MODEL);
const THINKING_BUDGET = IS_PRO
  ? Math.max(128, Number(process.env.COACHING_IMPORT_THINKING || 1024))
  : 0;

// Long papers can't be extracted in one call — the bilingual question schema
// overflows the output-token limit and truncates. So we enumerate the question
// numbers first, then extract in batches. BUT the Gemini free tier allows only
// 15 requests/MINUTE, so tiny batches (many requests) hit the rate limit hard —
// the batch size is a balance: big enough to keep request count low, small enough
// to avoid truncation/loops (which callResilient also recovers from by reheating).
// 38 questions ÷ 8 ≈ 5 batches × 2 passes + enumerate ≈ 11 requests — under 15/min.
const BATCH_SIZE = Math.max(1, Number(process.env.COACHING_IMPORT_BATCH || 8));

// Bound the output so a runaway repetition loop is cut off in seconds instead of
// filling the full 65k-token budget (which is what produced the bogus "output
// limit" errors on tiny batches). Scales with batch size so legit multi-item
// output still fits: ~2.5k tokens per question + headroom.
const MAX_OUTPUT_TOKENS = Math.min(65536, 4000 + BATCH_SIZE * 2500);

// How many batches run at once. The Developer free tier's 15-req/min cap punishes
// bursts, so it stays at 2; Vertex has ample quota, so default much higher there —
// running every batch in parallel is what makes a 38-question paper finish fast
// instead of waiting on serial Pro calls. Override via env.
const CONCURRENCY = Math.max(
  1,
  Number(process.env.COACHING_IMPORT_CONCURRENCY || (USE_VERTEX ? 8 : 2))
);

const ik = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! });

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Bounded-concurrency map (no p-limit dep) — keeps results in input order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Temperatures tried in order. A repetition loop is temperature-sensitive, so a
// batch that hit the output limit (looped) is retried HOTTER to break it.
const ESCALATING_TEMPS = [0.3, 0.7, 1.0];
const MAX_ATTEMPTS = 5;

/** Pull the server-suggested retry delay (seconds) out of a 429 error message. */
function parseRetryDelaySec(msg: string): number | null {
  const m = msg.match(/retry in (\d+(?:\.\d+)?)s/i) || msg.match(/retryDelay"?\s*:?\s*"?(\d+)s/i);
  return m ? Number(m[1]) : null;
}

/**
 * Run one extraction call with resilience, classifying the failure:
 *  - rate limit (429): wait the server's suggested delay, then retry (same temp)
 *  - repetition loop (output-limit/MAX_TOKENS): retry at a HIGHER temperature
 *  - blocked (RECITATION/SAFETY): deterministic — give up immediately
 *  - transient (503/network/JSON): short backoff, retry
 * Throws the last error if all attempts fail so the caller can skip just this batch.
 */
async function callResilient(
  apiKey: string,
  label: string,
  schema: ResponseSchema,
  parts: Part[],
  signal?: AbortSignal
): Promise<unknown[]> {
  let lastErr: unknown;
  let tempIdx = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new Error("aborted: client disconnected");
    const temp = ESCALATING_TEMPS[Math.min(tempIdx, ESCALATING_TEMPS.length - 1)];
    try {
      return await callGeminiJsonArray(apiKey, schema, parts, temp, signal);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);

      // Client gone — stop immediately, don't keep burning quota or retrying.
      if (signal?.aborted || /aborted/i.test(msg)) throw e;

      // Content the model refuses to reproduce — deterministic, retrying won't help.
      if (/RECITATION|SAFETY|blocked/i.test(msg)) {
        console.warn(`[import] ${label} blocked (${msg.slice(0, 80)}) — skipping.`);
        throw e;
      }
      // Rate limited: wait the server's suggested delay (capped) and retry as-is.
      if (/429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(msg)) {
        const wait = Math.min(35, (parseRetryDelaySec(msg) ?? 20) + 1);
        console.warn(`[import] ${label} rate-limited (${USE_VERTEX ? "Vertex quota" : "Developer free-tier 15/min"}) — waiting ${wait}s [attempt ${attempt}/${MAX_ATTEMPTS}]`);
        await sleep(wait * 1000);
        continue;
      }
      // Repetition loop → escalate temperature to break it.
      if (/output limit|MAX_TOKENS/i.test(msg)) {
        console.warn(`[import] ${label} repetition loop at temp ${temp} — retrying hotter [attempt ${attempt}/${MAX_ATTEMPTS}]`);
        tempIdx++;
        continue;
      }
      // Transient (503 overloaded / network / bad JSON) → short backoff.
      console.warn(`[import] ${label} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}`);
      if (attempt < MAX_ATTEMPTS) await sleep(2000 * attempt);
    }
  }
  throw lastErr;
}

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

// Math must be real LaTeX wrapped in $...$ / $$...$$ — the renderer (KaTeX) only
// typesets delimited math. Without this the model emits bare ASCII like
// "2^2 * 3^x" or "3^max(x,1)", which shows up literally in the UI. Shared by the
// question pass and the answer-key pass so both produce renderable solutions.
const LATEX_RULES = [
  "MATH FORMATTING (CRITICAL): every mathematical expression MUST be wrapped in LaTeX delimiters — inline as $...$, display as $$...$$. This applies to ALL variables, equations, exponents, subscripts, fractions, roots, and operators. NEVER output bare math like `2^2 * 3^x` or `3^max(x,1)` — undelimited math does NOT render and shows up as raw text.",
  "Conversions you MUST apply inside the math: multiplication `*` → `\\cdot` (or `\\times`); powers `a^b` → `a^{b}`; functions like max/min/lcm/gcd → `\\max`, `\\min`, `\\operatorname{lcm}`, `\\gcd`; fractions `a/b` → `\\frac{a}{b}`; square roots → `\\sqrt{...}`.",
  "Examples — write the RIGHT form, never the wrong one:",
  "  • `$2^2 \\cdot 3^x$`            NOT  `2^2 * 3^x`",
  "  • `$3^{\\max(x,\\,1)} = 27$`     NOT  `3^max(x, 1) = 27`",
  "  • `$\\operatorname{lcm}(a,b,c) = 3780$`  NOT  `LCM(a, b, c) = 3780`",
  "  • `$\\frac{n}{2}$`              NOT  `n/2`",
].join("\n");

// What the admin declared the paper contains. Pre-declaring focuses the
// extraction prompt (far more accurate than per-question guessing); "mixed"
// keeps auto-detection for papers with an objective section + a written section.
export type ImportQType = "objective" | "subjective" | "mixed";

function qtypeInstructions(qtype: ImportQType): string[] {
  if (qtype === "objective") {
    return [
      'EVERY question in this paper is objective: "mcq" (has answer choices) or "nat" (the answer is a single number). NEVER use "subjective".',
    ];
  }
  if (qtype === "subjective") {
    return [
      'EVERY question in this paper is "subjective" (written/long-form answer). NEVER use "mcq" or "nat"; leave "options" empty and "correct_answer" as "".',
      'For each question, capture its model answer / worked solution into "solution" (and "solution_hindi") if the paper has one — it is what the AI grader marks student answers against.',
      'If a question shows its marks (e.g. "[3 marks]", "(5)", "2M"), set "max_marks" to that number; otherwise use 5.',
    ];
  }
  return [
    'If a question has no choices at all: use "nat" when the answer is a single number, otherwise "subjective". If unsure between nat and subjective, prefer "subjective". Do NOT label something "mcq" unless you captured its options.',
    'For subjective questions, capture the model answer into "solution" and any printed marks (e.g. "[3 marks]") into "max_marks".',
  ];
}

function buildPrompt(
  sections: string[],
  qtype: ImportQType,
  topics?: string[],
  topicsBySection?: Record<string, string[]>,
  onlyNumbers?: number[]
): string {
  // When batching, restrict this call to a specific set of printed numbers so the
  // output stays under the token limit. The full document is still attached so
  // the model has the context it needs to read each question accurately.
  const numberFilter = onlyNumbers?.length
    ? `EXTRACT ONLY the questions whose PRINTED number is one of: ${JSON.stringify(
        onlyNumbers
      )}. Skip every other question entirely — do NOT include them. Return exactly these questions, in ascending number order.`
    : null;
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
    numberFilter ??
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
    LATEX_RULES,
    // Pass 1 is questions + options + number. Answers are matched in a separate pass,
    // so don't force answer hunting here — just capture options and the number.
    'For question_type "mcq" you MUST capture EVERY answer choice into "options" (labels A, B, C, D… in the order shown). The answer choices are part of the question — do NOT drop them or fold them into question_text.',
    'Always include the printed question "number". If the correct answer is shown right next to the question, set "correct_answer" to its option label; otherwise leave "correct_answer" null (answers are resolved in a separate step).',
    ...qtypeInstructions(qtype),
    // Figure questions (non-verbal reasoning etc.) — capture the whole thing as an image.
    'A question that is FULLY readable as text — word problems, ratios, equations, "find X", numeric/algebra/reasoning-in-words — is NOT a figure question, even if it sits in a box on the page. For these set "is_figure"=false, "has_diagram"=false, and "crop_box"=null. Do NOT snapshot plain text.',
    'ONLY treat a question as a figure when it contains an ACTUAL drawn figure that text cannot convey: a geometry diagram, graph/chart, circuit, map, table-as-image, or options that are themselves pictures. For THOSE set "is_figure"=true and "has_diagram"=true, set "page" to its 0-based page, and set "crop_box" to a TIGHT box ([ymin,xmin,ymax,xmax], normalized 0..1000 for that page) enclosing the ENTIRE question — its stem, all figures, AND all option figures. That whole region is snapshotted as the question image.',
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

// Pass 0: enumerate the printed question numbers. Tiny output (just integers) so
// it never truncates even for a 100-question paper — gives us the ranges to batch
// the heavy extraction passes over.
const ENUM_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: { type: SchemaType.INTEGER },
};

function buildEnumeratePrompt(): string {
  return [
    "Look at the attached exam paper and list the PRINTED number of EVERY question in it, in ascending order.",
    "Count questions only — ignore the answer key / solutions section so each question is counted once.",
    "Return STRICT JSON: an array of integers, e.g. [1,2,3,4,5]. If a question has no printed number, use its 1-based position. Output ONLY the array, no prose.",
  ].join("\n");
}

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

function buildAnswerKeyPrompt(onlyNumbers?: number[]): string {
  const scope = onlyNumbers?.length
    ? `Provide the correct answer + worked solution ONLY for these question numbers: ${JSON.stringify(
        onlyNumbers
      )}. Return exactly one entry per number, in ascending order — skip all other questions.`
    : "Provide the correct answer + worked solution for EVERY question in it.";
  return [
    `You are given an exam paper. ${scope}`,
    "Answers/solutions may be ANYWHERE and in ANY format: inline next to each question, in an answer key, in a separate solutions section, at the end, after each section, or in a table. Look across the WHOLE document and match each answer to its question by number.",
    "Return STRICT JSON: an array where each element is one question's answer:",
    `{
  "number": integer,            // the question number this answer belongs to
  "answer": string,             // the CORRECT option label (A, B, C, D…) for an mcq; the numeric value for a numeric answer
  "solution": string | null,    // worked explanation in English, with all math in $...$ / $$...$$ LaTeX
  "solution_hindi": string | null, // Hindi translation of the solution (math identical)
  "derived": boolean            // true if YOU solved it (not found in the paper), false if read from the paper
}`,
    "PREFER the paper's own answer/solution and read it verbatim (set derived=false). ONLY when a question's answer is NOT present anywhere in the document, solve it yourself: work out the correct answer and write a clear step-by-step solution, and set derived=true.",
    "LENGTH LIMIT: keep each worked solution concise — at most ~80 words / 6 lines. Stop once the key reasoning is clear; do NOT repeat steps, restate the question, or pad. The Hindi solution is just a translation of the same length.",
    LATEX_RULES,
    'The LaTeX rule above applies ONLY to "solution"/"solution_hindi". The "answer" field is NOT math: emit a plain option label (A, B, C…) or a plain number with NO $ signs, backticks, or LaTeX — e.g. "B" or "42", never "$42$".',
    'For a written/subjective question (no answer choices, answer is not a single number) put the FULL model answer into "solution" and set "answer" to "" — the model answer is what matters for these.',
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
  qtype?: ImportQType;
  topics?: string[];
  topicsBySection?: Record<string, string[]>;
  /** Aborts the whole pipeline when the client disconnects (page refresh/close),
   *  so we stop firing Gemini calls instead of burning quota on a dead request. */
  signal?: AbortSignal;
}): Promise<ParsedQuestion[]> {
  // Vertex authenticates via ADC, not the API key — only require the key on the
  // Developer API path.
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!USE_VERTEX && !key) throw new Error("Missing GEMINI_API_KEY");
  const qtype = opts.qtype ?? "mixed";
  // Always log the backend so "it's still using the API key" is obvious at a glance.
  console.log(
    USE_VERTEX
      ? `[import] backend: Vertex AI (${process.env.VERTEX_LOCATION || "us-central1"}) — model ${MODEL}`
      : `[import] backend: Developer API (GEMINI_API_KEY) — model ${MODEL}  [set GEMINI_USE_VERTEX=1 + restart for Vertex]`
  );
  const signal = opts.signal;

  // Resolve media once and reuse across passes. PDFs: the Developer API uploads
  // via the File API (handles big multi-page papers); Vertex has no File API, so
  // inline the PDF as base64 (fine for typical request sizes). Images: inline.
  const media: Part[] = [];
  if (opts.pdf) {
    media.push(
      USE_VERTEX
        ? { inlineData: { mimeType: opts.pdf.mimeType || "application/pdf", data: opts.pdf.base64 } }
        : { fileData: await uploadPdf(opts.pdf, key) }
    );
  }
  for (const img of opts.images ?? []) {
    media.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  // Pass 0 — enumerate the printed question numbers so the heavy passes can be
  // batched under the output-token limit. Counts questions only (ignores the
  // answer key) so a big solutions section can't inflate the count. Best-effort:
  // on failure we fall back to a single, un-batched extraction call below.
  let numbers: number[] = [];
  try {
    const enumParts: Part[] = [{ text: buildEnumeratePrompt() }, ...media];
    const raw = await callResilient(key, "enumerate", ENUM_SCHEMA, enumParts, signal);
    numbers = [...new Set(raw.map((n) => Number(n)).filter((n) => Number.isFinite(n)))].sort(
      (a, b) => a - b
    );
    console.log(`[import] enumerate pass: ${numbers.length} question number(s)`);
  } catch (e) {
    console.error("[import] enumerate pass failed, falling back to single call:", e instanceof Error ? e.message : e);
  }

  // Pass 1 — questions + options + printed number. Batch by number range when the
  // paper is long enough that one call would truncate; otherwise a single call.
  let questions: ParsedQuestion[];
  if (numbers.length > BATCH_SIZE) {
    const groups = chunk(numbers, BATCH_SIZE);
    console.log(`[import] extracting ${numbers.length} questions in ${groups.length} batch(es) of ${BATCH_SIZE}, ${CONCURRENCY} at a time`);
    const batched = await mapLimit(groups, CONCURRENCY, async (group) => {
      if (signal?.aborted) return [] as ParsedQuestion[]; // client gone — don't fire
      const label = `pass-1 batch ${group[0]}–${group[group.length - 1]}`;
      try {
        return (await callResilient(key, label, RESPONSE_SCHEMA, [
          { text: buildPrompt(opts.sections, qtype, opts.topics, opts.topicsBySection, group) },
          ...media,
        ], signal)) as ParsedQuestion[];
      } catch (e) {
        // One batch giving up after retries shouldn't lose the rest of the paper —
        // skip its questions (admin can re-import that range) and keep going.
        console.error(`[import] ${label} gave up:`, e instanceof Error ? e.message : e);
        return [] as ParsedQuestion[];
      }
    });
    // Parallel batches return out of order — sort the flattened list by number.
    questions = batched.flat().sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  } else {
    questions = (await callResilient(key, "pass-1", RESPONSE_SCHEMA, [
      { text: buildPrompt(opts.sections, qtype, opts.topics, opts.topicsBySection) },
      ...media,
    ], signal)) as ParsedQuestion[];
  }
  // Client disconnected during pass 1 — stop now, skip the answer-key pass.
  if (signal?.aborted) {
    console.warn("[import] client disconnected — aborting before answer-key pass.");
    return questions;
  }
  console.log(`[import] pass 1 extracted ${questions.length} question(s)`);

  // Pass 2 — answer key (number → label [+ solution]), matched back onto the
  // questions. Only for those still missing an answer/solution, batched over their
  // numbers so a long paper's solutions don't truncate. Best-effort per batch: a
  // failed batch leaves those answers blank (filled in review), never blocks import.
  const missing = questions.filter((q) =>
    q.question_type === "subjective" ? !q.solution : !q.correct_answer
  );
  if (missing.length) {
    const missingNumbers = [
      ...new Set(
        missing.map((q, i) => (typeof q.number === "number" ? q.number : i + 1))
      ),
    ];
    const groups = chunk(missingNumbers, BATCH_SIZE);
    const batched = await mapLimit(groups, CONCURRENCY, async (group) => {
      if (signal?.aborted) return [] as AnswerKeyEntry[]; // client gone — don't fire
      const label = `answer-key batch ${group[0]}–${group[group.length - 1]}`;
      try {
        return (await callResilient(key, label, ANSWER_KEY_SCHEMA, [
          { text: buildAnswerKeyPrompt(group) },
          ...media,
        ], signal)) as AnswerKeyEntry[];
      } catch (e) {
        console.error(`[import] ${label} gave up:`, e instanceof Error ? e.message : e);
        return [] as AnswerKeyEntry[];
      }
    });
    const answers = batched.flat();
    console.log(`[import] answer-key pass returned ${answers.length} answer(s) across ${groups.length} batch(es)`);
    mergeAnswers(questions, answers);
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
  parts: Part[],
  temperature = 0.3,
  signal?: AbortSignal
): Promise<unknown[]> {
  if (signal?.aborted) throw new Error("aborted: client disconnected");
  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: schema,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // NOT 0: greedy decoding (temp 0) makes the model fall into repetition loops
    // that fill the whole token budget and trip a bogus "output limit" error.
    // callResilient raises this further if a loop still slips through.
    temperature,
    // Pro must think (it rejects budget 0); cap it so thinking can't starve the
    // JSON output and to keep calls fast. flash/lite: disable thinking (budget 0).
    thinkingConfig: { thinkingBudget: THINKING_BUDGET },
  };
  // Vertex (ADC, high quota) for local dev when GEMINI_USE_VERTEX=1; otherwise the
  // Developer API (GEMINI_API_KEY). Both SDKs share the generateContent shape and
  // the candidate/finishReason fields the parsing below reads.
  const model = USE_VERTEX
    ? vertexAI!.getGenerativeModel({
        model: MODEL,
        // @ts-ignore — Vertex's generationConfig type differs slightly but accepts these at runtime.
        generationConfig,
      })
    : new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: MODEL,
        // @ts-ignore — thinkingConfig isn't in the Developer SDK's type yet.
        generationConfig,
      });

  // Retry once on a transient network failure ("fetch failed"), then surface it.
  // Loosely typed: the Vertex and Developer SDKs return different result types
  // but share the .response.candidates / finishReason fields read below.
  let res: any;
  for (let attempt = 0; ; attempt++) {
    try {
      // The Developer SDK takes a 2nd requestOptions arg (AbortSignal); Vertex
      // doesn't — there the signal.aborted checks in callResilient/the batch loops
      // are what stop new work.
      res = USE_VERTEX
        // @ts-ignore — parts type differs between the two SDKs but is structurally identical.
        ? await model.generateContent({ contents: [{ role: "user", parts }] })
        // @ts-ignore
        : await model.generateContent({ contents: [{ role: "user", parts }] }, { signal });
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
    // Developer SDK exposes .text(); Vertex doesn't (throws) → fall back to parts.
    text = typeof res.response.text === "function" ? res.response.text() : "";
  } catch {
    text = "";
  }
  if (!text) {
    text = cand?.content?.parts?.map((p: { text?: string }) => p?.text ?? "").join("") ?? "";
  }
  // responseMimeType should suppress fences, but strip them defensively.
  text = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  if (!text) throw new Error(`Gemini returned no content${finish ? ` (finishReason: ${finish})` : ""}`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
    if (finish === "MAX_TOKENS") {
      // Parsed OK but the model was cut off mid-output — the array is short.
      console.warn(`[import] ⚠ output hit MAX_TOKENS — result is TRUNCATED (got ${Array.isArray(parsed) ? parsed.length : "?"} items). Source likely has more questions than one call can emit.`);
    }
  } catch {
    // Truncated mid-array (MAX_TOKENS): salvage the complete objects emitted so far.
    const salvaged = salvageTruncatedArray(text);
    if (salvaged) {
      console.warn(`[import] ⚠ response truncated (finishReason: ${finish ?? "?"}) — salvaged ${salvaged.length} complete item(s); the rest were dropped.`);
      parsed = salvaged;
    } else if (finish === "MAX_TOKENS")
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
    const entry = byNumber.get(typeof q.number === "number" ? q.number : i + 1);
    if (!entry) return;
    // Subjective: there is no "correct answer" — the prize is the model solution
    // (what the AI grader marks against). Never write an answer letter onto it.
    if (q.question_type === "subjective") {
      if (entry.solution && !q.solution) {
        q.solution = entry.solution;
        if (entry.derived) q.answer_derived = true;
      }
      if (entry.solution_hindi && !q.solution_hindi) q.solution_hindi = entry.solution_hindi;
      return;
    }
    if (q.correct_answer) return; // pass 1 already had an inline answer
    // Strip stray $/backtick/whitespace the model may wrap the answer in despite
    // the prompt ("$42$" → "42", "`B`" → "B") so MCQ/NAT matching still works.
    const ans = entry.answer ? String(entry.answer).replace(/[$`]/g, "").trim() : "";
    if (!ans) return;
    q.correct_answer = q.question_type === "mcq" ? resolveMcqLabel(ans, q.options) ?? ans : ans;
    if (entry.solution && !q.solution) q.solution = entry.solution;
    if (entry.solution_hindi && !q.solution_hindi) q.solution_hindi = entry.solution_hindi;
    if (entry.derived) q.answer_derived = true;
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
  // Only snapshot questions that actually contain a figure. has_diagram is the
  // direct "a figure is present" signal; the model sometimes sets is_figure=true
  // (and a crop_box) on plain text questions (word problems, ratios), which would
  // otherwise snapshot a useless image of the question's own text.
  if (!q.has_diagram) return null;

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
