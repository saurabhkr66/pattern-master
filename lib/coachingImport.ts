import "server-only";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema, type Schema } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { VertexAI } from "@google-cloud/vertexai";
import sharp from "sharp";
import { uploadCoachingImage } from "@/lib/coachingImageUpload";

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
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const vertexAI = USE_VERTEX
  ? new VertexAI({
      project: process.env.VERTEX_PROJECT || "project-27ed127f-554a-419a-b39",
      location: VERTEX_LOCATION,
      // Gemini 3.x (e.g. gemini-3.1-flash-lite) is served to this project ONLY via
      // the GLOBAL endpoint — the regional host (us-central1) 404s on 3.x. The
      // global endpoint lives at aiplatform.googleapis.com, NOT
      // global-aiplatform.googleapis.com, which is what older @google-cloud/vertexai
      // builds from location:"global" (→ DNS failure). Pin the host so the swap to
      // location="global" actually reaches Gemini 3.x.
      ...(VERTEX_LOCATION === "global"
        ? { apiEndpoint: "aiplatform.googleapis.com" }
        : {}),
    })
  : null;

// Extraction model. On the Developer API default to gemini-3.1-flash-lite —
// fast/cheap and fine for pulling structured questions out of a paper. On Vertex
// default to gemini-2.5-flash for every pass (stronger reader, and flash-lite
// isn't reliably served there). COACHING_IMPORT_MODEL overrides either.
const MODEL =
  process.env.COACHING_IMPORT_MODEL || (USE_VERTEX ? "gemini-2.5-flash" : "gemini-3.1-flash-lite");
// The answer-key pass is accuracy-critical: it must LOCATE and READ the printed
// answers rather than solve questions itself. Defaults to gemini-3.1-flash-lite
// — cheap/fast and reliable for reading printed answers (Pro's thinking tokens
// would be wasted on a reading task). The blind VERIFY pass below catches the
// rare misread. Override with COACHING_IMPORT_ANSWER_MODEL.
const ANSWER_MODEL = process.env.COACHING_IMPORT_ANSWER_MODEL || "gemini-3.1-flash-lite";
// Figure detection is a pure spatial-localization task — a flash model with
// thinking OFF is ideal (and Google recommends thinkingBudget=0 for it). It must
// NOT inherit COACHING_IMPORT_MODEL: pointing it at Pro both wastes Pro on a
// non-reasoning task AND breaks it, because Pro rejects thinkingBudget:0 — every
// detect call would throw and crop 0 figures. So it gets its own flash default.
const FIGURE_MODEL =
  process.env.COACHING_IMPORT_FIGURE_MODEL || (USE_VERTEX ? "gemini-2.5-flash" : "gemini-3.1-flash-lite");
// Thinking config differs by model GENERATION, and mixing the dialects errors:
//  - Gemini 3.x controls thinking by LEVEL (MINIMAL|LOW|MEDIUM|HIGH) — a numeric
//    thinkingBudget is REJECTED. Default LOW: a light reasoning pass that helps the
//    blind VERIFY solve (and answer derivation) without much cost; dial down to
//    MINIMAL for cost at scale or up to MEDIUM/HIGH if disagreements look weak, via
//    COACHING_IMPORT_THINKING_LEVEL.
//  - Gemini 2.5 Pro REQUIRES a numeric budget (rejects 0); flash/lite take 0 to
//    skip thinking so the whole output budget goes to the JSON answer.
const G3_THINKING_LEVEL = process.env.COACHING_IMPORT_THINKING_LEVEL || "LOW";
// Figure detection gets its OWN thinking level (G3 figure models only), decoupled
// from the big extraction calls: its input is a single page, so thinking harder
// there is cheap, whereas raising the global level would also tax every extraction
// call. Defaults to the global level, so behaviour is unchanged until you set it.
// NOTE: bounding-box localization is a spatial task — Google recommends LOW/zero
// thinking for it, so model CAPABILITY (COACHING_IMPORT_FIGURE_MODEL) is the bigger
// recall lever than this. Only applies to a Gemini-3 figure model (2.5 flash stays
// budget 0; a 2.5 Pro figure model still gets a positive budget below).
const FIGURE_THINKING_LEVEL = process.env.COACHING_IMPORT_FIGURE_THINKING_LEVEL || G3_THINKING_LEVEL;
const thinkingConfigFor = (modelId: string, g3Level: string = G3_THINKING_LEVEL) =>
  /gemini-3/i.test(modelId)
    ? { thinkingLevel: g3Level }
    : {
        thinkingBudget: /pro/i.test(modelId)
          ? Math.max(128, Number(process.env.COACHING_IMPORT_THINKING || 2048))
          : 0,
      };

// Long papers can't be extracted in one call — the bilingual question schema
// overflows the output-token limit and truncates. So we enumerate the question
// numbers first, then extract in batches. BUT the Gemini free tier allows only
// 15 requests/MINUTE, so tiny batches (many requests) hit the rate limit hard —
// the batch size is a balance: big enough to keep request count low, small enough
// to avoid truncation/loops (which callResilient also recovers from by reheating).
// Defaults to 1 (one question per call) for maximum extraction accuracy and zero
// truncation risk; this leans on CONCURRENCY to stay fast and assumes a paid tier
// (the free 15-req/min cap punishes the resulting request count). Raise
// COACHING_IMPORT_BATCH to cut request count on rate-limited tiers.
const BATCH_SIZE = Math.max(1, Number(process.env.COACHING_IMPORT_BATCH || 1));

// Bound the output so a runaway repetition loop is cut off in seconds instead of
// filling the full 65k-token budget (which is what produced the bogus "output
// limit" errors on tiny batches). Scales with batch size so legit multi-item
// output still fits: ~3.5k tokens per question (bilingual + LaTeX + solution) + headroom.
const MAX_OUTPUT_TOKENS = Math.min(65536, 4000 + BATCH_SIZE * 3500);

