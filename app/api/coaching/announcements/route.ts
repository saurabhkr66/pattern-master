import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateAnnouncements } from "@/lib/coachingCache";
import { resolveBatchIds } from "@/lib/coachingBatch";

// GET /api/coaching/announcements — list this coaching's announcements with a
// per-announcement read count for the admin board.
export const GET = withCoachingContext(async (_req, { coachingId }) => {
  const announcements = await prisma.announcement.findMany({
    where: { coaching_id: coachingId, active: true },
    select: {
      id: true,
      title: true,
      body: true,
      pinned: true,
      batch_ids: true,
      created_at: true,
      _count: { select: { reads: true } },
    },
    orderBy: [{ pinned: "desc" }, { created_at: "desc" }],
    take: 200,
  });
  return NextResponse.json({ announcements });
});

// POST /api/coaching/announcements — post a new announcement.
// Body: { title, body, pinned?, batchIds? }
// Empty/omitted batchIds = visible to all approved students; otherwise only the
// listed batches of THIS coaching (forged/foreign ids are dropped).
export const POST = withCoachingContext(async (req, { coachingId, actor }) => {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "message is required" }, { status: 400 });

  // Tenant-scoped batch targeting (same filter as test creation).
  const batch_ids = await resolveBatchIds(body.batchIds, coachingId);

  const created = await prisma.announcement.create({
    data: {
      coaching_id: coachingId,
      title,
      body: text,
      pinned: !!body.pinned,
      batch_ids,
      created_by: actor.adminId,
    },
    select: { id: true },
  });

  await invalidateAnnouncements(coachingId);

  return NextResponse.json({ ok: true, id: created.id });
});
