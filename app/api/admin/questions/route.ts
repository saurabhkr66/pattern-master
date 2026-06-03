import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCoachingActor } from "@/lib/coachingAuth";

const TYPES = new Set(["mcq", "nat", "subjective"]);

// GET /api/admin/questions?q=&subject=&type=&coachingId=&orphaned=1
export async function GET(req: NextRequest) {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const subject = sp.get("subject")?.trim();
  const type = sp.get("type")?.trim();
  const coachingId = sp.get("coachingId")?.trim();
  const orphaned = sp.get("orphaned") === "1";

  const where: Record<string, unknown> = {};
  if (orphaned) {
    where.coaching_id = null;
  } else if (coachingId) {
    where.coaching_id = coachingId;
  }
  if (subject) where.subject = subject;
  if (type && TYPES.has(type)) where.question_type = type;
  if (q) where.question_text = { contains: q, mode: "insensitive" };

  try {
    const questions = await prisma.coachingQuestion.findMany({
      where,
      select: {
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
      },
      orderBy: { created_at: "desc" },
      take: 500,
    });
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[admin/questions]", err);
    return NextResponse.json({ error: "query failed", questions: [] }, { status: 500 });
  }
}
