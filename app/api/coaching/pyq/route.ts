import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

// Browse/search PYQs to add to a coaching test. Requires at least a subject so
// we never dump the whole bank. Returns MCQ/MSQ/NAT only (the types the test
// engine renders). Auth: coaching admin; PYQ data is shared (not tenant-scoped).
//
// ?exam=&branch=&subject=&topic=&q=&limit=  (limit default 20, max 200 for "add all")
export const GET = withCoachingContext(async (req) => {
  const p = req.nextUrl.searchParams;
  const exam = p.get("exam")?.trim() || null;
  const branch = p.get("branch")?.trim() || null;
  const subject = p.get("subject")?.trim() || null;
  const topic = p.get("topic")?.trim() || null;
  const q = p.get("q")?.trim() || null;
  const limit = Math.min(Math.max(Number(p.get("limit")) || 20, 1), 200);

  if (!subject) {
    return NextResponse.json(
      { error: "select a subject first", questions: [], total: 0 },
      { status: 400 }
    );
  }

  // Resolve matching patterns → their ids.
  const patterns = await prisma.pattern.findMany({
    where: {
      ...(exam ? { exam_type: exam } : {}),
      ...(branch ? { branch } : {}),
      subject,
      ...(topic ? { topic_name: topic } : {}),
    },
    select: { id: true },
  });
  const patternIds = patterns.map((x) => x.id);
  if (patternIds.length === 0) return NextResponse.json({ questions: [], total: 0 });

  const where = {
    pattern_id: { in: patternIds },
    question_type: { in: ["MCQ", "MSQ", "NAT"] },
    ...(q ? { question_text: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [questions, total] = await Promise.all([
    prisma.pYQ.findMany({
      where,
      select: {
        id: true,
        question_text: true,
        question_type: true,
        marks: true,
        year: true,
        topic: true,
      },
      orderBy: [{ year: "desc" }],
      take: limit,
    }),
    prisma.pYQ.count({ where }),
  ]);

  return NextResponse.json({ questions, total });
});
