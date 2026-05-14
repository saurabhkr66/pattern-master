/**
 * Local explanation generator — runs on your machine, zero Vercel egress.
 *
 * Usage:
 *   # List all available mock tests (to find IDs)
 *   npx ts-node --project tsconfig.json scripts/generate-explanations.ts --list-mocks
 *
 *   # Generate for a specific mock test by ID
 *   npx ts-node --project tsconfig.json scripts/generate-explanations.ts --mock <id>
 *
 *   # Generate for a specific mock test by number + exam
 *   npx ts-node --project tsconfig.json scripts/generate-explanations.ts --mock-number 3 --exam GATE
 *
 *   # Generate for all missing PYQs / SubjectPYQs
 *   npx ts-node --project tsconfig.json scripts/generate-explanations.ts --pyqs
 *   npx ts-node --project tsconfig.json scripts/generate-explanations.ts --subject-pyqs
 *
 *   # Dry run (prints what would happen, no DB writes)
 *   npx ts-node --project tsconfig.json scripts/generate-explanations.ts --mock <id> --dry
 */

import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from '@google/genai';
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// ── CONFIG ────────────────────────────────────────────────────────────────────
const DELAY_MS = 1200; // ms between Gemini calls (~50 RPM safe)
const BATCH_SIZE = 50; // max questions per run for PYQ/SubjectPYQ modes
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'project-27ed127f-554a-419a-b39',
  location: 'us-central1'
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

function hasExplanation(q: { explanation?: string | null; images?: unknown }): boolean {
  const hasText = !!q.explanation && q.explanation.trim() !== "";
  const images = Array.isArray(q.images) ? q.images : [];
  const hasImage = images.some((img: any) => img.type === "explanation");
  return hasText || hasImage;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanExplanation(text: string) {
  return text
    .replace(/\[CORRECT_OPTION:\s*[A-D]\]/gi, "")
    .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
    .trim();
}

async function generateExplanation(q: { question_text: string; options: any; correct_answer: string; images?: any[] }): Promise<string | null> {
  try {
    const parts: any[] = [buildPrompt(q)];

    // Fetch question images from Cloudinary and pass to Gemini
    const images = (q.images as any[]) || [];
    const questionImages = images.filter(img => img.type !== "explanation");
    for (const img of questionImages) {
      const filename = img.filename || img.url;
      if (!filename) continue;
      const imageData = await fetchImageAsBase64(filename);
      if (imageData) {
        parts.push({ inlineData: imageData });
      }
    }

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: parts.map(p => {
        if (typeof p === 'string') return p;
        if (p.inlineData) {
          return { inlineData: p.inlineData };
        }
        return p;
      })
    });
    return cleanExplanation(result.text || "");
  } catch (err: any) {
    console.error("  Gemini error:", err.message);
    return null;
  }
}

// ── LIST MOCKS ────────────────────────────────────────────────────────────────
async function listMocks() {
  const mocks = await prisma.mockTestTemplate.findMany({
    where: { mode: "seeded" },
    select: {
      id: true, title: true, exam_type: true, mock_number: true,
      questions: true,
    },
    orderBy: [{ exam_type: "asc" }, { mock_number: "asc" }],
  });

  console.log("\nAvailable mock tests:\n");
  console.log("  #   | Exam       | Mock# | Missing | Title");
  console.log("  ----|------------|-------|---------|" + "-".repeat(40));

  for (const [i, m] of mocks.entries()) {
    const qs = (m.questions as any[]) || [];
    const missing = qs.filter(q => !hasExplanation(q)).length;
    const flag = missing > 0 ? `${missing} missing` : "all done ✓";
    console.log(`  ${String(i + 1).padEnd(3)} | ${m.exam_type.padEnd(10)} | ${String(m.mock_number).padEnd(5)} | ${flag.padEnd(9)} | ${m.title}`);
    console.log(`      ID: ${m.id}`);
  }
  console.log();
}

