/**
 * Generate explanations for questions in a local JSON file — runs before seeding, zero DB bloat.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/json-explanations.ts --file <path>
 *   npx ts-node --project tsconfig.json scripts/json-explanations.ts --file scratch/mocks.json --dry
 *
 * JSON format: array of mock objects, each with a `questions` array.
 */

import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env" });

const ai = new GoogleGenAI({
  vertexai: true,
  project: "project-27ed127f-554a-419a-b39",
  location: "us-central1",
});

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const DELAY_MS = 1200; // ~50 RPM safe

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

function hasExplanation(q: { explanation?: string | null; images?: unknown }): boolean {
  const hasText = !!q.explanation && q.explanation.trim() !== "";
  const images = Array.isArray(q.images) ? q.images : [];
  const hasImage = images.some((img: any) => img.type === "explanation");
  return hasText || hasImage;
}

function buildPrompt(q: { question_text: string; options: any; correct_answer: string }) {
  return `You are an expert educator. Provide a concise explanation for this question.

Question: ${q.question_text}
Options: ${JSON.stringify(q.options)}
Correct Answer: ${q.correct_answer}

Rules:
1. The correct answer is 100% correct — derive a step-by-step explanation that arrives at it.
2. Use LaTeX ($, $$) for all math.
3. Keep it concise: 5-7 lines max.
4. No character-level spacing. Write flowing text.
5. End with [CORRECT_OPTION: X] where X is A, B, C, or D (for MCQ only).`.trim();
}

function cleanExplanation(text: string): string {
  return text
    .replace(/\[CORRECT_OPTION:\s*[A-D]\]/gi, "")
    .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
    .trim();
}

async function generateExplanation(
  q: { question_text: string; options: any; correct_answer: string; images?: any[] }
): Promise<string | null> {
  try {
    const parts: any[] = [buildPrompt(q)];
    const images = (q.images as any[]) || [];
    for (const img of images.filter((i) => i.type !== "explanation")) {
      const filename = img.filename || img.url;
      if (!filename) continue;
      const imageData = await fetchImageAsBase64(filename);
      if (imageData) parts.push({ inlineData: imageData });
    }

    const result = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: parts.map((p) =>
        typeof p === "string" ? p : p.inlineData ? { inlineData: p.inlineData } : p
      ),
    });

    return cleanExplanation(result.text || "");
  } catch (err: any) {
    console.error("  Gemini error:", err.message);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function saveJson(filePath: string, data: any[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function processFile(filePath: string, isDry: boolean) {
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

  console.log(`\nLoaded ${isFlatArray ? data[0].questions.length : data.length} question(s) from ${absPath}`);

  let totalFixed = 0, totalFailed = 0;

  for (let mi = 0; mi < data.length; mi++) {
    const mock = data[mi];
    const questions: any[] = mock.questions || [];
    const missing = questions.filter((q) => !hasExplanation(q));

    console.log(`\n[${mi + 1}/${data.length}] "${mock.title || mock.id}"`);
    console.log(`  Total: ${questions.length} | Missing explanations: ${missing.length}`);
    if (missing.length === 0) { console.log("  Nothing to do."); continue; }

    let fixed = 0, failed = 0;

    for (const q of missing) {
      process.stdout.write(`  Q ${(q.id || "?").slice(-8)} [${q.question_type || "MCQ"}] ... `);

      const explanation = await generateExplanation(q);

      if (explanation) {
        q.explanation = explanation;
        console.log(`✓`);
        console.log(`    Question: ${q.question_text}`);
        console.log(`    Options: ${JSON.stringify(q.options)}`);
        console.log(`    Answer: ${q.correct_answer}`);
        console.log(`    Explanation: ${explanation}\n`);
        fixed++;
        totalFixed++;

        // Save progress every 5 questions
        if (!isDry && fixed % 5 === 0) {
          console.log(`  [Save] Writing progress to file (${fixed} fixed)...`);
          saveJson(absPath, isFlatArray ? mock.questions : data);
        }
      } else {
        console.log("✗ failed");
        failed++;
        totalFailed++;
      }

      await sleep(DELAY_MS);
    }

    if (!isDry && fixed > 0) {
      console.log(`  [Save] Final save for this mock...`);
      saveJson(absPath, isFlatArray ? mock.questions : data);
    }

    console.log(`  Done: ${fixed} fixed, ${failed} failed`);
  }

  if (isDry) {
    console.log(`\n[DRY RUN] No changes written. Would have fixed ${totalFixed} explanations.`);
  } else {
    console.log(`\nAll done! ${totalFixed} explanations generated, ${totalFailed} failed.`);
    console.log(`File saved: ${absPath}`);
  }
}

const AUTO_DIR = "scratch/jeemains";

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
  const isDry = args.includes("--dry");

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
      await processFile(file, isDry);
    }
    console.log("\nAuto mode complete!");
    return;
  }

  if (!fileArg || fileArg.startsWith("--")) {
    console.log(`
Usage:
  --file <path>      Path to JSON file (array of mock objects with questions)
  --auto             Process all JSON files in ${AUTO_DIR}/
  --dry              Dry run — print results without writing to file

Examples:
  npx ts-node --project tsconfig.json scripts/json-explanations.ts --file scratch/mocks.json
  npx ts-node --project tsconfig.json scripts/json-explanations.ts --auto
  npx ts-node --project tsconfig.json scripts/json-explanations.ts --auto --dry
    `);
    process.exit(0);
  }

  await processFile(fileArg, isDry);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
