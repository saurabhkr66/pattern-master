import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const examType = searchParams.get("exam_type");
    const branch = searchParams.get("branch");

    try {
      const sessions = await prisma.testSession.findMany({
        where: {
          user_id: userId,
          ...(examType ? { exam_type: examType } : {}),
          ...(branch ? { branch } : {}),
        },
        orderBy: { created_at: "desc" },
        take: 20,
        select: {
          id: true,
          exam_type: true,
          branch: true,
          score: true,
          max_score: true,
          total_questions: true,
          correct_count: true,
          wrong_count: true,
          skipped_count: true,
          time_taken_secs: true,
          created_at: true,
          mock_test: { select: { title: true } },
        },
      });

      return NextResponse.json({ sessions });
    } catch (dbErr: any) {
      if (dbErr?.code === "P2021" || dbErr?.message?.includes("does not exist")) {
        return NextResponse.json({ sessions: [] });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error("Test history error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
