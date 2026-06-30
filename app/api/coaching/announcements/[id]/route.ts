import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateAnnouncements } from "@/lib/coachingCache";
import { resolveBatchIds } from "@/lib/coachingBatch";

// Confirm the announcement exists and belongs to this coaching before any write.
// (Neon HTTP has no updateMany/$transaction, so we tenant-check then update by the
// unique id — a plain update can't carry coaching_id in its where.)
async function ownedAnnouncement(id: string, coachingId: string) {
  if (!id) return null;
  return prisma.announcement.findFirst({
    where: { id, coaching_id: coachingId, active: true },
    select: { id: true },
  });
}

// PATCH /api/coaching/announcements/[id] — edit title/body/pinned/batchIds.
export const PATCH = withCoachingContext(async (req, { coachingId }, route) => {
  const { id } = await route.params;
  if (!(await ownedAnnouncement(id, coachingId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    body?: string;
    pinned?: boolean;
    batch_ids?: string[];
  } = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    data.title = title;
  }
  if (typeof body.body === "string") {
    const text = body.body.trim();
    if (!text) return NextResponse.json({ error: "message cannot be empty" }, { status: 400 });
    data.body = text;
  }
  if (typeof body.pinned === "boolean") data.pinned = body.pinned;
  if (Array.isArray(body.batchIds)) data.batch_ids = await resolveBatchIds(body.batchIds, coachingId);

  await prisma.announcement.update({ where: { id }, data });
  await invalidateAnnouncements(coachingId);

  return NextResponse.json({ ok: true });
});

// DELETE /api/coaching/announcements/[id] — soft-delete (active = false).
export const DELETE = withCoachingContext(async (_req, { coachingId }, route) => {
  const { id } = await route.params;
  if (!(await ownedAnnouncement(id, coachingId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.announcement.update({ where: { id }, data: { active: false } });
  await invalidateAnnouncements(coachingId);

  return NextResponse.json({ ok: true });
});
