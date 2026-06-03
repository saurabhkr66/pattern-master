import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCoachingActor } from "@/lib/coachingAuth";

async function requireSuperAdmin() {
  const actor = await getCoachingActor();
  return actor?.isSuperAdmin ? actor : null;
}

// Normalize any date-ish input to the first day of its month at 00:00 UTC,
// matching date_trunc('month', …) so the (coaching_id, period) key lines up.
function monthStart(input: string | Date): Date {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// List every month from `start` back to and including the current month, newest
// first, as first-of-month UTC dates. Used for flat monthly billing so a bill
// shows up each month even with zero submissions.
function monthsSince(start: Date, limit = 24): Date[] {
  const out: Date[] = [];
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth();
  const sy = start.getUTCFullYear();
  const sm = start.getUTCMonth();
  while ((y > sy || (y === sy && m >= sm)) && out.length < limit) {
    out.push(new Date(Date.UTC(y, m, 1)));
    if (m === 0) { y -= 1; m = 11; } else { m -= 1; }
  }
  return out;
}

// GET — monthly bills for a coaching. Amount depends on billing_mode:
//   per_test → submissions × price_per_test (only months with submissions)
//   monthly  → flat monthly_fee for every month since the coaching was created
// merged with any stored due/paid status. Months with no stored row default to "due".
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const coaching = await prisma.coaching.findUnique({
    where: { id },
    select: { id: true, name: true, billing_mode: true, price_per_test: true, monthly_fee: true, created_at: true },
  });
  if (!coaching) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { billing_mode, price_per_test: price, monthly_fee } = coaching;

  const [counts, statuses] = await Promise.all([
    prisma.$queryRaw<{ month: Date; submissions: number }[]>`
      SELECT date_trunc('month', submitted_at) AS month, count(*)::int AS submissions
      FROM "TestAttempt"
      WHERE coaching_id = ${id} AND status = 'submitted' AND submitted_at IS NOT NULL
      GROUP BY 1 ORDER BY 1 DESC LIMIT 24`,
    prisma.billingPeriod.findMany({ where: { coaching_id: id } }),
  ]);

  const statusMap = new Map(statuses.map((s) => [monthStart(s.period).toISOString(), s]));
  const subsByMonth = new Map(counts.map((c) => [monthStart(c.month).toISOString(), c.submissions]));

  // Which months to list, and how to price them.
  const periods =
    billing_mode === "monthly"
      ? monthsSince(coaching.created_at).map((d) => d.toISOString())
      : counts.map((c) => monthStart(c.month).toISOString());

  const bills = periods.map((period) => {
    const submissions = subsByMonth.get(period) ?? 0;
    const stored = statusMap.get(period);
    return {
      period,
      submissions,
      amount: billing_mode === "monthly" ? monthly_fee : submissions * price,
      status: stored?.status ?? "due",
      paid_at: stored?.paid_at ?? null,
    };
  });

  return NextResponse.json({
    coaching: { id: coaching.id, name: coaching.name, billing_mode, price, monthly_fee },
    bills,
  });
}

// PATCH — set a month's status. Body: { period, status: "due" | "paid" }.
// Snapshots submissions/amount at mark time. No upsert (Neon HTTP) → find-then-write.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { period, status } = await req.json();

  if (!period || !["due", "paid"].includes(status)) {
    return NextResponse.json({ error: "period and valid status required" }, { status: 400 });
  }

  const coaching = await prisma.coaching.findUnique({
    where: { id },
    select: { billing_mode: true, price_per_test: true, monthly_fee: true },
  });
  if (!coaching) return NextResponse.json({ error: "not found" }, { status: 404 });

  const start = monthStart(period);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

  const submissions = await prisma.testAttempt.count({
    where: { coaching_id: id, status: "submitted", submitted_at: { gte: start, lt: end } },
  });
  const amount =
    coaching.billing_mode === "monthly" ? coaching.monthly_fee : submissions * coaching.price_per_test;
  const paid_at = status === "paid" ? new Date() : null;

  const existing = await prisma.billingPeriod.findUnique({
    where: { coaching_id_period: { coaching_id: id, period: start } },
    select: { id: true },
  });

  if (existing) {
    await prisma.billingPeriod.update({
      where: { coaching_id_period: { coaching_id: id, period: start } },
      data: { status, paid_at, submissions, amount },
    });
  } else {
    try {
      await prisma.billingPeriod.create({
        data: { coaching_id: id, period: start, status, paid_at, submissions, amount },
      });
    } catch {
      await prisma.billingPeriod.update({
        where: { coaching_id_period: { coaching_id: id, period: start } },
        data: { status, paid_at, submissions, amount },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
