import "server-only";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema, type Schema } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import sharp from "sharp";
import { uploadCoachingImage } from "@/lib/coachingImageUpload";

// Gemini-powered bulk import: extract questions from photos / a PDF, translate to
// the other language, and crop any diagrams. The admin supplies Exam + Set (applied
// to every row) and we feed Gemini the exam's SECTION list so it classifies each
// question into one of those exact names (never invents one).

// Extraction model. On the Developer API default to gemini-3.1-flash-lite —
// fast/cheap and fine for pulling structured questions out of a paper. On Vertex
// default to gemini-2.5-flash for every pass (stronger reader, and flash-lite
// isn't reliably served there). COACHING_IMPORT_MODEL overrides either.
const MODEL = process.env.COACHING_IMPORT_MODEL || "gemini-3.1-flash-lite";
// The answer-key (Pass 2) pass both READS the printed answers and DERIVES/writes the
// worked solution — the latter is a reasoning task, so its model is now selectable per
// import (GENERATION_MODEL_OPTIONS — Gemini only, it must read the page; resolveGenerationModel).
// COACHING_IMPORT_ANSWER_MODEL still overrides the default.
// Figure detection is a pure spatial-localization task — a flash model with
// thinking OFF is ideal (and Google recommends thinkingBudget=0 for it). It must
// NOT inherit COACHING_IMPORT_MODEL: pointing it at Pro both wastes Pro on a
// non-reasoning task AND breaks it, because Pro rejects thinkingBudget:0 — every
// detect call would throw and crop 0 figures. So it gets its own flash default.
const FIGURE_MODEL = process.env.COACHING_IMPORT_FIGURE_MODEL || "gemini-3.1-flash-lite";
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

// Same curve, sized to the number of questions a SPECIFIC call must emit. The
// MAX_OUTPUT_TOKENS constant is sized for one BATCH_SIZE batch, so any call whose
// scope is wider (notably the un-batched fallback that extracts a WHOLE paper when
// the enumerate pass fails) must derive its own budget — otherwise it silently
// truncates at MAX_TOKENS and only the salvaged first few questions import.
const outputBudgetFor = (count: number) => Math.min(65536, 4000 + Math.max(1, count) * 3500);
// Ceiling used when the scope is unknown (enumerate failed → "extract everything").
const MAX_MODEL_OUTPUT_TOKENS = 65536;

// How many batches run at once. Defaults to 16 — with BATCH=1 this is what keeps
// a whole paper fast (16 single-question calls in flight) instead of crawling
// serially. Assumes a paid Developer tier or Vertex; the free 15-req/min cap will
// throttle this hard, so drop COACHING_IMPORT_CONCURRENCY there. Override via env.
const CONCURRENCY = Math.max(
  1,
  Number(process.env.COACHING_IMPORT_CONCURRENCY || 16)
);

// How many QUESTIONS are cropped at once (route's figure stage). Deliberately much
// lower than CONCURRENCY: one unit of work there is not one API call but up to SIX
// (locateFigure probes the flagged page ±1, for the question figure and again for a
// solution figure), so 16 in flight would burst ~96 vision requests. 4 keeps the
// peak request rate comparable to the other passes. Assumes a paid tier; drop it to
// 1–2 on the free tier, where the backoffs would make concurrency counterproductive.
export const FIGURE_CROP_CONCURRENCY = Math.max(
  1,
  Number(process.env.COACHING_IMPORT_CROP_CONCURRENCY || 4)
);
// Attempts per figure-detection call, including the first (see locateFigure).
const FIGURE_MAX_ATTEMPTS = Math.max(1, Number(process.env.COACHING_IMPORT_FIGURE_RETRIES || 3));

// Blind cross-check (generateComparisonSolutions) batch size. That pass ALWAYS runs
// and solves every TEXT question with V4 — historically one V4 call per question,
// which dominates the import's request count. Batching K text questions into one
// call cuts that count ~K×. Default 5. NOTE: solution length is no longer capped (a
// multi-part question must have every part worked), so K now scales an OPEN-ENDED
// output — and this pass's request duration tracks tokens generated. If batches start
// hitting COACHING_IMPORT_DEEPSEEK_TIMEOUT_MS, lower this before raising the timeout.
// Set to 1 to restore the old one-call-per-question behaviour. Only text questions are
// batched; figure-bearing ones stay per-call (their image must be attached individually).
const COMPARE_BATCH = Math.max(1, Number(process.env.COACHING_IMPORT_COMPARE_BATCH || 5));

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Bounded-concurrency map (no p-limit dep) — keeps results in input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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
  modelId: string = MODEL,
  maxTokens: number = MAX_OUTPUT_TOKENS
): Promise<unknown[]> {
  let lastErr: unknown;
  let tempIdx = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new Error("aborted: client disconnected");
    const temp = ESCALATING_TEMPS[Math.min(tempIdx, ESCALATING_TEMPS.length - 1)];
    try {
      return await callGeminiJsonArray(apiKey, schema, parts, temp, signal, modelId, maxTokens);
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
        console.warn(`[import] ${label} rate-limited (Developer free-tier 15/min) — waiting ${wait}s [attempt ${attempt}/${MAX_ATTEMPTS}]`);
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
  // Comparison mode (opt-in): a SECOND worked solution from a different model, shown
  // beside `solution` in review so the admin keeps the better one. Transit/review-only
  // — dropped before save (the chosen text lives in `solution`).
  solution_alt?: string | null; // the OTHER solution (flash-lite answer-key) — alternate to keep
  solution_alt_hindi?: string | null;
  solution_alt_model?: string; // label for the alternate's source
  blind_answer?: string; // the blind solver's OWN concluded answer — for the agreement badge
  // The blind cross-check already folded a result onto this question. Needed because
  // that pass runs in TWO phases (text-only during cropping, then post-crop) and a
  // question solved in the first must not be re-solved in the second — `apply()`
  // shifts solution → solution_alt, so a second application would overwrite the
  // Gemini answer-key solution with the blind model's own earlier output (and
  // mislabel it). `blind_answer` can't serve as this marker: it's only set for
  // mcq/nat, so every subjective question would be solved twice. Transit-only.
  blind_solved?: boolean;
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

// Board papers (CBSE especially) print internal choice as "(a) … OR (b) …", and
// long-answer questions as (i)/(ii)/(a)/(b) parts. A model asked for "the solution"
// answers the FIRST part and stops — which for a subjective question is what the AI
// grader later marks student photos against, so half the marking scheme goes missing.
// Applied to every prompt that writes a solution: extraction, answer key, and the
// blind cross-check (whose solution can REPLACE the recorded one).
const MULTIPART_RULE =
  'MULTI-PART AND "OR" QUESTIONS (CRITICAL): if the question has more than one part — labelled (a)/(b), (i)/(ii), or two alternatives separated by "OR" — the solution MUST answer EVERY part, each introduced by its printed label. NEVER answer only the first part, and NEVER pick between "OR" alternatives: an internal choice means the student may attempt either, so solve BOTH in full, one after the other. Any length guidance is PER PART, not for the whole answer.';

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
  bilingual = false,
  // Set only for a paper whose numbering RESTARTS per section: scopes this batch to
  // one section so `onlyNumbers` identifies exactly one question each. Also pins the
  // "section" field of every returned question, which keeps the label identical
  // across the enumerate/extract/answer passes (they have to join on it).
  onlySection?: string | null
): string {
  // When batching, restrict this call to a specific set of printed numbers so the
  // output stays under the token limit. The full document is still attached so
  // the model has the context it needs to read each question accurately.
  const numberFilter = onlyNumbers?.length
    ? onlySection
      ? `This paper RESTARTS its question numbering in each section, so the same printed number appears in more than one section. EXTRACT ONLY the questions printed under the section heading ${JSON.stringify(
          onlySection
        )} whose PRINTED number is one of: ${JSON.stringify(
          onlyNumbers
        )}. A question with a matching number in ANY OTHER section is NOT wanted — skip it entirely. Return exactly these questions, in ascending number order.`
      : `EXTRACT ONLY the questions whose PRINTED number is one of: ${JSON.stringify(
          onlyNumbers
        )}. Skip every other question entirely — do NOT include them. Return exactly these questions, in ascending number order.`
    : null;
  const sectionList = onlySection
    ? `Every question you return comes from section ${JSON.stringify(
        onlySection
      )} — set "section" to EXACTLY that string on all of them.`
    : sections.length
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
    MULTIPART_RULE,
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

// Pass 0: enumerate the printed question numbers. Tiny output so it never truncates
// even for a 100-question paper — gives us the ranges to batch the heavy extraction
// passes over.
//
// Each entry carries its SECTION heading because a printed number is NOT a unique id:
// papers that restart numbering per section (Section A 1–10, then Section B 1–55) reuse
// every number in 1–10. Enumerating bare integers made those collide — the dedupe below
// collapsed 65 questions to 55 unique numbers, and the number-filtered extraction batch
// then returned whichever of the two questions numbered 7 the model felt like, which is
// what "randomly leaving questions out" actually was. (section, number) is unique.
// Bare integers, deliberately. Asking for {number, section} objects here made the
// model return one or two entries for a 65-question paper — the heavier per-element
// shape is enough to make a lite model summarize instead of enumerate, and every
// downstream count then collapsed. A flat integer list is the shape this pass has
// always been reliable at, so the section labels come from the separate (and much
// smaller) SECTION_SCHEMA call below, and only for papers that actually need them.
const ENUM_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: { type: SchemaType.INTEGER },
};

function buildEnumeratePrompt(insist = false): string {
  return [
    ...(insist
      ? [
          "Your previous attempt returned only one or two numbers for a full question paper — that was wrong. Go through the document page by page, from the first page to the last, and list EVERY question you find. Do not stop after the first page.",
        ]
      : []),
    "Look at the attached exam paper and list the PRINTED number of EVERY question in it.",
    "List them in DOCUMENT ORDER — the order they physically appear, top to bottom. Do NOT sort them and do NOT remove repeats.",
    "IMPORTANT: many papers RESTART numbering at 1 in each section (e.g. Section A is 1-10, then Section B starts again at 1). If that happens, list the restarted numbers again — 1,2,…,10,1,2,3,… — never merge or skip a question because its number already appeared.",
    "Count questions only — ignore the answer key / solutions section so each question is counted once.",
    "Return STRICT JSON: an array of integers, e.g. [1,2,3,4,5]. If a question has no printed number, use its 1-based position. Output ONLY the array, no prose.",
  ].join("\n");
}

// Second, tiny call — fired ONLY when the integer list above restarts, to name the
// sections so a batch can be scoped to one. Output is a handful of strings, which
// keeps it well clear of the "model summarizes instead of enumerating" failure.
const SECTION_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: { type: SchemaType.STRING },
};