async function saveMockTestWithRetry(mockId: string, updatedQuestions: any[], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.mockTestTemplate.update({
        where: { id: mockId },
        data: { questions: updatedQuestions },
      });
      return true;
    } catch (err: any) {
      if (err.code === 'P1001' && attempt < maxRetries) {
        console.warn(`  [DB Warning] Connection dropped (P1001). Retrying ${attempt}/${maxRetries} in 3 seconds...`);
        await sleep(3000);
      } else {
        throw err;
      }
    }
  }
}

// ── PROCESS MOCK ──────────────────────────────────────────────────────────────
async function processMock(mockId: string, dryRun: boolean, limit?: number) {
  const template = await prisma.mockTestTemplate.findUnique({
    where: { id: mockId },
    select: { id: true, title: true, questions: true },
  });

  if (!template) {
    console.error(`Mock test not found: ${mockId}`);
    return false;
  }

  const questions = (template.questions as any[]);
  const allMissing = questions.filter(q => !hasExplanation(q));
  const missing = limit ? allMissing.slice(0, limit) : allMissing;

  console.log(`\n[Mock] "${template.title}"`);
  console.log(`  Total questions : ${questions.length}`);
  console.log(`  Missing         : ${allMissing.length}${limit ? ` (processing ${missing.length})` : ""}`);
  if (missing.length === 0) { console.log("  Nothing to do."); return; }
  console.log();

  let fixed = 0, failed = 0;
  const updatedQuestions = [...questions];

  for (const q of missing) {
    process.stdout.write(`  Q ${(q.id || "?").slice(-8)} [${q.question_type || "MCQ"}] ... `);
    const explanation = await generateExplanation(q);

    if (explanation) {
      const idx = updatedQuestions.findIndex(x => x.id === q.id);
      if (idx !== -1) updatedQuestions[idx] = { ...updatedQuestions[idx], explanation };
      console.log(`✓ (${explanation.length} chars)`);
      console.log(`\n    --- QUESTION ---`);
      console.log(`    ${q.question_text}`);
      if (q.options) console.log(`    Options: ${JSON.stringify(q.options)}`);
      console.log(`    Answer:  ${q.correct_answer}`);
      console.log(`    --- EXPLANATION ---`);
      console.log(`    ${explanation.split('\n').join('\n    ')}\n`);
      fixed++;

      if (!dryRun && fixed % 5 === 0) {
        console.log(`  [Periodic Save] Saving progress to DB (${fixed} fixed)...`);
        await saveMockTestWithRetry(mockId, updatedQuestions);
      }
    } else {
      console.log("✗ failed");
      failed++;
    }

    await sleep(DELAY_MS);
  }

  if (!dryRun && fixed > 0) {
    console.log(`\n  Final saving to database...`);
    await saveMockTestWithRetry(mockId, updatedQuestions);
    console.log(`  Saved ${fixed} explanations to DB.`);
  } else if (dryRun) {
    console.log(`\n  DRY RUN — nothing written.`);
  }

  console.log(`\n[Mock] Done: ${fixed} fixed, ${failed} failed`);
  return true;
}

// ── PROCESS PYQs ─────────────────────────────────────────────────────────────
async function processPYQs(dryRun: boolean) {
  const fetched = await prisma.pYQ.findMany({
    where: { explanation: "" },
    select: { id: true, question_text: true, options: true, correct_answer: true, images: true },
    take: BATCH_SIZE * 2, // over-fetch to account for image-only explanations
  });
  const questions = fetched.filter(q => !hasExplanation(q)).slice(0, BATCH_SIZE);

  console.log(`\n[PYQ] Found ${questions.length} missing explanations`);
  let fixed = 0, failed = 0;

  for (const q of questions) {
    process.stdout.write(`  ${q.id.slice(-8)} ... `);
    const explanation = await generateExplanation(q as any);
    if (explanation) {
      if (!dryRun) await prisma.pYQ.update({ where: { id: q.id }, data: { explanation } });
      console.log(`✓`);
      fixed++;
    } else { console.log("✗"); failed++; }
    await sleep(DELAY_MS);
  }
  console.log(`[PYQ] Done: ${fixed} fixed, ${failed} failed`);
}

