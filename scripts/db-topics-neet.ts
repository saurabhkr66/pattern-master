/**
 * DB twin of scripts/json-topics-neet.ts — same flow, same console, but the unit
 * of work is a MockTestTemplate row in the VPS DB instead of a JSON file on disk.
 *
 * Assigns each NEET mock question a `topic` drawn from the NEET PYQ vocabulary
 * (Pattern.topic_name for exam_type=NEET), scoped to the question's own subject:
 * a Physics question can only ever get a Physics topic.
 *
 * Run ON the VPS with DB_DRIVER=standard, against Vertex (GEMINI_USE_VERTEX=1) —
 * this script has no rate-limit pacing or backoff, so the Developer API's 15 req/min
 * free tier will 429 and drop questions. Vertex's quota is what makes that safe.
 *
 * Usage:
 *   DB_DRIVER=standard npx tsx scripts/db-topics-neet.ts --auto --dry
 *   DB_DRIVER=standard npx tsx scripts/db-topics-neet.ts --auto
 *   DB_DRIVER=standard npx tsx scripts/db-topics-neet.ts --title "NEET 2024"
 *   DB_DRIVER=standard npx tsx scripts/db-topics-neet.ts --auto --force
 *
 * Like the JSON version it skips questions that already carry a good topic; unlike
 * it, "good" means "exists in the PYQ list for that subject" — so a stale or
 * mis-cased topic gets fixed too (case fixes are free, no API call).
 *
 * SOURCE OF TRUTH: prisma/seed_mock_from_json.ts treats the scraper JSON as
 * authoritative and `topic` is in its content hash. Re-seeding an UNCHANGED JSON
 * is hash-skipped so these fixes survive — but editing + re-seeding that JSON
 * overwrites them. Fix the JSON with json-topics-neet.ts if you plan to re-seed.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";
import { getImageUrl } from "../lib/imageUtils";
import { invalidateMockTemplate } from "../lib/mockTemplate";

// Precedence: inline env > .env.local > .env — same as Next.js. DB_DRIVER and
// DATABASE_URL live in .env; GEMINI_USE_VERTEX / VERTEX_* live in .env.local, so
// loading only .env (what the other scripts do) silently falls back to the
// Developer API key. dotenv never overwrites an already-set var, so an inline
// `DB_DRIVER=… npx tsx …` still wins over both files.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

// Standard driver on the VPS; the Neon HTTP adapter also works here (one `update`
// per save, no updateMany) but prod lives on the VPS.
const driver = process.env.DB_DRIVER ?? "neon-http";
const prisma = driver === "standard"
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(databaseUrl, {}) });

// Backend toggle (mirrors lib/coachingImport.ts): GEMINI_USE_VERTEX=1 → Vertex AI
// (GCP ADC, high quota); otherwise the Developer API with GEMINI_API_KEY (free
// tier is ~15 req/min — see BATCH_SIZE/delay note below).
const USE_VERTEX = process.env.GEMINI_USE_VERTEX === "1";
const ai = USE_VERTEX
  ? new GoogleGenAI({
      vertexai: true,
      project: process.env.VERTEX_PROJECT || "project-27ed127f-554a-419a-b39",
      location: process.env.VERTEX_LOCATION || "us-central1",
    })
  : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Classification is a cheap, high-volume call, so flash-lite. Override with
// TOPIC_MODEL if Vertex in your region doesn't serve this id.
const TOPIC_MODEL = process.env.TOPIC_MODEL || "gemini-3.5-flash-lite";

// Gemini 3.x controls thinking by LEVEL (a numeric budget is rejected); 2.5 uses a
// numeric budget (0 = skip). Classification is light, so keep thinking minimal.
function topicThinking(model: string): Record<string, unknown> {
  return /gemini-3/i.test(model) ? { thinkingLevel: "LOW" } : { thinkingBudget: 0 };
}

const BATCH_SIZE = 15;        // text questions packed into ONE request
// Vertex quotas dwarf the Developer free tier, so there is no inter-request pacing
// and no rate-limit backoff — requests go out as fast as CONCURRENCY allows.
// A failed call just leaves those questions untagged (counted as failed); re-running
// picks them up, since anything without a valid PYQ topic is reprocessed by default.
const CONCURRENCY = Number(process.env.TOPIC_CONCURRENCY || 4);

/** Run `fn` over `items` in waves of `limit`, preserving result order. */
async function inWaves<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    out.push(...await Promise.all(items.slice(i, i + limit).map(fn)));
  }
  return out;
}

