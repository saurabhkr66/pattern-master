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
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const ai = new GoogleGenAI({
  vertexai: true,
  project: "project-27ed127f-554a-419a-b39",
  location: "us-central1",
});

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

function getCloudinaryUrl(filename: string): string {
  if (!filename) return "";
  if (filename.startsWith("http")) return filename;
  const clean = filename.replace(/^\/+/, "").replace("images/questions/", "");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/pattern-master/${clean}`;
}

async function fetchImageAsBase64(filename: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const url = getCloudinaryUrl(filename);
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

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

function saveJson(filePath: string, data: any[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function processFile(filePath: string, topicMap: Record<string, string[]>, isDry: boolean) {
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

  // Subject from parent directory name (handle NEET folder structure)
  const dirName = path.basename(path.dirname(absPath)).toUpperCase();
  let subjectFromPath = dirName;
  if (dirName.includes("NEET_BIO")) subjectFromPath = "BIOLOGY";
  else if (dirName.includes("NEET_PHY_CHEM")) subjectFromPath = "PHY_CHEM";

  console.log(`\nLoaded ${isFlatArray ? data[0].questions.length : data.length} question(s) from ${absPath} [subject mapped: ${subjectFromPath}]`);

  let totalFixed = 0, totalFailed = 0;

  for (let mi = 0; mi < data.length; mi++) {
    const mock = data[mi];
    const questions: any[] = mock.questions || [];
    const missing = questions.filter(
      (q) => !q.topic_name || q.topic_name.trim() === "" || q.topic_name === "Unknown" || q.topic_name === "Uncategorized"
    );

    console.log(`\n[${mi + 1}/${data.length}] "${mock.title || mock.id}"`);
    console.log(`  Total: ${questions.length} | Missing topics: ${missing.length}`);
    if (missing.length === 0) { console.log("  Nothing to do."); continue; }

    let fixed = 0, failed = 0;

    const subject = subjectFromPath || "GENERAL";
    let allowedTopics: string[] = [];

    // Combine topics for combined Physics/Chemistry files
    if (subject === "PHY_CHEM") {
      allowedTopics = [...(topicMap["PHYSICS"] || []), ...(topicMap["CHEMISTRY"] || [])];
    } else {
      allowedTopics = topicMap[subject] || [];
    }

    if (allowedTopics.length === 0) {
      console.log(`  [!] No topics found for subject "${subject}" — skipping file`);
      continue;
    }
    console.log(`  Using ${allowedTopics.length} topics for subject: ${subject}`);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const BATCH_SIZE = 10;
    console.log(`  Processing in batches of ${BATCH_SIZE} with a 1.5s delay...`);

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(missing.length / BATCH_SIZE);

      process.stdout.write(`  Batch [${batchIndex}/${totalBatches}] processing... `);

      const promises = batch.map(async (q) => {
        const topic = await generateTopic(q, allowedTopics);
        if (topic && topic !== "Unknown") {
          q.topic_name = topic;
          return true;
        }
        return false;
      });

      const results = await Promise.all(promises);
      const fixedInBatch = results.filter(Boolean).length;
      fixed += fixedInBatch;
      totalFixed += fixedInBatch;

      console.log(`✓ (${fixedInBatch}/${batch.length} assigned)`);

      if (!isDry) {
        saveJson(absPath, isFlatArray ? mock.questions : data);
      }

      if (i + BATCH_SIZE < missing.length) {
        await sleep(1500); // Sleep 1.5 seconds between batches
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

  console.log(`Fetching topics for exam: ${examArg}...`);
  const topicMap = await getAllTopics(examArg);
  console.log(`Found ${Object.values(topicMap).flat().length} topics across ${Object.keys(topicMap).length} subjects.\n`);

  if (args.includes("--auto")) {
    const dirPath = path.resolve(AUTO_DIR);
    if (!fs.existsSync(dirPath)) {
      console.error(`Auto dir not found: ${dirPath}`);
      process.exit(1);
    }
    const files = findJsonFiles(dirPath);
    if (files.length === 0) {
      console.log(`No JSON files found in ${dirPath}`);
      process.exit(0);
    }
    console.log(`Found ${files.length} file(s) in ${AUTO_DIR}\n`);
    for (const file of files) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`File: ${file}`);
      console.log("=".repeat(60));
      await processFile(file, topicMap, isDry);
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

Examples:
  npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --file scratch/mocks.json
  npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --auto
  npx ts-node --project tsconfig.json scripts/json-topics-neet.ts --auto --dry
    `);
    process.exit(0);
  }

  await processFile(fileArg, topicMap, isDry);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
