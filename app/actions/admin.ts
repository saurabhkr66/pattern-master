"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { VertexAI } from '@google-cloud/vertexai';

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import { getImageUrl } from "@/lib/imageUtils";

// In-process cache: userId → email. Avoids a DB round-trip on every action
// call during batch processing. TTL is process lifetime (fine for admin use).
const userEmailCache = new Map<string, string>();

async function getAdminEmail(userId: string): Promise<string | undefined> {
  if (userEmailCache.has(userId)) return userEmailCache.get(userId);
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const email = dbUser?.email?.toLowerCase();
  if (email) userEmailCache.set(userId, email);
  return email;
}

// Surgically update one question inside the MockTestTemplate.questions JSONB array.
// Uses Postgres || (object merge) instead of reading/writing the full array.
async function patchMockQuestion(mockTestId: string, questionId: string, patch: Record<string, unknown>) {
  const patchJson = JSON.stringify(patch);
  await prisma.$executeRaw`
    UPDATE "MockTestTemplate"
    SET questions = (
      SELECT jsonb_agg(
        CASE WHEN elem->>'id' = ${questionId}
        THEN elem || ${patchJson}::jsonb
        ELSE elem
        END
      )
      FROM jsonb_array_elements(questions) AS elem
    )
    WHERE id = ${mockTestId}
  `;
}

// Remove one question from the JSONB array and decrement total_questions.
async function removeMockQuestion(mockTestId: string, questionId: string) {
  await prisma.$executeRaw`
    UPDATE "MockTestTemplate"
    SET
      questions = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(questions) AS elem
        WHERE elem->>'id' != ${questionId}
      ),
      total_questions = total_questions - 1
    WHERE id = ${mockTestId}
  `;
}

