"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export async function resolveReport(
  reportId: string,
  questionId: string,
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | "MockQuestion",
  updates: {
    question_text?: string,
    correct_answer?: string,
    explanation?: string,
    options?: any,
    images?: any,
    mockTestId?: string // Required if questionType is MockQuestion
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
  if (questionType === "SubjectPYQ") {
    await prisma.subjectPYQ.update({
      where: { id: questionId },
      data: updates
    });
  } else if (questionType === "PYQ") {
    await prisma.pYQ.update({
      where: { id: questionId },
      data: updates
    });
  } else if (questionType === "MockQuestion") {
    if (!updates.mockTestId) throw new Error("Mock Test ID is required for MockQuestion updates");

    const mockTest = await prisma.mockTestTemplate.findUnique({
      where: { id: updates.mockTestId }
    });

    if (!mockTest) throw new Error("Mock Test not found");

    const questions = [...(mockTest.questions as any[])];
    const qIndex = questions.findIndex(q => q.id === questionId);

    if (qIndex === -1) throw new Error("Question not found in Mock Test");

    // Merge updates
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
    await prisma.generatedQuestion.update({
      where: { id: questionId },
      data: updates
    });
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

/**
 * Generates an AI explanation for a single question and saves it to the DB.
 */
export async function generateAIExplanation(
  questionId: string,
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | "MockQuestion",
  mockTestId?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!checkIsAdmin(dbUser?.email?.toLowerCase())) throw new Error("Forbidden");

  if (!genAI) throw new Error("GEMINI_API_KEY is not configured");

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
  const textPrompt = `You are an expert educator. Give a SHORT and PRECISE explanation for this question in 3-5 sentences max.

Question: ${questionData.question_text}
Options: ${JSON.stringify(questionData.options)}
Correct Answer: ${questionData.correct_answer}

Rules: Be concise. Use LaTeX ($, $$) for math. State the key concept, explain why the answer is correct in 4-6 lines. No preamble, no markdown code blocks.`;

  const contentParts: any[] = [textPrompt];

  // If question has images, fetch them and include as inline data
  const images = (questionData.images as any[]) || [];
  if (images.length > 0) {
    const fs = await import("fs");
    const path = await import("path");

    for (const img of images) {
      const filename = img.filename || img.url;
      if (!filename) continue;

      // Try multiple possible paths
      const possiblePaths = [
        path.join(process.cwd(), "public", "images", "questions", filename),
        path.join(process.cwd(), "public", filename.startsWith("/") ? filename.slice(1) : filename),
      ];

      for (const filePath of possiblePaths) {
        try {
          if (fs.existsSync(filePath)) {
            const imageData = fs.readFileSync(filePath);
            const base64 = imageData.toString("base64");
            const ext = path.extname(filePath).slice(1).toLowerCase();
            const mimeType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/webp";

            contentParts.push({
              inlineData: { data: base64, mimeType }
            });
            break;
          }
        } catch { /* skip if file not found */ }
      }
    }
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(contentParts);
  let explanation = result.response.text();

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
  return explanation;
}

/**
 * Batch-processes a mock test: generates AI explanations for ALL questions
 * that are missing explanations. Uses a 5-second delay between requests
 * to stay within Gemini Free Tier rate limits (15 RPM).
 *
 * Returns { total, fixed, failed }
 */
export async function processMockTestExplanations(mockTestId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!checkIsAdmin(dbUser?.email?.toLowerCase())) throw new Error("Forbidden");

  if (!genAI) throw new Error("GEMINI_API_KEY is not configured");

  const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
  if (!template) throw new Error("Mock test not found");

  const questions = [...(template.questions as any[])];
  const total = questions.length;
  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.explanation || q.explanation.trim() === "") {
      try {
        console.log(`[AI] (${fixed + failed + 1}) Generating explanation for Q: ${q.id} in "${template.title}"...`);

        const prompt = `You are an expert educator. Give a SHORT and PRECISE explanation for this question in 3-5 sentences max.

Question: ${q.question_text}
Options: ${JSON.stringify(q.options)}
Correct Answer: ${q.correct_answer}

Rules: Be concise. Use LaTeX ($, $$) for math. State the key concept, explain why the answer is correct in 2-3 lines. No preamble, no markdown code blocks.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let explanation = result.response.text();
        explanation = explanation.replace(/^```(markdown|latex)?\s*/i, '').replace(/```\s*$/, '').trim();

        questions[i] = { ...questions[i], explanation };
        fixed++;
        console.log(`[AI] ✅ Done (${fixed} fixed so far)`);

        // Save after each successful generation (in case the process is interrupted)
        await prisma.mockTestTemplate.update({
          where: { id: mockTestId },
          data: { questions }
        });

        // Wait 5 seconds before next request
        if (i < questions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (err) {
        console.error(`[AI] ❌ Failed for question ${q.id}:`, err);
        failed++;
      }
    }
  }

  console.log(`[AI] 🏁 Batch complete for "${template.title}": ${fixed} fixed, ${failed} failed, ${total} total`);
  revalidatePath("/admin/reports");
  return { total, fixed, failed };
}
