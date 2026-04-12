// app/api/test/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
            const sessions = await prisma.testSession.findMany({
                where: { user_id: userId },
                orderBy: { created_at: "desc" },
                take: 20,
                select: {
                    id: true,
                    score: true,
                    max_score: true,
                    total_questions: true,
                    correct_count: true,
                    wrong_count: true,
                    skipped_count: true,
                    time_taken_secs: true,
                    created_at: true,
                },
            });

            return NextResponse.json({ sessions });
        } catch (dbErr: any) {
            // Table may not exist yet (migration pending) — return empty gracefully
            if (dbErr?.code === "P2021" || dbErr?.message?.includes("does not exist")) {
                return NextResponse.json({ sessions: [] });
            }
            throw dbErr;
        }
    } catch (error) {
        console.error("Test history error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

