/**
 * rewrite-mock-explanations-db.ts
 *
 * Rewrites long explanations in a MockTestTemplate directly in the DB.
 *
 * Usage:
 *   npx tsx scripts/rewrite-mock-explanations-db.ts --title "GATE CSE 2025 SET-1"
 *   npx tsx scripts/rewrite-mock-explanations-db.ts --title "GATE CSE 2025 SET-1" --min-len 1000
 *   npx tsx scripts/rewrite-mock-explanations-db.ts --title "GATE CSE 2025 SET-1" --dry
 */

import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-3.1-flash-lite";
const BATCH_SIZE = 1;
const BATCH_DELAY_MS = 4500;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;
const DEFAULT_MIN_LEN = 1000;

function buildPrompt(q: { question_text: string; options: any; correct_answer: string; explanation: string }) {
  const optionsText = Array.isArray(q.options) && q.options.length > 0
    ? `\nOptions: ${q.options.join(" | ")}` : "";

  return `You are an expert competitive exam educator writing a fresh explanation for students.

Use the reference below ONLY to verify facts and the correct answer. Do NOT copy its phrasing or structure.

Question: ${q.question_text}${optionsText}
Correct Answer: ${q.correct_answer}

Reference (facts only — do NOT copy):
${q.explanation}

Write a completely fresh, concise explanation:
1. Start with the core concept, law, or formula — do NOT restate the question.
2. For numerical problems show key steps only — no repeated lines.
3. For conceptual questions explain the principle in 2-3 sentences.
4. Use LaTeX ($...$) for inline math and ($$...$$) for standalone equations — only for actual formulas, NOT plain numbers.
5. Do NOT use bullet points or numbered lists — flowing paragraphs only.
6. Do NOT write meta phrases like "Let's analyze...", "To solve this...", "Let us evaluate the options".
7. Do NOT end with "The correct option is X" or "Hence option X is correct".
8. Max 4 sentences total. Be concise.
9. Output ONLY the explanation — no headings, no preamble.`.trim();
}

function cleanExplanation(text: string): string {
  return text
    .replace(/\[CORRECT_OPTION:\s*[A-D]\]/gi, "")
    .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
    .trim();
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function rewrite(q: any): Promise<string | null> {
  const prompt = buildPrompt(q);
  let lastErr = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: [prompt],
        config: { thinkingConfig: { thinkingBudget: -1 } },
      });
      const cleaned = cleanExplanation(result.text || "");
      if (cleaned) return cleaned;
      lastErr = "empty response";
    } catch (err: any) {
      lastErr = err?.message || String(err);
      const isRateLimit = lastErr.includes("429") || lastErr.toLowerCase().includes("quota");
      if (isRateLimit) {
        console.warn(`  Rate limit hit — waiting 65s...`);
        await sleep(65000);
        attempt--;
        continue;
      }
    }
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BASE_MS * Math.pow(2, attempt - 1));
    }
  }
  console.error(`  Failed after ${MAX_RETRIES} attempts: ${lastErr}`);
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const titleIdx = args.indexOf("--title");
  const title = titleIdx !== -1 ? args[titleIdx + 1] : null;
  const minLenIdx = args.indexOf("--min-len");
  const minLen = minLenIdx !== -1 ? parseInt(args[minLenIdx + 1]) : DEFAULT_MIN_LEN;
  const isDry = args.includes("--dry");

  if (!title) {
    console.log("Usage: npx tsx scripts/rewrite-mock-explanations-db.ts --title <title> [--min-len 1000] [--dry]");
    process.exit(0);
  }

  const mock = await prisma.mockTestTemplate.findFirst({
    where: { title: { contains: title } },
    select: { id: true, title: true, questions: true },
  });

  if (!mock) { console.error(`No mock found with title containing: "${title}"`); process.exit(1); }
  console.log(`\nMock: ${mock.title} (${mock.id})`);

  const questions = mock.questions as any[];
  const targets = questions.filter(q => q.explanation && q.explanation.length >= minLen);
  console.log(`Total questions: ${questions.length} | Explanations >= ${minLen} chars: ${targets.length}`);

  if (targets.length === 0) { console.log("Nothing to rewrite."); return; }
  if (isDry) { console.log("[DRY RUN] Would rewrite:", targets.map(q => `${q.id} (${q.explanation.length} chars)`).join(", ")); return; }

  let rewritten = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const q = targets[i];
    console.log(`\n[${i + 1}/${targets.length}] Q: ${q.question_text.substring(0, 80)}...`);
    console.log(`  Before (${q.explanation.length} chars): ${q.explanation.substring(0, 100)}...`);

    const newExp = await rewrite(q);
    if (newExp) {
      q.explanation = newExp;
      rewritten++;
      console.log(`  After  (${newExp.length} chars): ${newExp.substring(0, 150)}`);

      // Update the mock in DB after each successful rewrite
      await prisma.mockTestTemplate.update({
        where: { id: mock.id },
        data: { questions: questions },
      });
    } else {
      failed++;
    }

    if (i < targets.length - 1) await sleep(BATCH_DELAY_MS);
  }

  console.log(`\nDone! Rewritten: ${rewritten} | Failed: ${failed}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
