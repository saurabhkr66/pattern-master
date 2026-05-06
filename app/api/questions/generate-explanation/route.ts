import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: NextRequest) {
  try {
    const { questionId, questionType, mockTestId, isSubjectPyq, isPyq } = await req.json();

    if (!questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    let questionData;
    if (questionType === "MockQuestion") {
      if (!mockTestId) return NextResponse.json({ error: "mockTestId required" }, { status: 400 });
      const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
      if (template) {
        const questions = template.questions as any[];
        questionData = questions.find(q => q.id === questionId);
      }
    } else if (isSubjectPyq) {
      questionData = await prisma.subjectPYQ.findUnique({ where: { id: questionId } });
    } else if (isPyq) {
      questionData = await prisma.pYQ.findUnique({ where: { id: questionId } });
    } else {
      questionData = await prisma.generatedQuestion.findUnique({ where: { id: questionId } });
    }

    if (!questionData) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // If explanation already exists, return it (someone else might have generated it while this user was loading)
    if (questionData.explanation && questionData.explanation.trim() !== "") {
      return NextResponse.json({ explanation: questionData.explanation, explanationHindi: questionData.explanation_hindi });
    }

    // Format prompt
    const prompt = `You are an expert educator. Provide a concise and precise explanation for this question.
    
Question: ${questionData.question_text}
Options: ${JSON.stringify(questionData.options)}
Target Answer: ${questionData.correct_answer}

Rules:
1. CRITICAL: The 'Target Answer' provided is 100% correct. Your ONLY goal is to provide a step-by-step derivation that leads to this specific answer.
2. Use LaTeX ($, $$) for all math. Wrap main equations in $$ (block math) for clarity.
3. Use proper KaTeX for limits/integrals: e.g., \int_{0}^{1} or \Big|_0^1. NEVER use $_0^1$.
4. Keep it concise: 5-7 lines max. Only the key steps and logic.
5. NO character-level spacing (e.g., do NOT write "G i v e n"). Write normal flowing text.
6. MANDATORY: End with [CORRECT_OPTION: X] where X is A, B, C, or D.
`;

    // 1. Fetch images as base64
    const images = (questionData.images as any[]) || [];
    const contentParts: any[] = [prompt];

    if (images.length > 0) {
      const fs = await import("fs");
      const path = await import("path");
      const { getCloudinaryUrl } = await import("@/lib/imageUtils");

      for (const img of images) {
        const filename = img.filename || img.url;
        if (!filename) continue;

        // Try local
        let imgResult = null;
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
              imgResult = { data: data.toString("base64"), mimeType };
              break;
            }
          } catch { }
        }

        // Try Cloudinary
        if (!imgResult) {
          const cloudinaryUrl = getCloudinaryUrl(filename);
          if (cloudinaryUrl.startsWith("http")) {
            try {
              const response = await fetch(cloudinaryUrl);
              if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                imgResult = { data: buffer.toString("base64"), mimeType: response.headers.get("content-type") || "image/jpeg" };
              }
            } catch { }
          }
        }

        if (imgResult) {
          contentParts.push({
            inlineData: { data: imgResult.data, mimeType: imgResult.mimeType }
          });
        }
      }
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      tools: [],
      generationConfig: {
        maxOutputTokens: 2500,
        // @ts-ignore - Gemini 3.1 uses thinkingLevel inside thinkingConfig
        thinkingConfig: { thinkingLevel: "MEDIUM" },
      }
    });

    const result = await model.generateContent(contentParts);
    const usage = result.response.usageMetadata;
    const generatedExplanation = result.response.text();
    const aiAnswerMatch = generatedExplanation.match(/\[CORRECT_OPTION:\s*([A-D])\]/i);
    const aiDetectedAnswer = aiAnswerMatch ? aiAnswerMatch[1].toUpperCase() : null;

    // Clean up the tag
    const cleanExplanation = generatedExplanation
      .replace(/\[CORRECT_OPTION:\s*[A-D]\]/gi, "")
      .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
      .trim();

    // Save back to database
    if (questionType === "MockQuestion" && mockTestId) {
      const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
      if (template) {
        const questions = [...(template.questions as any[])];
        const idx = questions.findIndex(q => q.id === questionId);
        if (idx !== -1) {
          questions[idx] = {
            ...questions[idx],
            explanation: cleanExplanation,
            ai_answer_mismatch: !!(aiDetectedAnswer && aiDetectedAnswer !== questionData.correct_answer?.toUpperCase()),
            ai_detected_answer: aiDetectedAnswer
          };
          await prisma.mockTestTemplate.update({
            where: { id: mockTestId },
            data: { questions }
          });
        }
      }
    } else if (isSubjectPyq) {
      await prisma.subjectPYQ.update({ where: { id: questionId }, data: { explanation: cleanExplanation } });
    } else if (isPyq) {
      await prisma.pYQ.update({ where: { id: questionId }, data: { explanation: cleanExplanation } });
    } else {
      await prisma.generatedQuestion.update({ where: { id: questionId }, data: { explanation: cleanExplanation } });
    }

    return NextResponse.json({
      explanation: cleanExplanation,
      isMismatch: !!(aiDetectedAnswer && aiDetectedAnswer !== questionData.correct_answer?.toUpperCase()),
      aiDetectedAnswer,
      usage: {
        input: usage?.promptTokenCount || 0,
        output: usage?.candidatesTokenCount || 0,
        thoughts: (usage as any)?.thoughtsTokenCount || 0
      }
    });

  } catch (error) {
    console.error("[GENERATE_EXPLANATION] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