async function fetchImageAsBase64(filename: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Resolve via the app's ImageKit resolver (lib/imageUtils.getImageUrl). Needs
    // NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT in .env; without it getImageUrl returns a
    // relative path (no http) and we skip the image gracefully.
    const url = getImageUrl(filename);
    if (!url.startsWith("http")) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return { data: buffer.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

async function getAllTopics(examType: string): Promise<Record<string, string[]>> {
  const patterns = await prisma.pattern.findMany({
    where: { exam_type: examType },
    select: { topic_name: true, subject: true },
    orderBy: { topic_name: "asc" },
  });

  const topicMap: Record<string, string[]> = {};
  patterns.forEach((p) => {
    const subject = (p.subject || "GENERAL").toUpperCase().trim();
    if (!topicMap[subject]) topicMap[subject] = [];
    if (!topicMap[subject].includes(p.topic_name)) {
      topicMap[subject].push(p.topic_name);
    }
  });
  return topicMap;
}

/**
 * The JSON script gets its subject from the file path; here it comes from the
 * question's own `subject` (the examConfigs section name). Three buckets only —
 * a question is NEVER matched against the full NEET vocabulary.
 */
type Bucket = "PHYSICS" | "CHEMISTRY" | "BIOLOGY";

function bucketFor(subject: string): Bucket | null {
  const k = String(subject || "").toUpperCase().trim();
  if (k === "PHYSICS" || k === "PHY") return "PHYSICS";
  if (k === "CHEMISTRY" || k === "CHEM") return "CHEMISTRY";
  if (k === "BIOLOGY" || k === "BOTANY" || k === "ZOOLOGY" || k === "BIO") return "BIOLOGY";
  return null;
}

// NEET's Biology section covers Botany + Zoology patterns too.
const BUCKET_SOURCES: Record<Bucket, string[]> = {
  PHYSICS: ["PHYSICS"],
  CHEMISTRY: ["CHEMISTRY"],
  BIOLOGY: ["BIOLOGY", "BOTANY", "ZOOLOGY"],
};

function topicsForBucket(bucket: Bucket, topicMap: Record<string, string[]>): string[] {
  return [...new Set(BUCKET_SOURCES[bucket].flatMap((s) => topicMap[s] || []))];
}

function buildPrompt(q: { question_text: string; options: any }, allowedTopics: string[]) {
  return `You are an academic expert. Categorize this exam question into EXACTLY ONE topic from this list:

--- ALLOWED TOPICS START ---
${allowedTopics.join("\n")}
--- ALLOWED TOPICS END ---

Rules:
1. Return ONLY the topic name from the list.
2. If it doesn't fit perfectly, choose the closest match.
3. No preamble, no markdown, no explanation.

Question: ${q.question_text}
Options: ${JSON.stringify(q.options)}`;
}

// Case/punctuation/spacing-insensitive key: "d and f block elements" == "d and f Block Elements".
function norm(s: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanTopic(text: string, allowedTopics: string[]): string {
  let cleaned = text.trim().replace(/^['"*]+|['"*]+$/g, "").trim();
  if (allowedTopics.includes(cleaned)) return cleaned;
  const match = allowedTopics.find((t) => norm(t) === norm(cleaned));
  return match || "Unknown";
}

async function generateTopic(
  q: { question_text: string; options: any; images?: any[] },
  allowedTopics: string[]
): Promise<string | null> {
  if (allowedTopics.length === 0) return "Unknown";
  try {
    const parts: any[] = [buildPrompt(q, allowedTopics)];
    const images = (q.images as any[]) || [];
    for (const img of images.filter((i) => i.type !== "explanation")) {
      const filename = img.filename || img.url;
      if (!filename) continue;
      const imageData = await fetchImageAsBase64(filename);
      if (imageData) parts.push({ inlineData: imageData });
    }

    const result = await ai.models.generateContent({
      model: TOPIC_MODEL,
      config: { thinkingConfig: topicThinking(TOPIC_MODEL) },
      contents: parts.map((p) =>
        typeof p === "string" ? p : p.inlineData ? { inlineData: p.inlineData } : p
      ),
    });

    return cleanTopic(result.text || "", allowedTopics);
  } catch (err: any) {
    console.error("  Gemini error:", err.message);
    return null;
  }
}

// Does the question carry a usable (non-explanation) image? Those go through the
// single-question path so Gemini can actually see the figure; everything else is
// batched as text.
function hasUsableImage(q: { images?: any[] }): boolean {
  const imgs = (q.images as any[]) || [];
  return imgs.some((i) => i && i.type !== "explanation" && (i.filename || i.url));
}

const TOPIC_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER },
      topic: { type: Type.STRING },
    },
    required: ["index", "topic"],
  },
};

function buildBatchPrompt(questions: any[], allowedTopics: string[]): string {
  const blocks = questions
    .map((q, i) => `=== Question ${i + 1} ===\n${q.question_text}\nOptions: ${JSON.stringify(q.options ?? [])}`)
    .join("\n\n");
  return `You are an academic expert. Categorize EACH exam question below into EXACTLY ONE topic from the allowed list.

--- ALLOWED TOPICS START ---
${allowedTopics.join("\n")}
--- ALLOWED TOPICS END ---

Rules:
1. Use ONLY a topic name that appears verbatim in the list above.
2. If a question doesn't fit perfectly, pick the closest match.
3. Return one object per question using its 1-based index; include every index exactly once.

${blocks}`;
}

// Classify up to BATCH_SIZE text questions in a SINGLE request. Returns topics
// aligned to the input order (null where the model didn't answer / errored).
async function generateTopicsBatch(questions: any[], allowedTopics: string[]): Promise<(string | null)[]> {
  const out = new Array<string | null>(questions.length).fill(null);
  if (allowedTopics.length === 0 || questions.length === 0) return out;
  try {
    const result = await ai.models.generateContent({
      model: TOPIC_MODEL,
      config: {
        thinkingConfig: topicThinking(TOPIC_MODEL),
        responseMimeType: "application/json",
        responseSchema: TOPIC_SCHEMA as any,
      },
      contents: buildBatchPrompt(questions, allowedTopics),
    });
    const parsed = JSON.parse(result.text || "[]");
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const idx = Number(item?.index) - 1;
        if (idx >= 0 && idx < out.length && item?.topic) {
          out[idx] = cleanTopic(String(item.topic), allowedTopics);
        }
      }
    }
  } catch (err: any) {
    console.error("  Gemini batch error:", err.message);
  }
  return out;
}

