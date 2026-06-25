import { NextResponse } from "next/server";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { getAttendanceHistory, ATTENDANCE_HISTORY_PAGE } from "@/lib/coachingAttendanceData";

// GET /api/coaching/attendance/history?offset= — a page of recent roll-calls
// (newest first) with present/total counts. offset=0 is the latest page (used to
// refresh after a save); a positive offset loads older sessions (load-more).
export const GET = withCoachingContext(async (req, { coachingId }) => {
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0);
  const history = await getAttendanceHistory(coachingId, ATTENDANCE_HISTORY_PAGE, offset);
  // A full page back implies there may be more older sessions to fetch.
  const hasMore = history.length === ATTENDANCE_HISTORY_PAGE;
  return NextResponse.json({ history, hasMore });
});
