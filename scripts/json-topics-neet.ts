/**
 * Generate topics for questions in a local JSON file for NEET — runs before seeding, zero DB bloat.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --file <path>
 *   npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --auto
 *   npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --dry
 *
 * JSON format: array of mock objects, each with a `questions` array.
 */

import { PrismaClient } from "@prisma/client";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { getImageUrl } from "../lib/imageUtils";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// Backend toggle (mirrors lib/coachingImport.ts): GEMINI_USE_VERTEX=1 → Vertex AI
// (GCP ADC, high quota); otherwise the Developer API with GEMINI_API_KEY (free
// tier is ~15 req/min — see BATCH_SIZE/delay note below). Both use the same
// @google/genai generateContent shape, so nothing else changes.
const ai = process.env.GEMINI_USE_VERTEX === "0"
  ? new GoogleGenAI({
      vertexai: true,
      project: process.env.VERTEX_PROJECT || "project-27ed127f-554a-419a-b39",
      location: process.env.VERTEX_LOCATION || "us-central1",
    })
  : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Topic classification model. gemini-3.1-flash-lite is fast/cheap and served on
// the Developer API; on Vertex it isn't reliable, so 2.5-flash is the fallback.
// Override with TOPIC_MODEL.
const TOPIC_MODEL = process.env.TOPIC_MODEL
  || (process.env.GEMINI_USE_VERTEX === "0" ? "gemini-2.5-flash" : "gemini-3.1-flash-lite");

// Gemini 3.x controls thinking by LEVEL (a numeric budget is rejected); 2.5 uses a
// numeric budget (0 = skip). Classification is light, so keep thinking minimal.
function topicThinking(model: string): Record<string, unknown> {
  return /gemini-3/i.test(model) ? { thinkingLevel: "LOW" } : { thinkingBudget: 0 };
}

const BATCH_SIZE = 15;        // text questions packed into ONE request
// Proactive pacing: the Developer API free tier for flash-lite is ~15 req/min, so
// ~4.5s between requests keeps us under it (~13/min). Override with TOPIC_DELAY_MS
// (e.g. set to 500 on a paid key for speed). generateWithRetry is the backstop.
const BATCH_DELAY_MS = Number(process.env.TOPIC_DELAY_MS || 4500);
const MAX_RETRIES = 6;
const RATE_LIMIT_WAIT_MS = 60000; // fallback wait when the 429 carries no retryDelay

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err: any): boolean {
  const m = String(err?.message || err).toLowerCase();
  return m.includes("429") || m.includes("quota") || m.includes("rate limit")
    || m.includes("resource_exhausted") || m.includes("resource exhausted");
}

// Gemini 429s usually carry a suggested wait, e.g. `"retryDelay":"37s"`. Honour it
// (plus a 1s cushion) when present; otherwise fall back to a fixed wait.
function retryDelayMs(err: any): number {
  const m = String(err?.message || "").match(/retryDelay"?\s*:\s*"?(\d+)s/i);
  return m ? (Number(m[1]) + 1) * 1000 : RATE_LIMIT_WAIT_MS;
}

// One Gemini call with rate-limit handling: on a 429 it WAITS (not counting it as
// an attempt) and retries indefinitely; other errors get a few exponential retries
// before giving up. So a per-minute quota just pauses the run instead of dropping
// questions.
async function generateWithRetry(req: any, label: string): Promise<any> {
  let attempt = 0;
  for (;;) {
    try {
      return await ai.models.generateContent(req);
    } catch (err: any) {
      if (isRateLimit(err)) {
        const wait = retryDelayMs(err);
        console.warn(`  [rate-limit] ${label}: quota hit — waiting ${Math.round(wait / 1000)}s then retrying…`);
        await sleep(wait);
        continue; // don't consume a retry attempt for throttling
      }
      if (++attempt >= MAX_RETRIES) throw err;
      const backoff = 2000 * 2 ** (attempt - 1);
      console.warn(`  [retry] ${label}: ${err?.message} — retrying in ${backoff}ms (${attempt}/${MAX_RETRIES})`);
      await sleep(backoff);
    }
  }
}

