import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateCoachingSlug } from "@/lib/coachingCache";

// PATCH /api/coaching/announcements/settings  { enabled: boolean }
// Toggle whether the in-app announcement board is on for this coaching. Flips the
// Coaching.announcements_enabled flag and busts the slug cache so the change takes
// effect on the next student page load (the flag rides CachedCoaching).
export const PATCH = withCoachingContext(async (req, { coachingId }) => {
  const body = await req.json().catch(() => ({}));
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const updated = await prisma.coaching.update({
    where: { id: coachingId },
    data: { announcements_enabled: body.enabled },
    select: { slug: true, announcements_enabled: true },
  });

  await invalidateCoachingSlug(updated.slug);

  return NextResponse.json({ ok: true, enabled: updated.announcements_enabled });
});