function buildSectionNamesPrompt(count: number): string {
  return [
    `This exam paper is split into ${count} groups of questions, each of which restarts its numbering at 1.`,
    "List the SECTION HEADING of each group, in document order.",
    'Use the heading VERBATIM as printed (e.g. "Section A", "Part II", "Physics").',
    `Return STRICT JSON: an array of exactly ${count} strings. Output ONLY the array, no prose.`,
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

// Repair pass: re-read the answer CHOICES for MCQs that came back without them.
// Pass 1 sometimes folds the choices into question_text or just omits them, and the
// save-time validator rejects an mcq with <2 options ("mcq needs at least 2
// options") — so without this the admin has to retype them by hand in review.
function buildOptionsSchema(bilingual: boolean): ResponseSchema {
  return {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        number: { type: SchemaType.INTEGER },
        options: { type: SchemaType.ARRAY, items: OPTION_SCHEMA },
        ...(bilingual ? { options_hindi: { type: SchemaType.ARRAY, items: OPTION_SCHEMA, nullable: true } } : {}),
        options_are_figures: { type: SchemaType.BOOLEAN, nullable: true },
      },
      required: ["number", "options"],
    },
  };
}

function buildOptionsPrompt(numbers: number[], bilingual: boolean, section?: string | null): string {
  return [
    `The attached exam paper contains multiple-choice questions whose ANSWER CHOICES were missed. Read the choices for ${
      section ? `the questions in section ${JSON.stringify(section)} numbered ` : "question numbers "
    }${JSON.stringify(numbers)}.`,
    "Return the choices EXACTLY as printed, in the order shown, with their printed labels (A, B, C, D… or i, ii, iii… — whatever the paper uses).",
    "Do NOT invent, reword, reorder or renumber a choice. Do NOT solve the questions. Copy only what is printed.",
    'If a question\'s choices are PICTURES rather than text (mirror-image, "which figure comes next"), still return one entry per choice with its label and text "", and set "options_are_figures" to true.',
    LATEX_RULES,
    bilingual ? 'Also fill "options_hindi" with the same labels/order if a Hindi version of the choices is printed; otherwise omit it.' : "",
    `Return STRICT JSON: an array with one element per question, each {"number": integer, "options": [{"label": string, "text": string}]${
      bilingual ? ', "options_hindi": [{"label": string, "text": string}]' : ""
    }, "options_are_figures": boolean}.`,
    "Output ONLY the JSON array, no prose.",
  ]
    .filter(Boolean)
    .join("\n");
}

type OptionsEntry = {
  number: number;
  options?: { label: string; text: string }[];
  options_hindi?: { label: string; text: string }[];
  options_are_figures?: boolean | null;
};

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

