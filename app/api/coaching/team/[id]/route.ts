import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

// DELETE /api/coaching/team/[id] — remove a teacher (or cancel a pending invite).
// Owner-only. The owner seat itself can never be removed here. Tenant-scoped so
// one coaching's owner can't touch another's roster.
export const DELETE = withCoachingContext(
  async (_req, { coachingId }, route) => {
    const { id } = await route.params;

    const member = await prisma.coachingAdmin.findFirst({
      where: { id, coaching_id: coachingId },
      select: { id: true, role: true },
    });
    if (!member) {
      return NextResponse.json({ error: "member not found" }, { status: 404 });
    }
    if (member.role === "owner") {
      return NextResponse.json({ error: "the owner cannot be removed" }, { status: 400 });
    }

    await prisma.coachingAdmin.delete({ where: { id: member.id } });

    return NextResponse.json({ ok: true });
  },
  { ownerOnly: true }
);
