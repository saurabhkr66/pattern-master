import "server-only";
import { prisma } from "@/lib/prisma";
import { attendancePercent, dateStringToUTC, toDateString } from "@/lib/coachingAttendance";
import { getCachedCoachingRoster } from "@/lib/coachingCache";

// Server-side attendance payloads, shared by the admin page / API and the student
// page so the roster, history, and summary shapes live in one place. All functions
// take only ids (caller is responsible for tenant scoping via withCoachingContext
// or the slug gate).

export type RosterStudent = {
  id: string;
  name: string;
  present: boolean;
};

export type BatchRoster = {
  students: RosterStudent[];
  taken: boolean; // whether this batch+date has been marked before
};

// The roster for one batch on one date: every approved active student in the batch,
// with their existing mark (default false = absent) when the day was already taken.
export async function getBatchRoster(
  coachingId: string,
  batchId: string,
  dateStr: string
): Promise<BatchRoster> {
  // The roster (all approved+active students) is cached per coaching and filtered
  // to this batch here; only the per-date marks are a live read.
  const [roster, session] = await Promise.all([
    getCachedCoachingRoster(coachingId),
    prisma.attendanceSession.findUnique({
      where: { batch_id_date: { batch_id: batchId, date: dateStringToUTC(dateStr) } },
      select: { records: { select: { student_id: true, present: true } } },
    }),
  ]);

  // Cached roster is already name-sorted, so the filter preserves order.
  const students = roster.filter((s) => s.batch_id === batchId);
  const markById = new Map((session?.records ?? []).map((r) => [r.student_id, r.present]));

  return {
    taken: session !== null,
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      // Default absent for students who joined the batch after the day was marked.
      present: markById.get(s.id) ?? false,
    })),
  };
}

export type AttendanceHistoryRow = {
  sessionId: string;
  batchId: string;
  batchName: string;
  date: string; // YYYY-MM-DD
  present: number;
  total: number;
};

// Page size for the admin attendance-history panel (newest first). Exported so the
// client's "load more" and hasMore check stay in lock-step with the server.
export const ATTENDANCE_HISTORY_PAGE = 30;

// Recent roll-calls across the coaching for the admin history panel, newest first.
// `offset` pages backwards in time (load-more appends older sessions).
export async function getAttendanceHistory(
  coachingId: string,
  take = ATTENDANCE_HISTORY_PAGE,
  offset = 0
): Promise<AttendanceHistoryRow[]> {
  const sessions = await prisma.attendanceSession.findMany({
    where: { coaching_id: coachingId },
    select: {
      id: true,
      date: true,
      batch: { select: { id: true, name: true } },
      records: { select: { present: true } },
    },
    orderBy: { date: "desc" },
    take,
    skip: offset,
  });

  return sessions.map((s) => ({
    sessionId: s.id,
    batchId: s.batch.id,
    batchName: s.batch.name,
    date: toDateString(s.date),
    present: s.records.filter((r) => r.present).length,
    total: s.records.length,
  }));
}

// ─── Student-facing view ──────────────────────────────────────────────────────
// One student's own attendance history + a headline percentage, for
// /c/[slug]/attendance. Gated by attendance_visible_to_students at the page level.

export type StudentAttendanceDay = {
  date: string; // YYYY-MM-DD
  present: boolean;
};

export type StudentAttendance = {
  days: StudentAttendanceDay[];
  present: number;
  total: number;
  percent: number;
};

export async function getStudentAttendance(
  coachingId: string,
  studentId: string,
  take = 180 // ~a full year of class days; the page reveals these progressively
): Promise<StudentAttendance> {
  const records = await prisma.attendanceRecord.findMany({
    where: { coaching_id: coachingId, student_id: studentId },
    select: { present: true, session: { select: { date: true } } },
    orderBy: { session: { date: "desc" } },
    take,
  });

  const days = records.map((r) => ({ date: toDateString(r.session.date), present: r.present }));
  const present = days.filter((d) => d.present).length;
  const total = days.length;

  return { days, present, total, percent: attendancePercent(present, total) };
}