function buildAnswerKeyPrompt(
  onlyNumbers?: number[],
  bilingual = false,
  // Set for a paper that restarts numbering per section — without it, "the answer to
  // Q7" is ambiguous and the wrong section's answer gets merged onto the question.
  onlySection?: string | null
): string {
  const scope = onlyNumbers?.length
    ? onlySection
      ? `This paper RESTARTS its question numbering in each section. Provide the correct answer + worked solution ONLY for questions in section ${JSON.stringify(
          onlySection
        )} with these printed numbers: ${JSON.stringify(
          onlyNumbers
        )}. Answers belonging to a same-numbered question in a DIFFERENT section are wrong here — make sure the answer you read is the one for section ${JSON.stringify(
          onlySection
        )}. Return exactly one entry per number, in ascending order — skip all other questions.`
      : `Provide the correct answer + worked solution ONLY for these question numbers: ${JSON.stringify(
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
    // No word cap here on purpose. It used to read "at most ~80 words / 6 lines",
    // which contradicted the two instructions that matter most: the FULL model answer
    // for a subjective question (below), and every part of a multi-part / "OR"
    // question (MULTIPART_RULE). A 5-mark board answer does not fit in 80 words, and
    // the cap was making the model stop after part (a). Completeness wins; what's left
    // is the anti-padding guidance, which never conflicted with either.
    bilingual
      ? "Make each worked solution as long as the question needs and no longer — do NOT repeat steps, restate the question, or pad. The Hindi solution is a translation of the same content."
      : "Make each worked solution as long as the question needs and no longer — do NOT repeat steps, restate the question, or pad.",
    LATEX_RULES,
    MULTIPART_RULE,
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
  | { t: "phase"; phase: "enumerate" | "extract" | "answers" | "verify" | "review" | "compare"; total?: number }
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
  /** Model for the Pass-2 answer-key pass (derive answers + write worked solutions).
   *  Validated against GENERATION_MODEL_OPTIONS; defaults to gemini-3.5-flash-lite (resolveGenerationModel). */
  answerModel?: string | null;
  /** Aborts the whole pipeline when the client disconnects (page refresh/close),
   *  so we stop firing Gemini calls instead of burning quota on a dead request. */
  signal?: AbortSignal;
  /** Optional live-progress sink. Called synchronously as phases/batches finish. */
  onEvent?: (ev: ImportEvent) => void;
}): Promise<ParsedQuestion[]> {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const qtype = opts.qtype ?? "mixed";
  const bilingual = opts.bilingual ?? false;
  // Pass-2 answer/solution model — Gemini only (it reads the key off the page image).
  // Pass 1 (extraction) always stays on Gemini (MODEL) too.
  const answerModel = resolveGenerationModel(opts.answerModel);
  // Built once per run: drops the *_hindi fields entirely on the English-only path.
  const responseSchema = buildResponseSchema(bilingual);
  console.log(`[import] backend: Developer API (GEMINI_API_KEY) — extract ${MODEL}, answers ${answerModel}`);
  const signal = opts.signal;
  const emit = opts.onEvent ?? (() => {});

  // Resolve media once and reuse across passes.
  const media: Part[] = [];
  if (opts.pdf) {
    media.push({ fileData: await uploadPdf(opts.pdf, key) });
  }
  for (const img of opts.images ?? []) {
    media.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  // Pass 0 — enumerate the printed question numbers so the heavy passes can be
  // batched under the output-token limit. Counts questions only (ignores the
  // answer key) so a big solutions section can't inflate the count. Best-effort:
  // on failure we fall back to a single, un-batched extraction call below.
  let numbers: number[] = [];
  // Section-scoped batches, set ONLY when the paper restarts numbering per section.
  // Empty otherwise, so every other paper takes exactly the code path it always has.
  let sectionBatches: { section: string; numbers: number[] }[] = [];
  const sectionOrder = new Map<string, number>();
  emit({ t: "phase", phase: "enumerate" });
  try {
    // A bulk import of one or two questions is not a thing anyone does, so a tiny
    // count means the model summarized instead of enumerating — and since every batch
    // target downstream is derived from this list, that silently truncates the whole
    // import. One cheap retry (integers only; the media prefix is cached) is worth it.
    let seq: number[] = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      const enumParts: Part[] = [...media, { text: buildEnumeratePrompt(attempt === 2) }];
      const label = attempt === 1 ? "enumerate" : "enumerate-retry";
      const raw = await callResilient(key, label, ENUM_SCHEMA, enumParts, signal);
      const got = raw.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      if (got.length > seq.length) seq = got;
      if (seq.length > 2) break;
      if (attempt === 1) {
        console.warn(
          `[import] ⚠ enumerate returned only ${got.length} number(s) — that is almost certainly a bad read of the paper. Retrying once.`
        );
      } else {
        console.warn(
          `[import] ⚠ enumerate still returned ${seq.length} number(s) after a retry — falling back to one un-batched extraction of the whole paper.`
        );
      }
    }

    // Split at every DECREASE: numbering that goes …9,10,1,2… restarted, which is the
    // whole signal. Deriving it from the sequence means the reliable integer pass
    // detects the restart on its own — no section labels needed to find it, only to
    // batch it. A paper with no restart yields exactly one segment.
    const segments: number[][] = [];
    for (const n of seq) {
      if (!segments.length || n <= segments[segments.length - 1].at(-1)!) segments.push([n]);
      else segments[segments.length - 1].push(n);
    }
    // A stutter (…7,7,8… — the model listing a number twice) opens a spurious segment
    // that then keeps climbing, so length alone can't tell it from a restart. What
    // does: a stutter segment REPEATS the previous segment's last number, whereas a
    // real restart drops back to 1. Fold the former back in, minus the duplicate.
    const merged: number[][] = [];
    for (const s of segments) {
      const prev = merged[merged.length - 1];
      if (prev && s[0] === prev.at(-1)) prev.push(...s.slice(1));
      else merged.push([...s]);
    }

    if (merged.length > 1) {
      // Name the segments so each batch can be scoped to one section.
      let names: string[] = [];
      try {
        names = (
          await callResilient(key, "sections", SECTION_SCHEMA, [
            ...media,
            { text: buildSectionNamesPrompt(merged.length) },
          ], signal)
        )
          .map((s) => String(s ?? "").trim())
          .filter(Boolean);
      } catch (e) {
        console.error("[import] section-name pass failed:", e instanceof Error ? e.message : e);
      }
      // Distinct name per segment or the scoping is a lie — fall back to one
      // un-batched call (document order, no number filter) rather than drop questions.
      const usable = names.length === merged.length && new Set(names).size === merged.length;
      if (usable) {
        merged.forEach((nums, i) => sectionOrder.set(names[i], i));
        sectionBatches = merged.map((nums, i) => ({
          section: names[i],
          numbers: [...new Set(nums)].sort((a, b) => a - b),
        }));
        numbers = sectionBatches.flatMap((b) => b.numbers);
        console.log(
          `[import] enumerate pass: ${numbers.length} question(s) across ${sectionBatches.length} section(s) with RESTARTING numbering — ` +
            sectionBatches.map((b) => `"${b.section}"×${b.numbers.length}`).join(", ")
        );
      } else {
        // Names unusable (wrong count, or repeated so they can't identify a section).
        // Fall back to plain number-range batching — the behaviour before sections
        // existed. It can miss a question that SHARES a printed number with another
        // section, but that beats the alternative: one un-batched whole-paper call is
        // measurably unreliable on long papers (observed returning a single question),
        // so losing some questions must never be "fixed" by risking all of them.
        const distinct = new Set(names).size;
        console.warn(
          `[import] ⚠ numbering restarts (${merged.length} segments of ${merged
            .map((s) => s.length)
            .join("+")}) but the section-name pass returned ${names.length} name(s), only ${distinct} distinct — can't scope a batch to a section. Batching by number range instead; questions sharing a printed number across sections may be missed.`
        );
        numbers = [...new Set(seq)].sort((a, b) => a - b);
      }
    } else {
      numbers = [...new Set(seq)].sort((a, b) => a - b);
      console.log(
        `[import] enumerate pass: ${numbers.length} question number(s)` +
          (numbers.length && numbers.length <= 5 ? ` — [${numbers.join(", ")}]` : "")
      );
    }
  } catch (e) {
    console.error("[import] enumerate pass failed, falling back to single call:", e instanceof Error ? e.message : e);
  }

  // Pass 1 — questions + options + printed number. Batch by number range when the
  // paper is long enough that one call would truncate; otherwise a single call.
  let questions: ParsedQuestion[];
  if (numbers.length > BATCH_SIZE) {
    // One flat list of batches. Restart papers chunk WITHIN each section so a batch
    // never spans two sections — that's what makes its number filter unambiguous.
    const groups: { section: string | null; numbers: number[] }[] = sectionBatches.length
      ? sectionBatches.flatMap((b) =>
          chunk(b.numbers, BATCH_SIZE).map((numbers) => ({ section: b.section, numbers }))
        )
      : chunk(numbers, BATCH_SIZE).map((numbers) => ({ section: null, numbers }));
    console.log(`[import] extracting ${numbers.length} questions in ${groups.length} batch(es) of ${BATCH_SIZE}, ${CONCURRENCY} at a time`);
    emit({ t: "phase", phase: "extract", total: numbers.length });
    let extracted = 0;
    const batched = await mapLimit(groups, CONCURRENCY, async (g) => {
      if (signal?.aborted) return [] as ParsedQuestion[]; // client gone — don't fire
      const group = g.numbers;
      const label = `pass-1 batch ${g.section ? `${g.section} ` : ""}${group[0]}–${group[group.length - 1]}`;
      try {
        const got = (await callResilient(key, label, responseSchema, [
          ...media,
          { text: buildPrompt(opts.sections, qtype, opts.topics, opts.topicsBySection, group, bilingual, g.section) },
        ], signal)) as ParsedQuestion[];
        // The batch prompt pins the section, but a model can still omit it — stamp it
        // so the answer-key join below always has the label it needs.
        if (g.section) for (const q of got) if (!q.section) q.section = g.section;
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
    // Parallel batches return out of order — sort the flattened list by number, and
    // by section first when numbering restarts (else Section B's Q1 would sort above
    // Section A's Q2 and the paper would come back interleaved).
    questions = batched.flat().sort((a, b) => {
      if (sectionBatches.length) {
        const sa = sectionOrder.get(a.section ?? "") ?? Number.MAX_SAFE_INTEGER;
        const sb = sectionOrder.get(b.section ?? "") ?? Number.MAX_SAFE_INTEGER;
        if (sa !== sb) return sa - sb;
      }
      return (a.number ?? 0) - (b.number ?? 0);
    });
  } else {
    // Un-batched single call. It carries NO number filter (see the `undefined` below),
    // so its scope is the WHOLE paper — ALWAYS, not just when the enumerate pass
    // failed. Sizing the budget to the enumerate count was therefore wrong whenever
    // that count was short: a 65-question paper whose enumerate returned 1 number got
    // 4000+3500=7500 output tokens, blew MAX_TOKENS mid-array, and imported the single
    // question salvaged from the truncated JSON. Budget is a ceiling, not a spend —
    // you're billed for tokens produced — so give this call the model's maximum.
    const budget = MAX_MODEL_OUTPUT_TOKENS;
    if (numbers.length) {
      console.log(
        `[import] ${numbers.length} enumerated question(s) ≤ batch size ${BATCH_SIZE} — extracting the whole paper in ONE call at the ${budget}-token ceiling.`
      );
    } else {
      console.warn(
        `[import] ⚠ no question numbers enumerated — extracting the whole paper in ONE call at the ${budget}-token ceiling. A very long paper may still truncate; re-run so the enumerate pass can batch it.`
      );
    }
    emit({ t: "phase", phase: "extract", total: numbers.length });
    questions = (await callResilient(key, "pass-1", responseSchema, [
      ...media,
      { text: buildPrompt(opts.sections, qtype, opts.topics, opts.topicsBySection, undefined, bilingual) },
    ], signal, MODEL, budget)) as ParsedQuestion[];
    emit({ t: "questions", items: questions, done: questions.length, total: questions.length });
  }
  // Client disconnected during pass 1 — stop now, skip the answer-key pass.
  if (signal?.aborted) {
    console.warn("[import] client disconnected — aborting before answer-key pass.");
    return questions;
  }
  console.log(`[import] pass 1 extracted ${questions.length} question(s)`);
  // A short extraction is the failure mode that hurts most, because the import still
  // "succeeds" — you only notice by counting rows in the review UI. Two causes worth
  // separating in the log: the enumerate pass under-counted (extraction matched a
  // wrong target), or extraction lost questions the enumerate pass did find.
  if (numbers.length && questions.length < numbers.length) {
    console.warn(
      `[import] ⚠ pass 1 returned ${questions.length} of the ${numbers.length} enumerated question(s) — ${numbers.length - questions.length} missing. Check the batch logs above for a batch that gave up or truncated (MAX_TOKENS).`
    );
  }

  // Options repair — re-read the choices for any MCQ that arrived without them.
  // Runs BEFORE the answer-key pass on purpose: correct_answer is canonicalized
  // against the option labels (resolveMcqLabel), so an mcq with no options can't
  // have its answer resolved either. Best-effort; a failure just leaves the
  // question for the human reviewer, exactly as before.
  const optionless = questions
    .map((_, i) => i)
    .filter((i) => questions[i].question_type === "mcq" && (questions[i].options?.length ?? 0) < 2);
  if (optionless.length && !signal?.aborted) {
    console.warn(
      `[import] ⚠ ${optionless.length} MCQ(s) came back without answer choices — re-reading them from the paper`
    );
    // Same section-scoping rule as the answer-key pass: a printed number only
    // identifies one question within its own section.
    const optBuckets: { section: string | null; idx: number[] }[] = sectionBatches.length
      ? [...new Set(optionless.map((i) => questions[i].section ?? ""))].map((section) => ({
          section: section || null,
          idx: optionless.filter((i) => (questions[i].section ?? "") === section),
        }))
      : [{ section: null, idx: optionless }];
    const optGroups = optBuckets.flatMap((b) =>
      chunk(
        [...new Set(b.idx.map((i) => questions[i].number).filter((n): n is number => typeof n === "number"))],
        BATCH_SIZE
      ).map((nums) => ({ section: b.section, numbers: nums, idx: new Set(b.idx) }))
    );
    const optResults = await mapLimit(optGroups, CONCURRENCY, async (g) => {
      if (signal?.aborted) return { g, entries: [] as OptionsEntry[] };
      const label = `options batch ${g.section ? `${g.section} ` : ""}${g.numbers[0]}–${g.numbers[g.numbers.length - 1]}`;
      try {
        const entries = (await callResilient(key, label, buildOptionsSchema(bilingual), [
          ...media,
          { text: buildOptionsPrompt(g.numbers, bilingual, g.section) },
        ], signal, MODEL, outputBudgetFor(g.numbers.length))) as OptionsEntry[];
        return { g, entries };
      } catch (e) {
        console.error(`[import] ${label} gave up:`, e instanceof Error ? e.message : e);
        return { g, entries: [] as OptionsEntry[] };
      }
    });
    let repaired = 0;
    for (const { g, entries } of optResults) {
      const byNumber = new Map<number, OptionsEntry>();
      for (const e of entries) {
        const n = Number(e?.number);
        if (Number.isFinite(n) && (e.options?.length ?? 0) >= 2) byNumber.set(n, e);
      }
      for (const i of g.idx) {
        const q = questions[i];
        if ((q.options?.length ?? 0) >= 2) continue; // already fixed by another batch
        const entry = typeof q.number === "number" ? byNumber.get(q.number) : undefined;
        if (!entry) continue;
        q.options = entry.options;
        if (bilingual && entry.options_hindi?.length) q.options_hindi = entry.options_hindi;
        // Picture choices carry empty text legitimately — flag so the figure step
        // captures the whole question as one image instead of leaving blank options.
        if (entry.options_are_figures) {
          q.options_are_figures = true;
          q.has_diagram = true;
        }
        repaired++;
      }
    }
    console.log(`[import] options repair: recovered choices for ${repaired}/${optionless.length} MCQ(s)`);
  }

  // Pass 2 — answer key (number → label [+ solution]) for questions whose answers
  // Pass 1 didn't capture. Now that Pass 1 actively hunts the answer key, this
  // fallback pass fires only for the stragglers — typically few or zero questions,
  // drastically reducing API calls vs the old approach where EVERY answer came here.
  // Join keys must be derived ONCE, from the FULL questions array, and reused by
  // both the request and the merge — see buildJoinKeys.
  const joinKeys = buildJoinKeys(questions);
  const missingIdx = questions
    .map((_, i) => i)
    .filter((i) => {
      const q = questions[i];
      return q.question_type === "subjective" ? !q.solution : !q.correct_answer;
    });
  const answered = questions.length - missingIdx.length;
  console.log(`[import] pass 1 answered ${answered}/${questions.length} — ${missingIdx.length} need answer-key pass`);
  // A question with no printed number whose position collides with another
  // question's printed number has no safe join key — asking for it would risk
  // merging the wrong answer onto it, so it's left to the blind cross-check.
  const askable = missingIdx.filter((i) => joinKeys[i] != null);
  if (askable.length < missingIdx.length) {
    console.warn(
      `[import] ⚠ ${missingIdx.length - askable.length} unnumbered question(s) skipped in the answer-key pass — no collision-free join key`
    );
  }
  if (askable.length) {
    emit({ t: "phase", phase: "answers", total: askable.length });
    // Restart papers ask (and merge) one section at a time: a batch of bare numbers
    // spanning two sections would pull whichever Q7 answer the model saw first and
    // merge it onto both. Every other paper keeps the single global group it had.
    const buckets: { section: string | null; idx: number[] }[] = sectionBatches.length
      ? [...new Set(askable.map((i) => questions[i].section ?? ""))].map((section) => ({
          section: section || null,
          idx: askable.filter((i) => (questions[i].section ?? "") === section),
        }))
      : [{ section: null, idx: askable }];
    const groups = buckets.flatMap((b) =>
      chunk([...new Set(b.idx.map((i) => joinKeys[i]!))], BATCH_SIZE).map((numbers) => ({
        section: b.section,
        numbers,
        // Merge scope: only this section's questions can receive these answers.
        idx: new Set(b.idx),
      }))
    );
    const batched = await mapLimit(groups, CONCURRENCY, async (g) => {
      if (signal?.aborted) return { g, answers: [] as AnswerKeyEntry[] }; // client gone
      const group = g.numbers;
      const label = `answer-key batch ${g.section ? `${g.section} ` : ""}${group[0]}–${group[group.length - 1]}`;
      try {
        // Routed by model id: DeepSeek (V4) via the OpenAI-compatible client,
        // Gemini via callResilient. The budget is sized to THIS group so a batch of
        // worked solutions isn't truncated (the 1024 verify default would be).
        const answers = (await callModel(key, label, buildAnswerKeySchema(bilingual), [
          ...media,
          { text: buildAnswerKeyPrompt(group, bilingual, g.section) },
        ], answerModel, signal, outputBudgetFor(group.length))) as AnswerKeyEntry[];
        return { g, answers };
      } catch (e) {
        console.error(`[import] ${label} gave up:`, e instanceof Error ? e.message : e);
        return { g, answers: [] as AnswerKeyEntry[] };
      }
    });
    const total = batched.reduce((n, b) => n + b.answers.length, 0);
    console.log(`[import] answer-key pass returned ${total} answer(s) across ${groups.length} batch(es)`);
    for (const b of batched) {
      mergeAnswers(questions, b.answers, joinKeys, sectionBatches.length ? b.g.idx : undefined);
    }
  }
  // Cross-check each objective answer against what its own solution concludes.
  flagSolutionMismatches(questions);
  // Canonicalize each MCQ's correct_answer to its real option label. The model
  // sometimes returns the answer positionally ("1") or wrapped ("(A)", "A.") while
  // the options are labelled A/B/C/D — the review UI's radio compares label STRICTLY,
  // so a non-canonical value leaves NO option selected (the "bullet" never shows),
  // and the saved answer wouldn't match a label either. Resolve in place; leave it
  // untouched if it can't be pinned to an option (don't destroy a raw value).
  for (const q of questions) {
    if (q.question_type === "mcq" && q.correct_answer) {
      const label = resolveMcqLabel(q.correct_answer, q.options);
      if (label) q.correct_answer = label;
    }
  }
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
  // Flash-Lite bills ALL input modalities (text/image/video/audio) at the one rate,
  // so a page-image-heavy import costs the same per token as plain text. Its cached
  // input rate is $0.03/1M — exactly the 10% CACHED_INPUT_FACTOR above.
  "gemini-3.5-flash-lite": { in: 0.3, out: 2.5 },
  "gemini-3.1-flash-lite": { in: 0.25, out: 1.5 }, // was wrongly 0.1/0.4 — corrected
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-2.5-pro": { in: 1.25, out: 10.0 },
  // DeepSeek V4 (post-promo steady-state, Jun 2026). Cheap output is why V4 is
  // a good fit for the reasoning-heavy verify + answer/solution generation passes;
  // Flash at ~1/3 of Pro's rate is why the bulk blind pass defaults to it.
  // Keyed by the explicit V4 model id. NOTE: the legacy `deepseek-chat` alias maps to
  // V4 FLASH (cheaper/lighter) and is being retired 2026-07-24 — so we pass
  // `deepseek-v4-pro` explicitly to actually get the Pro model. Cache hits and
  // reasoning tokens ARE modelled — see recordDeepSeekUsage.
  "deepseek-v4-pro": { in: 0.435, out: 0.87 },
  "deepseek-v4-flash": { in: 0.14, out: 0.28 },
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
  modelId: string = MODEL,
  maxTokens: number = MAX_OUTPUT_TOKENS
): Promise<unknown[]> {
  if (signal?.aborted) throw new Error("aborted: client disconnected");
  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: schema,
    maxOutputTokens: maxTokens,
    // NOT 0: greedy decoding (temp 0) makes the model fall into repetition loops
    // that fill the whole token budget and trip a bogus "output limit" error.
    // callResilient raises this further if a loop still slips through.
    temperature,
    // Per-generation thinking config: thinkingLevel for Gemini 3, numeric budget
    // for Gemini 2.5 (Pro must think; flash/lite disable it). See thinkingConfigFor.
    thinkingConfig: thinkingConfigFor(modelId),
  };
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelId,
    // @ts-ignore — thinkingConfig isn't in the Developer SDK's type yet.
    generationConfig,
  });

  let res: any;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await model.generateContent({ contents: [{ role: "user", parts }] }, { signal });
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
 * The key each question is requested/merged under in the answer-key pass: its
 * PRINTED number, else its 1-based position in the FULL questions array. Returns
 * null when that positional fallback would collide with some other question's
 * printed number — such a question is unjoinable, and merging on the collision
 * would silently write a DIFFERENT question's answer (and solution) onto it.
 *
 * Deriving this in one place is the point: the request previously keyed off the
 * index within the `missing` SUBSET while the merge keyed off the index in the full
 * array, so the two disagreed for every unnumbered question whenever some questions
 * already had answers.
 */