async function fetchImageAsBase64(filename: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Resolve via the app's ImageKit resolver (lib/imageUtils.getImageUrl), which
    // prefixes pattern-master/ and appends the ImageKit transform. Needs
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

function cleanTopic(text: string, allowedTopics: string[]): string {
  let cleaned = text.trim().replace(/^['"*]+|['"*]+$/g, "").trim();
  if (allowedTopics.includes(cleaned)) return cleaned;
  const match = allowedTopics.find((t) => t.toLowerCase() === cleaned.toLowerCase());
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

    const result = await generateWithRetry({
      model: TOPIC_MODEL,
      config: { thinkingConfig: topicThinking(TOPIC_MODEL) },
      contents: parts.map((p) =>
        typeof p === "string" ? p : p.inlineData ? { inlineData: p.inlineData } : p
      ),
    }, "image-q");

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
    const result = await generateWithRetry({
      model: TOPIC_MODEL,
      config: {
        thinkingConfig: topicThinking(TOPIC_MODEL),
        responseMimeType: "application/json",
        responseSchema: TOPIC_SCHEMA as any,
      },
      contents: buildBatchPrompt(questions, allowedTopics),
    }, "batch");
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

function saveJson(filePath: string, data: any[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// Print prev → current topic for one question, with a snippet of the stem.
function logChange(q: any, before: string, after: string) {
  const stem = String(q.question_text || "").replace(/\s+/g, " ").slice(0, 55);
  console.log(`    ${String(before || "(none)").padEnd(26)} → ${after.padEnd(26)}  ${stem}`);
}

async function processFile(filePath: string, topicMap: Record<string, string[]>, isDry: boolean, isForce: boolean) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  const raw: any = JSON.parse(fs.readFileSync(absPath, "utf-8"));

  const isFlatArray = Array.isArray(raw) && raw.length > 0 && raw[0].question_text;
  const data: any[] = isFlatArray
    ? [{ title: path.basename(filePath), questions: raw }]
    : raw;

  // Subject from parent directory name or filename (handle NEET folder structure and split files)
  const dirName = path.basename(path.dirname(absPath)).toUpperCase();
  const fileName = path.basename(absPath).toUpperCase();
  let subjectFromPath = dirName;

  if (fileName.includes("_PHYSICS")) {
    subjectFromPath = "PHYSICS";
  } else if (fileName.includes("_CHEMISTRY")) {
    subjectFromPath = "CHEMISTRY";
  } else if (fileName.includes("_BOTANY") || fileName.includes("_ZOOLOGY") || fileName.includes("_BIOLOGY")) {
    subjectFromPath = "BIOLOGY";
  } else if (dirName.includes("NEET_BIO")) {
    subjectFromPath = "BIOLOGY";
  } else if (dirName.includes("NEET_PHY_CHEM")) {
    subjectFromPath = "PHY_CHEM";
  }

  console.log(`\nLoaded ${isFlatArray ? data[0].questions.length : data.length} question(s) from ${absPath} [subject mapped: ${subjectFromPath}]`);

  let totalFixed = 0, totalFailed = 0;

  for (let mi = 0; mi < data.length; mi++) {
    const mock = data[mi];
    const questions: any[] = mock.questions || [];
    const toProcess = isForce
      ? questions
      : questions.filter(
        (q) => !q.topic_name || q.topic_name.trim() === "" || q.topic_name === "Unknown" || q.topic_name === "Uncategorized"
      );

    console.log(`\n[${mi + 1}/${data.length}] "${mock.title || mock.id}"`);
    console.log(`  Total: ${questions.length} | Questions to process: ${toProcess.length}`);
    if (toProcess.length === 0) { console.log("  Nothing to do."); continue; }

    let fixed = 0, failed = 0;

    const subject = subjectFromPath || "GENERAL";
    let allowedTopics: string[] = [];

    // Combine topics for combined Physics/Chemistry files or general NEET files
    if (subject === "PHY_CHEM") {
      allowedTopics = [...(topicMap["PHYSICS"] || []), ...(topicMap["CHEMISTRY"] || [])];
    } else if (subject === "NEET" || subject === "GENERAL") {
      allowedTopics = Object.values(topicMap).flat();
    } else {
      allowedTopics = topicMap[subject] || [];
    }

    if (allowedTopics.length === 0) {
      console.log(`  [!] No topics found for subject "${subject}" — skipping file`);
      continue;
    }
    console.log(`  Using ${allowedTopics.length} topics for subject: ${subject}`);

    // Text questions → BATCH_SIZE packed into ONE request each (the speed win).
    // Image questions → single-question path so Gemini can see the figure.
    const textQs = toProcess.filter((q) => !hasUsableImage(q));
    const imageQs = toProcess.filter((q) => hasUsableImage(q));
    console.log(`  Model: ${TOPIC_MODEL} | text: ${textQs.length} (batched ${BATCH_SIZE}/call), with-image: ${imageQs.length} (individual)`);

    const totalBatches = Math.ceil(textQs.length / BATCH_SIZE);
    for (let i = 0; i < textQs.length; i += BATCH_SIZE) {
      const batch = textQs.slice(i, i + BATCH_SIZE);
      console.log(`  Text batch [${Math.floor(i / BATCH_SIZE) + 1}/${totalBatches}]`);

      const topics = await generateTopicsBatch(batch, allowedTopics);
      let n = 0;
      batch.forEach((q, j) => {
        const before = q.topic_name ?? "";
        if (topics[j] && topics[j] !== "Unknown") {
          logChange(q, before, topics[j]!);
          q.topic_name = topics[j];
          n++;
        }
      });
      fixed += n; totalFixed += n;
      failed += batch.length - n; totalFailed += batch.length - n;
      console.log(`  ✓ (${n}/${batch.length} assigned)`);

      if (!isDry) saveJson(absPath, isFlatArray ? mock.questions : data);
      if (i + BATCH_SIZE < textQs.length) await sleep(BATCH_DELAY_MS);
    }

    // Image questions: small parallel fan-out, each with its figure attached.
    const IMG_CONCURRENCY = 2; // small fan-out — keep the per-minute request rate low
    const imgBatches = Math.ceil(imageQs.length / IMG_CONCURRENCY);
    for (let i = 0; i < imageQs.length; i += IMG_CONCURRENCY) {
      const batch = imageQs.slice(i, i + IMG_CONCURRENCY);
      console.log(`  Image batch [${Math.floor(i / IMG_CONCURRENCY) + 1}/${imgBatches}]`);

      const topics = await Promise.all(batch.map((q) => generateTopic(q, allowedTopics)));
      let n = 0;
      topics.forEach((topic, j) => {
        const before = batch[j].topic_name ?? "";
        if (topic && topic !== "Unknown") {
          logChange(batch[j], before, topic);
          batch[j].topic_name = topic;
          n++;
        }
      });
      fixed += n; totalFixed += n;
      failed += batch.length - n; totalFailed += batch.length - n;
      console.log(`  ✓ (${n}/${batch.length} assigned)`);

      if (!isDry) saveJson(absPath, isFlatArray ? mock.questions : data);
      if (i + IMG_CONCURRENCY < imageQs.length) await sleep(BATCH_DELAY_MS);
    }

    if (!isDry && fixed > 0) {
      console.log(`  [Save] Final save…`);
      saveJson(absPath, isFlatArray ? mock.questions : data);
    }

    console.log(`  Done: ${fixed} fixed, ${failed} failed`);
  }

  if (isDry) {
    console.log(`\n[DRY RUN] No changes written. Would have fixed ${totalFixed} topics.`);
  } else {
    console.log(`\nAll done! ${totalFixed} topics assigned, ${totalFailed} failed.`);
    console.log(`File saved: ${absPath}`);
  }
}

const AUTO_DIR = "scratch/neet";

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith(".json")) results.push(full);
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args[args.indexOf("--file") + 1];
  const examIdx = args.indexOf("--exam");
  const examArg = examIdx !== -1 ? args[examIdx + 1] : "NEET";
  const isDry = args.includes("--dry");
  const isForce = args.includes("--force");

  console.log(`Fetching topics for exam: ${examArg}...`);
  const topicMap = await getAllTopics(examArg);
  console.log(`Found ${Object.values(topicMap).flat().length} topics across ${Object.keys(topicMap).length} subjects.\n`);

  if (args.includes("--auto")) {
    const dirIdx = args.indexOf("--dir");
    const autoDir = dirIdx !== -1 ? args[dirIdx + 1] : AUTO_DIR;
    const dirPath = path.resolve(autoDir);
    if (!fs.existsSync(dirPath)) {
      console.error(`Auto dir not found: ${dirPath}`);
      process.exit(1);
    }
    const files = findJsonFiles(dirPath);
    if (files.length === 0) {
      console.log(`No JSON files found in ${dirPath}`);
      process.exit(0);
    }
    console.log(`Found ${files.length} file(s) in ${autoDir}\n`);
    for (const file of files) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`File: ${file}`);
      console.log("=".repeat(60));
      await processFile(file, topicMap, isDry, isForce);
    }
    console.log("\nAuto mode complete!");
    return;
  }

  if (!fileArg || fileArg.startsWith("--")) {
    console.log(`
Usage:
  --file <path>      Path to JSON file (array of mock objects with questions)
  --auto             Process all JSON files in ${AUTO_DIR}/
  --exam <type>      Exam type to fetch topics for (default: NEET)
  --dry              Dry run — print results without writing to file
  --force            Force rewrite of existing topic names (by default, skips already assigned topics)

Examples:
  npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --file scratch/mocks.json
  npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --auto
  npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --auto --dry
  npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --file scratch/mocks.json --force
    `);
    process.exit(0);
  }

  await processFile(fileArg, topicMap, isDry, isForce);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