export async function resolveReport(
  reportId: string,
  questionId: string,
  questionType: "PYQ" | "GeneratedQuestion" | "MockQuestion" | "pyq",
  updates: {
    question_text?: string,
    correct_answer?: string,
    explanation?: string,
    options?: any,
    images?: any,
    mockTestId?: string, // Required if questionType is MockQuestion
    ai_answer_mismatch?: boolean,
    ai_detected_answer?: string | null,
    question_type?: string
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get email from our own database to avoid Clerk API timeouts in Server Actions
  if (!checkIsAdmin(await getAdminEmail(userId))) {
    throw new Error("Forbidden: You are not an admin.");
  }


  // Update the actual question.
  //
  // We use $executeRaw with a dynamically-built SET clause rather than
  // prisma.xxx.update() because the Neon HTTP adapter cannot execute
  // transactions, and Prisma's fluent `update` on Json columns may wrap
  // the SELECT-then-UPDATE in an implicit transaction. Raw SQL sidesteps
  // that — single statement, no transaction needed.
  if (questionType === "MockQuestion") {
    if (!updates.mockTestId) throw new Error("Mock Test ID is required for MockQuestion updates");
    const { mockTestId: _mockTestId, ...patch } = updates;
    await patchMockQuestion(updates.mockTestId, questionId, patch);
  } else {
    const { ai_answer_mismatch, ai_detected_answer, mockTestId, ...validUpdates } = updates;
    const tableName = (questionType === "PYQ" || questionType === "pyq") ? "PYQ" : "GeneratedQuestion";

    const setFragments: Prisma.Sql[] = [];
    if (validUpdates.question_text !== undefined) setFragments.push(Prisma.sql`question_text = ${validUpdates.question_text}`);
    if (validUpdates.correct_answer !== undefined) setFragments.push(Prisma.sql`correct_answer = ${validUpdates.correct_answer}`);
    if (validUpdates.explanation !== undefined) setFragments.push(Prisma.sql`explanation = ${validUpdates.explanation}`);
    if (validUpdates.question_type !== undefined) setFragments.push(Prisma.sql`question_type = ${validUpdates.question_type}`);
    if (validUpdates.options !== undefined) setFragments.push(Prisma.sql`options = ${JSON.stringify(validUpdates.options)}::jsonb`);
    if (validUpdates.images !== undefined) setFragments.push(Prisma.sql`images = ${JSON.stringify(validUpdates.images)}::jsonb`);

    if (setFragments.length > 0) {
      // tableName comes from a hardcoded ternary above — safe for Prisma.raw.
      await prisma.$executeRaw(
        Prisma.sql`UPDATE ${Prisma.raw(`"${tableName}"`)} SET ${Prisma.join(setFragments, ", ")} WHERE id = ${questionId}`
      );
    }
  }

  // Mark report as resolved (skip virtual auto-* report ids).
  if (!reportId.startsWith("auto-")) {
    await prisma.$executeRaw`UPDATE "QuestionReport" SET status = 'resolved' WHERE id = ${reportId}`;
  }

  revalidatePath("/admin/reports");
}

export async function deleteQuestion(
  questionId: string,
  questionType: "PYQ" | "GeneratedQuestion" | "MockQuestion",
  mockTestId?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden: You are not an admin.");

  // Delete the actual question (Cascades to reports, bookmarks, attempts)
  if (questionType === "PYQ") {
    await prisma.pYQ.delete({ where: { id: questionId } });
  } else if (questionType === "MockQuestion") {
    if (!mockTestId) throw new Error("Mock Test ID is required for MockQuestion deletion");
    await removeMockQuestion(mockTestId, questionId);
  } else {
    await prisma.generatedQuestion.delete({ where: { id: questionId } });
  }

  revalidatePath("/admin/reports");
}

export async function quickEditExplanation(
  questionId: string,
  questionType: "PYQ" | "GeneratedQuestion" | "MockQuestion" | string,
  explanation: string,
  mockTestId?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden: You are not an admin.");

  if (questionType === "MockQuestion" && mockTestId) {
    await patchMockQuestion(mockTestId, questionId, { explanation });
  } else if (questionType === "PYQ" || questionType === "pyq") {
    await prisma.pYQ.update({
      where: { id: questionId },
      data: { explanation }
    });
  } else {
    await prisma.generatedQuestion.update({
      where: { id: questionId },
      data: { explanation }
    });
  }
}

export async function toggleManualFlag(
  questionId: string,
  questionType: string,
  mockTestId?: string,
  flagStatus: boolean = true
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden: You are not an admin.");

  if (questionType === "MockQuestion" && mockTestId) {
    await patchMockQuestion(mockTestId, questionId, { ai_answer_mismatch: flagStatus, manual_flag: flagStatus });
  }

  revalidatePath("/admin/reports");
}

export async function deleteMockTest(mockTestId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden: You are not an admin.");

  // Delete all related test sessions first (manual cascade)
  await prisma.testSession.deleteMany({
    where: { mock_test_id: mockTestId }
  });

  // Then delete the template
  await prisma.mockTestTemplate.delete({
    where: { id: mockTestId }
  });

  revalidatePath("/mocktest");
  // Bust the 24h-cached counts endpoint so the paper grid reflects the
  // deletion immediately for everyone.
  revalidateTag("mocks", "max");
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const GEMINI_MODEL = "gemini-3.1-flash-lite"; // Change this one line to switch Gemini models
const GEMINI_SEARCH_MODEL = "gemini-3.1-flash"; // Flash-lite doesn't support the googleSearch tool; full Flash does
const VERTEX_MODEL = "gemini-2.5-pro"; // Vertex AI Gemini 2.5 Pro — needs ADC creds
const GEMINI_TOPIC_MODEL = "gemini-3.1-flash-lite"; // Specific model for faster topic classification

// Canonical reason string for auto-flagged QuestionReports from generateAIExplanation.
// Kept as a constant so the read-side query (and any future cleanup logic) can filter on it.
const AI_MISMATCH_REASON = "⚠️ AI Answer Mismatch";
import OpenAI from "openai";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Vertex AI Initialization (ADC)
const vertexAI = new VertexAI({
  project: 'project-27ed127f-554a-419a-b39',
  location: 'us-central1',
});

/**
 * Helper to fetch a question image and return base64 inline data for the model.
 *
 * Resolution order:
 *   1. If the input is already a full http(s) URL (ImageKit, Cloudinary, etc.),
 *      fetch it directly — skip the local filesystem (path.join would mangle
 *      the URL into a bogus disk path).
 *   2. Otherwise treat it as a DB path: try local /public first (dev/seeded
 *      assets), then resolve via getImageUrl (which now returns ImageKit
 *      delivery URLs since the Cloudinary → ImageKit migration).
 *
 * Failures are logged with the resolved URL so missing/broken images are
 * obvious in the dev console — silent failures previously made it look like
 * Gemini was ignoring images when in reality the fetch had 404'd.
 */
async function getImageBase64(filename: string) {
  const isHttpUrl = /^https?:\/\//i.test(filename);

  // Step 1: local filesystem (skipped for URLs)
  if (!isHttpUrl) {
    const fs = await import("fs");
    const path = await import("path");
    const possiblePaths = [
      path.join(process.cwd(), "public", "images", "questions", filename),
      path.join(process.cwd(), "public", filename.startsWith("/") ? filename.slice(1) : filename),
    ];
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath);
          const ext = path.extname(filePath).slice(1).toLowerCase();
          const mimeType = ext === "png" ? "image/png" : (ext === "jpg" || ext === "jpeg") ? "image/jpeg" : "image/webp";
          console.log(`[AI] Image loaded from local: ${filePath}`);
          return { data: data.toString("base64"), mimeType };
        }
      } catch { }
    }
  }

  // Step 2: resolve to a delivery URL. Full URLs pass through unchanged.
  const url = isHttpUrl ? filename : getImageUrl(filename);
  if (!url || !/^https?:\/\//i.test(url)) {
    console.warn(`[AI] No URL resolved for image input: "${filename}" — model will not see this image.`);
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[AI] Image fetch failed: ${response.status} ${response.statusText} — ${url}`);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[AI] Image loaded from URL (${buffer.length} bytes): ${url}`);
    return { data: buffer.toString("base64"), mimeType: response.headers.get("content-type") || "image/jpeg" };
  } catch (err) {
    console.error(`[AI] Image fetch threw for ${url}:`, err);
    return null;
  }
}