// How many batches run at once. Defaults to 16 — with BATCH=1 this is what keeps
// a whole paper fast (16 single-question calls in flight) instead of crawling
// serially. Assumes a paid Developer tier or Vertex; the free 15-req/min cap will
// throttle this hard, so drop COACHING_IMPORT_CONCURRENCY there. Override via env.
const CONCURRENCY = Math.max(
  1,
  Number(process.env.COACHING_IMPORT_CONCURRENCY || 16)
);

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
  signal?: AbortSignal,
  modelId: string = MODEL
): Promise<unknown[]> {
  let lastErr: unknown;
  let tempIdx = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new Error("aborted: client disconnected");
    const temp = ESCALATING_TEMPS[Math.min(tempIdx, ESCALATING_TEMPS.length - 1)];
    try {
      return await callGeminiJsonArray(apiKey, schema, parts, temp, signal, modelId);
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
// One stored figure. `type` follows the PYQ convention: omitted/"question" → shown
// with the question; "explanation" → shown in the worked-solution block. A single
// images array holds both, filtered by type at render (no separate column).
type StoredImage = { index: number; filename: string; type?: "question" | "explanation" };

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
  answer_disputed?: boolean; // an INDEPENDENT verification solve disagreed with correct_answer → flag for review
  verify_answer?: string; // the answer the independent verifier arrived at (shown in the review UI)
  solution_answer?: string | null; // the answer the worked SOLUTION concludes (the extractor's own reasoning)
  solution_mismatch?: boolean; // solution concludes a different answer than the ticked correct_answer → flag
  solution_review_flag?: boolean; // SUBJECTIVE: an independent quality review judged the model answer wrong/incomplete → flag for review
  solution_review_note?: string; // SUBJECTIVE: the reviewer-facing reason the model answer was flagged
  is_figure?: boolean; // question relies on figures/diagrams → snapshot it as an image
  page?: number | null; // 0-based PDF page the question is on (for figure detection)
  has_diagram?: boolean; // a drawn figure/diagram is present → trigger figure detection pass
  options_are_figures?: boolean; // the answer CHOICES are pictures (mirror-image / non-verbal) → capture the whole question
  figure_missing?: boolean; // a figure was expected (flagged) but no image was captured → flag for review
  solution_has_diagram?: boolean; // the WORKED SOLUTION contains a drawn figure → crop it as an explanation image
  solution_page?: number | null; // 0-based PDF page the solution figure is on
  solution_figure_missing?: boolean; // a solution figure was expected but none was captured → flag for review
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
  onlyNumbers?: number[],
  // Hindi translation is opt-in (default OFF): when false we never ask for the
  // *_hindi fields, so the model spends no tokens translating and the output is
  // English-only. The admin flips it on per import only for bilingual papers.
  bilingual = false
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
    [
      "{",
      '  "number": integer | null,           // the PRINTED question number (1, 2, 3…) — needed to match answers',
      '  "question_text": string,            // English. LaTeX inline as \\( ... \\), display as \\[ ... \\]',
      ...(bilingual
        ? ['  "question_text_hindi": string,      // Hindi translation (translate if the source is English; keep LaTeX/numbers identical)']
        : []),
      '  "question_type": "mcq" | "nat" | "subjective",',
      '  "options": [{"label":"A","text":string}, ...],        // English (mcq only)',
      ...(bilingual
        ? ['  "options_hindi": [{"label":"A","text":string}, ...],  // Hindi, same labels/order (mcq only)']
        : []),
      '  "solution": string | null,          // English worked solution — WRITE THIS FIRST, before deciding the answer',
      ...(bilingual ? ['  "solution_hindi": string | null,    // Hindi'] : []),
      '  "solution_answer": string | null,   // the option label (mcq) / number (nat) your "solution" above arrives at',
      '  "correct_answer": string,           // the PRINTED answer if the paper prints one; else copy "solution_answer"',
      '  "max_marks": number,',
      '  "nat_tolerance": number | null,',
      '  "section": string | null,',
      '  "topic": string | null,',
      '  "has_diagram": boolean,             // true if the question contains a drawn figure/diagram/graph/chart',
      '  "options_are_figures": boolean,     // true if the ANSWER CHOICES are pictures (mirror-image / non-verbal reasoning) that can\'t be written as text',
      '  "solution_has_diagram": boolean,    // true if the WORKED SOLUTION/explanation itself contains a drawn figure/diagram/graph the explanation relies on',
      '  "solution_page": integer | null,    // 0-based PDF page the SOLUTION figure is on (null for image uploads)',
      '  "source_image": number,             // index of the image the question came from (0-based; 0 for PDF)',
      '  "is_figure": boolean,               // true if the question NEEDS its figures to be answered (non-verbal reasoning, diagrams, figure options)',
      '  "page": integer | null,             // 0-based PDF page this question is on (null for image uploads)',
      '  "confidence": number                // 0..1 extraction confidence',
      "}",
    ].join("\n"),
    ...(bilingual
      ? ["Preserve the source language verbatim and faithfully translate the other side; keep math/numbers identical across languages."]
      : ['Extract every field in ENGLISH only — do NOT translate or emit any Hindi (no "*_hindi" fields).']),
    LATEX_RULES,
    // Pass 1 captures questions + options + number AND any answers visible in the
    // document (inline or from a printed answer key). The more answers we grab now,
    // the fewer questions need the separate (costlier) answer-key pass.
    'For question_type "mcq" you MUST capture EVERY answer choice into "options" (labels A, B, C, D… in the order shown). The answer choices are part of the question — do NOT drop them or fold them into question_text.',
    'Always include the printed question "number".',
    'REASON BEFORE ANSWERING (order matters): for every objective question, FIRST write the worked "solution", THEN set "solution_answer" to the option label (mcq) / number (nat) that your solution arrives at. Never pick the answer before working it out — fill these fields in this order.',
    '"solution_answer" is ALWAYS your own reasoned answer — fill it even when the paper prints an answer key; it is how we cross-check the printed key.',
    'ANSWERS for "correct_answer": scan the ENTIRE document — answer key, solutions section, end tables (e.g. "1-B 2-C") — for the PRINTED answer. If you find one, set "correct_answer" to it (and if a worked solution is printed, use it for "solution"). If NO printed answer exists anywhere, leave "correct_answer" null (a separate pass handles it). Do NOT force "correct_answer" to match "solution_answer": if the printed key differs from your reasoning, KEEP the printed value — the disagreement is recorded for human review.',
    ...qtypeInstructions(qtype),
    // Figure detection: the extraction pass identifies WHETHER a question has a
    // figure and WHICH page it's on; a separate per-question pass locates the
    // exact figure region on that page's rasterized image (far more accurate than
    // asking for coordinates during the multi-page extraction).
    'A question that is FULLY readable as text — word problems, ratios, equations, "find X", numeric/algebra/reasoning-in-words — is NOT a figure question, even if it sits in a box on the page. For these set "is_figure"=false, "has_diagram"=false, AND "options_are_figures"=false. Set "has_diagram"=true ONLY when you can actually SEE a drawn figure — never on a hunch that one might exist.',
    'ONLY flag a question as a figure when it contains an ACTUAL drawn figure that text cannot convey: a geometry diagram, graph/chart, circuit, map, table-as-image, or options that are themselves pictures. For THOSE set "is_figure"=true, "has_diagram"=true, and "page" to its 0-based page index. The figure will be cropped in a separate step — do NOT try to estimate coordinates here.',
    'For a figure question still fill "question_text" with the stem and "options" with the labels A, B, C, D (use "" for an option whose content is purely a figure). NEVER write placeholder option text like "Figure a"/"Figure b" — leave it "" since the figure is in the image.',
    'OPTIONS THAT ARE PICTURES: when the answer CHOICES themselves are figures the student must SEE to pick (mirror-image, water-image, rotation, "which figure comes next", embedded-figure) and cannot be put into words, set "options_are_figures"=true, ALSO set "has_diagram"=true and "page" to its 0-based page index (so the image can be captured), and leave every option\'s "text" as "". The ENTIRE question — stem plus all four option pictures — is captured as ONE image, and the student answers by picking A/B/C/D.',
    'SOLUTION FIGURES: separately from the question, judge whether the WORKED SOLUTION/explanation itself contains an ACTUAL drawn figure (a construction diagram, graph, or labelled sketch the explanation refers to). If so set "solution_has_diagram"=true and "solution_page" to its 0-based page index (the page the solution figure is on, which may differ from the question\'s page); it will be cropped separately and shown with the solution. Set "solution_has_diagram"=false when the solution is text/equations only — most solutions have NO figure.',
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

// Built per import: the *_hindi fields are included ONLY when the admin opts into
// a bilingual import. Leaving them out of the schema (rather than just out of the
// prompt) stops the decoder from reserving/emitting them at all on the default
// English-only path.
function buildResponseSchema(bilingual: boolean): ResponseSchema {
  const properties: Record<string, Schema> = {
    number: { type: SchemaType.INTEGER, nullable: true },
    question_text: { type: SchemaType.STRING },
    ...(bilingual ? { question_text_hindi: { type: SchemaType.STRING, nullable: true } } : {}),
    question_type: { type: SchemaType.STRING, format: "enum", enum: ["mcq", "nat", "subjective"] },
    options: { type: SchemaType.ARRAY, items: OPTION_SCHEMA, nullable: true },
    ...(bilingual ? { options_hindi: { type: SchemaType.ARRAY, items: OPTION_SCHEMA, nullable: true } } : {}),
    // Reasoning-first: solution + the answer the solution concludes are emitted
    // BEFORE correct_answer, so the model works the problem out before committing
    // to an answer (structured output generates fields top-to-bottom and can't
    // revise an earlier field). correct_answer then either reads the printed key
    // or follows solution_answer — and a disagreement between them is the flag.
    solution: { type: SchemaType.STRING, nullable: true },
    ...(bilingual ? { solution_hindi: { type: SchemaType.STRING, nullable: true } } : {}),
    solution_answer: { type: SchemaType.STRING, nullable: true },
    correct_answer: { type: SchemaType.STRING, nullable: true },
    max_marks: { type: SchemaType.NUMBER },
    nat_tolerance: { type: SchemaType.NUMBER, nullable: true },
    section: { type: SchemaType.STRING, nullable: true },
    topic: { type: SchemaType.STRING, nullable: true },
    has_diagram: { type: SchemaType.BOOLEAN, nullable: true },
    options_are_figures: { type: SchemaType.BOOLEAN, nullable: true },
    solution_has_diagram: { type: SchemaType.BOOLEAN, nullable: true },
    solution_page: { type: SchemaType.INTEGER, nullable: true },
    source_image: { type: SchemaType.INTEGER, nullable: true },
    is_figure: { type: SchemaType.BOOLEAN, nullable: true },
    page: { type: SchemaType.INTEGER, nullable: true },
    confidence: { type: SchemaType.NUMBER, nullable: true },
  };
  return {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties,
      required: ["question_text", "question_type", "max_marks"],
    },
  };
}

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
// solution_hindi is included only on the bilingual path (see buildResponseSchema).
function buildAnswerKeySchema(bilingual: boolean): ResponseSchema {
  return {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        number: { type: SchemaType.INTEGER },
        // Reasoning-first: solution + the answer it concludes precede the printed answer.
        solution: { type: SchemaType.STRING, nullable: true },
        ...(bilingual ? { solution_hindi: { type: SchemaType.STRING, nullable: true } } : {}),
        solution_answer: { type: SchemaType.STRING, nullable: true }, // the answer the solution concludes (own reasoning)
        answer: { type: SchemaType.STRING }, // the PRINTED answer (option label/number); else = solution_answer
        derived: { type: SchemaType.BOOLEAN, nullable: true }, // true = AI-solved, not from the paper
        solution_has_diagram: { type: SchemaType.BOOLEAN, nullable: true }, // the printed solution contains a drawn figure
        solution_page: { type: SchemaType.INTEGER, nullable: true }, // 0-based page the solution figure is on
      },
      required: ["number", "answer"],
    },
  };
}

