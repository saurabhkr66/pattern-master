import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateCoachingSlug } from "@/lib/coachingCache";

// PATCH /api/coaching/attendance/settings  { visible: boolean }
// Toggle whether students can see their own attendance. Flips the
// Coaching.attendance_visible_to_students flag and busts the slug cache so the
// change takes effect on the next student page load (the flag rides CachedCoaching).
export const PATCH = withCoachingContext(async (req, { coachingId }) => {
  const body = await req.json().catch(() => ({}));
  if (typeof body.visible !== "boolean") {
    return NextResponse.json({ error: "visible must be a boolean" }, { status: 400 });
  }

  const updated = await prisma.coaching.update({
    where: { id: coachingId },
    data: { attendance_visible_to_students: body.visible },
    select: { slug: true, attendance_visible_to_students: true },
  });

  await invalidateCoachingSlug(updated.slug);

  return NextResponse.json({ ok: true, visible: updated.attendance_visible_to_students });
});