/**
 * Generates an AI explanation for a single question and saves it to the DB.
 */
export async function generateAIExplanation(
  questionId: string,
  questionType: "PYQ" | "GeneratedQuestion" | "MockQuestion",
  mockTestId?: string,
  aiModel: "gemini" | "gpt-4o-mini" | "vertex-2.5-pro" = "gemini",
  useSearch: boolean = false
) {
  console.log(`[AI] Generating explanation for ${questionId} using model: ${aiModel}${useSearch ? " + search" : ""}`);
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden");

  if (aiModel === "gemini" && !genAI) throw new Error("GEMINI_API_KEY is not configured");
  if (aiModel === "gpt-4o-mini" && !openai) throw new Error("OPENAI_API_KEY is not configured");

  // Fetch the question data
  let questionData: any = null;

  const qSelect = { id: true, question_text: true, options: true, correct_answer: true, question_type: true, images: true };
  if (questionType === "PYQ") {
    questionData = await prisma.pYQ.findUnique({ where: { id: questionId }, select: qSelect });
  } else if (questionType === "GeneratedQuestion") {
    questionData = await prisma.generatedQuestion.findUnique({ where: { id: questionId }, select: qSelect });
  } else if (questionType === "MockQuestion") {
    if (!mockTestId) throw new Error("mockTestId required for MockQuestion");
    // Pull only the single matching question via JSONB, not the entire
    // template's questions array. Cuts ~500KB-1MB per call to ~5-20KB.
    const rows = await prisma.$queryRaw<{ question: any }[]>`
      SELECT elem AS question
      FROM "MockTestTemplate", jsonb_array_elements(questions) AS elem
      WHERE id = ${mockTestId} AND elem->>'id' = ${questionId}
      LIMIT 1
    `;
    questionData = rows[0]?.question ?? null;
  }

  if (!questionData) throw new Error("Question not found");

  let cleanQuestionText = questionData.question_text || "";
  // Strip massive base64 strings from text if they exist (they eat tokens)
  cleanQuestionText = cleanQuestionText.replace(/data:image\/[^;]+;base64,[^"'\s)]+/g, '[IMAGE_REMOVED_FROM_TEXT]');

  // Question type is fetched from DB — use it to instruct the AI on output
  // format. Without this, MSQs throw false mismatches because the AI defaults
  // to a single-letter answer when the question text doesn't say "select all".
  const qType = (questionData.question_type || "MCQ").toUpperCase();
  const formatHint =
    qType === "MSQ"
      ? `This question is MSQ (multiple-select). The answer is one OR more letters. End with [ANSWER: A,C] (comma-separated, any order).`
      : qType === "NAT"
      ? `This question is NAT (numeric answer, no options). End with [ANSWER: 12.5] (just the numeric value).`
      : `This question is MCQ (single-select). End with [ANSWER: X] where X is a single letter A, B, C, or D.`;

  // === PROMPT 1: Independent verification (no target answer revealed) ===
  // Used purely to detect whether our stored `correct_answer` may be wrong.
  const verifyPrompt = `You are solving an exam question independently. Decide the correct answer using only your own reasoning — do not assume any answer has been provided.

Question type: ${qType}
Question: ${cleanQuestionText}
Options: ${JSON.stringify(questionData.options)}

Rules:
- Reason briefly (under 4 lines), then output your final answer.
- ${formatHint}
- The [ANSWER: ...] tag is REQUIRED on the last line.`;

  // === PROMPT 2: Explanation that derives the stored target answer ===
  const textPrompt = `You are an expert educator. Provide a concise and precise explanation for this question.

Question type: ${qType}
Question: ${cleanQuestionText}
Options: ${JSON.stringify(questionData.options)}
Target Answer: ${questionData.correct_answer}

Rules:
1. CRITICAL: The 'Target Answer' provided is 100% correct. Your ONLY goal is to provide a step-by-step derivation that leads to this specific answer.
2. Use LaTeX ($, $$) for all math and chemical formulas. Wrap ALL math symbols, variables, equations, and chemical formulas (like $KMnO_4$) in $ for inline math or $$ for block math.
3. Use proper KaTeX for limits/integrals: e.g., \int_{0}^{1} or \Big|_0^1. NEVER use $_0^1$.
4. Keep it concise: 5-7 lines max. Only the key steps.
5. Write normal flowing text with proper spaces between words. Do NOT remove spaces between words. Do NOT write with character-level spacing (e.g., do NOT write "G i v e n").
6. Do not restate the final answer letter at the end — the consumer already has it.`;

  console.log(`[AI] Debug - Explanation prompt length: ${textPrompt.length}, options length: ${JSON.stringify(questionData.options).length}`);

  // Pre-fetch images once and reuse across both calls (verification + explanation).
  // Canonical DB shape is [{ index, filename, type? }] — matches the practice
  // page renderer. We deliberately filter out explanation-type images so the
  // verification call isn't primed with the answer's worked solution.
  const rawImages = Array.isArray(questionData.images) ? (questionData.images as Array<{ index?: number; filename?: string; type?: string }>) : [];
  const questionImages = rawImages.filter(img => img && img.filename && img.type !== "explanation");
  console.log(`[AI] Found ${questionImages.length} question images (of ${rawImages.length} total) to process`);
  const fetchedImages: Array<{ data: string; mimeType: string }> = [];
  for (const img of questionImages) {
    const imgResult = await getImageBase64(img.filename!);
    if (imgResult) fetchedImages.push(imgResult);
  }
  console.log(`[AI] Successfully loaded ${fetchedImages.length} / ${questionImages.length} images for the model`);

  // Helper: dispatches to the chosen model. Always called twice — once for
  // verification (grounded=false, fast) and once for explanation.
  async function callAIModel(
    prompt: string,
    grounded: boolean
  ): Promise<{ text: string; usage: { input: number; output: number; thoughts: number } }> {
    const contentParts: any[] = [prompt];
    for (const im of fetchedImages) {
      contentParts.push({ inlineData: { data: im.data, mimeType: im.mimeType } });
    }

    if (aiModel === "gpt-4o-mini" && openai) {
      const messages: any[] = [{ role: "user", content: [{ type: "text", text: prompt }] }];
      for (const im of fetchedImages) {
        messages[0].content.push({
          type: "image_url",
          image_url: { url: `data:${im.mimeType};base64,${im.data}`, detail: "low" },
        });
      }
      const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages });
      const text = response.choices[0].message.content || "";
      if (!text.trim()) throw new Error(`GPT-4o-mini returned empty for ${questionId}`);
      return {
        text,
        usage: {
          input: response.usage?.prompt_tokens ?? 0,
          output: response.usage?.completion_tokens ?? 0,
          thoughts: 0,
        },
      };
    }

    if (aiModel === "vertex-2.5-pro") {
      console.log(`[AI] 🚀 Vertex AI - Model: ${VERTEX_MODEL}${grounded ? " (grounded)" : ""}`);
      const model = vertexAI.getGenerativeModel({
        model: VERTEX_MODEL,
        // @ts-ignore — googleSearch tool type isn't in the Vertex SDK's published types yet
        ...(grounded ? { tools: [{ googleSearch: {} }] } : {}),
      });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: contentParts.map(p => (typeof p === "string" ? { text: p } : p)) }],
      });
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text.trim()) throw new Error(`Vertex returned empty for ${questionId}`);
      const usage = result.response.usageMetadata;
      return {
        text,
        usage: {
          input: usage?.promptTokenCount ?? 0,
          output: usage?.candidatesTokenCount ?? 0,
          thoughts: (usage as any)?.thoughtsTokenCount ?? 0,
        },
      };
    }

    // Default: Gemini AI Studio. Flash-lite can't ground, so swap to full Flash when grounded.
    const activeModel = grounded ? GEMINI_SEARCH_MODEL : GEMINI_MODEL;
    console.log(`[AI] 🚀 Gemini API - Model: ${activeModel}${grounded ? " (grounded)" : ""}`);
    const model = genAI!.getGenerativeModel({
      model: activeModel,
      // @ts-ignore
      tools: grounded ? [{ googleSearch: {} }] : [],
      generationConfig: {
        // @ts-ignore
        thinkingConfig: { thinkingLevel: "HIGH" },
      },
    });
    const result = await model.generateContent(contentParts);
    const text = result.response.text();
    if (!text.trim()) throw new Error(`Gemini returned empty for ${questionId}`);
    const usage = result.response.usageMetadata;
    return {
      text,
      usage: {
        input: usage?.promptTokenCount ?? 0,
        output: usage?.candidatesTokenCount ?? 0,
        thoughts: (usage as any)?.thoughtsTokenCount ?? 0,
      },
    };
  }

  // --- Fire verification + explanation in parallel (no data dependency). ---
  // Verification is never grounded (would waste search quota); explanation
  // respects the per-question useSearch flag.
  const [verifyCall, explainCall] = await Promise.all([
    callAIModel(verifyPrompt, false),
    callAIModel(textPrompt, useSearch),
  ]);

  // Parse the verification result and compute the real mismatch signal.
  const verifyMatch = verifyCall.text.match(/\[ANSWER:\s*([^\]\n]+)\]/i);
  const rawAiAnswer = verifyMatch?.[1].trim() ?? null;

  // Normalize answers for compare: uppercase, split on comma/semicolon, sort,
  // rejoin. Handles MCQ ("A"), MSQ ("A,C" === "C,A"), and NAT ("12.5") uniformly.
  const normalizeAnswer = (s: string): string =>
    s.toUpperCase().split(/[,;]/).map(x => x.trim()).filter(Boolean).sort().join(",");
  const aiNorm = rawAiAnswer ? normalizeAnswer(rawAiAnswer) : "";
  const targetNorm = questionData.correct_answer ? normalizeAnswer(questionData.correct_answer) : "";
  const aiDetectedAnswer = rawAiAnswer;
  const isMismatch = !!rawAiAnswer && aiNorm !== targetNorm;
  console.log(`[AI] Verification → AI: ${rawAiAnswer ?? "(no answer)"}, target: ${questionData.correct_answer}, mismatch: ${isMismatch}`);

  // Cleaned verification text for UI display: strip the [ANSWER: X] tag,
  // keep the reasoning so admin can compare the two derivations side-by-side.
  const verifyText = verifyCall.text
    .replace(/\[ANSWER:\s*[^\]\n]+\]/gi, "")
    .replace(/^```(markdown|latex)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let explanation = explainCall.text;

  // Clean markdown artifacts
  explanation = explanation.replace(/^```(markdown|latex)?\s*/i, '').replace(/```\s*$/, '').trim();

  // Clean up the tag and any redundant natural language conclusions
  const cleanExplanation = explanation
    .replace(/\[CORRECT_OPTION:\s*[A-D]\]/gi, "")
    .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
    .replace(/Correct option is\s*[A-D]\.?/gi, "")
    .trim();

  // Token totals across both calls (verification + explanation).
  const totalInput = verifyCall.usage.input + explainCall.usage.input;
  const totalOutput = verifyCall.usage.output + explainCall.usage.output;
  const totalThoughts = verifyCall.usage.thoughts + explainCall.usage.thoughts;
  const highThinkingFlag = totalThoughts > 8000;
  if (highThinkingFlag) {
    console.warn(`[AI] ⚠️ High thinking tokens: ${totalThoughts} for ${questionId}`);
  }

  // Save back to DB
  if (questionType === "PYQ") {
    await prisma.pYQ.update({ where: { id: questionId }, data: { explanation: cleanExplanation } });
  } else if (questionType === "GeneratedQuestion") {
    await prisma.generatedQuestion.update({ where: { id: questionId }, data: { explanation: cleanExplanation } });
  } else if (questionType === "MockQuestion" && mockTestId) {
    await patchMockQuestion(mockTestId, questionId, {
      explanation: cleanExplanation,
      ai_answer_mismatch: isMismatch,
      ai_detected_answer: aiDetectedAnswer,
      high_thinking_flag: highThinkingFlag,
    });
  }

  // Surface AI mismatches via the existing QuestionReport table. PYQ and
  // GeneratedQuestion don't have JSONB metadata fields like MockQuestion does,
  // so we use QuestionReport (which admin/reports already reads). Mock mismatches
  // are flagged inline in the JSONB above; no QuestionReport row needed for them.
  if (questionType === "PYQ" || questionType === "GeneratedQuestion") {
    const reportFilter =
      questionType === "PYQ"
        ? { pyq_id: questionId, reason: AI_MISMATCH_REASON, status: "pending" }
        : { question_id: questionId, reason: AI_MISMATCH_REASON, status: "pending" };

    // Always clear the prior pending mismatch report — if the current run came
    // back clean, an earlier flag should disappear too.
    await prisma.questionReport.deleteMany({ where: reportFilter });

    if (isMismatch) {
      await prisma.questionReport.create({
        data: {
          ...reportFilter,
          user_id: userId,
          details: `AI's independent solution arrived at "${aiDetectedAnswer}" but the stored correct_answer is "${questionData.correct_answer}". Verify which one is right.`,
        },
      });
    }
  }

  revalidatePath("/admin/reports");

  return {
    explanation: cleanExplanation,
    verifyText,
    highThinkingFlag,
    usage: {
      input: totalInput,
      output: totalOutput,
      thoughts: totalThoughts,
    },
    isMismatch,
    aiDetectedAnswer,
  };
}