// ── PROCESS SubjectPYQs ───────────────────────────────────────────────────────
async function processSubjectPYQs(dryRun: boolean) {
  const fetched = await prisma.subjectPYQ.findMany({
    where: { explanation: "" },
    select: { id: true, question_text: true, options: true, correct_answer: true, images: true },
    take: BATCH_SIZE * 2,
  });
  const questions = fetched.filter(q => !hasExplanation(q)).slice(0, BATCH_SIZE);

  console.log(`\n[SubjectPYQ] Found ${questions.length} missing explanations`);
  let fixed = 0, failed = 0;

  for (const q of questions) {
    process.stdout.write(`  ${q.id.slice(-8)} ... `);
    const explanation = await generateExplanation(q as any);
    if (explanation) {
      if (!dryRun) await prisma.subjectPYQ.update({ where: { id: q.id }, data: { explanation } });
      console.log(`✓`);
      fixed++;
    } else { console.log("✗"); failed++; }
    await sleep(DELAY_MS);
  }
  console.log(`[SubjectPYQ] Done: ${fixed} fixed, ${failed} failed`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found in .env.local");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry");
  const mockIdArg = args[args.indexOf("--mock") + 1];
  const mockNumberArg = args[args.indexOf("--mock-number") + 1];
  const examArg = args[args.indexOf("--exam") + 1] || "GATE";
  const limitArg = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : undefined;

  if (dryRun) console.log("DRY RUN mode — no DB writes\n");

  if (args.includes("--list-mocks")) {
    await listMocks();
  } else if (args.includes("--auto")) {
    console.log("Starting Auto Mode: Will process all JEE_MAIN seeded mocks missing explanations!");
    const mocks = await prisma.mockTestTemplate.findMany({
      where: { exam_type: "JEE_MAIN", mode: "seeded" },
      select: { id: true, questions: true },
      orderBy: { created_at: "desc" },
    });

    const needWork = mocks.filter(m => {
      const qs = (m.questions as any[]) || [];
      return qs.some(q => !hasExplanation(q));
    });

    console.log(`Found ${needWork.length} mocks that need explanations.\n`);
    for (let i = 0; i < needWork.length; i++) {
      console.log(`\n=============================================================`);
      console.log(`Processing Paper ${i + 1} of ${needWork.length}`);
      console.log(`=============================================================`);
      await processMock(needWork[i].id, dryRun, limitArg);
    }
    console.log("\nAuto mode complete!");
  } else if (mockIdArg) {
    await processMock(mockIdArg, dryRun, limitArg);
  } else if (mockNumberArg) {
    const template = await prisma.mockTestTemplate.findFirst({
      where: { mock_number: parseInt(mockNumberArg), exam_type: examArg, mode: "seeded" },
      select: { id: true },
    });
    if (!template) { console.error(`No seeded mock #${mockNumberArg} found for exam ${examArg}`); process.exit(1); }
    await processMock(template.id, dryRun, limitArg);
  } else if (args.includes("--pyqs")) {
    await processPYQs(dryRun);
  } else if (args.includes("--subject-pyqs")) {
    await processSubjectPYQs(dryRun);
  } else {
    console.log(`
Usage:
  --list-mocks                     List all mock tests with missing explanation counts
  --mock <id>                      Generate for a specific mock test by ID
  --mock-number <n> --exam <exam>  Generate for mock #n of an exam (e.g. --mock-number 3 --exam GATE)
  --auto                           Automatically process all missing papers sequentially
  --pyqs                           Generate for missing PYQ explanations
  --subject-pyqs                   Generate for missing SubjectPYQ explanations
  --dry                            Dry run — print results without writing to DB

Examples:
  npx ts-node --project tsconfig.json scripts/generate-explanations.ts --list-mocks
  npx ts-node --project tsconfig.json scripts/generate-explanations.ts --mock clxyz123
  npx ts-node --project tsconfig.json scripts/generate-explanations.ts --mock-number 3 --exam GATE
  npx ts-node --project tsconfig.json scripts/generate-explanations.ts --mock clxyz123 --dry
    `);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