type AnswerKeyEntry = {
  number: number;
  answer: string;
  solution?: string | null;
  solution_hindi?: string | null;
  solution_answer?: string | null; // the answer the solution concludes (own reasoning) — for the cross-check
  derived?: boolean | null; // true = AI solved it (not found in the paper)
  solution_has_diagram?: boolean | null; // the printed worked solution contains a drawn figure
  solution_page?: number | null; // 0-based page the solution figure is on
};

function buildAnswerKeyPrompt(onlyNumbers?: number[], bilingual = false): string {
  const scope = onlyNumbers?.length
    ? `Provide the correct answer + worked solution ONLY for these question numbers: ${JSON.stringify(
        onlyNumbers
      )}. Return exactly one entry per number, in ascending order — skip all other questions.`
    : "Provide the correct answer + worked solution for EVERY question in it.";
  return [
    `You are given an exam paper. ${scope}`,
    "These papers almost always PRINT the answers — your PRIMARY job is to FIND and READ them, not to solve the questions. The printed answers/solutions may be ANYWHERE and in ANY format: inline next to each question, in an answer key, in a separate solutions section, at the very end, after each section, or in a table (often a compact grid like '1-B 2-C 3-A'). Before deciding an answer is missing, scan the ENTIRE document end to end — including the last pages — for an answer key or solutions section.",
    "Return STRICT JSON: an array where each element is one question's answer:",
    [
      "{",
      '  "number": integer,            // the question number this answer belongs to',
      '  "solution": string | null,    // worked explanation in English — WRITE FIRST, all math in $...$ / $$...$$ LaTeX',
      ...(bilingual ? ['  "solution_hindi": string | null, // Hindi translation of the solution (math identical)'] : []),
      '  "solution_answer": string | null, // the option label / number your "solution" above concludes (your own reasoning)',
      '  "answer": string,             // the PRINTED answer (option label A/B/C… for mcq, numeric value for nat); if none is printed, copy "solution_answer"',
      '  "derived": boolean,           // true if YOU solved it (not found in the paper), false if read from the paper',
      '  "solution_has_diagram": boolean, // true if the PRINTED worked solution contains a drawn figure/diagram/graph the explanation refers to',
      '  "solution_page": integer | null  // 0-based page the solution figure is on (null for image uploads)',
      "}",
    ].join("\n"),
    'REASON BEFORE ANSWERING (order matters): FIRST write the worked "solution", THEN set "solution_answer" to what it concludes, THEN set "answer". Fill "solution_answer" ALWAYS from your own reasoning (even when a printed answer exists) — it cross-checks the printed key.',
    'CRITICAL — for "answer": do NOT solve a question whose answer is printed in the paper. Read the printed answer verbatim and set derived=false. If the printed key differs from your "solution_answer", KEEP the printed value in "answer" (the disagreement is flagged for review). Set derived=true ONLY as a genuine last resort: after scanning the entire document you are certain the answer is printed NOWHERE — then set "answer" = "solution_answer". derived=true should be RARE; if you are setting it for most questions, you have not located the answer key yet — look again.',
    bilingual
      ? "LENGTH LIMIT: keep each worked solution concise — at most ~80 words / 6 lines. Stop once the key reasoning is clear; do NOT repeat steps, restate the question, or pad. The Hindi solution is just a translation of the same length."
      : "LENGTH LIMIT: keep each worked solution concise — at most ~80 words / 6 lines. Stop once the key reasoning is clear; do NOT repeat steps, restate the question, or pad.",
    LATEX_RULES,
    bilingual
      ? 'The LaTeX rule above applies ONLY to "solution"/"solution_hindi". The "answer" field is NOT math: emit a plain option label (A, B, C…) or a plain number with NO $ signs, backticks, or LaTeX — e.g. "B" or "42", never "$42$".'
      : 'The LaTeX rule above applies ONLY to "solution". The "answer" field is NOT math: emit a plain option label (A, B, C…) or a plain number with NO $ signs, backticks, or LaTeX — e.g. "B" or "42", never "$42$". Write everything in ENGLISH only — do NOT emit any Hindi.',
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
/**
 * Live progress events emitted during extraction so the UI can show what's
 * happening instead of one long spinner. `questions` events carry the freshly
 * extracted (pre-answer-key, pre-crop) questions of a batch as they land, so the
 * client can render them immediately; the route sends the fully enriched set in
 * its final `done` event.
 */
export type ImportEvent =
  | { t: "phase"; phase: "enumerate" | "extract" | "answers" | "verify" | "review"; total?: number }
  | { t: "questions"; items: ParsedQuestion[]; done: number; total: number }
  | { t: "usage"; rows: TokenUsageRow[] };

export async function extractQuestions(opts: {
  images?: UploadImage[];
  pdf?: UploadImage;
  sections: string[];
  qtype?: ImportQType;
  topics?: string[];
  topicsBySection?: Record<string, string[]>;
  /** Opt into Hindi translation of every question/option/solution (default OFF).
   *  When false the model is asked for — and the schema only allows — English. */
  bilingual?: boolean;
  /** Aborts the whole pipeline when the client disconnects (page refresh/close),
   *  so we stop firing Gemini calls instead of burning quota on a dead request. */
  signal?: AbortSignal;
  /** Optional live-progress sink. Called synchronously as phases/batches finish. */
  onEvent?: (ev: ImportEvent) => void;
}): Promise<ParsedQuestion[]> {
  // Vertex authenticates via ADC, not the API key — only require the key on the
  // Developer API path.
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!USE_VERTEX && !key) throw new Error("Missing GEMINI_API_KEY");
  const qtype = opts.qtype ?? "mixed";
  const bilingual = opts.bilingual ?? false;
  // Built once per run: drops the *_hindi fields entirely on the English-only path.
  const responseSchema = buildResponseSchema(bilingual);
  // Always log the backend so "it's still using the API key" is obvious at a glance.
  console.log(
    USE_VERTEX
      ? `[import] backend: Vertex AI (${process.env.VERTEX_LOCATION || "us-central1"}) — extract ${MODEL}, answers ${ANSWER_MODEL}`
      : `[import] backend: Developer API (GEMINI_API_KEY) — extract ${MODEL}, answers ${ANSWER_MODEL}  [set GEMINI_USE_VERTEX=1 + restart for Vertex]`
  );
  const signal = opts.signal;
  const emit = opts.onEvent ?? (() => {});

  // Resolve media once and reuse across passes. PDFs: the Developer API uploads
  // via the File API (handles big multi-page papers); Vertex has no File API, so
  // inline the PDF as base64 (fine for typical request sizes). Images: inline.
  //
  // IMPORTANT — media parts are placed BEFORE the text prompt in every call's
  // `parts` array. Gemini 2.5+ models have IMPLICIT context caching: when
  // consecutive requests share the same prefix (the media), the server caches it
  // automatically and charges the discounted "cached read" rate (~90% off input)
  // for all batches after the first. Keeping media first maximizes cache hits.
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
  emit({ t: "phase", phase: "enumerate" });
  try {
    const enumParts: Part[] = [...media, { text: buildEnumeratePrompt() }];
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
    emit({ t: "phase", phase: "extract", total: numbers.length });
    let extracted = 0;
    const batched = await mapLimit(groups, CONCURRENCY, async (group) => {
      if (signal?.aborted) return [] as ParsedQuestion[]; // client gone — don't fire
      const label = `pass-1 batch ${group[0]}–${group[group.length - 1]}`;
      try {
        const got = (await callResilient(key, label, responseSchema, [
          ...media,
          { text: buildPrompt(opts.sections, qtype, opts.topics, opts.topicsBySection, group, bilingual) },
        ], signal)) as ParsedQuestion[];
        // Stream this batch the moment it lands so the UI fills in live.
        extracted += got.length;
        emit({ t: "questions", items: got, done: extracted, total: numbers.length });
        return got;
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
    emit({ t: "phase", phase: "extract", total: numbers.length });
    questions = (await callResilient(key, "pass-1", responseSchema, [
      ...media,
      { text: buildPrompt(opts.sections, qtype, opts.topics, opts.topicsBySection, undefined, bilingual) },
    ], signal)) as ParsedQuestion[];
    emit({ t: "questions", items: questions, done: questions.length, total: questions.length });
  }
  // Client disconnected during pass 1 — stop now, skip the answer-key pass.
  if (signal?.aborted) {
    console.warn("[import] client disconnected — aborting before answer-key pass.");
    return questions;
  }
  console.log(`[import] pass 1 extracted ${questions.length} question(s)`);

  // Pass 2 — answer key (number → label [+ solution]) for questions whose answers
  // Pass 1 didn't capture. Now that Pass 1 actively hunts the answer key, this
  // fallback pass fires only for the stragglers — typically few or zero questions,
  // drastically reducing API calls vs the old approach where EVERY answer came here.
  const missing = questions.filter((q) =>
    q.question_type === "subjective" ? !q.solution : !q.correct_answer
  );
  const answered = questions.length - missing.length;
  console.log(`[import] pass 1 answered ${answered}/${questions.length} — ${missing.length} need answer-key pass`);
  if (missing.length) {
    emit({ t: "phase", phase: "answers", total: missing.length });
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
        return (await callResilient(key, label, buildAnswerKeySchema(bilingual), [
          ...media,
          { text: buildAnswerKeyPrompt(group, bilingual) },
        ], signal, ANSWER_MODEL)) as AnswerKeyEntry[];
      } catch (e) {
        console.error(`[import] ${label} gave up:`, e instanceof Error ? e.message : e);
        return [] as AnswerKeyEntry[];
      }
    });
    const answers = batched.flat();
    console.log(`[import] answer-key pass returned ${answers.length} answer(s) across ${groups.length} batch(es)`);
    mergeAnswers(questions, answers);
  }
  // Cross-check each objective answer against what its own solution concludes.
  flagSolutionMismatches(questions);
  return questions;
}

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } };

