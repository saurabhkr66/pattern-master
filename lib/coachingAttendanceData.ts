import "server-only";
import { unstable_cache } from "next/cache";
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

// ─── Owner-facing attendance analytics ────────────────────────────────────────
// Four insight panels for the admin attendance page, derived purely from existing
// AttendanceRecord/AttendanceSession + TestAttempt rows (no schema change). Cached
// per coaching for 120s, same rationale as coachingInsights: stays warm while a
// tutor is poking around, cheap to recompute.
//
// All three attendance panels (below-threshold, streaks, monthly) share ONE
// records read bounded to the last ATTENDANCE_ANALYTICS_MONTHS calendar months —
// that window is recent enough to act on and keeps the scan cheap. Only ACTIVE
// students surface (a left student isn't "at risk").

export const ATTENDANCE_AT_RISK = 0.75; // standard Indian education attendance norm
const ATTENDANCE_ANALYTICS_MONTHS = 6; // window for the records scan + monthly chart
const ATTENDANCE_STREAK_MIN = 2; // a "streak" is ≥2 consecutive absences
const CORRELATION_WINDOW_DAYS = 90; // recency bound for the avg-score side of the scatter
const ANALYTICS_LIST_CAP = 20; // most rows surfaced per at-risk list

export type AttendanceAnalytics = {
  // 1. Students below the at-risk attendance threshold (worst first).
  belowThreshold: {
    id: string;
    name: string;
    batchName: string;
    present: number;
    total: number;
    percent: number;
  }[];
  // 2. Students currently on a streak of ≥2 consecutive absences (longest first).
  streaks: {
    id: string;
    name: string;
    batchName: string;
    consecutiveAbsences: number;
    lastPresentDate: string | null;
  }[];
  // 3. Coaching-wide attendance per month, oldest → newest (last 6 months).
  monthly: {
    month: string; // "Jun 2026"
    present: number;
    total: number;
    percent: number;
  }[];
  // 4. Per-student attendance % vs avg test score %, for the scatter plot. Only
  //    students with both an attendance record and a recent submitted test appear.
  correlation: {
    id: string;
    name: string;
    attendancePct: number;
    avgScorePct: number;
  }[];
};

function scorePct(score: number | null, max: number | null): number {
  if (max == null || max <= 0 || score == null) return 0;
  return Math.round((score / max) * 100);
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

export function getAttendanceAnalytics(coachingId: string): Promise<AttendanceAnalytics> {
  return unstable_cache(
    async (): Promise<AttendanceAnalytics> => {
      const now = new Date();
      // First day (UTC) of the earliest of the last ATTENDANCE_ANALYTICS_MONTHS months.
      const windowStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (ATTENDANCE_ANALYTICS_MONTHS - 1), 1)
      );
      const scoreWindowStart = new Date(now.getTime() - CORRELATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      const [records, attempts] = await Promise.all([
        // Every roll-call mark in the window, newest first so the per-student streak
        // walk reads from the most recent session backwards.
        prisma.attendanceRecord.findMany({
          where: { coaching_id: coachingId, session: { date: { gte: windowStart } } },
          select: {
            present: true,
            session: { select: { date: true } },
            student: {
              select: { id: true, name: true, active: true, batch: { select: { name: true } } },
            },
          },
          orderBy: { session: { date: "desc" } },
        }),
        prisma.testAttempt.findMany({
          where: { coaching_id: coachingId, status: "submitted", submitted_at: { gte: scoreWindowStart } },
          select: { student_id: true, score: true, max_score: true },
        }),
      ]);

      // ── monthly: coaching-wide present/total per calendar month ──────────────
      const months = Array.from({ length: ATTENDANCE_ANALYTICS_MONTHS }, (_, i) => {
        const d = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (ATTENDANCE_ANALYTICS_MONTHS - 1) + i, 1)
        );
        return { key: monthKey(d), month: monthLabel(d), present: 0, total: 0, percent: 0 };
      });
      const monthByKey = new Map(months.map((m) => [m.key, m]));

      // ── per-student aggregation (active only) ────────────────────────────────
      type Acc = {
        name: string;
        batchName: string;
        present: number;
        total: number;
        recent: { present: boolean; date: Date }[]; // newest-first
      };
      const byStudent = new Map<string, Acc>();

      for (const r of records) {
        const m = monthByKey.get(monthKey(r.session.date));
        if (m) {
          m.total++;
          if (r.present) m.present++;
        }

        const s = r.student;
        if (!s.active) continue;
        let e = byStudent.get(s.id);
        if (!e) {
          e = { name: s.name, batchName: s.batch?.name ?? "Unassigned", present: 0, total: 0, recent: [] };
          byStudent.set(s.id, e);
        }
        e.total++;
        if (r.present) e.present++;
        e.recent.push({ present: r.present, date: r.session.date });
      }
      for (const m of months) m.percent = attendancePercent(m.present, m.total);

      // ── below-threshold + streaks ────────────────────────────────────────────
      const belowThreshold: AttendanceAnalytics["belowThreshold"] = [];
      const streaks: AttendanceAnalytics["streaks"] = [];
      for (const [id, e] of byStudent) {
        if (e.total === 0) continue;
        const percent = attendancePercent(e.present, e.total);
        if (e.present / e.total < ATTENDANCE_AT_RISK) {
          belowThreshold.push({ id, name: e.name, batchName: e.batchName, present: e.present, total: e.total, percent });
        }

        // recent is newest-first: count leading absences, stop at the first present.
        let consecutiveAbsences = 0;
        let lastPresentDate: string | null = null;
        for (const d of e.recent) {
          if (d.present) {
            lastPresentDate = toDateString(d.date);
            break;
          }
          consecutiveAbsences++;
        }
        if (consecutiveAbsences >= ATTENDANCE_STREAK_MIN) {
          streaks.push({ id, name: e.name, batchName: e.batchName, consecutiveAbsences, lastPresentDate });
        }
      }
      belowThreshold.sort((a, b) => a.percent - b.percent);
      streaks.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences);

      // ── attendance vs marks correlation ──────────────────────────────────────
      const scoreByStudent = new Map<string, number[]>();
      for (const a of attempts) {
        const arr = scoreByStudent.get(a.student_id) ?? [];
        arr.push(scorePct(a.score, a.max_score));
        scoreByStudent.set(a.student_id, arr);
      }
      const correlation: AttendanceAnalytics["correlation"] = [];
      for (const [id, e] of byStudent) {
        const scores = scoreByStudent.get(id);
        if (e.total === 0 || !scores || scores.length === 0) continue;
        correlation.push({
          id,
          name: e.name,
          attendancePct: attendancePercent(e.present, e.total),
          avgScorePct: Math.round(scores.reduce((s, p) => s + p, 0) / scores.length),
        });
      }

      return {
        belowThreshold: belowThreshold.slice(0, ANALYTICS_LIST_CAP),
        streaks: streaks.slice(0, ANALYTICS_LIST_CAP),
        monthly: months.map(({ key: _key, ...m }) => m),
        correlation,
      };
    },
    // coachingId is a closure, not an arg — it MUST be in the key parts.
    ["coaching-attendance-analytics", coachingId],
    { revalidate: 120, tags: [`coaching-attendance-analytics:${coachingId}`] }
  )();
}
