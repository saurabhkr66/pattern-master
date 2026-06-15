import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCoachingActor } from "@/lib/coachingAuth";

const TYPES = new Set(["mcq", "nat", "subjective"]);

// GET /api/admin/questions?q=&grade=&subject=&type=&set=&coachingId=&orphaned=1
export async function GET(req: NextRequest) {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const grade = sp.get("grade")?.trim();
  const subject = sp.get("subject")?.trim();
  const type = sp.get("type")?.trim();
  const setName = sp.get("set")?.trim();
  const coachingId = sp.get("coachingId")?.trim();
  const orphaned = sp.get("orphaned") === "1";
  // full=1 returns every editable field (for the review/correction editor); the
  // default lightweight projection serves the browse table + the test picker.
  const full = sp.get("full") === "1";

  const where: Record<string, unknown> = {};
  if (orphaned) {
    where.coaching_id = null;
  } else if (coachingId) {
    where.coaching_id = coachingId;
  }
  if (grade) where.grade = grade;
  if (subject) where.subject = subject;
  if (setName) where.set_name = setName;
  if (type && TYPES.has(type)) where.question_type = type;
  if (q) where.question_text = { contains: q, mode: "insensitive" };

  const lightSelect = {
    id: true,
    question_text: true,
    question_type: true,
    subject: true,
    topic: true,
    difficulty: true,
    max_marks: true,
    created_at: true,
    coaching_id: true,
    coaching: { select: { id: true, name: true } },
  } as const;

  const fullSelect = {
    ...lightSelect,
    options: true,
    correct_answer: true,
    solution: true,
    nat_tolerance: true,
    grade: true,
    set_name: true,
    question_text_hindi: true,
    options_hindi: true,
    solution_hindi: true,
  } as const;

  try {
    const questions = await prisma.coachingQuestion.findMany({
      where,
      select: full ? fullSelect : lightSelect,
      orderBy: { created_at: "desc" },
      // The review editor renders heavy editable cards, so cap it tighter than the
      // browse table to keep the page responsive (filter down to narrow it).
      take: full ? 150 : 500,
    });
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[admin/questions]", err);
    return NextResponse.json({ error: "query failed", questions: [] }, { status: 500 });
  }
}
