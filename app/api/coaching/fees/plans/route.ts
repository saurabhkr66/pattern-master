import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { createEach } from "@/lib/dbHttp";
import { parseInstallments } from "@/lib/coachingFees";

// POST /api/coaching/fees/plans  { studentId, title, installments: [{label, amount, dueDate}] }
// Create a one-off fee plan for a single student (template_id stays null), e.g. a
// late joiner or a student on a non-standard fee. Bulk/batch plans go through the
// templates route instead.
export const POST = withCoachingContext(async (req, { coachingId }) => {
  const body = await req.json();
  const studentId = String(body.studentId ?? "");
  const title = String(body.title ?? "").trim();

  if (!studentId) {
    return NextResponse.json({ error: "a student is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "a title is required" }, { status: 400 });
  }

  const parsed = parseInstallments(body.installments);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const installments = parsed.ok;
  const total = installments.reduce((s, i) => s + i.amount, 0);

  // Student must belong to this coaching (tenant isolation).
  const student = await prisma.student.findFirst({
    where: { id: studentId, coaching_id: coachingId },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "student not found" }, { status: 404 });
  }

  const plan = await prisma.feePlan.create({
    data: {
      coaching_id: coachingId,
      student_id: studentId,
      template_id: null,
      title,
      total_amount: total,
    },
    select: { id: true },
  });

  await createEach(installments, (inst) =>
    prisma.feeInstallment.create({
      data: {
        coaching_id: coachingId,
        plan_id: plan.id,
        label: inst.label,
        amount: inst.amount,
        due_date: inst.due_date,
      },
      select: { id: true },
    })
  );

  return NextResponse.json({ ok: true, planId: plan.id });
});
