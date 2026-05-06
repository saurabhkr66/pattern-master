import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: NextRequest) {
  try {
    const { questionId, isSubjectPyq, isPyq } = await req.json();

    if (!questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    // Determine which model to query based on the flags
    let questionData;
    let modelName;

    if (isSubjectPyq) {
      questionData = await prisma.subjectPYQ.findUnique({ where: { id: questionId } });
      modelName = "SubjectPYQ";
    } else if (isPyq) {
      questionData = await prisma.pYQ.findUnique({ where: { id: questionId } });
      modelName = "PYQ";
    } else {
      questionData = await prisma.generatedQuestion.findUnique({ where: { id: questionId } });
      modelName = "GeneratedQuestion";
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

Options:
${Array.isArray(questionData.options) ? questionData.options.join("\n") : JSON.stringify(questionData.options)}

Correct Answer: ${questionData.correct_answer}

Rules:
1. Use LaTeX ($, $$) for all math.
2. Keep it concise: 5-7 lines max. Only the key steps and logic.
3. No preamble, no markdown code blocks.
4. Do not repeat the question or options.
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
          } catch {}
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
            } catch {}
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
      model: "gemini-2.5-flash",
      tools: [],
      generationConfig: {
        maxOutputTokens: 2500,
        // @ts-ignore - Allow moderate thinking for JEE math/physics accuracy
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });
    
    const result = await model.generateContent(contentParts);
    let generatedExplanation = result.response.text();

    // Clean up potential markdown formatting from Gemini
    generatedExplanation = generatedExplanation.replace(/^```(markdown|latex)?\s*/i, '').replace(/```\s*$/, '').trim();

    // Save back to database
    if (isSubjectPyq) {
      await prisma.subjectPYQ.update({ where: { id: questionId }, data: { explanation: generatedExplanation } });
    } else if (isPyq) {
      await prisma.pYQ.update({ where: { id: questionId }, data: { explanation: generatedExplanation } });
    } else {
      await prisma.generatedQuestion.update({ where: { id: questionId }, data: { explanation: generatedExplanation } });
    }

    return NextResponse.json({ explanation: generatedExplanation, explanationHindi: null });

  } catch (error) {
    console.error("[GENERATE_EXPLANATION] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
