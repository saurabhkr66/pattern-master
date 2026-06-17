import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCoachingActor } from "@/lib/coachingAuth";
import { invalidateCoachingSlug } from "@/lib/coachingCache";

// PATCH /api/admin/coachings/[id] — edit price/active/city/ownerEmail.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.status !== undefined) {
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    data.status = body.status;
    // Approving activates the coaching; rejecting deactivates it.
    if (body.status === "approved") data.active = true;
    if (body.status === "rejected") data.active = false;
  }
  if (body.billingMode !== undefined) {
    if (!["per_test", "monthly"].includes(body.billingMode)) {
      return NextResponse.json({ error: "invalid billing mode" }, { status: 400 });
    }
    data.billing_mode = body.billingMode;
  }
  if (body.pricePerTest !== undefined) {
    const p = Number(body.pricePerTest);
    if (!Number.isFinite(p) || p < 0) {
      return NextResponse.json({ error: "invalid price" }, { status: 400 });
    }
    data.price_per_test = p;
  }
  if (body.monthlyFee !== undefined) {
    const f = Number(body.monthlyFee);
    if (!Number.isFinite(f) || f < 0) {
      return NextResponse.json({ error: "invalid monthly fee" }, { status: 400 });
    }
    data.monthly_fee = f;
  }
  if (typeof body.subjectiveEnabled === "boolean") {
    data.subjective_enabled = body.subjectiveEnabled;
  }
  if (body.city !== undefined) data.city = body.city?.trim() || null;
  if (body.ownerEmail !== undefined) {
    data.owner_email = body.ownerEmail?.trim().toLowerCase() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  // Singular update (updateMany is rejected by the Neon HTTP adapter).
  const exists = await prisma.coaching.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!exists) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.coaching.update({ where: { id }, data });
  await invalidateCoachingSlug(exists.slug); // drop the cached coaching record (Redis)
  revalidatePath(`/c/${exists.slug}`); // drop the ISR-cached public profile page
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/coachings/[id] — permanently delete a coaching and all its data.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const exists = await prisma.coaching.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!exists) return NextResponse.json({ error: "not found" }, { status: 404 });

  // TestAttempt has required FKs to CoachingTest and Student with no onDelete
  // cascade, so the coaching delete's cascade to those rows would hit a FK
  // restriction. Clear attempts first (this also cascades to their BillingEvent
  // rows); the coaching delete then cascades the rest.
  await prisma.testAttempt.deleteMany({ where: { coaching_id: id } });
  await prisma.coaching.delete({ where: { id } });
  await invalidateCoachingSlug(exists.slug);
  revalidatePath(`/c/${exists.slug}`); // drop the ISR-cached public profile page
  return NextResponse.json({ ok: true });
}