// ─── Token-usage accounting ──────────────────────────────────────────────────
// Every Gemini response carries usageMetadata (prompt / candidates / thoughts
// token counts). We accumulate it PER MODEL across one import run so the route can
// report roughly how many tokens — and at current prices, how much money — the
// extraction + verify/review passes burned, giving the admin a real cost feel.
// Module-level + reset per run: imports are super-admin and effectively serial, so
// cross-request mixing isn't a concern in practice.
export type TokenUsageRow = {
  model: string;
  calls: number;
  inputTokens: number; // total prompt tokens (INCLUDES the cached portion below)
  cachedTokens: number; // of inputTokens, the part served from the implicit cache (~90% off)
  outputTokens: number; // visible answer tokens (excludes thinking)
  thinkingTokens: number;
  costUsd: number | null; // rough estimate at the prices below; null if unpriced
};

// Implicit-cache reads bill at ~10% of the input rate (Gemini discounts a repeated
// prefix ~90%). The big media prefix re-sent on every batch lands here after call 1.
const CACHED_INPUT_FACTOR = 0.1;

// USD per 1M tokens (input, output). The output price ALSO bills thinking tokens.
// Verified against Google's published pricing Jun 2026; edit as prices change.
// A model not listed reports tokens only.
const TOKEN_PRICES: Record<string, { in: number; out: number }> = {
  "gemini-3-flash-preview": { in: 0.5, out: 3.0 },
  "gemini-3.5-flash": { in: 1.5, out: 9.0 },
  "gemini-3.1-flash-lite": { in: 0.25, out: 1.5 }, // was wrongly 0.1/0.4 — corrected
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-2.5-pro": { in: 1.25, out: 10.0 },
};

