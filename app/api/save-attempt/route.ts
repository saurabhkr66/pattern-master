// app/api/save-attempt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";


export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { questionId, isCorrect } = body;

        if (!questionId || isCorrect === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Save the attempt to the database with the real userId
        const attempt = await prisma.attempt.create({
            data: {
                question_id: questionId,
                is_correct: isCorrect,
                user_id: userId,
            },
        });

        return NextResponse.json({ success: true, attempt }, { status: 201 });
    } catch (error) {
        console.error("Failed to save attempt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}