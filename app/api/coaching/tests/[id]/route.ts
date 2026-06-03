import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateTestQuestionCache } from "@/lib/coachingQuestionCache";
import { invalidateActiveTests } from "@/lib/coachingCache";

// GET single test (full body, for the edit/detail view).
export const GET = withCoachingContext(async (_req, { coachingId }, { params }) => {
  const { id } = await params;
  const test = await prisma.coachingTest.findFirst({
    where: { id, coaching_id: coachingId },
  });
  if (!test) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ test });
});

// PATCH — update status (publish/close) or basic fields.
// Body may include: { status, title, description, durationMins, startAt, endAt, shuffle }
// Test lifecycle. Reopening a closed test (closed → active) is intentional and
// safe — it just reopens the window for latecomers; existing attempts are
// one-per-student and submit is idempotent, so nothing is recomputed. What we
// forbid is sending a test that has already gone live BACK to draft
// (active/closed → draft): draft is the freely-editable state, and reverting a
// test students may have attempted into it invites stale-cache / result
// confusion. The UI only ever offers Publish, Close, and Reopen anyway.
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "closed"],
  active: ["closed"],
  closed: ["active"],
};

export const PATCH = withCoachingContext(async (req, { coachingId }, { params }) => {
  const { id } = await params;
  const body = await req.json();

  // Tenant check up-front; also gives us the current status to validate the
  // transition against (no extra query). updateMany triggers an implicit
  // transaction the Neon HTTP adapter rejects, so we findFirst + singular update.
  const owned = await prisma.coachingTest.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true, status: true },
  });
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const next = String(body.status);
    if (!["draft", "active", "closed"].includes(next)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    // Same status is an idempotent no-op (not an error); a real change must be
    // a permitted transition.
    if (next !== owned.status) {
      if (!STATUS_TRANSITIONS[owned.status]?.includes(next)) {
        return NextResponse.json(
          { error: `cannot change status from ${owned.status} to ${next}` },
          { status: 409 }
        );
      }
      data.status = next;
    }
  }

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.durationMins !== undefined) {
    const dur = Number(body.durationMins);
    if (!Number.isFinite(dur) || dur <= 0) {
      return NextResponse.json({ error: "invalid duration" }, { status: 400 });
    }
    data.duration_secs = Math.round(dur * 60);
  }
  if (body.startAt !== undefined) data.start_at = body.startAt ? new Date(body.startAt) : null;
  if (body.endAt !== undefined) data.end_at = body.endAt ? new Date(body.endAt) : null;
  if (typeof body.shuffle === "boolean") data.shuffle = body.shuffle;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  await prisma.coachingTest.update({ where: { id }, data });
  await invalidateTestQuestionCache(id); // drop stale cached question set
  await invalidateActiveTests(coachingId); // title/window/status may have changed
  return NextResponse.json({ ok: true });
});