type UsageAcc = { calls: number; input: number; cached: number; output: number; thinking: number };
const _tokenUsage = new Map<string, UsageAcc>();

/** Clear the per-run accumulator — the route calls this before an import starts. */
export function resetTokenUsage(): void {
  _tokenUsage.clear();
}

/** Fold one response's usageMetadata into the per-model running totals. */
function recordUsage(modelId: string, res: any): void {
  const u = res?.response?.usageMetadata;
  if (!u) return;
  const acc = _tokenUsage.get(modelId) ?? { calls: 0, input: 0, cached: 0, output: 0, thinking: 0 };
  acc.calls += 1;
  acc.input += Number(u.promptTokenCount ?? 0);
  acc.cached += Number(u.cachedContentTokenCount ?? 0);
  acc.output += Number(u.candidatesTokenCount ?? 0);
  acc.thinking += Number(u.thoughtsTokenCount ?? 0);
  _tokenUsage.set(modelId, acc);
}

/** Snapshot the accumulated usage as priced rows (most expensive first). */
export function getTokenUsage(): TokenUsageRow[] {
  const rows: TokenUsageRow[] = [];
  for (const [model, a] of _tokenUsage) {
    const p = TOKEN_PRICES[model];
    // Split input into full-rate (uncached) and discounted cached reads.
    const uncached = Math.max(0, a.input - a.cached);
    const costUsd = p
      ? (uncached * p.in + a.cached * p.in * CACHED_INPUT_FACTOR + (a.output + a.thinking) * p.out) /
        1_000_000
      : null;
    rows.push({
      model,
      calls: a.calls,
      inputTokens: a.input,
      cachedTokens: a.cached,
      outputTokens: a.output,
      thinkingTokens: a.thinking,
      costUsd,
    });
  }
  return rows.sort((x, y) => (y.costUsd ?? 0) - (x.costUsd ?? 0));
}

/** Print the per-model token/cost breakdown to the server log. */
export function logTokenUsage(): void {
  for (const r of getTokenUsage()) {
    console.log(
      `[import] tokens · ${r.model}: ${r.calls} call(s) · ` +
        `in=${r.inputTokens} (cached ${r.cachedTokens}) out=${r.outputTokens} thinking=${r.thinkingTokens}` +
        (r.costUsd != null ? ` ≈ $${r.costUsd.toFixed(4)}` : " (unpriced)")
    );
  }
}

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
  signal?: AbortSignal,
  modelId: string = MODEL
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
    // Per-generation thinking config: thinkingLevel for Gemini 3, numeric budget
    // for Gemini 2.5 (Pro must think; flash/lite disable it). See thinkingConfigFor.
    thinkingConfig: thinkingConfigFor(modelId),
  };
  // Vertex (ADC, high quota) for local dev when GEMINI_USE_VERTEX=1; otherwise the
  // Developer API (GEMINI_API_KEY). Both SDKs share the generateContent shape and
  // the candidate/finishReason fields the parsing below reads.
  const model = USE_VERTEX
    ? vertexAI!.getGenerativeModel({
        model: modelId,
        // @ts-ignore — Vertex's generationConfig type differs slightly but accepts these at runtime.
        generationConfig,
      })
    : new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: modelId,
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
  recordUsage(modelId, res); // token accounting for the cost summary

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
      // The answer-key pass may be the one that spotted a figure in the solution.
      if (entry.solution_has_diagram && !q.solution_has_diagram) {
        q.solution_has_diagram = true;
        if (typeof entry.solution_page === "number") q.solution_page = entry.solution_page;
      }
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
    if (entry.solution_answer && !q.solution_answer)
      q.solution_answer = String(entry.solution_answer).replace(/[$`]/g, "").trim();
    if (entry.derived) q.answer_derived = true;
    if (entry.solution_has_diagram && !q.solution_has_diagram) {
      q.solution_has_diagram = true;
      if (typeof entry.solution_page === "number") q.solution_page = entry.solution_page;
    }
  });
}

/**
 * Internal consistency check: flag any objective question whose worked solution
 * concludes a DIFFERENT answer than the ticked correct_answer. This is a near-free,
 * high-precision error signal — the extractor contradicting itself usually means
 * either a misread printed key, a wrong key in the paper, or a bad answer pick.
 * Distinct from the (independent, different-model) verify pass: this compares the
 * extractor's OWN reasoning to its OWN ticked answer. Mutates in place.
 */
function flagSolutionMismatches(questions: ParsedQuestion[]): void {
  let flagged = 0;
  for (const q of questions) {
    if (q.question_type === "subjective") continue;
    if (!q.correct_answer || !q.solution_answer) continue;
    if (answersDisagree(q, String(q.solution_answer))) {
      q.solution_mismatch = true;
      flagged++;
    }
  }
  if (flagged) console.log(`[import] solution≠ticked: ${flagged} question(s) flagged for review`);
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

// ─── Pass 3: independent answer verification ─────────────────────────────────
// A SECOND, independent opinion on each objective answer. The verifier re-solves
// the question FROM SCRATCH — it is shown only the stem, the options, and (for a
// figure question) the cropped figure; it never sees the answer pass 1/2
// captured, nor the paper's printed answer key. So when its answer DISAGREES
// with the stored correct_answer, that's a real signal the stored answer may be
// wrong. Disagreements are flagged (answer_disputed) for the mandatory human
// review — they are NEVER auto-corrected. Mirrors the admin/ai-review blind solve.
//
// Use a DIFFERENT model than extraction (COACHING_IMPORT_VERIFY_MODEL) for a
// genuinely independent second opinion — Gemini 3 Flash. Stronger solver than the
// flash-lite extraction/answer passes (so its blind solve is a meaningful check)
// without Pro's thinking-token bill. Model choice is constrained: there is no
// plain "gemini-3.1-flash", and "gemini-3.5-flash" is priced like 2.5-pro — so the
// only cheap general Gemini-3 Flash is "gemini-3-flash-preview", which is served on
// BOTH the Developer API key and Vertex global. One id covers both transports; the
// trade-off is it's a preview (watch for deprecation). As a Gemini 3 model it runs
// via thinkingConfigFor with thinkingLevel (default LOW) — a numeric budget would
// throw. Bump COACHING_IMPORT_THINKING_LEVEL if the blind solve is too weak.
const VERIFY_MODEL = process.env.COACHING_IMPORT_VERIFY_MODEL || "gemini-3-flash-preview";

const VERIFY_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      answer: { type: SchemaType.STRING },
      confidence: { type: SchemaType.NUMBER, nullable: true },
    },
    required: ["answer"],
  },
};

function buildVerifyPrompt(q: ParsedQuestion): string {
  const opts =
    q.question_type === "mcq" && q.options?.length
      ? `Options:\n${q.options.map((o) => `${o.label}. ${o.text || "(see figure)"}`).join("\n")}`
      : "";
  return [
    "You are independently solving ONE exam question to VERIFY its answer. Decide the correct answer using ONLY your own reasoning.",
    "Do NOT assume any answer has been provided. Do NOT look for or rely on any printed answer key — solve the question yourself from first principles.",
    `Question type: ${q.question_type.toUpperCase()}`,
    `Question: ${q.question_text}`,
    opts,
    q.images?.length ? "The figure this question refers to is attached as an image." : "",
    'Return STRICT JSON: a one-element array [{"answer": string, "confidence": number}].',
    q.question_type === "mcq"
      ? 'For "answer" output ONLY the correct option label (A, B, C, D…) — a single letter, no text, no $, no punctuation.'
      : 'For "answer" output ONLY the numeric value — digits (and a sign/decimal if needed), no units, no $, no words.',
    '"confidence" is your 0..1 certainty in that answer.',
    "Output ONLY the JSON array, no prose.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Fetch a question's cropped figure(s) back as inline image parts for the blind
 *  solve. Best-effort — a figure that won't load just leaves the verifier with
 *  text only (it will likely abstain, which we treat as "no disagreement"). */
async function figureParts(q: ParsedQuestion): Promise<Part[]> {
  if (!q.images?.length) return [];
  const parts: Part[] = [];
  for (const img of q.images) {
    try {
      const res = await fetch(img.filename);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") || "image/png";
      parts.push({ inlineData: { mimeType: mime, data: buf.toString("base64") } });
    } catch {
      /* skip this image */
    }
  }
  return parts;
}

/** True when the independently-solved answer contradicts the stored one. Returns
 *  false when either side can't be resolved (don't flag on ambiguity). */
function answersDisagree(q: ParsedQuestion, aiRaw: string): boolean {
  const stored = (q.correct_answer ?? "").trim();
  if (!stored || !aiRaw.trim()) return false;
  if (q.question_type === "mcq") {
    const ai = resolveMcqLabel(aiRaw, q.options);
    const cur = resolveMcqLabel(stored, q.options);
    if (!ai || !cur) return false; // couldn't pin either to a label → don't flag
    return ai.toUpperCase() !== cur.toUpperCase();
  }
  // NAT — numeric compare within the question's tolerance.
  const a = Number((aiRaw.match(/-?\d+(?:\.\d+)?/) ?? [])[0]);
  const b = Number((stored.match(/-?\d+(?:\.\d+)?/) ?? [])[0]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return aiRaw.replace(/[$`\s]/g, "") !== stored.replace(/[$`\s]/g, "");
  }
  const tol = typeof q.nat_tolerance === "number" ? Math.abs(q.nat_tolerance) : 0;
  return Math.abs(a - b) > tol + 1e-9;
}

/** Resolve the verifier's raw answer to the value we show in the review badge. */
function verifyDisplay(q: ParsedQuestion, aiRaw: string): string {
  if (q.question_type === "mcq") return resolveMcqLabel(aiRaw, q.options) ?? aiRaw.trim().toUpperCase();
  return aiRaw.replace(/[$`]/g, "").trim();
}