function buildJoinKeys(questions: ParsedQuestion[]): (number | null)[] {
  const printed = new Set(
    questions.map((q) => q.number).filter((n): n is number => typeof n === "number")
  );
  return questions.map((q, i) => {
    if (typeof q.number === "number") return q.number;
    const positional = i + 1;
    return printed.has(positional) ? null : positional;
  });
}

/**
 * Fold answer-key entries into the questions, matching on the shared join key
 * (see buildJoinKeys). Only fills answers/solutions that pass 1 left empty.
 */
function mergeAnswers(
  questions: ParsedQuestion[],
  key: AnswerKeyEntry[],
  joinKeys: (number | null)[],
  // Restart papers pass the indices of the ONE section these answers were asked for.
  // Without it a printed number matches a question in every section that reuses it.
  onlyIdx?: Set<number>
): void {
  const byNumber = new Map<number, AnswerKeyEntry>();
  for (const e of key) {
    const n = Number(e?.number);
    if (Number.isFinite(n)) byNumber.set(n, e);
  }
  questions.forEach((q, i) => {
    if (onlyIdx && !onlyIdx.has(i)) return; // answers scoped to another section
    const jk = joinKeys[i];
    if (jk == null) return; // unjoinable — never guess
    const entry = byNumber.get(jk);
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
 * Map an answer-key value ("C", "(C)", "3", or the option's full text) to one of
 * the question's option labels, so the review radio pre-selects the right choice
 * AND two models that name the same option differently ("A" vs "1") don't read as
 * a disagreement. Resolution order: exact label → option text → positional index
 * (a bare number, or a letter mapped A→1, B→2…) so a numeric answer lands on a
 * letter-labelled paper and vice-versa.
 */
function resolveMcqLabel(raw: string, options?: { label: string; text: string }[] | null): string | null {
  const s = raw.trim();
  if (!options?.length) return /^[A-Za-z]$/.test(s) ? s.toUpperCase() : null;
  // Exact label match first — this also covers numerically-labelled papers (where
  // "1" IS the real label), so positional fallback never overrides a true match.
  const ci = options.find((o) => o.label.toLowerCase() === s.toLowerCase());
  if (ci) return ci.label;
  const byText = options.find((o) => o.text.trim().toLowerCase() === s.toLowerCase());
  if (byText) return byText.label;
  // A bare number ("1", "(2)", "3.") → 1-based option index. Handles a model that
  // answers "1" for the first option when the paper labels them A/B/C/D.
  const num = s.match(/^\(?\s*(\d+)\s*\)?[.)]?$/);
  if (num) {
    const i = Number(num[1]) - 1;
    if (i >= 0 && i < options.length) return options[i].label;
  }
  // A leading letter: prefer a matching letter label, else treat it positionally
  // (A→1st option…) so a letter answer maps onto a numerically-labelled paper.
  const lead = s.match(/[A-Za-z]/)?.[0];
  if (lead) {
    const byLead = options.find((o) => o.label.toLowerCase() === lead.toLowerCase());
    if (byLead) return byLead.label;
    const i = lead.toUpperCase().charCodeAt(0) - 65; // A→0, B→1…
    if (i >= 0 && i < options.length) return options[i].label;
  }
  return null;
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
// Use a DIFFERENT model than extraction for a genuinely independent second opinion.
// The super admin picks the verifier per import from VERIFY_MODEL_OPTIONS below; the
// default is Gemini 3 Flash. DeepSeek V4 Pro is offered because it's a flagship-class
// solver from a DIFFERENT vendor, so its mistakes DECORRELATE from the Gemini
// extractor (a same-family verifier tends to echo the extractor's errors), at a
// fraction of a Gemini-Pro price. The blind solve is a pure reasoning task on (mostly
// printed) text — DeepSeek's strength; OCR (where Gemini leads) barely matters as
// figures arrive pre-cropped. Gemini ids run via the Gemini path (Gemini-3 ids use
// thinking level COACHING_IMPORT_THINKING_LEVEL, default LOW); DeepSeek ids route
// through the OpenAI-compatible client below and need DEEPSEEK_API_KEY.

// Selectable VERIFY models, in menu order. The first is the Gemini fallback when a
// DeepSeek pick has no key. Server-side allowlist (the modal mirrors these labels) so
// a requested id is validated, never trusted raw. `deepseek-v4-pro` is the EXPLICIT V4
// Pro id — the legacy `deepseek-chat` alias resolves to V4 Flash (and retires 2026-07-24).
export const VERIFY_MODEL_OPTIONS = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (default)" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (cheapest)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (previous default)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
] as const;
const DEFAULT_VERIFY_MODEL = process.env.COACHING_IMPORT_VERIFY_MODEL || VERIFY_MODEL_OPTIONS[0].id;

// Selectable ANSWER-KEY (Pass 2) models. This pass READS the answer key off the page
// images and returns JSON, so it must be MULTIMODAL — DeepSeek V4 is TEXT-ONLY on the
// API (rejects image input), so only Gemini is offered here. (V4 Pro's reasoning
// is used for SOLUTION writing via the comparison pass instead, which works from text.)
export const GENERATION_MODEL_OPTIONS = [
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (default)" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (stronger reader)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
] as const;
// Env override of the default keeps the existing COACHING_IMPORT_ANSWER_MODEL knob.
const DEFAULT_GENERATION_MODEL = process.env.COACHING_IMPORT_ANSWER_MODEL || GENERATION_MODEL_OPTIONS[0].id;
const GENERATION_FALLBACK_MODEL = "gemini-3.5-flash-lite";

// Model for the always-on BLIND cross-check. It solves from the EXTRACTED QUESTION
// TEXT (no page image needed), so a text-only DeepSeek V4 model works here. Default =
// V4 FLASH at reasoning_effort=high (falls back to Gemini if no DeepSeek key).
//
// Why FLASH and not Pro: this pass is the import's bulk reasoning workload (every
// text question, batched), so its cost dominates. Flash is ~3× cheaper per token
// AND is the only V4 model that honours the effort dial — per DeepSeek's thinking-mode
// docs, v4-flash maps low/high/max straight through, while v4-pro collapses every
// effort to "high". So "Flash at high" buys the same reasoning depth Pro would have
// spent, at Flash's price, and leaves max/low as real knobs. Pro stays selectable.
export const COMPARE_MODEL_OPTIONS = [
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash (thinking: high)" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
] as const;
const DEFAULT_COMPARE_MODEL =
  process.env.COACHING_IMPORT_COMPARE_MODEL ||
  (process.env.DEEPSEEK_API_KEY ? "deepseek-v4-flash" : "gemini-3.5-flash-lite");

// True for any DeepSeek model id — routes to the OpenAI-compatible client, not Gemini.
const isDeepSeekModel = (id: string) => /deepseek/i.test(id);

// Where every DeepSeek pass lands when the admin switches DeepSeek OFF for an import
// (the modal's "DeepSeek V4" toggle). Deliberately the cheap Gemini lite model —
// the blind cross-check still runs, just with a same-vendor solver.
export const DEEPSEEK_OFF_MODEL = "gemini-3.5-flash-lite";

// Resolve a per-import requested model against an allowlist: unknown → default, and a
// DeepSeek pick degrades to a Gemini model when DeepSeek can't be used — either because
// DEEPSEEK_API_KEY is absent or because the admin toggled DeepSeek off for this import —
// so a pass never silently no-ops (or 401s) instead of running.
function resolveModel(
  requested: string | null | undefined,
  options: ReadonlyArray<{ id: string }>,
  defaultId: string,
  fallbackId: string,
  allowDeepSeek: boolean = true
): string {
  let model = options.some((o) => o.id === requested) ? requested! : defaultId;
  if (isDeepSeekModel(model)) {
    if (!allowDeepSeek) {
      console.log(`[import] DeepSeek off for this import — "${model}" → ${DEEPSEEK_OFF_MODEL}`);
      model = DEEPSEEK_OFF_MODEL;
    } else if (!process.env.DEEPSEEK_API_KEY) {
      console.warn(`[import] model "${model}" needs DEEPSEEK_API_KEY — falling back to ${fallbackId}`);
      model = fallbackId;
    }
  }
  return model;
}
const resolveVerifyModel = (requested?: string | null, allowDeepSeek = true) =>
  resolveModel(requested, VERIFY_MODEL_OPTIONS, DEFAULT_VERIFY_MODEL, VERIFY_MODEL_OPTIONS[0].id, allowDeepSeek);
const resolveGenerationModel = (requested?: string | null) =>
  resolveModel(requested, GENERATION_MODEL_OPTIONS, DEFAULT_GENERATION_MODEL, GENERATION_FALLBACK_MODEL);
const resolveCompareModel = (requested?: string | null, allowDeepSeek = true) =>
  resolveModel(requested, COMPARE_MODEL_OPTIONS, DEFAULT_COMPARE_MODEL, GENERATION_FALLBACK_MODEL, allowDeepSeek);

const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");

// How hard a V4 model thinks before answering. DeepSeek's thinking mode is ON by
// default at effort "high", but the default is the vendor's to change — the blind
// solve's whole value is its reasoning depth, so pin it explicitly rather than
// inherit. Allowed: "low" | "high" | "max".
//   - deepseek-v4-flash honours all three (this is why the blind pass defaults to it).
//   - deepseek-v4-pro collapses low/high/max to "high", so the field is a no-op there.
// NOTE: `thinking: {"type":"enabled"}` is deliberately NOT sent — it's the default,
// and thinking mode ignores `temperature` (which this client still sends, and which
// the compare pass steps up to break repetition loops). Sending only the effort keeps
// the request identical to the one that's already known to work against V4 Pro.
const DEEPSEEK_REASONING_EFFORT = process.env.COACHING_IMPORT_DEEPSEEK_REASONING_EFFORT || "high";

// Completion budget for a DeepSeek call that doesn't ask for a specific one. Must
// leave room for a reasoning model's chain of thought, not just the JSON reply.
const DEEPSEEK_DEFAULT_MAX_TOKENS = Number(process.env.COACHING_IMPORT_DEEPSEEK_MAX_TOKENS) || 4096;

// Hard ceiling on ONE DeepSeek request. V4 is a reasoning model asked here for a
// batch of worked solutions at a ~21k-token budget, and the blind cross-check fires
// several of those at once — without a timeout a single slow or wedged request has
// nothing to stop it, and the import sits on "blind cross-check: solving N…" forever.
// A timeout is retried like any other transient failure, so a slow-but-alive request
// costs a retry, not the pass.
const DEEPSEEK_TIMEOUT_MS = Number(process.env.COACHING_IMPORT_DEEPSEEK_TIMEOUT_MS) || 180_000;

// Timeout attempts allowed before giving up on a call, NOT counting the first.
// Deliberately 0: the generic MAX_ATTEMPTS=5 retry loop exists for transient faults
// (a 5xx, a dropped socket), where re-sending the same request is exactly right. A
// timeout is different — it means this request is too large to finish, so five 180s
// attempts burn 15 minutes to fail the same way. Failing fast hands control back to
// the caller, which splits the batch and retries something smaller.
const DEEPSEEK_TIMEOUT_RETRIES = Math.max(
  0,
  Number(process.env.COACHING_IMPORT_DEEPSEEK_TIMEOUT_RETRIES ?? 0)
);

/**
 * Render an array ResponseSchema as a compact "these keys are required" line for
 * vendors that can't accept a JSON Schema (DeepSeek supports only json_object mode).
 * Returns "" for a schema this can't describe, so the prompt is left untouched.
 */
function schemaHint(schema: ResponseSchema): string {
  const items = (schema as { items?: { properties?: Record<string, unknown>; required?: string[] } }).items;
  const props = items?.properties;
  if (!props) return "";
  const required = new Set(items?.required ?? []);
  const keys = Object.keys(props).map((k) => (required.has(k) ? `"${k}" (REQUIRED)` : `"${k}"`));
  return (
    `\n\nRESPONSE SHAPE (strict): reply with a JSON object {"results": [ ... ]}. ` +
    `The array holds ONE element per question, and every element has these keys: ${keys.join(", ")}. ` +
    `Never omit a REQUIRED key and never merge two questions into one element.`
  );
}

// Convert the Gemini-style Part[] the prompts build into OpenAI chat "content".
// IMPORTANT: DeepSeek's V4 API is TEXT-ONLY — it rejects `image_url`
// content ("unknown variant `image_url`, expected `text`"). So we DROP inline images
// here and send text only. DeepSeek is therefore only used for text-based reasoning
// (solution writing / blind verify from the question text); anything that must READ the
// page (the answer-key pass) stays on Gemini. Returns the text content + the number of
// images dropped (so the caller can log it).
function partsToOpenAIContent(parts: Part[]): { content: unknown[]; droppedImages: number } {
  const content: unknown[] = [];
  let droppedImages = 0;
  for (const p of parts as unknown as Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>) {
    if (p.text) content.push({ type: "text", text: p.text });
    else if (p.inlineData) droppedImages++;
  }
  return { content, droppedImages };
}

// Parse a model's text reply into the one-element array the verify/review callers
// expect. json_object mode returns an OBJECT, so accept either: a bare array, an
// object holding an array, or a single object (wrapped). Strips ``` fences and
// salvages the first JSON blob if there's stray prose.
function coerceJsonArray(text: string): unknown[] {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(t);
  } catch {
    const m = t.match(/[[{][\s\S]*[\]}]/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        /* unsalvageable */
      }
    }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    for (const v of Object.values(parsed as Record<string, unknown>)) if (Array.isArray(v)) return v;
    return [parsed];
  }
  return [];
}

// Fold a DeepSeek (OpenAI-shaped) usage block into the per-model totals.
//
// Two shape differences from Gemini that this has to normalize, or the report lies:
//  - REASONING. V4 Pro is a reasoning model and reports its chain of thought in
//    `completion_tokens_details.reasoning_tokens`. Unlike Gemini — where
//    candidatesTokenCount EXCLUDES thoughts — OpenAI-shaped `completion_tokens`
//    already INCLUDES them. So reasoning is SUBTRACTED out of output rather than
//    added on top; getTokenUsage bills (output + thinking), and counting it in both
//    would double-charge every reasoning token. This is why the report read
//    "thinking=0" for a model that plainly does think.
//  - CACHING. DeepSeek splits the prompt into `prompt_cache_hit_tokens` /
//    `prompt_cache_miss_tokens`, with hits ~10% of the full input rate — the same
//    ratio as CACHED_INPUT_FACTOR, so hits can feed the existing cached bucket.
function recordDeepSeekUsage(modelId: string, u: unknown): void {
  const usage = u as
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_cache_hit_tokens?: number;
        completion_tokens_details?: { reasoning_tokens?: number };
      }
    | undefined;
  if (!usage) return;
  const acc = _tokenUsage.get(modelId) ?? { calls: 0, input: 0, cached: 0, output: 0, thinking: 0 };
  const completion = Number(usage.completion_tokens ?? 0);
  const reasoning = Number(usage.completion_tokens_details?.reasoning_tokens ?? 0);
  acc.calls += 1;
  acc.input += Number(usage.prompt_tokens ?? 0);
  acc.cached += Number(usage.prompt_cache_hit_tokens ?? 0);
  // Clamp: never let a reported reasoning count exceed the completion it came from.
  acc.thinking += Math.min(reasoning, completion);
  acc.output += Math.max(0, completion - reasoning);
  _tokenUsage.set(modelId, acc);
}

