import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCoachingActor, SA_IMPERSONATE_COOKIE } from "@/lib/coachingAuth";

// POST { coachingId } — super admin starts managing a coaching (sets cookie).
// DELETE — stop impersonating (clears cookie).
export async function POST(req: NextRequest) {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { coachingId } = await req.json();
  if (!coachingId) return NextResponse.json({ error: "coachingId required" }, { status: 400 });

  const exists = await prisma.coaching.findUnique({
    where: { id: coachingId },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "coaching not found" }, { status: 404 });

  const jar = await cookies();
  jar.set(SA_IMPERSONATE_COOKIE, coachingId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h working session
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const jar = await cookies();
  jar.delete(SA_IMPERSONATE_COOKIE);
  return NextResponse.json({ ok: true });
}
