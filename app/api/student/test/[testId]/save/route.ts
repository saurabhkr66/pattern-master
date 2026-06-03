import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/studentAuth";
import { saveCoachingDraft } from "@/lib/coachingDraft";
import type { DraftState } from "@/components/test/testEngineTypes";

/**
 * Autosave for an in-progress coaching attempt. The hot path is a single Redis
 * SET scoped to (attemptId, studentId) — no Neon touch, so a full batch of
 * students flushing every couple of minutes adds zero DB pressure.
 *
 * Auth is by-key construction (same pattern as the consumer save endpoint):
 * getStudentSession verifies the signed cookie WITHOUT a DB hit, and the
 * studentId it yields is baked into the Redis key. A save aimed at another
 * student's attemptId therefore lands on a key only ever read back for the
 * attacker's own id, so it can't corrupt the victim's draft.
 *
 * Method is PATCH to match the TestEngine autosave/flush calls.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  await params; // route shape only — the attempt scopes the draft, not testId
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { draftId?: unknown; state?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const attemptId = body.draftId;
  if (!attemptId || typeof attemptId !== "string") {
    return NextResponse.json({ error: "missing attemptId" }, { status: 400 });
  }

  const ok = await saveCoachingDraft(attemptId, session.sid, (body.state ?? {}) as DraftState);
  return NextResponse.json({ ok });
}