/**
 * Batch-processes a mock test: generates AI explanations for ALL questions
 * that are missing explanations. Uses a 5-second delay between requests
 * to stay within Gemini Free Tier rate limits (15 RPM).
 *
 * Returns { total, fixed, failed }
 */
export async function processMockTestExplanations(mockTestId: string, aiModel: "gemini" | "gpt-4o-mini" = "gemini") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden");

  if (aiModel === "gemini" && !genAI) throw new Error("GEMINI_API_KEY is not configured");
  if (aiModel === "gpt-4o-mini" && !openai) throw new Error("OPENAI_API_KEY is not configured");

  // Pull only questions that actually need fixing (empty explanation) instead
  // of the entire questions JSONB array. For a 65-question template where 5
  // need fixes, this drops egress from ~500KB to ~50KB.
  const rows = await prisma.$queryRaw<{ title: string; total_questions: number; question: any }[]>`
    SELECT t.title, t.total_questions, elem AS question
    FROM "MockTestTemplate" t, jsonb_array_elements(t.questions) AS elem
    WHERE t.id = ${mockTestId}
      AND (elem->>'explanation' IS NULL OR trim(elem->>'explanation') = '')
  `;
  if (rows.length === 0) {
    const titleRow = await prisma.mockTestTemplate.findUnique({
      where: { id: mockTestId },
      select: { title: true, total_questions: true },
    });
    if (!titleRow) throw new Error("Mock test not found");
    return { total: titleRow.total_questions, fixed: 0, failed: 0, totalInputTokens: 0, totalOutputTokens: 0 };
  }
  const template = { title: rows[0].title } as { title: string };
  const questions = rows.map((r) => r.question);
  const total = rows[0].total_questions;
  let fixed = 0;
  let failed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.explanation || q.explanation.trim() === "") {
      try {
        console.log(`[AI] (${fixed + failed + 1}) Generating explanation for Q: ${q.id} in "${template.title}"...`);


        let cleanQText = q.question_text || "";
        cleanQText = cleanQText.replace(/data:image\/[^;]+;base64,[^"'\s)]+/g, '[IMAGE_REMOVED_FROM_TEXT]');

        const prompt = `You are an expert educator. Provide a concise  and precise explanation for this question.

Question: ${cleanQText}
Options: ${JSON.stringify(q.options)}
Target Answer: ${q.correct_answer}

Rules:
1. CRITICAL: The 'Target Answer' provided is 100% correct. Your ONLY goal is to provide a step-by-step derivation that leads to this specific answer.
2. Use LaTeX ($, $$) for all math and chemical formulas. Wrap ALL math symbols, variables, equations, and chemical formulas (like $KMnO_4$) in $ for inline math or $$ for block math.
3. Use proper KaTeX for limits: e.g., \Big|_0^1. NEVER use $_0^1$.
4. Keep it concise: 6-8 lines max. Only the key steps.
5. Write normal flowing text with proper spaces between words. Do NOT remove spaces between words. Do NOT write with character-level spacing (e.g., do NOT write "G i v e n").
6. MANDATORY: End with [CORRECT_OPTION: X] where X is A, B, C, or D.`;

        const contentParts: any[] = [prompt];

        // NEW: Fetch images for batch processing too
        const images = (q.images as any[]) || [];
        if (images.length > 0) {
          for (const img of images) {
            const filename = img.filename || img.url;
            if (!filename) continue;
            const imgRes = await getImageBase64(filename);
            if (imgRes) {
              contentParts.push({
                inlineData: { data: imgRes.data, mimeType: imgRes.mimeType }
              });
            }
          }
        }

        let explanation = "";
        let questionThoughts = 0;

        if (aiModel === "gpt-4o-mini" && openai) {
          const messages: any[] = [{ role: "user", content: [{ type: "text", text: prompt }] }];
          // Add images for GPT-4o-mini batch too
          if (images.length > 0) {
            for (const img of images) {
              const filename = img.filename || img.url;
              if (!filename) continue;
              const imgRes = await getImageBase64(filename);
              if (imgRes) {
                messages[0].content.push({
                  type: "image_url",
                  image_url: { url: `data:${imgRes.mimeType};base64,${imgRes.data}`, detail: "low" }
                });
              }
            }
          }
          const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages });
          explanation = response.choices[0].message.content || "";
          totalInputTokens += response.usage?.prompt_tokens || 0;
          totalOutputTokens += response.usage?.completion_tokens || 0;
          if (!explanation.trim()) {
            throw new Error(`GPT-4o-mini returned empty explanation for question ${q.id}`);
          }
        } else {
          // --- ORIGINAL API KEY METHOD ---
          const model = genAI!.getGenerativeModel({
            model: GEMINI_MODEL,
            tools: [],
            generationConfig: {
            
              // @ts-ignore
              thinkingConfig: { thinkingLevel: "HIGH" },
            }
          });
          const result = await model.generateContent(contentParts);
          explanation = result.response.text();
          const usage = result.response.usageMetadata;
          totalInputTokens += usage?.promptTokenCount || 0;
          totalOutputTokens += usage?.candidatesTokenCount || 0;

          /* --- VERTEX AI METHOD (ADC) (Commented) ---
          console.log(`[AI] 🚀 Using Vertex AI (ADC) for Batch - Model: ${GEMINI_MODEL}`);
          const model = vertexAI.getGenerativeModel({
            model: GEMINI_MODEL,
          });

          const vertexContent = {
            contents: [{
              role: 'user',
              parts: contentParts.map(p => typeof p === 'string' ? { text: p } : p)
            }]
          };

          const result = await model.generateContent(vertexContent);
          explanation = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const u = result.response.usageMetadata;
          totalInputTokens += u?.promptTokenCount || 0;
          totalOutputTokens += u?.candidatesTokenCount || 0;
          if (!explanation.trim()) {
            throw new Error(`AI returned empty explanation for question ${q.id} — candidates: ${result.response.candidates?.length ?? 0}`);
          }
          */
          questionThoughts = (usage as any)?.thoughtsTokenCount || 0;
          if (questionThoughts > 8000) {
            console.warn(`[AI] ⚠️ High thinking tokens: ${questionThoughts} for question ${q.id}`);
          }
        }

        // Detect Mismatch
        const aiAnswerMatch = explanation.match(/\[CORRECT_OPTION:\s*([A-D])\]/i);
        const aiDetectedAnswer = aiAnswerMatch ? aiAnswerMatch[1].toUpperCase() : null;
        const isMismatch = aiDetectedAnswer && aiDetectedAnswer !== q.correct_answer?.toUpperCase();

        // Clean Explanation
        const cleanExplanation = explanation
          .replace(/\[CORRECT_OPTION:\s*[A-D]\]/gi, "")
          .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
          .replace(/Correct option is\s*[A-D]\.?/gi, "")
          .trim();

        fixed++;
        await patchMockQuestion(mockTestId, q.id, {
          explanation: cleanExplanation,
          ai_answer_mismatch: isMismatch,
          ai_detected_answer: aiDetectedAnswer,
          high_thinking_flag: questionThoughts > 8000,
        });



      } catch (err) {
        console.error(`[AI] ❌ Failed for question ${q.id}:`, err);
        failed++;
      }
    }
  }

  console.log(`[AI] 🏁 Batch complete for "${template.title}": ${fixed} fixed, ${failed} failed, ${total} total`);
  console.log(`[AI] 📊 Total Tokens for Batch: Input: ${totalInputTokens}, Output: ${totalOutputTokens}, Sum: ${totalInputTokens + totalOutputTokens}`);
  revalidatePath("/admin/reports");
  return { total, fixed, failed, totalInputTokens, totalOutputTokens };
}

