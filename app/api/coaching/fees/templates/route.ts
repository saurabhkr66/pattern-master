import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { createEach, isUniqueViolation } from "@/lib/dbHttp";
import { parseInstallments } from "@/lib/coachingFees";

// Fee templates: a reusable batch-level fee structure that, on creation, is
// bulk-applied to every approved student in the target batch — each application
// materialises a per-student FeePlan + its installments.

// GET /api/coaching/fees/templates — list templates with how many plans each created.
export const GET = withCoachingContext(async (_req, { coachingId }) => {
  const templates = await prisma.feeTemplate.findMany({
    where: { coaching_id: coachingId },
    select: {
      id: true,
      title: true,
      batch_id: true,
      total_amount: true,
      installments: true,
      created_at: true,
      batch: { select: { name: true } },
      _count: { select: { plans: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      title: t.title,
      batchId: t.batch_id,
      batchName: t.batch?.name ?? null,
      totalAmount: t.total_amount,
      installments: t.installments,
      plans: t._count.plans,
      createdAt: t.created_at,
    })),
  });
});

// POST /api/coaching/fees/templates  { title, batchId?, installments: [{label, amount, dueDate}] }
// Create the template and apply it to the batch's approved students.
export const POST = withCoachingContext(async (req, { coachingId }) => {
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const batchId = body.batchId ? String(body.batchId) : null;

  if (!title) {
    return NextResponse.json({ error: "a title is required" }, { status: 400 });
  }

  const parsed = parseInstallments(body.installments);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const installments = parsed.ok;
  const total = installments.reduce((s, i) => s + i.amount, 0);

  // A targeted batch must belong to this coaching (tenant isolation).
  if (batchId) {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, coaching_id: coachingId },
      select: { id: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "batch not found" }, { status: 404 });
    }
  }

  const template = await prisma.feeTemplate.create({
    data: {
      coaching_id: coachingId,
      batch_id: batchId,
      title,
      total_amount: total,
      installments: installments.map((i) => ({
        label: i.label,
        amount: i.amount,
        due_date: i.due_date.toISOString(),
      })),
    },
    select: { id: true },
  });

  // Apply to approved, active students — whole coaching when no batch is set.
  const students = await prisma.student.findMany({
    where: {
      coaching_id: coachingId,
      status: "approved",
      active: true,
      ...(batchId ? { batch_id: batchId } : {}),
    },
    select: { id: true },
  });

  // Per-student: create the plan, then its installments. No nested writes /
  // transactions (unsupported on the Neon HTTP adapter — see lib/dbHttp). The
  // @@unique([student_id, template_id]) makes a re-apply skip existing students.
  let applied = 0;
  await Promise.all(
    students.map(async (s) => {
      let plan: { id: string };
      try {
        plan = await prisma.feePlan.create({
          data: {
            coaching_id: coachingId,
            student_id: s.id,
            template_id: template.id,
            title,
            total_amount: total,
          },
          select: { id: true },
        });
      } catch (e) {
        // Only swallow unique-constraint violations (student already has a plan
        // from this template). Any other error (connection, FK, etc.) must surface.
        if (isUniqueViolation(e)) return;
        throw e;
      }
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
      applied++;
    })
  );

  return NextResponse.json({
    ok: true,
    templateId: template.id,
    applied,
    students: students.length,
  });
});

