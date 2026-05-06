"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import { getCloudinaryUrl } from "@/lib/imageUtils";

export async function resolveReport(
  reportId: string,
  questionId: string,
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | "MockQuestion" | "subject_pyq" | "pyq",
  updates: {
    question_text?: string,
    correct_answer?: string,
    explanation?: string,
    options?: any,
    images?: any,
    mockTestId?: string, // Required if questionType is MockQuestion
    ai_answer_mismatch?: boolean,
    ai_detected_answer?: string | null
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get email from our own database to avoid Clerk API timeouts in Server Actions
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();

  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }


  // Update the actual question
  if (questionType === "MockQuestion") {
    if (!updates.mockTestId) throw new Error("Mock Test ID is required for MockQuestion updates");
    const mockTest = await prisma.mockTestTemplate.findUnique({
      where: { id: updates.mockTestId }
    });

    if (!mockTest) throw new Error("Mock Test not found");

    const questions = [...(mockTest.questions as any[])];
    const qIndex = questions.findIndex(q => q.id === questionId);

    if (qIndex === -1) throw new Error("Question not found in Mock Test");

    // Merge updates (including mismatch flags for mock questions)
    questions[qIndex] = {
      ...questions[qIndex],
      ...updates
    };
    // Don't save mockTestId back into the question JSON
    delete questions[qIndex].mockTestId;

    await prisma.mockTestTemplate.update({
      where: { id: updates.mockTestId },
      data: { questions }
    });
  } else {
    // For standard questions, we only update fields that exist in the schema
    const { ai_answer_mismatch, ai_detected_answer, mockTestId, ...validUpdates } = updates;
    
    if (questionType === "SubjectPYQ" || questionType === "subject_pyq") {
      await prisma.subjectPYQ.update({
        where: { id: questionId },
        data: validUpdates as any
      });
    } else if (questionType === "PYQ" || questionType === "pyq") {
      await prisma.pYQ.update({
        where: { id: questionId },
        data: validUpdates as any
      });
    } else {
      await prisma.generatedQuestion.update({
        where: { id: questionId },
        data: validUpdates as any
      });
    }
  }

  // Mark report as resolved ONLY if it's a real report, not a virtual one
  if (!reportId.startsWith("auto-")) {
    await prisma.questionReport.update({
      where: { id: reportId },
      data: { status: "resolved" }
    });
  }

  revalidatePath("/admin/reports");
}

export async function deleteQuestion(
  questionId: string,
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | "MockQuestion",
  mockTestId?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }

  // Delete the actual question (Cascades to reports, bookmarks, attempts)
  if (questionType === "SubjectPYQ") {
    await prisma.subjectPYQ.delete({ where: { id: questionId } });
  } else if (questionType === "PYQ") {
    await prisma.pYQ.delete({ where: { id: questionId } });
  } else if (questionType === "MockQuestion") {
    if (!mockTestId) throw new Error("Mock Test ID is required for MockQuestion deletion");

    const mockTest = await prisma.mockTestTemplate.findUnique({
      where: { id: mockTestId }
    });

    if (!mockTest) throw new Error("Mock Test not found");

    const questions = (mockTest.questions as any[]).filter(q => q.id !== questionId);

    await prisma.mockTestTemplate.update({
      where: { id: mockTestId },
      data: { questions }
    });
  } else {
    await prisma.generatedQuestion.delete({ where: { id: questionId } });
  }

  revalidatePath("/admin/reports");
}

export async function quickEditExplanation(
  questionId: string,
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | string,
  explanation: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }

  if (questionType === "SubjectPYQ" || questionType === "subject_pyq") {
    await prisma.subjectPYQ.update({
      where: { id: questionId },
      data: { explanation }
    });
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

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }

  if (questionType === "MockQuestion" && mockTestId) {
    const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
    if (template) {
      const questions = [...(template.questions as any[])];
      const idx = questions.findIndex(q => q.id === questionId);
      if (idx !== -1) {
        questions[idx] = { 
          ...questions[idx], 
          ai_answer_mismatch: flagStatus,
          manual_flag: flagStatus 
        };
        await prisma.mockTestTemplate.update({
          where: { id: mockTestId },
          data: { questions }
        });
      }
    }
  }

  revalidatePath("/admin/reports");
}

