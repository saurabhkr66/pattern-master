// app/api/generate-question/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geminiModel } from "@/lib/gemini";
import { generateQuestionsWithDeepSeek } from "@/lib/deepseek";
import { generateQuestionsWithOpenRouter } from "@/lib/openrouter";
import { buildQuestionPrompt } from "@/lib/prompts";
import { generateSemanticHash } from "@/lib/hash";


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { patternId, difficulty = "Medium", provider = "gemini" } = body;

        console.log(`[API] Generation Request - Provider: ${provider}, Topic: ${patternId}`);

        if (!patternId) {
            return NextResponse.json({ error: "patternId is required" }, { status: 400 });
        }

        const pattern = await prisma.pattern.findUnique({
            where: { id: patternId },
        });

        if (!pattern) {
            return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
        }

        // Get recent questions to avoid duplicates
        const recentQuestions = await prisma.generatedQuestion.findMany({
            where: { pattern_id: patternId },
            orderBy: { created_at: "desc" },
            take: 10,
            select: { question_text: true },
        });

        const recentContext = recentQuestions.length > 0
            ? recentQuestions.map((q) => q.question_text).join(" | ")
            : "None";

        // Build prompt
        const prompt = buildQuestionPrompt(
            pattern.exam_type,
            pattern.subject,
            pattern.topic_name,
            pattern.atomic_logic,
            difficulty,
            recentContext
        );

        let questionsArray = [];

        if (provider === "deepseek") {
            console.log("[API] Calling DeepSeek Utility...");
            const parsedArray = await generateQuestionsWithDeepSeek(prompt);
            questionsArray = Array.isArray(parsedArray) ? parsedArray : [parsedArray];
            if (!Array.isArray(questionsArray) && typeof questionsArray === "object") {
                const keys = Object.keys(questionsArray);
                if (keys.length === 1 && Array.isArray(questionsArray[keys[0]])) {
                    questionsArray = questionsArray[keys[0]];
                }
            }
        } else if (provider === "gemma") {
            console.log("[API] Calling OpenRouter (Gemma) Utility...");
            const parsedArray = await generateQuestionsWithOpenRouter(prompt);
            questionsArray = Array.isArray(parsedArray) ? parsedArray : [parsedArray];
            if (!Array.isArray(questionsArray) && typeof questionsArray === "object") {
                const keys = Object.keys(questionsArray);
                if (keys.length === 1 && Array.isArray(questionsArray[keys[0]])) {
                    questionsArray = questionsArray[keys[0]];
                }
            }
        } else {
            // Default: Gemini
            console.log("[API] Calling Gemini Utility...");
            const result = await geminiModel.generateContent(prompt);
            const textResponse = result.response.text();
            const cleanedText = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsedArray = JSON.parse(cleanedText);
            questionsArray = Array.isArray(parsedArray) ? parsedArray : [parsedArray];
        }

        // Save all unique questions to DB
        const savedQuestions = [];

        for (const q of questionsArray) {
            const hash = generateSemanticHash(q.question_text);

            // Skip duplicates
            const existing = await prisma.generatedQuestion.findUnique({
                where: { semantic_hash: hash },
            });

            if (existing) continue;

            const saved = await prisma.generatedQuestion.create({
                data: {
                    pattern_id: pattern.id,
                    question_text: q.question_text,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    explanation: q.explanation,
                    difficulty_level: difficulty,
                    question_type: q.question_type || "MCQ",
                    semantic_hash: hash,
                },
            });

            savedQuestions.push(saved);
        }

        if (savedQuestions.length === 0) {
            return NextResponse.json(
                { error: "duplicate_detected", message: "All generated questions were duplicates. Try again." },
                { status: 429 }
            );
        }

        // Return the batch — first question + the rest queued
        return NextResponse.json({
            current: savedQuestions[0],
            queue: savedQuestions.slice(1),
            totalGenerated: savedQuestions.length,
        }, { status: 201 });

    } catch (error) {
        console.error("Generation Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}