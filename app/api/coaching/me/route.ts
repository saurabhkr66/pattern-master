import { NextResponse } from "next/server";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { prisma } from "@/lib/prisma";

// Returns the resolved tenant + basic coaching info for the current admin.
// Doubles as the canonical example of a withCoachingContext-guarded handler.
export const GET = withCoachingContext(async (_req, { coachingId, actor }) => {
  const coaching = await prisma.coaching.findUnique({
    where: { id: coachingId },
    select: { id: true, name: true, slug: true, price_per_test: true, active: true },
  });

  return NextResponse.json({
    coaching,
    actor: {
      isSuperAdmin: actor.isSuperAdmin,
      role: actor.role,
    },
  });
});