// One DeepSeek chat-completions call constrained to JSON, returned as the same
// array shape callResilient yields, so the verify/review callers don't care which
// vendor answered. Retries transient/429 like the Gemini path; respects the signal.
async function callDeepSeekJsonArray(
  label: string,
  schema: ResponseSchema,
  parts: Part[],
  signal: AbortSignal | undefined,
  modelId: string,
  // NOT 1024: V4 is a REASONING model, so its chain of thought draws on the same
  // completion budget as the reply. At 1024 a long solve consumed the budget before
  // the JSON closed — coerceJsonArray then returned [], and the caller (verify /
  // review, both best-effort) silently recorded "no disagreement" instead of an error.
  maxTokens = DEEPSEEK_DEFAULT_MAX_TOKENS,
  temperature = 0.3
): Promise<unknown[]> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY not set");
  const { content, droppedImages } = partsToOpenAIContent(parts);
  if (droppedImages) {
    console.warn(`[import] ${label}: ${droppedImages} image(s) dropped — ${modelId} is text-only (solves from text)`);
  }
  // DeepSeek's response_format only supports `json_object` — it cannot enforce a
  // JSON Schema the way Gemini's responseSchema does, so the shape is prompt-only
  // here. Spelling the required keys out restores most of that guarantee; it matters
  // most for the batched blind solve, whose results are mapped back BY the "id" key.
  const hint = schemaHint(schema);
  if (hint) content.push({ type: "text", text: hint });
  const body = JSON.stringify({
    model: modelId,
    messages: [{ role: "user", content }],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    reasoning_effort: DEEPSEEK_REASONING_EFFORT, // see DEEPSEEK_REASONING_EFFORT
  });

  let lastErr: unknown;
  let timeouts = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new Error("aborted: client disconnected");
    try {
      // Client abort AND request timeout, whichever fires first. Kept per-attempt so
      // each retry gets a fresh clock rather than sharing one deadline.
      const timeout = AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS);
      const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        if (res.status === 429) {
          const wait = Math.min(35, (parseRetryDelaySec(txt) ?? 20) + 1);
          console.warn(`[import] ${label} DeepSeek rate-limited — waiting ${wait}s [attempt ${attempt}/${MAX_ATTEMPTS}]`);
          await sleep(wait * 1000);
          continue;
        }
        throw new Error(`DeepSeek ${res.status}: ${txt.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        usage?: unknown;
      };
      recordDeepSeekUsage(modelId, json.usage);
      const choice = json.choices?.[0];
      // Truncation is otherwise invisible: the reply just fails to parse and the
      // best-effort callers treat the empty result as "nothing to flag".
      if (choice?.finish_reason === "length") {
        console.warn(
          `[import] ⚠ ${label}: ${modelId} hit max_tokens (${maxTokens}) — reply truncated, result may be partial or empty`
        );
      }
      return coerceJsonArray(choice?.message?.content ?? "");
    } catch (e) {
      lastErr = e;
      // Only the CLIENT going away is fatal. A timeout also surfaces as an abort with
      // "aborted" in its message, so testing the message (as this did) would classify
      // every timeout as a disconnect and skip the retry that's meant to absorb it —
      // check the client's own signal instead.
      if (signal?.aborted) throw e;
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || /timed? ?out/i.test(e.message));
      const secs = Math.round(DEEPSEEK_TIMEOUT_MS / 1000);
      console.warn(
        `[import] ${label} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${
          timedOut
            ? `no response in ${secs}s (COACHING_IMPORT_DEEPSEEK_TIMEOUT_MS)`
            : e instanceof Error
              ? e.message
              : e
        }`
      );
      // See DEEPSEEK_TIMEOUT_RETRIES: a too-large request won't get smaller on retry.
      if (timedOut && timeouts++ >= DEEPSEEK_TIMEOUT_RETRIES) {
        throw new Error(`${modelId} did not respond within ${secs}s — request too large to complete`);
      }
      if (attempt < MAX_ATTEMPTS) await sleep(2000 * attempt);
    }
  }
  throw lastErr;
}

// Dispatch a JSON call to whichever vendor `model` names: DeepSeek via the
// OpenAI-compatible client, anything else via the Gemini path. Keeps the verify,
// review, and answer-generation callers vendor-agnostic. `maxTokens` bounds the
// DeepSeek output budget (small for verify, large for batched solution generation).
function callModel(
  geminiKey: string,
  label: string,
  schema: ResponseSchema,
  parts: Part[],
  model: string,
  signal?: AbortSignal,
  maxTokens?: number
): Promise<unknown[]> {
  return isDeepSeekModel(model)
    ? callDeepSeekJsonArray(label, schema, parts, signal, model, maxTokens)
    : callResilient(geminiKey, label, schema, parts, signal, model, maxTokens);
}

// Verify / subjective-review replies are tiny, but a reasoning verifier still needs
// headroom for its chain of thought before the JSON — see DEEPSEEK_DEFAULT_MAX_TOKENS.
const VERIFY_MAX_TOKENS = Number(process.env.COACHING_IMPORT_VERIFY_MAX_TOKENS) || 4096;

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
  model?: string | null;
  /** false → a DeepSeek pick degrades to DEEPSEEK_OFF_MODEL (modal toggle). */
  allowDeepSeek?: boolean;
  signal?: AbortSignal;
  onEvent?: (ev: ImportEvent) => void;
}): Promise<void> {
  const model = resolveVerifyModel(opts.model, opts.allowDeepSeek ?? true);
  const key = process.env.GEMINI_API_KEY ?? "";
  // The verifier may be Gemini (needs the key / Vertex) or DeepSeek (needs its own
  // key, checked inside its client) — only gate on the Gemini key when Gemini is it.
  if (!isDeepSeekModel(model) && !key) return;
  const { questions, signal } = opts;
  const emit = opts.onEvent ?? (() => {});

  // Only objective questions that actually have a captured answer can be cross-checked.
  const targets = questions.filter(
    (q) => (q.question_type === "mcq" || q.question_type === "nat") && !!q.correct_answer
  );
  if (!targets.length) return;
  console.log(`[import] verifying ${targets.length} objective answer(s) with ${model}`);
  emit({ t: "phase", phase: "verify", total: targets.length });

  let disputes = 0;
  await mapLimit(targets, CONCURRENCY, async (q) => {
    if (signal?.aborted) return;
    const label = `verify q${q.number ?? "?"}`;
    try {
      const parts: Part[] = [...(await figureParts(q)), { text: buildVerifyPrompt(q) }];
      const got = (await callModel(key, label, VERIFY_SCHEMA, parts, model, signal, VERIFY_MAX_TOKENS)) as {
        answer?: string;
        confidence?: number;
      }[];
      const aiRaw = got[0]?.answer ? String(got[0].answer) : "";
      if (aiRaw) {
        // Always record the verifier's answer so the 3-way agreement badge can show it
        // even when it agrees; only flag a dispute when it actually disagrees.
        q.verify_answer = verifyDisplay(q, aiRaw);
        if (answersDisagree(q, aiRaw)) {
          q.answer_disputed = true;
          disputes++;
        }
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
  model?: string | null;
  /** false → a DeepSeek pick degrades to DEEPSEEK_OFF_MODEL (modal toggle). */
  allowDeepSeek?: boolean;
  signal?: AbortSignal;
  onEvent?: (ev: ImportEvent) => void;
}): Promise<void> {
  const model = resolveVerifyModel(opts.model, opts.allowDeepSeek ?? true);
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!isDeepSeekModel(model) && !key) return;
  const { questions, signal } = opts;
  const emit = opts.onEvent ?? (() => {});

  // Only subjective questions that actually have a model answer can be reviewed.
  const targets = questions.filter(
    (q) => q.question_type === "subjective" && !!String(q.solution ?? "").trim()
  );
  if (!targets.length) return;
  console.log(`[import] reviewing ${targets.length} subjective model answer(s) with ${model}`);
  emit({ t: "phase", phase: "review", total: targets.length });

  let flagged = 0;
  await mapLimit(targets, CONCURRENCY, async (q) => {
    if (signal?.aborted) return;
    const label = `review q${q.number ?? "?"}`;
    try {
      const parts: Part[] = [...(await figureParts(q)), { text: buildSubjectiveReviewPrompt(q) }];
      const got = (await callModel(
        key,
        label,
        SUBJECTIVE_REVIEW_SCHEMA,
        parts,
        model,
        signal,
        VERIFY_MAX_TOKENS
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

// ─── Blind cross-check (always on) ───────────────────────────────────────────
// V4 Flash (reasoning_effort high) solves EVERY question FROM SCRATCH (never shown the answer) and writes its
// worked solution into `solution_alt` + its own concluded answer into
// `blind_answer`. The recorded answer (flash-lite Pass 2) is left untouched —
// the review UI compares the two answers (and the verify model's, when Verify is on)
// and flags disagreements. One model call per question.
const SOLUTION_ONLY_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      answer: { type: SchemaType.STRING, nullable: true },
      solution: { type: SchemaType.STRING },
      solution_hindi: { type: SchemaType.STRING, nullable: true },
    },
    required: ["solution"],
  },
};

function buildSolutionPrompt(q: ParsedQuestion, bilingual: boolean): string {
  const opts =
    q.question_type === "mcq" && q.options?.length
      ? `Options:\n${q.options.map((o) => `${o.label}. ${o.text || "(see figure)"}`).join("\n")}`
      : "";
  const isObjective = q.question_type === "mcq" || q.question_type === "nat";
  return [
    "You are INDEPENDENTLY solving ONE exam question from scratch to produce a worked solution. Decide the answer using ONLY your own reasoning.",
    "Do NOT assume any answer has been provided, and do NOT rely on any answer key — solve it yourself from first principles.",
    `Question type: ${q.question_type.toUpperCase()}`,
    `Question: ${q.question_text}`,
    opts,
    q.images?.length ? "The figure this question refers to is attached as an image." : "",
    // V4 reasons in a hidden reasoning_content field and we only keep `content`,
    // so we MUST tell it to write the full working INTO the solution itself.
    "Put the FULL reasoning into the \"solution\" field: state the approach, show EACH step of the working with a short explanation of WHY, then state the final answer. Be thorough and self-contained — do not skip steps. Don't restate the question verbatim. Take as much space as the question needs and no more — a multi-part question needs every part worked; do not pad a short one.",
    isObjective
      ? 'Also set "answer" to the SINGLE answer your solution concludes — the option label (A, B, C…) for MCQ, or the numeric value for NAT. No $ signs, no words.'
      : 'This is a subjective question — set "answer" to null.',
    LATEX_RULES,
    MULTIPART_RULE,
    bilingual ? 'Also fill "solution_hindi": a Hindi translation of the same solution (identical math).' : "",
    `Return STRICT JSON: a one-element array [{"answer": string|null, "solution": string${bilingual ? ', "solution_hindi": string' : ""}}].`,
    "Output ONLY the JSON array, no prose.",
  ]
    .filter(Boolean)
    .join("\n");
}

// Batched variant of SOLUTION_ONLY_SCHEMA: K text questions solved in one V4 call.
// Each result carries the "id" it answers so the array maps back to the right
// question even if the model reorders or drops one.
const SOLUTION_BATCH_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.INTEGER },
      answer: { type: SchemaType.STRING, nullable: true },
      solution: { type: SchemaType.STRING },
      solution_hindi: { type: SchemaType.STRING, nullable: true },
    },
    required: ["id", "solution"],
  },
};

// Solve several TEXT questions in one blind pass. Each question is tagged with a
// 1-based id (its position in `qs`) so the returned array can be matched back even
// if the model reorders. Mirrors buildSolutionPrompt's rules, applied per question.
function buildSolutionBatchPrompt(qs: ParsedQuestion[], bilingual: boolean): string {
  const blocks = qs
    .map((q, i) => {
      const opts =
        q.question_type === "mcq" && q.options?.length
          ? `Options:\n${q.options.map((o) => `${o.label}. ${o.text || "(see figure)"}`).join("\n")}`
          : "";
      return [`--- Question id=${i + 1} (type: ${q.question_type.toUpperCase()}) ---`, q.question_text, opts]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
  return [
    "You are INDEPENDENTLY solving the exam questions below from scratch to produce a worked solution for EACH. Decide each answer using ONLY your own reasoning.",
    "Do NOT assume any answer has been provided, and do NOT rely on any answer key — solve every question yourself from first principles. Solve each question INDEPENDENTLY of the others.",
    "",
    blocks,
    "",
    // V4 reasons in a hidden reasoning_content field and we only keep `content`,
    // so we MUST tell it to write the full working INTO each solution itself.
    'For EACH question put the FULL reasoning into its "solution" field: state the approach, show EACH step of the working with a short explanation of WHY, then state the final answer. Be thorough and self-contained — do not skip steps. Don\'t restate the question verbatim. Take as much space as each question needs and no more — a multi-part question needs every part worked; do not pad a short one.',
    'For an MCQ/NAT question set "answer" to the SINGLE answer your solution concludes — the option label (A, B, C…) for MCQ, or the numeric value for NAT. No $ signs, no words. For a SUBJECTIVE question set "answer" to null.',
    LATEX_RULES,
    MULTIPART_RULE,
    bilingual ? 'Also fill "solution_hindi" for each: a Hindi translation of the same solution (identical math).' : "",
    `Return STRICT JSON: an array with ONE element per question, each {"id": integer (the id shown above), "answer": string|null, "solution": string${bilingual ? ', "solution_hindi": string' : ""}}. Return every id exactly once.`,
    "Output ONLY the JSON array, no prose.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Blind cross-check (always runs): V4 Flash (thinking high) solves every question from scratch — never
 * shown the recorded answer — and stores its worked solution in `solution_alt` and its
 * own concluded answer in `blind_answer`. The recorded `correct_answer`
 * (flash-lite Pass 2) is NOT touched; the review UI compares the two (plus the verify
 * model when Verify is on) and flags disagreements. One model call per question.
 * Best-effort and concurrent. Call AFTER cropping so figure questions carry their figure.
 */
export async function generateComparisonSolutions(opts: {
  questions: ParsedQuestion[];
  primaryModel?: string | null;
  /** false → the DeepSeek default degrades to DEEPSEEK_OFF_MODEL (modal toggle).
   *  The cross-check still runs — same Gemini family as Pass 2, so its errors are
   *  more correlated than V4's, but it stays a genuine blind re-solve. */
  allowDeepSeek?: boolean;
  bilingual?: boolean;
  signal?: AbortSignal;
  onEvent?: (ev: ImportEvent) => void;
  /** Split the cross-check into two phases so text-only questions start during
   *  cropping. "text-only" processes pure-text questions (no images needed, safe
   *  to run before cropping). "post-crop" handles questions that gained images
   *  from cropping, plus any text questions the first phase didn't reach. Omit
   *  to run everything in one go (backward-compatible). */
  phase?: "text-only" | "post-crop";
}): Promise<void> {
  const model = resolveCompareModel(opts.primaryModel, opts.allowDeepSeek ?? true);
  const key = process.env.GEMINI_API_KEY ?? "";
  const bilingual = opts.bilingual ?? false;
  const { questions, signal } = opts;
  const emit = opts.onEvent ?? (() => {});

  // V4 is text-only — skip any question that depends on a FIGURE it can't see. Those
  // keep flash-lite's solution as the default (Gemini read the image). A figure that
  // lives only in the SOLUTION (type "explanation") doesn't block a text solve.
  const needsFigure = (q: ParsedQuestion) =>
    (q.images ?? []).some((im) => im.type !== "explanation") ||
    !!q.is_figure ||
    !!q.has_diagram ||
    !!q.options_are_figures ||
    !!q.figure_missing;
  const targets = questions.filter((q) => String(q.question_text ?? "").trim() && !needsFigure(q));
  const skipped = questions.filter((q) => String(q.question_text ?? "").trim() && needsFigure(q)).length;

  // Split targets into image-bearing and pure-text, then apply the phase filter
  // so the route can overlap the text-only solve with figure cropping.
  const phase = opts.phase;
  let withImages = targets.filter((q) => q.images?.length);
  let textOnly = targets.filter((q) => !q.images?.length);
  if (phase === "text-only") {
    // Images aren't ready yet (cropping runs in parallel) — only text questions.
    withImages = [];
  } else if (phase === "post-crop") {
    // Drop anything the "text-only" phase already solved so it isn't solved twice.
    // BOTH lists need the filter: a text question whose SOLUTION had a figure was
    // pure-text when phase 1 ran, then gained an "explanation" image from cropping —
    // which needsFigure exempts — so it reappears here in withImages. Whatever the
    // first phase missed (error/timeout) has no marker and is retried.
    textOnly = textOnly.filter((q) => !q.blind_solved);
    withImages = withImages.filter((q) => !q.blind_solved);
  }
  const activeCount = textOnly.length + withImages.length;

  const phaseLabel = phase ? ` [${phase}]` : "";
  if (!activeCount) {
    console.log(`[import] blind cross-check${phaseLabel}: nothing to solve (${skipped} figure question(s) kept on flash-lite)`);
    return;
  }
  console.log(`[import] blind cross-check${phaseLabel}: solving ${activeCount} question(s) with ${model} (${skipped} figure question(s) kept on flash-lite)`);
  // The "text-only" phase runs CONCURRENTLY with figure cropping, which owns the
  // UI label for that window — emitting here would replace "Cropping figures…"
  // with a compare label milliseconds in, then flip back on the post-crop emit.
  // The route's cropping label covers both halves of the parallel block.
  if (phase !== "text-only") emit({ t: "phase", phase: "compare", total: activeCount });

  let done = 0;
  let disagree = 0;

  // Fold one blind result onto its question. Returns true if the blind answer
  // disagrees with the recorded one (for the diagnostics tally). Shared by the
  // batched (text) path and the per-question (figure) path below.
  type BlindResult = { answer?: string; solution?: string; solution_hindi?: string };
  const apply = (q: ParsedQuestion, r: BlindResult | undefined): boolean => {
    if (!r) return false;
    // Mark BEFORE folding anything in: this is what stops the post-crop phase from
    // re-solving (and double-shifting solution → solution_alt) a question the
    // text-only phase already handled. Set for every question type, unlike
    // blind_answer which only exists for mcq/nat.
    q.blind_solved = true;
    if (r.solution?.trim()) {
      // Keep flash-lite's answer-key solution as the ALTERNATE so it can still be
      // chosen in review.
      if (q.solution?.trim()) {
        q.solution_alt = q.solution;
        q.solution_alt_hindi = q.solution_hindi ?? null;
        q.solution_alt_model = "Gemini (answer key)";
      }
      // The blind solve is the reasoning-heavy pass, so its solution is the SAVED default.
      q.solution = r.solution;
      if (bilingual && r.solution_hindi) q.solution_hindi = r.solution_hindi;
    }
    // Record V4's own (blind) answer and compare it to the recorded one.
    const aiRaw = r.answer ? String(r.answer) : "";
    if (aiRaw && (q.question_type === "mcq" || q.question_type === "nat")) {
      q.blind_answer = verifyDisplay(q, aiRaw);
      return answersDisagree(q, aiRaw);
    }
    return false;
  };

  // withImages and textOnly were split + phase-filtered above (near `targets`).

  // Solve ONE question on its own and fold the result in. Used for single-question
  // groups, figure-bearing questions (their image must be attached), and as the
  // recovery path when a batch's results can't be mapped back safely.
  const solveOne = async (q: ParsedQuestion, withFigure = false): Promise<void> => {
    const label = `blind q${q.number ?? "?"}`;
    try {
      const parts: Part[] = withFigure
        ? [...(await figureParts(q)), { text: buildSolutionPrompt(q, bilingual) }]
        : [{ text: buildSolutionPrompt(q, bilingual) }];
      const got = (await callModel(
        key, label, SOLUTION_ONLY_SCHEMA, parts, model, signal, MAX_OUTPUT_TOKENS
      )) as BlindResult[];
      if (apply(q, got[0])) disagree++;
    } catch (e) {
      console.warn(`[import] ${label} failed:`, e instanceof Error ? e.message : e);
    }
    done++;
  };

  // Batched text solves. Log the shape up front: this phase is the longest in the
  // import (a reasoning model writing K worked solutions per call), and with no line
  // between "solving N question(s)" and "done" it reads as a hang rather than work.
  const groups = chunk(textOnly, COMPARE_BATCH);
  console.log(
    `[import] blind cross-check: ${groups.length} batch(es) of up to ${COMPARE_BATCH}, ${CONCURRENCY} at a time, ${Math.round(
      DEEPSEEK_TIMEOUT_MS / 1000
    )}s timeout per request`
  );
  let doneGroups = 0;
  const runGroup = async (group: ParsedQuestion[]): Promise<void> => {
    if (signal?.aborted) return;
    // A 1-question group is just the focused single-question prompt/schema.
    if (group.length === 1) {
      await solveOne(group[0]);
      return;
    }
    const label = `blind batch q${group[0].number ?? "?"}–${group[group.length - 1].number ?? "?"}`;
    // Size the output budget to the batch (K solutions, ~bilingual doubling).
    const budget = outputBudgetFor(group.length);
    let got: (BlindResult & { id?: number })[];
    try {
      got = (await callModel(key, label, SOLUTION_BATCH_SCHEMA,
        [{ text: buildSolutionBatchPrompt(group, bilingual) }], model, signal, budget
      )) as (BlindResult & { id?: number })[];
    } catch (e) {
      // A batch fails mostly because it was too BIG: a reasoning model writing K
      // worked solutions in one completion scales its generation time with K, so
      // re-sending the identical request just times out again and abandoning it
      // costs K questions their cross-check. Halve and retry instead — the split
      // bottoms out at the single-question path, which always fits.
      console.warn(
        `[import] ${label} failed: ${e instanceof Error ? e.message : e} — splitting ${group.length} into ${Math.ceil(
          group.length / 2
        )}+${Math.floor(group.length / 2)} and retrying`
      );
      const mid = Math.ceil(group.length / 2);
      await runGroup(group.slice(0, mid));
      await runGroup(group.slice(mid));
      return;
    }

    // Map results back STRICTLY by the 1-based id we assigned in the prompt.
    //
    // The default compare model is DeepSeek, whose API can't enforce a JSON Schema
    // (json_object mode only), so the id is prompt-guaranteed at best. The old code
    // fell back to array order per-element, which is silently WRONG when the model
    // drops a question: every later result shifts onto the preceding question. That
    // matters doubly here because `apply` overwrites `q.solution` — for a subjective
    // question that field is the model answer the AI grader marks students against.
    // So: ids present → map by id; no ids but exactly one result per question →
    // order is unambiguous; anything else → re-solve individually rather than guess.
    if (got.length > 0 && got.every((r) => typeof r?.id === "number")) {
      const byId = new Map<number, BlindResult>(got.map((r) => [r.id as number, r as BlindResult]));
      group.forEach((q, i) => {
        if (apply(q, byId.get(i + 1))) disagree++;
        done++;
      });
      return;
    }
    if (got.length === group.length) {
      console.warn(`[import] ${label}: results carried no "id" — mapping by order (counts match)`);
      group.forEach((q, i) => {
        if (apply(q, got[i])) disagree++;
        done++;
      });
      return;
    }
    console.warn(
      `[import] ⚠ ${label}: ${got.length} result(s) for ${group.length} question(s) and no usable ids — re-solving individually so solutions can't land on the wrong question`
    );
    for (const q of group) {
      if (signal?.aborted) {
        done++;
        continue;
      }
      await solveOne(q);
    }
  };
  await mapLimit(groups, CONCURRENCY, async (group) => {
    await runGroup(group);
    doneGroups++;
    console.log(
      `[import] blind cross-check${phaseLabel}: batch ${doneGroups}/${groups.length} done — ${done}/${activeCount} question(s) solved`
    );
  });

  // Per-question path for figure-bearing questions (image must be attached).
  await mapLimit(withImages, CONCURRENCY, async (q) => {
    if (signal?.aborted) return;
    await solveOne(q, true);
  });

  console.log(`[import] blind cross-check${phaseLabel} done ${done}/${activeCount} — ${disagree} disagree with the recorded answer`);
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

  // ONE detection attempt. Retried by the loop below on a transient failure —
  // extracted so a 429 costs a backoff instead of the figure itself.
  const attempt = async (): Promise<number[][] | null> => {
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
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: FIGURE_MODEL,
      // @ts-ignore
      generationConfig,
    });

    const res: any = await model.generateContent({ contents: [{ role: "user", parts }] }, { signal });
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
  };

  // Every other Gemini call in this file backs off and retries through
  // callResilient; figure detection used to just log "rate-limited — skipping" and
  // return null, so a 429 LOST the figure permanently (the question imports with
  // figure_missing and the admin re-attaches it by hand). That was tolerable while
  // this ran serially, but the crop stage now runs several questions concurrently,
  // which makes 429s likely rather than rare. So transient failures wait and retry;
  // only a genuinely broken call gives up. Still never throws — a figure that can't
  // be located is best-effort by design.
  for (let i = 1; i <= FIGURE_MAX_ATTEMPTS; i++) {
    if (signal?.aborted) return null;
    try {
      return await attempt();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (signal?.aborted || /aborted/i.test(msg)) return null;
      const retryable = /429|quota|rate limit|RESOURCE_EXHAUSTED|\b503\b|overloaded|unavailable/i.test(msg);
      if (!retryable || i === FIGURE_MAX_ATTEMPTS) {
        console.warn(
          `[import] figure detection ${retryable ? "gave up after" : "failed on"} attempt ${i} for ${qRef}: ${msg.slice(0, 100)}`
        );
        return null;
      }
      // Honour the server's suggested delay when it sends one, else exponential.
      const wait = Math.min(35, parseRetryDelaySec(msg) ?? Math.min(30, 2 ** i)) + Math.random();
      console.warn(
        `[import] figure detection transient error for ${qRef} — waiting ${wait.toFixed(1)}s [attempt ${i}/${FIGURE_MAX_ATTEMPTS}]`
      );
      await sleep(wait * 1000);
    }
  }
  return null;
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
  if (!key) return null;

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
  if (!key) return null;

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

