import { NextResponse } from "next/server";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { getAttendanceAnalytics } from "@/lib/coachingAttendanceData";

// GET /api/coaching/attendance/analytics — the four attendance insight panels
// (below-threshold, consecutive-absence streaks, monthly trend, attendance-vs-marks
// correlation) for the admin attendance page. Cached per coaching at the data layer.
export const GET = withCoachingContext(async (_req, { coachingId }) => {
  const analytics = await getAttendanceAnalytics(coachingId);
  return NextResponse.json({ analytics });
});
