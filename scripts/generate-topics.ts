/**
 * Local topic generator — runs on your machine, zero Vercel egress.
 *
 * Usage:
 *   # List all available mock tests with missing topics
 *   npx ts-node --project tsconfig.json scripts/generate-topics.ts --list-mocks
 *
 *   # Generate topics for a specific mock test by ID
 *   npx ts-node --project tsconfig.json scripts/generate-topics.ts --mock <id>
 *
 *   # Dry run (prints what would happen, no DB writes)
 *   npx ts-node --project tsconfig.json scripts/generate-topics.ts --mock <id> --dry
 */

import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from '@google/genai';
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// ── CONFIG ────────────────────────────────────────────────────────────────────
const DELAY_MS = 0; // No delay between Gemini calls for topics
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

async function getAllTopics() {
  const patterns = await prisma.pattern.findMany({
    select: { topic_name: true, exam_type: true, subject: true },
    orderBy: { topic_name: "asc" },
  });

  const topicMap: Record<string, Record<string, string[]>> = {};
  patterns.forEach((p) => {
    const normalizedExam = p.exam_type.toUpperCase().replace(/\s+/g, "_");
    const normalizedSubject = (p.subject || "GENERAL").toUpperCase().trim();
    if (!topicMap[normalizedExam]) topicMap[normalizedExam] = {};
    if (!topicMap[normalizedExam][normalizedSubject]) topicMap[normalizedExam][normalizedSubject] = [];
    if (!topicMap[normalizedExam][normalizedSubject].includes(p.topic_name)) {
      topicMap[normalizedExam][normalizedSubject].push(p.topic_name);
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

function cleanTopic(text: string, allowedTopics: string[]) {
  let cleaned = text.trim();
  // Sometimes models wrap the topic in quotes or asterisks
  cleaned = cleaned.replace(/^['"*]+|['"*]+$/g, '').trim();
  
  // Try to find an exact match first
  if (allowedTopics.includes(cleaned)) return cleaned;
  
  // Fallback to case-insensitive match
  const lowerCleaned = cleaned.toLowerCase();
  const match = allowedTopics.find(t => t.toLowerCase() === lowerCleaned);
  return match || "Unknown";
}

async function generateTopic(q: { question_text: string; options: any; images?: any[] }, allowedTopics: string[]): Promise<string | null> {
  if (allowedTopics.length === 0) return "Unknown";
  
  try {
    const parts: any[] = [buildPrompt(q, allowedTopics)];

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
      model: 'gemini-2.5-flash',
      contents: parts.map(p => {
        if (typeof p === 'string') return p;
        if (p.inlineData) {
          return { inlineData: p.inlineData };
        }
        return p;
      })
    });
    
    return cleanTopic(result.text || "", allowedTopics);
  } catch (err: any) {
    console.error("  Gemini error:", err.message);
    return null;
  }
}

// ── LIST MOCKS ────────────────────────────────────────────────────────────────
async function listMocks() {
  console.log("Fetching mock tests and calculating uncategorized counts...\n");
  const mocks = await prisma.mockTestTemplate.findMany({
    where: {
      exam_type: "JEE_MAIN",
      mode: "seeded"
    },
    select: {
      id: true,
      title: true,
      exam_type: true,
      questions: true,
    },
    orderBy: { created_at: "desc" },
  });

  const missingCounts = mocks.map(m => {
    const qs = (m.questions as any[]) || [];
    // Count questions that do not have a valid topic
    const missing = qs.filter(q => !q.topic || q.topic.trim() === "" || q.topic === "Unknown").length;
    return { ...m, missing, total: qs.length };
  }).filter(m => m.missing > 0);

  missingCounts.sort((a, b) => b.missing - a.missing);

  console.log(`Found ${missingCounts.length} mocks with missing topics.\n`);
  for (const m of missingCounts) {
    console.log(`${m.id} | Missing: ${m.missing.toString().padEnd(3)} | Total: ${m.total.toString().padEnd(3)} | ${m.title}`);
  }
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
        await new Promise(r => setTimeout(r, 3000));
      } else {
        throw err;
      }
    }
  }
}

// ── PROCESS MOCK ──────────────────────────────────────────────────────────────
async function processMock(mockId: string, isDry: boolean) {
  const template = await prisma.mockTestTemplate.findUnique({
    where: { id: mockId },
    select: { id: true, title: true, questions: true, exam_type: true },
  });

  if (!template) {
    console.error(`Mock test not found: ${mockId}`);
    return false;
  }

  const allTopicsMap = await getAllTopics();
  const normalizedExam = template.exam_type.toUpperCase().replace(/\s+/g, '_');
  const examTopics = allTopicsMap[normalizedExam];

  if (!examTopics) {
    console.error(`No topics found in the database for exam type: ${template.exam_type}.`);
    return false;
  }

  const questions = (template.questions as any[]);
  const missing = questions.filter(q => !q.topic || q.topic.trim() === "" || q.topic === "Unknown");

  console.log(`\n[Mock] "${template.title}"`);
  console.log(`  Total questions : ${questions.length}`);
  console.log(`  Missing Topics  : ${missing.length}`);
  if (missing.length === 0) { console.log("  Nothing to do."); return true; }
  console.log();

  let fixed = 0, failed = 0;
  const updatedQuestions = [...questions];

  for (const q of missing) {
    process.stdout.write(`  Q ${(q.id || "?").slice(-8)} [${q.question_type || "MCQ"}] ... `);
    
    // We need subject-level topics for this specific question
    const subject = (q.subject || "GENERAL").toUpperCase().trim();
    const allowedTopics = examTopics[subject] || [];
    
    if (allowedTopics.length === 0) {
      console.log(`✗ failed (No topics defined for subject: ${subject})`);
      failed++;
      continue;
    }

    const topic = await generateTopic(q, allowedTopics);

    if (topic && topic !== "Unknown") {
      const idx = updatedQuestions.findIndex(x => x.id === q.id);
      if (idx !== -1) updatedQuestions[idx] = { ...updatedQuestions[idx], topic };
      
      console.log(`✓ Topic assigned`);
      console.log(`\n    --- QUESTION ---`);
      console.log(`    ${q.question_text.substring(0, 150)}...`);
      console.log(`    Subject: ${subject}`);
      console.log(`    Topic:   ${topic}\n`);
      fixed++;

      // PERIODIC SAVE: Every 5 fixed questions, save so we don't lose progress on crash
      if (!isDry && fixed % 5 === 0) {
        console.log(`  [Periodic Save] Saving progress to DB (${fixed} fixed)...`);
        await saveMockTestWithRetry(mockId, updatedQuestions);
      }
    } else {
      console.log("✗ failed (AI couldn't categorize or returned Unknown)");
      failed++;
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[Mock] Done: ${fixed} fixed, ${failed} failed`);

  if (!isDry && fixed > 0) {
    console.log("  Final saving to database...");
    await saveMockTestWithRetry(mockId, updatedQuestions);
    console.log("  Saved successfully!");
  } else if (isDry && fixed > 0) {
    console.log("  [DRY RUN] Changes not saved to database.");
  }
  return true;
}

// ── ENTRY ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isDry = args.includes("--dry");

  if (args.includes("--list-mocks")) {
    await listMocks();
  } else if (args.includes("--auto")) {
    console.log("Starting Auto Mode: Will process all JEE_MAIN mocks with missing topics!");
    const BATCH = 10;
    let skip = 0;
    const mocks: { id: string; questions: any }[] = [];
    while (true) {
      const batch = await prisma.mockTestTemplate.findMany({
        where: { exam_type: "JEE_MAIN", mode: "seeded" },
        select: { id: true, questions: true },
        orderBy: { created_at: "desc" },
        take: BATCH,
        skip,
      });
      mocks.push(...batch);
      if (batch.length < BATCH) break;
      skip += BATCH;
    }

    const needWork = mocks.filter(m => {
      const qs = (m.questions as any[]) || [];
      return qs.some(q => !q.topic || q.topic.trim() === "" || q.topic === "Unknown");
    });

    console.log(`Found ${needWork.length} mocks that need topic categorization.\n`);
    for (let i = 0; i < needWork.length; i++) {
      console.log(`\n=============================================================`);
      console.log(`Processing Paper ${i + 1} of ${needWork.length}`);
      console.log(`=============================================================`);
      await processMock(needWork[i].id, isDry);
    }
    console.log("\nAuto mode complete!");
  } else if (args.includes("--mock")) {
    const idIdx = args.indexOf("--mock") + 1;
    if (idIdx < args.length && !args[idIdx].startsWith("--")) {
      await processMock(args[idIdx], isDry);
    } else {
      console.error("Missing mock ID. Usage: --mock <id>");
      process.exit(1);
    }
  } else {
    console.log(`
Usage:
  --list-mocks                     List all mock tests with missing topic counts
  --mock <id>                      Generate topics for a specific mock test by ID
  --auto                           Automatically process all missing papers sequentially
  --dry                            Dry run — print results without writing to DB

Examples:
  npx ts-node --project tsconfig.json scripts/generate-topics.ts --auto
  npx ts-node --project tsconfig.json scripts/generate-topics.ts --mock clxyz123
    `);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
