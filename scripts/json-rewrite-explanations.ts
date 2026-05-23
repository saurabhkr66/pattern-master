/**
 * Rewrite existing explanations in Gemini's own words — the question already has an
 * answer/explanation; Gemini reads it as ground truth and rephrases naturally.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/json-rewrite-explanations.ts --file <path>
 *   npx ts-node --project tsconfig.json scripts/json-rewrite-explanations.ts --file scratch/mocks.json --dry
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
const BATCH_SIZE = 15;       // questions processed in parallel
const BATCH_DELAY_MS = 1500; // pause between batches to stay under RPM
const MAX_RETRIES = 4;       // attempts per question on transient failure
const RETRY_BASE_MS = 2000;  // first retry waits this long; doubles each retry
const PROCESSED_LOG = path.resolve("scripts/processed-rewrite.log");

function loadProcessed(): Set<string> {
  if (!fs.existsSync(PROCESSED_LOG)) return new Set();
  return new Set(
    fs.readFileSync(PROCESSED_LOG, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
  );
}

function appendProcessed(ids: string[]) {
  if (ids.length === 0) return;
  fs.appendFileSync(PROCESSED_LOG, ids.join("\n") + "\n", "utf-8");
}

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

function hasTextExplanation(q: { explanation?: string | null }): boolean {
  return !!q.explanation && q.explanation.trim() !== "";
}

function buildRewritePrompt(q: {
  question_text: string;
  options: any;
  correct_answer: string;
  explanation: string;
}) {
  const optionsText = Array.isArray(q.options) && q.options.length > 0
    ? `\nOptions: ${q.options.join(' | ')}`
    : '';
  return `You are an expert GATE/competitive exam educator. Rewrite the explanation below in clear, student-friendly language.

Question: ${q.question_text}${optionsText}
Correct Answer: ${q.correct_answer}

Original Explanation (mathematically correct — preserve all steps and values):
${q.explanation}

Rules:
1. Keep every reasoning step, formula, and numerical value exactly as in the original.
2. Write in a clear, direct teaching style — like explaining to a student preparing for GATE.
3. Use LaTeX ($...$) for all inline math and ($$...$$) for standalone equations.
4. Structure: start with the key concept/formula, show the working, state the result.
5. Length: 2-4 sentences for conceptual questions. For numerical problems show the working concisely — no repeated steps, no restating intermediate results.
6. Do NOT add new methods, alternative approaches, or steps not in the original.
7. Do NOT write meta phrases like "The given solution...", "Let us analyze...", "To solve this...".
8. Do NOT end with "The correct option is X" or "Hence option X is correct".
9. Output ONLY the rewritten explanation — no headings, no preamble.`.trim();
}

function buildGeneratePrompt(q: {
  question_text: string;
  options: any;
  correct_answer: string;
}) {
  const optionsText = Array.isArray(q.options) && q.options.length > 0
    ? `\nOptions: ${q.options.join(' | ')}`
    : '';
  return `You are an expert GATE/competitive exam educator. Write a clear, complete explanation for why the correct answer is right.

Question: ${q.question_text}${optionsText}
Correct Answer: ${q.correct_answer}

Rules:
1. Start directly with the key concept, law, or formula — do NOT restate the question.
2. For numerical problems show key steps only — no repeated lines, no restating intermediate values. For conceptual questions explain the principle in 2-3 sentences.
3. Use LaTeX ($...$) for all inline math and ($$...$$) for standalone equations.
4. Length: 2-3 sentences for conceptual MCQs, full step-by-step working for numerical/NAT questions.
5. Do NOT use bullet points or numbered lists — write in flowing paragraphs.
6. Do NOT write meta phrases like "Let's analyze...", "To solve this...", "We need to find...".
7. Do NOT end with "The correct option is X" or "Hence option X is correct".
8. Output ONLY the explanation — no headings, no preamble.`.trim();
}

function cleanExplanation(text: string): string {
  return text
    .replace(/\[CORRECT_OPTION:\s*[A-D]\]/gi, "")
    .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
    .trim();
}

async function produceExplanation(
  q: {
    id?: string;
    question_text: string;
    options: any;
    correct_answer: string;
    explanation?: string | null;
    images?: any[];
  }
): Promise<{
  explanation: string | null;
  tokens: { prompt: number; candidates: number; thoughts: number };
}> {
  const tokens = { prompt: 0, candidates: 0, thoughts: 0 };
  const isRewrite = hasTextExplanation(q);
  const prompt = isRewrite
    ? buildRewritePrompt(q as any)
    : buildGeneratePrompt(q);
  const parts: any[] = [prompt];
  const images = (q.images as any[]) || [];
  for (const img of images.filter((i) => i.type !== "explanation")) {
    const filename = img.filename || img.url;
    if (!filename) continue;
    const imageData = await fetchImageAsBase64(filename);
    if (imageData) parts.push({ inlineData: imageData });
  }

  const contents = parts.map((p) =>
    typeof p === "string" ? p : p.inlineData ? { inlineData: p.inlineData } : p
  );

  const idTag = (q.id || "?").slice(-8);
  let lastErr: string | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          
        }
      });

      const usage = result.usageMetadata;
      if (usage) {
        tokens.prompt = usage.promptTokenCount ?? 0;
        tokens.candidates = usage.candidatesTokenCount ?? 0;
        tokens.thoughts = (usage as any).thoughtsTokenCount ?? 0;
      }

      const cleaned = cleanExplanation(result.text || "");
      if (cleaned) return { explanation: cleaned, tokens };
      lastErr = "empty response";
    } catch (err: any) {
      lastErr = err?.message || String(err);
    }

    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(`  Q ${idTag} attempt ${attempt}/${MAX_RETRIES} failed (${lastErr}). Retrying in ${delay}ms...`);
      await sleep(delay);
    } else {
      console.error(`  Q ${idTag} all ${MAX_RETRIES} attempts failed. Last error: ${lastErr}`);
    }
  }

  return { explanation: null, tokens };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function saveJson(filePath: string, data: any[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function processFile(filePath: string, isDry: boolean, processed: Set<string>) {
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

  console.log(`\nLoaded ${isFlatArray ? data[0].questions.length : data.length} question(s) from ${absPath}`);

  let totalRewritten = 0, totalFailed = 0, totalSkipped = 0;

  for (let mi = 0; mi < data.length; mi++) {
    const mock = data[mi];
    const questions: any[] = mock.questions || [];
    const eligible = questions.filter((q) => q && q.question_text);
    const withExplanation = eligible.filter((q) => hasTextExplanation(q));
    const missingExplanation = eligible.filter((q) => !hasTextExplanation(q));
    const targets = eligible.filter((q) => q.id ? !processed.has(String(q.id)) : !hasTextExplanation(q));
    const skipped = eligible.length - targets.length;
    totalSkipped += skipped;
    const toRewrite = targets.filter((q) => hasTextExplanation(q)).length;
    const toGenerate = targets.length - toRewrite;

    console.log(`\n[${mi + 1}/${data.length}] "${mock.title || mock.id}"`);
    console.log(`  Total: ${eligible.length} | With explanations: ${withExplanation.length} | Missing: ${missingExplanation.length} | Already processed: ${skipped} | To rewrite: ${toRewrite} | To generate: ${toGenerate}`);
    if (targets.length === 0) { console.log("  Nothing to do."); continue; }

    let rewritten = 0, failed = 0;
    const totalBatches = Math.ceil(targets.length / BATCH_SIZE);

    for (let bi = 0; bi < totalBatches; bi++) {
      const batch = targets.slice(bi * BATCH_SIZE, (bi + 1) * BATCH_SIZE);
      console.log(`  [Batch ${bi + 1}/${totalBatches}] Processing ${batch.length} questions in parallel...`);

      let batchPromptTokens = 0;
      let batchCandidatesTokens = 0;
      let batchThoughtsTokens = 0;

      const results = await Promise.all(
        batch.map(async (q) => {
          const before = q.explanation;
          const { explanation, tokens } = await produceExplanation(q);
          return { q, before, explanation, tokens };
        })
      );

      const successIds: string[] = [];
      for (const { q, before, explanation, tokens } of results) {
        if (tokens) {
          batchPromptTokens += tokens.prompt;
          batchCandidatesTokens += tokens.candidates;
          batchThoughtsTokens += tokens.thoughts;
        }
        const idTag = (q.id || "?").slice(-8);
        const mode = before ? "rewrite" : "generate";
        if (explanation) {
          q.explanation = explanation;
          console.log(`  Q ${idTag} [${q.question_type || "MCQ"}] (${mode}) ✓`);
          console.log(`    Question: ${q.question_text}`);
          console.log(`    Answer: ${q.correct_answer}`);
          if (before) console.log(`    Before: ${before}`);
          console.log(`    After:  ${explanation}\n`);
          rewritten++;
          totalRewritten++;
          if (q.id) {
            successIds.push(String(q.id));
            processed.add(String(q.id));
          }
        } else {
          console.log(`  Q ${idTag} [${q.question_type || "MCQ"}] (${mode}) ✗ failed`);
          failed++;
          totalFailed++;
        }
      }

      console.log(`  [Batch ${bi + 1}/${totalBatches}] Token Usage:`);
      console.log(`    Input (Prompt) Tokens: ${batchPromptTokens}`);
      console.log(`    Output (Candidates) Tokens: ${batchCandidatesTokens}`);
      console.log(`    Thinking (Thoughts) Tokens: ${batchThoughtsTokens}`);
      console.log(`    Total Batch Tokens: ${batchPromptTokens + batchCandidatesTokens + batchThoughtsTokens}\n`);

      if (!isDry) {
        console.log(`  [Save] Writing progress to file (${rewritten} rewritten so far)...`);
        saveJson(absPath, isFlatArray ? mock.questions : data);
        appendProcessed(successIds);
      }

      if (bi < totalBatches - 1) await sleep(BATCH_DELAY_MS);
    }

    if (!isDry && rewritten > 0) {
      console.log(`  [Save] Final save for this mock...`);
      saveJson(absPath, isFlatArray ? mock.questions : data);
    }

    console.log(`  Done: ${rewritten} rewritten, ${failed} failed`);
  }

  if (isDry) {
    console.log(`\n[DRY RUN] No changes written. Would have rewritten ${totalRewritten} explanations. Skipped (already processed): ${totalSkipped}.`);
  } else {
    console.log(`\nAll done! ${totalRewritten} rewritten, ${totalFailed} failed, ${totalSkipped} skipped (already processed).`);
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
  const processed = loadProcessed();
  if (processed.size > 0) {
    console.log(`Loaded ${processed.size} previously processed question id(s) from ${PROCESSED_LOG}`);
  }

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
      await processFile(file, isDry, processed);
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
  npx ts-node --project tsconfig.json scripts/json-rewrite-explanations.ts --file scratch/mocks.json
  npx ts-node --project tsconfig.json scripts/json-rewrite-explanations.ts --auto
  npx ts-node --project tsconfig.json scripts/json-rewrite-explanations.ts --auto --dry
    `);
    process.exit(0);
  }

  await processFile(fileArg, isDry, processed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