/**
 * Cross-check every objective answer with an independent blind solve and mark
 * disagreements (q.answer_disputed + q.verify_answer) for the review UI. Mutates
 * the questions in place. Best-effort and concurrent; a failed check just leaves
 * a question unflagged. Subjective questions have no single answer to compare, so
 * they're skipped. Call AFTER cropping so figure questions carry their figure.
 */
export async function verifyAnswers(opts: {
  questions: ParsedQuestion[];
  signal?: AbortSignal;
  onEvent?: (ev: ImportEvent) => void;
}): Promise<void> {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!USE_VERTEX && !key) return;
  const { questions, signal } = opts;
  const emit = opts.onEvent ?? (() => {});

  // Only objective questions that actually have a captured answer can be cross-checked.
  const targets = questions.filter(
    (q) => (q.question_type === "mcq" || q.question_type === "nat") && !!q.correct_answer
  );
  if (!targets.length) return;
  console.log(`[import] verifying ${targets.length} objective answer(s) with ${VERIFY_MODEL}`);
  emit({ t: "phase", phase: "verify", total: targets.length });

  let disputes = 0;
  await mapLimit(targets, CONCURRENCY, async (q) => {
    if (signal?.aborted) return;
    const label = `verify q${q.number ?? "?"}`;
    try {
      const parts: Part[] = [...(await figureParts(q)), { text: buildVerifyPrompt(q) }];
      const got = (await callResilient(key, label, VERIFY_SCHEMA, parts, signal, VERIFY_MODEL)) as {
        answer?: string;
        confidence?: number;
      }[];
      const aiRaw = got[0]?.answer ? String(got[0].answer) : "";
      if (aiRaw && answersDisagree(q, aiRaw)) {
        q.answer_disputed = true;
        q.verify_answer = verifyDisplay(q, aiRaw);
        disputes++;
      }
    } catch (e) {
      // Verification is best-effort — a failed check leaves the question unflagged.
      console.warn(`[import] ${label} failed:`, e instanceof Error ? e.message : e);
    }
  });
  console.log(`[import] verification flagged ${disputes}/${targets.length} answer(s) as disputed`);
}

// ─── Subjective quality review ───────────────────────────────────────────────
// Subjective questions have no single answer to cross-check, so verifyAnswers
// skips them. Instead we review the QUALITY of the extracted model answer: a
// stronger model judges whether it is correct and complete enough to grade
// students against (the subjective grader compares student photos to it). Wrong
// or thin model answers are flagged (solution_review_flag + a short note) for the
// mandatory human review — never auto-edited. Best-effort and concurrent.
const SUBJECTIVE_REVIEW_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      ok: { type: SchemaType.BOOLEAN },
      issue: { type: SchemaType.STRING, nullable: true },
    },
    required: ["ok"],
  },
};

