// app/api/generate-question/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEach } from "@/lib/dbHttp";
import { geminiModel } from "@/lib/gemini";
import { generateQuestionsWithDeepSeek } from "@/lib/deepseek";
import { generateQuestionsWithOpenRouter } from "@/lib/openrouter";
import { buildQuestionPrompt } from "@/lib/prompts";
import { generateSemanticHash } from "@/lib/hash";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rateLimit";


export async function POST(req: NextRequest) {
    try {
        const [{ userId }, body] = await Promise.all([auth(), req.json()]);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rl = await rateLimit(`gen-question:${userId}`, 10, 60);
        if (!rl.success) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
        }

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

        // --- Threshold Check ---

        const totalPYQs = await prisma.pYQ.count({
            where: { pattern_id: patternId },
        });

        if (totalPYQs > 0) {
            // Push the distinct-pyq count down to Postgres so it returns a single
            // integer instead of one row per solved pyq. As the Attempt table
            // grows this stays O(index scan) regardless of how many PYQs the
            // user has solved.
            const solvedRows = await prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT a.pyq_id)::bigint AS count
                FROM "Attempt" a
                JOIN "PYQ" p ON p.id = a.pyq_id
                WHERE a.user_id = ${userId}
                  AND a.is_correct = true
                  AND p.pattern_id = ${patternId}
            `;
            const solvedCount = Number(solvedRows[0]?.count ?? 0);

            const completionPercentage = (solvedCount / totalPYQs) * 100;

            if (completionPercentage < 95) {
                return NextResponse.json({
                    error: "mastery_required",
                    message: `Mastery Required: You have solved ${Math.round(completionPercentage)}% of PYQs for this topic. Solve at least 95% to unlock AI question generation.`,
                    currentProgress: Math.round(completionPercentage)
                }, { status: 403 });
            }
        }
        // ------------------------

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

        // Marks rule: NAT/MSQ → 2, MCQ Hard → 2, MCQ Easy/Medium → 1
        const computeMarks = (questionType: string, diff: string): number => {
            if (questionType === "NAT" || questionType === "MSQ") return 2;
            if (questionType === "MCQ" && diff === "Hard") return 2;
            return 1;
        };

        // Hash all questions in parallel, then bulk insert with skipDuplicates.
        // Relies on UNIQUE(semantic_hash) — duplicates are silently dropped at
        // the DB level instead of N findUnique round-trips.
        const rows = await Promise.all(
            questionsArray.map(async (q: any) => ({
                pattern_id: pattern.id,
                question_text: q.question_text,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                difficulty_level: difficulty,
                question_type: q.question_type || "MCQ",
                marks: computeMarks(q.question_type || "MCQ", difficulty),
                semantic_hash: await generateSemanticHash(q.question_text),
            })),
        );

        // createMany() needs a transaction (unsupported on the Neon HTTP adapter) —
        // insert per row instead. skipDuplicates → swallow P2002.
        await createEach(
            rows,
            (data) => prisma.generatedQuestion.create({ data, select: { id: true } }),
            { skipDuplicates: true }
        );

        const savedQuestions = await prisma.generatedQuestion.findMany({
            where: {
                pattern_id: pattern.id,
                semantic_hash: { in: rows.map((r) => r.semantic_hash) },
            },
        });

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