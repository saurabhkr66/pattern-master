import { NextResponse } from "next/server";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { gradeAttemptSubjectives } from "@/lib/subjectiveGrading";

// Vision grading of a full paper can take a while (images × Gemini).
export const maxDuration = 300;

// POST /api/coaching/attempts/[attemptId]/grade — run (or re-run) AI grading
// for one attempt's subjective answers. The admin-triggered retry net for
// Gemini outages / killed background runs. Body: { force?: boolean } — force
// re-grades answers that already have AI marks (manual overrides still win).
export const POST = withCoachingContext(async (req, { coachingId }, { params }) => {
  const { attemptId } = await params;
  const body = await req.json().catch(() => ({}));
  const force = !!(body as { force?: unknown }).force;

  try {
    const result = await gradeAttemptSubjectives({
      attemptId,
      coachingId,
      force,
      trigger: "admin",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(`grade attempt ${attemptId} failed:`, err);
    return NextResponse.json({ error: "grading failed — try again" }, { status: 502 });
  }
});