function buildSubjectiveReviewPrompt(q: ParsedQuestion): string {
  return [
    "You are reviewing the QUALITY of a model answer / marking scheme for ONE subjective exam question. This model answer is what students will be graded against, so it must be factually correct and cover the key points needed to mark.",
    `Question: ${q.question_text}`,
    q.images?.length ? "The figure this question refers to is attached as an image." : "",
    `Model answer to review:\n${(q.solution ?? "").trim() || "(empty)"}`,
    "Judge ONLY whether the model answer is factually correct and adequate to grade against. Do NOT rewrite or expand it; do NOT solve the question yourself unless needed to spot an error.",
    'Return STRICT JSON: a one-element array [{"ok": boolean, "issue": string|null}].',
    '"ok" = true if the model answer is correct and reasonably complete; false if it is wrong, empty, or missing key marking points.',
    'When "ok" is false, "issue" is a SHORT (≤15 words) reviewer-facing note on what is wrong or missing. When true, "issue" is null.',
    "Output ONLY the JSON array, no prose.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Quality-review every subjective model answer with an independent solve and mark
 * the weak/incorrect ones (q.solution_review_flag + q.solution_review_note) for
 * the review UI. Mutates the questions in place. Best-effort and concurrent; a
 * failed check just leaves a question unflagged. Objective questions are handled
 * by verifyAnswers instead. Call AFTER cropping so figure questions carry their figure.
 */
export async function reviewSubjectiveAnswers(opts: {
  questions: ParsedQuestion[];
  signal?: AbortSignal;
  onEvent?: (ev: ImportEvent) => void;
}): Promise<void> {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!USE_VERTEX && !key) return;
  const { questions, signal } = opts;
  const emit = opts.onEvent ?? (() => {});

  // Only subjective questions that actually have a model answer can be reviewed.
  const targets = questions.filter(
    (q) => q.question_type === "subjective" && !!String(q.solution ?? "").trim()
  );
  if (!targets.length) return;
  console.log(`[import] reviewing ${targets.length} subjective model answer(s) with ${VERIFY_MODEL}`);
  emit({ t: "phase", phase: "review", total: targets.length });

  let flagged = 0;
  await mapLimit(targets, CONCURRENCY, async (q) => {
    if (signal?.aborted) return;
    const label = `review q${q.number ?? "?"}`;
    try {
      const parts: Part[] = [...(await figureParts(q)), { text: buildSubjectiveReviewPrompt(q) }];
      const got = (await callResilient(
        key,
        label,
        SUBJECTIVE_REVIEW_SCHEMA,
        parts,
        signal,
        VERIFY_MODEL
      )) as { ok?: boolean; issue?: string | null }[];
      const r = got[0];
      if (r && r.ok === false) {
        q.solution_review_flag = true;
        q.solution_review_note =
          String(r.issue ?? "").trim() || "Model answer may be incorrect or incomplete.";
        flagged++;
      }
    } catch (e) {
      // Best-effort — a failed review leaves the model answer unflagged.
      console.warn(`[import] ${label} failed:`, e instanceof Error ? e.message : e);
    }
  });
  console.log(`[import] subjective review flagged ${flagged}/${targets.length} model answer(s)`);
}

// A rasterized PDF page source, shaped to avoid leaking mupdf types here (the
// renderer lives in lib/pdfRaster and is passed in by the route).
type PageRenderer = { render(pageIndex: number): { png: Buffer; width: number; height: number } | null };
export type CropContext = { images: UploadImage[]; renderer?: PageRenderer | null };

/** Upload a PNG crop to ImageKit; returns its URL (passed through by getImageUrl) or null. */
async function uploadCrop(png: Buffer, coachingId: string): Promise<string | null> {
  return uploadCoachingImage(png, coachingId, "png");
}

/**
 * Dedicated figure detection: send a SINGLE page image to Gemini and ask it to
 * locate the figure for a specific question. This is far more accurate than
 * asking for crop_box coordinates during the multi-page extraction pass because:
 *
 *  1. The model sees ONE page at a time (not a 30-page PDF), so spatial
 *     awareness is much sharper.
 *  2. The prompt focuses exclusively on object localization — no competing
 *     extraction / translation / section-classification work.
 *  3. We explicitly say "question N" so it knows exactly what to look for.
 *  4. thinkingBudget=0 is recommended for spatial tasks (per Google docs).
 *
 * Returns [ymin, xmin, ymax, xmax] normalized 0..1000, or null if no figure
 * is found or the call fails. Best-effort: never throws.
 */
// Returns a LIST of boxes (one per distinct figure) — a question can carry several
// diagrams, and the old single-box shape silently dropped all but one.
const FIGURE_DETECT_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    boxes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
      nullable: true,
    },
  },
  required: ["boxes"],
};

async function locateFigure(
  pageImage: Buffer,
  questionNumber: number | null | undefined,
  questionText: string,
  apiKey: string,
  signal?: AbortSignal,
  // What to box:
  //  - "tight":    the question's own figure, excluding stem/options/solution (default)
  //  - "whole":    the whole question + every answer-option PICTURE (options_are_figures)
  //  - "solution": the figure drawn inside this question's WORKED SOLUTION/explanation
  mode: "tight" | "whole" | "solution" = "tight"
): Promise<number[][] | null> {
  if (signal?.aborted) return null;
  const qRef = typeof questionNumber === "number"
    ? `question ${questionNumber}`
    : `the question whose text begins: "${questionText.slice(0, 120)}"`;
  const prompt = (mode === "whole"
    ? [
        `Look at this exam paper page. Draw ONE box around the ENTIRE ${qRef} — its stem/figure AND all of its answer-option pictures (A, B, C, D) — because the options are figures the student must see, so they MUST stay inside the box.`,
        "Return a JSON object {\"boxes\": [[ymin, xmin, ymax, xmax]]} with that SINGLE box, each value an integer 0..1000 normalized to the image dimensions.",
        "Include everything needed to answer: the question figure(s) AND every option picture. EXCLUDE only other questions and any printed answer key / solution.",
        "If the page does NOT contain this question, return {\"boxes\": []}.",
      ]
    : mode === "solution"
    ? [
        `Look at this exam paper page. Find EVERY drawn FIGURE (diagram, graph, chart, circuit, geometric construction, labelled sketch) that appears inside the WORKED SOLUTION / explanation for ${qRef} — NOT the figure in the question itself.`,
        "Return a JSON object {\"boxes\": [[ymin, xmin, ymax, xmax], ...]} with one inner array PER figure, each value an integer 0..1000 normalized to the image dimensions.",
        "Each box must be TIGHT around the solution's figure itself — EXCLUDE the surrounding solution text/equations, the question stem, and any other question.",
        "If the solution for this question has NO drawn figure on this page, return {\"boxes\": []}.",
      ]
    : [
        `Look at this exam paper page. Find EVERY drawn FIGURE (diagram, graph, chart, circuit, geometric shape, table-as-image) that belongs to ${qRef}. Most questions have ONE figure, but some have SEVERAL (e.g. two shapes to compare, a strip of diagrams) — return a separate box for EACH distinct figure.`,
        "Return a JSON object {\"boxes\": [[ymin, xmin, ymax, xmax], ...]} with one inner array PER figure, each value an integer 0..1000 normalized to the image dimensions.",
        "Each box must be TIGHT around its figure — include the complete drawing but EXCLUDE:",
        "  • The question stem text (already captured separately)",
        "  • Any printed solution / working / answer below or beside the figure",
        "  • Text answer options (A, B, C, D) unless the options ARE figures themselves",
        "If the page contains NO figure for this question, return {\"boxes\": []}.",
      ]
  ).join("\n");

  try {
    const parts: Part[] = [
      { inlineData: { mimeType: "image/png", data: pageImage.toString("base64") } },
      { text: prompt },
    ];

    // Use the dedicated FIGURE_MODEL (flash) for figure detection — a visual
    // localization task, not reasoning. thinkingConfigFor derives the right thinking
    // dialect from the model: thinkingLevel for Gemini 3, budget 0 for 2.5 flash, a
    // valid positive budget for a 2.5 Pro FIGURE_MODEL (which rejects 0).
    const generationConfig = {
      responseMimeType: "application/json" as const,
      responseSchema: FIGURE_DETECT_SCHEMA,
      maxOutputTokens: 256,
      temperature: 0.1,
      // Decoupled figure-only thinking level (G3 figure models). See FIGURE_THINKING_LEVEL.
      thinkingConfig: thinkingConfigFor(FIGURE_MODEL, FIGURE_THINKING_LEVEL),
    };
    const model = USE_VERTEX
      ? vertexAI!.getGenerativeModel({
          model: FIGURE_MODEL, // flash — cheap, fast, spatial
          // @ts-ignore
          generationConfig,
        })
      : new GoogleGenerativeAI(apiKey).getGenerativeModel({
          model: FIGURE_MODEL,
          // @ts-ignore
          generationConfig,
        });

    const res: any = USE_VERTEX
      // @ts-ignore
      ? await model.generateContent({ contents: [{ role: "user", parts }] })
      // @ts-ignore
      : await model.generateContent({ contents: [{ role: "user", parts }] }, { signal });
    recordUsage(FIGURE_MODEL, res); // token accounting for the cost summary

    let text = "";
    try {
      text = typeof res.response.text === "function" ? res.response.text() : "";
    } catch {
      text = "";
    }
    if (!text) {
      text = res.response.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p?.text ?? "").join("") ?? "";
    }
    text = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    if (!text) return null;

    const parsed = JSON.parse(text);
    // Accept the new {boxes:[[...]]} shape and, defensively, an old {box:[...]} one.
    const raw: unknown[] = Array.isArray(parsed?.boxes)
      ? parsed.boxes
      : Array.isArray(parsed?.box)
        ? [parsed.box]
        : [];
    const boxes = raw
      .filter((b): b is number[] => Array.isArray(b) && b.length === 4)
      .map((b) => b.map(Number))
      .filter((b) => b.every((n) => Number.isFinite(n) && n >= 0 && n <= 1000));
    return boxes.length ? boxes : null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Rate limited — wait and return null (don't block the import for a figure)
    if (/429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(msg)) {
      console.warn(`[import] figure detection rate-limited — skipping figure for ${qRef}`);
    } else {
      console.warn(`[import] figure detection failed for ${qRef}: ${msg.slice(0, 100)}`);
    }
    return null;
  }
}

