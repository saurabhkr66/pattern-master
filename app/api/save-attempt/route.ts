// app/api/save-attempt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidateTag, revalidatePath } from "next/cache";


export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { questionId, pyqId, subjectPyqId, isCorrect, userAnswer, timeSpent } = body;

        if ((!questionId && !pyqId && !subjectPyqId) || isCorrect === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const attempt = await prisma.attempt.create({
            data: {
                question_id: questionId || null,
                pyq_id: pyqId || null,
                subject_pyq_id: subjectPyqId || null,
                is_correct: isCorrect,
                user_answer: userAnswer ? String(userAnswer) : null,
                user_id: userId,
                time_spent: timeSpent || null,
            },
        });

        // Revalidate caches so progress shows up instantly on the client
        revalidateTag("dashboard", "max");
        revalidateTag("patterns", "max");

        return NextResponse.json({ success: true, attempt }, { status: 201 });
    } catch (error) {
        console.error("Failed to save attempt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}