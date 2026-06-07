import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateCoachingTaxonomy } from "@/lib/coachingTaxonomy";
import { validateCoachingQuestion } from "@/lib/coachingQuestionValidate";

const TYPES = new Set(["mcq", "nat", "subjective"]);

// Folder filters carry "__null__" to mean "the Uncategorized bucket" (grade /
// subject / set_name IS NULL), distinct from the param being absent (no filter).
const NULL_SENTINEL = "__null__";
function folderWhere(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined; // no filter
  if (value === NULL_SENTINEL) return null; // IS NULL
  return value;
}

// One page of the question bank. Kept small so neither the initial server
// render nor a "load more" fetch ships the whole (potentially huge) bank.
export const QUESTIONS_PAGE_SIZE = 50;

// GET /api/coaching/questions?q=&grade=&subject=&set=&type=&days=&limit=&offset=
export const GET = withCoachingContext(async (req, { coachingId }) => {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const subjectParam = sp.get("subject")?.trim() || undefined;
  const gradeParam = sp.get("grade")?.trim() || undefined;
  const setParam = sp.get("set")?.trim() || undefined;
  const type = sp.get("type")?.trim();
  // Recency filter: ?days=7 → only questions added in the last 7 days (the
  // "recently added" view so newly-added questions never get lost in the bank).
  const days = Number(sp.get("days"));
  const limit = Math.min(Math.max(Number(sp.get("limit")) || QUESTIONS_PAGE_SIZE, 1), 100);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);

  const grade = folderWhere(gradeParam);
  const subject = folderWhere(subjectParam);
  const set_name = folderWhere(setParam);
  const since =
    Number.isFinite(days) && days > 0 ? new Date(Date.now() - days * 86400_000) : undefined;

  // Fetch one extra row to learn whether a next page exists — avoids a separate
  // count() round trip just to drive the "Load more" button.
  const rows = await prisma.coachingQuestion.findMany({
    where: {
      coaching_id: coachingId,
      ...(grade !== undefined ? { grade } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(set_name !== undefined ? { set_name } : {}),
      ...(type && TYPES.has(type) ? { question_type: type } : {}),
      ...(since ? { created_at: { gte: since } } : {}),
      ...(q ? { question_text: { contains: q, mode: "insensitive" as const } } : {}),
    },
    select: {
      id: true,
      question_text: true,
      question_type: true,
      grade: true,
      subject: true,
      topic: true,
      set_name: true,
      difficulty: true,
      max_marks: true,
      correct_answer: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    skip: offset,
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  return NextResponse.json({ questions: hasMore ? rows.slice(0, limit) : rows, hasMore });
});

// POST /api/coaching/questions
export const POST = withCoachingContext(async (req, { coachingId }) => {
  const body = await req.json();
  const { error, data } = validateCoachingQuestion(body);
  if (error || !data) return NextResponse.json({ error: error ?? "invalid" }, { status: 400 });

  const created = await prisma.coachingQuestion.create({
    data: { coaching_id: coachingId, ...data },
    select: { id: true },
  });
  // A new question adds a node/count to the folder tree — bust the cached taxonomy.
  invalidateCoachingTaxonomy(coachingId);
  return NextResponse.json({ ok: true, id: created.id });
});
