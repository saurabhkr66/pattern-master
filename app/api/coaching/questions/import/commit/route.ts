import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateCoachingTaxonomy } from "@/lib/coachingTaxonomy";
import { validateCoachingQuestion } from "@/lib/coachingQuestionValidate";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/coaching/questions/import/commit
//   body: { exam, set, questions: [ reviewed question objects ] }
// Applies the shared validator per row and bulk-inserts. Exam + Set are applied
// to every row here (the admin set them once up front). Per-row insert (Neon HTTP
// has no transactions); invalid/failed rows are reported, not fatal.
export const POST = withCoachingContext(async (req, { coachingId, actor }) => {
  // Gated to super admins for now (paired with the import/extract route).
  if (!actor.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const exam = String(body?.exam ?? "").trim() || null;
  const set = String(body?.set ?? "").trim() || null;
  const rows = Array.isArray(body?.questions) ? body.questions : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "no questions to import" }, { status: 400 });
  }

  let created = 0;
  const skipped: { index: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? {};
    // Stamp exam(grade) + set on every row; section/topic/text/etc. come from the row.
    const { error, data } = validateCoachingQuestion({
      ...r,
      grade: exam,
      set_name: set,
      subject: r.section ?? r.subject ?? null,
    });
    if (error || !data) {
      skipped.push({ index: i, reason: error ?? "invalid" });
      continue;
    }
    try {
      await prisma.coachingQuestion.create({
        data: {
          coaching_id: coachingId,
          ...data,
          // Diagram images resolved during the extract step (Json column).
          ...(Array.isArray(r.images) && r.images.length ? { images: r.images } : {}),
        },
        select: { id: true },
      });
      created++;
    } catch (e) {
      skipped.push({ index: i, reason: e instanceof Error ? e.message.split("\n")[0] : "db error" });
    }
  }

  if (created > 0) invalidateCoachingTaxonomy(coachingId);
  return NextResponse.json({ ok: true, created, skipped });
});
