import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateStudent, blockStudent, unblockStudent } from "@/lib/studentCache";
import { invalidateCoachingRoster } from "@/lib/coachingCache";

// PATCH /api/coaching/students/[id]  { name?, phone?, batchId?, active? }
// Edit a student. The where-clause includes coaching_id so an admin can only
// touch their own students (updateMany returns count 0 for a foreign id).
export const PATCH = withCoachingContext(async (req, { coachingId }, { params }) => {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.active === "boolean") data.active = body.active;
  // Approve / reject a (pending) enrollment. Approve admits them; reject takes
  // them off the roster AND deactivates so the session is killed below and a
  // re-join with the code returns them to "pending".
  if (body.status === "approved") {
    data.status = "approved";
    data.active = true;
  } else if (body.status === "rejected") {
    data.status = "rejected";
    data.active = false;
  }
  // Reset a forgotten PIN: clear it (student re-joins with the code to set a new
  // one) and kill any active session so the old device can't keep acting.
  if (body.resetPin === true) {
    data.pin_hash = null;
    data.session_token = null;
  }
  if (body.phone !== undefined) {
    const normalizedPhone = String(body.phone).replace(/\D/g, "");
    if (normalizedPhone.length < 7) {
      return NextResponse.json({ error: "invalid phone number" }, { status: 400 });
    }
    data.phone = normalizedPhone;
  }
  if (body.batchId !== undefined) {
    if (body.batchId) {
      const batch = await prisma.batch.findFirst({
        where: { id: body.batchId, coaching_id: coachingId },
        select: { id: true },
      });
      if (!batch) return NextResponse.json({ error: "invalid batch" }, { status: 400 });
      data.batch_id = body.batchId;
    } else {
      data.batch_id = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  // Tenant check then singular update (updateMany is rejected by Neon HTTP).
  const owned = await prisma.student.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "student not found" }, { status: 404 });

  try {
    await prisma.student.update({ where: { id }, data });
  } catch {
    // Most likely the (coaching_id, phone) unique constraint.
    return NextResponse.json(
      { error: "a student with this phone already exists" },
      { status: 409 }
    );
  }

  // Edits can flip active, reset the PIN, or kill the session token — drop the
  // cached record so the change (incl. an immediate session kill) takes effect.
  await invalidateStudent(id);
  // Any edit can change roster membership (status/active), name, or batch, so drop
  // the cached attendance roster for this coaching.
  await invalidateCoachingRoster(coachingId);
  // Deactivation also writes a revocation tombstone so a stale cache hit can't
  // keep the student in; reactivation lifts it.
  if (data.active === false) await blockStudent(id);
  else if (data.active === true) await unblockStudent(id);

  return NextResponse.json({ ok: true });
});

// DELETE /api/coaching/students/[id]
// Soft-delete: deactivate rather than remove, to preserve attempt/billing history.
export const DELETE = withCoachingContext(async (_req, { coachingId }, { params }) => {
  const { id } = await params;
  const owned = await prisma.student.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "student not found" }, { status: 404 });
  await prisma.student.update({ where: { id }, data: { active: false } });
  // Drop the cache AND write a revocation tombstone so a stale cache hit can't
  // keep the now-inactive student authenticating until the TTL.
  await invalidateStudent(id);
  await blockStudent(id);
  // Removed from the roster — drop the coaching's cached attendance roster.
  await invalidateCoachingRoster(coachingId);
  return NextResponse.json({ ok: true });
});
