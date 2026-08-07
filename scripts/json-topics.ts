/**
 * Generate topics for questions in a local JSON file — runs before seeding, zero DB bloat.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/json-topics.ts --file <path>
 *   npx ts-node --project tsconfig.json scripts/json-topics.ts --file scratch/mocks.json --exam JEE_MAIN
 *   npx ts-node --project tsconfig.json scripts/json-topics.ts --file scratch/mocks.json --dry
 *   npx ts-node --project tsconfig.json scripts/json-topics.ts --auto --dir scrapers/prepp-gate/output --exam JEE_MAIN
 *
 * JSON format: array of mock objects, each with a `questions` array.
 */

import { PrismaClient } from "@prisma/client";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { getImageUrl } from "../lib/imageUtils";

// Precedence: inline env > .env.local > .env — same as Next.js. VERTEX_* live in
// .env.local, so loading only .env (what this script used to do) pinned the client
// to us-central1, where Gemini 3.x 404s.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.VERTEX_PROJECT || "project-27ed127f-554a-419a-b39",
  // MUST be "global" for 3.x — gemini-3.5-flash-lite 404s on regional endpoints.
  location: process.env.VERTEX_LOCATION || "global",
});

// Classification is a cheap, high-volume call, so flash-lite. Override with
// TOPIC_MODEL if Vertex in your region doesn't serve this id.
const TOPIC_MODEL = process.env.TOPIC_MODEL || "gemini-3.5-flash-lite";

// Text questions packed into ONE request. Vertex quotas are generous, so this is
// about round-trips, not rate limits — 15 keeps prompts well inside the window.
const BATCH_SIZE = Number(process.env.TOPIC_BATCH_SIZE || 15);

