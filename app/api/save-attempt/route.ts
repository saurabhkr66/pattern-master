// app/api/save-attempt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";


export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { questionId, pyqId, isCorrect, userAnswer } = body;

        if ((!questionId && !pyqId) || isCorrect === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const attempt = await prisma.attempt.create({
            data: {
                question_id: questionId || null,
                pyq_id: pyqId || null,
                is_correct: isCorrect,
                user_answer: userAnswer ? String(userAnswer) : null,
                user_id: userId,
            },
        });

        // Revalidate caches so progress shows up instantly on the client
        revalidateTag("patterns");
        revalidateTag("dashboard");

        return NextResponse.json({ success: true, attempt }, { status: 201 });
    } catch (error) {
        console.error("Failed to save attempt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}