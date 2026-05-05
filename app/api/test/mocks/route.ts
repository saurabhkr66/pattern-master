import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const examType = searchParams.get("exam_type");
    const branch = searchParams.get("branch") ?? null;

    if (id) {
      const mock = await prisma.mockTestTemplate.findUnique({
        where: { id },
        select: {
          id: true,
          mock_number: true,
          title: true,
          total_questions: true,
          max_score: true,
          duration_secs: true,
          exam_type: true,
          branch: true,
          sessions: {
            where: { user_id: userId },
            select: {
              id: true,
              score: true,
              max_score: true,
              correct_count: true,
              wrong_count: true,
              skipped_count: true,
              section_scores: true,
              created_at: true,
            },
            orderBy: { created_at: "desc" },
            take: 1,
          },
        },
      });

      if (!mock) return NextResponse.json({ error: "Mock test not found" }, { status: 404 });

      return NextResponse.json({
        mock: {
          ...mock,
          session: mock.sessions[0] ?? null,
        }
      });
    }

    if (!examType) return NextResponse.json({ error: "exam_type or id required" }, { status: 400 });

    const mocks = await prisma.mockTestTemplate.findMany({
      where: { exam_type: examType, branch, mode: "seeded" },
      select: {
        id: true,
        mock_number: true,
        title: true,
        total_questions: true,
        max_score: true,
        duration_secs: true,
        sessions: {
          where: { user_id: userId },
          select: {
            id: true,
            score: true,
            max_score: true,
            correct_count: true,
            wrong_count: true,
            skipped_count: true,
            section_scores: true,
            created_at: true,
          },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { mock_number: "asc" },
    });

    return NextResponse.json({
      mocks: mocks.map((m) => ({
        id: m.id,
        mock_number: m.mock_number,
        title: m.title,
        total_questions: m.total_questions,
        max_score: m.max_score,
        duration_secs: m.duration_secs,
        session: m.sessions[0] ?? null,
      })),
    });
  } catch (err) {
    console.error("Mocks list error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
