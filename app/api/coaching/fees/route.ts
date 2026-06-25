import { NextResponse } from "next/server";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { getFeeDues } from "@/lib/coachingFeesData";

// GET /api/coaching/fees — the dues dashboard payload: every active fee plan with
// its derived paid/partial/pending status plus the student it belongs to, and
// headline totals (collected, outstanding, # defaulters). Rows are ordered
// "who hasn't paid" first. Computation lives in lib/coachingFeesData (shared with
// the server-rendered fees page). All scoped to the tenant's coachingId.
export const GET = withCoachingContext(async (_req, { coachingId }) => {
  const dues = await getFeeDues(coachingId);
  return NextResponse.json(dues);
});