export async function deleteMockTest(mockTestId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }

  // Delete all related test sessions first (manual cascade)
  await prisma.testSession.deleteMany({
    where: { mock_test_id: mockTestId }
  });

  // Then delete the template
  await prisma.mockTestTemplate.delete({
    where: { id: mockTestId }
  });

  revalidatePath("/mocktest");
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
import OpenAI from "openai";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Helper to fetch image as base64 from local or Cloudinary
 */
async function getImageBase64(filename: string) {
  const fs = await import("fs");
  const path = await import("path");

  // 1. Try local paths first
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
        return { data: data.toString("base64"), mimeType };
      }
    } catch { }
  }

  // 2. Fallback to Cloudinary URL
  const cloudinaryUrl = getCloudinaryUrl(filename);
  if (cloudinaryUrl.startsWith("http")) {
    try {
      const response = await fetch(cloudinaryUrl);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        return { data: buffer.toString("base64"), mimeType: response.headers.get("content-type") || "image/jpeg" };
      }
    } catch (err) {
      console.error(`[AI] Failed to fetch image from Cloudinary: ${cloudinaryUrl}`, err);
    }
  }
  return null;
}

/**
 * Generates an AI explanation for a single question and saves it to the DB.
 */
export async function generateAIExplanation(
  questionId: string,
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | "MockQuestion",
  mockTestId?: string,
  aiModel: "gemini" | "gpt-4o-mini" = "gemini"
) {
  console.log(`[AI] Generating explanation for ${questionId} using model: ${aiModel}`);
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!checkIsAdmin(dbUser?.email?.toLowerCase())) throw new Error("Forbidden");

  if (aiModel === "gemini" && !genAI) throw new Error("GEMINI_API_KEY is not configured");
  if (aiModel === "gpt-4o-mini" && !openai) throw new Error("OPENAI_API_KEY is not configured");

  // Fetch the question data
  let questionData: any = null;

  if (questionType === "SubjectPYQ") {
    questionData = await prisma.subjectPYQ.findUnique({ where: { id: questionId } });
  } else if (questionType === "PYQ") {
    questionData = await prisma.pYQ.findUnique({ where: { id: questionId } });
  } else if (questionType === "GeneratedQuestion") {
    questionData = await prisma.generatedQuestion.findUnique({ where: { id: questionId } });
  } else if (questionType === "MockQuestion") {
    if (!mockTestId) throw new Error("mockTestId required for MockQuestion");
    const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
    if (template) {
      const questions = template.questions as any[];
      questionData = questions.find(q => q.id === questionId);
    }
  }

  if (!questionData) throw new Error("Question not found");

  // Build content parts for Gemini (text + images if any)
  let cleanQuestionText = questionData.question_text || "";
  // Strip massive base64 strings from text if they exist (they eat tokens)
  cleanQuestionText = cleanQuestionText.replace(/data:image\/[^;]+;base64,[^"'\s)]+/g, '[IMAGE_REMOVED_FROM_TEXT]');

  const textPrompt = `You are an expert educator. Provide a concise and precise explanation for this question.

Question: ${cleanQuestionText}
Options: ${JSON.stringify(questionData.options)}
Target Answer: ${questionData.correct_answer}

Rules:
1. CRITICAL: The 'Target Answer' provided is 100% correct. Your ONLY goal is to provide a step-by-step derivation that leads to this specific answer. Do not suggest other answers.
2. Use LaTeX ($, $$) for all math.
3. Keep it concise: 5-7 lines max. Only the key steps.
4. No preamble, no markdown code blocks.
5. MANDATORY: End with [CORRECT_OPTION: X] where X is A, B, C, or D.
6. DO NOT write "Therefore, the correct option is..." — the tag in rule 5 is enough.`;

  console.log(`[AI] Debug - Text Length: ${textPrompt.length}, Options Length: ${JSON.stringify(questionData.options).length}`);
  console.log(`[AI] Prompt Snippet: ${textPrompt.substring(0, 150)}...`);

  const contentParts: any[] = [textPrompt];

  // If question has images, fetch them and include as inline data
  const images = (questionData.images as any[]) || [];
  console.log(`[AI] Found ${images.length} images to process`);
  if (images.length > 0) {
    for (const img of images) {
      const filename = img.filename || img.url;
      if (!filename) continue;

      const imgResult = await getImageBase64(filename);
      if (imgResult) {
        contentParts.push({
          inlineData: { data: imgResult.data, mimeType: imgResult.mimeType }
        });
      }
    }
  }

  let explanation = "";
  let openaiUsage: any = null;
  let geminiUsage: any = null;

  if (aiModel === "gpt-4o-mini" && openai) {
    const messages: any[] = [{ role: "user", content: [{ type: "text", text: textPrompt }] }];

    // Add images if any
    if (images.length > 0) {
      for (const img of images) {
        const filename = img.filename || img.url;
        if (!filename) continue;
        const imgResult = await getImageBase64(filename);
        if (imgResult) {
          messages[0].content.push({
            type: "image_url",
            image_url: {
              url: `data:${imgResult.mimeType};base64,${imgResult.data}`,
              detail: "low"
            }
          });
        }
      }
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });
    explanation = response.choices[0].message.content || "";
    openaiUsage = response.usage;
    console.log(`[AI] OpenAI Tokens: Input: ${response.usage?.prompt_tokens}, Output: ${response.usage?.completion_tokens}, Total: ${response.usage?.total_tokens}`);
  } else {
    const model = genAI!.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [],
      generationConfig: {
        maxOutputTokens: 2500,
        // @ts-ignore - Allow moderate thinking for JEE math/physics accuracy
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });
    const result = await model.generateContent(contentParts);
    explanation = result.response.text();
    geminiUsage = result.response.usageMetadata;
    console.log(`[AI] Gemini Tokens: Input: ${geminiUsage?.promptTokenCount}, Output: ${geminiUsage?.candidatesTokenCount}, Thoughts: ${(geminiUsage as any)?.thoughtsTokenCount || 0}, Total: ${geminiUsage?.totalTokenCount}`);
  }

  // Clean markdown artifacts
  explanation = explanation.replace(/^```(markdown|latex)?\s*/i, '').replace(/```\s*$/, '').trim();

  // Save back to DB
  if (questionType === "SubjectPYQ") {
    await prisma.subjectPYQ.update({ where: { id: questionId }, data: { explanation } });
  } else if (questionType === "PYQ") {
    await prisma.pYQ.update({ where: { id: questionId }, data: { explanation } });
  } else if (questionType === "GeneratedQuestion") {
    await prisma.generatedQuestion.update({ where: { id: questionId }, data: { explanation } });
  } else if (questionType === "MockQuestion" && mockTestId) {
    const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
    if (template) {
      const questions = [...(template.questions as any[])];
      const idx = questions.findIndex(q => q.id === questionId);
      if (idx !== -1) {
        questions[idx] = { ...questions[idx], explanation };
        await prisma.mockTestTemplate.update({
          where: { id: mockTestId },
          data: { questions }
        });
      }
    }
  }

  revalidatePath("/admin/reports");
  // Extract AI's verified answer
  const aiAnswerMatch = explanation.match(/\[CORRECT_OPTION:\s*([A-D])\]/i);
  const aiDetectedAnswer = aiAnswerMatch ? aiAnswerMatch[1].toUpperCase() : null;
  const isMismatch = aiDetectedAnswer && aiDetectedAnswer !== questionData.correct_answer?.toUpperCase();

  // Clean up the tag and any redundant natural language conclusions
  const cleanExplanation = explanation
    .replace(/\[CORRECT_OPTION:\s*[A-D]\]/gi, "")
    .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
    .replace(/Correct option is\s*[A-D]\.?/gi, "")
    .trim();

  return {
    explanation: cleanExplanation,
    usage: {
      input: (openaiUsage?.prompt_tokens || geminiUsage?.promptTokenCount || 0),
      output: (openaiUsage?.completion_tokens || geminiUsage?.candidatesTokenCount || 0)
    },
    isMismatch,
    aiDetectedAnswer
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
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!checkIsAdmin(dbUser?.email?.toLowerCase())) throw new Error("Forbidden");

  if (aiModel === "gemini" && !genAI) throw new Error("GEMINI_API_KEY is not configured");
  if (aiModel === "gpt-4o-mini" && !openai) throw new Error("OPENAI_API_KEY is not configured");

  const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
  if (!template) throw new Error("Mock test not found");

  const questions = [...(template.questions as any[])];
  const total = questions.length;
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
1. CRITICAL: The 'Target Answer' provided is 100% correct. Your ONLY goal is to provide a step-by-step derivation that leads to this specific answer. Do not suggest other answers.
2. Use LaTeX ($, $$) for all math.
3. Keep it concise: 6-8 lines max. Only the key steps.
4. No preamble, no markdown code blocks.
5. MANDATORY: End with [CORRECT_OPTION: X] where X is A, B, C, or D.`;

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
        } else {
          const model = genAI!.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            tools: [],
            generationConfig: {
              maxOutputTokens: 2500,
              // @ts-ignore - Allow moderate thinking for JEE math/physics accuracy
              thinkingConfig: { thinkingBudget: 1024 },
            }
          });
          const result = await model.generateContent(contentParts);
          explanation = result.response.text();
          const usage = result.response.usageMetadata;
          totalInputTokens += usage?.promptTokenCount || 0;
          totalOutputTokens += usage?.candidatesTokenCount || 0;
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

        questions[i] = {
          ...questions[i],
          explanation: cleanExplanation,
          ai_answer_mismatch: isMismatch,
          ai_detected_answer: aiDetectedAnswer
        };

        fixed++;
        await prisma.mockTestTemplate.update({
          where: { id: mockTestId },
          data: { questions }
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
  const patterns = await prisma.pattern.findMany({
    select: { topic_name: true, exam_type: true, subject: true },
    orderBy: { topic_name: "asc" }
  });

  const topicMap: Record<string, Record<string, string[]>> = {};

  patterns.forEach(p => {
    const normalizedExam = p.exam_type.toUpperCase().replace(/\s+/g, '_');
    const normalizedSubject = (p.subject || "GENERAL").toUpperCase().trim();

    if (!topicMap[normalizedExam]) topicMap[normalizedExam] = {};
    if (!topicMap[normalizedExam][normalizedSubject]) {
      topicMap[normalizedExam][normalizedSubject] = [];
    }

    if (!topicMap[normalizedExam][normalizedSubject].includes(p.topic_name)) {
      topicMap[normalizedExam][normalizedSubject].push(p.topic_name);
    }
  });

  return topicMap;
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
    const model = genAI!.getGenerativeModel({ 
      model: "gemini-2.0-flash",
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
  const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
  if (!template) throw new Error("Mock test not found");

  const questions = [...(template.questions as any[])];
  const idx = questions.findIndex(q => q.id === questionId);
  if (idx !== -1) {
    questions[idx] = { ...questions[idx], topic };

    // Sync the summary 'topics' array
    const allTopics = questions
      .map(q => q.topic)
      .filter(t => t && t !== "Unknown");
    const uniqueTopics = Array.from(new Set(allTopics));

    await prisma.mockTestTemplate.update({
      where: { id: mockTestId },
      data: {
        questions,
        topics: uniqueTopics
      }
    });
  }
  return { success: true };
}


