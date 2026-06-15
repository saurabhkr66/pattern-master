import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateActiveTests } from "@/lib/coachingCache";
import { resolveBatchIds } from "@/lib/coachingBatch";

type IncomingRef = { id: string; source?: string; marks?: number; neg_marks?: number };

// GET /api/coaching/tests — list tests with submission counts.
export const GET = withCoachingContext(async (_req, { coachingId }) => {
  const tests = await prisma.coachingTest.findMany({
    where: { coaching_id: coachingId },
    select: {
      id: true,
      title: true,
      status: true,
      duration_secs: true,
      start_at: true,
      end_at: true,
      created_at: true,
      _count: { select: { attempts: true } },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });
  return NextResponse.json({ tests });
});

// POST /api/coaching/tests — create a test.
// Body: { title, description?, durationMins, startAt?, endAt?, shuffle?, poolSize?,
//         negMarks?, status?, questions: [{id, source, marks}] }
// Coaching-source mcq/nat for everyone; subjective (photo answers, AI-graded) is
// super-admin only while the grading pipeline is being proven.
export const POST = withCoachingContext(async (req, { coachingId, actor }) => {
  const body = await req.json();
  const {
    title,
    description,
    durationMins,
    startAt,
    endAt,
    shuffle = true,
    poolSize,
    negMarks = 0,
    status = "draft",
    questions,
    batchIds,
  } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const dur = Number(durationMins);
  if (!Number.isFinite(dur) || dur <= 0) {
    return NextResponse.json({ error: "invalid duration" }, { status: 400 });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "add at least one question" }, { status: 400 });
  }

  const incoming = questions as IncomingRef[];
  const coachingIds = incoming.filter((q) => (q.source ?? "coaching") === "coaching").map((q) => q.id);
  const pyqIds = incoming.filter((q) => q.source === "pyq").map((q) => q.id);

  // Coaching-source: tenant-scoped; subjective allowed for super admins only.
  // PYQ-source: shared bank, mcq/msq/nat allowed (pre-vetted real questions).
  const allowedTypes = actor.isSuperAdmin ? ["mcq", "nat", "subjective"] : ["mcq", "nat"];
  const [coachingValid, pyqValid] = await Promise.all([
    coachingIds.length
      ? prisma.coachingQuestion.findMany({
          where: { id: { in: coachingIds }, coaching_id: coachingId, question_type: { in: allowedTypes } },
          select: { id: true, max_marks: true },
        })
      : Promise.resolve([]),
    pyqIds.length
      ? prisma.pYQ.findMany({
          where: { id: { in: pyqIds }, question_type: { in: ["MCQ", "MSQ", "NAT"] } },
          select: { id: true, marks: true },
        })
      : Promise.resolve([]),
  ]);
  const coachingMarks = new Map(coachingValid.map((v) => [v.id, v.max_marks]));
  const pyqMarks = new Map(pyqValid.map((v) => [v.id, v.marks]));

  // Rebuild refs in the order the client sent them, keeping valid ones only.
  const refs = incoming
    .map((q) => {
      const source = q.source === "pyq" ? "pyq" : "coaching";
      const marksMap = source === "pyq" ? pyqMarks : coachingMarks;
      if (!marksMap.has(q.id)) return null;
      return {
        id: q.id,
        source: source as "coaching" | "pyq",
        marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : marksMap.get(q.id) ?? 1,
        // Store a positive magnitude; the scorer negates it. abs() guards against
        // a client sending -1 (which would otherwise award marks for wrong answers).
        neg_marks: Math.abs(Number(negMarks) || 0),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (refs.length === 0) {
    return NextResponse.json(
      { error: "no valid questions selected" },
      { status: 400 }
    );
  }

  const pool = poolSize != null ? Number(poolSize) : null;
  if (pool != null && (!Number.isFinite(pool) || pool < 1 || pool > refs.length)) {
    return NextResponse.json(
      { error: "pool size must be between 1 and the number of selected questions" },
      { status: 400 }
    );
  }

  // Batch targeting: keep only ids that are real batches of THIS coaching (an
  // empty/invalid list means "visible to everyone"). Same tenant-scoped filter
  // pattern as the question validation above.
  const batch_ids = await resolveBatchIds(batchIds, coachingId);

  const test = await prisma.coachingTest.create({
    data: {
      coaching_id: coachingId,
      title: title.trim(),
      description: description?.trim() || null,
      questions: refs,
      duration_secs: Math.round(dur * 60),
      start_at: startAt ? new Date(startAt) : null,
      end_at: endAt ? new Date(endAt) : null,
      shuffle: !!shuffle,
      pool_size: pool,
      batch_ids,
      status: status === "active" ? "active" : "draft",
    },
    select: { id: true },
  });

  // A test created as active changes the student dashboard list — drop its cache.
  if (status === "active") await invalidateActiveTests(coachingId);

  return NextResponse.json({ ok: true, id: test.id });
});