/**
 * Capture a question's figure by sending the specific page to Gemini for
 * focused object detection. Steps:
 *  1. Rasterize the page (PDF) or grab the source image
 *  2. Send just that page image to Gemini with "find the figure for question N"
 *  3. Crop using the returned coordinates and upload
 *
 * Falls back to null (question imports without an image) on any failure.
 */
export async function cropQuestionImage(
  ctx: CropContext,
  q: ParsedQuestion,
  coachingId: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<StoredImage[] | null> {
  // Attempt a snapshot whenever the extractor signalled a figure in ANY way:
  // has_diagram ("a figure is present"), options_are_figures ("the choices are
  // pictures"), OR is_figure ("needs its figure to be answered"). flash-lite often
  // sets is_figure WITHOUT has_diagram, so gating on has_diagram alone silently
  // dropped those figures. Detection self-guards — locateFigure returns nothing on
  // a page with no real figure, and the >10px crop check rejects junk — and a
  // flagged question that yields no crop is surfaced for human review. So erring
  // toward attempting (recall) is the safe direction here.
  if (!q.has_diagram && !q.options_are_figures && !q.is_figure) return null;
  const key = apiKey ?? process.env.GEMINI_API_KEY ?? "";
  if (!USE_VERTEX && !key) return null;

  // Figure-option questions (mirror-image etc.) need the WHOLE question captured,
  // options included — pass "whole" so the box doesn't exclude the choices.
  const imgs = await detectAndCrop(ctx, q, coachingId, key, signal, q.options_are_figures ? "whole" : "tight", q.page);
  return imgs.length ? imgs : null;
}

/**
 * Locate + crop a question's figure(s) from a page, then upload each. Two pieces of
 * resilience over the old single-shot path:
 *  - Page tolerance: flash's `page` index for a PDF drifts by a page, and a wrong
 *    page is the difference between a clean crop and a silent miss — so when the
 *    primary page yields nothing we probe its neighbours (±1). Image uploads have a
 *    single source, so they only try the one candidate.
 *  - Multiple figures: crops EVERY box the detector returns (a question can carry
 *    several diagrams), instead of keeping just the first.
 * Returns the uploaded figures (possibly several), or [] if none located anywhere.
 */
async function detectAndCrop(
  ctx: CropContext,
  q: ParsedQuestion,
  coachingId: string,
  key: string,
  signal: AbortSignal | undefined,
  mode: "tight" | "whole" | "solution",
  preferredPage: number | null | undefined
): Promise<StoredImage[]> {
  const explanation = mode === "solution";
  const pages: (number | null | undefined)[] =
    ctx.renderer && typeof preferredPage === "number"
      ? [preferredPage, preferredPage - 1, preferredPage + 1]
      : [preferredPage];
  for (const page of pages) {
    if (typeof page === "number" && page < 0) continue;
    const src = await resolveSourcePage(ctx, page, q.source_image);
    if (!src) continue;
    const boxes = await locateFigure(src.png, q.number, q.question_text, key, signal, mode);
    if (!boxes) continue;
    // "whole" (figure-option) questions are captured as ONE image so the stem +
    // all four option pictures stay together; never fragment those into pieces.
    const use = mode === "whole" ? boxes.slice(0, 1) : boxes;
    const out: StoredImage[] = [];
    for (const box of use) {
      const url = await cropBoxAndUpload(src, box, coachingId);
      if (url) out.push({ index: out.length, filename: url, ...(explanation ? { type: "explanation" as const } : {}) });
    }
    if (out.length) return out; // found figures on this candidate page — done
  }
  return [];
}

/**
 * Capture a figure drawn inside the WORKED SOLUTION (not the question). Same
 * machinery as cropQuestionImage but located on the SOLUTION's page and tagged
 * type:"explanation" so it renders in the solution block, never with the question.
 * Returns one StoredImage or null (best-effort, like the question crop).
 */
export async function cropSolutionImage(
  ctx: CropContext,
  q: ParsedQuestion,
  coachingId: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<StoredImage[] | null> {
  if (!q.solution_has_diagram) return null;
  const key = apiKey ?? process.env.GEMINI_API_KEY ?? "";
  if (!USE_VERTEX && !key) return null;

  // Prefer the solution's own page; fall back to the question's page (the solution
  // is often printed right under the question). detectAndCrop also probes ±1.
  const page = typeof q.solution_page === "number" ? q.solution_page : q.page;
  const imgs = await detectAndCrop(ctx, q, coachingId, key, signal, "solution", page);
  return imgs.length ? imgs : null;
}

type PageSource = { png: Buffer; W: number; H: number };

/**
 * Resolve the source bitmap + its pixel dimensions for a figure crop: a rasterized
 * PDF page (when a renderer + page index are available), else the originating
 * uploaded image. Returns null if nothing usable.
 */
async function resolveSourcePage(
  ctx: CropContext,
  page: number | null | undefined,
  sourceImage: number | undefined
): Promise<PageSource | null> {
  let srcPng: Buffer | null = null;
  let W = 0;
  let H = 0;
  if (ctx.renderer && typeof page === "number") {
    const r = ctx.renderer.render(page);
    if (r) ({ png: srcPng, width: W, height: H } = r);
  }
  if (!srcPng && ctx.images.length) {
    const img = ctx.images[sourceImage ?? 0];
    if (img) {
      srcPng = Buffer.from(img.base64, "base64");
      const meta = await sharp(srcPng).metadata();
      W = meta.width ?? 0;
      H = meta.height ?? 0;
    }
  }
  if (!srcPng || W === 0 || H === 0) return null;
  return { png: srcPng, W, H };
}

/** Crop the normalized [ymin,xmin,ymax,xmax] (0..1000) box out of a page and upload it. */
async function cropBoxAndUpload(src: PageSource, box: number[], coachingId: string): Promise<string | null> {
  try {
    const [ymin, xmin, ymax, xmax] = box;
    const { W, H } = src;
    const pad = 0.015; // breathing room so figure edges aren't clipped
    const left = Math.max(0, Math.round((Math.min(xmin, xmax) / 1000 - pad) * W));
    const top = Math.max(0, Math.round((Math.min(ymin, ymax) / 1000 - pad) * H));
    const right = Math.min(W, Math.round((Math.max(xmin, xmax) / 1000 + pad) * W));
    const bottom = Math.min(H, Math.round((Math.max(ymin, ymax) / 1000 + pad) * H));
    const width = right - left;
    const height = bottom - top;
    if (width <= 10 || height <= 10) return null; // too small = bad detection

    const cropped = await sharp(src.png).extract({ left, top, width, height }).png().toBuffer();
    return await uploadCrop(cropped, coachingId);
  } catch {
    return null;
  }
}

