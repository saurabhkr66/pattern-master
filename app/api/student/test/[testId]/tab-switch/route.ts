import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/studentAuth";
import { incrTabSwitch } from "@/lib/coachingTabSwitch";

// Increments the tab-switch counter for an in-progress attempt. Called from the
// client on `visibilitychange` (tab hidden) via sendBeacon — i.e. very often.
//
// Hot path is a single Redis INCR (no Neon): auth is the signed cookie alone
// (getStudentSession, no DB hit), and the counter key is scoped to the session's
// studentId so it can only inflate the caller's own attempt. The final value is
// flushed into the DB once, at submit. Only if Redis is unavailable do we fall
// back to the original per-event DB increment.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const session = await getStudentSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { attemptId } = await req.json();
    if (!attemptId) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

    // Fast path: Redis INCR, no DB touch.
    if (await incrTabSwitch(session.sid, attemptId)) {
      return NextResponse.json({ ok: true });
    }

    // Redis unavailable — fall back to the original DB increment, scoped to the
    // student's own, not-yet-submitted attempt so it can't be inflated elsewhere.
    const att = await prisma.testAttempt.findFirst({
      where: {
        id: attemptId,
        test_id: testId,
        student_id: session.sid,
        coaching_id: session.cid,
        status: "in_progress",
      },
      select: { id: true },
    });
    if (att) {
      await prisma.testAttempt.update({
        where: { id: att.id },
        data: { tab_switches: { increment: 1 } },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
