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
    const prompt = `
You are an expert educator. Your task is to provide a clear, step-by-step explanation for the following multiple-choice or numerical question. 

Question: ${questionData.question_text}

Options:
${Array.isArray(questionData.options) ? questionData.options.join("\n") : JSON.stringify(questionData.options)}

Correct Answer: ${questionData.correct_answer}

Provide ONLY the explanation in a professional, academic tone. Format any mathematical equations using LaTeX inside $ for inline math or $$ for block math. Do not wrap the entire response in a markdown code block. Do not include the options or the question text again, just the logic. Explain why the correct answer is correct, and briefly why the other options (if applicable) are incorrect.
`;

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using a fast, standard model
    
    const result = await model.generateContent(prompt);
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
