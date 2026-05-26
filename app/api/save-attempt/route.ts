// app/api/save-attempt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { rateLimit } from "@/lib/rateLimit";


export async function POST(req: NextRequest) {
    try {
        const [{ userId }, body] = await Promise.all([auth(), req.json()]);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rl = await rateLimit(`attempt:${userId}`, 60, 60);
        if (!rl.success) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
        }

        const { questionId, pyqId, mockQuestionId, isCorrect, userAnswer, timeSpent } = body;

        if ((!questionId && !pyqId && !mockQuestionId) || isCorrect === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const attempt = await prisma.attempt.create({
            data: {
                question_id: questionId || null,
                pyq_id: pyqId || null,
                mock_question_id: mockQuestionId || null,
                is_correct: isCorrect,
                user_answer: userAnswer ? String(userAnswer) : null,
                user_id: userId,
                time_spent: timeSpent || null,
            },
        });

        // Only bust this user's personal caches — topic/pattern structure is static
        // and must NOT be invalidated here (would bust it for all users on every submit).
        revalidateTag(`dashboard-${userId}`, "page");
        revalidateTag(`mistakes-${userId}`, "page");

        return NextResponse.json({ success: true, attempt }, { status: 201 });
    } catch (error) {
        console.error("Failed to save attempt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}