/**
 * Fetches all unique topics available in the Pattern table.
 * Used to give the AI a list of allowed categories.
 */
/**
 * Fetches unique topic names grouped by exam type AND subject.
 * Normalizes keys (e.g., "JEE Main" -> "JEE_MAIN", "Physics" -> "PHYSICS").
 */
export async function getAllTopics() {
  return unstable_cache(
    async () => {
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
    },
    ["admin-all-topics"],
    { revalidate: 3600, tags: ["patterns"] }
  )();
}

/**
 * Uses AI to categorize a question into one of the provided topics.
 */
export async function generateQuestionTopic(
  questionText: string,
  options: string[],
  allowedTopics: string[],
  images: any[] = [],
  aiModel: "gemini" | "gpt-4o-mini" = "gpt-4o-mini"
) {
  if (aiModel === "gemini" && !genAI) throw new Error("GEMINI_API_KEY not set");
  if (aiModel === "gpt-4o-mini" && !openai) throw new Error("OPENAI_API_KEY not set");

  // STATIC PART (First): This will be cached by GPT-4o Mini to save tokens
  const staticContext = `You are an academic expert. Categorize exam questions into EXACTLY ONE topic from this list:

--- ALLOWED TOPICS START ---
${allowedTopics.join("\n")}
--- ALLOWED TOPICS END ---

Rules:
1. Return ONLY the topic name from the list.
2. If it doesn't fit perfectly, choose the closest match.
3. No preamble, no markdown, no explanation.`;

  // VARIABLE PART (Last): This changes for every question
  const variableContext = `
Question: ${questionText}
Options: ${JSON.stringify(options)}`;

  const fullPrompt = `${staticContext}\n\n${variableContext}`;

  const contentParts: any[] = [fullPrompt];
  const gptMessages: any[] = [{
    role: "user",
    content: [{ type: "text", text: fullPrompt }]
  }];

  // Process Images
  if (images.length > 0) {
    for (const img of images) {
      const filename = img.filename || img.url;
      if (!filename) continue;

      const imgRes = await getImageBase64(filename);
      if (imgRes) {
        contentParts.push({ inlineData: { data: imgRes.data, mimeType: imgRes.mimeType } });
        (gptMessages[0].content as any[]).push({
          type: "image_url",
          image_url: { url: `data:${imgRes.mimeType};base64,${imgRes.data}`, detail: "low" }
        });
      }
    }
  }

  let topic = "Unknown";
  let usage = { input: 0, output: 0 };

  if (aiModel === "gpt-4o-mini" && openai) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: gptMessages,
      temperature: 0,
    });
    topic = response.choices[0].message.content?.trim() || "Unknown";
    usage = { input: response.usage?.prompt_tokens || 0, output: response.usage?.completion_tokens || 0 };
  } else {
    // --- ORIGINAL API KEY METHOD ---
    const model = genAI!.getGenerativeModel({
      model: GEMINI_TOPIC_MODEL, // Use the constant
      tools: [],
      generationConfig: {
        maxOutputTokens: 20,
        temperature: 0,
      }
    });
    const result = await model.generateContent(contentParts);
    topic = result.response.text().trim();
    const u = result.response.usageMetadata;
    usage = { input: u?.promptTokenCount || 0, output: u?.candidatesTokenCount || 0 };

    /* --- VERTEX AI METHOD (ADC) (Commented) ---
    console.log(`[AI] 🚀 Topic Gen using Vertex AI (ADC) - Model: ${GEMINI_TOPIC_MODEL}`);
    const model = vertexAI.getGenerativeModel({
      model: GEMINI_TOPIC_MODEL,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.1, // Keep it precise for topic matching
      }
    });

    const vertexContent = {
      contents: [{
        role: 'user',
        parts: contentParts.map(p => typeof p === 'string' ? { text: p } : p)
      }]
    };

    const result = await model.generateContent(vertexContent);
    topic = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Unknown";
    const u = result.response.usageMetadata;
    usage = { input: u?.promptTokenCount || 0, output: u?.candidatesTokenCount || 0 };
    */
  }

  // Final check: Ensure the returned topic is actually in our list (avoid AI hallucinations)
  const exactMatch = allowedTopics.find(t => t.toLowerCase() === topic.toLowerCase());
  return { topic: exactMatch || topic, usage };
}