/**
 * The saveJson() equivalent: write the whole questions array back to the row and
 * keep MockTestTemplate.topics (the row's topic index) in sync. Called after every
 * batch, so an interrupted run keeps the work already done.
 */
async function saveMock(mockId: string, questions: any[]) {
  const topics = [...new Set(questions.map((q) => String(q.topic || "").trim()).filter(Boolean))].sort();
  await prisma.mockTestTemplate.update({
    where: { id: mockId },
    data: { questions, topics },
  });
}

// Print prev → current topic for one question, with a snippet of the stem.
function logChange(q: any, before: string, after: string) {
  const stem = String(q.question_text || "").replace(/\s+/g, " ").slice(0, 55);
  console.log(`    ${String(before || "(none)").padEnd(26)} → ${after.padEnd(26)}  ${stem}`);
}

// --log-all: the model re-confirmed this topic. Still written, just not a change.
function logSame(q: any, topic: string) {
  const stem = String(q.question_text || "").replace(/\s+/g, " ").slice(0, 55);
  console.log(`    ${"".padEnd(26)}   ${topic.padEnd(26)}  ${stem}`);
}

async function processMock(
  mock: { id: string; title: string; questions: any },
  topicMap: Record<string, string[]>,
  isDry: boolean,
  isForce: boolean,
  isLogAll: boolean,
) {
  const questions: any[] = (mock.questions as any[]) || [];

  // A question needs work if forced, or its topic is missing/placeholder, or the
  // topic it carries simply isn't a PYQ topic for its subject. Exact-cased hits on
  // the allowed list are already correct and cost nothing to keep.
  const needsWork = (q: any): boolean => {
    if (isForce) return true;
    const current = String(q.topic || "").trim();
    if (!current || current === "Unknown" || current === "Uncategorized") return true;
    const bucket = bucketFor(q.subject);
    if (!bucket) return false; // unmapped subject — reported, left alone
    return !topicsForBucket(bucket, topicMap).includes(current);
  };

  const toProcess = questions.filter(needsWork);
  const unmapped = questions.filter((q) => !bucketFor(q.subject));

  console.log(`  Total: ${questions.length} | Questions to process: ${toProcess.length}`);
  if (unmapped.length) {
    const names = [...new Set(unmapped.map((q) => String(q.subject ?? "(none)")))].join(", ");
    console.log(`  [!] ${unmapped.length} question(s) with unmapped subject (${names}) — left as-is`);
  }
  if (toProcess.length === 0) { console.log("  Nothing to do."); return { fixed: 0, changed: 0, failed: 0 }; }

  let fixed = 0, changed = 0, failed = 0;

  // The JSON script handles one subject per file; a mock holds all three, so loop
  // the buckets and run the same per-subject flow for each.
  const byBucket = new Map<Bucket, any[]>();
  for (const q of toProcess) {
    const bucket = bucketFor(q.subject);
    if (!bucket) continue;
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket)!.push(q);
  }

  for (const [subject, qs] of byBucket) {
    const allowedTopics = topicsForBucket(subject, topicMap);
    if (allowedTopics.length === 0) {
      console.log(`  [!] No topics found for subject "${subject}" — skipping ${qs.length} question(s)`);
      failed += qs.length;
      continue;
    }
    console.log(`  Using ${allowedTopics.length} topics for subject: ${subject}`);

    // FREE pass first: a topic that differs only in case/punctuation from an
    // allowed one is fixed with no API call ("Chemical kinetics" → "Chemical Kinetics").
    // Skipped under --force, which re-classifies everything through the model.
    const stillPending: any[] = [];
    let normalised = 0;
    for (const q of qs) {
      const current = String(q.topic || "").trim();
      const hit = !isForce && current
        ? allowedTopics.find((t) => norm(t) === norm(current))
        : undefined;
      if (!hit) { stillPending.push(q); continue; }
      if (hit !== current) {
        logChange(q, current, hit);
        q.topic = hit;
        normalised++;
      }
    }
    if (normalised > 0) {
      fixed += normalised; changed += normalised;
      console.log(`  ✓ (${normalised} case-fixed with no API call)`);
      if (!isDry) await saveMock(mock.id, questions);
    }

    // Text questions → BATCH_SIZE packed into ONE request each (the speed win).
    // Image questions → single-question path so Gemini can see the figure.
    const textQs = stillPending.filter((q) => !hasUsableImage(q));
    const imageQs = stillPending.filter((q) => hasUsableImage(q));
    if (textQs.length === 0 && imageQs.length === 0) continue;
    console.log(`  Model: ${TOPIC_MODEL} | text: ${textQs.length} (batched ${BATCH_SIZE}/call), with-image: ${imageQs.length} (individual) | ${CONCURRENCY} in flight`);

    // Text batches, CONCURRENCY at a time. Saving once per wave (not per batch)
    // keeps the incremental-progress guarantee without racing writes on the row.
    const batches: any[][] = [];
    for (let i = 0; i < textQs.length; i += BATCH_SIZE) batches.push(textQs.slice(i, i + BATCH_SIZE));

    for (let w = 0; w < batches.length; w += CONCURRENCY) {
      const wave = batches.slice(w, w + CONCURRENCY);
      console.log(`  Text batch [${w + 1}-${Math.min(w + wave.length, batches.length)}/${batches.length}]`);

      const results = await Promise.all(wave.map((b) => generateTopicsBatch(b, allowedTopics)));
      let n = 0, c = 0, total = 0;
      wave.forEach((batch, bi) => {
        total += batch.length;
        batch.forEach((q, j) => {
          const before = String(q.topic ?? "");
          const topic = results[bi][j];
          if (topic && topic !== "Unknown") {
            // Every assigned topic is written; the log is quiet about the ones that
            // didn't move unless --log-all asks for the full list.
            if (topic !== before) { logChange(q, before, topic); c++; }
            else if (isLogAll) logSame(q, topic);
            q.topic = topic;
            n++;
          }
        });
      });
      fixed += n; changed += c;
      failed += total - n;
      console.log(`  ✓ (${n}/${total} assigned, ${c} changed)`);

      if (!isDry && c > 0) await saveMock(mock.id, questions);
    }

    if (imageQs.length > 0) {
      console.log(`  Image questions [${imageQs.length}]`);
      const topics = await inWaves(imageQs, CONCURRENCY, (q) => generateTopic(q, allowedTopics));
      let n = 0, c = 0;
      topics.forEach((topic, j) => {
        const before = String(imageQs[j].topic ?? "");
        if (topic && topic !== "Unknown") {
          if (topic !== before) { logChange(imageQs[j], before, topic); c++; }
          else if (isLogAll) logSame(imageQs[j], topic);
          imageQs[j].topic = topic;
          n++;
        }
      });
      fixed += n; changed += c;
      failed += imageQs.length - n;
      console.log(`  ✓ (${n}/${imageQs.length} assigned, ${c} changed)`);

      if (!isDry && c > 0) await saveMock(mock.id, questions);
    }
  }

  // --force means "rewrite the row", not "rewrite only what moved": every question's
  // topic is written back as the exact Pattern.topic_name the model picked, the
  // topics[] index is recomputed, and the cache is dropped — even if the values are
  // byte-identical to what was already there.
  if (!isDry && (changed > 0 || isForce)) {
    console.log(`  [Save] Final save…`);
    await saveMock(mock.id, questions);
    // lib/mockTemplate caches templates in Redis with NO TTL, so a direct DB write
    // is invisible to students until the key is dropped. Seed scripts skip this
    // (see docs/paid-tests-plan.md); we must not. No-ops if Redis isn't configured.
    await invalidateMockTemplate(mock.id);
    console.log(`  [Cache] template ${mock.id} invalidated`);
  }

  console.log(`  Done: ${fixed} assigned, ${changed} changed, ${failed} failed`);
  return { fixed, changed, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const titleArg = arg("--title");
  const idArg = arg("--id");
  const examArg = arg("--exam") || "NEET";
  const limitArg = arg("--limit");
  const isDry = args.includes("--dry");
  const isForce = args.includes("--force");
  const isLogAll = args.includes("--log-all");

  if (!args.includes("--auto") && !titleArg && !idArg) {
    console.log(`
Usage:
  --auto             Process ALL ${examArg} mocks in the DB
  --title <substr>   Only mocks whose title contains this
  --id <uuid>        A single MockTestTemplate by id
  --exam <type>      Exam type (default: NEET)
  --limit <n>        Cap how many mocks to process
  --dry              Dry run — print results without writing to the DB
  --force            Re-classify and rewrite EVERY question, then save the row even
                     if no value moved (by default, keeps topics that are already
                     valid PYQ topics for their subject and skips untouched rows)
  --log-all          Print every question's topic, not just the ones that changed

Examples:
  DB_DRIVER=standard npx tsx scripts/db-topics-neet.ts --auto --dry
  DB_DRIVER=standard npx tsx scripts/db-topics-neet.ts --auto
  DB_DRIVER=standard npx tsx scripts/db-topics-neet.ts --title "NEET 2024" --force
    `);
    process.exit(0);
  }

  const dbHost = (() => { try { return new URL(databaseUrl!).host; } catch { return "(unparseable)"; } })();
  console.log(`\nDB_DRIVER=${driver}  🎯 Target DB: ${dbHost}${isDry ? "  [DRY RUN]" : ""}`);
  console.log(
    USE_VERTEX
      ? `Backend: Vertex AI (${process.env.VERTEX_PROJECT || "?"} / ${process.env.VERTEX_LOCATION || "us-central1"}) — model ${TOPIC_MODEL}, ${CONCURRENCY} in flight`
      : `Backend: Developer API (GEMINI_API_KEY) — model ${TOPIC_MODEL}\n` +
        `  [!] No pacing or retry in this script — the free tier's ~15 req/min WILL 429 and drop\n` +
        `      questions. Set GEMINI_USE_VERTEX=1 (it lives in .env.local) before a real run.`
  );
  console.log("");

  console.log(`Fetching topics for exam: ${examArg}...`);
  const topicMap = await getAllTopics(examArg);
  const totalTopics = Object.values(topicMap).flat().length;
  console.log(`Found ${totalTopics} topics across ${Object.keys(topicMap).length} subjects.`);
  for (const b of ["PHYSICS", "CHEMISTRY", "BIOLOGY"] as Bucket[]) {
    console.log(`  ${b}: ${topicsForBucket(b, topicMap).length} topics`);
  }
  if (totalTopics === 0) {
    console.error(`No ${examArg} patterns found — nothing to match against. Wrong DB?`);
    process.exit(1);
  }

  const mocks = await prisma.mockTestTemplate.findMany({
    where: idArg
      ? { id: idArg }
      : { exam_type: examArg, ...(titleArg ? { title: { contains: titleArg } } : {}) },
    select: { id: true, title: true, questions: true },
    orderBy: { mock_number: "asc" },
    ...(limitArg ? { take: Number(limitArg) } : {}),
  });

  if (mocks.length === 0) { console.log(`\nNo ${examArg} mocks matched.`); return; }
  console.log(`\nFound ${mocks.length} mock(s)\n`);

  let totalFixed = 0, totalChanged = 0, totalFailed = 0;
  for (let mi = 0; mi < mocks.length; mi++) {
    const mock = mocks[mi];
    console.log(`\n[${mi + 1}/${mocks.length}] "${mock.title}"`);
    const { fixed, changed, failed } = await processMock(mock, topicMap, isDry, isForce, isLogAll);
    totalFixed += fixed;
    totalChanged += changed;
    totalFailed += failed;
  }

  if (isDry) {
    console.log(`\n[DRY RUN] No changes written. ${totalFixed} classified, ${totalChanged} would change.`);
  } else {
    console.log(`\nAll done! ${totalFixed} topics assigned, ${totalChanged} changed, ${totalFailed} failed.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
