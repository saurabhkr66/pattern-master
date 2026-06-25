import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { createEach } from "@/lib/dbHttp";
import { parseInstallments } from "@/lib/coachingFees";

// PATCH /api/coaching/fees/plans/[id]  { title?, status?, installments? }
// Edit a plan's title/status, or replace its installment schedule. The schedule
// can only be replaced while the plan has no recorded payments — once money has
// been receipted against an installment, rewriting the schedule would orphan that
// allocation, so we refuse and the admin records a correcting payment instead.
export const PATCH = withCoachingContext(async (req, { coachingId }, { params }) => {
  const { id } = await params;
  const body = await req.json();

  const owned = await prisma.feePlan.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: { title?: string; status?: string } = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (body.status === "active" || body.status === "archived") data.status = body.status;

  let installments: ReturnType<typeof parseInstallments> | null = null;
  if (body.installments !== undefined) {
    installments = parseInstallments(body.installments);
    if ("error" in installments) {
      return NextResponse.json({ error: installments.error }, { status: 400 });
    }
    const payments = await prisma.feePayment.count({ where: { plan_id: id } });
    if (payments > 0) {
      return NextResponse.json(
        { error: "this plan already has payments — record a correcting payment instead of editing the schedule" },
        { status: 409 }
      );
    }
  }

  if (Object.keys(data).length === 0 && !installments) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  if (installments && "ok" in installments) {
    const rows = installments.ok;
    const total = rows.reduce((s, i) => s + i.amount, 0);
    await prisma.feeInstallment.deleteMany({ where: { plan_id: id } });
    await createEach(rows, (inst) =>
      prisma.feeInstallment.create({
        data: {
          coaching_id: coachingId,
          plan_id: id,
          label: inst.label,
          amount: inst.amount,
          due_date: inst.due_date,
        },
        select: { id: true },
      })
    );
    await prisma.feePlan.update({ where: { id }, data: { ...data, total_amount: total } });
  } else {
    await prisma.feePlan.update({ where: { id }, data });
  }

  return NextResponse.json({ ok: true });
});

// DELETE /api/coaching/fees/plans/[id] — archive the plan (soft delete). Payments
// and receipts are preserved; the plan just drops out of the active dues list.
export const DELETE = withCoachingContext(async (_req, { coachingId }, { params }) => {
  const { id } = await params;
  const owned = await prisma.feePlan.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await prisma.feePlan.update({ where: { id }, data: { status: "archived" } });
  return NextResponse.json({ ok: true });
});