/**
 * Saves a topic to a specific question inside a MockTestTemplate JSON.
 */
export async function updateMockTestQuestionTopic(
  mockTestId: string,
  questionId: string,
  topic: string
) {
  // Patch the question topic in place, then rebuild the summary topics array from the updated questions.
  await patchMockQuestion(mockTestId, questionId, { topic });

  await prisma.$executeRaw`
    UPDATE "MockTestTemplate"
    SET topics = (
      SELECT array_agg(DISTINCT elem->>'topic')
      FROM jsonb_array_elements(questions) AS elem
      WHERE elem->>'topic' IS NOT NULL AND elem->>'topic' != 'Unknown'
    )
    WHERE id = ${mockTestId}
  `;

  return { success: true };
}

/**
 * Returns GATE CSE PYQs that have an empty/missing explanation.
 * Only fetches the minimal fields needed for display + AI generation — no egress waste.
 */
export async function getGateCsePyqsMissingExplanation(
  page = 0,
  pageSize = 50,
  examType = "GATE",
  branch = "CSE",
  topic: string | null = null,
  subject: string | null = null,
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden");

  const offset = page * pageSize;

  const pyqWhere = {
    pattern: {
      exam_type: examType,
      branch: branch || undefined,
      ...(topic ? { topic_name: topic } : {}),
      ...(subject && !topic ? { subject } : {}),
    },
    explanation: "",
  };

  const [pyqs, totalPyq] = await Promise.all([
    prisma.pYQ.findMany({
      where: pyqWhere,
      select: {
        id: true,
        question_text: true,
        options: true,
        correct_answer: true,
        year: true,
        marks: true,
        images: true,
        pattern: { select: { subject: true, topic_name: true } },
      },
      orderBy: { year: "desc" },
      skip: offset,
      take: pageSize,
    }),
    prisma.pYQ.count({ where: pyqWhere }),
  ]);

  const stripBase64 = (text: string) =>
    text.replace(/data:image\/[^;]+;base64,[^"'\s)]{100,}/g, "[image]");

  return {
    pyqs: pyqs.map(q => ({ ...q, question_text: stripBase64(q.question_text), questionType: "PYQ" as const, subject: q.pattern.subject, topic: q.pattern.topic_name, images: q.images as { index: number; filename: string; type?: string }[] | null })),
    subjectPyqs: [] as never[],
    totalPyq,
    totalSubjectPyq: 0,
    page,
    pageSize,
  };
}

export async function getExamTypesWithMissingExplanations() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden");

  const rows = await prisma.pattern.findMany({
    where: { pyqs: { some: { explanation: "" } } },
    select: { exam_type: true, branch: true },
    distinct: ["exam_type", "branch"],
    orderBy: { exam_type: "asc" },
  });

  return rows.map(r => ({ examType: r.exam_type, branch: r.branch }));
}

export async function getTopicsForExam(examType: string, branch: string | null) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden");

  const rows = await prisma.pattern.findMany({
    where: {
      exam_type: examType,
      ...(branch ? { branch } : {}),
      pyqs: { some: { explanation: "" } },
    },
    select: { topic_name: true, subject: true },
    orderBy: [{ subject: "asc" }, { topic_name: "asc" }],
  });

  return rows.map(r => ({ topic: r.topic_name, subject: r.subject }));
}

export async function getMockTestQuestions(mockTestId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (!checkIsAdmin(await getAdminEmail(userId))) throw new Error("Forbidden");

  // Only fetch questions that still need categorization — filter in Postgres, not JS
  const rows = await prisma.$queryRaw<{ question: any }[]>`
    SELECT elem AS question
    FROM "MockTestTemplate",
    jsonb_array_elements(questions) AS elem
    WHERE id = ${mockTestId}
      AND (elem->>'topic' IS NULL OR trim(elem->>'topic') = '' OR elem->>'topic' = 'Unknown' OR elem->>'topic' = 'Uncategorized')
  `;

  return rows.map(({ question: { explanation, correct_answer, ai_answer_mismatch, ai_detected_answer, ...q } }) => q);
}

