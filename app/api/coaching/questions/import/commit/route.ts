import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStandardDriver } from "@/lib/dbHttp";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateCoachingTaxonomy } from "@/lib/coachingTaxonomy";
import { validateCoachingQuestion } from "@/lib/coachingQuestionValidate";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/coaching/questions/import/commit
//   body: { exam, set, questions: [ reviewed question objects ] }
// Applies the shared validator per row and bulk-inserts. Exam + Set are applied
// to every row here (the admin set them once up front). One createMany on the
// TCP driver; per-row insert on Neon HTTP (no transactions there). Invalid rows
// are reported, not fatal.
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

  // Validate every row up front; only valid payloads reach the DB.
  const valid: { index: number; data: Parameters<typeof prisma.coachingQuestion.create>[0]["data"] }[] = [];
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
      console.warn(`[import/commit] skipped row ${i}: ${error ?? "invalid"}`, {
        type: r.question_type,
        correct_answer: r.correct_answer,
        options: Array.isArray(r.options) ? r.options.length : r.options,
        max_marks: r.max_marks,
      });
      skipped.push({ index: i, reason: error ?? "invalid" });
      continue;
    }
    valid.push({
      index: i,
      data: {
        coaching_id: coachingId,
        ...data,
        // Diagram images resolved during the extract step (Json column).
        ...(Array.isArray(r.images) && r.images.length ? { images: r.images } : {}),
      },
    });
  }

  if (valid.length > 0 && isStandardDriver) {
    // TCP driver: one multi-row INSERT for the whole import instead of a serial
    // round-trip per question. All-or-nothing on a DB error — validation above
    // already filtered bad rows, so a failure here is environmental, and the
    // admin just retries the commit.
    try {
      const res = await prisma.coachingQuestion.createMany({
        data: valid.map((v) => v.data) as Prisma.CoachingQuestionCreateManyInput[],
      });
      created = res.count;
    } catch (e) {
      const reason = e instanceof Error ? e.message.split("\n")[0] : "db error";
      for (const v of valid) skipped.push({ index: v.index, reason });
    }
  } else {
    // Neon HTTP: createMany() needs a transaction (unsupported) — insert per row.
    for (const v of valid) {
      try {
        await prisma.coachingQuestion.create({ data: v.data, select: { id: true } });
        created++;
      } catch (e) {
        skipped.push({ index: v.index, reason: e instanceof Error ? e.message.split("\n")[0] : "db error" });
      }
    }
  }

  if (created > 0) invalidateCoachingTaxonomy(coachingId);
  return NextResponse.json({ ok: true, created, skipped });
});