// Gemini 3.x controls thinking by LEVEL (a numeric budget is rejected); 2.5 uses a
// numeric budget (0 = skip). Classification is light, so keep thinking minimal.
function topicThinking(model: string): Record<string, unknown> {
  return /gemini-3/i.test(model) ? { thinkingLevel: "LOW" } : { thinkingBudget: 0 };
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

function cleanTopic(text: string, allowedTopics: string[]): string {
  let cleaned = text.trim().replace(/^['"*]+|['"*]+$/g, "").trim();
  if (allowedTopics.includes(cleaned)) return cleaned;
  const match = allowedTopics.find((t) => t.toLowerCase() === cleaned.toLowerCase());
  return match || "Unknown";
}

// Question images only — an explanation figure gives away nothing about which
// topic the question belongs to, and costs a fetch plus prompt tokens.
function questionImages(q: { images?: any[] }): any[] {
  return ((q.images as any[]) || []).filter((i) => i && i.type !== "explanation" && (i.filename || i.url));
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

// Build the batch prompt AND the image parts that go with it. Figures are
// attached inline and referred to by number from the question that owns them
// ("Refer to Image 3"), which is how scripts/generate-topics.ts already feeds
// diagram questions to Gemini in bulk — a question with a figure no longer
// needs its own request just to be seen.
async function buildBatchContents(questions: any[], allowedTopics: string[]) {
  const parts: any[] = [];
  let imageNo = 0;

  let blocks = "";
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    blocks += `=== Question ${i + 1} ===\n${q.question_text}\nOptions: ${JSON.stringify(q.options ?? [])}\n`;
    const refs: number[] = [];
    for (const img of questionImages(q)) {
      const data = await fetchImageAsBase64(img.filename || img.url);
      if (!data) continue; // unreachable image — the stem alone still classifies
      parts.push({ inlineData: data });
      refs.push(++imageNo);
    }
    if (refs.length) {
      blocks += `(Refer to ${refs.length === 1 ? `Image ${refs[0]}` : `Images ${refs.join(", ")}`} for this question)\n`;
    }
    blocks += "\n";
  }

  const prompt = `You are an academic expert. Categorize EACH exam question below into EXACTLY ONE topic from the allowed list.

--- ALLOWED TOPICS START ---
${allowedTopics.join("\n")}
--- ALLOWED TOPICS END ---

Rules:
1. Use ONLY a topic name that appears verbatim in the list above.
2. If a question doesn't fit perfectly, pick the closest match.
3. Return one object per question using its 1-based index; include every index exactly once.
4. Attached images are numbered in order; each question names the image(s) that belong to it.

${blocks}`;

  // Prompt first, then every figure in the order the prompt numbers them.
  parts.unshift({ text: prompt });
  return { parts, imageCount: imageNo };
}

// Classify up to BATCH_SIZE questions — text and diagram alike — in a SINGLE
// request. Returns topics aligned to the input order (null where the model
// didn't answer / errored).
async function generateTopicsBatch(questions: any[], allowedTopics: string[]): Promise<(string | null)[]> {
  const out = new Array<string | null>(questions.length).fill(null);
  if (allowedTopics.length === 0 || questions.length === 0) return out;
  try {
    const { parts } = await buildBatchContents(questions, allowedTopics);
    const result = await ai.models.generateContent({
      model: TOPIC_MODEL,
      config: {
        thinkingConfig: topicThinking(TOPIC_MODEL),
        responseMimeType: "application/json",
        responseSchema: TOPIC_SCHEMA as any,
      },
      contents: parts,
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

function saveJson(filePath: string, data: any[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// Print prev → new topic for one question, with a snippet of the stem.
function logChange(q: any, before: string, after: string) {
  const stem = String(q.question_text || "").replace(/\s+/g, " ").slice(0, 55);
  console.log(`    ${String(before || "(none)").padEnd(26)} → ${after.padEnd(26)}  ${stem}`);
}

async function processFile(filePath: string, topicMap: Record<string, string[]>, isDry: boolean) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  const raw: any = JSON.parse(fs.readFileSync(absPath, "utf-8"));

  // Flat array of questions (scraper format) — wrap for uniform processing, save unwrapped.
  const isFlatArray = Array.isArray(raw) && raw.length > 0 && raw[0].question_text;
  const data: any[] = isFlatArray
    ? [{ title: path.basename(filePath), questions: raw }]
    : raw;

  // Subject from parent directory name (e.g. chemistry/02_sep_s1_chemistry.json → CHEMISTRY).
  // Used as a fallback when a question has no `subject` field.
  const subjectFromPath = path.basename(path.dirname(absPath)).toUpperCase();

  console.log(`\nLoaded ${isFlatArray ? data[0].questions.length : data.length} question(s) from ${absPath} [path subject: ${subjectFromPath}]`);

  let totalFixed = 0, totalFailed = 0;

  // Known subjects, used to detect scraper output where `topic_name` was filled with
  // just the subject name (e.g. topic_name: "Physics") — that's a subject, not a topic,
  // so treat those as un-categorized and re-run them through Gemini.
  const KNOWN_SUBJECTS = new Set(
    Object.keys(topicMap).map((s) => s.toUpperCase())
  );
  // Always recognize the common ones even if not in topicMap yet
  ["PHYSICS", "CHEMISTRY", "MATHEMATICS", "MATHS", "BIOLOGY", "BOTANY", "ZOOLOGY"]
    .forEach((s) => KNOWN_SUBJECTS.add(s));

  const isMissingTopic = (q: any): boolean => {
    if (!q.topic_name) return true;
    const t = String(q.topic_name).trim();
    if (t === "" || t === "Unknown" || t === "Uncategorized") return true;
    if (KNOWN_SUBJECTS.has(t.toUpperCase())) return true; // subject name used as topic
    return false;
  };

  for (let mi = 0; mi < data.length; mi++) {
    const mock = data[mi];
    const questions: any[] = mock.questions || [];
    const missing = questions.filter(isMissingTopic);

    console.log(`\n[${mi + 1}/${data.length}] "${mock.title || mock.id}"`);
    console.log(`  Total: ${questions.length} | Missing topics: ${missing.length}`);
    if (missing.length === 0) { console.log("  Nothing to do."); continue; }

    let fixed = 0, failed = 0;

    // Per-question subject is authoritative — physics question gets physics topics,
    // chemistry question gets chemistry topics, even if they live in the same file.
    // Source order: explicit q.subject → q.topic_name when it's actually a subject name
    // (scraper quirk) → path-derived directory name → "GENERAL".
    const resolveSubject = (q: any): string => {
      const topicLooksLikeSubject =
        q.topic_name && KNOWN_SUBJECTS.has(String(q.topic_name).trim().toUpperCase());
      const rawSubject =
        q.subject || (topicLooksLikeSubject ? q.topic_name : null) || subjectFromPath || "GENERAL";
      return String(rawSubject).toUpperCase().trim();
    };

    // Group by subject first — a batch must share one allowed-topics list.
    const subjectGroups: Record<string, any[]> = {};
    for (const q of missing) {
      const subject = resolveSubject(q);
      // Persist it. Scrapers that park the subject in `topic_name` (prepp-gate)
      // lose it the moment we overwrite that field with the real topic, and then
      // nothing downstream — the mock seeder above all — can tell a Physics
      // question from a Maths one.
      if (!q.subject) q.subject = subject;
      (subjectGroups[subject] ||= []).push(q);
    }

    for (const [subject, group] of Object.entries(subjectGroups)) {
      const allowedTopics = topicMap[subject];
      if (!allowedTopics || allowedTopics.length === 0) {
        console.log(`  [!] No topics in DB for subject "${subject}" — skipping its ${group.length} question(s)`);
        failed += group.length;
        totalFailed += group.length;
        continue;
      }

      // One path for everything: diagram questions ride along in the batch with
      // their figures attached and referenced by number.
      const withImages = group.filter((q) => questionImages(q).length > 0).length;
      console.log(
        `  [${subject}] ${allowedTopics.length} topics | ${group.length} question(s), ${withImages} with figures, batched ${BATCH_SIZE}/call`
      );

      const totalBatches = Math.ceil(group.length / BATCH_SIZE);
      for (let i = 0; i < group.length; i += BATCH_SIZE) {
        const batch = group.slice(i, i + BATCH_SIZE);
        console.log(`  [${subject}] batch ${Math.floor(i / BATCH_SIZE) + 1}/${totalBatches}`);

        const topics = await generateTopicsBatch(batch, allowedTopics);
        let n = 0;
        batch.forEach((q, j) => {
          const before = q.topic_name ?? "";
          if (topics[j] && topics[j] !== "Unknown") {
            logChange(q, before, topics[j]!);
            q.topic_name = topics[j]; // mutate in place — q references mock.questions
            n++;
          } else {
            logChange(q, before, "✗ failed");
          }
        });
        fixed += n; totalFixed += n;
        failed += batch.length - n; totalFailed += batch.length - n;
        console.log(`  ✓ (${n}/${batch.length} assigned)`);

        if (!isDry && n > 0) saveJson(absPath, isFlatArray ? mock.questions : data);
      }
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

const DEFAULT_AUTO_DIR = "scratch/jeemains";

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
  const examArg = examIdx !== -1 ? args[examIdx + 1] : "JEE Main";
  const isDry = args.includes("--dry");
  const dirIdx = args.indexOf("--dir");
  const autoDir =
    dirIdx !== -1 && args[dirIdx + 1] && !args[dirIdx + 1].startsWith("--")
      ? args[dirIdx + 1]
      : DEFAULT_AUTO_DIR;

  console.log(`Fetching topics for exam: ${examArg}...`);
  const topicMap = await getAllTopics(examArg);
  console.log(`Found ${Object.values(topicMap).flat().length} topics across ${Object.keys(topicMap).length} subjects.\n`);

  if (args.includes("--auto")) {
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
      await processFile(file, topicMap, isDry);
    }
    console.log("\nAuto mode complete!");
    await prisma.$disconnect();
    return;
  }

  if (!fileArg || fileArg.startsWith("--")) {
    console.log(`
Usage:
  --file <path>      Path to JSON file (array of mock objects with questions)
  --auto             Process all JSON files in a directory (recursive)
  --dir <path>       Directory for --auto (default: ${DEFAULT_AUTO_DIR})
  --exam <type>      Exam type for topic lookup (default: JEE_MAIN)
  --dry              Dry run — print results without writing to file

Examples:
  npx ts-node --project tsconfig.json scripts/json-topics.ts --file scratch/mocks.json
  npx ts-node --project tsconfig.json scripts/json-topics.ts --auto
  npx ts-node --project tsconfig.json scripts/json-topics.ts --auto --dir scrapers/prepp-gate/output --exam JEE_MAIN
  npx ts-node --project tsconfig.json scripts/json-topics.ts --auto --exam GATE
  npx ts-node --project tsconfig.json scripts/json-topics.ts --auto --dry
    `);
    process.exit(0);
  }

  await processFile(fileArg, topicMap, isDry);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
